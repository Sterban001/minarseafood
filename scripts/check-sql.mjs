/**
 * Parses every SQL file with the real PostgreSQL grammar, including PL/pgSQL
 * function bodies, so syntax mistakes surface here instead of halfway through a
 * migration against the live database.
 *
 * Run with: node scripts/check-sql.mjs
 */
import { readFileSync, globSync } from "node:fs";
import pg from "libpg-query";

const { parse, parsePlPgSQL, loadModule } = pg;
await loadModule();

const files = globSync("supabase/**/*.sql").sort();
let failed = 0;

for (const file of files) {
  const sql = readFileSync(file, "utf8");

  try {
    await parse(sql);
    console.log(`ok       ${file}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL     ${file}\n         ${error.message}`);
  }

  try {
    await parsePlPgSQL(sql);
    console.log(`ok plpg  ${file}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL plpg ${file}\n         ${error.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} problem(s) found.`);
  process.exit(1);
}
console.log("\nAll SQL parsed cleanly.");
