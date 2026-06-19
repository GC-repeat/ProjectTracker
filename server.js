const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require('dotenv').config();
const app = express();
const PORT = 80;

// Validate that PASSWORD is set in .env
if (!process.env.PASSWORD) {
    console.error("ERROR: PASSWORD is not set in .env file. Server aborted.");
    process.exit(1);
}
const DATA_FILE = path.join(__dirname, "projects.json");
const PROJECT_DIR = path.join(__dirname, "project");

// Ensure project directory exists
if (!fs.existsSync(PROJECT_DIR)) {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
// Serve static files (but don't auto-serve index.html for /)
app.use(express.static(path.join(__dirname), { index: false }));

// Redirect / to the login page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// Password verification endpoint
app.post("/api/auth", (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ success: false, error: "No password provided" });
    }

    // Constant-time comparison to prevent timing attacks
    const expected = Buffer.from(process.env.PASSWORD);
    const received = Buffer.from(password);
    const match =
        expected.length === received.length &&
        crypto.timingSafeEqual(expected, received);

    if (match) {
        res.json({ success: true });
    } else {
        // Small random delay (100–300ms) to slow brute-force attempts
        const delay = 100 + Math.floor(Math.random() * 200);
        setTimeout(() => {
            res.status(401).json({ success: false, error: "Invalid password" });
        }, delay);
    }
});

// Helper to get individual project filename
function getProjectFilename(project) {
    const safeTitle = project.title
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 50);
    
    return `${project.id}_${safeTitle}.json`;
}

// Helper to save individual project file
function saveIndividualProject(project) {
    try {
        const filename = getProjectFilename(project);
        const filePath = path.join(PROJECT_DIR, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
        console.log(`✓ Saved individual project: ${filename}`);
    } catch (err) {
        console.error("Error saving individual project:", err);
    }
}

// Helper to delete individual project file by ID
function deleteIndividualProjectById(projectId) {
    try {
        // Look for files with this ID
        const files = fs.readdirSync(PROJECT_DIR)
            .filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            // Extract ID from filename (format: ID_Title.json)
            const match = file.match(/^(\d+)_/);
            if (match && parseInt(match[1]) === projectId) {
                const filePath = path.join(PROJECT_DIR, file);
                fs.unlinkSync(filePath);
                console.log(`✓ Deleted individual project file: ${file}`);
                return true;
            }
        }
        console.log(`No individual file found for project ID: ${projectId}`);
        return false;
    } catch (err) {
        console.error("Error deleting project file:", err);
        return false;
    }
}

// Load projects from individual files (more up-to-date than projects.json)
app.get("/api/projects", (req, res) => {
    try {
        const files = fs.readdirSync(PROJECT_DIR).filter(f => f.endsWith('.json'));
        const projects = files.map(file => {
            return JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, file), "utf-8"));
        });
        // Sort by order field (drag & drop), fallback to id
        projects.sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
        res.json(projects);
    } catch (err) {
        // Fallback to projects.json
        if (fs.existsSync(DATA_FILE)) {
            res.json(JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")));
        } else {
            res.json([]);
        }
    }
});

// Save projects to the JSON file AND handle deletions
app.post("/api/projects", (req, res) => {
    const newProjects = req.body;

    // Determine which projects currently exist on disk by reading the
    // individual project files directly (the source of truth used by
    // GET /api/projects), instead of relying on projects.json, which can
    // be stale or out of sync.
    let existingIds = [];
    try {
        const files = fs.readdirSync(PROJECT_DIR).filter(f => f.endsWith('.json'));
        existingIds = files
            .map(f => {
                const match = f.match(/^(\d+)_/);
                return match ? parseInt(match[1]) : null;
            })
            .filter(id => id !== null);
    } catch (err) {
        console.error("Error reading project directory for diff:", err);
    }

    const newIds = newProjects.map(p => p.id);
    const deletedIds = existingIds.filter(id => !newIds.includes(id));
    deletedIds.forEach(id => deleteIndividualProjectById(id));

    // Update projects.json for the list of IDs (NOT the time data)
    fs.writeFileSync(DATA_FILE, JSON.stringify(newProjects, null, 2));

    // DO NOT call saveIndividualProject() here anymore
    res.json({ status: "ok" });
});

// Save a single project file
app.post("/api/project/:id", (req, res) => {
    const project = req.body;
    try {
        saveIndividualProject(project);
        res.json({ status: "ok" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save project" });
    }
});

// Optional: Direct delete endpoint
app.delete("/api/project/:id", (req, res) => {
    const projectId = parseInt(req.params.id);
    
    if (deleteIndividualProjectById(projectId)) {
        res.json({ status: "ok", message: "Project file deleted" });
    } else {
        res.status(404).json({ error: "Project file not found" });
    }
});

// Clean up orphaned files (optional endpoint)
app.post("/api/projects/cleanup", (req, res) => {
    try {
        let existingProjects = [];
        if (fs.existsSync(DATA_FILE)) {
            existingProjects = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        }
        
        const existingIds = existingProjects.map(p => p.id);
        const files = fs.readdirSync(PROJECT_DIR)
            .filter(f => f.endsWith('.json'));
        
        let deletedCount = 0;
        files.forEach(file => {
            const match = file.match(/^(\d+)_/);
            if (match) {
                const fileId = parseInt(match[1]);
                if (!existingIds.includes(fileId)) {
                    const filePath = path.join(PROJECT_DIR, file);
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up orphaned file: ${file}`);
                    deletedCount++;
                }
            }
        });
        
        res.json({ status: "ok", deleted: deletedCount });
    } catch (err) {
        console.error("Error during cleanup:", err);
        res.status(500).json({ error: "Cleanup failed" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Individual project files stored in: ${PROJECT_DIR}`);
    
    // Perform initial cleanup on startup
    try {
        let existingProjects = [];
        if (fs.existsSync(DATA_FILE)) {
            existingProjects = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        }
        
        const existingIds = existingProjects.map(p => p.id);
        const files = fs.readdirSync(PROJECT_DIR)
            .filter(f => f.endsWith('.json'));
        
        let orphanedCount = 0;
        files.forEach(file => {
            const match = file.match(/^(\d+)_/);
            if (match) {
                const fileId = parseInt(match[1]);
                if (!existingIds.includes(fileId)) {
                    orphanedCount++;
                }
            }
        });
        
        if (orphanedCount > 0) {
            console.log(`Found ${orphanedCount} orphaned project files. Run POST /api/projects/cleanup to remove them.`);
        }
    } catch (err) {
        console.error("Error checking for orphaned files:", err);
    }
});