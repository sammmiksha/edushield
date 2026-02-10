import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";

function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          localStorage.setItem("role", data.role); // Save role
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-3 shadow-md flex justify-between items-center">
      <div className="text-xl font-bold tracking-wide">EduShield</div>

      {user && (
        <div className="flex items-center gap-4 text-sm sm:text-base">
          {/* ✅ Faculty Navigation */}
          {user.role === "faculty" && (
            <>
              <NavLink to="/create-section" className="hover:underline">
                Create Section
              </NavLink>
              <NavLink to="/submissions" className="hover:underline">
                Submissions
              </NavLink>
            </>
          )}

          {/* ✅ Student Navigation */}
          {user.role === "student" && (
            <>
              <NavLink to="/join-section" className="hover:underline">
                Join Section
              </NavLink>
               <NavLink to="/student/assignments" className="hover:underline">
      View Assignments
    </NavLink>
              <NavLink to="/student-sections" className="hover:underline">
                Assignments
              </NavLink>
              <NavLink to="/results" className="hover:underline">
                Results
              </NavLink>
              <NavLink to="/upload" className="hover:underline">
                Upload
              </NavLink>
            </>
          )}

          {/* 👤 User Info */}
          <span className="flex items-center gap-1">
            👤 <span className="font-medium">{user.name || "User"}</span>
            <span className="text-xs sm:text-sm bg-white text-blue-600 px-2 py-0.5 rounded-full font-semibold ml-2 capitalize">
              {user.role}
            </span>
          </span>

          {/* 🔒 Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
