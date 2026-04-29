const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const schemaPath = path.join(__dirname, "schema.sql");
  try {
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schemaSql);
    console.log(
      "[database]: Migration completed successfully at " +
        new Date().toISOString(),
    );
  } catch (err) {
    console.error("[database]: Error during migration:", err);
  } finally {
    pool.end();
  }
}

runMigration();
