from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, status
from fastapi.middleware.cors import CORSMiddleware
#from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session
from sqlalchemy import func

from datetime import datetime, timezone
from typing import List, Optional
import os
from io import BytesIO
import boto3
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
load_dotenv()

# AI / text utils
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline
from docx import Document
from pdfminer.high_level import extract_text as extract_pdf_text

# local imports (models / schemas / auth / db)
from database import SessionLocal, Base, engine
import models
import schemas
import utils_auth as auth
from models import Users
import re
import hashlib

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
# assume models.py contains updated table definitions that include these fields:
# Assignment: id, section_id, created_by, title, description, due_date (DateTime), reference_file_url, max_attempts (Integer), allow_resubmission (Boolean), created_at
# Submission: id, assignment_id, student_id, filename, file_url, attempt_number (Integer), similarity_score, ai_label, ai_confidence, created_at, remark_text, teacher_score, teacher_out_of, needs_resubmission, remark_by
# AssignmentResult: used for personal uploads (unchanged)

# ---------- App & CORS ----------
app = FastAPI()
origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# create tables if models changed
Base.metadata.create_all(bind=engine)

# ---------- Security / DB ----------
#oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
@app.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Users).filter(models.Users.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = auth.hash_password(user.password)

    new_user = models.Users(
        name=user.name,
        email=user.email,
        hashed_password=hashed_pw,
        role=user.role or "student"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = auth.create_access_token({
        "sub": new_user.email,
        "id": new_user.id,
        "role": new_user.role,
        "name": new_user.name
    })

    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.Users).filter(models.Users.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ok, new_hash = auth.verify_password(user.password, db_user.hashed_password)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if new_hash:
        try:
            db_user.hashed_password = new_hash
            db.commit()
            db.refresh(db_user)
        except Exception:
            print("Warning: rehash on login failed: could not update DB")

    access_token = auth.create_access_token({
        "sub": db_user.email,
        "id": db_user.id,
        "role": db_user.role,
        "name": db_user.name
    })

    return {"access_token": access_token, "token_type": "bearer"}
def get_user_by_email(db: Session, email: str):
    return db.query(models.Users).filter(models.Users.email == email).first()
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.Users).filter(models.Users.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user



@app.get("/me")
def read_me(current_user: models.Users = Depends(get_current_user)):
    """
    Returns currently logged-in user's profile.
    Used by frontend after login.
    """
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": (
            current_user.created_at.isoformat()
            if hasattr(current_user, "created_at") and current_user.created_at
            else None
        ),
    }



# 🔥 recalculate student-to-student plagiarism
# ---------- S3 helper ----------
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

if not all([AWS_ACCESS_KEY, AWS_SECRET_KEY, S3_BUCKET_NAME]):
    raise RuntimeError("AWS environment variables not set")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION,
)


