/**
 * Optional helper to refresh vendor/supabase.umd.js when Node + network are available.
 * Runtime PWA uses the committed file — no CDN at open time.
 */
const fs = require("fs");
const https = require("https");
const path = require("path");

const VERSION = "2.50.0";
const URL = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${VERSION}/dist/umd/supabase.js`;
const outPath = path.join(__dirname, "..", "vendor", "supabase.umd.js");
const versionPath = path.join(__dirname, "..", "vendor", "VERSION.txt");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

(async () => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buf = await get(URL);
  fs.writeFileSync(outPath, buf);
  fs.writeFileSync(
    versionPath,
    `@supabase/supabase-js@${VERSION}\nSource: ${URL}\nBundled locally for PWA offline use.\n`
  );
  console.log(`Saved ${outPath} (${buf.length} bytes)`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
