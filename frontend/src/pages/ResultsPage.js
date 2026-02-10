import React, { useEffect, useState } from "react";
import ResultsList from "../components/ResultsList";
import Avatar from "../components/Avatar";
import { toast } from "react-toastify";

const ResultsPage = () => {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
     Fetch logged-in user
  -------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then(setUser)
      .catch(() => toast.error("Failed to load user"));
  }, []);

  /* --------------------------------------------------
     Fetch personal document results
  -------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    fetch("http://127.0.0.1:8000/results", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch results");
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* --------------------------------------------------
          User header
      -------------------------------------------------- */}
      {user && (
        <div className="flex items-center gap-3 mb-8">
          <Avatar name={user.email} />
          <div>
            <p className="text-sm text-gray-500">Logged in as</p>
            <p className="text-gray-800 font-semibold">{user.email}</p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          Page title
      -------------------------------------------------- */}
      <h2 className="text-2xl font-bold text-center mb-8">
        Personal Document Analysis Results
      </h2>

      {/* --------------------------------------------------
          Results container
      -------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {loading ? (
          <p className="text-center text-gray-500">Loading results...</p>
        ) : (
          <ResultsList results={results} />
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
