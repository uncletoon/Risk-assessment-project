const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// Middleware
app.use(cors({ origin: process.env.WEB_ORIGIN || "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads (protected internally, static for dev if needed)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes matching API Specification
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/organizations", require("./src/routes/organizationRoutes"));
app.use("/api/assessments", require("./src/routes/assessmentRoutes"));
app.use("/api/mitigations", require("./src/routes/mitigationRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));
app.use("/api/admin", require("./src/routes/adminRoutes"));
app.use("/api/ai/advisor", require("./src/routes/advisorRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/employee", require("./src/routes/employeeRoutes"));
app.use("/api/risks", require("./src/routes/riskRoutes"));

// Compatibility endpoints
app.use("/api/v1/auth", require("./src/routes/authRoutes"));
app.use("/api/v1/risks", require("./src/routes/riskRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "ERIDSS API Engine is operational" });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    status: err.status || 500,
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ERIDSS Backend Server running on port ${PORT}`);
  });
}

module.exports = app;
