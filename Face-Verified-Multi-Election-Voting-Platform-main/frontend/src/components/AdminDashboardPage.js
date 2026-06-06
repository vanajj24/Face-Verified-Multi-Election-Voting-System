import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [overview, setOverview] = useState(null);
  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [newElection, setNewElection] = useState({ title: "", position: "", description: "" });
  const [manualCandidate, setManualCandidate] = useState({ name: "", email: "", password: "", position: "", bio: "" });

  const [electionControl, setElectionControl] = useState({ status: "draft", resetVotes: true, clearApprovedCandidates: false });
  const [announcement, setAnnouncement] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [overviewRes, electionsRes, candidatesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/overview`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/elections`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/candidates`, { headers }),
      ]);

      setOverview(overviewRes.data);
      setElections(electionsRes.data || []);
      setCandidates(candidatesRes.data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("adminToken");
        navigate("/admin/auth");
      } else {
        setStatus(err.response?.data?.message || "❌ Failed to load dashboard.");
      }
    }
  }, [headers, navigate]);

  useEffect(() => {
    if (!token) {
      navigate("/admin/auth");
      return;
    }
    loadAll();
  }, [token, navigate, loadAll]);

  useEffect(() => {
    if (!selectedElectionId) {
      setApplications([]);
      setResults(null);
      return;
    }

    const loadElectionDetails = async () => {
      try {
        const [appsRes, resultsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/elections/${selectedElectionId}/applications`, { headers }),
          axios.get(`${API_BASE_URL}/api/admin/elections/${selectedElectionId}/results`, { headers }),
        ]);

        setApplications(appsRes.data || []);
        setResults(resultsRes.data || null);
      } catch (err) {
        setStatus("❌ Failed to load selected election details.");
      }
    };

    loadElectionDetails();
    const id = setInterval(loadElectionDetails, 10000);
    return () => clearInterval(id);
  }, [selectedElectionId, headers]);

  const createElection = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/elections`, newElection, { headers });
      setStatus(res.data.message || "✅ Election created.");
      setNewElection({ title: "", position: "", description: "" });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to create election.");
    } finally {
      setLoading(false);
    }
  };

  const updateElectionStatus = async () => {
    if (!selectedElectionId) {
      setStatus("⚠️ Select an election first.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/elections/${selectedElectionId}/status`,
        electionControl,
        { headers }
      );
      setStatus(res.data.message || "✅ Election updated.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update election status.");
    } finally {
      setLoading(false);
    }
  };

  const announceResult = async () => {
    if (!selectedElectionId) {
      setStatus("⚠️ Select an election first.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/elections/${selectedElectionId}/announce`,
        { announcement },
        { headers }
      );
      setStatus(res.data.message || "✅ Result announced.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to announce result.");
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateApproval = async (candidateId, approvalStatus) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/candidates/${candidateId}/approval`,
        { status: approvalStatus },
        { headers }
      );
      setStatus(res.data.message || "✅ Candidate approval updated.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update candidate approval.");
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, approvalStatus) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/applications/${applicationId}`,
        { status: approvalStatus },
        { headers }
      );
      setStatus(res.data.message || "✅ Application updated.");
      const appsRes = await axios.get(`${API_BASE_URL}/api/admin/elections/${selectedElectionId}/applications`, { headers });
      setApplications(appsRes.data || []);
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update application.");
    } finally {
      setLoading(false);
    }
  };

  const registerCandidateManually = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/candidates/manual-register`,
        manualCandidate,
        { headers }
      );
      setStatus(res.data.message || "✅ Candidate added manually.");
      setManualCandidate({ name: "", email: "", password: "", position: "", bio: "" });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to manually register candidate.");
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm("⚠️ This will delete ALL voters, candidates, votes, and applications. Elections and admin data will remain. Continue?")) {
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/clear-data`, {}, { headers });
      setStatus(res.data.message || "✅ All data cleared.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to clear data.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/auth");
  };

  return (
    <div style={page}>
      <div style={container}>
        {/* Header */}
        <div style={headerRow}>
          <h2 style={{ margin: 0 }}>Admin Mission Control</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={dangerSmallBtn} disabled={loading} onClick={clearAllData}>
              Clear All Data
            </button>
            <button style={logoutBtn} onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Section 1: Overview & Create Election */}
        <div style={sectionDiv}>
          <h3 style={sectionTitle}>📊 System Overview</h3>
          <div style={twoColGrid}>
            <div style={infoCard}>
              <div style={infoValue}>{overview?.voterCount ?? 0}</div>
              <div style={infoLabel}>Registered Voters</div>
            </div>
            <div style={infoCard}>
              <div style={infoValue}>{overview?.candidateCount ?? 0}</div>
              <div style={infoLabel}>Approved Candidates</div>
            </div>
            <div style={infoCard}>
              <div style={infoValue}>{overview?.pendingCandidates ?? 0}</div>
              <div style={infoLabel}>Pending Candidates</div>
            </div>
            <div style={infoCard}>
              <div style={infoValue}>{overview?.elections ?? 0}</div>
              <div style={infoLabel}>Total Elections</div>
            </div>
            <div style={infoCard}>
              <div style={infoValue}>{overview?.voteCount ?? 0}</div>
              <div style={infoLabel}>Total Votes Cast</div>
            </div>
          </div>
        </div>

        {/* Section 2: Create Election & Control */}
        <div style={sectionDiv}>
          <h3 style={sectionTitle}>⚙️ Election Management</h3>
          <div style={twoColGrid}>
            {/* Create Election Card */}
            <div style={formCard}>
              <h4 style={cardTitle}>Create Draft Election</h4>
              <form onSubmit={createElection}>
                <input
                  style={input}
                  placeholder="Election Title"
                  value={newElection.title}
                  onChange={(e) => setNewElection((p) => ({ ...p, title: e.target.value }))}
                  required
                />
                <input
                  style={input}
                  placeholder="Position (e.g. President)"
                  value={newElection.position}
                  onChange={(e) => setNewElection((p) => ({ ...p, position: e.target.value }))}
                  required
                />
                <textarea
                  style={textarea}
                  placeholder="Description"
                  value={newElection.description}
                  onChange={(e) => setNewElection((p) => ({ ...p, description: e.target.value }))}
                />
                <button type="submit" disabled={loading} style={primaryBtn}>
                  Create Draft Election
                </button>
              </form>
            </div>

            {/* Election Control Card */}
            <div style={formCard}>
              <h4 style={cardTitle}>Control Election Status</h4>
              <select
                style={input}
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
              >
                <option value="">Select election</option>
                {elections.map((election) => (
                  <option key={election._id} value={election._id}>
                    {election.title} ({election.position}) - {election.status}
                  </option>
                ))}
              </select>

              {selectedElectionId && (
                <>
                  <select
                    style={input}
                    value={electionControl.status}
                    onChange={(e) => setElectionControl((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="live">Live (Voting Open)</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                    <option value="announced">Announced</option>
                  </select>

                  <label style={checkLabel}>
                    <input
                      type="checkbox"
                      checked={electionControl.resetVotes}
                      onChange={(e) =>
                        setElectionControl((p) => ({ ...p, resetVotes: e.target.checked }))
                      }
                    />
                    Reset vote count
                  </label>

                  <label style={checkLabel}>
                    <input
                      type="checkbox"
                      checked={electionControl.clearApprovedCandidates}
                      onChange={(e) =>
                        setElectionControl((p) => ({
                          ...p,
                          clearApprovedCandidates: e.target.checked,
                        }))
                      }
                    />
                    Reset candidate approvals
                  </label>

                  <button style={primaryBtn} disabled={loading} onClick={updateElectionStatus}>
                    Apply Status
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Candidate Management */}
        <div style={sectionDiv}>
          <h3 style={sectionTitle}>👥 Candidate Management</h3>
          <div style={twoColGrid}>
            {/* Approve Candidates */}
            <div style={tableCard}>
              <h4 style={cardTitle}>Approve Candidate Accounts</h4>
              <div style={tableWrapper}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", color: "#666" }}>
                          No candidates
                        </td>
                      </tr>
                    ) : (
                      candidates.map((candidate) => (
                        <tr key={candidate._id}>
                          <td>{candidate.name}</td>
                          <td>{candidate.position}</td>
                          <td>
                            <span
                              style={{
                                ...statusBadge,
                                ...(candidate.approvalStatus === "approved"
                                  ? statusApproved
                                  : candidate.approvalStatus === "pending"
                                  ? statusPending
                                  : statusRejected),
                              }}
                            >
                              {candidate.approvalStatus}
                            </span>
                          </td>
                          <td>
                            <button
                              style={smallApprove}
                              onClick={() => updateCandidateApproval(candidate._id, "approved")}
                            >
                              ✓
                            </button>
                            <button
                              style={smallReject}
                              onClick={() => updateCandidateApproval(candidate._id, "rejected")}
                            >
                              ✗
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Registration */}
            <div style={formCard}>
              <h4 style={cardTitle}>Manually Add Candidate</h4>
              <form onSubmit={registerCandidateManually}>
                <input
                  style={input}
                  placeholder="Full Name"
                  value={manualCandidate.name}
                  onChange={(e) => setManualCandidate((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <input
                  style={input}
                  placeholder="Email"
                  type="email"
                  value={manualCandidate.email}
                  onChange={(e) => setManualCandidate((p) => ({ ...p, email: e.target.value }))}
                  required
                />
                <input
                  style={input}
                  type="password"
                  placeholder="Password"
                  value={manualCandidate.password}
                  onChange={(e) => setManualCandidate((p) => ({ ...p, password: e.target.value }))}
                  required
                />
                <input
                  style={input}
                  placeholder="Position"
                  value={manualCandidate.position}
                  onChange={(e) => setManualCandidate((p) => ({ ...p, position: e.target.value }))}
                  required
                />
                <textarea
                  style={textarea}
                  placeholder="Bio"
                  value={manualCandidate.bio}
                  onChange={(e) => setManualCandidate((p) => ({ ...p, bio: e.target.value }))}
                />
                <button type="submit" style={primaryBtn} disabled={loading}>
                  Add Candidate (Auto-Approved)
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Section 4: Applications & Announcements */}
        {selectedElectionId && (
          <div style={sectionDiv}>
            <h3 style={sectionTitle}>📋 Election Workflow</h3>
            <div style={twoColGrid}>
              {/* Approve Applications */}
              <div style={tableCard}>
                <h4 style={cardTitle}>Approve Applications</h4>
                <div style={tableWrapper}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Position</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center", color: "#666" }}>
                            No applications
                          </td>
                        </tr>
                      ) : (
                        applications.map((application) => (
                          <tr key={application._id}>
                            <td>{application.candidateId?.name || "-"}</td>
                            <td>{application.candidateId?.position || "-"}</td>
                            <td>
                              <span
                                style={{
                                  ...statusBadge,
                                  ...(application.status === "approved"
                                    ? statusApproved
                                    : application.status === "pending"
                                    ? statusPending
                                    : statusRejected),
                                }}
                              >
                                {application.status}
                              </span>
                            </td>
                            <td>
                              <button
                                style={smallApprove}
                                onClick={() => updateApplicationStatus(application._id, "approved")}
                              >
                                ✓
                              </button>
                              <button
                                style={smallReject}
                                onClick={() => updateApplicationStatus(application._id, "rejected")}
                              >
                                ✗
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Announcements */}
              <div style={formCard}>
                <h4 style={cardTitle}>Announce Election Results</h4>
                <textarea
                  style={textarea}
                  placeholder="Enter announcement message"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                />
                <button style={dangerBtn} disabled={loading} onClick={announceResult}>
                  Announce Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Live Results */}
        {selectedElectionId && results && (
          <div style={sectionDiv}>
            <h3 style={sectionTitle}>📈 Live Results (Updates every 10s)</h3>
            <div style={resultCard}>
              <h4 style={cardTitle}>{results.electionTitle}</h4>
              <p>
                Total Votes: <b>{results.totalVotes}</b>
              </p>
              <div style={tableWrapper}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Votes</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.votes}</td>
                        <td>
                          <div style={progressBar}>
                            <div
                              style={{
                                ...progressFill,
                                width: `${row.percentage}%`,
                              }}
                            />
                          </div>
                          {row.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {status && <p style={statusStyle(status)}>{status}</p>}
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #fee2e2 0%, #f8fafc 42%, #ecfccb 100%)",
  padding: "20px 10px",
  overflowX: "hidden",
};
const container = {
  maxWidth: "1100px",
  margin: "0 auto",
  boxSizing: "border-box",
};
const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  gap: "10px",
  flexWrap: "wrap",
};
const sectionDiv = {
  marginBottom: "24px",
  boxSizing: "border-box",
};
const sectionTitle = {
  margin: "0 0 16px 0",
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: 700,
};
const twoColGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
  gap: "16px",
  boxSizing: "border-box",
};
const infoCard = {
  background: "#fff",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  padding: "14px",
  textAlign: "center",
  boxShadow: "0 8px 16px rgba(127, 29, 29, 0.1)",
  boxSizing: "border-box",
};
const infoValue = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#111827",
  margin: "0 0 4px 0",
};
const infoLabel = {
  fontSize: "13px",
  color: "#666",
  fontWeight: 600,
};
const formCard = {
  background: "#fff",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  boxShadow: "0 8px 16px rgba(127, 29, 29, 0.1)",
  padding: "16px",
  boxSizing: "border-box",
};
const tableCard = {
  background: "#fff",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  boxShadow: "0 8px 16px rgba(127, 29, 29, 0.1)",
  padding: "16px",
  boxSizing: "border-box",
  overflow: "hidden",
};
const resultCard = {
  background: "#fff",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  boxShadow: "0 8px 16px rgba(127, 29, 29, 0.1)",
  padding: "16px",
  boxSizing: "border-box",
};
const cardTitle = {
  margin: "0 0 12px 0",
  color: "#1e293b",
  fontSize: "15px",
  fontWeight: 700,
};
const input = {
  width: "100%",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  padding: "9px",
  marginBottom: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const textarea = {
  ...input,
  minHeight: "70px",
  resize: "vertical",
};
const primaryBtn = {
  width: "100%",
  border: "none",
  borderRadius: "8px",
  background: "#111827",
  color: "#fff",
  padding: "10px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
  boxSizing: "border-box",
};
const dangerBtn = {
  width: "100%",
  border: "none",
  borderRadius: "8px",
  background: "#b91c1c",
  color: "#fff",
  padding: "10px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
  marginTop: "8px",
  boxSizing: "border-box",
};
const dangerSmallBtn = {
  border: "none",
  borderRadius: "8px",
  background: "#dc2626",
  color: "#fff",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
};
const logoutBtn = {
  border: "none",
  borderRadius: "8px",
  background: "#111827",
  color: "#fff",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
};
const tableWrapper = {
  overflowX: "auto",
  marginTop: "8px",
};
const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};
const smallApprove = {
  border: "none",
  borderRadius: "6px",
  padding: "4px 8px",
  background: "#15803d",
  color: "#fff",
  cursor: "pointer",
  marginRight: "4px",
  fontWeight: 600,
  fontSize: "12px",
};
const smallReject = {
  border: "none",
  borderRadius: "6px",
  padding: "4px 8px",
  background: "#b91c1c",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
};
const statusBadge = {
  padding: "3px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 600,
};
const statusApproved = {
  background: "#dcfce7",
  color: "#166534",
};
const statusPending = {
  background: "#fef3c7",
  color: "#92400e",
};
const statusRejected = {
  background: "#fee2e2",
  color: "#991b1b",
};
const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontWeight: 600,
  color: "#334155",
  fontSize: "13px",
  marginBottom: "8px",
};
const progressBar = {
  width: "100%",
  height: "6px",
  background: "#e5e7eb",
  borderRadius: "3px",
  overflow: "hidden",
  margin: "4px 0",
};
const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #0ea5e9, #06b6d4)",
  borderRadius: "3px",
};
const statusStyle = (status) => ({
  marginTop: "12px",
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: "14px",
  borderRadius: "8px",
  color: status.includes("✅")
    ? "#166534"
    : status.includes("⚠️")
    ? "#92400e"
    : "#991b1b",
  background: status.includes("✅")
    ? "#dcfce7"
    : status.includes("⚠️")
    ? "#fef3c7"
    : "#fee2e2",
});
