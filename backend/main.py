from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, status
from fastapi.middleware.cors import CORSMiddleware
#from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from public_corpus import PUBLIC_CORPUS
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
from sentence_transformers import SentenceTransformer, util

semantic_model = SentenceTransformer("all-MiniLM-L6-v2")

def semantic_similarity(user_text: str, corpus_texts: list):
    if not corpus_texts:
        return 0.0

    emb1 = semantic_model.encode([user_text], convert_to_tensor=True)
    emb2 = semantic_model.encode(corpus_texts, convert_to_tensor=True)

    scores = util.cos_sim(emb1, emb2)
    return round(float(scores.max().item()), 4)

from sklearn.feature_extraction.text import TfidfVectorizer

def char_ngram_similarity(user_text, corpus_texts):
    if not corpus_texts:
        return 0.0

    texts = corpus_texts + [user_text]

    vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(3,5))
    tfidf = vectorizer.fit_transform(texts)

    sim = cosine_similarity(tfidf)
    score = sim[-1][:-1].max()

    return round(float(score), 4)

def semantic_source_mapping(user_text: str, domain: str, threshold=0.55):
    import re
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    results = []

    # split user text into sentences
    sentences = re.split(r'(?<=[.!?])\s+', user_text)

    corpus_items = PUBLIC_CORPUS.get(domain, [])
    corpus_texts = [item["text"] for item in corpus_items]

    if not sentences or not corpus_texts:
        return []

    # TFIDF vectorization
    vectorizer = TfidfVectorizer().fit(corpus_texts + sentences)
    vectors = vectorizer.transform(corpus_texts + sentences)

    corpus_vecs = vectors[:len(corpus_texts)]
    sentence_vecs = vectors[len(corpus_texts):]

    sim_matrix = cosine_similarity(sentence_vecs, corpus_vecs)

    for i, sentence in enumerate(sentences):
        for j, score in enumerate(sim_matrix[i]):
            if score >= threshold:
                results.append({
                    "source": corpus_items[j]["source"],
                    "phrase": corpus_items[j]["text"],
                    "url": corpus_items[j]["url"],
                    "score": round(float(score),3)
                })

    # remove duplicates
    unique = { (r["source"], r["phrase"]) : r for r in results }

    return list(unique.values())

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

def compare_with_public_corpus(user_text: str, domain: str):
    user_fps = generate_fingerprints(user_text)
    corpus_items = PUBLIC_CORPUS.get(domain, [])
    corpus_texts = [item["text"] for item in corpus_items]

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
    corpus_items = PUBLIC_CORPUS.get(domain, [])
    corpus_texts = [item["text"] for item in corpus_items]

    # ---------- build corpus fingerprint map ----------
    corpus_fps_map = {}

    for text in corpus_texts:
        words = normalize_text(text).split()

        for i in range(len(words) - shingle_size + 1):
            phrase = " ".join(words[i:i + shingle_size])
            h = hashlib.sha256(phrase.encode()).hexdigest()
            corpus_fps_map[h] = phrase

    # ---------- detect matches + assign heat score ----------
    matched = {}

    for i in range(len(user_words) - shingle_size + 1):
        phrase = " ".join(user_words[i:i + shingle_size])
        h = hashlib.sha256(phrase.encode()).hexdigest()

        if h in corpus_fps_map:

            # 🔥 simple intensity scoring
            # longer phrases = stronger similarity
            word_count = len(phrase.split())

            if word_count >= 8:
                score = 0.8
            elif word_count >= 6:
                score = 0.6
            else:
                score = 0.4

            matched[phrase] = {
                "phrase": phrase,
                "score": score
            }

    # ---------- return list of objects ----------
    return list(matched.values())[:10]

from reportlab.lib import colors

# 🔥 VISUAL SCORE BAR (Turnitin-style)
def draw_score_bar(c, label, score_percent, x, y, width=260, height=10):
    """
    score_percent = 0-100
    """

    # Label text
    c.setFont("Helvetica", 10)
    c.drawString(x, y + 14, f"{label}: {score_percent:.2f}%")

    # Background bar
    c.setFillColor(colors.lightgrey)
    c.rect(x, y, width, height, fill=1, stroke=0)

    # Color logic
    if score_percent >= 70:
        c.setFillColor(colors.red)
    elif score_percent >= 40:
        c.setFillColor(colors.orange)
    else:
        c.setFillColor(colors.green)

    # Filled amount
    fill_width = width * (score_percent / 100)
    c.rect(x, y, fill_width, height, fill=1, stroke=0)