def upload_to_s3(file_bytes: bytes, filename: str, content_type: str, folder: str):
    key = f"{folder}/{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
    try:
        s3_client.upload_fileobj(BytesIO(file_bytes), S3_BUCKET_NAME, key, ExtraArgs={"ContentType": content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")
    return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"

# ---------- Email helper (SMTP) ----------
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)

def send_email(to_email: str, subject: str, body: str):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        # silently skip if not configured
        print("SMTP not configured, skipping email to", to_email)
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(body)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
    except Exception as e:
        print("Failed to send email:", e)

# ---------- AI pipeline ----------
ai_detector = pipeline("text-classification", model="roberta-base-openai-detector")

# ---------- Utilities ----------
def extract_text_from_docx_bytes(b: bytes) -> str:
    return "\n".join([p.text for p in Document(BytesIO(b)).paragraphs])

def extract_text_from_pdf_path(path: str) -> str:
    return extract_pdf_text(path)

def check_plagiarism(submitted_text: str, reference_texts: List[str]) -> float:
    if not reference_texts:
        return 0.0
    texts = reference_texts + [submitted_text]
    v = TfidfVectorizer().fit_transform(texts)
    sim = cosine_similarity(v)
    score = sim[-1][:-1].max()
    return round(float(score), 4)


def calculate_student_plagiarism(db, assignment_id: int):
    submissions = (
        db.query(models.Submission)
        .filter(models.Submission.assignment_id == assignment_id)
        .filter(models.Submission.text_content.isnot(None))
        .all()
    )

    if len(submissions) < 2:
        return

    texts = [s.text_content for s in submissions]

    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(texts)
    similarity_matrix = cosine_similarity(tfidf_matrix)

    for i, sub in enumerate(submissions):
        max_score = 0.0
        for j in range(len(submissions)):
            if i != j:
                max_score = max(max_score, similarity_matrix[i][j])
        final_score = max(
            sub.similarity_score or 0.0,
            max_score
        )
        sub.similarity_score = round(float(final_score), 4)

    db.commit()
def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def generate_fingerprints(text: str, shingle_size: int = 5) -> set:
    """
    Break text into word shingles and hash them.
    Returns a set of hashes (fingerprints).
    """
    words = normalize_text(text).split()
    fingerprints = set()

    for i in range(len(words) - shingle_size + 1):
        shingle = " ".join(words[i:i + shingle_size])
        h = hashlib.sha256(shingle.encode()).hexdigest()
        fingerprints.add(h)

    return fingerprints
PUBLIC_CORPUS = {
    "cs": [
        "data structures organize data efficiently",
        "machine learning models learn patterns from data",
        "operating systems manage hardware resources"
    ],
    "science": [
        "photosynthesis converts light energy into chemical energy",
        "newton laws describe motion and force",
        "cells are the basic unit of life"
    ],
    "commerce": [
        "demand and supply determine market prices",
        "accounting records financial transactions",
        "marketing focuses on customer value"
    ],
    "general": [
        "education improves quality of life",
        "technology impacts modern society",
        "research solves real world problems"
    ]
}

def compare_with_public_corpus(user_text: str, domain: str):
    user_fps = generate_fingerprints(user_text)
    corpus_texts = PUBLIC_CORPUS.get(domain, [])

    corpus_fps = set()
    for text in corpus_texts:
        corpus_fps |= generate_fingerprints(text)

    if not corpus_fps or not user_fps:
        return 0.0, len(user_fps)

    overlap = user_fps & corpus_fps
    similarity = len(overlap) / len(user_fps)

    return round(similarity, 4), len(user_fps)


def interpret_similarity(score: float):
    if score <= 0.15:
        return "Low", "Overlap likely due to common academic phrases."
    elif score <= 0.40:
        return "Medium", "Some sections resemble known public academic content."
    else:
        return "High", "Large portions closely match known reference patterns."



def extract_matched_phrases(user_text: str, domain: str, shingle_size=5):
    user_words = normalize_text(user_text).split()
    corpus_texts = PUBLIC_CORPUS.get(domain, [])

    corpus_fps_map = {}
    for text in corpus_texts:
        words = normalize_text(text).split()
        for i in range(len(words) - shingle_size + 1):
            phrase = " ".join(words[i:i + shingle_size])
            h = hashlib.sha256(phrase.encode()).hexdigest()
            corpus_fps_map[h] = phrase

    matched = []
    for i in range(len(user_words) - shingle_size + 1):
        phrase = " ".join(user_words[i:i + shingle_size])
        h = hashlib.sha256(phrase.encode()).hexdigest()
        if h in corpus_fps_map:
            matched.append(phrase)

    return list(set(matched))[:10]  # limit for sanity


def generate_plagiarism_report(result):
    os.makedirs("reports", exist_ok=True)
    path = f"reports/report_{result.id}.pdf"

    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4

    y = height - 50

    # ---------- Title ----------
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "EduShield – Personal Plagiarism Report")

    c.setLineWidth(1)
    c.line(50, y - 5, width - 50, y - 5)

    y -= 40
    c.setFont("Helvetica", 11)

    # ---------- Main Fields ----------
    fields = [
        ("Filename", result.filename),
        ("Plagiarism", f"{result.similarity_score * 100:.2f}%"),
        ("Severity", result.plagiarism_severity),
        ("AI Result", result.ai_label),
        ("AI Confidence", f"{result.ai_confidence * 100:.2f}%"),
    ]

    for label, value in fields:
        c.drawString(50, y, f"{label}:")
        c.drawString(200, y, str(value))
        y -= 20

    # ---------- Explanation ----------
    explanation = result.plagiarism_explanation or "No explanation available."

    y -= 10
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Explanation")

    y -= 18
    c.setFont("Helvetica", 10)

    text_obj = c.beginText(60, y)
    text_obj.setLeading(14)

    for line in explanation.split(". "):
        text_obj.textLine(line.strip())

    c.drawText(text_obj)

    y = text_obj.getY() - 20

    # ---------- Matched Phrases ----------
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Matched Phrases")

    y -= 20
    c.setFont("Helvetica", 10)

    if result.matched_phrases:
        for phrase in result.matched_phrases:
            if y < 60:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 10)
            c.drawString(60, y, f"- {phrase}")
            y -= 16
    else:
        c.drawString(60, y, "No significant overlapping phrases detected.")

    # ---------- Footer ----------
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(
        50,
        30,
        "Generated by EduShield • AI-assisted plagiarism & authorship detection",
    )

    c.save()
    return path


