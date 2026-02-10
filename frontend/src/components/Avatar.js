import React, { useEffect, useState } from "react";

function Avatar() {
  const [user, setUser] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch("http://127.0.0.1:8000/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch profile.");
        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfile();
  }, []);

  if (!user) return null;

  return (
    <div className="relative">
      <div
        className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold cursor-pointer hover:scale-105 transition-transform"
        onClick={() => setShowTooltip(!showTooltip)}
        title="Click to view profile"
      >
        {user.name?.charAt(0).toUpperCase()}
      </div>

      {showTooltip && (
        <div className="absolute top-12 right-0 bg-white border border-gray-300 rounded-lg shadow-md p-4 z-10 w-60 text-sm">
          <p className="font-semibold text-gray-800">{user.name}</p>
          <p className="text-gray-600">{user.email}</p>
          <p className="mt-2 text-gray-700">
            <span className="font-medium">Role:</span> {user.role}
          </p>
        </div>
      )}
    </div>
  );
}

export default Avatar;
