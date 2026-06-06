import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LoadingAnimation from "./LoadingAnimation";
import VotingControlMenu from "./VotingControlMenu";
import VotingManagementTable from "./VotingManagementTable";
import VotingHistoryDisplay from "./VotingHistoryDisplay";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function AdminDashboardPageEnhanced() {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [overview, setOverview] = useState(null);
  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [voters, setVoters] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [voterFilter, setVoterFilter] = useState("all");

  const [newElection, setNewElection] = useState({ title: "", positionIds: [], description: "" });
  const [manualCandidate, setManualCandidate] = useState({ name: "", email: "", password: "", positionId: "", bio: "" });
  const [newPosition, setNewPosition] = useState({ name: "", description: "" });

  const [electionControl, setElectionControl] = useState({ status: "draft", resetVotes: true, clearApprovedCandidates: false });
  const [announcement, setAnnouncement] = useState("");

  const filteredVoters = useMemo(() => {
    if (voterFilter === "all") return voters;
    return voters.filter((voter) => (voter.approvalStatus || "pending") === voterFilter);
  }, [voters, voterFilter]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, electionsRes, candidatesRes, positionsRes, votersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/overview`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/elections`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/candidates`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/positions`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/voters`, { headers }),
      ]);

      setOverview(overviewRes.data);
      setElections(electionsRes.data || []);
      setCandidates(candidatesRes.data || []);
      setPositions(positionsRes.data || []);
      setVoters(votersRes.data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("adminToken");
        navigate("/admin/auth");
      } else {
        setStatus(err.response?.data?.message || "❌ Failed to load dashboard.");
      }
    } finally {
      setLoading(false);
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
        console.error("Failed to load election details");
      }
    };

    loadElectionDetails();
    const id = setInterval(loadElectionDetails, 10000);
    return () => clearInterval(id);
  }, [selectedElectionId, headers]);

  const createElection = async (e) => {
    e.preventDefault();
    if (newElection.positionIds.length === 0) {
      setStatus("⚠️ Select at least one position.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/elections`, newElection, { headers });
      setStatus(res.data.message || "✅ Election created.");
      setNewElection({ title: "", positionIds: [], description: "" });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to create election.");
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateApproval = async (candidateId, approvalStatus, positionId = null) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/candidates/${candidateId}/approval`,
        { status: approvalStatus, positionId },
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

  const updateVoterStatus = async (voterId, approvalStatus) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/voters/${voterId}/status`,
        { status: approvalStatus },
        { headers }
      );
      setStatus(res.data.message || "✅ Voter status updated.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update voter status.");
    } finally {
      setLoading(false);
    }
  };

  const registerCandidateManually = async (e) => {
    e.preventDefault();
    if (!manualCandidate.positionId) {
      setStatus("⚠️ Select a position.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/candidates/manual-register`,
        manualCandidate,
        { headers }
      );
      setStatus(res.data.message || "✅ Candidate added manually.");
      setManualCandidate({ name: "", email: "", password: "", positionId: "", bio: "" });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to manually register candidate.");
    } finally {
      setLoading(false);
    }
  };

  const rejectAndDeleteCandidate = async (candidateId) => {
    if (!window.confirm("⚠️ This will reject and delete the candidate permanently. Continue?")) {
      return;
    }
    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/candidates/${candidateId}/approval`,
        { status: "rejected" },
        { headers }
      );
      setStatus("✅ Candidate rejected and deleted.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to delete candidate.");
    } finally {
      setLoading(false);
    }
  };

  const deleteVoter = async (voterId) => {
    if (!window.confirm("⚠️ This will delete the voter record and their cast votes permanently. Continue?")) {
      return;
    }

    try {
      setLoading(true);
      const res = await axios.delete(`${API_BASE_URL}/api/admin/voters/${voterId}`, { headers });
      const deletedVotesText = res.data.deletedVotes ? ` (${res.data.deletedVotes} votes removed)` : "";
      setStatus(`${res.data.message || "✅ Voter deleted."}${deletedVotesText}`);
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to delete voter.");
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm("⚠️ This will delete ALL voters, candidates, votes, and applications. Continue?")) {
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

  const createPosition = async (e) => {
    e.preventDefault();
    if (!newPosition.name.trim()) {
      setStatus("⚠️ Position name is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/positions`, newPosition, { headers });
      setStatus(res.data.message || "✅ Position created.");
      setNewPosition({ name: "", description: "" });
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to create position.");
    } finally {
      setLoading(false);
    }
  };

  const togglePositionActive = async (position) => {
    try {
      setLoading(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/positions/${position._id}`,
        { isActive: !position.isActive },
        { headers }
      );
      setStatus(res.data.message || "✅ Position updated.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to update position.");
    } finally {
      setLoading(false);
    }
  };

  const deletePosition = async (positionId) => {
    if (!window.confirm("⚠️ Delete this position?")) return;
    try {
      setLoading(true);
      const res = await axios.delete(`${API_BASE_URL}/api/admin/positions/${positionId}`, { headers });
      setStatus(res.data.message || "✅ Position deleted.");
      await loadAll();
    } catch (err) {
      setStatus(err.response?.data?.message || "❌ Failed to delete position.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/auth");
  };

  if (loading && !candidates.length) {
    return <LoadingAnimation message="Loading Dashboard..." />;
  }

  return (
    <div style={page}>
      {loading && <LoadingAnimation message="Processing..." />}
      <div style={container}>
        {/* Header */}
        <div style={headerRow}>
          <h2 style={{ margin: 0 }}>⚡ Admin Mission Control</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={dangerSmallBtn} disabled={loading} onClick={clearAllData}>
              Clear Data
            </button>
            <button style={logoutBtn} onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={tabNav}>
          <button
            style={{ ...tabBtn, ...(activeTab === "dashboard" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            style={{ ...tabBtn, ...(activeTab === "elections" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("elections")}
          >
            🗳️ Elections
          </button>
          <button
            style={{ ...tabBtn, ...(activeTab === "candidates" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("candidates")}
          >
            👥 Candidates
          </button>
          <button
            style={{ ...tabBtn, ...(activeTab === "voting" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("voting")}
          >
            🎯 Voting Control
          </button>
          <button
            style={{ ...tabBtn, ...(activeTab === "positions" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("positions")}
          >
            🧩 Positions
          </button>
          <button
            style={{ ...tabBtn, ...(activeTab === "voters" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("voters")}
          >
            🪪 Voters
          </button>
          <button
            style={{ ...tabBtn, ...(activeTab === "history" ? activeTabStyle : {}) }}
            onClick={() => setActiveTab("history")}
          >
            📜 History
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            <div style={sectionDiv}>
              <h3 style={sectionTitle}>📊 System Overview</h3>
              <div style={twoColGrid}>
                <div style={infoCard}>
                  <div style={infoValue}>{overview?.approvedVoterCount ?? 0}</div>
                  <div style={infoLabel}>Approved Voters</div>
                </div>
                <div style={infoCard}>
                  <div style={infoValue}>{overview?.pendingVoterCount ?? 0}</div>
                  <div style={infoLabel}>Pending Voter Approvals</div>
                </div>
                <div style={infoCard}>
                  <div style={infoValue}>{overview?.rejectedVoterCount ?? 0}</div>
                  <div style={infoLabel}>Rejected Voters</div>
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
          </>
        )}

        {/* Elections Tab */}
        {activeTab === "elections" && (
          <>
            <div style={sectionDiv}>
              <h3 style={sectionTitle}>⚙️ Election Management</h3>
              <div style={twoColGrid}>
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
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                      Select Positions:
                    </label>
                    <div style={checkboxGroup}>
                      {positions.map((position) => (
                        <label key={position._id} style={positionCheckLabel}>
                          <input
                            type="checkbox"
                            checked={newElection.positionIds.includes(position._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewElection((p) => ({
                                  ...p,
                                  positionIds: [...p.positionIds, position._id],
                                }));
                              } else {
                                setNewElection((p) => ({
                                  ...p,
                                  positionIds: p.positionIds.filter((id) => id !== position._id),
                                }));
                              }
                            }}
                          />
                          {position.name}
                        </label>
                      ))}
                    </div>
                    <textarea
                      style={textarea}
                      placeholder="Description"
                      value={newElection.description}
                      onChange={(e) => setNewElection((p) => ({ ...p, description: e.target.value }))}
                    />
                    <button type="submit" disabled={loading} style={primaryBtn}>
                      Create Election
                    </button>
                  </form>
                </div>

                <div style={formCard}>
                  <h4 style={cardTitle}>Select Election</h4>
                  <select
                    style={input}
                    value={selectedElectionId}
                    onChange={(e) => setSelectedElectionId(e.target.value)}
                  >
                    <option value="">Select election...</option>
                    {elections.map((election) => (
                      <option key={election._id} value={election._id}>
                        {election.title} ({(election.positionIds || []).map((p) => p.name).join(", ")}) - {election.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {selectedElectionId && (
              <>
                <VotingControlMenu
                  selectedElectionId={selectedElectionId}
                  electionControl={electionControl}
                  setElectionControl={setElectionControl}
                  loading={loading}
                  onStatusUpdate={loadAll}
                  headers={headers}
                />

                <VotingManagementTable
                  electionId={selectedElectionId}
                  headers={headers}
                />

                <div style={sectionDiv}>
                  <h3 style={sectionTitle}>📋 Applications</h3>
                  <div style={tableCard}>
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
                                <td>{application.positionId?.name || "-"}</td>
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
                </div>

                {results && (
                  <div style={sectionDiv}>
                    <h3 style={sectionTitle}>📈 Live Results</h3>
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
                              <th>Position</th>
                              <th>Votes</th>
                              <th>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.results.map((row) => (
                              <tr key={row.id}>
                                <td>{row.name}</td>
                                <td>{row.position}</td>
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
              </>
            )}
          </>
        )}

        {/* Candidates Tab */}
        {activeTab === "candidates" && (
          <>
            <div style={sectionDiv}>
              <h3 style={sectionTitle}>👥 Candidate Management</h3>
              <div style={twoColGrid}>
                <div style={tableCard}>
                  <h4 style={cardTitle}>Candidate List</h4>
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
                              <td>{candidate.positionId?.name || candidate.position}</td>
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
                                  onClick={() => updateCandidateApproval(candidate._id, "approved", candidate.positionId?._id || null)}
                                >
                                  ✓
                                </button>
                                <button
                                  style={smallDeleteBtn}
                                  onClick={() => rejectAndDeleteCandidate(candidate._id)}
                                  title="Reject & Delete"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

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
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" }}>
                      Select Position:
                    </label>
                    <select
                      style={input}
                      value={manualCandidate.positionId}
                      onChange={(e) => setManualCandidate((p) => ({ ...p, positionId: e.target.value }))}
                      required
                    >
                      <option value="">Choose Position...</option>
                      {positions.map((pos) => (
                        <option key={pos._id} value={pos._id}>
                          {pos.name}
                        </option>
                      ))}
                    </select>
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
          </>
        )}

        {/* Voting Tab */}
        {activeTab === "voting" && selectedElectionId && (
          <VotingControlMenu
            selectedElectionId={selectedElectionId}
            electionControl={electionControl}
            setElectionControl={setElectionControl}
            loading={loading}
            onStatusUpdate={loadAll}
            headers={headers}
          />
        )}

        {/* Positions Tab */}
        {activeTab === "positions" && (
          <div style={sectionDiv}>
            <h3 style={sectionTitle}>🧩 Position Control (Admin)</h3>
            <div style={twoColGrid}>
              <div style={formCard}>
                <h4 style={cardTitle}>Create Position</h4>
                <form onSubmit={createPosition}>
                  <input
                    style={input}
                    placeholder="Position Name"
                    value={newPosition.name}
                    onChange={(e) => setNewPosition((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  <textarea
                    style={textarea}
                    placeholder="Description"
                    value={newPosition.description}
                    onChange={(e) => setNewPosition((p) => ({ ...p, description: e.target.value }))}
                  />
                  <button type="submit" style={primaryBtn} disabled={loading}>Add Position</button>
                </form>
              </div>

              <div style={tableCard}>
                <h4 style={cardTitle}>All Positions</h4>
                <div style={tableWrapper}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: "center", color: "#666" }}>No positions</td>
                        </tr>
                      ) : (
                        positions.map((position) => (
                          <tr key={position._id}>
                            <td>{position.name}</td>
                            <td>{position.isActive ? "Active" : "Inactive"}</td>
                            <td>
                              <button style={smallApprove} onClick={() => togglePositionActive(position)}>
                                {position.isActive ? "Disable" : "Enable"}
                              </button>
                              <button style={{ ...smallDeleteBtn, marginLeft: "6px" }} onClick={() => deletePosition(position._id)}>
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voters Tab */}
        {activeTab === "voters" && (
          <div style={sectionDiv}>
            <h3 style={sectionTitle}>🪪 Voter Approval & Management</h3>
            <div style={voterMenuBar}>
              <button style={{ ...voterFilterBtn, ...(voterFilter === "all" ? voterFilterActive : {}) }} onClick={() => setVoterFilter("all")}>All</button>
              <button style={{ ...voterFilterBtn, ...(voterFilter === "pending" ? voterFilterActive : {}) }} onClick={() => setVoterFilter("pending")}>Pending</button>
              <button style={{ ...voterFilterBtn, ...(voterFilter === "approved" ? voterFilterActive : {}) }} onClick={() => setVoterFilter("approved")}>Approved</button>
              <button style={{ ...voterFilterBtn, ...(voterFilter === "rejected" ? voterFilterActive : {}) }} onClick={() => setVoterFilter("rejected")}>Rejected</button>
            </div>
            <div style={twoColGrid}>
              <div style={infoCard}>
                <div style={infoValue}>{voters.length}</div>
                <div style={infoLabel}>Total Registered Attempts</div>
              </div>
              <div style={infoCard}>
                <div style={infoValue}>{voters.filter((voter) => (voter.approvalStatus || "pending") === "approved").length}</div>
                <div style={infoLabel}>Approved & Active</div>
              </div>
              <div style={infoCard}>
                <div style={infoValue}>{voters.filter((voter) => (voter.approvalStatus || "pending") === "pending").length}</div>
                <div style={infoLabel}>Awaiting Review</div>
              </div>
              <div style={infoCard}>
                <div style={infoValue}>{voters.filter((voter) => (voter.approvalStatus || "pending") === "rejected").length}</div>
                <div style={infoLabel}>Rejected</div>
              </div>
            </div>
            <p style={{ margin: "12px 0 0", color: "#475569", fontSize: "13px", fontWeight: 600 }}>
              Registration is a one-time identity claim. Once approved, the voter can participate in any live election.
            </p>
            <div style={tableCard}>
              <div style={tableWrapper}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th>Voter ID</th>
                      <th>Status</th>
                      <th>Registered At</th>
                      <th>Face Verified</th>
                      <th>Votes Cast</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoters.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "#666" }}>No voters found</td>
                      </tr>
                    ) : (
                      filteredVoters.map((voter) => (
                        <tr key={voter._id}>
                          <td>{voter.voterId}</td>
                          <td>
                            <span
                              style={{
                                ...statusBadge,
                                ...((voter.approvalStatus || "pending") === "approved"
                                  ? statusApproved
                                  : (voter.approvalStatus || "pending") === "pending"
                                  ? statusPending
                                  : statusRejected),
                              }}
                            >
                              {voter.approvalStatus || "pending"}
                            </span>
                          </td>
                          <td>{new Date(voter.registeredAt || voter.createdAt).toLocaleString()}</td>
                          <td>{voter.faceVerified ? "Yes" : "No"}</td>
                          <td>{voter.votesCount || 0}</td>
                          <td>
                            <button
                              style={smallApprove}
                              onClick={() => updateVoterStatus(voter._id, "approved")}
                              disabled={(voter.approvalStatus || "pending") === "approved"}
                            >
                              Approve
                            </button>
                            <button
                              style={smallReject}
                              onClick={() => updateVoterStatus(voter._id, "rejected")}
                              disabled={(voter.approvalStatus || "pending") === "rejected"}
                            >
                              Reject
                            </button>
                            <button
                              style={{ ...smallDeleteBtn, marginLeft: "6px" }}
                              onClick={() => deleteVoter(voter._id)}
                              title="Delete voter and their votes"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={sectionDiv}>
            <VotingHistoryDisplay />
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
  maxWidth: "1200px",
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

const tabNav = {
  display: "flex",
  gap: "8px",
  marginBottom: "20px",
  overflowX: "auto",
  paddingBottom: "8px",
};

const voterMenuBar = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const voterFilterBtn = {
  border: "1px solid #cbd5e1",
  borderRadius: "999px",
  background: "#fff",
  color: "#334155",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const voterFilterActive = {
  background: "#111827",
  color: "#fff",
  borderColor: "#111827",
};

const tabBtn = {
  border: "none",
  borderRadius: "8px",
  background: "#fff",
  color: "#374151",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "13px",
  whiteSpace: "nowrap",
  transition: "all 0.3s ease",
};

const activeTabStyle = {
  background: "#111827",
  color: "#fff",
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

const checkboxGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "12px",
  padding: "10px",
  background: "#f9fafb",
  borderRadius: "8px",
};

const positionCheckLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  cursor: "pointer",
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

const smallDeleteBtn = {
  border: "none",
  borderRadius: "6px",
  padding: "4px 8px",
  background: "#ea580c",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
  title: "Reject & Delete",
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
