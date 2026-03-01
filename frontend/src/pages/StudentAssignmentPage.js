import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const StudentAssignmentPage = () => {
  const token = localStorage.getItem("token");

  const [sections, setSections] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [selectedFile, setSelectedFile] = useState({});
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(true);

  /* ⭐ NEW — review tracking */
  const [seenReviews, setSeenReviews] = useState(() => {
    return JSON.parse(localStorage.getItem("seenReviews") || "{}");
  });

  /* ---------------- FETCH SECTIONS ---------------- */
  const fetchSections = async () => {
    try {
      const res = await axios.get("http://localhost:8000/my-sections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections(res.data || []);
    } catch {
      toast.error("Failed to load sections");
      setSections([]);
    }
  };

  /* ---------------- FETCH DASHBOARD ---------------- */
  const fetchDashboard = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8000/student/dashboard",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDashboard(res.data || []);
    } catch {
      toast.error("Failed to load assignments");
      setDashboard([]);
    }
  };

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSections(), fetchDashboard()]);
      setLoading(false);
    };

    load();
  }, []);

  /* ---------------- NEW FEEDBACK HELPERS ---------------- */

  const hasNewReview = (assignment) => {
    if (!assignment.reviewed_at) return false;
    const lastSeen = seenReviews[assignment.assignment_id];
    return !lastSeen || lastSeen !== assignment.reviewed_at;
  };

  const markReviewSeen = (assignment) => {
    if (!assignment.reviewed_at) return;

    const updated = {
      ...seenReviews,
      [assignment.assignment_id]: assignment.reviewed_at,
    };

    setSeenReviews(updated);
    localStorage.setItem("seenReviews", JSON.stringify(updated));
  };

  /* ---------------- SUBMIT ASSIGNMENT ---------------- */
  const handleUpload = async (assignmentId) => {
    const file = selectedFile[assignmentId];

    if (!file) {
      toast.warning("Please select a file 📄");
      return;
    }

    setUploading((u) => ({ ...u, [assignmentId]: true }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `http://localhost:8000/assignments/${assignmentId}/submit`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Assignment submitted successfully 🎉");
      await fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setUploading((u) => ({ ...u, [assignmentId]: false }));
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading assignments…
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen text-gray-900 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-6">Your Assignments</h2>

      {sections.length === 0 && (
        <div className="p-4 rounded-xl shadow bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
          You have not joined any sections yet.
        </div>
      )}

      {sections.map((section) => {
        const sectionAssignments = dashboard.filter(
          (a) => a.section_id === section.id
        );

        return (
          <div
            key={section.id}
            className="mb-8 p-5 rounded-xl shadow bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
          >
            <h3 className="text-xl font-semibold text-indigo-600 dark:text-cyan-400 mb-2">
              {section.subject}
            </h3>

            {sectionAssignments.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No assignments posted yet.
              </p>
            ) : (
              sectionAssignments.map((a) => (
                <div
                  key={a.assignment_id}
                  className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {a.title}
                    </p>

                    {hasNewReview(a) && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 animate-pulse">
                        NEW FEEDBACK
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Deadline:{" "}
                    {a.due_date
                      ? new Date(a.due_date).toLocaleString()
                      : "—"}
                  </p>

                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                    Status:{" "}
                    {a.last_remark ? (
                      <span className="text-indigo-600 dark:text-cyan-400 font-medium">
                        Reviewed
                      </span>
                    ) : a.status === "locked" ? (
                      <span className="text-red-500">Locked</span>
                    ) : (
                      <span className="text-yellow-500">Pending</span>
                    )}
                  </p>

                  <div className="mt-3 p-3 rounded-lg text-sm bg-gray-100 dark:bg-[#020617]">
                    <p>
                      <b>Attempts Used:</b> {a.attempts_used}/{a.max_attempts}
                    </p>

                    {a.last_remark && (
                      <p
                        onClick={() => markReviewSeen(a)}
                        className="text-indigo-600 dark:text-cyan-400 mt-1 cursor-pointer"
                      >
                        <b>Faculty Remark:</b> {a.last_remark}
                      </p>
                    )}

                    {a.needs_resubmission && (
                      <p className="text-red-500 font-medium mt-1">
                        Resubmission Required
                      </p>
                    )}
                  </div>

                  {a.status === "pending" && (
                    <div className="flex items-center gap-3 mt-3">
                      <input
                        type="file"
                        onChange={(e) =>
                          setSelectedFile((f) => ({
                            ...f,
                            [a.assignment_id]: e.target.files[0],
                          }))
                        }
                      />

                      <button
                        onClick={() => handleUpload(a.assignment_id)}
                        disabled={uploading[a.assignment_id]}
                        className="px-4 py-1 rounded-lg text-white bg-gradient-to-r from-indigo-500 to-cyan-500 disabled:opacity-50"
                      >
                        {uploading[a.assignment_id]
                          ? "Uploading…"
                          : "Submit"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StudentAssignmentPage;