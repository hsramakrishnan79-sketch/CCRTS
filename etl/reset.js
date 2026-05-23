/**
 * Demo Reset Script
 * Wipes all ETL-imported complaints (CMP-016+) and re-runs the full pipeline
 * so active complaints have fresh timestamps relative to now.
 *
 * Run: node etl/reset.js
 */

const { execSync } = require("child_process");
const db = require("../backend/config/db");

const run = (cmd) => execSync(cmd, { stdio: "inherit", cwd: require("path").join(__dirname, "..") });

console.log("\n── RESET: Removing ETL-imported data ────────────────────────");

db.exec("BEGIN TRANSACTION");
try {
  const etlIds = db.prepare(
    "SELECT complaint_id FROM complaints WHERE complaint_id >= 'CMP-016'"
  ).all().map((r) => `'${r.complaint_id}'`).join(",");

  if (etlIds.length > 0) {
    db.exec(`DELETE FROM notifications           WHERE complaint_id IN (${etlIds})`);
    db.exec(`DELETE FROM cross_category_assignments WHERE complaint_id IN (${etlIds})`);
    db.exec(`DELETE FROM feedback                WHERE complaint_id IN (${etlIds})`);
    db.exec(`DELETE FROM attachments             WHERE complaint_id IN (${etlIds})`);
    db.exec(`DELETE FROM complaint_history       WHERE complaint_id IN (${etlIds})`);
    db.exec(`DELETE FROM complaints              WHERE complaint_id IN (${etlIds})`);
    console.log(`  Deleted ${etlIds.split(",").length} ETL complaints and related records`);
  } else {
    console.log("  No ETL complaints found — DB is clean");
  }

  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Reset failed, rolled back:", err.message);
  process.exit(1);
}

console.log("\n── Regenerating dataset ──────────────────────────────────────");
run("node etl/generate_dataset.js");

console.log("\n── Importing fresh data ──────────────────────────────────────");
run("node etl/etl_import.js");

console.log("\n── Refreshing reporting tables ───────────────────────────────");
run("node etl/etl_refresh_reports.js");

console.log("\n✅ Demo reset complete. Active complaints have fresh timestamps.\n");
