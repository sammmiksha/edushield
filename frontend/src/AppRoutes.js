import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";

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
import FacultyDashboard from "./pages/FacultyDashboard";
import AppLayout from "./components/AppLayout";
import Profile from "./components/Profile";
function AppRoutes({ user, onLogout }) {

  const [results, setResults] = useState([]);

  const fetchResults = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/results", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setResults(data))
      .catch((err) => console.error(err));
  };

  return (
    <Routes>
      <Route element={<AppLayout user={user} onLogout={onLogout} />}>

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            user.role === "faculty"
              ? <FacultyDashboard />
              : <StudentDashboard />
          }
        />

        <Route
          path="/upload"
          element={<UploadPage onUploadSuccess={fetchResults} />}
        />

        <Route path="/results" element={<ResultsPage results={results} />} />
        <Route path="/check" element={<CheckDocumentPage />} />
        <Route path="/profile" element={<Profile />} />
        {/* STUDENT */}
        {user.role === "student" && (
          <>
            <Route path="/student/assignments" element={<StudentAssignmentPage />} />
            <Route path="/student/section/:id" element={<StudentSectionPage />} />
            <Route path="/join-section" element={<JoinSectionPage />} />
          </>
        )}

        {/* FACULTY */}
        {user.role === "faculty" && (
          <>
            <Route path="/submissions" element={<ViewSubmissions />} />
            <Route path="/create-section" element={<CreateSectionPage />} />
          </>
        )}
        
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<PasswordReset />} />

        <Route
          path="*"
          element={<UploadPage onUploadSuccess={fetchResults} />}
        />

      </Route>
    </Routes>
  );
}

export default AppRoutes;