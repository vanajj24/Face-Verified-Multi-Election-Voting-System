import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import VotingHubPage from "./components/VotingHubPage";
import VotingCastFlowPage from "./components/VotingCastFlowPage";
import VotingResultsPage from "./components/VotingResultsPage";
import CandidateAuthPage from "./components/CandidateAuthPage";
import CandidateDashboardPage from "./components/CandidateDashboardPage";
import AdminAuthPage from "./components/AdminAuthPage";
import AdminDashboardPageEnhanced from "./components/AdminDashboardPageEnhanced";
import VoterRegistrationPage from "./components/VoterRegistrationPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/voting" element={<VotingHubPage />} />
        <Route path="/voting/cast" element={<VotingCastFlowPage />} />
        <Route path="/voting/results" element={<VotingResultsPage />} />
        <Route path="/candidate/auth" element={<CandidateAuthPage />} />
        <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
        <Route path="/admin/auth" element={<AdminAuthPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPageEnhanced />} />
        <Route path="/voter-registration" element={<VoterRegistrationPage />} />
      </Routes>
    </Router>
  );
}

export default App;
