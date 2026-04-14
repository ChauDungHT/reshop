const fs = require('fs');
const path = require('path');
const db = require('../src/core/db');

async function runMigration() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schemaSql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    db.pool.end();
  }
}

runMigration();
