import React, { useState } from "react";
import axios from "axios";
import FaceCapture from "./FaceCapture";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function VerifyVoterPage() {
  const [descriptor, setDescriptor] = useState(null);
  const [status, setStatus] = useState("Capture face to verify voter...");
  const [loading, setLoading] = useState(false);

  const onEmbedding = (embedding) => {
    setDescriptor(embedding);
    setStatus("✅ Face captured. Ready to verify voter.");
  };

  const verifyVoter = async () => {
    if (!descriptor) {
      setStatus("⚠️ Capture face first.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/voting/verify-face`, {
        descriptor,
      });

      if (res.data.voterId) {
        localStorage.setItem("verifiedVoterId", res.data.voterId);
      }

      setStatus(res.data.message || "✅ Voter verified.");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Voter verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>🧾 Verify Voter Face</h2>
        <FaceCapture onEmbedding={onEmbedding} />

        <button
          onClick={verifyVoter}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: loading ? "#6b7280" : "#0ea5e9",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Verifying..." : "Verify Voter"}
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
  padding: "28px 36px",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  textAlign: "center",
  width: "450px",
};

const titleStyle = {
  marginBottom: "18px",
  color: "#1f2937",
  fontSize: "24px",
};

const buttonStyle = {
  marginTop: "15px",
  padding: "12px 18px",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
};

const statusStyle = (status) => ({
  marginTop: "14px",
  fontWeight: "bold",
  color: status.includes("✅") ? "#16a34a" : status.includes("⚠️") ? "#d97706" : "#dc2626",
});