def generate_plagiarism_report(result):
    import os, json
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    os.makedirs("reports", exist_ok=True)
    filename = f"report_{result.id}.pdf"
    path = os.path.join("reports",filename)
    if os.path.exists(path):
        os.remove(path)

    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4

    # ---------- Helper: Draw Visual Score Bar ----------
    def draw_score_bar(c, label, percent, x, y, bar_width=250, bar_height=12):
        c.setFont("Helvetica", 10)
        c.drawString(x, y + 14, f"{label}: {percent:.2f}%")

        # Background bar
        c.rect(x, y, bar_width, bar_height, stroke=1, fill=0)

        # Filled width
        fill_width = (percent / 100.0) * bar_width
        c.setFillColorRGB(0.2, 0.5, 0.9)  # blue fill
        c.rect(x, y, fill_width, bar_height, fill=1)
        c.setFillColorRGB(0, 0, 0)

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

    # ---------- Visual Score Bars ----------
    y -= 10

    similarity_percent = result.similarity_score * 100
    ai_percent = result.ai_confidence * 100 if result.ai_confidence else 0

    draw_score_bar(
        c,
        "Plagiarism Similarity",
        similarity_percent,
        x=50,
        y=y
    )
    y -= 30

    draw_score_bar(
        c,
        "AI Confidence",
        ai_percent,
        x=50,
        y=y
    )
    y -= 40

    # ---------- Explanation ----------
    explanation = result.plagiarism_explanation or "No explanation available."

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

    y -= 25
    
    # ---------- SOURCE MAPPING (🔥 Your big upgrade) ----------
    source_mapping = getattr(result, "source_mapping", None)

    if source_mapping:
        try:
            mapping_data = source_mapping
            if isinstance(source_mapping, str):
                mapping_data = json.loads(source_mapping)

            if len(mapping_data)>0:

                if y < 80:
                    c.showPage()
                    y = height - 50

                c.setFont("Helvetica-Bold",13)
                c.drawString(50, y,"Public Source Matches")    
                y-=22

                for item in mapping_data:

                    if y <80:
                        c.showPage()
                        y=height - 50
                    
                    source = item.get("source","Unknown Source")
                    phrase = item.get("phrase","")
                    url=item.get("url","")

                    c.setFont("Helvetica-Bold",10)
                    c.drawString(60, y, f"[{source}]")
                    y-=14

                    c.setFont("Helvetica-Bold",10)
                    text_obj = c.beginText(75,y)
                    text_obj.setLeading(13)

                    for line in phrase[:200].split(". "):
                        text_obj.textLine(line.strip())
                    
                    c.drawText(text_obj)
                    y=text_obj.getY() - 6

                    if url:
                        c.setFont("Helvetica-Oblique",9)
                        c.drawString(75,y,url)
                        y-=14

                    y-=10
        except Exception as e:
            print("PDF SOURCE MAPPING ERROR :", e)

    # ---------- Footer ----------
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(
        50,
        30,
        "Generated by EduShield • AI-assisted plagiarism & authorship detection",
    )

    c.save()
    return path

import re

