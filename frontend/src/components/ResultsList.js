import React, { useMemo } from "react";

/* convert UTC → IST */
const toIST = (utcStr) => {
  if (!utcStr) return "—";
  const utc = new Date(utcStr);
  const istMs = utc.getTime() + 5.5 * 60 * 60 * 1000;
  return (
    new Date(istMs).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) + " IST"
  );
};

/* severity badge styles */
const severityStyle = (severity) => {
  switch (severity) {
    case "Low":
      return "bg-green-100 text-green-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "High":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

/* highlight matched phrases */
const highlightText = (text, phrases = []) => {
  if (!text || phrases.length === 0) return text;

  let highlighted = text;
  phrases.forEach((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    highlighted = highlighted.replace(
      regex,
      `<mark class="bg-yellow-300 px-1 rounded">$1</mark>`
    );
  });

  return highlighted;
};

/* 🔐 Auth-safe PDF download */
const downloadReport = async (resultId) => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You are not logged in");
    return;
  }

  const response = await fetch(
    `http://127.0.0.1:8000/results/${resultId}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    alert("Failed to download report");
    return;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "EduShield_Report.pdf";
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
};

const ResultsList = ({ results = [] }) => {
  const rows = useMemo(() => {
    return results.map((r, i) => {
      const isAI = r.ai_label?.toLowerCase().includes("ai");

      return {
        id: r.id,
        key: `${r.filename}-${i}`,
        filename: r.filename,
        similarityScore:
          r.similarity_score !== null && r.similarity_score !== undefined
            ? (r.similarity_score * 100).toFixed(2)
            : null,
        severity: r.plagiarism_severity || null,
        preview: r.text_preview || null,
        matchedPhrases: r.matched_phrases || [],
        aiLabel: isAI ? "AI-generated" : "Human-written",
        aiIcon: isAI ? "🤖" : "✅",
        aiClass: isAI
          ? "text-red-600 font-semibold"
          : "text-green-600 font-semibold",
        confidence:
          r.ai_confidence !== undefined
            ? `${(r.ai_confidence * 100).toFixed(2)}%`
            : "—",
        timestamp: toIST(r.timestamp),
      };
    });
  }, [results]);

  if (!rows.length) {
    return (
      <p className="text-center text-gray-500 mt-6">
        No uploaded results yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto mt-4 rounded-lg shadow">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-blue-600 text-white text-left">
            <th className="px-4 py-3">Filename</th>
            <th className="px-4 py-3">Plagiarism Analysis</th>
            <th className="px-4 py-3">AI Result</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Uploaded At</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.key} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
              <td className="px-4 py-3 border-b font-medium">
                {r.filename}
              </td>

              <td className="px-4 py-3 border-b">
                <div className="font-semibold">
                  {r.similarityScore !== null
                    ? `${r.similarityScore}%`
                    : "—"}
                </div>

                {r.severity && (
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${severityStyle(
                      r.severity
                    )}`}
                  >
                    {r.severity} Similarity
                  </span>
                )}

                {r.preview && r.matchedPhrases.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-600">
                      View highlighted text
                    </summary>

                    <div
                      className="mt-2 p-3 bg-gray-50 border rounded text-xs max-h-40 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(
                          r.preview,
                          r.matchedPhrases
                        ),
                      }}
                    />
                  </details>
                )}

                <button
                  onClick={() => downloadReport(r.id)}
                  className="inline-block mt-2 text-xs text-blue-700 underline"
                >
                  Download PDF Report
                </button>
              </td>

              <td className={`px-4 py-3 border-b ${r.aiClass}`}>
                {r.aiIcon} {r.aiLabel}
              </td>

              <td className="px-4 py-3 border-b">{r.confidence}</td>
              <td className="px-4 py-3 border-b">{r.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsList;
