import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VotingManagementTable({ electionId, headers }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!electionId) return;

    const loadCandidates = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/api/elections/${electionId}/candidates`,
          { headers }
        );
        // Flatten the candidates from grouped response
        const allCandidates = [];
        Object.values(res.data).forEach(positionCandidates => {
          if (Array.isArray(positionCandidates)) {
            allCandidates.push(...positionCandidates);
          }
        });
        setCandidates(allCandidates);
      } catch (err) {
        console.error("❌ Failed to load candidates");
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, [electionId, headers]);

  if (!electionId) {
    return (
      <div style={container}>
        <p style={{ color: "#666", textAlign: "center" }}>
          Select an election to view voting candidates
        </p>
      </div>
    );
  }

  return (
    <div style={container}>
      <h4 style={title}>👥 Candidates Available for Voting</h4>
      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Position</th>
              <th>Bio</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#666" }}>
                  No candidates available
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <strong>{candidate.name}</strong>
                  </td>
                  <td>{candidate.position}</td>
                  <td>{candidate.bio || "-"}</td>
                  <td>
                    <span style={activeBadge}>✓ Active</span>
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

const title = {
  margin: "0 0 12px 0",
  color: "#1e293b",
  fontSize: "15px",
  fontWeight: 700,
};

const tableWrapper = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const activeBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "3px 8px",
  borderRadius: "4px",
  fontWeight: 600,
  fontSize: "11px",
};
