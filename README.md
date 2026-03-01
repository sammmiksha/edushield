EduShield – AI-Powered Plagiarism & Authorship Detection System

EduShield is a full-stack web application designed to detect plagiarism and AI-generated content in academic documents.
It supports both classroom-based evaluation (Faculty–Student workflow) and personal document checking, making it suitable for real-world academic use.

This project was developed as a BSc IT final-year project, focusing on practical application of Machine Learning, Web Development, and Cloud Integration.

🚀 Key Features
🔐 Authentication & Roles

Secure JWT-based authentication

Role-based access:

Faculty

Student

Personal User

👩‍🏫 Faculty Module

Create sections (classrooms) with access codes

Upload reference assignments

View student submissions

Detect:

Student-to-reference plagiarism

Student-to-student plagiarism

Add remarks, grades, and resubmission requests

👨‍🎓 Student Module

Join sections using access code

Upload assignments

View plagiarism & AI results

Track submission attempts and deadlines

Receive feedback from faculty

📄 Personal Document Checker (Real-World Mode)

Upload .pdf or .docx files

Domain-based plagiarism analysis:

Computer Science

Science

Commerce

General

Fingerprint-based plagiarism detection

AI-generated content detection

Severity classification:

Low

Medium

High

Highlighted matched phrases

Downloadable PDF plagiarism report

🧠 Plagiarism Detection Approach
✔ Fingerprint-Based Method

Text is normalized and broken into word shingles

Each shingle is hashed (SHA-256)

User fingerprints are compared against a domain-specific public corpus

Similarity is calculated using fingerprint overlap ratio

✔ Severity Interpretation
Similarity Score	Severity	Meaning
≤ 15%	Low	Common academic phrases
16–40%	Medium	Partial resemblance
> 40%	High	Strong overlap
🤖 AI Content Detection

Uses a transformer-based model (roberta-base-openai-detector)

Classifies content as:

AI-generated

Human-written

Confidence score included in results

📑 PDF Report Generation

Automatically generates a professional plagiarism report

Includes:

Filename

Similarity percentage

Severity level

AI detection result

Highlighted matched phrases

Downloadable directly from the UI

🧰 Tech Stack
Frontend

React.js

Tailwind CSS

Fetch API

Toast notifications

Backend

FastAPI

SQLAlchemy

PostgreSQL

JWT Authentication

AI / ML

Scikit-learn (TF-IDF, cosine similarity)

Transformers (HuggingFace)

Fingerprint hashing (SHA-256)

Cloud & Utilities

AWS S3 (file storage)

ReportLab (PDF generation)

📁 Project Structure
EduShield/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── database.py
├── frontend/
│   ├── src/
│   └── components/
├── uploads/
└── README.md

⚙️ How to Run the Project (Local)
Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

Frontend
cd frontend
npm install
npm run dev

🔒 Repository Access

This repository is private.
Access is granted only to collaborators added by the owner.

📈 Future Enhancements

Online corpus integration

Improved semantic plagiarism detection

Admin dashboard & analytics

Multi-language plagiarism detection

Deployment on cloud (AWS / Azure)

👩‍💻 Author

Samiksha Patil
BSc Information Technology
Final Year Project – EduShield
