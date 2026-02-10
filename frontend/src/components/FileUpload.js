import React, { useState } from "react";
import { toast } from "react-toastify";

function FileUpload({ domain, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    if (!domain) {
      toast.error("Please select a domain before uploading.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("You are not logged in. Please log in first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("domain", domain); // ✅ FIXED

    setUploading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/check-personal-document/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        toast.error(`Upload failed: ${response.status}`);
        return;
      }

      const result = await response.json();
      toast.success("File uploaded successfully!");
      setFile(null);

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6 w-full">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-md font-semibold shadow hover:scale-105 transition-transform duration-300 ${
            uploading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}

export default FileUpload;
