import React, { useState } from "react";
import { toast } from "react-toastify";

const JoinSectionPage = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const token = localStorage.getItem("token");

    if (!token || !code.trim()) {
      toast.error("Access code required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      // ✅ SEND AS-IS
      formData.append("access_code", code.trim());

      const res = await fetch("http://127.0.0.1:8000/sections/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          throw new Error(data.detail[0]?.msg || "Invalid access code");
        }
        throw new Error(data.detail || "Failed to join section");
      }

      toast.success(`Joined section: ${data.subject}`);
      setCode("");
      window.dispatchEvent(new Event("sectionJoined"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          Join a Section
        </h2>

        <input
          type="text"
          placeholder="Enter Section Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}   
          className="border border-gray-300 px-4 py-2 w-full mb-4 rounded
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleJoin}
          disabled={loading}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white
                      font-medium py-2 px-4 rounded
                      ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Joining..." : "Join Section"}
        </button>
      </div>
    </div>
  );
};

export default JoinSectionPage;
