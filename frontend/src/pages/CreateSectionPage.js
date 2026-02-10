import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

function CreateSectionPage() {
  const [userRole, setUserRole] = useState(null);

  /* section creation */
  const [subject, setSubject] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  /* sections list */
  const [sections, setSections] = useState([]);

  /* assignment creation */
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [referenceFile, setReferenceFile] = useState(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  /* ---------------- FETCH USER ---------------- */
  useEffect(() => {
    if (!token) return;

    fetch("http://127.0.0.1:8000/me", { headers })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setUserRole(data.role))
      .catch(() => toast.error("Failed to load user"));
  }, []);

  /* ---------------- FETCH SECTIONS ---------------- */
  const fetchSections = () => {
    fetch("http://127.0.0.1:8000/my-sections", { headers })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then(setSections)
      .catch(() => toast.error("Failed to load sections"));
  };

  useEffect(() => {
    if (userRole === "faculty") fetchSections();
  }, [userRole]);

  /* ---------------- CREATE SECTION ---------------- */
  const handleCreateSection = async () => {
    if (!subject.trim() || !accessCode.trim()) {
      toast.error("Subject and Access Code required");
      return;
    }

    setCreatingSection(true);
    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("access_code", accessCode);

    try {
      const res = await fetch("http://127.0.0.1:8000/sections/create", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      toast.success("Section created");
      setSubject("");
      setAccessCode("");
      fetchSections();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingSection(false);
    }
  };

  /* ---------------- CREATE ASSIGNMENT ---------------- */
  const handleCreateAssignment = async () => {
    if (!selectedSectionId || !title || !dueDate) {
      toast.error("All fields required");
      return;
    }

    setCreatingAssignment(true);
    const formData = new FormData();
    formData.append("section_id", selectedSectionId);
    formData.append("title", title);
    formData.append("due_date", dueDate);
    if (referenceFile) formData.append("reference_file", referenceFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/assignments/create", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      toast.success("Assignment created");
      setTitle("");
      setDueDate("");
      setReferenceFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingAssignment(false);
    }
  };

  /* ---------------- GUARDS ---------------- */
  if (userRole === null) {
    return <p className="text-center mt-10">Loading…</p>;
  }

  if (userRole !== "faculty") {
    return (
      <p className="text-center mt-10 text-red-600 font-semibold">
        Access denied. Faculty only.
      </p>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-8">

      {/* CREATE SECTION */}
      <div className="p-6 bg-white rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4 text-blue-700">Create Section</h2>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full border px-3 py-2 mb-3 rounded"
        />

        <input
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Access Code"
          className="w-full border px-3 py-2 mb-4 rounded"
        />

        <button
          onClick={handleCreateSection}
          disabled={creatingSection}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {creatingSection ? "Creating…" : "Create Section"}
        </button>
      </div>

      {/* CREATE ASSIGNMENT */}
      <div className="p-6 bg-white rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4 text-blue-700">
          Create Assignment
        </h2>

        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          className="w-full border px-3 py-2 mb-3 rounded"
        >
          <option value="">Select Section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subject}
            </option>
          ))}
        </select>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Assignment Title"
          className="w-full border px-3 py-2 mb-3 rounded"
        />
        <h1>Deadline</h1>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border px-3 py-2 mb-3 rounded"
        />

        <input
          type="file"
          onChange={(e) => setReferenceFile(e.target.files[0])}
          className="mb-4"
        />

        <button
          onClick={handleCreateAssignment}
          disabled={creatingAssignment}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {creatingAssignment ? "Creating…" : "Create Assignment"}
        </button>
      </div>
    </div>
  );
}

export default CreateSectionPage;
