import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FileUpload from "../components/FileUpload";

const StudentSectionPage = () => {
  const { id } = useParams(); // section_id
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/assignments/by-section/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch assignments");
        }

        const data = await res.json();
        setAssignments(data);
      } catch (err) {
        console.error("Error fetching assignments:", err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAssignments();
    }
  }, [id, token]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Assignments in Section {id}</h2>

      {loading ? (
        <p className="text-gray-500">Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p className="text-gray-600">No assignments found for this section.</p>
      ) : (
        assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="mb-8 border p-4 rounded-lg shadow-md bg-white"
          >
            <h3 className="text-lg font-bold mb-2">{assignment.title}</h3>
            <p className="mb-4 text-gray-700">{assignment.description}</p>
            <FileUpload assignmentId={assignment.id} sectionId={id} />
          </div>
        ))
      )}
    </div>
  );
};

export default StudentSectionPage;
