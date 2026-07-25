const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const need = [
  "authGate",
  "authBootScreen",
  "logoutBtn",
  "authSignInForm",
  "authSignUpForm",
  "authRecoveryForm",
  "boot.js",
  "vendor/supabase.umd.js"
];
for (const id of need) {
  if (!html.includes(id)) {
    console.error("missing", id);
    process.exit(1);
  }
}

const sql = fs.readFileSync("supabase/migrations/20260725120000_init_auth_schema.sql", "utf8");
if (!sql.includes("to authenticated")) process.exit(2);
if (!sql.includes("user-media")) process.exit(2);

const sw = fs.readFileSync("sw.js", "utf8");
if (!sw.includes("supabase.co")) process.exit(3);

const app = fs.readFileSync("app.js", "utf8");
if (!app.includes("startVmCollectionApp")) process.exit(4);
if (/document\.addEventListener\(\s*["']DOMContentLoaded["']\s*,\s*initializePersistentApp\s*\)/.test(app)) {
  console.error("app still auto-starts on DOMContentLoaded");
  process.exit(5);
}

const files = [
  "auth.js",
  "sync.js",
  "boot.js",
  "auth-ui.js",
  "supabase-client.js",
  "config-loader.js",
  "api/config.js",
  "vendor/supabase.umd.js"
];
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error("MISSING", f);
    process.exit(6);
  }
}

console.log("structural checks passed");
