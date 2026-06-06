import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function CandidateDashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("candidateToken");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [elections, setElections] = useState([]);
  const [resultsElectionId, setResultsElectionId] = useState("");
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedApplyRoles, setSelectedApplyRoles] = useState({});

  const [edit, setEdit] = useState({ name: "", positionId: "", bio: "", password: "" });

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, electionsRes, positionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/candidate/me`, { headers }),
        axios.get(`${API_BASE_URL}/api/candidate/elections`, { headers }),
        axios.get(`${API_BASE_URL}/api/positions/public`),
      ]);

      setProfile(profileRes.data);
      setEdit({
        name: profileRes.data?.name || "",
        positionId: profileRes.data?.positionId?._id || "",
        bio: profileRes.data?.bio || "",
        password: "",
      });
      setPositions(positionsRes.data || []);
      setElections(electionsRes.data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("candidateToken");
        navigate("/candidate/auth");
      } else {
        setStatus(err.response?.data?.message || "❌ Failed to load candidate dashboard.");
      }
    }
  }, [headers, navigate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!token) {
      navigate("/candidate/auth");
      return;
    }
    loadAll();
  }, [token, navigate, loadAll]);

  useEffect(() => {
    if (!resultsElectionId) return;
    const loadResults = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/elections/${resultsElectionId}/results`);
        setResults(res.data);
      } catch (err) {
        setStatus("❌ Failed to load live results.");
      }
    };

    loadResults();
    const id = setInterval(loadResults, 10000);
    return () => clearInterval(id);
  }, [resultsElectionId]);

  const applyElection = async (electionId) => {
    const positionId = selectedApplyRoles[electionId];
    if (!positionId) {
      setStatus("⚠️ Select a role before applying.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/candidate/elections/${electionId}/apply`,
        { positionId },
        { headers }
      );
      setStatus(res.data.message || "✅ Applied.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to apply.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: edit.name,
        positionId: edit.positionId,
        bio: edit.bio,
      };
      if (edit.password) payload.password = edit.password;

      const res = await axios.put(`${API_BASE_URL}/api/candidate/me`, payload, { headers });
      setStatus(res.data.message || "✅ Profile updated.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("candidateToken");
    localStorage.removeItem("candidateEmail");
    navigate("/candidate/auth");
  };

  const getRoleApplicationStatus = (election, roleId) => {
    const app = (election.applications || []).find(
      (item) => String(item.positionId) === String(roleId)
    );
    return app?.status || "not_applied";
  };

  return (
    <div style={page}>
      <div style={container}>
        <div style={headerRow}>
          <h2 style={{ margin: 0 }}>Candidate Dashboard</h2>
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>

        <div style={card}>
          <h3>Profile</h3>
          <p style={badge(profile?.approvalStatus)}>
            Account Status: {profile?.approvalStatus || "loading..."}
          </p>
          <p style={{ marginTop: 0, color: "#334155", fontWeight: 600 }}>
            Current Position: {profile?.positionId?.name || "-"}
          </p>
          <form onSubmit={updateProfile}>
            <input style={input} value={edit.name} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
            <select style={input} value={edit.positionId} onChange={(e) => setEdit((p) => ({ ...p, positionId: e.target.value }))}>
              <option value="">Select Position</option>
              {positions.map((pos) => (
                <option key={pos._id} value={pos._id}>{pos.name}</option>
              ))}
            </select>
            <textarea style={textarea} value={edit.bio} onChange={(e) => setEdit((p) => ({ ...p, bio: e.target.value }))} placeholder="Bio" />
            <input style={input} type="password" value={edit.password} onChange={(e) => setEdit((p) => ({ ...p, password: e.target.value }))} placeholder="New Password (optional)" />
            <button type="submit" disabled={loading} style={primaryBtn}>Update Profile</button>
          </form>
        </div>

        <div style={card}>
          <h3>Election Applications</h3>
          {!elections.length ? (
            <p>No elections available right now.</p>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th>Election</th>
                  <th>Status</th>
                  <th>Application</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {elections.map((election) => (
                  <tr key={election.id}>
                    <td>{election.title}</td>
                    <td>{election.status}</td>
                    <td>
                      {(election.applications || []).length === 0 ? (
                        <span>not_applied</span>
                      ) : (
                        <div style={{ display: "grid", gap: "4px" }}>
                          {(election.applications || []).map((app) => (
                            <span key={app.id}>
                              {app.positionName}: <b>{app.status}</b>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const selectedRoleId = selectedApplyRoles[election.id] || "";
                        const selectedRoleStatus = selectedRoleId
                          ? getRoleApplicationStatus(election, selectedRoleId)
                          : "not_applied";

                        return (
                          <>
                      <select
                        style={{ ...input, marginBottom: 0, minWidth: "180px", marginRight: "6px" }}
                        value={selectedRoleId}
                        onChange={(e) =>
                          setSelectedApplyRoles((prev) => ({
                            ...prev,
                            [election.id]: e.target.value,
                          }))
                        }
                        disabled={loading}
                      >
                        <option value="">Select Role</option>
                        {(election.positionOptions || []).map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => applyElection(election.id)}
                        disabled={loading || !selectedRoleId || selectedRoleStatus === "approved" || selectedRoleStatus === "pending"}
                        style={smallBtn}
                      >
                        Apply
                      </button>
                          </>
                        );
                      })()}
                      <button
                        onClick={() => setResultsElectionId(election.id)}
                        style={{ ...smallBtn, background: "#1e3a8a", marginLeft: "6px" }}
                      >
                        Live Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {results && (
          <div style={card}>
            <h3>Live Results ({results.electionTitle})</h3>
            <p>Total Votes: <b>{results.totalVotes}</b></p>
            <table style={table}>
              <thead>
                <tr><th>Candidate</th><th>Votes</th><th>%</th></tr>
              </thead>
              <tbody>
                {results.results.map((row) => (
                  <tr key={row.id}><td>{row.name}</td><td>{row.votes}</td><td>{row.percentage}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={statusStyle(status)}>{status}</p>
      </div>
    </div>
  );
}

const page = { minHeight: "100vh", background: "linear-gradient(160deg, #eef2ff, #f8fafc 45%, #dbeafe)", padding: "20px 10px" };
const container = { maxWidth: "1100px", margin: "0 auto" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" };
const card = { background: "#fff", borderRadius: "16px", border: "1px solid #dbeafe", boxShadow: "0 10px 28px rgba(30, 64, 175, 0.13)", padding: "16px", marginBottom: "12px" };
const input = { width: "100%", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px", marginBottom: "8px" };
const textarea = { ...input, minHeight: "80px", resize: "vertical" };
const primaryBtn = { border: "none", borderRadius: "10px", background: "#1e3a8a", color: "#fff", fontWeight: 700, padding: "10px 12px", cursor: "pointer" };
const smallBtn = { border: "none", borderRadius: "8px", background: "#0891b2", color: "#fff", padding: "7px 10px", cursor: "pointer" };
const logoutBtn = { border: "none", borderRadius: "10px", background: "#0f172a", color: "#fff", padding: "9px 12px", cursor: "pointer" };
const table = { width: "100%", borderCollapse: "collapse" };
const statusStyle = (status) => ({ marginTop: "6px", fontWeight: 700, color: status.includes("✅") ? "#15803d" : status.includes("⚠️") ? "#d97706" : "#dc2626" });
const badge = (status) => ({ display: "inline-block", borderRadius: "999px", padding: "4px 10px", fontWeight: 700, marginTop: 0, background: status === "approved" ? "#dcfce7" : status === "pending" ? "#fef3c7" : "#fee2e2", color: status === "approved" ? "#166534" : status === "pending" ? "#92400e" : "#991b1b" });
