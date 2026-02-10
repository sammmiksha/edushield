// src/pages/ViewSubmissions.js
import React, { useEffect, useState } from "react";
import SubmissionsList from "../components/SubmissionsList";
import { toast } from "react-toastify";

function ViewSubmissions() {
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  /* ---------------- FETCH SECTIONS ---------------- */
  useEffect(() => {
    if (!token) return;

    fetch("http://127.0.0.1:8000/my-sections", { headers })
      .then(res => res.ok ? res.json() : Promise.reject())
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
      .then(res => res.ok ? res.json() : Promise.reject())
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

  // ✅ DO NOT refetch if already loaded
  if (submissions[assignmentId]) return;

  setLoadingSubmissions(true);

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/assignments/${assignmentId}/submissions`,
      { headers }
    );

    if (!res.ok) throw new Error("Fetch failed");

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


  return (
    <div className="w-full  px-6">
      <h2 className="text-2xl font-bold mb-6">Student Submissions</h2>

      {/* SECTION SELECT */}
      <div className="mb-6">
        <label className="block font-medium mb-1">Select Section</label>
        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">-- Select Section --</option>
          {sections.map(sec => (
            <option key={sec.id} value={sec.id}>
              {sec.subject}
            </option>
          ))}
        </select>
      </div>

      {/* ASSIGNMENTS */}
      {loadingAssignments && (
        <p className="text-gray-600">Loading assignments…</p>
      )}

      {!loadingAssignments && assignments.map(a => {
        const expired = new Date(a.due_date) < new Date();
        const isOpen = expandedAssignmentId === a.id;

        return (
          <div
            key={a.id}
            className="mb-4 border rounded-lg bg-white shadow"
          >
            {/* ASSIGNMENT HEADER */}
            <div
              onClick={() => toggleAssignment(a.id)}
              className="cursor-pointer px-4 py-3 flex justify-between items-center hover:bg-gray-50"
            >
              <div>
                <h3 className="font-semibold text-lg">
                  {a.title}
                </h3>
                <p className="text-sm text-gray-500">
                  Due: {new Date(a.due_date).toLocaleString()}
                  {expired && (
                    <span className="ml-2 text-red-600 font-medium">
                      (Expired)
                    </span>
                  )}
                </p>
              </div>

              <span className="text-blue-600 font-medium">
                {isOpen ? "Hide" : "View"}
              </span>
            </div>

            {/* SUBMISSIONS */}
            {isOpen && (
              <div className="p-4 border-t bg-gray-50">
                {loadingSubmissions ? (
                  <p className="text-gray-600">Loading submissions…</p>
                ) : submissions[a.id]?.length ? (
                  <SubmissionsList submissions={submissions[a.id]} />
                ) : (
                  <p className="text-gray-600">
                    No submissions for this assignment.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!loadingAssignments && selectedSectionId && !assignments.length && (
        <p className="text-gray-600">
          No assignments created for this section yet.
        </p>
      )}
    </div>
  );
}

export default ViewSubmissions;
