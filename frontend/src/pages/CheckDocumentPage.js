// src/pages/CheckDocumentPage.js
import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

function CheckDocumentPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:8000/check-personal-document/",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(res.data);
    } catch (err) {
      toast.error("Invalid document. Upload PDF or DOCX.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 transition-colors duration-300">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        Check Document (Personal)
      </h1>

      {/* UPLOAD CARD */}
      <div
        className="
          bg-white dark:bg-slate-800
          border border-gray-200 dark:border-slate-700
          rounded-2xl
          shadow-sm hover:shadow-lg
          transition-all
          p-8
        "
      >
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Upload PDF or DOCX
        </label>

        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files[0])}
          className="
            w-full mb-6
            text-gray-900 dark:text-gray-200
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg
            file:border-0
            file:bg-indigo-50 dark:file:bg-slate-700
            file:text-indigo-600 dark:file:text-cyan-400
            hover:file:bg-indigo-100
          "
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="
            w-full py-2.5 rounded-xl
            bg-gradient-to-r from-indigo-500 to-cyan-500
            text-white font-semibold
            hover:shadow-lg hover:scale-[1.02]
            transition-all
            disabled:opacity-50
          "
        >
          {loading ? "Checking…" : "Upload & Check"}
        </button>
      </div>

      {/* RESULT */}
      {result && (
        <div
          className="
            mt-8
            bg-white dark:bg-slate-800
            border border-gray-200 dark:border-slate-700
            rounded-2xl
            shadow-sm
            p-6
          "
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Analysis Result
          </h3>

          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p><b>Filename:</b> {result.filename}</p>
            <p><b>Similarity Score:</b> {result.similarity_score}%</p>
            <p><b>AI Label:</b> {result.ai_label}</p>
            <p><b>AI Confidence:</b> {result.ai_confidence}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckDocumentPage;