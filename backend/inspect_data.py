from sqlalchemy.orm import Session
from database import SessionLocal
from models import Users, Assignment, AssignmentResult, Submission

db: Session = SessionLocal()

# List all users
users = db.query(Users).all()
print("\n=== Users ===")
for user in users:
    print(f"ID: {user.id}, Email: {user.email}, Name: {user.name}, Created: {user.created_at}")

# List all assignments
assignments = db.query(Assignment).all()
print("\n=== Assignments ===")
for a in assignments:
    print(f"ID: {a.id}, Name: {a.name}, Title: {a.title}, Created by: {a.created_by}, Reference File: {a.reference_filename}")

# List all assignment results
results = db.query(AssignmentResult).all()
print("\n=== Assignment Results ===")
for r in results:
    print(f"ID: {r.id}, File: {r.filename}, Score: {r.similarity_score}, Label: {r.ai_label}, User ID: {r.user_id}")

# List all submissions
submissions = db.query(Submission).all()
print("\n=== Submissions ===")
for s in submissions:
    print(f"ID: {s.id}, Assignment ID: {s.assignment_id}, Student ID: {s.student_id}, File: {s.filename}, Score: {s.similarity_score}")
