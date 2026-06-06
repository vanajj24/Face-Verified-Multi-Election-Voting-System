import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FaceCapture from "./FaceCapture";
import LoadingAnimation from "./LoadingAnimation";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VotingCastFlowPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [electionId, setElectionId] = useState("");
  const [voterId, setVoterId] = useState("");
  const [descriptor, setDescriptor] = useState(null);
  const [voteToken, setVoteToken] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === electionId),
    [elections, electionId]
  );

  useEffect(() => {
    const loadElections = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/elections/public`);
        const liveElections = (res.data || []).filter((e) => e.status === "live");
        setElections(liveElections);
      } catch (err) {
        setStatus("❌ Failed to load elections.");
      }
    };

    loadElections();
  }, []);

  const startVoting = async (e) => {
    e.preventDefault();
    if (!electionId || !voterId.trim()) {
      setStatus("⚠️ Select election and enter student ID.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/voting/start`, {
        electionId,
        voterId: voterId.trim(),
      });
      setStatus(res.data.message || "✅ Proceed to face verification.");
      setStep(2);
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to start voting process.");
    } finally {
      setLoading(false);
    }
  };

  const verifyFace = async () => {
    if (!descriptor) {
      setStatus("⚠️ Capture face first.");
      return;
    }

    try {
      setLoading(true);
      const verifyRes = await axios.post(`${API_BASE_URL}/api/voting/verify-face`, {
        electionId,
        voterId: voterId.trim(),
        descriptor,
      });

      const candidatesRes = await axios.get(`${API_BASE_URL}/api/elections/${electionId}/candidates`);
      const payload = candidatesRes.data;
      if (Array.isArray(payload)) {
        setCandidates(payload);
      } else if (payload && typeof payload === "object") {
        const flat = [];
        Object.values(payload).forEach((items) => {
          if (Array.isArray(items)) flat.push(...items);
        });
        setCandidates(flat);
      } else {
        setCandidates([]);
      }
      setCandidateId("");
      setPositionId("");
      setVoteToken(verifyRes.data.voteToken || "");
      setStatus(verifyRes.data.message || "✅ Verified. Select candidate.");
      setStep(3);
    } catch (err) {
      if (err.response?.status === 401) {
        setStatus(err.response?.data?.message || "❌ Face verification failed. Please capture the face again.");
      } else {
        setStatus(err.response?.data?.message || "❌ Face verification failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (e) => {
    e.preventDefault();
    if (!candidateId || !voteToken) {
      setStatus("⚠️ Candidate selection is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/voting/cast`, {
        electionId,
        candidateId,
        positionId,
        voteToken,
      });

      setStatus(res.data.message || "✅ Vote cast successfully.");
      setStep(4);
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to cast vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingAnimation message="Processing..." />}
      <div style={page}>
      <div style={card}>
        <div style={headRow}>
          <h2 style={title}>Cast Vote</h2>
          <button style={backBtn} onClick={() => navigate("/voting")}>Back</button>
        </div>

        <div style={stepRow}>
          <StepBadge active={step >= 1} label="1. Student ID" />
          <StepBadge active={step >= 2} label="2. Face Verify" />
          <StepBadge active={step >= 3} label="3. Candidate" />
          <StepBadge active={step >= 4} label="4. Done" />
        </div>

        {step === 1 && (
          <form onSubmit={startVoting}>
            <label style={label}>Election</label>
            <select value={electionId} onChange={(e) => setElectionId(e.target.value)} style={input}>
              <option value="">Select live election</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.title} ({election.position})
                </option>
              ))}
            </select>

            <label style={label}>Student ID</label>
            <input
              type="text"
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              placeholder="Enter student voter ID"
              style={input}
            />

            <button type="submit" disabled={loading} style={mainBtn}>
              {loading ? "Checking..." : "Continue To Face Verification"}
            </button>
          </form>
        )}

        {step === 2 && (
          <div>
            <p style={miniText}>
              Election: <b>{selectedElection?.title}</b> | Voter: <b>{voterId}</b>
            </p>
            <FaceCapture onEmbedding={setDescriptor} />
            <button onClick={verifyFace} disabled={loading} style={mainBtn}>
              {loading ? "Verifying..." : "Verify Face"}
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={castVote}>
            <label style={label}>Choose Candidate</label>
            <select
              value={candidateId && positionId ? `${candidateId}|${positionId}` : ""}
              onChange={(e) => {
                const [nextCandidateId, nextPositionId] = e.target.value.split("|");
                setCandidateId(nextCandidateId || "");
                setPositionId(nextPositionId || "");
              }}
              style={input}
            >
              <option value="">Select candidate</option>
              {candidates.length === 0 ? (
                <option disabled>No approved candidates for this position</option>
              ) : (
                candidates.map((candidate) => (
                  <option
                    key={candidate.id || `${candidate.candidateId || candidate._id}|${candidate.positionId || ""}`}
                    value={`${candidate.candidateId || candidate._id || candidate.id}|${candidate.positionId || ""}`}
                  >
                    {candidate.name} ({candidate.position})
                  </option>
                ))
              )}
            </select>

            {candidates.length === 0 && (
              <div style={infoBox}>
                ℹ️ No candidates are approved for this election yet. Please wait for admin to approve candidates.
              </div>
            )}

            <button type="submit" disabled={loading || !candidateId} style={mainBtn}>
              {loading ? "Submitting..." : "Cast Vote"}
            </button>
          </form>
        )}

        {step === 4 && (
          <div>
            <p style={doneText}>Your vote has been recorded successfully.</p>
            <button style={mainBtn} onClick={() => navigate("/voting/results")}>See Live Results</button>
          </div>
        )}

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
    </>
  );
}

