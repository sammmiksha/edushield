from database import SessionLocal
from models import Assignment
from datetime import datetime


db = SessionLocal()

assignment = Assignment(
    name="First Assignment",
    title="Sample Assignment",
    description="Test description",
    reference_filename="reference.docx",
    created_by=5,
    created_at=datetime.utcnow()  # user id
)
db.add(assignment)
db.commit()
db.refresh(assignment)
print("Created assignment ID:", assignment.id)