# ---------- Endpoints ----------
@app.get("/")
def root():
    return {"message": "EduShield backend running (assignments+submissions)"}

# 1) Faculty creates assignment (stores reference in S3). Sends emails to joined students.
@app.post("/assignments/create")
async def create_assignment(
    section_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    due_date: str = Form(...),  # ISO string
    max_attempts: int = Form(1),
    allow_resubmission: bool = Form(False),
    reference_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can create assignments")

    section = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    ref_url = None
    reference_text = None

    if reference_file:
        contents = await reference_file.read()
        content_type = getattr(reference_file, "content_type", "application/octet-stream")
        ref_url = upload_to_s3(contents, reference_file.filename, content_type, folder="references")

    # extract reference text ONCE
        if reference_file.filename.lower().endswith(".docx"):
            reference_text = extract_text_from_docx_bytes(contents)
        elif reference_file.filename.lower().endswith(".pdf"):
           tmp = f"temp/ref_{datetime.utcnow().timestamp()}.pdf"
           os.makedirs("temp", exist_ok=True)
           with open(tmp, "wb") as f:
              f.write(contents)
           reference_text = extract_pdf_text(tmp)
           os.remove(tmp)
    try:
       due_dt = datetime.fromisoformat(due_date)
    except Exception:
      raise HTTPException(
        status_code=400,
        detail="due_date must be ISO format e.g. 2025-12-20T23:59:00"
    )

    assignment = models.Assignment(
        section_id=section_id,
        created_by=current_user.id,
        title=title,
        description=description,
        due_date=due_dt,
        reference_file_url=ref_url,
        reference_text = reference_text,
        
        max_attempts=max_attempts,
        allow_resubmission=allow_resubmission,
        created_at=datetime.utcnow(),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    # notify joined students via email
    joined = (
        db.query(models.JoinedSection)
        .filter(models.JoinedSection.section_id == section_id)
        .all()
    )
    for j in joined:
        student = db.query(models.Users).filter(models.Users.id == j.student_id).first()
        if student and student.email:
            subj = f"New assignment: {title} in {section.subject}"
            body = f"Hello {student.name or student.email},\n\nA new assignment '{title}' has been created for section {section.subject}.\nDue: {due_dt.isoformat()}\nAttempts allowed per student: {max_attempts}\n\nOpen the EduShield portal to submit your work.\n"
            send_email(student.email, subj, body)

    return {"message": "Assignment created", "assignment_id": assignment.id, "reference_url": ref_url}

# 2) Student submits assignment — enforce deadline & attempts, save to S3, run plagiarism vs teacher reference only
@app.post("/assignments/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit assignments")

    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # check deadline
    now_utc = datetime.now(timezone.utc)
    due = assignment.due_date
    if due.tzinfo is None:
        # assume naive stored in UTC
        due = due.replace(tzinfo=timezone.utc)
    if now_utc > due.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Deadline has passed")

    # count attempts used
    used_attempts = (
        db.query(models.Submission)
        .filter(models.Submission.assignment_id == assignment_id)
        .filter(models.Submission.student_id == current_user.id)
        .count()
    )
    if assignment.max_attempts is not None and used_attempts >= assignment.max_attempts:
        raise HTTPException(status_code=400, detail="Max attempts reached for this assignment")

    contents = await file.read()
    content_type = getattr(file, "content_type", "application/octet-stream")
    s3_url = upload_to_s3(contents, file.filename, content_type, folder="submissions")

    # extract text
    if file.filename.lower().endswith('.docx'):
        submitted_text = extract_text_from_docx_bytes(contents)
    elif file.filename.lower().endswith('.pdf'):
        tmp_path = f"temp/{datetime.utcnow().timestamp()}_{file.filename}"
        os.makedirs("temp", exist_ok=True)
        with open(tmp_path, "wb") as tf:
            tf.write(contents)
        submitted_text = extract_pdf_text(tmp_path)
        try:
            os.remove(tmp_path)
        except Exception:
            pass
    else:
        raise HTTPException(status_code=400, detail="Only .docx and .pdf supported")

    reference_similarity = 0.0
    if assignment.reference_text:
        reference_similarity = check_plagiarism(
            submitted_text,
            [assignment.reference_text]
    )


    ai_res = ai_detector(submitted_text[:512])[0]
    label_map = {"LABEL_0": "AI-generated", "LABEL_1": "Human-written", "FAKE": "AI-generated", "REAL": "Human-written"}
    ai_label = label_map.get(ai_res.get("label"), ai_res.get("label"))
    ai_conf = round(float(ai_res.get("score", 0.0)), 4)

    attempt_number = used_attempts + 1

    submission = models.Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        filename=file.filename,
        text_content=submitted_text,
        # file_url column may or may not exist; if present set it, else ignore
        **({"file_url": s3_url} if hasattr(models.Submission, 'file_url') else {}),
        similarity_score=reference_similarity,
        ai_label=ai_label,
        ai_confidence=ai_conf,
            
        # store attempt number if supported
        **({"attempt_number": attempt_number} if hasattr(models.Submission, 'attempt_number') else {}),
        created_at=datetime.utcnow()
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    calculate_student_plagiarism(db, assignment_id)
    return {"message": "Submitted", "submission_id": submission.id, "similarity": f"{reference_similarity*100:.2f}%", "ai": {"label": ai_label, "confidence": f"{ai_conf*100:.2f}%"}}

# 3) Faculty: list submissions for assignment (with attempt number, student info)
@app.get("/assignments/{assignment_id}/submissions")
def assignment_submissions(assignment_id: int, db: Session = Depends(get_db), current_user: models.Users = Depends(get_current_user)):
    if current_user.role != 'faculty':
        raise HTTPException(status_code=403, detail='Only faculty')
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail='Assignment not found')
    subs = db.query(models.Submission).filter(models.Submission.assignment_id == assignment_id).order_by(models.Submission.created_at.asc()).all()
    out = []
    for s in subs:
        student = db.query(models.Users).filter(models.Users.id == s.student_id).first()
        out.append({
            "submission_id": s.id,
            "student_id": s.student_id,
            "student_name": student.name if student else None,
            "filename": s.filename,
            "file_url": getattr(s, 'file_url', None),
            "attempt_number": getattr(s, 'attempt_number', None),
            "similarity": (f"{s.similarity_score*100:.2f}%" if s.similarity_score is not None else None),
            "ai_label": s.ai_label,
            "ai_confidence": (f"{s.ai_confidence*100:.2f}%" if s.ai_confidence is not None else None),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "remark": getattr(s, 'remark_text', None),
            "needs_resubmission": getattr(s, 'needs_resubmission', False),
            "teacher_score": getattr(s, 'teacher_score', None),
            "teacher_out_of": getattr(s, 'teacher_out_of', None),
        })
    return out

# 4) Faculty: add remark / grade / request resubmission for a submission
@app.post("/submissions/{submission_id}/remark")
def add_remark(submission_id: int, remark_text: str = Form(...), needs_resubmission: bool = Form(False), teacher_score: Optional[float] = Form(None), teacher_out_of: Optional[float] = Form(None), db: Session = Depends(get_db), current_user: models.Users = Depends(get_current_user)):
    if current_user.role != 'faculty':
        raise HTTPException(status_code=403, detail='Only faculty')
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail='Submission not found')
    # enforce remark length <= 100 chars
    if len(remark_text) > 100:
        raise HTTPException(status_code=400, detail='Remark too long (max 100 characters)')

    # set fields if available
    if hasattr(sub, 'remark_text'):
        sub.remark_text = remark_text
    if hasattr(sub, 'needs_resubmission'):
        sub.needs_resubmission = needs_resubmission
    if hasattr(sub, 'teacher_score') and teacher_score is not None:
        sub.teacher_score = teacher_score
    if hasattr(sub, 'teacher_out_of') and teacher_out_of is not None:
        sub.teacher_out_of = teacher_out_of

    db.commit()
    db.refresh(sub)

    # notify student
    student = db.query(models.Users).filter(models.Users.id == sub.student_id).first()
    if student and student.email:
        subj = f"Remark on your submission for assignment {sub.assignment_id}"
        body = f"Hello {student.name or student.email},\n\nYour submission has a new remark: {remark_text}\nResubmission required: {needs_resubmission}\n\nLog in to view details.\n"
        send_email(student.email, subj, body)

    return {"message": "Remark saved"}

