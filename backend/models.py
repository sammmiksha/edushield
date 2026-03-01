# models.py
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Boolean, func
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy.dialects.postgresql import JSON

class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="student")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # backrefs
    assignments = relationship("AssignmentResult", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    created_sections = relationship("Section", back_populates="faculty", cascade="all, delete-orphan")
    created_assignments = relationship("Assignment", back_populates="creator", cascade="all, delete-orphan")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    access_code = Column(String, unique=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    results = relationship("AssignmentResult", back_populates="section", cascade="all, delete-orphan")
    faculty = relationship("Users", back_populates="created_sections")
    assignments = relationship("Assignment", back_populates="section", cascade="all, delete-orphan")
    joined_students = relationship("JoinedSection", back_populates="section", cascade="all, delete-orphan")


class JoinedSection(Base):
    __tablename__ = "joined_sections"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Users")
    section = relationship("Section", back_populates="joined_students")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=False)

    max_attempts = Column(Integer, nullable=False, default=1)
    allow_resubmission = Column(Boolean, default=False)
    reference_file_url = Column(String, nullable=True)
    reference_text = Column(String, nullable=True)   
    created_at = Column(DateTime, default=datetime.utcnow)
    
    section = relationship("Section", back_populates="assignments")
    creator = relationship("Users", back_populates="created_assignments")
    submissions = relationship(
        "Submission",
        back_populates="assignment",
        cascade="all, delete-orphan"
    )


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    attempt_number = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)

    similarity_score = Column(Float)
    ai_label = Column(String)
    ai_confidence = Column(Float)

    score_value = Column(Float, nullable=True)
    score_out_of = Column(Float, nullable=True)

    remark_text = Column(String(255))
    needs_resubmission = Column(Boolean, default=False)
    review_status = Column(String, default="pending")   # pending | reviewed | resubmission_required
    reviewed_at = Column(DateTime, nullable=True)
    text_content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Users", back_populates="submissions")


class AssignmentResult(Base):
    __tablename__ = "assignment_results"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, nullable=False)

    similarity_score = Column(Float, nullable=False, default=0.0)
    plagiarism_severity = Column(String, nullable=True)
    plagiarism_explanation = Column(String, nullable=True)

    matched_phrases = Column(JSON, nullable=True)
    source_mapping = Column(JSON, nullable=True)
    sentence_analysis = Column(JSON, nullable=True)

    ai_label = Column(String, nullable=False)
    ai_confidence = Column(Float, nullable=False)

    text_preview = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)

    user = relationship("Users", back_populates="assignments")
    section = relationship("Section", back_populates="results")

