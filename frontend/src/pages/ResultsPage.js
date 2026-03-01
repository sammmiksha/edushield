import React, { useEffect, useState } from "react";
import ResultsList from "../components/ResultsList";
import Avatar from "../components/Avatar";
import { toast } from "sonner";

const ResultsPage = () => {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch user ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setUser)
      .catch(() => toast.error("Failed to load user"));
  }, []);

  /* ---------------- Fetch results ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    fetch("http://127.0.0.1:8000/results", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load results");
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">

      {/* USER HEADER */}
      {user && (
        <div className="flex items-center gap-3 mb-8">
          <Avatar user={user} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Logged in as
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {user.email}
            </p>
          </div>
        </div>
      )}

      {/* TITLE */}
      <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Personal Document Analysis Results
      </h2>

      {/* RESULTS CARD */}
      <div className="
        rounded-xl shadow-lg p-6
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
      ">
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Loading results...
          </p>
        ) : (
          <ResultsList results={results} />
        )}
      </div>
    </div>
  );
};

export default ResultsPage;