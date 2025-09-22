const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 80;
const DATA_FILE = path.join(__dirname, "projects.json");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname))); // sert index.html, CSS, JS

// Load projects from the JSON file
app.get("/api/projects", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")));
  } else {
    res.json([]);
  }
});

// Save projects to the JSON file
app.post("/api/projects", (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
  res.json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});