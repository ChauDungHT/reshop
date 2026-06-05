const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
});

/**
 * Run the base schema (full reset — dev only).
 */
async function runSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schemaSql);
  console.log("[database]: Base schema applied at " + new Date().toISOString());
}

/**
 * Run a specific migration file from migrations/ directory.
 * Usage: node migrate.js --file 001_add_sub_orders.sql
 */
async function runMigrationFile(filename) {
  const migrationsDir = path.join(__dirname, "migrations");
  const filePath = path.join(migrationsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`[database]: Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, "utf8");
  console.log(`[database]: Running migration: ${filename}`);
  await pool.query(sql);
  console.log(`[database]: Migration "${filename}" completed at ` + new Date().toISOString());
}

/**
 * Run all migration files in migrations/ directory in order.
 */
async function runAllMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("[database]: No migrations directory found, skipping.");
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await runMigrationFile(file);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fileFlag = args.indexOf("--file");
  const schemaOnly = args.includes("--schema");

  try {
    if (fileFlag !== -1) {
      // node migrate.js --file 001_add_sub_orders.sql
      const filename = args[fileFlag + 1];
      if (!filename) {
        console.error("[database]: --file requires a filename argument");
        process.exit(1);
      }
      await runMigrationFile(filename);
    } else if (schemaOnly) {
      // node migrate.js --schema
      await runSchema();
    } else {
      // Default: run base schema (legacy behaviour)
      await runSchema();
    }
  } catch (err) {
    console.error("[database]: Error during migration:", err);
    process.exit(1);
  } finally {
    pool.end();
  }
}

main();
