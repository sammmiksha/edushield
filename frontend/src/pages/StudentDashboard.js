// src/pages/StudentDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";

function StudentDashboard() {
  const [sections, setSections] = useState([]);
  const [accessCode, setAccessCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinedMsg, setJoinedMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  /* ───── Fetch joined sections ───── */
  const fetchSections = async () => {
    try {
      const res = await axios.get("http://localhost:8000/my-sections", {
        headers,
      });
      setSections(res.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch sections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  /* ───── Join section ───── */
  const handleJoinSection = async () => {
    const code = accessCode.trim().toUpperCase();
    if (!code) return alert("Please enter a code.");

    setJoinedMsg("");
    setJoining(true);
    try {
      await axios.post(
        "http://localhost:8000/section/join",
        { code },
        { headers }
      );
      setJoinedMsg("✅ Joined section successfully!");
      setAccessCode("");
      fetchSections();
    } catch (err) {
      console.error("❌ Join section failed:", err);
      setJoinedMsg(
        err.response?.data?.detail ||
          "Failed to join section. Please check your code."
      );
    } finally {
      setJoining(false);
    }
  };

  /* ───── File Upload ───── */
  const handleFileChange = (assignmentId, file) => {
    setSelectedFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  const handleUpload = async (assignmentId, sectionId) => {
    if (!selectedFiles[assignmentId]) return alert("Select a file first!");

    const formData = new FormData();
    formData.append("file", selectedFiles[assignmentId]);
    formData.append("assignment_id", assignmentId);

    setUploading(true);
    try {
      await axios.post(
        `http://localhost:8000/submit-assignment/section/${sectionId}`,
        formData,
        { headers }
      );
      alert("✅ File uploaded successfully!");
      fetchSections();
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-3xl font-bold mb-6 text-blue-700">
        🎓 Student Dashboard
      </h2>

      {/* ─── Join Section ─── */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">
          Join a Section
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter Access Code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="border px-3 py-2 rounded-md w-64"
          />
          <button
            onClick={handleJoinSection}
            disabled={joining}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </div>
        {joinedMsg && <p className="text-sm mt-2 text-blue-700">{joinedMsg}</p>}
      </div>

      {/* ─── Joined Sections ─── */}
      {sections.length === 0 ? (
        <p className="text-gray-600 text-lg">You haven’t joined any sections yet.</p>
      ) : (
        sections.map((section) => (
          <div key={section.id} className="mb-8 bg-white p-5 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-indigo-700">
              📘 {section.subject || "Untitled Section"}
            </h3>

            {section.assignments?.length > 0 ? (
              section.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="mt-4 border-t border-gray-200 pt-3"
                >
                  <p className="font-medium text-gray-800">
                    {assignment.title || "Untitled Assignment"}
                  </p>
                  <a
                    href={
                      assignment.reference_url ||
                      assignment.reference_filename ||
                      "#"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    Download Reference
                  </a>

                  {/* Upload */}
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="file"
                      onChange={(e) =>
                        handleFileChange(assignment.id, e.target.files[0])
                      }
                    />
                    <button
                      onClick={() =>
                        handleUpload(assignment.id, section.id)
                      }
                      disabled={uploading}
                      className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>

                  {/* Submission Results */}
                  {assignment.submissions?.length > 0 && (
                    <div className="mt-3 bg-gray-100 p-3 rounded text-sm">
                      <p className="font-semibold text-gray-700 mb-1">
                        Your Submissions:
                      </p>
                      {assignment.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="border-t border-gray-300 pt-2 mt-2"
                        >
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            View File
                          </a>
                          <p>Plagiarism: {(sub.similarity_score * 100).toFixed(2)}%</p>
                          <p>AI Confidence: {(sub.ai_confidence * 100).toFixed(2)}%</p>
                          <p>
                            Submitted:{" "}
                            {new Date(sub.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 mt-2">
                No assignments uploaded yet for this section.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default StudentDashboard;
