const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { execSync } = require("child_process");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "ADMIN_SECRET_2026";

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowListedOrigins = new Set([
  ...configuredOrigins,
  "https://face-verified-multi-election-voting-yljj.onrender.com",
  "https://face-verified-multi-election-voting.onrender.com",
  "http://localhost:3000",
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowListedOrigins.has(origin)) return callback(null, true);

    // Allow Render preview/custom URLs for this project without manual updates.
    if (/^https:\/\/face-verified-multi-election-voting.*\.onrender\.com$/.test(origin)) {
      return callback(null, true);
    }

    // Do not throw CORS errors to the browser; respond with a normal CORS decision.
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Explicit preflight-safe headers for proxy/CDN environments.
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.json({ limit: "5mb" }));

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/face_voting";
const LOCAL_MONGO_URI = process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/face_voting";

const voterSchema = new mongoose.Schema(
  {
    voterId: { type: String, required: true, unique: true },
    descriptor: { type: [Number], required: true },
    registeredAt: { type: Date, default: Date.now },
    faceVerified: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
  },
  { timestamps: true }
);

const positionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: "Position", default: null },
    bio: { type: String, default: "" },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const electionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    positionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true }],
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "live", "paused", "ended", "announced"],
      default: "draft",
    },
    announcement: { type: String, default: "" },
    approvedCandidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

const candidateApplicationSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

candidateApplicationSchema.index({ electionId: 1, candidateId: 1, positionId: 1 }, { unique: true });

const voteSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    voterId: { type: String, required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
  },
  { timestamps: true }
);

voteSchema.index({ electionId: 1, voterId: 1, positionId: 1 }, { unique: true });

const votingHistorySchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
    positionName: { type: String, required: true },
    winnerCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    winnerCandidateName: { type: String, default: "No Clear Winner" },
    totalVotesForPosition: { type: Number, default: 0 },
    winnerVoteCount: { type: Number, default: 0 },
    winnerVotePercentage: { type: Number, default: 0 },
    electionTitle: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

votingHistorySchema.index({ electionId: 1, positionId: 1 }, { unique: true });

const Voter = mongoose.model("Voter", voterSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Position = mongoose.model("Position", positionSchema);
const Candidate = mongoose.model("Candidate", candidateSchema);
const Election = mongoose.model("Election", electionSchema);
const CandidateApplication = mongoose.model("CandidateApplication", candidateApplicationSchema);
const Vote = mongoose.model("Vote", voteSchema);
const VotingHistory = mongoose.model("VotingHistory", votingHistorySchema);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return value;
}

function signAdminToken(admin) {
  return jwt.sign({ id: admin._id, role: "admin", email: admin.email }, JWT_SECRET, {
    expiresIn: "8h",
  });
}

function signCandidateToken(candidate) {
  return jwt.sign(
    { id: candidate._id, role: "candidate", email: candidate.email },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function signVoteToken(electionId, voterId) {
  return jwt.sign(
    { role: "voter", electionId: String(electionId), voterId: String(voterId) },
    JWT_SECRET,
    { expiresIn: "8m" }
  );
}

function authenticateRole(expectedRole) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "❌ Token missing." });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== expectedRole) {
        return res.status(403).json({ message: "❌ Access denied." });
      }
      req.auth = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "❌ Invalid or expired token." });
    }
  };
}

const authenticateAdmin = authenticateRole("admin");
const authenticateCandidate = authenticateRole("candidate");

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD) || 0.6;

async function getElectionResults(electionId) {
  const [election, votes, candidates, approvedApplications] = await Promise.all([
    Election.findById(electionId).populate("positionIds"),
    Vote.find({ electionId }),
    Candidate.find({}).populate("positionId"),
    CandidateApplication.find({ electionId, status: "approved" }).populate("positionId", "name"),
  ]);

  if (!election) return null;

  const voteMap = new Map();
  for (const vote of votes) {
    const key = String(vote.candidateId);
    voteMap.set(key, (voteMap.get(key) || 0) + 1);
  }

  const allowedCandidateIds = new Set((election.approvedCandidateIds || []).map((id) => String(id)));
  approvedApplications.forEach((app) => allowedCandidateIds.add(String(app.candidateId)));
  const selectedCandidates = candidates.filter((candidate) =>
    allowedCandidateIds.has(String(candidate._id))
  );

  const appPositionMap = new Map();
  approvedApplications.forEach((app) => {
    const key = String(app.candidateId);
    if (!appPositionMap.has(key) && app.positionId) {
      appPositionMap.set(key, app.positionId.name);
    }
  });

  const totalVotes = votes.length;
  const rows = selectedCandidates
    .map((candidate) => {
      const voteCount = voteMap.get(String(candidate._id)) || 0;
      return {
        id: candidate._id,
        name: candidate.name,
        position: candidate.positionId?.name || appPositionMap.get(String(candidate._id)) || "Unassigned Role",
        votes: voteCount,
        percentage: totalVotes ? ((voteCount / totalVotes) * 100).toFixed(2) : "0.00",
      };
    })
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

  const positions = election.positionIds.map(p => p.name).join(", ");

  return {
    electionId: election._id,
    electionTitle: election.title,
    electionStatus: election.status,
    positions,
    announcement: election.announcement,
    totalVotes,
    results: rows,
  };
}

