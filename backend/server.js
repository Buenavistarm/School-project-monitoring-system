const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// IMPORT DATABASE - Siguraduhin na tama ang filename (db.js o db/index.js)
// Kung ang file mo ay db.js sa root folder, gamitin ang: require('./db')
const pool = require('./db/index');

const app = express();

// Siguraduhin na exist ang uploads folder
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ---------------------- CORS CONFIGURATION ----------------------
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://school-project-monitoring-system.vercel.app' // SIGURADUHIN NA WALANG '/' SA DULO
];

app.use(cors({
    origin: function (origin, callback) {
        // Payagan ang requests na walang origin (gaya ng Postman o mobile tools)
        // O kung ang origin ay kasama sa allowedOrigins list
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("CORS Blocked Origin:", origin); // Para makita mo sa Render Logs kung anong URL ang nablock
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'token'] // Importante para sa JWT token mo
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ---------------------- JWT GENERATOR ----------------------
const jwtGenerator = (user_id) => {
    const payload = { user: { id: user_id } };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};

// ---------------------- MIDDLEWARE: AUTHORIZE ----------------------
const authorize = (req, res, next) => {
    const token = req.header("token");
    if (!token) return res.status(403).json("Access Denied");
    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verify.user;
        next();
    } catch (err) {
        res.status(401).json("Token Invalid");
    }
};

// ---------------------- MULTER (FILE UPLOAD) ----------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ==========================================
// AUTH ROUTES
// ==========================================

app.post("/auth/register", async (req, res) => {
    try {
        const { name, email, password, role, subject } = req.body;

        // 1. Check if user exists
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length !== 0) return res.status(401).json("User already exists");

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Insert user
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, subject) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role",
            [name, email, bcryptPassword, role || 'student', subject || null]
        );

        // 4. Generate Token
        const token = jwtGenerator(newUser.rows[0].id);
        res.json({ token, user: newUser.rows[0] });

    } catch (err) {
        console.error("Register error:", err.message);
        res.status(500).json("Server Error during registration");
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) return res.status(401).json("Invalid Credentials");

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(401).json("Invalid Credentials");

        const token = jwtGenerator(user.rows[0].id);
        res.json({
            token,
            user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role }
        });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json("Server Error during login");
    }
});

app.get("/auth/me", authorize, async (req, res) => {
    try {
        const user = await pool.query("SELECT id, name, email, role, class_section, subject FROM users WHERE id = $1", [req.user.id]);
        res.json(user.rows[0]);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// ==========================================
// PROJECT ROUTES
// ==========================================

app.post("/projects", authorize, async (req, res) => {
    try {
        const { title, description, subject, objectives, budget, start_date, deadline, assigned_members, teacher_id } = req.body;
        const newProject = await pool.query(
            `INSERT INTO projects 
                (title, description, student_id, teacher_id, status, subject, objectives, budget, start_date, deadline, assigned_members, progress) 
             VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, 'Not Started') 
             RETURNING *`,
            [title, description, req.user.id, teacher_id || null, subject, objectives, budget, start_date, deadline, assigned_members]
        );
        res.json(newProject.rows[0]);
    } catch (err) {
        console.error("Create project error:", err);
        res.status(500).send("Server Error");
    }
});

app.get("/my-projects", authorize, async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT p.*, pg.grade, pg.feedback, t.name as teacher_name
            FROM projects p
            LEFT JOIN project_grades pg ON p.id = pg.project_id
            LEFT JOIN users t ON p.teacher_id = t.id
            WHERE p.student_id = $1
            ORDER BY p.created_at DESC
        `, [req.user.id]);
        res.json(projects.rows);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

app.post("/teacher/grade/:project_id", authorize, async (req, res) => {
    try {
        const { project_id } = req.params;
        const { grade, feedback } = req.body;
        await pool.query(`
            INSERT INTO project_grades (project_id, teacher_id, grade, feedback, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (project_id) 
            DO UPDATE SET grade = EXCLUDED.grade, feedback = EXCLUDED.feedback, updated_at = NOW()
        `, [project_id, req.user.id, grade, feedback]);
        await pool.query("UPDATE projects SET status = 'graded' WHERE id = $1", [project_id]);
        res.json("Graded Successfully");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get("/teachers", authorize, async (req, res) => {
    try {
        const teachers = await pool.query("SELECT id, name, subject FROM users WHERE role = 'teacher'");
        res.json(teachers.rows);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

app.patch("/projects/:id/assign-teacher", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { teacher_id } = req.body;
        await pool.query("UPDATE projects SET teacher_id = $1 WHERE id = $2", [teacher_id, id]);
        res.json("Teacher Assigned");
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

app.get("/admin/users", authorize, async (req, res) => {
    try {
        const users = await pool.query("SELECT id, name, email, role, class_section, subject FROM users ORDER BY id DESC");
        res.json(users.rows);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

app.get("/admin/projects", authorize, async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT p.*, u.name as student_name, t.name as teacher_name, t.subject as teacher_subject, pg.grade
            FROM projects p
            JOIN users u ON p.student_id = u.id
            LEFT JOIN users t ON p.teacher_id = t.id
            LEFT JOIN project_grades pg ON p.id = pg.project_id
            ORDER BY p.created_at DESC
        `);
        res.json(projects.rows);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// TEST DATABASE CONNECTION
app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});