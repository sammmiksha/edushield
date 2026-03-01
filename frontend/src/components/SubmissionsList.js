import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const SubmissionsList = ({ submissions }) => {
  const token = localStorage.getItem("token");

  const [expandedId, setExpandedId] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [needsResub, setNeedsResub] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [reviewState, setReviewState] = useState({});

  const formatAiLabel = (label) => {
    if (!label) return "N/A";
    if (label.toLowerCase() === "fake") return "AI-Generated";
    if (label.toLowerCase() === "real") return "Human-Written";
    return label;
  };

  const reviewBadge = (status) => {
    switch (status) {
      case "reviewed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
      case "resubmission_required":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300";
    }
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

      toast.success("Review submitted");

      // Instantly update UI
      setReviewState((prev) => ({
        ...prev,
        [submissionId]: needsResub[submissionId]
          ? "resubmission_required"
          : "reviewed",
      }));

    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting((s) => ({ ...s, [submissionId]: false }));
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0f172a]">

      <table className="w-full text-sm">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left">Student</th>
            <th className="px-4 py-3 text-left">Document</th>
            <th className="px-4 py-3 text-left">Plagiarism</th>
            <th className="px-4 py-3 text-left">AI</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {submissions.map((s) => {
            const status =
              reviewState[s.submission_id] || s.review_status || "pending";

            return (
              <React.Fragment key={s.submission_id}>
                <tr className="border-t hover:bg-indigo-50/60 dark:hover:bg-white/5 transition-all">
                  <td className="px-4 py-3 font-semibold">
                    {s.student_name}
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg text-xs bg-indigo-50 dark:bg-indigo-500/20">
                      📄 {s.filename}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold text-indigo-500">
                    {s.similarity || "0%"}
                  </td>

                  <td className="px-4 py-3">
                    {formatAiLabel(s.ai_label)} ({s.ai_confidence})
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${reviewBadge(
                        status
                      )}`}
                    >
                      {status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === s.submission_id
                            ? null
                            : s.submission_id
                        )
                      }
                      className="px-3 py-1 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600"
                    >
                      {expandedId === s.submission_id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>

                {expandedId === s.submission_id && (
                  <tr className="bg-gray-50 dark:bg-slate-900/40">
                    <td colSpan="6" className="p-6 space-y-4">

                      {s.file_url && (
                        <iframe
                          src={s.file_url}
                          title="Submission Preview"
                          className="w-full h-[450px] rounded-xl border"
                        />
                      )}

                      <textarea
                        placeholder="Write remark for student"
                        value={remarks[s.submission_id] || ""}
                        onChange={(e) =>
                          setRemarks((r) => ({
                            ...r,
                            [s.submission_id]: e.target.value,
                          }))
                        }
                        className="w-full p-3 rounded-xl border dark:bg-[#020617]"
                      />

                      <div className="flex items-center gap-3">
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
                        <span className="text-sm">
                          Require resubmission
                        </span>
                      </div>

                      <button
                        onClick={() => submitRemark(s.submission_id)}
                        disabled={submitting[s.submission_id]}
                        className="px-5 py-2 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:scale-[1.03]"
                      >
                        {submitting[s.submission_id]
                          ? "Saving..."
                          : "Submit Review"}
                      </button>

                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

    </div>
  );
};

export default SubmissionsList;