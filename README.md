<div align="center">

# 🛡️ EduShield
### AI-Powered Plagiarism & Authorship Detection System

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co)

*A full-stack academic integrity platform built as a BSc IT Final Year Project*

</div>

---

## 📖 Overview

**EduShield** detects plagiarism and AI-generated content in student documents through two workflows: a **classroom-based Faculty–Student pipeline** for institutional use, and a **Personal Document Checker** for individual users — built to serve educators and independent researchers alike.

---

## ✨ Features at a Glance

| Feature | Student | Faculty | Personal User |
|---|:---:|:---:|:---:|
| Upload Documents | ✅ | ✅ | ✅ |
| Plagiarism Detection | ✅ | ✅ | ✅ |
| AI Content Detection | ✅ | ✅ | ✅ |
| Downloadable PDF Report | — | — | ✅ |
| View Assignment Feedback | ✅ | — | — |
| Manage Sections | — | ✅ | — |
| Review Submissions | — | ✅ | — |

---

## 🚀 Key Modules

### 🔐 Authentication & Role Management
- Secure **JWT-based authentication**
- Three roles: **Faculty**, **Student**, **Personal User**
- Role-based UI and API access control

### 👩‍🏫 Faculty Module
- Create **classroom sections** with unique access codes
- Upload **reference assignments** per section
- Review all **student submissions**
- Detect:
  - Student-to-reference plagiarism
  - Student-to-student cross-comparison
- Add **remarks**, **grades**, and **resubmission requests**

### 👨‍🎓 Student Module
- Join sections via **access code**
- Upload assignments (`.pdf` / `.docx`)
- View **plagiarism percentage** and **AI detection results**
- Track **submission attempts**, **deadlines**, and **faculty feedback**

### 📄 Personal Document Checker
Upload any academic document for a detailed integrity report:
- **Domain-based analysis** — Computer Science · Science · Commerce · General
- **Fingerprint-based plagiarism detection** against a public domain corpus
- **AI content detection** via transformer model
- **Severity classification** — Low · Medium · High
- **Highlighted matched phrases** in results
- **Downloadable PDF report**, ready to share

---

## 🧠 Detection Methodology

### Fingerprint-Based Plagiarism Detection

```
Text Normalization → Word Shingling → SHA-256 Hashing → Corpus Comparison → Similarity Score
```

1. Text is cleaned and broken into overlapping **word shingles**
2. Each shingle is hashed with **SHA-256**
3. Hashes are compared against a **domain-specific public corpus**
4. Similarity is derived from the **fingerprint overlap ratio**

**Severity thresholds:**

| Similarity Score | Severity | Interpretation |
|---|---|---|
| ≤ 15% | 🟢 Low | Common academic phrasing |
| 16–40% | 🟡 Medium | Partial content resemblance |
| > 40% | 🔴 High | Strong overlap — likely plagiarism |

### AI Content Detection
- **Model:** [`roberta-base-openai-detector`](https://huggingface.co/roberta-base-openai-detector) (HuggingFace Transformers)
- **Output:** AI Generated / Human Written + confidence score
- Integrated directly into results for both personal and classroom uploads

### PDF Report Generation
Auto-generated reports include:
- Document filename & upload timestamp
- Plagiarism percentage + severity badge
- AI detection result + confidence score
- Highlighted matched phrases
- One-click download from the Results page

---

## 🧰 Tech Stack

**Frontend** — React.js (SPA) · Tailwind CSS · Fetch API · Toast notifications

**Backend** — FastAPI · SQLAlchemy ORM · PostgreSQL · JWT authentication

**AI / ML** — Scikit-learn (TF-IDF & cosine similarity) · HuggingFace Transformers (AI detection) · SHA-256 fingerprint hashing (custom plagiarism engine)

**Cloud & Utilities** — AWS S3 (file storage) · ReportLab (PDF generation)

---

## 📁 Project Structure

```
EduShield/
├── backend/
│   ├── main.py           # API routes & app entry point
│   ├── models.py         # SQLAlchemy database models
│   ├── schemas.py        # Pydantic request/response schemas
│   └── database.py       # DB connection & session config
├── frontend/
│   ├── src/
│   │   ├── pages/        # Route-level page components
│   │   ├── components/   # Reusable UI components
│   │   └── App.jsx       # Root component & routing
│   └── public/
├── uploads/               # Temporary file storage
└── README.md
```

---

## ⚙️ Local Setup

**Prerequisites:** Python 3.9+ · Node.js 18+ · PostgreSQL · AWS S3 bucket (for file storage)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --reload
```
> API: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
> App: `http://localhost:3000`

---

## 🔒 Access & Licensing

This repository is **private**. Access is granted only to collaborators explicitly added by the owner.

---

## 📈 Roadmap

- [ ] Online corpus integration for broader plagiarism coverage
- [ ] Semantic plagiarism detection (beyond exact fingerprints)
- [ ] Admin analytics dashboard
- [ ] Multi-language document support
- [ ] Cloud deployment (AWS / Azure)
- [ ] Email notifications for deadlines and feedback

---

<div align="center">

## 👩‍💻 Author

**Samiksha Patil**
BSc Information Technology — Final Year Project

🛡️ *EduShield — Integrity, Verified.*

</div>
