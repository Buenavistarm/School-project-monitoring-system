const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // KRITIKAL: Kailangan ito para sa Neon/Render connection
    }
});

module.exports = pool;