import React from "react";
import { useNavigate } from "react-router-dom";

export default function VotingHubPage() {
  const navigate = useNavigate();

  return (
    <div style={wrap}>
      <div style={panel}>
        <h2 style={title}>Voting Zone</h2>
        <p style={sub}>Choose what you want to do in the active elections.</p>

        <div style={actions}>
          <button style={primary} onClick={() => navigate("/voting/cast")}>Cast Vote</button>
          <button style={secondary} onClick={() => navigate("/voting/results")}>See Results</button>
        </div>

        <button style={ghost} onClick={() => navigate("/")}>Back To Landing</button>
      </div>
    </div>
  );
}

const wrap = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(140deg, #ecfeff, #f8fafc 55%, #ede9fe)",
  padding: "18px",
};

const panel = {
  width: "100%",
  maxWidth: "760px",
  background: "#ffffff",
  border: "1px solid #dbeafe",
  borderRadius: "20px",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)",
  padding: "30px",
};

const title = { margin: 0, fontSize: "34px", color: "#0f172a" };
const sub = { margin: "8px 0 20px", color: "#334155" };
const actions = { display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" };
const commonBtn = { border: "none", borderRadius: "12px", padding: "14px 12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "15px" };
const primary = { ...commonBtn, background: "#dc2626" };
const secondary = { ...commonBtn, background: "#2563eb" };
const ghost = { marginTop: "18px", border: "1px solid #94a3b8", background: "#f8fafc", borderRadius: "10px", padding: "10px 12px", cursor: "pointer" };
