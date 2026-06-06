import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function CastVotePage() {
  const [voterId, setVoterId] = useState(localStorage.getItem("verifiedVoterId") || "");
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCandidates = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/voting/candidates`);
      setCandidates(res.data || []);
    } catch (err) {
      setStatus("❌ Failed to load candidates.");
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const castVote = async () => {
    if (!voterId.trim() || !selectedCandidateId) {
      setStatus("⚠️ Verified voter ID and candidate are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/voting/cast-vote`, {
        voterId,
        candidateId: selectedCandidateId,
      });
      setStatus(res.data.message || "✅ Vote cast successfully.");
      localStorage.removeItem("verifiedVoterId");
      setVoterId("");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to cast vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>🗳️ Cast Vote</h2>

        <input
          type="text"
          value={voterId}
          placeholder="Verified Voter ID"
          onChange={(e) => setVoterId(e.target.value)}
          style={inputStyle}
        />

        <select
          value={selectedCandidateId}
          onChange={(e) => setSelectedCandidateId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select Candidate</option>
          {candidates.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.party})
            </option>
          ))}
        </select>

        <button onClick={castVote} disabled={loading} style={voteButtonStyle(loading)}>
          {loading ? "Submitting..." : "Submit Vote"}
        </button>

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
  );
}

const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "85vh",
  background: "linear-gradient(135deg, #f4f7fb, #dde8f5)",
};

const cardStyle = {
  background: "#fff",
  padding: "26px 34px",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  textAlign: "center",
  width: "480px",
};

const titleStyle = {
  marginBottom: "16px",
  color: "#1f2937",
  fontSize: "24px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
};

const voteButtonStyle = (loading) => ({
  width: "100%",
  padding: "11px 14px",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontWeight: "bold",
  backgroundColor: loading ? "#6b7280" : "#dc2626",
  cursor: loading ? "not-allowed" : "pointer",
});

const statusStyle = (status) => ({
  marginTop: "14px",
  fontWeight: "bold",
  color: status.includes("✅") ? "#16a34a" : status.includes("⚠️") ? "#d97706" : "#dc2626",
});
