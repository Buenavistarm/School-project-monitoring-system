const pool = require('./db');
async function checkUsers() {
    try {
        const users = await pool.query("SELECT * FROM users;");
        console.log(users.rows);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
checkUsers();
