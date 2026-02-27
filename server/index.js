const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

// ── Root: serve login page as the landing page ──
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "src", "login.html"));
});

// Serve frontend static files (disable auto-index so / goes to login)
app.use(express.static(path.join(__dirname, "..", "client", "src"), { index: false }));

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:rm123@localhost:5432/School_monitoring",
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ── Auto-create tables on startup ──
async function initDB() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(30) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Projects table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                student_name VARCHAR(100) NOT NULL,
                project_title VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("✔ Database tables ready");
    } catch (err) {
        console.error("Failed to initialize database:", err.message);
    }
}
// ══════════════════════════════════════
//  AUTH ENDPOINTS
// ══════════════════════════════════════

// REGISTER
app.post("/register", async (req, res) => {
    const { full_name, username, password } = req.body;

    if (!full_name || !username || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    try {
        // Check if username already exists
        const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Username already taken" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const result = await pool.query(
            "INSERT INTO users (full_name, username, password) VALUES ($1, $2, $3) RETURNING id, full_name, username, role",
            [full_name, username, hashedPassword]
        );

        res.status(201).json({
            message: "Account created successfully",
            user: result.rows[0],
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

// LOGIN
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Return user info (no password)
        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

// ══════════════════════════════════════
//  PROJECT ENDPOINTS
// ══════════════════════════════════════

// GET all projects
app.get("/projects", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM projects ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// ADD project
app.post("/add-project", async (req, res) => {
    const { student_name, project_title, status } = req.body;

    try {
        await pool.query(
            "INSERT INTO projects (student_name, project_title, status) VALUES ($1, $2, $3)",
            [student_name, project_title, status]
        );
        res.json({ message: "Project added successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE project
app.delete("/delete-project/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("DELETE FROM projects WHERE id = $1", [id]);
        res.json({ message: "Project deleted successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initDB();
});