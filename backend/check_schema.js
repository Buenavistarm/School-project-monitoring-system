const pool = require('./db');
async function checkSchema() {
    try {
        const res = await pool.query("SELECT id, name, email, role, created_at FROM users LIMIT 1;");
        console.log(res.rows);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
}
checkSchema();
