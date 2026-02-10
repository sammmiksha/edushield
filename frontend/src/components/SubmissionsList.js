// src/components/SubmissionsList.js
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const SubmissionsList = ({ submissions }) => {
  const token = localStorage.getItem("token");
  const [remarks, setRemarks] = useState({});
  const [needsResub, setNeedsResub] = useState({});
  const [submitting, setSubmitting] = useState({});

  const formatAiLabel = (label) => {
    if (!label) return "N/A";
    if (label.toLowerCase() === "fake") return "AI-Generated";
    if (label.toLowerCase() === "real") return "Human-Written";
    return label;
  };

  const submitRemark = async (submissionId) => {
    const remark = remarks[submissionId];
    if (!remark || remark.trim().length === 0) {
      toast.error("Remark cannot be empty");
      return;
    }

    setSubmitting((s) => ({ ...s, [submissionId]: true }));

    try {
      const form = new FormData();
      form.append("remark_text", remark);
      form.append("needs_resubmission", needsResub[submissionId] || false);

      await axios.post(
        `http://127.0.0.1:8000/submissions/${submissionId}/remark`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Remark submitted successfully");
    } catch (err) {
      toast.error("Failed to submit remark");
    } finally {
      setSubmitting((s) => ({ ...s, [submissionId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {submissions.map((s) => (
        <div key={s.submission_id} className="bg-white p-6 rounded shadow w-full">
          {/* Header */}
          <div className="mb-3">
            <p className="font-semibold">Student: {s.student_name || "Student"}</p>
            <p className="text-sm text-gray-600">File: {s.filename}</p>
            <p className="text-sm">Similarity: {s.similarity || "0%"}</p>
            <p className="text-sm">
              AI Result: <strong>{formatAiLabel(s.ai_label)}</strong>{" "}
              ({s.ai_confidence})
            </p>
            <p className="text-sm text-gray-500">
              Submitted: {new Date(s.created_at).toLocaleString()}
            </p>
          </div>

          {/* PDF Preview */}
          {s.file_url && (
            <iframe
              src={s.file_url}
              title="Submission Preview"
              className="w-full h-[500px] border rounded mb-4 bg-gray-100"
              
            />
          )}

          {/* Remark Box */}
          <textarea
            placeholder="Write remark for student (visible after review)"
            value={remarks[s.submission_id] || ""}
            onChange={(e) =>
              setRemarks((r) => ({
                ...r,
                [s.submission_id]: e.target.value,
              }))
            }
            className="w-full border rounded p-2 mb-2"
            maxLength={100}
          />

          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={needsResub[s.submission_id] || false}
              onChange={(e) =>
                setNeedsResub((n) => ({
                  ...n,
                  [s.submission_id]: e.target.checked,
                }))
              }
            />
            <label className="text-sm text-gray-700">
              Require resubmission
            </label>
          </div>

          <button
            onClick={() => submitRemark(s.submission_id)}
            disabled={submitting[s.submission_id]}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting[s.submission_id] ? "Saving..." : "Submit Review"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default SubmissionsList;
