import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      <h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
        Face Based Voting System
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <button
          onClick={() => navigate("/verify-voter")}
          style={buttonStyle("#10b981")}
        >
          📸 Verify Voter
        </button>

        <button
          onClick={() => navigate("/register-voter")}
          style={buttonStyle("#3b82f6")}
        >
          👤 Register Voter
        </button>

        <button
          onClick={() => navigate("/cast-vote")}
          style={buttonStyle("#ef4444")}
        >
          🗳️ Cast Vote
        </button>

        <button
          onClick={() => navigate("/voting-results")}
          style={buttonStyle("#f59e0b")}
        >
          📊 Voting Results
        </button>

        <button
          onClick={() => navigate("/admin/login")}
          style={buttonStyle("#111827")}
        >
          🔐 Admin Login
        </button>
      </div>
    </div>
  );
}

const buttonStyle = (color) => ({
  backgroundColor: color,
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "12px 25px",
  fontSize: "16px",
  cursor: "pointer",
  width: "250px",
});
