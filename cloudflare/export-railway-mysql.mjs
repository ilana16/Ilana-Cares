/**
 * Export Ilana Care MySQL data as D1-compatible SQLite INSERT statements.
 * READ-ONLY on MySQL. Requires an existing, authorized DATABASE_URL or MYSQL_PUBLIC_URL.
 * Run locally from repository root (never commit the generated SQL file).
 *
 *   DATABASE_URL="$MYSQL_PUBLIC_URL" node cloudflare/export-railway-mysql.mjs
 *
 * Then securely import the output using wrangler:
 *   npx wrangler d1 execute ilana-cares-staging --remote --file=cloudflare/railway-data.private.sql
 *
 * IMPORTANT:
 *  - The D1 destination schema must exist first (cloudflare/schema.sql).
 *  - This is a point-in-time copy. Reconcile new Railway writes before cutover.
 *  - The generated SQL contains private client data. Store securely, never commit it.
 */
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";

const tables = ["users", "bookings", "contacts", "reviews"];
const output = path.resolve("cloudflare/railway-data.private.sql");
const uri = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
if (!uri) {
  console.error("No MySQL connection URL found. Set DATABASE_URL or MYSQL_PUBLIC_URL in your own terminal.");
  process.exit(1);
}
if (fs.existsSync(output)) {
  console.error("Refusing to overwrite an existing private export: " + output);
  process.exit(1);
}
const u = new URL(uri);
if (u.protocol !== "mysql:") throw new Error("Expected mysql:// connection URL");
const db = await mysql.createConnection({host:u.hostname, port:Number(u.port || 3306), user:decodeURIComponent(u.username), password:decodeURIComponent(u.password), database:decodeURIComponent(u.pathname.slice(1)), timezone:"Z", dateStrings:true, supportBigNumbers:true, bigNumberStrings:true});
const quoteIdentifier = x => "\"" + x.replaceAll("\"", "\"\"") + "\"";
const sqlValue = x => {
  if (x === null || x === undefined) return "NULL";
  if (typeof x === "number" && Number.isFinite(x)) return String(x);
  if (typeof x === "bigint") return String(x);
  if (typeof x === "boolean") return x ? "1" : "0";
  const v = x instanceof Date ? x.toISOString().replace("T", " ").replace("Z", "") : String(x);
  return "'" + v.replaceAll("'", "''").replaceAll("\u0000", "") + "'";
};
let fd;
try {
  await db.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await db.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
  fd = fs.openSync(output, "wx", 0o600);
  fs.writeSync(fd, "-- PRIVATE customer data; do not commit to GitHub.\nPRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n");
  for (const table of tables) {
    const [rows] = await db.query("SELECT * FROM " + "`" + table + "`");
    for (const row of rows) {
      const cols = Object.keys(row);
      if (!cols.length) continue;
      fs.writeSync(fd, "INSERT INTO " + quoteIdentifier(table) + " (" + cols.map(quoteIdentifier).join(", ") + ") VALUES (" + cols.map(c => sqlValue(row[c])).join(", ") + ");\n");
    }
    console.log(table + ": " + rows.length + " records exported");
  }
  fs.writeSync(fd, "COMMIT;\n");
  await db.query("COMMIT");
  console.log("Secure export created: " + output);
} catch (e) {
  try { await db.query("ROLLBACK"); } catch {}
  if (fd !== undefined) { fs.closeSync(fd); fd = undefined; }
  try { fs.unlinkSync(output); } catch {}
  console.error("Export failed: " + e.message);
  process.exitCode = 1;
} finally {
  if (fd !== undefined) fs.closeSync(fd);
  await db.end();
}
