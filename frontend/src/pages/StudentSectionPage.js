import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FileUpload from "../components/FileUpload";

const StudentSectionPage = () => {
  const { id } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/assignments/by-section/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch assignments");

        const data = await res.json();
        setAssignments(data);
      } catch (err) {
        console.error("Error fetching assignments:", err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchAssignments();
  }, [id, token]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 transition-colors duration-300">

      {/* TITLE */}
      <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Section Assignments
      </h2>

      {/* STATES */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">
          Loading assignments...
        </p>
      ) : assignments.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          No assignments found for this section.
        </p>
      ) : (
        <div className="space-y-6">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="
                rounded-xl p-6
                bg-white dark:bg-slate-800
                border border-gray-200 dark:border-slate-700
                shadow-sm hover:shadow-lg
                transition-all duration-300
              "
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                {assignment.title}
              </h3>

              <p className="mb-5 text-gray-600 dark:text-gray-300">
                {assignment.description}
              </p>

              {/* Upload Component */}
              <FileUpload
                assignmentId={assignment.id}
                sectionId={id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSectionPage;