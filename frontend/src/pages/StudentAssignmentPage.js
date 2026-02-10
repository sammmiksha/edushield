import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentAssignmentPage = () => {
  const token = localStorage.getItem("token");

  const [sections, setSections] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [selectedFile, setSelectedFile] = useState({});
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH SECTIONS ---------------- */
  const fetchSections = async () => {
    try {
      const res = await axios.get("http://localhost:8000/my-sections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections(res.data || []);
    } catch {
      setSections([]);
    }
  };

  /* ---------------- FETCH STUDENT DASHBOARD ---------------- */
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
      setDashboard([]);
    }
  };

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      await fetchSections();
      await fetchDashboard();
      setLoading(false);
    };

    load();
  }, []);

  /* ---------------- SUBMIT ASSIGNMENT ---------------- */
  const handleUpload = async (assignmentId) => {
    const file = selectedFile[assignmentId];
    if (!file) {
      alert("Please select a file");
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

      alert("✅ Assignment submitted successfully");
      await fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.detail || "Submission failed");
    } finally {
      setUploading((u) => ({ ...u, [assignmentId]: false }));
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return <div className="p-6 text-gray-600">Loading assignments…</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">Your Assignments</h2>

      {sections.length === 0 && (
        <div className="bg-white p-4 rounded shadow text-gray-600">
          You have not joined any sections yet.
        </div>
      )}

      {sections.map((section) => {
        const sectionAssignments = dashboard.filter(
          (a) => a.section_id === section.id
        );

        return (
          <div key={section.id} className="mb-8 bg-white p-5 rounded shadow">
            <h3 className="text-xl font-semibold text-blue-700 mb-2">
              {section.subject}
            </h3>

            {sectionAssignments.length === 0 ? (
              <p className="text-gray-500">No assignments posted yet.</p>
            ) : (
              sectionAssignments.map((a) => (
                <div key={a.assignment_id} className="border-t pt-4 mt-4">
                  <p className="font-medium">{a.title}</p>

                  <p className="text-sm text-gray-600">
                    Deadline: {new Date(a.due_date).toLocaleString()}
                  </p>

                  {/* STATUS */}
                  <p className="text-sm mt-1">
                    Status:{" "}
                    {a.last_remark ? (
                      <span className="text-blue-700 font-medium">
                        Reviewed
                      </span>
                    ) : a.status === "locked" ? (
                      <span className="text-red-600">Locked</span>
                    ) : (
                      <span className="text-yellow-600">Pending</span>
                    )}
                  </p>

                  {/* ATTEMPTS + RESULT */}
                  <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                    <p>
                      <b>Attempts Used:</b>{" "}
                      {a.attempts_used}/{a.max_attempts}
                    </p>

                    {a.last_remark && (
                      <p className="text-blue-700 mt-1">
                        <b>Faculty Remark:</b> {a.last_remark}
                      </p>
                    )}

                    {a.needs_resubmission && (
                      <p className="text-red-600 font-medium mt-1">
                        Resubmission Required
                      </p>
                    )}
                  </div>

                  {/* SUBMISSION INPUT */}
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
                        className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
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
