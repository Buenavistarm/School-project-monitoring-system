const pool = require('./db');

async function updateDb() {
    try {
        console.log("Updating database schema...");
        
        // Add new columns to projects table
        const alterQueries = [
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS objectives TEXT;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget VARCHAR(255);",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline DATE;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS milestones TEXT;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_members TEXT;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS expenses VARCHAR(255);",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS materials_used TEXT;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS remarks TEXT;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress TEXT DEFAULT 'Not Started';"
        ];

        for (const query of alterQueries) {
            await pool.query(query);
            console.log(`Executed: ${query}`);
        }

        console.log("Database schema updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating database schema:", err);
        process.exit(1);
    }
}

updateDb();