function StepBadge({ active, label }) {
  return <div style={{ ...chip, ...(active ? chipActive : {}) }}>{label}</div>;
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(150deg, #ecfdf5 0%, #f8fafc 48%, #dbeafe 100%)",
  padding: "22px 14px",
};

const card = {
  width: "100%",
  maxWidth: "920px",
  margin: "0 auto",
  background: "#fff",
  borderRadius: "20px",
  border: "1px solid #d1fae5",
  boxShadow: "0 20px 46px rgba(2, 6, 23, 0.14)",
  padding: "26px",
};

const headRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" };
const title = { margin: 0, color: "#0f172a", fontSize: "30px" };
const backBtn = { border: "1px solid #94a3b8", background: "#f8fafc", borderRadius: "10px", padding: "8px 12px", cursor: "pointer" };
const stepRow = { marginTop: "14px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "8px" };
const chip = { borderRadius: "999px", padding: "7px 11px", border: "1px solid #cbd5e1", color: "#475569", fontSize: "13px", fontWeight: 700 };
const chipActive = { background: "#0ea5e9", color: "#fff", borderColor: "#0284c7" };
const label = { display: "block", margin: "10px 0 6px", fontWeight: 700, color: "#1e293b" };
const input = { width: "100%", padding: "11px", borderRadius: "11px", border: "1px solid #cbd5e1", fontSize: "15px", marginBottom: "8px" };
const mainBtn = { marginTop: "10px", width: "100%", border: "none", borderRadius: "12px", padding: "12px", background: "#0f766e", color: "#fff", fontWeight: 800, cursor: "pointer" };
const miniText = { color: "#334155", marginBottom: "10px" };
const doneText = { fontWeight: 700, color: "#065f46" };
const infoBox = { background: "#dbeafe", border: "1px solid #0284c7", borderRadius: "8px", padding: "10px", marginTop: "8px", marginBottom: "8px", color: "#075985", fontSize: "14px" };
const statusStyle = (status) => ({ marginTop: "14px", fontWeight: 700, color: status.includes("✅") ? "#15803d" : status.includes("⚠️") ? "#d97706" : "#dc2626" });
