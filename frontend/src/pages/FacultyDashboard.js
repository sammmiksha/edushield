import React, { useEffect, useState } from "react";
import { toast } from "sonner";

function FacultyDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [sections, setSections] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);

  const token = localStorage.getItem("token");

  /* ───────── FETCH SECTIONS ───────── */
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/my-sections",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        setSections(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSections();
  }, [token]);

  /* ───────── FETCH SUMMARY ───────── */
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/faculty-dashboard-summary",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error();
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Faculty dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  /* ───────── DELETE SECTION (DOUBLE CLICK CONFIRM) ───────── */
  const deleteSection = async (sectionId) => {
    if (pendingDelete !== sectionId) {
      setPendingDelete(sectionId);

      // Sonner version (no autoClose option)
      toast("Click delete again to confirm ⚠️");

      // Reset confirmation after 2 seconds manually
      setTimeout(() => {
        setPendingDelete(null);
      }, 2000);

      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/sections/${sectionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error();

      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      toast.success("Section deleted 🗑️");
      setPendingDelete(null);
    } catch {
      toast.error("Failed to delete section");
    }
  };

  /* ───────── FETCH ACTIVITY ───────── */
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/faculty/recent-activity",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) return;
        const data = await res.json();
        setRecentActivity(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchActivity();
  }, [token]);

  if (loading) {
    return (
      <div className="p-10 text-gray-500 dark:text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="w-full px-8 py-8 text-gray-900 dark:text-gray-100">
      <div className="max-w-[1400px] space-y-8">

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          🧑‍🏫 Faculty Dashboard
        </h2>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Sections</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
              {summary?.sections ?? 0}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
              {summary?.students ?? 0}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Assignments</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
              {summary?.assignments ?? 0}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
              {summary?.submissions ?? 0}
            </p>
          </div>

        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🧑‍🎓 Recent Student Activity
          </h3>

          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No recent activity.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-900"
                >
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {a.student_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {a.action}
                    </p>
                  </div>

                  <span className="text-xs text-gray-400">
                    {new Date(a.time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* YOUR SECTIONS */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📚 Your Sections
          </h3>

          {sections.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No sections created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex justify-between items-center p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border dark:border-white/10"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {sec.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Code: {sec.access_code}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteSection(sec.id)}
                    className="px-3 py-1 text-xs rounded-lg
                    bg-red-100 text-red-600
                    dark:bg-red-500/20 dark:text-red-300
                    hover:bg-red-200 dark:hover:bg-red-500/30 transition"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default FacultyDashboard;