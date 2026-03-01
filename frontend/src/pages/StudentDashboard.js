import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function StudentDashboard() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  /* ───────── ROLE CHECK ───────── */
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "student") {
      navigate("/upload");
    }
  }, [navigate]);

  /* ───────── FETCH SECTIONS ───────── */
  const fetchSections = async () => {
    try {
      const res = await axios.get("http://localhost:8000/my-sections", {
        headers,
      });
      setSections(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, [token]);

  /* ⭐ LISTEN FOR JOIN EVENT */
  useEffect(() => {
    const handler = () => {
      fetchSections();
      toast.success("Section joined successfully");
    };

    window.addEventListener("sectionJoined", handler);

    return () => {
      window.removeEventListener("sectionJoined", handler);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  /* ───────── STATS CALCULATION ───────── */
  const totalSections = sections.length;

  const totalAssignments = sections.reduce(
    (sum, s) => sum + (s.assignments?.length || 0),
    0
  );

  const pendingAssignments = sections.reduce((sum, s) => {
    return sum + (s.assignments?.filter((a) => !a.submitted)?.length || 0);
  }, 0);

  const deadlines = sections
    .flatMap((section) =>
      (section.assignments || []).map((a) => ({
        ...a,
        subject: section.subject,
      }))
    )
    .filter((a) => a.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);

  /* ───────── LEAVE SECTION ───────── */
  const leaveSection = async (id) => {
    try {
      await fetch(`http://localhost:8000/sections/${id}/leave`, {
        method: "DELETE",
        headers,
      });

      toast.info("Left section");
      fetchSections();
    } catch {
      toast.error("Failed to leave section");
    }
  };

  return (
    <div className="w-full px-8 py-8">
      <div className="max-w-[1400px] space-y-8 text-gray-900 dark:text-gray-100">

        <h2 className="text-3xl font-bold">🎓 Student Dashboard</h2>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sections Joined
            </p>
            <p className="mt-3 text-3xl font-semibold">{totalSections}</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Assignments
            </p>
            <p className="mt-3 text-3xl font-semibold">{totalAssignments}</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pending Work
            </p>
            <p className="mt-3 text-3xl font-semibold">{pendingAssignments}</p>
          </div>

        </div>

        {/* DEADLINES */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            📅 Upcoming Deadlines
          </h3>

          {deadlines.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No upcoming deadlines.
            </p>
          ) : (
            <div className="space-y-3">
              {deadlines.map((d, i) => {
                const daysLeft = Math.ceil(
                  (new Date(d.due_date) - new Date()) /
                    (1000 * 60 * 60 * 24)
                );

                const urgency =
                  daysLeft <= 1
                    ? "text-red-500"
                    : daysLeft <= 3
                    ? "text-yellow-500"
                    : "text-gray-400";

                return (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-900"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {d.title}
                      </p>
                      <p className="text-xs text-gray-500">{d.subject}</p>
                    </div>

                    <div className={`text-xs ${urgency}`}>
                      {daysLeft <= 0
                        ? "Due today"
                        : `${daysLeft} day${daysLeft > 1 ? "s" : ""}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTIONS */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-indigo-600 dark:text-cyan-400">
                    📘 {section.subject}
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {section.assignments?.length || 0} assignments available
                  </p>
                </div>

                <button
                  onClick={() => leaveSection(section.id)}
                  className="text-xs px-3 py-1 rounded-md border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition"
                >
                  Leave Section
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default StudentDashboard;