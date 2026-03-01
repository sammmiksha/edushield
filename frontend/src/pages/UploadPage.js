import React, { useEffect, useState } from "react";
import FileUpload from "../components/FileUpload";
import Avatar from "../components/Avatar";
import "../button.css";
import axios from "axios";

const UploadPage = ({ onUploadSuccess }) => {
  const [user, setUser] = useState(null);
  const [domain, setDomain] = useState("general");

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
    <div className="
      flex flex-col items-center justify-center
      min-h-screen py-10 px-4
      transition-colors duration-300
    ">

      <div className="
        w-full max-w-3xl p-10 rounded-2xl shadow-xl
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        text-gray-900 dark:text-gray-100
      ">

        {/* USER HEADER */}
        {user && (
          <div className="flex items-center gap-4 mb-8">
            <Avatar user={user} />
            <span className="text-lg font-medium">
              {user.email}
            </span>
          </div>
        )}

        {/* TITLE */}
        <h2 className="mb-6 text-2xl font-bold">
          Upload Assignment
        </h2>

        {/* DOMAIN SELECTOR */}
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Select Domain
          </label>

          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="
              w-full rounded-lg px-4 py-2
              border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-900
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500
            "
          >
            <option value="cs">Computer Science</option>
            <option value="science">Science</option>
            <option value="commerce">Commerce</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* FILE UPLOAD COMPONENT */}
        <FileUpload
          domain={domain}
          onUploadSuccess={onUploadSuccess}
        />

      </div>
    </div>
  );
};

export default UploadPage;