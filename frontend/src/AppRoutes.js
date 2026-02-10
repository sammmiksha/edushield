// AppRoutes.js
import React, { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";

import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PasswordReset from "./pages/PasswordReset";
import ViewSubmissions from "./pages/ViewSubmissions";
import CreateSectionPage from "./pages/CreateSectionPage";
import CheckDocumentPage from "./pages/CheckDocumentPage";
import StudentAssignmentPage from "./pages/StudentAssignmentPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSectionPage from "./pages/StudentSectionPage";
import JoinSectionPage from "./pages/JoinSectionPage";

function AppRoutes({ user, onLogout }) {
  const [results, setResults] = useState([]);

  const fetchResults = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/results", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setResults(data))
      .catch((err) => console.error("Error fetching results:", err));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ---------------- NAVBAR ---------------- */}
      <nav className="flex flex-wrap items-center justify-between bg-blue-600 text-white px-6 py-3 shadow-lg">
        <h2 className="text-xl font-semibold">EduShield</h2>

        <div className="flex gap-3 flex-wrap mt-2 sm:mt-0">
          {user.role === "student" && (
            <>
              <Link to="/upload" className="btn-gradient">Upload</Link>
              <Link to="/results" className="btn-gradient">Results</Link>
              <Link to="/student/assignments" className="btn-gradient">Assignments</Link>
              <Link to="/join-section" className="btn-gradient">Join Section</Link>
            </>
          )}

          {user.role === "faculty" && (
            <>
              <Link to="/upload" className="btn-gradient">Upload</Link>
              <Link to="/results" className="btn-gradient">Results</Link>
              <Link to="/create-section" className="btn-gradient">Create Section</Link>
              <Link to="/submissions" className="btn-gradient">Submissions</Link>
            </>
          )}

          <button
            onClick={onLogout}
            className="btn-gradient bg-red-500 hover:bg-red-600"
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* ---------------- ROUTES ---------------- */}
      <Routes>
        <Route path="/upload" element={<UploadPage onUploadSuccess={fetchResults} />} />
        <Route path="/results" element={<ResultsPage results={results} />} />

        {user.role === "faculty" && (
          <>
            <Route path="/submissions" element={<ViewSubmissions />} />
            <Route path="/create-section" element={<CreateSectionPage />} />
          </>
        )}

        {user.role === "student" && (
          <>
            <Route path="/student/assignments" element={<StudentAssignmentPage />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/section/:id" element={<StudentSectionPage />} />
            <Route path="/join-section" element={<JoinSectionPage />} />
          </>
        )}

        <Route path="/check" element={<CheckDocumentPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<PasswordReset />} />

        <Route path="*" element={<UploadPage onUploadSuccess={fetchResults} />} />
      </Routes>
    </div>
  );
}

export default AppRoutes;
