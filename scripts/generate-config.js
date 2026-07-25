/**
 * Generates config.generated.js at deploy/build time from Vercel (or local) env vars.
 * Public values only — never service_role or DB passwords.
 *
 * Vercel: set Build Command to `node scripts/generate-config.js` (see vercel.json)
 * and Environment Variables SUPABASE_URL + SUPABASE_ANON_KEY.
 */
const fs = require("fs");
const path = require("path");

const url = process.env.SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.VITE_SUPABASE_URL
  || "";
const anonKey = process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || "";

const payload = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  generatedAt: new Date().toISOString(),
  source: "scripts/generate-config.js"
};

const out = path.join(__dirname, "..", "config.generated.js");
const body = `/* Auto-generated — do not put secrets here. Safe for the browser. */\n`
  + `window.__VM_SUPABASE__ = ${JSON.stringify(payload, null, 2)};\n`;

fs.writeFileSync(out, body, "utf8");
console.log(
  url && anonKey
    ? `[generate-config] Wrote ${out} with Supabase URL configured.`
    : `[generate-config] Wrote ${out} with EMPTY values. Set SUPABASE_URL and SUPABASE_ANON_KEY on Vercel.`
);
