import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", secretKey: "" });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const login = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminEmail", res.data.admin?.email || form.email);
      setStatus(res.data.message || "✅ Admin login successful.");
      navigate("/admin/dashboard");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    if (!form.name || !form.secretKey) {
      setStatus("⚠️ Name and secret key are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
        secretKey: form.secretKey,
      });
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminEmail", res.data.admin?.email || form.email);
      setStatus(res.data.message || "✅ Admin registered successfully.");
      navigate("/admin/dashboard");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Admin registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>Admin Access</h2>

        <div style={toggleRow}>
          <button style={modeBtn(mode === "login")} onClick={() => setMode("login")}>Login</button>
          <button style={modeBtn(mode === "register")} onClick={() => setMode("register")}>Register</button>
        </div>

        {mode === "login" ? (
          <form onSubmit={login}>
            <input type="email" placeholder="Email" style={input} value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="username" />
            <input type="password" placeholder="Password" style={input} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="current-password" />
            <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Signing in..." : "Login"}</button>
          </form>
        ) : (
          <form onSubmit={register}>
            <input type="text" placeholder="Full Name" style={input} value={form.name} onChange={(e) => update("name", e.target.value)} />
            <input type="email" placeholder="Email" style={input} value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="username" />
            <input type="password" placeholder="Password" style={input} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" />
            <input type="password" placeholder="Admin Secret Key" style={input} value={form.secretKey} onChange={(e) => update("secretKey", e.target.value)} autoComplete="off" />
            <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Registering..." : "Register Admin"}</button>
          </form>
        )}

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
  );
}

const page = { minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(150deg, #fee2e2, #f8fafc 45%, #ede9fe)", padding: "16px" };
const card = { width: "100%", maxWidth: "560px", background: "#fff", borderRadius: "18px", border: "1px solid #fecaca", boxShadow: "0 18px 42px rgba(127, 29, 29, 0.16)", padding: "22px" };
const title = { marginTop: 0, fontSize: "30px", color: "#111827" };
const toggleRow = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" };
const modeBtn = (active) => ({ border: active ? "1px solid #be123c" : "1px solid #94a3b8", background: active ? "#be123c" : "#f8fafc", color: active ? "#fff" : "#0f172a", borderRadius: "10px", padding: "10px", cursor: "pointer", fontWeight: 700 });
const input = { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "9px", fontSize: "15px" };
const primaryBtn = { width: "100%", border: "none", borderRadius: "10px", padding: "11px", color: "#fff", fontWeight: 800, background: "#7f1d1d", cursor: "pointer" };
const statusStyle = (status) => ({ marginTop: "10px", fontWeight: 700, color: status.includes("✅") ? "#15803d" : status.includes("⚠️") ? "#d97706" : "#dc2626" });