def split_sentences(text: str):
    # simple sentence splitter
    sentences = re.split(r'[.!?]+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 20]

import textwrap

def ai_score_document(text):
    chunks = textwrap.wrap(text, width=350)

    scores = []
    for ch in chunks:
        if not ch.strip():
            continue

        res = ai_detector(ch)[0]
        scores.append(res["score"])

    if not scores:
        return 0.0

    return round(sum(scores) / len(scores), 4)

def sentence_level_ai_detection(text: str):
    sentences = split_sentences(text)

    if not sentences:
        return "Human-written", 0.0

    scores = []
    ai_votes = 0

    for s in sentences[:20]:  # limit for speed
        result = ai_detector(s[:256])[0]
        score = float(result.get("score", 0.0))
        label = result.get("label")

        scores.append(score)

        if label in ("LABEL_0", "FAKE"):
            ai_votes += 1

    avg_conf = sum(scores) / len(scores)

    if ai_votes > len(sentences) * 0.4:
        return "AI-generated", round(avg_conf, 4)
    else:
        return "Human-written", round(avg_conf, 4)


def domain_adjusted_score(score: float, domain: str):
    # academic domains behave differently
    adjustments = {
        "cs": 0.9,
        "science": 1.0,
        "commerce": 1.1,
        "general": 1.0,
    }

    factor = adjustments.get(domain, 1.0)
    return round(min(score * factor, 1.0), 4)

def stylometric_score(text: str):
    sentences = split_sentences(text)
    words = text.split()

    if not sentences or not words:
        return 0.0

    avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
    vocab_richness = len(set(words)) / len(words)

    # AI tends to have balanced structure
    score = (avg_sentence_length / 30) * 0.5 + vocab_richness * 0.5

    return round(min(score, 1.0), 4)

def sentence_similarity_analysis(user_text: str, domain: str):
    import re

    sentences = re.split(r'(?<=[.!?])\s+', user_text)
    corpus_items = PUBLIC_CORPUS.get(domain, [])
    corpus_texts = [item["text"] for item in corpus_items]
    if not sentences or not corpus_texts:
        return []

    corpus_joined = " ".join(corpus_texts)

    vectorizer = TfidfVectorizer().fit([corpus_joined] + sentences)
    vectors = vectorizer.transform([corpus_joined] + sentences)

    corpus_vec = vectors[0]
    sentence_vecs = vectors[1:]

    scores = cosine_similarity(sentence_vecs, corpus_vec).flatten()

    results = []

    for sent, score in zip(sentences, scores):
        results.append({
            "sentence": sent.strip(),
            "score": round(float(score), 3)
        })

    return results[:20]  # limit output


def extract_source_mapping(user_text: str, domain: str, shingle_size=3):
    import hashlib

    user_words = normalize_text(user_text).split()
    corpus_items = PUBLIC_CORPUS.get(domain, [])

    corpus_map = {}

    # Build corpus fingerprint map WITH SOURCE
    for item in corpus_items:
        text = item["text"]
        source = item.get("source", "Unknown")
        url = item.get("url", "")

        words = normalize_text(text).split()
        for i in range(len(words) - shingle_size + 1):
            phrase = " ".join(words[i:i + shingle_size])
            h = hashlib.sha256(phrase.encode()).hexdigest()
            corpus_map[h] = {
                "phrase": phrase,
                "source": source,
                "url": url,
            }

    matches = []

    for i in range(len(user_words) - shingle_size + 1):
        phrase = " ".join(user_words[i:i + shingle_size])
        h = hashlib.sha256(phrase.encode()).hexdigest()

        if h in corpus_map:
            matches.append(corpus_map[h])

    print("SOURCE MAPPING:", matches[:5])  # debug

    return matches[:15]
import statistics

def burstiness_score(text: str):
    sentences = split_sentences(text)
    if len(sentences) < 3:
        return 0.0

    lengths = [len(s.split()) for s in sentences]

    try:
        variance = statistics.pstdev(lengths)
    except:
        variance = 0

    # lower variance → more AI-like
    score = 1 - min(variance / 15, 1)

    return round(score, 4)


def hybrid_ai_score(text: str):
    doc_ai = ai_score_document(text)
    sent_label, sent_conf = sentence_level_ai_detection(text)
    style = stylometric_score(text)

    # 🔥 Weighted ensemble
    burst = burstiness_score(text)

    final_score = (
        0.5 * doc_ai +
        0.2 * sent_conf +
        0.15 * (1 - style) +
        0.15 * burst
)

    return round(min(final_score, 1.0), 4)


def detect_academic_structure(text: str):
    headings = len(re.findall(
        r"(chapter|introduction|abstract|system design|requirement|analysis|diagram|figure)",
        text.lower()
    ))

    math_patterns = len(re.findall(r"[=+\-*/]\s*\d", text))
    bullet_points = len(re.findall(r"[•·\-]\s", text))

    # scoring
    structure_score = headings + (math_patterns // 5) + (bullet_points // 3)

    return structure_score

def stabilize_ai_score(ai_conf: float, text: str):
    structure = detect_academic_structure(text)
    length = len(text.split())

    # academic content penalty
    if structure > 8:
        ai_conf *= 0.80

    # very long documents are less reliable
    if length > 3000:
        ai_conf *= 0.90

    return round(min(max(ai_conf, 0.0), 1.0), 4)

# ---------- Endpoints ----------
@app.get("/")
def root():
    return {"message": "EduShield backend running (assignments+submissions)"}

# 1) Faculty creates assignment (stores reference in S3). Sends emails to joined students.
@app.post("/assignments/create")
async def create_assignment(section_id: int = Form(...),title: str = Form(...),
    description: str = Form(""),due_date: str = Form(...),  max_attempts: int = Form(1),
    allow_resubmission: bool = Form(False), reference_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), current_user: models.Users = Depends(get_current_user),):
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
        status_code=400,detail="due_date must be ISO format e.g. 2025-12-20T23:59:00" )
    assignment = models.Assignment(  section_id=section_id,
        created_by=current_user.id, title=title, description=description,
        due_date=due_dt, reference_file_url=ref_url, reference_text = reference_text,
        max_attempts=max_attempts, allow_resubmission=allow_resubmission,created_at=datetime.utcnow(),
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

    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # 🔐 Deadline check
    now_utc = datetime.now(timezone.utc)
    due = assignment.due_date
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)

    if now_utc > due:
        raise HTTPException(status_code=400, detail="Deadline has passed")

    # 🔁 Attempt check
    used_attempts = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == current_user.id
    ).count()

    if assignment.max_attempts and used_attempts >= assignment.max_attempts:
        raise HTTPException(status_code=400, detail="Max attempts reached")

    # 📂 Read file
    contents = await file.read()
    content_type = getattr(file, "content_type", "application/octet-stream")

    if file.filename.lower().endswith(".docx"):
        submitted_text = extract_text_from_docx_bytes(contents)

    elif file.filename.lower().endswith(".pdf"):
        tmp_path = f"temp/{datetime.utcnow().timestamp()}_{file.filename}"
        os.makedirs("temp", exist_ok=True)
        with open(tmp_path, "wb") as tf:
            tf.write(contents)
        submitted_text = extract_pdf_text(tmp_path)
        os.remove(tmp_path)

    else:
        raise HTTPException(status_code=400, detail="Only .docx and .pdf supported")

    # ☁ Upload to S3
    s3_url = upload_to_s3(contents, file.filename, content_type, folder="submissions")

    # 🚀 HARDCORE DETECTION ENGINE
    results = run_full_detection(
        text=submitted_text,
        domain=getattr(assignment, "domain", "general"),
        reference_text=assignment.reference_text
    )

    attempt_number = used_attempts + 1

    # 💾 Save submission
    submission = models.Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        filename=file.filename,
        text_content=submitted_text,
        file_url=s3_url,
        similarity_score=results["final_similarity"],
        
        #matched_phrases=results["matched_phrases"],
        #source_mapping=results["source_mapping"],
        ai_label=results["ai_label"],
        ai_confidence=results["ai_confidence"],
        attempt_number=attempt_number,
        created_at=datetime.utcnow(),
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    # 🔥 Student-to-student recalculation
    calculate_student_plagiarism(db, assignment_id)

    return {
        "message": "Submitted successfully",
        "submission_id": submission.id,
        "similarity": f"{results['final_similarity']*100:.2f}%",
        "teacher_similarity": f"{results['teacher_similarity']*100:.2f}%",
        "public_similarity": f"{results['public_similarity']*100:.2f}%",
        "ai": {
            "label": results["ai_label"],
            "confidence": f"{results['ai_confidence']*100:.2f}%"
        }
    }

# 3) Faculty: list submissions for assignment (with attempt number, student info)
@app.get("/assignments/{assignment_id}/submissions")
def assignment_submissions(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):

    if current_user.role != 'faculty':
        raise HTTPException(status_code=403, detail='Only faculty')

    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail='Assignment not found')

    subs = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id
    ).order_by(models.Submission.created_at.asc()).all()

    out = []

    for s in subs:
        student = db.query(models.Users).filter(
            models.Users.id == s.student_id
        ).first()

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

            # ⭐ REVIEW SYSTEM
            "review_status": getattr(s, 'review_status', "pending"),
            "reviewed_at": s.reviewed_at.isoformat() if getattr(s, 'reviewed_at', None) else None,
        })

    # ✅ RETURN MUST BE OUTSIDE LOOP
    return out

# 4) Faculty: add remark / grade / request resubmission for a submission
from fastapi import Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

@app.post("/submissions/{submission_id}/remark")
def add_remark(
    submission_id: int,
    remark_text: str = Form(...),
    needs_resubmission: bool = Form(False),
    teacher_score: Optional[float] = Form(None),
    teacher_out_of: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    # 🔐 Only faculty allowed
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty")

    # 🔎 Find submission
    sub = db.query(models.Submission).filter(
        models.Submission.id == submission_id
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # 🧠 Validate remark length
    if len(remark_text) > 100:
        raise HTTPException(
            status_code=400,
            detail="Remark too long (max 100 characters)"
        )

    # ✅ Save basic fields
    sub.remark_text = remark_text
    sub.needs_resubmission = needs_resubmission

    # ⭐ Review status system
    if needs_resubmission:
        sub.review_status = "resubmission_required"
    else:
        sub.review_status = "reviewed"

    sub.reviewed_at = datetime.utcnow()

    # ⭐ Optional grading
    if teacher_score is not None:
        sub.teacher_score = teacher_score

    if teacher_out_of is not None:
        sub.teacher_out_of = teacher_out_of

    # 💾 Save to DB
    db.commit()
    db.refresh(sub)

    # 📩 Email notification (SAFE — won't break endpoint)
    try:
        student = db.query(models.Users).filter(
            models.Users.id == sub.student_id
        ).first()

        if student and student.email:
            subj = f"Remark added to your submission (Assignment {sub.assignment_id})"
            body = f"""
Hello {student.name or student.email},

Your submission has been reviewed.

Remark:
{remark_text}

Resubmission required: {needs_resubmission}

Please login to EduShield to view details.
"""
            send_email(student.email, subj, body)

    except Exception as e:
        print("Email sending failed:", e)

    # ✅ IMPORTANT — ALWAYS RETURN RESPONSE
    return {
        "message": "Remark saved",
        "review_status": sub.review_status,
        "reviewed_at": sub.reviewed_at
    }
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
            out.append({"section_id": sec.id,"section_subject": sec.subject,
                "assignment_id": a.id, "title": a.title,"due_date": a.due_date.isoformat(),"attempts_used": used,
                "max_attempts": a.max_attempts,"status": "locked" if locked else ("submitted" if used > 0 else "pending"),
                "last_remark": last_remark,"needs_resubmission": needs_resub,
            })
    return out




    if not result:
        raise HTTPException(status_code=404, detail="Report not found")

    path = generate_plagiarism_report(result)
    return FileResponse(path, filename="EduShield_Reports.pdf")

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
@app.get("/profile-summary")
def profile_summary(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    summary = {
        "sections": 0,
        "assignments": 0,
        "submissions": 0,
        "personal_checks": 0,
    }

    # PERSONAL CHECKS (works for everyone)
    summary["personal_checks"] = db.query(models.AssignmentResult).filter(
        models.AssignmentResult.user_id == current_user.id,
        models.AssignmentResult.section_id == None
    ).count()

    # ======================
    # FACULTY LOGIC
    # ======================
    if current_user.role == "faculty":

        summary["sections"] = db.query(models.Section).filter(
            models.Section.created_by == current_user.id
        ).count()

        summary["assignments"] = db.query(models.Assignment).filter(
            models.Assignment.created_by == current_user.id
        ).count()

        # submissions received on faculty assignments
        summary["submissions"] = db.query(models.Submission).join(
            models.Assignment,
            models.Submission.assignment_id == models.Assignment.id
        ).filter(
            models.Assignment.created_by == current_user.id
        ).count()

    # ======================
    # STUDENT LOGIC
    # ======================
    elif current_user.role == "student":

        summary["sections"] = db.query(models.JoinedSection).filter(
            models.JoinedSection.student_id == current_user.id
        ).count()

        summary["submissions"] = db.query(models.Submission).filter(
            models.Submission.student_id == current_user.id
        ).count()

    return summary
@app.get("/faculty-dashboard-summary")
def faculty_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # ✅ Sections created by this faculty
    total_sections = db.query(models.Section).filter(
        models.Section.created_by == current_user.id
    ).count()

    # ✅ Students joined those sections
    total_students = db.query(models.JoinedSection).join(
        models.Section,
        models.JoinedSection.section_id == models.Section.id
    ).filter(
        models.Section.created_by == current_user.id
    ).count()

    # ✅ Assignments uploaded by faculty
    total_assignments = db.query(models.Assignment).filter(
        models.Assignment.created_by == current_user.id
    ).count()

    # ✅ Submissions received
    total_submissions = db.query(models.Submission).join(
        models.Assignment,
        models.Submission.assignment_id == models.Assignment.id
    ).filter(
        models.Assignment.created_by == current_user.id
    ).count()

    # ✅ Personal uploads (UploadPage)
    total_personal = db.query(models.AssignmentResult).filter(
        models.AssignmentResult.user_id == current_user.id,
        models.AssignmentResult.section_id == None
    ).count()

    return {
        "sections": total_sections,
        "students": total_students,
        "assignments": total_assignments,
        "submissions": total_submissions,
        "personal_uploads": total_personal
    }
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

@app.get("/faculty/recent-activity")
def faculty_recent_activity(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):

    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    activities = []

    # ─────────────────────────────
    # 1️⃣ STUDENT SUBMISSIONS
    # ─────────────────────────────
    submission_rows = (
        db.query(
            models.Submission.created_at,
            models.Users.name.label("student_name"),
        )
        .join(models.Assignment,
              models.Submission.assignment_id == models.Assignment.id)
        .join(models.Users,
              models.Submission.student_id == models.Users.id)
        .filter(models.Assignment.created_by == current_user.id)
        .order_by(desc(models.Submission.created_at))
        .limit(5)
        .all()
    )

    for row in submission_rows:
        activities.append({
            "student_name": row.student_name,
            "action": "Submitted assignment",
            "time": row.created_at,
        })

    # ─────────────────────────────
    # 2️⃣ STUDENTS JOINED SECTION
    # ─────────────────────────────
    joined_rows = (
        db.query(
            models.JoinedSection.joined_at,
            models.Users.name.label("student_name"),
        )
        .join(models.Section,
              models.JoinedSection.section_id == models.Section.id)
        .join(models.Users,
              models.JoinedSection.student_id == models.Users.id)
        .filter(models.Section.created_by == current_user.id)
        .order_by(desc(models.JoinedSection.joined_at))
        .limit(5)
        .all()
    )

    for row in joined_rows:
        activities.append({
            "student_name": row.student_name,
            "action": "Joined a section",
            "time": row.joined_at,
        })

    # ─────────────────────────────
    # 3️⃣ PERSONAL CHECKS (OPTIONAL)
    # ─────────────────────────────
    personal_rows = (
        db.query(
            models.AssignmentResult.timestamp,
            models.Users.name.label("student_name"),
        )
        .join(models.Users,
              models.AssignmentResult.user_id == models.Users.id)
        .join(models.Section,
              models.AssignmentResult.section_id == models.Section.id)
        .filter(models.Section.created_by == current_user.id)
        .order_by(desc(models.AssignmentResult.timestamp))
        .limit(5)
        .all()
    )

    for row in personal_rows:
        activities.append({
            "student_name": row.student_name,
            "action": "Performed personal check",
            "time": row.timestamp,
        })

    # ─────────────────────────────
    # SORT ALL ACTIVITIES BY TIME
    # ─────────────────────────────
    activities = sorted(
        activities,
        key=lambda x: x["time"] or datetime.min,
        reverse=True
    )

    # RETURN ONLY TOP 6 RECENT ITEMS
    return activities[:6]

from fastapi import Form

@app.patch("/users/update-profile")
def update_profile(
    name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    current_user.name = name.strip()
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated",
        "name": current_user.name
    }
@app.delete("/sections/{section_id}/leave")
def leave_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")

    joined = db.query(models.JoinedSection).filter(
        models.JoinedSection.section_id == section_id,
        models.JoinedSection.student_id == current_user.id
    ).first()

    if not joined:
        raise HTTPException(status_code=404, detail="Not part of section")

    db.delete(joined)
    db.commit()

    return {"message": "Left section successfully"}

@app.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role != "faculty" or assignment.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(assignment)
    db.commit()

    return {"message": "Assignment deleted"}

@app.delete("/sections/{section_id}")
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_user)
):
    section = db.query(models.Section).filter(
        models.Section.id == section_id
    ).first()

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if current_user.role != "faculty" or section.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(section)
    db.commit()

    return {"message": "Section deleted"}
