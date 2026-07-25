/**
 * Runtime config endpoint for Vercel.
 * Exposes only public Supabase URL + anon/publishable key.
 * Also used when config.generated.js was built without env vars.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      error: "missing_config",
      message: "Defina SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel."
    }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    supabaseUrl,
    supabaseAnonKey,
    source: "api/config"
  }));
};
