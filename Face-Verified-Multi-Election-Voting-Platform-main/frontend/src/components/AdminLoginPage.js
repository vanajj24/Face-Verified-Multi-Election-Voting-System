import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      setStatus("⚠️ Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, {
        email,
        password,
      });

      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminEmail", res.data.admin?.email || email);
      setStatus("✅ Admin login successful.");
      navigate("/admin/dashboard");
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login();
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>🔐 Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
          />

          <button type="submit" disabled={loading} style={buttonStyle(loading)}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

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
  background: "linear-gradient(140deg, #e5e7eb, #cbd5e1)",
};

const cardStyle = {
  background: "#fff",
  width: "420px",
  borderRadius: "16px",
  padding: "28px 32px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
  textAlign: "center",
};

const titleStyle = {
  marginBottom: "16px",
  fontSize: "24px",
  color: "#111827",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
};

const buttonStyle = (loading) => ({
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  backgroundColor: loading ? "#6b7280" : "#111827",
  cursor: loading ? "not-allowed" : "pointer",
  fontWeight: "bold",
});

const statusStyle = (status) => ({
  marginTop: "12px",
  color: status.includes("✅") ? "#16a34a" : status.includes("⚠️") ? "#d97706" : "#dc2626",
  fontWeight: "bold",
});
