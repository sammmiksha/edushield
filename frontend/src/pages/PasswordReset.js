import React, { useEffect, useState } from "react";
import ResultsList from "../components/ResultsList";
import Avatar from "../components/Avatar";

const ResultsPage = () => {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);

  /* fetch current user */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setUser)
      .catch((err) => console.error("Error fetching user:", err));
  }, []);

  /* fetch personal results */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/results", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setResults)
      .catch((err) => console.error("Error fetching results:", err));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {user && (
        <div className="flex items-center gap-3 mb-8">
          <Avatar name={user.email} />
          <span className="text-gray-700 font-medium">{user.email}</span>
        </div>
      )}

      <h2 className="text-2xl font-bold text-center mb-8">
        AI Detection Results
      </h2>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {results.length === 0 ? (
          <p className="text-center text-gray-500">
            No documents analyzed yet.
          </p>
        ) : (
          <ResultsList results={results} />
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
