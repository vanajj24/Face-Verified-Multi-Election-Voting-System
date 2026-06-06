import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VotingResultsPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [electionId, setElectionId] = useState("");
  const [totalVotes, setTotalVotes] = useState(0);
  const [results, setResults] = useState([]);
  const [electionTitle, setElectionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadElections = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/elections/public`);
        const all = res.data || [];
        setElections(all);
        if (all[0]?.id) {
          setElectionId(all[0].id);
        }
      } catch (err) {
        setStatus("❌ Failed to load elections.");
      } finally {
        setLoading(false);
      }
    };

    loadElections();
  }, []);

  useEffect(() => {
    if (!electionId) return;

    const fetchResults = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/elections/${electionId}/results`);
        setTotalVotes(res.data.totalVotes || 0);
        setResults(res.data.results || []);
        setElectionTitle(res.data.electionTitle || "Election Results");
      } catch (err) {
        setStatus("❌ Failed to load results.");
      }
    };

    fetchResults();
    const id = setInterval(fetchResults, 10000);
    return () => clearInterval(id);
  }, [electionId]);

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "40px" }}>Loading results...</p>;
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={headRow}>
          <h2 style={{ margin: 0 }}>📊 Live Voting Results</h2>
          <button style={backBtn} onClick={() => navigate("/voting")}>Back</button>
        </div>

        <label style={label}>Election</label>
        <select value={electionId} onChange={(e) => setElectionId(e.target.value)} style={select}>
          <option value="">Select election</option>
          {elections.map((election) => (
            <option key={election.id} value={election.id}>
              {election.title} ({election.position}) - {election.status}
            </option>
          ))}
        </select>

        <h3 style={{ marginBottom: "2px" }}>{electionTitle || "Election Results"}</h3>
        <p style={{ fontWeight: "bold" }}>Total Votes: {totalVotes}</p>

        {!results.length ? (
          <p>No results available yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Position</th>
                <th>Votes</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={r.id || idx} style={{ backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  <td>{r.name}</td>
                  <td>{r.position}</td>
                  <td>{r.votes}</td>
                  <td>{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #fef3c7, #f8fafc 42%, #dbeafe)",
  padding: "18px",
};

const card = {
  margin: "0 auto",
  maxWidth: "980px",
  background: "#fff",
  border: "1px solid #fde68a",
  borderRadius: "18px",
  boxShadow: "0 18px 40px rgba(120, 53, 15, 0.14)",
  padding: "20px",
};

const headRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
};

const backBtn = {
  border: "1px solid #94a3b8",
  background: "#f8fafc",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
};

const label = { display: "block", marginBottom: "6px", fontWeight: 700 };
const select = { width: "100%", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px", marginBottom: "8px" };
const statusStyle = (status) => ({ marginTop: "10px", fontWeight: 700, color: status.includes("✅") ? "#15803d" : status.includes("⚠️") ? "#d97706" : "#dc2626" });

const tableStyle = {
  margin: "16px auto",
  borderCollapse: "collapse",
  width: "100%",
  border: "1px solid #d1d5db",
  textAlign: "center",
};
