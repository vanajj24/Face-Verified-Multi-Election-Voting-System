import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VotingControlMenu({
  selectedElectionId,
  electionControl,
  setElectionControl,
  loading,
  onStatusUpdate,
  headers,
}) {
  const [status, setStatus] = useState("");

  const updateElectionStatus = async () => {
    if (!selectedElectionId) {
      setStatus("⚠️ Select an election first.");
      return;
    }

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/elections/${selectedElectionId}/status`,
        electionControl,
        { headers }
      );
      setStatus(res.data.message || "✅ Election updated.");
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update election status.");
    }
  };

  return (
    <div style={container}>
      <h4 style={title}>⚙️ Voting Control Center</h4>
      
      <div style={controlSection}>
        <label style={label}>Election Status:</label>
        <select
          style={select}
          value={electionControl.status}
          onChange={(e) => setElectionControl((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="draft">📝 Draft</option>
          <option value="live">🔴 Live (Voting Open)</option>
          <option value="paused">⏸️ Paused</option>
          <option value="ended">✔️ Ended</option>
          <option value="announced">📢 Announced</option>
        </select>
      </div>

      <div style={checkboxContainer}>
        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={electionControl.resetVotes}
            onChange={(e) =>
              setElectionControl((p) => ({ ...p, resetVotes: e.target.checked }))
            }
          />
          <span>Reset Vote Count</span>
        </label>

        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={electionControl.clearApprovedCandidates}
            onChange={(e) =>
              setElectionControl((p) => ({
                ...p,
                clearApprovedCandidates: e.target.checked,
              }))
            }
          />
          <span>Reset Candidate Approvals</span>
        </label>
      </div>

      <button
        style={applyBtn}
        disabled={loading}
        onClick={updateElectionStatus}
      >
        {loading ? "⏳ Updating..." : "✓ Apply Status"}
      </button>

      {status && (
        <p style={statusStyle(status)}>{status}</p>
      )}
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

const title = {
  margin: "0 0 14px 0",
  color: "#1e293b",
  fontSize: "15px",
  fontWeight: 700,
};

const controlSection = {
  marginBottom: "12px",
};

const label = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const select = {
  width: "100%",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  padding: "9px",
  fontSize: "14px",
  boxSizing: "border-box",
  fontFamily: "inherit",
  marginBottom: "10px",
};

const checkboxContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "12px",
};

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  cursor: "pointer",
};

const applyBtn = {
  width: "100%",
  border: "none",
  borderRadius: "8px",
  background: "#15803d",
  color: "#fff",
  padding: "10px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
  boxSizing: "border-box",
};

const statusStyle = (message) => ({
  padding: "10px",
  borderRadius: "8px",
  marginTop: "10px",
  fontSize: "12px",
  fontWeight: 600,
  ...(message.includes("✅")
    ? { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }
    : message.includes("⚠️")
    ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }
    : { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }),
});
