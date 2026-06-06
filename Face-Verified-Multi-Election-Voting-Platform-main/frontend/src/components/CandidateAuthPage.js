import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function CandidateAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", bio: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/candidates/login`, {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("candidateToken", res.data.token);
      localStorage.setItem("candidateEmail", res.data.candidate?.email || form.email);
      setStatus(res.data.message || "✅ Candidate login successful.");
      navigate("/candidate/dashboard");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Candidate login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setStatus("⚠️ Name is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/candidates/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
        bio: form.bio,
      });
      setStatus(res.data.message || "✅ Candidate registered.");
      setMode("login");
      setForm({ name: "", email: form.email, password: "", bio: "" });
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Candidate registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>Candidate Portal</h2>
        <div style={toggleRow}>
          <button style={modeBtn(mode === "login")} onClick={() => setMode("login")}>Login</button>
          <button style={modeBtn(mode === "register")} onClick={() => setMode("register")}>Register</button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} style={input} autoComplete="username" />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => update("password", e.target.value)} style={input} autoComplete="current-password" />
            <button type="submit" disabled={loading} style={submitBtn}>{loading ? "Please wait..." : "Login"}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => update("name", e.target.value)} style={input} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} style={input} autoComplete="username" />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => update("password", e.target.value)} style={input} autoComplete="new-password" />
            <textarea placeholder="Bio" value={form.bio} onChange={(e) => update("bio", e.target.value)} style={textarea} />
            <button type="submit" disabled={loading} style={submitBtn}>{loading ? "Submitting..." : "Register"}</button>
          </form>
        )}

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(160deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)",
  padding: "16px",
};

const card = {
  width: "100%",
  maxWidth: "560px",
  background: "#fff",
  borderRadius: "18px",
  border: "1px solid #bfdbfe",
  boxShadow: "0 18px 40px rgba(30, 64, 175, 0.18)",
  padding: "22px",
};

const title = { marginTop: 0, color: "#0f172a", fontSize: "30px" };
const toggleRow = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" };
const modeBtn = (active) => ({ border: active ? "1px solid #1d4ed8" : "1px solid #94a3b8", background: active ? "#1d4ed8" : "#f8fafc", color: active ? "#fff" : "#0f172a", borderRadius: "10px", padding: "10px", cursor: "pointer", fontWeight: 700 });
const input = { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "9px", fontSize: "15px" };
const textarea = { ...input, minHeight: "92px", resize: "vertical" };
const submitBtn = { width: "100%", border: "none", borderRadius: "10px", padding: "11px", fontWeight: 800, background: "#1e3a8a", color: "#fff", cursor: "pointer" };
const statusStyle = (status) => ({ marginTop: "10px", fontWeight: 700, color: status.includes("✅") ? "#15803d" : status.includes("⚠️") ? "#d97706" : "#dc2626" });
