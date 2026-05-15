import React, { useEffect, useState } from "react";
import ResultsList from "../components/ResultsList";
import Avatar from "../components/Avatar";
import { toast } from "sonner";

const ResultsPage = () => {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);


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
