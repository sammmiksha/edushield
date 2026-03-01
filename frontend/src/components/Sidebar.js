import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import Avatar from "./Avatar";

function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const { dark, toggleTheme } = useContext(ThemeContext);
  const [collapsed, setCollapsed] = useState(false);

  /* 🔥 NAV ITEM */
  const navItem = (path, icon, label) => {
    const active = location.pathname === path;

    return (
      <Link
        to={path}
        className={`
          flex items-center gap-3
          px-3 py-2 rounded-lg
          transition-all duration-200 relative
          ${
            active
              ? "bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-cyan-400 font-semibold"
              : "text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
          }
        `}
      >
        {/* 🔥 LEFT ACTIVE BORDER */}
        {active && (
          <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-indigo-600"></span>
        )}

        <span className="text-lg">{icon}</span>

        {!collapsed && (
          <span className="text-sm">{label}</span>
        )}
      </Link>
    );
  };

  /* 🔥 GROUP TITLE */
  const groupTitle = (title) =>
    !collapsed && (
      <p className="px-3 mt-5 mb-2 text-[11px] uppercase tracking-wider text-gray-400">
        {title}
      </p>
    );

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-72"}
        min-h-screen
        bg-white dark:bg-[#0b1120]
        border-r border-gray-200 dark:border-white/5
        flex flex-col
        transition-all duration-300
      `}
    >
      {/* 👤 HEADER */}
<div className="
px-4 py-6
border-b border-gray-200 dark:border-white/10
flex flex-col items-center
text-gray-900 dark:text-gray-100
">        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar user={user} />

            {!collapsed && (
              <div>
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role}
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:scale-110 transition"
            >
              ❯
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-3 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center rotate-180"
          >
            ❯
          </button>
        )}
      </div>

      {/* 📌 NAVIGATION */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">

        {/* 🧭 MAIN */}
        {groupTitle("Main")}
        <div className="space-y-1">
          {navItem("/dashboard", "🏠", "Dashboard")}
          {navItem("/upload", "📤", "Upload")}
          {navItem("/results", "📊", "Results")}
        </div>

        {/* 🏫 CLASSROOM */}
        {groupTitle("Classroom")}
        <div className="space-y-1">
          {user.role === "student" && (
            <>
              {navItem("/student/assignments", "📝", "Assignments")}
              {navItem("/join-section", "➕", "Join Section")}
            </>
          )}

          {user.role === "faculty" && (
            <>
              {navItem("/create-section", "🧑‍🏫", "Create Section")}
              {navItem("/submissions", "📂", "Submissions")}
            </>
          )}
        </div>

        {/* 👤 ACCOUNT */}
{groupTitle("Account")}
<div className="space-y-1">

  {navItem("/profile", "👤", "Profile")}

  {/* 🌙 THEME TOGGLE */}
  <div
    className={`
      flex items-center
      ${collapsed ? "justify-center" : "justify-between"}
      px-3 py-2 rounded-lg
      text-gray-600 dark:text-gray-300
      hover:bg-black/5 dark:hover:bg-white/10
      transition
    `}
  >
    <div className="flex items-center gap-3">
     <span className="text-lg">
  {dark ? "🌙" : "☀️"}
</span>
      {!collapsed && <span className="text-sm">Theme</span>}
    </div>

    {!collapsed && (
      <button
        onClick={toggleTheme}
        className={`w-10 h-5 flex items-center rounded-full transition ${
          dark ? "bg-indigo-500" : "bg-gray-400"
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
            dark ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    )}
  </div>

  {/* 🚪 LOGOUT */}
  <button
    onClick={onLogout}
    className={`
      flex items-center
      ${collapsed ? "justify-center" : "gap-3"}
      px-3 py-2 w-full rounded-lg
      text-red-500 border border-transparent
      hover:bg-red-500 hover:text-white
      transition text-sm font-medium
    `}
  >
    <span className="text-lg">🚪</span>
    {!collapsed && "Log Out"}
  </button>

</div>
      </div>
    </aside>
  );
}

export default Sidebar;