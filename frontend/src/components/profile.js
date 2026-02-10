import React, { useEffect, useState } from "react";

function Profile() {
  const [user, setUser] = useState(null);

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

  if (!user) return <p className="text-center mt-8 text-gray-600">Loading profile...</p>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Profile</h2>
      <p className="text-gray-700 text-lg mb-2">
        <strong>Name:</strong> {user.name}
      </p>
      <p className="text-gray-700 text-lg mb-2">
        <strong>Email:</strong> {user.email}
      </p>
      <p className="text-gray-700 text-lg">
        <strong>Joined:</strong>{" "}
        {new Date(user.created_at).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

export default Profile;
