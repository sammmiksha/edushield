import React, { useState } from "react";
import { toast } from "sonner";
import Button from "../components/ui/Button";
import { useNavigate } from "react-router-dom";

const JoinSectionPage = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    const token = localStorage.getItem("token");

    if (!token || !code.trim()) {
      toast.error("Access code required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
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

      navigate("/dashboard");

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="
      flex items-center justify-center
      min-h-[80vh]
      transition-colors duration-300
    ">
      <div className="
        w-full max-w-md
        p-8
        rounded-xl
        shadow-lg
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        text-gray-900 dark:text-gray-100
        text-center
      ">
        <h2 className="text-2xl font-semibold mb-6">
          Join a Section
        </h2>

        <input
          type="text"
          placeholder="Enter Section Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="
            w-full mb-4 px-4 py-2 rounded-lg
            border border-gray-300 dark:border-slate-600
            bg-white dark:bg-slate-900
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500
          "
        />

        <Button
          onClick={handleJoin}
          disabled={loading}
          variant="primary"
          className="w-full"
        >
          {loading ? "Joining..." : "Join Section"}
        </Button>
      </div>
    </div>
  );
};

export default JoinSectionPage;