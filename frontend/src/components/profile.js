import React, { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { toast } from "sonner";
import Button from "./ui/Button";

function Profile() {
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");

  /* ───────── FETCH PROFILE DATA ───────── */
  useEffect(() => {
    if (!token) return;

    fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setNewName(data.name || "");
      });

    fetch("http://127.0.0.1:8000/profile-summary", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setSummary)
      .catch(console.error);
  }, [token]);

  /* ───────── SAVE NAME ───────── */
  const saveName = async () => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const form = new FormData();
      form.append("name", newName);

      const res = await fetch(
        "http://127.0.0.1:8000/users/update-profile",
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );

      if (!res.ok) throw new Error();

      setUser((u) => ({ ...u, name: newName }));
      setEditing(false);

      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  /* ───────── LOADING GUARD ───────── */
  if (!user) {
    return (
      <p className="text-center mt-10 text-gray-500 dark:text-gray-400">
        Loading profile...
      </p>
    );
  }

  return (
    <div className="w-full px-8 py-8">
      <div className="max-w-[1400px] space-y-6">

        {/* ───────── PROFILE HEADER ───────── */}
        <div
          className="
            rounded-2xl p-8 mb-8
            bg-white dark:bg-[#0f172a]
            border border-gray-200 dark:border-white/10
            shadow-sm
          "
        >
          <div className="flex items-center gap-5">
            <Avatar user={user} />

            <div className="space-y-2">

              {/* NAME + EDIT */}
              <div className="flex items-center gap-3">
                {editing ? (
                  <>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="
                        px-3 py-1 rounded-lg
                        bg-white dark:bg-slate-900
                        border border-gray-300 dark:border-slate-600
                        text-gray-900 dark:text-white
                      "
                    />

                    <Button onClick={saveName} variant="primary" className="px-3 py-1">
                      Save
                    </Button>

                    <Button
                      onClick={() => {
                        setEditing(false);
                        setNewName(user.name);
                      }}
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user.name}
                    </h1>

                    <button
                      onClick={() => setEditing(true)}
                      className="
                        text-xs px-2 py-1 rounded-lg
                        bg-indigo-100 text-indigo-700
                        dark:bg-indigo-500/20 dark:text-indigo-300
                        hover:scale-[1.05] transition
                      "
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>

              <span
                className="
                  inline-block text-xs px-3 py-1 rounded-full
                  bg-indigo-100 text-indigo-700
                  dark:bg-indigo-500/20 dark:text-indigo-300
                  capitalize
                "
              >
                {user.role}
              </span>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Joined{" "}
                {new Date(user.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ───────── STATS GRID ───────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Sections</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
              {summary?.sections ?? 0}
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

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Personal Uploads</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
              {summary?.personal_checks ?? 0}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Profile;