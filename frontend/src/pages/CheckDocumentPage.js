// src/pages/CheckDocumentPage.js
import React, { useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function CheckDocumentPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token"); // adjust if using context
      const response = await axios.post("http://localhost:8000/check-personal-document/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("❌ Error checking document. Please upload a valid .docx or .pdf.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Check Your Document (No Section)</h1>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />
        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload & Check
        </button>

        {result && (
          <div className="mt-6 p-4 border rounded bg-gray-100">
            <p><strong>Filename:</strong> {result.filename}</p>
            <p><strong>Similarity Score:</strong> {result.similarity_score}</p>
            <p><strong>AI Label:</strong> {result.ai_label}</p>
            <p><strong>AI Confidence:</strong> {result.ai_confidence}</p>
          </div>
        )}

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    </>
  );
}

export default CheckDocumentPage;
