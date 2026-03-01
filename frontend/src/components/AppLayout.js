import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTheme } from "../context/ThemeContext";

function AppLayout({ user, onLogout }) {
  const { dark } = useTheme();

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex min-h-screen bg-gray-100 dark:bg-[#020617] transition-colors duration-300">

        {/* LEFT SIDEBAR */}
        <Sidebar user={user} onLogout={onLogout} />

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-auto transition-colors duration-300">
          <Outlet />
        </main>

      </div>
    </div>
  );
}

export default AppLayout;