async function buildVotingHistoryRows(electionId) {
  const election = await Election.findById(electionId).populate("positionIds");
  if (!election) return null;

  const [votes, candidates] = await Promise.all([
    Vote.find({ electionId }),
    Candidate.find({}).populate("positionId"),
  ]);

  const candidateMap = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));
  const votesByPosition = new Map();

  votes.forEach((vote) => {
    const positionKey = String(vote.positionId);
    if (!votesByPosition.has(positionKey)) votesByPosition.set(positionKey, []);
    votesByPosition.get(positionKey).push(vote);
  });

  return election.positionIds.map((position) => {
    const positionVotes = votesByPosition.get(String(position._id)) || [];
    const totalVotesForPosition = positionVotes.length;
    const tally = new Map();

    positionVotes.forEach((vote) => {
      const key = String(vote.candidateId);
      tally.set(key, (tally.get(key) || 0) + 1);
    });

    let winnerCandidateId = null;
    let winnerCandidateName = "No Clear Winner";
    let winnerVoteCount = 0;
    let winnerVotePercentage = 0;

    if (totalVotesForPosition > 0 && tally.size > 0) {
      const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const topCount = ranked[0][1];
      const topCandidates = ranked.filter(([, count]) => count === topCount).map(([candidateId]) => candidateId);
      winnerVoteCount = topCount;
      winnerVotePercentage = Number(((topCount / totalVotesForPosition) * 100).toFixed(2));

      if (topCandidates.length === 1) {
        winnerCandidateId = topCandidates[0];
        winnerCandidateName = candidateMap.get(winnerCandidateId)?.name || "Deleted Candidate";
      }
    }

    return {
      electionId: election._id,
      positionId: position._id,
      positionName: position.name,
      winnerCandidateId,
      winnerCandidateName,
      totalVotesForPosition,
      winnerVoteCount,
      winnerVotePercentage,
      electionTitle: election.title,
    };
  });
}

