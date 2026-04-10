const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pool = require('./db/index');

const app = express();

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ---------------------- CORS CONFIGURATION ----------------------
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://school-project-monitoring-system.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'token']
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

const jwtGenerator = (user_id) => {
    const payload = { user: { id: user_id } };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};

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

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => { cb(null, 'uploads/'); },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 }
});

// ========== AUTH ROUTES ==========
app.post("/auth/register", async (req, res) => {
    try {
        const { name, email, password, role, subject } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length !== 0) return res.status(401).json("User already exists");

        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, subject) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role",
            [name, email, bcryptPassword, role || 'student', subject || null]
        );

        const token = jwtGenerator(newUser.rows[0].id);
        res.json({ token, user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json("Server Error");
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(401).json("Invalid Credentials");
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(401).json("Invalid Credentials");
        res.json({ token: jwtGenerator(user.rows[0].id), user: user.rows[0] });
    } catch (err) {
        res.status(500).json("Server Error");
    }
});

app.get("/auth/me", authorize, async (req, res) => {
    try {
        const user = await pool.query("SELECT id, name, email, role, class_section, subject FROM users WHERE id = $1", [req.user.id]);
        res.json(user.rows[0]);
    } catch (err) { res.status(500).send("Server Error"); }
});

// FIXED: PROFILE UPDATE ROUTE
app.put("/auth/me", authorize, async (req, res) => {
    try {
        const { class_section, subject } = req.body;
        await pool.query(
            "UPDATE users SET class_section = COALESCE($1, class_section), subject = COALESCE($2, subject) WHERE id = $3",
            [class_section, subject, req.user.id]
        );
        res.json("Profile updated");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ========== PROJECT ROUTES ==========
app.post("/projects", authorize, async (req, res) => {
    try {
        const { title, subject, start_date, deadline, assigned_members } = req.body;
        const newProject = await pool.query(
            `INSERT INTO projects 
            (title, student_id, status, subject, start_date, deadline, assigned_members, progress) 
            VALUES ($1, $2, 'pending', $3, $4, $5, $6, 'Not Started') RETURNING *`,
            [title, req.user.id, subject, start_date, deadline, assigned_members]
        );
        res.json(newProject.rows[0]);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get("/my-projects", authorize, async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT p.*, pg.grade, pg.feedback, t.name as teacher_name
            FROM projects p
            LEFT JOIN project_grades pg ON p.id = pg.project_id
            LEFT JOIN users t ON p.teacher_id = t.id
            WHERE p.student_id = $1 ORDER BY p.created_at DESC`, [req.user.id]);
        res.json(projects.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

// ========== TEACHER ROUTES ==========
app.get("/teacher/my-projects", authorize, async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT p.*, u.name as student_name, pg.grade, pg.feedback
            FROM projects p JOIN users u ON p.student_id = u.id
            LEFT JOIN project_grades pg ON p.id = pg.project_id
            WHERE p.teacher_id = $1 OR p.teacher_id IS NULL`, [req.user.id]);
        res.json(projects.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.post("/teacher/grade/:project_id", authorize, async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        await pool.query(`
            INSERT INTO project_grades (project_id, teacher_id, grade, feedback)
            VALUES ($1, $2, $3, $4) ON CONFLICT (project_id) 
            DO UPDATE SET grade = EXCLUDED.grade, feedback = EXCLUDED.feedback`,
            [req.params.project_id, req.user.id, grade, feedback]);
        await pool.query("UPDATE projects SET status = 'graded' WHERE id = $1", [req.params.project_id]);
        res.json("Graded");
    } catch (err) { res.status(500).send("Server Error"); }
});

// ========== ADMIN ROUTES ==========
app.get("/admin/projects", authorize, async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT p.*, u.name as student_name, t.name as teacher_name, t.subject as teacher_subject, pg.grade
            FROM projects p JOIN users u ON p.student_id = u.id
            LEFT JOIN users t ON p.teacher_id = t.id
            LEFT JOIN project_grades pg ON p.id = pg.project_id`);
        res.json(projects.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get("/admin/users", authorize, async (req, res) => {
    try {
        const users = await pool.query("SELECT * FROM users ORDER BY id DESC");
        res.json(users.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get("/admin/teachers", authorize, async (req, res) => {
    try {
        const resu = await pool.query("SELECT id, name, subject FROM users WHERE role = 'teacher'");
        res.json(resu.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.patch("/projects/:id/assign-teacher", authorize, async (req, res) => {
    try {
        await pool.query("UPDATE projects SET teacher_id = $1 WHERE id = $2", [req.body.teacher_id, req.params.id]);
        res.json("Assigned");
    } catch (err) { res.status(500).send("Server Error"); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));