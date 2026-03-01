import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/Button";

function CreateSectionPage() {
  const [userRole, setUserRole] = useState(null);

  const [subject, setSubject] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [sections, setSections] = useState([]);

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
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUserRole(data.role))
      .catch(() => toast.error("Failed to load user"));
  }, []);

  /* ---------------- FETCH SECTIONS ---------------- */
  const fetchSections = () => {
    fetch("http://127.0.0.1:8000/my-sections", { headers })
      .then(res => res.ok ? res.json() : Promise.reject())
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

  if (userRole === null) {
    return (
      <p className="text-center mt-10 text-gray-500 dark:text-gray-400">
        Loading…
      </p>
    );
  }

  if (userRole !== "faculty") {
    return (
      <p className="text-center mt-10 text-red-500 font-semibold">
        Access denied. Faculty only.
      </p>
    );
  }

  return (
    <div className="w-full px-8 py-8">
      <div className="max-w-[1400px] space-y-8">

        {/* CREATE SECTION */}
        <div className="
          p-8 rounded-2xl
          bg-white dark:bg-slate-900
          border border-gray-200 dark:border-slate-700
          shadow-sm
        ">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
            Create Section
          </h2>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="
              w-full px-4 py-2 mb-4 rounded-lg
              border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
            "
          />

          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Access Code"
            className="
              w-full px-4 py-2 mb-6 rounded-lg
              border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
            "
          />

          <Button
            onClick={handleCreateSection}
            disabled={creatingSection}
            variant="primary"
          >
            {creatingSection ? "Creating…" : "Create Section"}
          </Button>
        </div>

        {/* CREATE ASSIGNMENT */}
        <div className="
          p-8 rounded-2xl
          bg-white dark:bg-slate-900
          border border-gray-200 dark:border-slate-700
          shadow-sm
        ">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
            Create Assignment
          </h2>

          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="
              w-full px-4 py-2 mb-4 rounded-lg
              border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
            "
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
            className="
              w-full px-4 py-2 mb-4 rounded-lg
              border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
            "
          />

          <label className="text-sm text-gray-600 dark:text-gray-400">
            Deadline
          </label>

          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="
              w-full px-4 py-2 mb-4 rounded-lg
              border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
            "
          />

          <div className="
            mb-6 w-full p-5 rounded-xl
            border border-gray-200 dark:border-slate-700
            bg-gray-50 dark:bg-slate-800
            flex flex-col sm:flex-row items-center gap-4
          ">
            <input
              type="file"
              onChange={(e) => setReferenceFile(e.target.files[0])}
              className="
                w-full text-sm
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

            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              Reference File (Optional)
            </label>

            {referenceFile && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {referenceFile.name}
              </span>
            )}
          </div>

          <Button
            onClick={handleCreateAssignment}
            disabled={creatingAssignment}
            variant="primary"
          >
            {creatingAssignment ? "Creating…" : "Create Assignment"}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default CreateSectionPage;