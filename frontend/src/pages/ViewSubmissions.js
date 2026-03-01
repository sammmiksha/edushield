import React, { useEffect, useState } from "react";
import SubmissionsList from "../components/SubmissionsList";
import { toast } from "sonner";

function ViewSubmissions() {
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  /* ---------------- FETCH SECTIONS ---------------- */
  useEffect(() => {
    if (!token) return;

    fetch("http://127.0.0.1:8000/my-sections", { headers })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setSections)
      .catch(() => toast.error("Failed to load sections"));
  }, []);

  /* ---------------- FETCH ASSIGNMENTS ---------------- */
  useEffect(() => {
    if (!selectedSectionId) {
      setAssignments([]);
      setExpandedAssignmentId(null);
      return;
    }

    setLoadingAssignments(true);

    fetch(
      `http://127.0.0.1:8000/assignments/by-section/${selectedSectionId}`,
      { headers }
    )
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        const now = new Date();
        const active = data.filter(a => new Date(a.due_date) > now);
        const expired = data.filter(a => new Date(a.due_date) <= now);
        setAssignments([...active, ...expired]);
      })
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setLoadingAssignments(false));
  }, [selectedSectionId]);

  /* ---------------- FETCH SUBMISSIONS ---------------- */
  const toggleAssignment = async (assignmentId) => {
    if (expandedAssignmentId === assignmentId) {
      setExpandedAssignmentId(null);
      return;
    }

    setExpandedAssignmentId(assignmentId);

    if (submissions[assignmentId]) return;

    setLoadingSubmissions(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assignments/${assignmentId}/submissions`,
        { headers }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();

      setSubmissions(prev => ({
        ...prev,
        [assignmentId]: data,
      }));
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  /* ---------------- DELETE ASSIGNMENT ---------------- */
  const handleDeleteAssignment = async (assignmentId) => {

    if (pendingDelete !== assignmentId) {
      setPendingDelete(assignmentId);

      toast("Click delete again to confirm removal ⚠️");

      setTimeout(() => {
        setPendingDelete(null);
      }, 2500);

      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assignments/${assignmentId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!res.ok) throw new Error();

      setAssignments(prev =>
        prev.filter(a => a.id !== assignmentId)
      );

      toast.success("Assignment deleted 🗑️");
      setPendingDelete(null);

    } catch {
      toast.error("Failed to delete assignment");
    }
  };

  return (
    <div className="w-full px-8 py-8 text-gray-900 dark:text-gray-100">
      <div className="max-w-[1400px] space-y-8">

        <div className="mb-10 p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
          <h2 className="text-3xl font-bold mb-6">
            Student Submissions
          </h2>

          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Select Section
          </label>

          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- Select Section --</option>
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>
                {sec.subject}
              </option>
            ))}
          </select>
        </div>

        {loadingAssignments && (
          <p className="text-gray-500 dark:text-gray-400">
            Loading assignments…
          </p>
        )}

        {!loadingAssignments &&
          assignments.map(a => {
            const expired = new Date(a.due_date) < new Date();
            const isOpen = expandedAssignmentId === a.id;

            return (
              <div
                key={a.id}
                className="mb-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all"
              >
                <div
                  onClick={() => toggleAssignment(a.id)}
                  className="cursor-pointer px-6 py-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <div>
                    <h3 className="font-semibold text-lg">
                      {a.title}
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Due: {new Date(a.due_date).toLocaleString()}
                      {expired && (
                        <span className="ml-2 text-red-500 font-medium">
                          (Expired)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssignment(a.id);
                      }}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    >
                      {isOpen ? "Hide" : "View"}
                    </button>

                    <button
                      onClick={() => handleDeleteAssignment(a.id)}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                    >
                      Delete
                    </button>

                  </div>
                </div>

                {isOpen && (
                  <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900/40">
                    {loadingSubmissions ? (
                      <p className="text-gray-500 dark:text-gray-400">
                        Loading submissions…
                      </p>
                    ) : submissions[a.id]?.length ? (
                      <SubmissionsList submissions={submissions[a.id]} />
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        No submissions for this assignment.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {!loadingAssignments && selectedSectionId && !assignments.length && (
          <p className="text-gray-500 dark:text-gray-400">
            No assignments created for this section yet.
          </p>
        )}

      </div>
    </div>
  );
}

export default ViewSubmissions;