# 5) Student dashboard - list assignments in their joined sections with status
@app.get("/student/dashboard")
def student_dashboard(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students")

    sections = (
        db.query(models.Section)
        .join(models.JoinedSection, models.JoinedSection.section_id == models.Section.id)
        .filter(models.JoinedSection.student_id == current_user.id)
        .all()
    )

    out = []
    now_utc = datetime.now(timezone.utc)

    for sec in sections:
        assignments = (
            db.query(models.Assignment)
            .filter(models.Assignment.section_id == sec.id)
            .all()
        )

        for a in assignments:
            attempts = (
                db.query(models.Submission)
                .filter(
                    models.Submission.assignment_id == a.id,
                    models.Submission.student_id == current_user.id
                )
                .order_by(models.Submission.created_at.desc())
                .all()
            )

            used = len(attempts)
            last_remark = attempts[0].remark_text if attempts else None
            needs_resub = attempts[0].needs_resubmission if attempts else False

            locked = False
            if a.due_date:
                dd = a.due_date
                if dd.tzinfo is None:
                    dd = dd.replace(tzinfo=timezone.utc)
                if now_utc > dd:
                    locked = True

            if a.max_attempts is not None and used >= a.max_attempts:
                locked = True

            out.append({
                "section_id": sec.id,
                "section_subject": sec.subject,
                "assignment_id": a.id,
                "title": a.title,
                "due_date": a.due_date.isoformat(),
                "attempts_used": used,
                "max_attempts": a.max_attempts,
                "status": "locked" if locked else ("submitted" if used > 0 else "pending"),
                "last_remark": last_remark,
                "needs_resubmission": needs_resub,
            })

    return out

@app.post("/sections/create")
def create_section(
    subject: str = Form(...),
    access_code: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can create sections")
    
    access_code = access_code.strip().upper()  # ✅ ADD THIS


    existing = db.query(models.Section).filter(
        models.Section.access_code == access_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Access code already exists")

    section = models.Section(
        subject=subject,
        access_code=access_code,
        created_by=current_user.id,
    )

    db.add(section)
    db.commit()
    db.refresh(section)

    return {
        "message": "Section created",
        "section_id": section.id,
        "subject": section.subject,
        "access_code": section.access_code,
    }
@app.post("/sections/join")
def join_section(
    access_code: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can join sections")
    
    access_code = access_code.strip().upper()  # ✅ ADD THIS


    section = db.query(models.Section).filter(
        models.Section.access_code == access_code
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Invalid access code")

    already = db.query(models.JoinedSection).filter(
        models.JoinedSection.section_id == section.id,
        models.JoinedSection.student_id == current_user.id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Already joined this section")

    join = models.JoinedSection(
        section_id=section.id,
        student_id=current_user.id,
    )

    db.add(join)
    db.commit()

    return {
        "message": "Joined section",
        "section_id": section.id,
        "subject": section.subject,
    }
@app.get("/my-sections")
def my_sections(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    if current_user.role == "student":
        sections = (
            db.query(models.Section)
            .join(models.JoinedSection)
            .filter(models.JoinedSection.student_id == current_user.id)
            .all()
        )
    else:  # faculty
        sections = (
            db.query(models.Section)
            .filter(models.Section.created_by == current_user.id)
            .all()
        )

    return [
        {
            "id": s.id,
            "subject": s.subject,
            "access_code": s.access_code,
        }
        for s in sections
    ]

# 6) Keep personal document endpoint untouched (AssignmentResult flow). We reuse models.AssignmentResult
@app.post("/check-personal-document/")
async def check_personal_document(
    domain: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    # ---------- domain validation FIRST ----------
    ALLOWED_DOMAINS = {"cs", "science", "commerce", "general"}
    domain = domain.lower().strip()

    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail="Invalid domain. Choose from cs, science, commerce, general."
        )

    # ---------- read file ----------
    contents = await file.read()
    filename = file.filename

    if filename.lower().endswith(".docx"):
        text = extract_text_from_docx_bytes(contents)

    elif filename.lower().endswith(".pdf"):
        tmp = f"temp/{datetime.utcnow().timestamp()}_{filename}"
        os.makedirs("temp", exist_ok=True)
        with open(tmp, "wb") as f:
            f.write(contents)
        text = extract_pdf_text(tmp)
        os.remove(tmp)

    else:
        raise HTTPException(status_code=400, detail="Only .docx and .pdf allowed")

    # ---------- plagiarism (fingerprint-based) ----------
    similarity_score, total_fingerprints = compare_with_public_corpus(text, domain)
    matched_phrases = extract_matched_phrases(text, domain)
    severity, explanation = interpret_similarity(similarity_score)

    # ---------- AI detection ----------
    ai = ai_detector(text[:512])[0]
    ai_label = "AI-generated" if ai.get("label") in ("LABEL_0", "FAKE") else "Human-written"
    ai_conf = round(float(ai.get("score", 0.0)), 4)

    # ---------- save result ----------
    result = models.AssignmentResult(
        user_id=current_user.id,
        filename=filename,
        similarity_score=similarity_score,
        plagiarism_severity=severity,
        plagiarism_explanation=explanation,
        matched_phrases=matched_phrases,
        ai_label=ai_label,
        ai_confidence=ai_conf,
        text_preview=text[:500],
        timestamp=datetime.utcnow(),
    )

    db.add(result)
    db.commit()

    # ---------- upload file ----------
    s3_url = upload_to_s3(
        contents,
        filename,
        getattr(file, "content_type", "application/octet-stream"),
        folder="personal-docs",
    )

    return {
        "filename": filename,
        "domain": domain,
        "similarity_score": f"{similarity_score*100:.2f}%",
        "fingerprints_generated": total_fingerprints,
        "plagiarism_severity": severity,
        "plagiarism_explanation": explanation,
        "matched_phrases": matched_phrases,
        "ai_label": ai_label,
        "ai_confidence": f"{ai_conf*100:.2f}%",
    }


#result page demo use 
@app.get("/results")
def get_personal_results(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    results = (
        db.query(models.AssignmentResult)
        .filter(models.AssignmentResult.user_id == current_user.id)
        .order_by(models.AssignmentResult.timestamp.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "filename": r.filename,
            "similarity_score": r.similarity_score,
            "plagiarism_severity": r.plagiarism_severity,
            "ai_label": r.ai_label,
            "ai_confidence": r.ai_confidence,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in results
    ]

from fastapi.responses import FileResponse

@app.get("/results/{result_id}/download")
def download_report(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    result = db.query(models.AssignmentResult).filter(
        models.AssignmentResult.id == result_id,
        models.AssignmentResult.user_id == current_user.id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Report not found")

    path = generate_plagiarism_report(result)
    return FileResponse(path, filename="EduShield_Report.pdf")

# 🔹 NEW: Get assignments by section (FACULTY + STUDENT)
@app.get("/assignments/by-section/{section_id}")
def assignments_by_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    # faculty OR student (must be joined)
    if current_user.role == "student":
        joined = db.query(models.JoinedSection).filter(
            models.JoinedSection.section_id == section_id,
            models.JoinedSection.student_id == current_user.id,
        ).first()
        if not joined:
            raise HTTPException(status_code=403, detail="Not joined to this section")

    assignments = (
        db.query(models.Assignment)
        .filter(models.Assignment.section_id == section_id)
        .order_by(models.Assignment.created_at.desc())
        .all()
    )

    return [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "max_attempts": a.max_attempts,
        }
        for a in assignments
    ]
@app.get("/student/submissions/{assignment_id}")
def student_submission_result(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students")

    sub = (
        db.query(models.Submission)
        .filter(
            models.Submission.assignment_id == assignment_id,
            models.Submission.student_id == current_user.id
        )
        .order_by(models.Submission.created_at.desc())
        .first()
    )

    if not sub:
        return {"status": "not_submitted"}

    reviewed = sub.remark_text is not None

    return {
        "status": "reviewed" if reviewed else "submitted",
        "reviewed": reviewed,
        "remark": sub.remark_text,
        "needs_resubmission": sub.needs_resubmission,
        "teacher_score": sub.teacher_score,
        "teacher_out_of": sub.teacher_out_of,
        "similarity": f"{sub.similarity_score*100:.2f}%" if reviewed else None,
        "ai_label": sub.ai_label if reviewed else None,
        "ai_confidence": f"{sub.ai_confidence*100:.2f}%" if reviewed else None,
        "file_url": sub.file_url,
    }
