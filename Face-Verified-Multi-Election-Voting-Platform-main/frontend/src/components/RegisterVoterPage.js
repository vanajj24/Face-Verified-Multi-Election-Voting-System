import React, { useState } from "react";
import axios from "axios";
import FaceCapture from "./FaceCapture";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function RegisterVoterPage() {
  const [voterId, setVoterId] = useState("");
  const [status, setStatus] = useState("");

  const handleEmbedding = async (descriptor) => {
    if (!voterId.trim()) {
      setStatus("⚠️ Please enter Voter ID.");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/voting/register-face`, {
        voterId,
        descriptor,
      });
      setStatus(res.data.message || "✅ Voter face registered successfully.");
      setVoterId("");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to register voter.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>👤 Register Voter Face</h2>
        <input
          type="text"
          value={voterId}
          placeholder="Enter Voter ID"
          onChange={(e) => setVoterId(e.target.value)}
          style={inputStyle}
        />
        <FaceCapture onEmbedding={handleEmbedding} />
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
  padding: "28px 36px",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  textAlign: "center",
  width: "440px",
};

const titleStyle = {
  marginBottom: "18px",
  color: "#1f2937",
  fontSize: "24px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "16px",
  textAlign: "center",
  outline: "none",
};

const statusStyle = (status) => ({
  marginTop: "14px",
  fontWeight: "bold",
  color: status.includes("✅") ? "#16a34a" : "#dc2626",
});
