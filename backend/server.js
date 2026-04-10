const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.use(cors());
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

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ========== AUTH ==========
app.post("/auth/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length !== 0) return res.status(401).send("User already exists");
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, bcryptPassword, role || 'student']
        );
        const token = jwtGenerator(newUser.rows[0].id);
        res.json({ token, user: newUser.rows[0] });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(401).send("Invalid Credentials");
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(401).send("Invalid Credentials");
        const token = jwtGenerator(user.rows[0].id);
        res.json({
            token,
            user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role }
        });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get("/auth/me", authorize, async (req, res) => {
    try {
        const user = await pool.query("SELECT id, name, email, role, class_section, subject FROM users WHERE id = $1", [req.user.id]);
        res.json(user.rows[0]);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.put("/auth/me", authorize, async (req, res) => {
    try {
        const { class_section, subject } = req.body;
        await pool.query(
            "UPDATE users SET class_section = COALESCE($1, class_section), subject = COALESCE($2, subject) WHERE id = $3",
            [class_section, subject, req.user.id]
        );
        res.json("Profile updated");
    } catch (err) { res.status(500).send("Server Error"); }
});

// ========== STUDENT ==========
app.post("/projects", authorize, async (req, res) => {
    try {
        const { title, description, subject, objectives, budget, start_date, deadline, assigned_members } = req.body;
        // Auto-assign teacher based on subject
        let teacher_id = null;
        if (subject) {
            const teacher = await pool.query(
                `SELECT id FROM users WHERE role = 'teacher' AND LOWER(subject) = LOWER($1) LIMIT 1`,
                [subject]
            );
            if (teacher.rows.length) teacher_id = teacher.rows[0].id;
        }
        const newProject = await pool.query(
            `INSERT INTO projects 
                (title, description, student_id, teacher_id, status, subject, objectives, budget, start_date, deadline, assigned_members, progress) 
             VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, 'Not Started') 
             RETURNING *`,
            [title, description, req.user.id, teacher_id, subject, objectives, budget, start_date, deadline, assigned_members]
        );
        res.json(newProject.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.put("/projects/:id", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { tasks, progress, expenses, materials_used, remarks, status, milestones } = req.body;
        await pool.query(
            `UPDATE projects SET 
                tasks = COALESCE($1, tasks),
                progress = COALESCE($2, progress),
                expenses = COALESCE($3, expenses),
                materials_used = COALESCE($4, materials_used),
                remarks = COALESCE($5, remarks),
                status = COALESCE($6, status),
                milestones = COALESCE($7, milestones)
            WHERE id = $8`,
            [tasks ? JSON.stringify(tasks) : null, progress, expenses, materials_used, remarks, status, milestones, id]
        );
        res.json("Project updated");
    } catch (err) { res.status(500).send("Server Error"); }
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
    } catch (err) { res.status(500).send("Server Error"); }
});

app.post("/projects/:id/upload", authorize, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const fileUrl = `/uploads/${req.file.filename}`;
        await pool.query("UPDATE projects SET file_url = $1 WHERE id = $2 AND student_id = $3", [fileUrl, id, req.user.id]);
        res.json({ fileUrl });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.patch("/projects/:id/submit", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE projects SET status = 'submitted', submitted_at = NOW() WHERE id = $1 AND student_id = $2", [id, req.user.id]);
        res.json("Submitted");
    } catch (err) { res.status(500).send("Server Error"); }
});

// Student resubmits after revision
app.patch("/projects/:id/resubmit", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            "UPDATE projects SET status = 'submitted', submitted_at = NOW(), revision_feedback = NULL WHERE id = $1 AND student_id = $2",
            [id, req.user.id]
        );
        res.json("Project resubmitted successfully");
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// Teacher requests revision with feedback
app.patch("/projects/:id/request-revision", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { revision_feedback } = req.body;
        await pool.query(
            "UPDATE projects SET status = 'needs revision', revision_feedback = $1 WHERE id = $2",
            [revision_feedback, id]
        );
        res.json("Revision requested");
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// ========== TEACHER ==========
app.get("/teacher/my-projects", authorize, async (req, res) => {
    try {
        const userRole = await pool.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
        if (userRole.rows[0].role !== 'teacher') return res.status(403).json("Access denied");
        const projects = await pool.query(`
            SELECT p.*, u.name as student_name, u.email as student_email,
                   pg.grade, pg.feedback
            FROM projects p
            JOIN users u ON p.student_id = u.id
            LEFT JOIN project_grades pg ON p.id = pg.project_id
            WHERE p.teacher_id = $1
            ORDER BY p.submitted_at DESC NULLS LAST
        `, [req.user.id]);
        res.json(projects.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.post("/teacher/grade/:project_id", authorize, async (req, res) => {
    try {
        const { project_id } = req.params;
        const { grade, feedback } = req.body;
        const finalGrade = grade.toString().substring(0, 5);
        await pool.query(`
            INSERT INTO project_grades (project_id, teacher_id, grade, feedback, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (project_id) 
            DO UPDATE SET grade = EXCLUDED.grade, feedback = EXCLUDED.feedback, updated_at = NOW()
        `, [project_id, req.user.id, finalGrade, feedback]);
        await pool.query("UPDATE projects SET status = 'graded' WHERE id = $1", [project_id]);
        res.json("Graded Successfully");
    } catch (err) { res.status(500).send(err.message); }
});

app.patch("/projects/:id/assign-teacher", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { teacher_id } = req.body;
        await pool.query("UPDATE projects SET teacher_id = $1 WHERE id = $2", [teacher_id, id]);
        res.json("Teacher Assigned");
    } catch (err) { res.status(500).send("Server Error"); }
});

// ========== ADMIN ==========
app.get("/admin/users", authorize, async (req, res) => {
    try {
        const users = await pool.query("SELECT id, name, email, role, class_section, subject FROM users ORDER BY id DESC");
        res.json(users.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get("/admin/teachers", authorize, async (req, res) => {
    try {
        const teachers = await pool.query("SELECT id, name, subject FROM users WHERE role = 'teacher' ORDER BY name");
        res.json(teachers.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get("/admin/projects", authorize, async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT 
                p.*, 
                u.name as student_name, 
                t.name as teacher_name, 
                t.subject as teacher_subject,
                pg.grade
            FROM projects p
            JOIN users u ON p.student_id = u.id
            LEFT JOIN users t ON p.teacher_id = t.id
            LEFT JOIN project_grades pg ON p.id = pg.project_id
            ORDER BY p.created_at DESC
        `);
        res.json(projects.rows);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.put("/admin/projects/:id/assign-teacher", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { teacher_id } = req.body;
        await pool.query("UPDATE projects SET teacher_id = $1 WHERE id = $2", [teacher_id, id]);
        res.json({ message: "Teacher reassigned successfully" });
    } catch (err) { res.status(500).send("Server Error"); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });