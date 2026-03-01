import React, { useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/Button";

function FileUpload({ domain, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }

    if (!domain) {
      toast.error("Select a domain first.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Not authenticated.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("domain", domain);

    setUploading(true);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/check-personal-document/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        toast.error(`Upload failed (${res.status})`);
        return;
      }

      const result = await res.json();

      toast.success("Upload complete");

      setFile(null);
      onUploadSuccess?.(result);

    } catch (err) {
      console.error(err);
      toast.error("Unexpected upload error.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="
        w-full
        p-6
        rounded-2xl
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        shadow-sm hover:shadow-lg
        transition-all
      "
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">

        {/* FILE INPUT */}
        <input
          type="file"
          onChange={handleFileChange}
          className="
            w-full
            text-sm
            text-gray-900 dark:text-gray-200
            file:mr-4 file:px-4 file:py-2
            file:rounded-lg
            file:border-0
            file:bg-indigo-50 dark:file:bg-slate-700
            file:text-indigo-600 dark:file:text-cyan-400
            hover:file:bg-indigo-100
            transition-all
          "
        />

        {/* BUTTON */}
        <Button
          onClick={handleUpload}
          disabled={uploading}
          variant="primary"
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>

      </div>
    </div>
  );
}

export default FileUpload;