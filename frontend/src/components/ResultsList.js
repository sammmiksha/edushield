import React, { useState, useMemo } from "react";

/* ---------------- TIME FORMAT ---------------- */
const formatDate = (utcStr) => {
  if (!utcStr) return "—";

  const utc = new Date(utcStr);
  if (isNaN(utc.getTime())) return "—";

  const istMs = utc.getTime() + 5.5 * 60 * 60 * 1000;

  return (
    new Date(istMs).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
};

/* ---------------- SCORE BAR ---------------- */
const ScoreBar = ({ value = 0 }) => {
  const percent = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full mt-1">
      <div className="w-full h-2 rounded bg-gray-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-2 bg-indigo-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

/* ---------------- TEXT HIGHLIGHT ---------------- */
const highlightText = (text, plag = [], ai = []) => {
  if (!text) return text;

  let output = text;

  plag.forEach((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");

    output = output.replace(
      regex,
      `<mark class="bg-red-500/80 text-white px-1 rounded">$1</mark>`
    );
  });

  ai.forEach((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");

    output = output.replace(
      regex,
      `<mark class="bg-purple-500/80 text-white px-1 rounded">$1</mark>`
    );
  });

  return output;
};

/* ---------------- DOWNLOAD ---------------- */
const downloadReport = async (id) => {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `http://127.0.0.1:8000/results/${id}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    alert("Download failed");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "EduShield_Report.pdf";
  a.click();

  window.URL.revokeObjectURL(url);
};

/* ===================================================== */

const ResultsList = ({ results = [] }) => {
  const [expandedId, setExpandedId] = useState(null);

  const rows = useMemo(() => {
    return results.map((r, i) => {
      const isAI = r.ai_label?.toLowerCase().includes("ai");

      return {
        id: r.id,
        key: `${r.filename}-${i}`,
        filename: r.filename,
        similarity: (r.similarity_score * 100).toFixed(2),
        similarityRaw: r.similarity_score * 100,
        confidence: (r.ai_confidence * 100).toFixed(2),
        confidenceRaw: r.ai_confidence * 100,
        aiLabel: isAI ? "AI Generated" : "Human Written",
        uploaded: formatDate(r.timestamp),
        preview: r.text_preview,
        matched: r.matched_phrases || [],
        sourceMapping: r.source_mapping || [],
        aiPhrases: r.ai_highlighted_phrases || [],
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
    <div className="rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
          <tr>
            <th className="px-6 py-4 text-left">Filename</th>
            <th className="px-6 py-4 text-left">Plagiarism</th>
            <th className="px-6 py-4 text-left">AI Result</th>
            <th className="px-6 py-4 text-left">Confidence</th>
            <th className="px-6 py-4 text-left">Uploaded</th>
            <th className="px-6 py-4 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const isOpen = expandedId === r.id;

            return (
              <React.Fragment key={r.key}>
                <tr className="border-t border-gray-200 dark:border-white/10 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition">
                  <td className="px-6 py-5 font-medium">{r.filename}</td>

                  <td className="px-6 py-5">
                    <div className="font-semibold">{r.similarity}%</div>
                    <ScoreBar value={r.similarityRaw} />
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold min-w-[110px] inline-flex justify-center ${
                        r.aiLabel === "AI Generated"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      }`}
                    >
                      {r.aiLabel}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <div className="font-semibold">{r.confidence}%</div>
                    <ScoreBar value={r.confidenceRaw} />
                  </td>

                  <td className="px-6 py-5 text-gray-500 dark:text-gray-400">
                    {r.uploaded}
                  </td>

                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedId(isOpen ? null : r.id)
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 hover:scale-105 transition"
                      >
                        {isOpen ? "Hide" : "View"}
                      </button>

                      <button
                        onClick={() => downloadReport(r.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:scale-105 transition"
                      >
                        Download
                      </button>
                    </div>
                  </td>
                </tr>

                {isOpen && (
                  <tr>
                    <td colSpan="6" className="p-8 bg-gray-50 dark:bg-[#111827] border-t border-gray-200 dark:border-white/10">
                      
                      {/* Preview */}
                      <h4 className="font-semibold mb-4 text-indigo-600 dark:text-indigo-400">
                        Document Analysis
                      </h4>

                      <div
                        className="text-sm leading-relaxed p-5 rounded-xl bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 max-h-72 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(
                            r.preview,
                            r.matched,
                            r.aiPhrases
                          ),
                        }}
                      />

                      {/* Source Breakdown */}
                      {r.sourceMapping.length > 0 && (
                        <div className="mt-8">
                          <h5 className="text-sm font-semibold text-red-500 mb-3">
                            Plagiarism Sources
                          </h5>

                          {r.sourceMapping.map((src, i) => (
                            <div
                              key={i}
                              className="p-4 mb-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs"
                            >
                              <p><strong>Matched Phrase:</strong> {src.phrase}</p>
                              <p><strong>Source:</strong> {src.source}</p>
                              <p><strong>Similarity:</strong> {(src.score * 100).toFixed(1)}%</p>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-500 underline"
                                >
                                  View Source
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Clean result */}
                      {r.sourceMapping.length === 0 &&
                        r.matched.length === 0 &&
                        r.aiPhrases.length === 0 && (
                          <div className="mt-6 text-sm text-green-500">
                            No significant plagiarism or AI-generated content detected.
                          </div>
                        )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsList;