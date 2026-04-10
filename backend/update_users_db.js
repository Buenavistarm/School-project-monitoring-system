const pool = require('./db');

async function updateUsersDb() {
    try {
        console.log("Updating users schema...");
        
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS class_section VARCHAR(255);");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subject VARCHAR(255);");

        console.log("Users schema updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating users schema:", err);
        process.exit(1);
    }
}

updateUsersDb();
