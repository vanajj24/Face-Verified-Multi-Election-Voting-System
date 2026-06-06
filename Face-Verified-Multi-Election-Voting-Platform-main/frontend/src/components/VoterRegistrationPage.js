import React, { useState } from "react";
import axios from "axios";
import FaceCapture from "./FaceCapture";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VoterRegistrationPage() {
  const [voterId, setVoterId] = useState("");
  const [descriptor, setDescriptor] = useState(null);
  const [status, setStatus] = useState("Capture face and submit voter registration. Admin approval is required before voting.");
  const [loading, setLoading] = useState(false);

  const registerVoter = async () => {
    if (!voterId.trim()) {
      setStatus("⚠️ Voter ID is required.");
      return;
    }
    if (!descriptor) {
      setStatus("⚠️ Please capture face first.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/voters/register`, {
        voterId: voterId.trim(),
        descriptor,
      });
      setStatus(res.data.message || "✅ Voter registration submitted. Waiting for admin approval.");
      setVoterId("");
      setDescriptor(null);
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Voter registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>Voter Registration</h2>

        <input
          type="text"
          value={voterId}
          onChange={(e) => setVoterId(e.target.value)}
          placeholder="Enter Student / Voter ID"
          style={input}
        />

        <FaceCapture onEmbedding={(embedding) => { setDescriptor(embedding); setStatus("✅ Face captured. Submit registration for admin review."); }} />

        <button onClick={registerVoter} disabled={loading} style={btn}>
          {loading ? "Registering..." : "Register Voter"}
        </button>

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
  );
}

const page = { minHeight: "100vh", background: "linear-gradient(140deg, #f0fdf4, #f8fafc 50%, #ecfeff)", padding: "22px 10px" };
const card = { maxWidth: "900px", margin: "0 auto", background: "#fff", borderRadius: "18px", border: "1px solid #bbf7d0", boxShadow: "0 18px 42px rgba(22, 101, 52, 0.14)", padding: "20px" };
const title = { marginTop: 0, color: "#14532d", fontSize: "32px" };
const input = { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "10px", fontSize: "15px" };
const btn = { width: "100%", border: "none", borderRadius: "12px", background: "#15803d", color: "#fff", padding: "12px", fontWeight: 800, cursor: "pointer", marginTop: "10px" };
const statusStyle = (status) => ({ marginTop: "11px", fontWeight: 700, color: status.includes("✅") ? "#15803d" : status.includes("⚠️") ? "#d97706" : "#dc2626" });
