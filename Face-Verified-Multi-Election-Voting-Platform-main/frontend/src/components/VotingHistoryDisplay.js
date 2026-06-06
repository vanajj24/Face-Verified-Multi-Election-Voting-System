import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VotingHistoryDisplay() {
  const token = localStorage.getItem("adminToken");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/voting-history`, { headers });
      setHistory(res.data || []);
    } catch (err) {
      setStatus("❌ Failed to load voting history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  const deleteHistoryRecord = async (id) => {
    if (!window.confirm("⚠️ Delete this voting history record?")) return;

    try {
      setLoading(true);
      const res = await axios.delete(`${API_BASE_URL}/api/voting-history/${id}`, { headers });
      setStatus(res.data?.message || "✅ Record deleted.");
      await loadHistory();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to delete record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={headerDiv}>
        <h3 style={title}>📜 Voting History</h3>
        <button style={refreshBtn} onClick={loadHistory} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {status && (
        <p style={statusStyle(status)}>{status}</p>
      )}

      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th>Election</th>
              <th>Position</th>
              <th>Winner</th>
              <th>Votes Won</th>
              <th>Total Votes</th>
              <th>Percentage</th>
              <th>Date Completed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                  No voting history yet
                </td>
              </tr>
            ) : (
              history.map((record) => (
                <tr key={record._id}>
                  <td>{record.electionTitle}</td>
                  <td>{record.positionName}</td>
                  <td>
                    <strong>{record.winnerCandidateName}</strong>
                  </td>
                  <td>{record.winnerVoteCount}</td>
                  <td>{record.totalVotesForPosition}</td>
                  <td>
                    <div style={percentageBar}>
                      <div
                        style={{
                          ...percentageFill,
                          width: `${record.winnerVotePercentage}%`,
                        }}
                      />
                      <span>{record.winnerVotePercentage?.toFixed(2) || 0}%</span>
                    </div>
                  </td>
                  <td>{new Date(record.completedAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      style={deleteBtn}
                      onClick={() => deleteHistoryRecord(record._id)}
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const container = {
  background: "#fff",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  boxShadow: "0 8px 16px rgba(127, 29, 29, 0.1)",
  padding: "16px",
  boxSizing: "border-box",
};

const headerDiv = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  gap: "10px",
};

const title = {
  margin: 0,
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: 700,
};

const refreshBtn = {
  border: "none",
  borderRadius: "6px",
  background: "#3b82f6",
  color: "#fff",
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
};

const tableWrapper = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const percentageBar = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  position: "relative",
};

const percentageFill = {
  height: "6px",
  background: "linear-gradient(90deg, #15803d, #4ade80)",
  borderRadius: "3px",
  minWidth: "30px",
};

const deleteBtn = {
  border: "none",
  borderRadius: "6px",
  background: "#ef4444",
  color: "#fff",
  padding: "4px 8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
};

const statusStyle = (message) => ({
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "10px",
  fontSize: "13px",
  fontWeight: 600,
  ...(message.includes("✅")
    ? { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }
    : message.includes("⚠️")
    ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }
    : { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }),
});
