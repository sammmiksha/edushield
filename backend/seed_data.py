from sqlalchemy.orm import Session
from database import SessionLocal
from models import Users, Assignment, AssignmentResult, Submission
from datetime import datetime, timezone

# Create a new DB session
db: Session = SessionLocal()

# 🟢 Delete existing data for clean seeding
db.query(Submission).delete()
db.query(AssignmentResult).delete()
db.query(Assignment).delete()
db.query(Users).delete()
db.commit()

# ✅ Create a user
user = Users(
    email="testuser5@example.com",
    hashed_password="fakehashedpassword",
    name="Test User"
)
db.add(user)
db.commit()
db.refresh(user)

# ✅ Create an assignment
assignment = Assignment(
    name="Sample Assignment Name",
    title="Sample Assignment",
    description="This is a sample assignment for testing.",
    reference_filename="sample_reference.pdf",  # Required!
    created_by=user.id,                         # Required!
    created_at=datetime.now(timezone.utc)
)
db.add(assignment)
db.commit()
db.refresh(assignment)

# ✅ Create an assignment result linked to this user
result = AssignmentResult(
    filename="sample_document.txt",
    similarity_score=0.23,
    ai_label="Human",
    ai_confidence=0.85,
    text_preview="This is a sample preview of the document content.",
    user_id=user.id
)
db.add(result)
db.commit()
db.refresh(result)

# ✅ Create a submission linked to the assignment and user
submission = Submission(
    assignment_id=assignment.id,
    student_id=user.id,
    filename="student_submission.txt",
    similarity_score=0.78,
    ai_label="AI",
    ai_confidence=0.92,
    created_at=datetime.now(timezone.utc)
)
db.add(submission)
db.commit()

print("✅ Seed data inserted successfully.")