async function syncVotingHistoryForElection(electionId) {
  const rows = await buildVotingHistoryRows(electionId);
  if (!rows) return [];

  const savedRecords = [];
  for (const row of rows) {
    const record = await VotingHistory.findOneAndUpdate(
      { electionId: row.electionId, positionId: row.positionId },
      {
        $set: {
          positionName: row.positionName,
          winnerCandidateId: row.winnerCandidateId,
          winnerCandidateName: row.winnerCandidateName,
          totalVotesForPosition: row.totalVotesForPosition,
          winnerVoteCount: row.winnerVoteCount,
          winnerVotePercentage: row.winnerVotePercentage,
          electionTitle: row.electionTitle,
        },
        $setOnInsert: {
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    savedRecords.push(record);
  }

  return savedRecords;
}

async function backfillVotingHistory() {
  const finalizedElections = await Election.find({ status: { $in: ["ended", "announced"] } }).select("_id");
  const histories = [];

  for (const election of finalizedElections) {
    const records = await syncVotingHistoryForElection(election._id);
    histories.push(...records);
  }

  return histories;
}

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ Primary MongoDB connection failed:", err.message);
    if (MONGO_URI !== LOCAL_MONGO_URI) {
      await mongoose.connect(LOCAL_MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ Connected using LOCAL_MONGO_URI fallback");
    }
  }
}

app.post("/api/admin/register", async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;
    if (!name || !email || !password || !secretKey) {
      return res.status(400).json({ message: "⚠️ name, email, password and secret key are required." });
    }

    if (String(secretKey) !== String(ADMIN_SECRET_KEY)) {
      return res.status(403).json({ message: "❌ Invalid admin secret key." });
    }

    const normalizedEmail = normalizeEmail(email);
    const exists = await Admin.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "⚠️ Admin email already exists." });
    }

    const admin = await Admin.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
    });

    return res.json({
      message: "✅ Admin registered successfully.",
      token: signAdminToken(admin),
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("❌ Admin register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "⚠️ Email and password are required." });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(email) });
    if (!admin || admin.password !== String(password)) {
      return res.status(401).json({ message: "❌ Invalid admin credentials." });
    }

    return res.json({
      message: "✅ Admin login successful.",
      token: signAdminToken(admin),
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Position Management Endpoints
app.get("/api/admin/positions", authenticateAdmin, async (req, res) => {
  try {
    const positions = await Position.find({}).sort({ createdAt: -1 });
    return res.json(positions);
  } catch (err) {
    console.error("❌ Positions list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/positions", authenticateAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "⚠️ Position name is required." });
    }

    const exists = await Position.findOne({ name: String(name).trim() });
    if (exists) {
      return res.status(400).json({ message: "⚠️ Position already exists." });
    }

    const position = await Position.create({
      name: String(name).trim(),
      description: String(description || "").trim(),
      isActive: true,
      createdBy: req.auth.id,
    });

    return res.json({ message: "✅ Position created successfully.", position });
  } catch (err) {
    console.error("❌ Position create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/admin/positions/:id", authenticateAdmin, async (req, res) => {
  try {
    const positionId = sanitizeObjectId(req.params.id);
    if (!positionId) {
      return res.status(400).json({ message: "⚠️ Invalid position id." });
    }

    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ message: "❌ Position not found." });
    }

    const candidateCount = await Candidate.countDocuments({ positionId });
    if (candidateCount > 0) {
      return res.status(400).json({ message: `⚠️ Cannot delete position with ${candidateCount} candidate(s).` });
    }

    await Position.findByIdAndDelete(positionId);
    return res.json({ message: "✅ Position deleted successfully." });
  } catch (err) {
    console.error("❌ Position delete error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/admin/positions/:id", authenticateAdmin, async (req, res) => {
  try {
    const positionId = sanitizeObjectId(req.params.id);
    const { name, description, isActive } = req.body;

    if (!positionId) {
      return res.status(400).json({ message: "⚠️ Invalid position id." });
    }

    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ message: "❌ Position not found." });
    }

    if (name) position.name = String(name).trim();
    if (description !== undefined) position.description = String(description).trim();
    if (isActive !== undefined) position.isActive = Boolean(isActive);
    await position.save();

    return res.json({ message: "✅ Position updated successfully.", position });
  } catch (err) {
    console.error("❌ Position update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/positions/public", async (req, res) => {
  try {
    const positions = await Position.find({ isActive: true })
      .select("name description")
      .sort({ name: 1 });
    return res.json(positions);
  } catch (err) {
    console.error("❌ Public positions list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/voting-history", async (req, res) => {
  try {
    await backfillVotingHistory();
    const history = await VotingHistory.find({})
      .populate("electionId", "title")
      .populate("positionId", "name")
      .populate("winnerCandidateId", "name")
      .sort({ completedAt: -1 });

    return res.json(history);
  } catch (err) {
    console.error("❌ Voting history error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/voting-history", authenticateAdmin, async (req, res) => {
  try {
    const {
      electionId,
      positionId,
      positionName,
      winnerCandidateId,
      winnerCandidateName,
      totalVotesForPosition,
      winnerVoteCount,
      winnerVotePercentage,
      electionTitle,
    } = req.body;

    if (!electionId || !positionId || !positionName || !electionTitle) {
      return res.status(400).json({ message: "⚠️ Missing required fields for voting history." });
    }

    const votingRecord = await VotingHistory.create({
      electionId,
      positionId,
      positionName,
      winnerCandidateId,
      winnerCandidateName,
      totalVotesForPosition,
      winnerVoteCount,
      winnerVotePercentage,
      electionTitle,
      completedAt: new Date(),
    });

    return res.json({ message: "✅ Voting history created successfully.", votingRecord });
  } catch (err) {
    console.error("❌ Create voting history error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/voting-history/:id", authenticateAdmin, async (req, res) => {
  try {
    const historyId = sanitizeObjectId(req.params.id);
    if (!historyId) return res.status(400).json({ message: "⚠️ Invalid history id." });

    const result = await VotingHistory.findByIdAndDelete(historyId);
    if (!result) return res.status(404).json({ message: "❌ Voting history not found." });

    return res.json({ message: "✅ Voting history deleted successfully." });
  } catch (err) {
    console.error("❌ Delete voting history error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Voter Details Endpoint
app.get("/api/admin/voters", authenticateAdmin, async (req, res) => {
  try {
    const voters = await Voter.find({}).sort({ registeredAt: -1 });
    const votes = await Vote.find({});
    
    const votersWithDetails = voters.map((voter) => {
      const voteCount = votes.filter(v => v.voterId === voter.voterId).length;
      return {
        _id: voter._id,
        voterId: voter.voterId,
        registeredAt: voter.registeredAt,
        faceVerified: voter.faceVerified,
        approvalStatus: voter.approvalStatus || "pending",
        reviewedAt: voter.reviewedAt,
        approvedAt: voter.approvedAt,
        votesCount: voteCount,
        createdAt: voter.createdAt,
      };
    });

    return res.json(votersWithDetails);
  } catch (err) {
    console.error("❌ Voters list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/candidates/register", async (req, res) => {
  try {
    const { name, email, password, bio } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "⚠️ name, email and password are required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const exists = await Candidate.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "⚠️ Candidate email already exists." });
    }

    const candidate = await Candidate.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      bio: String(bio || "").trim(),
      approvalStatus: "pending",
    });

    return res.json({
      message: "✅ Candidate registered. Waiting for admin approval.",
      candidate: { id: candidate._id, name: candidate.name, status: candidate.approvalStatus },
    });
  } catch (err) {
    console.error("❌ Candidate register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/candidates/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "⚠️ Email and password are required." });
    }

    const candidate = await Candidate.findOne({ email: normalizeEmail(email) }).populate("positionId");
    if (!candidate || candidate.password !== String(password)) {
      return res.status(401).json({ message: "❌ Invalid candidate credentials." });
    }

    if (candidate.approvalStatus !== "approved") {
      return res.status(403).json({ message: "⚠️ Candidate account is not approved by admin." });
    }

    return res.json({
      message: "✅ Candidate login successful.",
      token: signCandidateToken(candidate),
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        positionId: candidate.positionId?._id || null,
        positionName: candidate.positionId?.name || null,
        bio: candidate.bio,
      },
    });
  } catch (err) {
    console.error("❌ Candidate login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/candidate/me", authenticateCandidate, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.auth.id).populate("positionId").select("-password");
    if (!candidate) {
      return res.status(404).json({ message: "❌ Candidate not found." });
    }
    return res.json(candidate);
  } catch (err) {
    console.error("❌ Candidate profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/candidate/me", authenticateCandidate, async (req, res) => {
  try {
    const { name, bio, password, positionId } = req.body;
    const candidate = await Candidate.findById(req.auth.id);
    if (!candidate) {
      return res.status(404).json({ message: "❌ Candidate not found." });
    }

    if (name) candidate.name = String(name).trim();
    if (bio !== undefined) candidate.bio = String(bio);
    if (password) candidate.password = String(password);

    if (positionId !== undefined) {
      const sanitizedPositionId = sanitizeObjectId(positionId);
      if (!sanitizedPositionId) {
        return res.status(400).json({ message: "⚠️ Invalid position ID." });
      }

      const position = await Position.findById(sanitizedPositionId);
      if (!position || !position.isActive) {
        return res.status(404).json({ message: "❌ Position not found or inactive." });
      }

      candidate.positionId = sanitizedPositionId;
    }

    await candidate.save();

    const populatedCandidate = await Candidate.findById(candidate._id).populate("positionId");
    return res.json({
      message: "✅ Profile updated.",
      candidate: {
        id: populatedCandidate._id,
        name: populatedCandidate.name,
        email: populatedCandidate.email,
        positionId: populatedCandidate.positionId?._id || null,
        positionName: populatedCandidate.positionId?.name || null,
        bio: populatedCandidate.bio,
      },
    });
  } catch (err) {
    console.error("❌ Candidate update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/candidate/elections", authenticateCandidate, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.auth.id);
    if (!candidate) {
      return res.status(404).json({ message: "❌ Candidate not found." });
    }

    const [elections, applications] = await Promise.all([
      Election.find({}).populate("positionIds").sort({ createdAt: -1 }),
      CandidateApplication.find({ candidateId: candidate._id })
        .populate("positionId", "name")
        .sort({ createdAt: -1 }),
    ]);

    const appsByElection = new Map();
    applications.forEach((app) => {
      const key = String(app.electionId);
      if (!appsByElection.has(key)) appsByElection.set(key, []);
      appsByElection.get(key).push(app);
    });

    const rows = elections.map((election) => {
      const electionApps = appsByElection.get(String(election._id)) || [];
      const hasApproved = electionApps.some((a) => a.status === "approved");
      const hasPending = electionApps.some((a) => a.status === "pending");

      return {
      id: election._id,
      title: election.title,
      position: election.positionIds.map((p) => p.name).join(", "),
      positionOptions: election.positionIds.map((p) => ({ id: p._id, name: p.name })),
      status: election.status,
      applicationStatus: hasApproved ? "approved" : hasPending ? "pending" : electionApps.length ? "rejected" : "not_applied",
      applications: electionApps.map((app) => ({
        id: app._id,
        positionId: app.positionId?._id || app.positionId,
        positionName: app.positionId?.name || "-",
        status: app.status,
        createdAt: app.createdAt,
      })),
      createdAt: election.createdAt,
      };
    });

    return res.json(rows);
  } catch (err) {
    console.error("❌ Candidate elections error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/candidate/elections/:id/apply", authenticateCandidate, async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    const selectedPositionId = sanitizeObjectId(req.body?.positionId);
    if (!electionId) {
      return res.status(400).json({ message: "⚠️ Invalid election id." });
    }
    if (!selectedPositionId) {
      return res.status(400).json({ message: "⚠️ positionId is required." });
    }

    const [candidate, election] = await Promise.all([
      Candidate.findById(req.auth.id),
      Election.findById(electionId).populate("positionIds"),
    ]);

    if (!candidate) {
      return res.status(404).json({ message: "❌ Candidate not found." });
    }
    if (candidate.approvalStatus !== "approved") {
      return res.status(403).json({ message: "⚠️ Candidate account is not approved by admin." });
    }

    if (!election) {
      return res.status(404).json({ message: "❌ Election not found." });
    }

    const positionIdStr = String(selectedPositionId);
    const electionHasPosition = (election.positionIds || []).some((p) => String(p._id) === positionIdStr);
    
    if (!electionHasPosition) {
      return res.status(400).json({ message: "⚠️ Candidate position is not part of this election." });
    }

    const exists = await CandidateApplication.findOne({ 
      electionId, 
      candidateId: candidate._id,
      positionId: selectedPositionId,
    });
    if (exists) {
      return res.status(400).json({ message: "⚠️ You already applied for this position in this election." });
    }

    await CandidateApplication.create({
      electionId,
      candidateId: candidate._id,
      positionId: selectedPositionId,
      status: "pending",
    });

    return res.json({ message: "✅ Application submitted. Waiting for admin approval." });
  } catch (err) {
    console.error("❌ Candidate apply error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/voters/register", async (req, res) => {
  try {
    const { voterId, descriptor } = req.body;
    if (!voterId || !Array.isArray(descriptor) || descriptor.length < 32) {
      return res.status(400).json({ message: "⚠️ voterId and valid descriptor are required." });
    }

    const normalizedVoterId = String(voterId).trim();

    const existingVoter = await Voter.findOne({ voterId: normalizedVoterId });
    if (existingVoter) {
      return res.status(400).json({ message: "⚠️ Voter ID already registered." });
    }

    const voters = await Voter.find();
    for (const voter of voters) {
      const distance = euclideanDistance(voter.descriptor, descriptor);
      if (distance < FACE_MATCH_THRESHOLD) {
        return res.status(400).json({ message: "⚠️ This face is already registered with another voter." });
      }
    }

    await Voter.create({
      voterId: normalizedVoterId,
      descriptor,
      faceVerified: true,
      approvalStatus: "pending",
      reviewedAt: null,
      approvedAt: null,
    });
    return res.json({ message: "✅ Voter registration submitted. Waiting for admin approval." });
  } catch (err) {
    console.error("❌ Voter register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/elections/public", async (req, res) => {
  try {
    const elections = await Election.find({}).populate("positionIds").sort({ createdAt: -1 });
    const rows = elections.map((election) => ({
      id: election._id,
      title: election.title,
      positions: election.positionIds.map(p => p.name),
      description: election.description,
      status: election.status,
      createdAt: election.createdAt,
      updatedAt: election.updatedAt,
    }));
    return res.json(rows);
  } catch (err) {
    console.error("❌ Public elections error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/voting/start", async (req, res) => {
  try {
    const { electionId, voterId } = req.body;
    const normalizedVoterId = String(voterId || "").trim();
    const sanitizedElectionId = sanitizeObjectId(electionId);

    if (!sanitizedElectionId || !normalizedVoterId) {
      return res.status(400).json({ message: "⚠️ electionId and voterId are required." });
    }

    const [election, voter] = await Promise.all([
      Election.findById(sanitizedElectionId).populate("positionIds"),
      Voter.findOne({ voterId: normalizedVoterId }),
    ]);

    if (!election) return res.status(404).json({ message: "❌ Election not found." });
    if (election.status !== "live") {
      return res.status(400).json({ message: "⚠️ Election is not live right now." });
    }
    if (!voter) return res.status(404).json({ message: "❌ Voter not found." });
    if (voter.approvalStatus !== "approved") {
      return res.status(403).json({ message: "⚠️ Voter registration is awaiting admin approval." });
    }

    const alreadyVoted = await Vote.findOne({ electionId: sanitizedElectionId, voterId: normalizedVoterId });
    if (alreadyVoted) {
      return res.status(400).json({ message: "⚠️ You have already voted in this election." });
    }

    return res.json({ message: "✅ Student ID accepted. Proceed to face verification." });
  } catch (err) {
    console.error("❌ Voting start error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/voting/verify-face", async (req, res) => {
  try {
    const { electionId, voterId, descriptor } = req.body;
    const normalizedVoterId = String(voterId || "").trim();
    const sanitizedElectionId = sanitizeObjectId(electionId);

    if (!sanitizedElectionId || !normalizedVoterId || !Array.isArray(descriptor)) {
      return res.status(400).json({ message: "⚠️ electionId, voterId and descriptor are required." });
    }

    const [election, voter] = await Promise.all([
      Election.findById(sanitizedElectionId).populate("positionIds"),
      Voter.findOne({ voterId: normalizedVoterId }),
    ]);

    if (!election) return res.status(404).json({ message: "❌ Election not found." });
    if (election.status !== "live") return res.status(400).json({ message: "⚠️ Election is not live." });
    if (!voter) return res.status(404).json({ message: "❌ Voter not found." });
    if (voter.approvalStatus !== "approved") {
      return res.status(403).json({ message: "⚠️ Voter registration is awaiting admin approval." });
    }

    const alreadyVoted = await Vote.findOne({ electionId: sanitizedElectionId, voterId: normalizedVoterId });
    if (alreadyVoted) {
      return res.status(400).json({ message: "⚠️ You have already voted in this election." });
    }

    const distance = euclideanDistance(voter.descriptor, descriptor);
    if (distance > FACE_MATCH_THRESHOLD) {
      return res.status(401).json({
        message: "❌ Face verification failed. Face doesn't match.",
      });
    }

    const voteToken = signVoteToken(sanitizedElectionId, normalizedVoterId);
    return res.json({
      message: "✅ Face verified. Continue to cast vote.",
      voteToken,
    });
  } catch (err) {
    console.error("❌ Face verification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/elections/:id/candidates", async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    if (!electionId) return res.status(400).json({ message: "⚠️ Invalid election id." });

    const election = await Election.findById(electionId).populate("positionIds");
    if (!election) return res.status(404).json({ message: "❌ Election not found." });

    const groupedByPosition = {};

    const approvedApplications = await CandidateApplication.find({
      electionId,
      status: "approved",
    })
      .populate("candidateId", "name bio approvalStatus")
      .populate("positionId", "name");

    approvedApplications.forEach((app) => {
      const candidate = app.candidateId;
      const position = app.positionId;
      if (!candidate || !position) return;
      if (candidate.approvalStatus !== "approved") return;

      const posName = position.name;
      if (!groupedByPosition[posName]) {
        groupedByPosition[posName] = [];
      }
      groupedByPosition[posName].push({
        id: `${candidate._id}:${position._id}`,
        candidateId: candidate._id,
        positionId: position._id,
        name: candidate.name,
        position: posName,
        bio: candidate.bio,
      });
    });

    if (Object.keys(groupedByPosition).length === 0 && (election.approvedCandidateIds || []).length > 0) {
      const fallbackCandidates = await Candidate.find({ _id: { $in: election.approvedCandidateIds } }).populate("positionId");
      fallbackCandidates.forEach((candidate) => {
        if (!candidate.positionId) return;
        const posName = candidate.positionId.name;
        if (!groupedByPosition[posName]) {
          groupedByPosition[posName] = [];
        }
        groupedByPosition[posName].push({
          id: `${candidate._id}:${candidate.positionId._id}`,
          candidateId: candidate._id,
          positionId: candidate.positionId._id,
          name: candidate.name,
          position: posName,
          bio: candidate.bio,
        });
      });
    }

    return res.json(groupedByPosition);
  } catch (err) {
    console.error("❌ Election candidates error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/voting/cast", async (req, res) => {
  try {
    const { electionId, candidateId, positionId, voteToken } = req.body;
    const sanitizedElectionId = sanitizeObjectId(electionId);
    const sanitizedCandidateId = sanitizeObjectId(candidateId);
    const sanitizedPositionId = sanitizeObjectId(positionId);

    if (!sanitizedElectionId || !sanitizedCandidateId || !voteToken) {
      return res.status(400).json({ message: "⚠️ electionId, candidateId and voteToken are required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(String(voteToken), JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "❌ Invalid or expired vote token." });
    }

    if (decoded.role !== "voter" || decoded.electionId !== String(sanitizedElectionId)) {
      return res.status(401).json({ message: "❌ Invalid vote session." });
    }

    const election = await Election.findById(sanitizedElectionId).populate("positionIds");
    if (!election) return res.status(404).json({ message: "❌ Election not found." });
    if (election.status !== "live") {
      return res.status(400).json({ message: "⚠️ Election is not live." });
    }

    const candidate = await Candidate.findById(sanitizedCandidateId).populate("positionId");
    if (!candidate) {
      return res.status(404).json({ message: "❌ Candidate not found." });
    }

    const candidateAllowed = (election.approvedCandidateIds || []).some(
      (id) => String(id) === String(sanitizedCandidateId)
    );
    let approvedApplication = null;
    if (!candidateAllowed) {
      approvedApplication = await CandidateApplication.findOne({
        electionId: sanitizedElectionId,
        candidateId: sanitizedCandidateId,
        status: "approved",
      });
      if (!approvedApplication) {
        return res.status(400).json({ message: "⚠️ Candidate is not approved for this election." });
      }
    }

    const resolvedPositionId = sanitizedPositionId
      || approvedApplication?.positionId
      || candidate.positionId?._id
      || candidate.positionId;

    if (!resolvedPositionId) {
      return res.status(400).json({ message: "⚠️ Candidate role could not be resolved for voting." });
    }

    const electionHasCandidatePosition = (election.positionIds || []).some(
      (p) => String(p._id || p) === String(resolvedPositionId)
    );
    if (!electionHasCandidatePosition) {
      return res.status(400).json({ message: "⚠️ Candidate role is not part of this election." });
    }

    const existingVote = await Vote.findOne({
      electionId: sanitizedElectionId,
      voterId: decoded.voterId,
    });
    if (existingVote) {
      return res.status(400).json({ message: "⚠️ Repeated votes are not allowed." });
    }

    await Vote.create({
      electionId: sanitizedElectionId,
      voterId: decoded.voterId,
      candidateId: sanitizedCandidateId,
      positionId: resolvedPositionId,
    });

    return res.json({ message: "✅ Vote cast successfully." });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "⚠️ Repeated votes are not allowed." });
    }
    console.error("❌ Cast vote error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/elections/:id/results", async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    if (!electionId) return res.status(400).json({ message: "⚠️ Invalid election id." });

    const results = await getElectionResults(electionId);
    if (!results) return res.status(404).json({ message: "❌ Election not found." });
    return res.json(results);
  } catch (err) {
    console.error("❌ Result error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/overview", authenticateAdmin, async (req, res) => {
  try {
    const [voterCount, approvedVoterCount, pendingVoterCount, rejectedVoterCount, candidateCount, pendingCandidates, elections, voteCount] = await Promise.all([
      Voter.countDocuments(),
      Voter.countDocuments({ approvalStatus: "approved" }),
      Voter.countDocuments({ approvalStatus: "pending" }),
      Voter.countDocuments({ approvalStatus: "rejected" }),
      Candidate.countDocuments({ approvalStatus: "approved" }),
      Candidate.countDocuments({ approvalStatus: "pending" }),
      Election.countDocuments(),
      Vote.countDocuments(),
    ]);

    return res.json({
      voterCount,
      approvedVoterCount,
      pendingVoterCount,
      rejectedVoterCount,
      candidateCount,
      pendingCandidates,
      elections,
      voteCount,
    });
  } catch (err) {
    console.error("❌ Admin overview error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/candidates/manual-register", authenticateAdmin, async (req, res) => {
  try {
    const { name, email, password, positionId, bio } = req.body;
    if (!name || !email || !password || !positionId) {
      return res.status(400).json({ message: "⚠️ name, email, password and positionId are required." });
    }

    const sanitizedPositionId = sanitizeObjectId(positionId);
    if (!sanitizedPositionId) {
      return res.status(400).json({ message: "⚠️ Invalid position ID." });
    }

    const position = await Position.findById(sanitizedPositionId);
    if (!position) {
      return res.status(404).json({ message: "❌ Position not found." });
    }

    const normalizedEmail = normalizeEmail(email);
    const exists = await Candidate.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "⚠️ Candidate email already exists." });
    }

    const candidate = await Candidate.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      positionId: sanitizedPositionId,
      bio: String(bio || ""),
      approvalStatus: "approved",
    });

    const populatedCandidate = await candidate.populate("positionId");
    return res.json({ message: "✅ Candidate manually registered and approved.", candidate: populatedCandidate });
  } catch (err) {
    console.error("❌ Manual candidate register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/candidates", authenticateAdmin, async (req, res) => {
  try {
    const filter = req.query.status ? { approvalStatus: String(req.query.status) } : {};
    const candidates = await Candidate.find(filter).populate("positionId").sort({ createdAt: -1 });
    return res.json(candidates);
  } catch (err) {
    console.error("❌ Admin candidates list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/admin/candidates/:id/approval", authenticateAdmin, async (req, res) => {
  try {
    const candidateId = sanitizeObjectId(req.params.id);
    const { status, positionId } = req.body;
    if (!candidateId) return res.status(400).json({ message: "⚠️ Invalid candidate id." });
    if (!["approved", "rejected", "pending"].includes(String(status))) {
      return res.status(400).json({ message: "⚠️ Invalid status." });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "❌ Candidate not found." });

    const nextStatus = String(status);
    const sanitizedPositionId = sanitizeObjectId(positionId);

    // Candidate account approval is independent from election-role application.
    if (nextStatus === "approved") {
      if (sanitizedPositionId) {
        const position = await Position.findById(sanitizedPositionId);
        if (!position) {
          return res.status(404).json({ message: "❌ Position not found." });
        }
        candidate.positionId = sanitizedPositionId;
      }

      candidate.approvalStatus = nextStatus;
      await candidate.save();
    } else {
      // Use update operation so rejected/pending can be set even for legacy incomplete records.
      await Candidate.updateOne({ _id: candidateId }, { $set: { approvalStatus: nextStatus } });
    }

    return res.json({ message: `✅ Candidate status updated to ${status}.` });
  } catch (err) {
    console.error("❌ Candidate approval error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/admin/voters/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const voterId = sanitizeObjectId(req.params.id);
    const { status } = req.body;

    if (!voterId) return res.status(400).json({ message: "⚠️ Invalid voter id." });
    if (!["approved", "rejected", "pending"].includes(String(status))) {
      return res.status(400).json({ message: "⚠️ Invalid status." });
    }

    const voter = await Voter.findById(voterId);
    if (!voter) return res.status(404).json({ message: "❌ Voter not found." });

    const nextStatus = String(status);
    voter.approvalStatus = nextStatus;
    voter.reviewedAt = new Date();
    voter.approvedAt = nextStatus === "approved" ? new Date() : null;
    await voter.save();

    return res.json({ message: `✅ Voter status updated to ${nextStatus}.` });
  } catch (err) {
    console.error("❌ Voter approval update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/admin/voters/:id", authenticateAdmin, async (req, res) => {
  try {
    const voterId = sanitizeObjectId(req.params.id);
    if (!voterId) return res.status(400).json({ message: "⚠️ Invalid voter id." });

    const voter = await Voter.findById(voterId);
    if (!voter) return res.status(404).json({ message: "❌ Voter not found." });

    const [, voteDeleteResult] = await Promise.all([
      Voter.deleteOne({ _id: voterId }),
      Vote.deleteMany({ voterId: voter.voterId }),
    ]);

    return res.json({
      message: "✅ Voter deleted successfully.",
      deletedVotes: voteDeleteResult.deletedCount || 0,
    });
  } catch (err) {
    console.error("❌ Voter delete error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/elections", authenticateAdmin, async (req, res) => {
  try {
    const { title, positionIds, description } = req.body;
    if (!title || !Array.isArray(positionIds) || positionIds.length === 0) {
      return res.status(400).json({ message: "⚠️ title and at least one position are required." });
    }

    const sanitizedPositionIds = positionIds.map(id => sanitizeObjectId(id)).filter(id => id);
    if (sanitizedPositionIds.length === 0) {
      return res.status(400).json({ message: "⚠️ Invalid position IDs." });
    }

    const election = await Election.create({
      title: String(title).trim(),
      positionIds: sanitizedPositionIds,
      description: String(description || "").trim(),
      status: "draft",
      approvedCandidateIds: [],
      createdBy: req.auth.id,
    });

    const populatedElection = await election.populate("positionIds");
    return res.json({ message: "✅ Election created in draft state.", election: populatedElection });
  } catch (err) {
    console.error("❌ Election create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/elections", authenticateAdmin, async (req, res) => {
  try {
    const elections = await Election.find({}).populate("positionIds").sort({ createdAt: -1 });
    return res.json(elections);
  } catch (err) {
    console.error("❌ Admin elections list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/admin/elections/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    const { status, resetVotes, clearApprovedCandidates } = req.body;

    if (!electionId) return res.status(400).json({ message: "⚠️ Invalid election id." });
    if (!["draft", "live", "paused", "ended", "announced"].includes(String(status))) {
      return res.status(400).json({ message: "⚠️ Invalid election status." });
    }

    const election = await Election.findById(electionId).populate("positionIds");
    if (!election) return res.status(404).json({ message: "❌ Election not found." });

    if (["ended", "announced"].includes(String(status))) {
      await syncVotingHistoryForElection(election._id);
    }

    election.status = String(status);
    await election.save();

    if (resetVotes === true) {
      await Vote.deleteMany({ electionId: election._id });
    }

    if (clearApprovedCandidates === true) {
      election.approvedCandidateIds = [];
      await election.save();
      await CandidateApplication.updateMany(
        { electionId: election._id, status: "approved" },
        { $set: { status: "pending" } }
      );
    }

    return res.json({
      message: `✅ Election status updated to ${status}.`,
      election,
    });
  } catch (err) {
    console.error("❌ Election status update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/elections/:id/announce", authenticateAdmin, async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    const { announcement } = req.body;
    if (!electionId) return res.status(400).json({ message: "⚠️ Invalid election id." });

    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ message: "❌ Election not found." });

    await syncVotingHistoryForElection(election._id);
    election.status = "announced";
    election.announcement = String(announcement || "Result announced.");
    await election.save();

    return res.json({ message: "✅ Result announced successfully.", election });
  } catch (err) {
    console.error("❌ Election announce error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/elections/:id/applications", authenticateAdmin, async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    if (!electionId) return res.status(400).json({ message: "⚠️ Invalid election id." });

    const applications = await CandidateApplication.find({ electionId })
      .populate("candidateId", "name email approvalStatus")
      .populate("positionId", "name")
      .sort({ createdAt: -1 });

    return res.json(applications);
  } catch (err) {
    console.error("❌ Application list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/admin/applications/:id", authenticateAdmin, async (req, res) => {
  try {
    const applicationId = sanitizeObjectId(req.params.id);
    const { status } = req.body;

    if (!applicationId) return res.status(400).json({ message: "⚠️ Invalid application id." });
    if (!["approved", "rejected", "pending"].includes(String(status))) {
      return res.status(400).json({ message: "⚠️ Invalid status." });
    }

    const application = await CandidateApplication.findById(applicationId);
    if (!application) return res.status(404).json({ message: "❌ Application not found." });

    const election = await Election.findById(application.electionId);
    if (!election) return res.status(404).json({ message: "❌ Election not found." });

    application.status = String(status);
    await application.save();

    const idValue = String(application.candidateId);
    const existingIds = (election.approvedCandidateIds || []).map((id) => String(id));

    if (status === "approved" && !existingIds.includes(idValue)) {
      election.approvedCandidateIds.push(application.candidateId);
      await election.save();
    }

    if (status !== "approved" && existingIds.includes(idValue)) {
      const hasOtherApprovedApplication = await CandidateApplication.exists({
        electionId: application.electionId,
        candidateId: application.candidateId,
        status: "approved",
        _id: { $ne: application._id },
      });

      if (!hasOtherApprovedApplication) {
        election.approvedCandidateIds = election.approvedCandidateIds.filter(
          (id) => String(id) !== idValue
        );
        await election.save();
      }
    }

    return res.json({ message: `✅ Application updated to ${status}.` });
  } catch (err) {
    console.error("❌ Application update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/elections/:id/results", authenticateAdmin, async (req, res) => {
  try {
    const electionId = sanitizeObjectId(req.params.id);
    if (!electionId) return res.status(400).json({ message: "⚠️ Invalid election id." });

    const results = await getElectionResults(electionId);
    if (!results) return res.status(404).json({ message: "❌ Election not found." });
    return res.json(results);
  } catch (err) {
    console.error("❌ Admin result error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/admin/clear-data", authenticateAdmin, async (req, res) => {
  try {
    const result = await Promise.all([
      Voter.deleteMany({}),
      Candidate.deleteMany({}),
      Vote.deleteMany({}),
      CandidateApplication.deleteMany({}),
    ]);

    return res.json({
      message: "✅ All voter, candidate, vote, and application data cleared successfully.",
      deletedVoters: result[0].deletedCount,
      deletedCandidates: result[1].deletedCount,
      deletedVotes: result[2].deletedCount,
      deletedApplications: result[3].deletedCount,
    });
  } catch (err) {
    console.error("❌ Clear data error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 Multi-Election Face Voting Backend is running ✅");
});

const forceFreePort = (port) => {
  try {
    if (process.platform === "win32") {
      execSync(
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do @taskkill /PID %a /F`,
        { stdio: "ignore" }
      );
    }
  } catch (err) {
    // Ignore if there is no process to kill.
  }
};

const startServer = (hasRetried = false) => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && !hasRetried) {
      console.warn(`⚠️ Port ${PORT} is busy. Releasing and retrying on same port...`);
      forceFreePort(PORT);
      startServer(true);
      return;
    }
    console.error("❌ Server startup error:", err);
  });
};

connectMongo()
  .then(() => startServer())
  .catch((err) => {
    console.error("❌ Fatal Mongo connection error:", err.message);
    process.exit(1);
  });
