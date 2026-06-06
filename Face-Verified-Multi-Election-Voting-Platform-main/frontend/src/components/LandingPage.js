import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={page}>
      <div style={glowA} />
      <div style={glowB} />

      <div style={heroCard}>
        <p style={tag}>Student Body Digital Elections</p>
        <h1 style={title}>Face Verified Multi-Election Voting Platform</h1>
        <p style={subtitle}>
          Secure voting with face verification, candidate workflows, and admin election control.
        </p>

        <div style={grid}>
          <button style={tile("#0f766e")} onClick={() => navigate("/voting")}>Voting</button>
          <button style={tile("#1d4ed8")} onClick={() => navigate("/candidate/auth")}>Candidate Login / Register</button>
          <button style={tile("#be123c")} onClick={() => navigate("/admin/auth")}>Admin Login / Register</button>
          <button style={tile("#7c3aed")} onClick={() => navigate("/voter-registration")}>Voter Registration</button>
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background: "radial-gradient(circle at 18% 22%, #fef3c7 0%, #fefce8 28%, #f4f6fb 65%, #e2e8f0 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const glowA = {
  position: "absolute",
  top: "-120px",
  left: "-80px",
  width: "320px",
  height: "320px",
  borderRadius: "999px",
  background: "rgba(20, 184, 166, 0.26)",
  filter: "blur(26px)",
};

const glowB = {
  position: "absolute",
  right: "-120px",
  bottom: "-140px",
  width: "340px",
  height: "340px",
  borderRadius: "999px",
  background: "rgba(239, 68, 68, 0.22)",
  filter: "blur(26px)",
};

const heroCard = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: "980px",
  textAlign: "center",
  borderRadius: "28px",
  border: "1px solid #cbd5e1",
  background: "linear-gradient(160deg, #ffffff 0%, #f8fafc 58%, #eef2ff 100%)",
  boxShadow: "0 24px 64px rgba(15, 23, 42, 0.18)",
  padding: "34px 30px",
};

const tag = {
  margin: 0,
  color: "#0f172a",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontSize: "12px",
};

const title = {
  margin: "10px 0 10px",
  fontSize: "clamp(30px, 4.6vw, 52px)",
  lineHeight: 1.07,
  color: "#111827",
  fontWeight: 900,
};

const subtitle = {
  margin: "0 auto",
  color: "#334155",
  maxWidth: "700px",
  fontSize: "16px",
};

const grid = {
  marginTop: "28px",
  display: "grid",
  gap: "14px",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};

const tile = (bg) => ({
  border: "none",
  borderRadius: "16px",
  background: bg,
  color: "#fff",
  fontSize: "16px",
  fontWeight: 700,
  padding: "18px 14px",
  cursor: "pointer",
  minHeight: "88px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.2)",
});
