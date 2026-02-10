// ✅ Cleaned & Finalized FacultyDashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function FacultyDashboard() {
  const [subject, setSubject] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submissions, setSubmissions] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  
     useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "faculty") {
      alert("Access denied: Faculty only");
      navigate("/"); // or navigate("/login")
    }
  }, []);
    const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // Fetch sections on mount and auto-select the first one
  useEffect(() => {
    fetchSections();
  }, []);

  // Fetch submissions when section changes
  useEffect(() => {
    if (selectedSectionId) fetchSubmissions(selectedSectionId);
  }, [selectedSectionId]);

  const fetchSections = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/sections", { headers });
      const data = await res.json();
      if (res.ok) {
        setSections(data);
        if (data.length > 0 && !selectedSectionId) {
          setSelectedSectionId(data[0].id); // Auto-pick first section
        }
      }
    } catch (err) {
      console.error("❌ Error fetching sections:", err);
    }
  };

  const fetchSubmissions = async (secId) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/submissions/by-section/${secId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setSubmissions(data);
    } catch (err) {
      console.error("❌ Error fetching submissions:", err);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!/^\d{4,5}$/.test(accessCode)) {
      alert("Access code must be 4 or 5 digits.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/sections", {
        method: "POST",
        headers,
        body: JSON.stringify({ subject, access_code: accessCode }),
      });

      if (res.ok) {
        alert("✅ Section created successfully");
        setSubject("");
        setAccessCode("");
        fetchSections();
      } else {
        const err = await res.json();
        alert("❌ Failed to create section: " + (err.detail || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleUploadAssignment = async (e) => {
    e.preventDefault();
    if (!file || !selectedSectionId) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Only .docx and .pdf files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("section_id", selectedSectionId);
    formData.append("title", title);
    formData.append("description", description);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-assignment/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert("✅ Reference assignment uploaded");
        setFile(null);
        setTitle("");
        setDescription("");
        fetchSubmissions(selectedSectionId);
      } else {
        const err = await res.json();
        alert("❌ Upload failed: " + (err.detail || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  return (
    <>
      
      <div className="max-w-3xl mx-auto p-6">
        {/* Section Creation */}
        <h2 className="text-xl font-bold mb-4">Create New Section</h2>
        <form onSubmit={handleCreateSection} className="space-y-3">
          <input
            type="text"
            placeholder="Subject Name"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            placeholder="4-5 Digit Access Code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            required
            maxLength={5}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Section
          </button>
        </form>

        {/* List of Sections */}
        {sections.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-2">Your Sections</h3>
            <ul className="list-disc pl-6">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <strong>{sec.subject}</strong> — Code:{" "}
                  <code>{sec.access_code}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        <hr className="my-6" />

        {/* Assignment Upload */}
        <h2 className="text-xl font-bold mb-4">Upload Reference Assignment</h2>
        <form onSubmit={handleUploadAssignment} className="space-y-3">
          <input
            type="text"
            placeholder="Assignment Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />

          <textarea
            placeholder="Assignment Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />

          <input
            type="file"
            accept=".docx,.pdf"
            onChange={(e) => setFile(e.target.files[0])}
            required
            className="block"
          />

          {selectedSectionId && (
            <p className="text-sm text-gray-600">
              Uploading to section:{" "}
              <strong>
                {sections.find((sec) => sec.id === selectedSectionId)?.subject}
              </strong>
            </p>
          )}

          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Upload
          </button>
        </form>

        {/* Submissions Table */}
        {submissions.length > 0 && (
          <div className="mt-10">
            <h3 className="font-semibold mb-3">Student Submissions</h3>
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Student</th>
                  <th className="px-4 py-2 text-left">File</th>
                  <th className="px-4 py-2 text-left">Plagiarism %</th>
                  <th className="px-4 py-2 text-left">AI %</th>
                  <th className="px-4 py-2 text-left">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border-b border-gray-200">{s.student_name}</td>
                    <td className="px-4 py-2 border-b border-gray-200">
                      <a
                        href={s.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200">{s.plagiarism_score}</td>
                    <td className="px-4 py-2 border-b border-gray-200">{s.ai_score}</td>
                    <td className="px-4 py-2 border-b border-gray-200">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No submissions message */}
        {selectedSectionId && submissions.length === 0 && (
          <p className="mt-6 text-gray-600">No submissions found for this section.</p>
        )}

        {/* View all submissions page button */}
        <button
          onClick={() => navigate("/view-submissions")}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📄 View Student Submissions (Full Page)
        </button>
      </div>
    </>
  );
}

export default FacultyDashboard;
