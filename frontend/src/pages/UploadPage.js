import React, { useEffect, useState } from "react";
import FileUpload from "../components/FileUpload";
import Avatar from "../components/Avatar";
import "../button.css";
import axios from "axios";
import { ToastContainer } from "react-toastify";

const UploadPage = ({ onUploadSuccess }) => {
  const [user, setUser] = useState(null);
  const [domain, setDomain] = useState("general"); // ✅ default

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("http://127.0.0.1:8000/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUser(res.data))
      .catch((err) => console.error("Error fetching user:", err));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-3xl p-10 rounded-2xl bg-white shadow-xl">
        {user && (
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={user.email} />
            <span className="text-lg font-medium">{user.email}</span>
          </div>
        )}

        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          Upload Assignment
        </h2>

        {/* 🔹 DOMAIN SELECTOR */}
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">
            Select Domain
          </label>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="cs">Computer Science</option>
            <option value="science">Science</option>
            <option value="commerce">Commerce</option>
            <option value="general">General</option>
          </select>
        </div>

        <FileUpload
          domain={domain}                // ✅ PASS DOMAIN
          onUploadSuccess={onUploadSuccess}
        />
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default UploadPage;
