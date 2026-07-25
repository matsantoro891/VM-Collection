/* Resolve public Supabase config for local + Vercel + PWA offline cache.
   Never loads service_role. Values are public by design. */
(() => {
  const CACHE_KEY = "vmCollection.supabaseConfig.v1";

  function normalize(raw) {
    if (!raw || typeof raw !== "object") return null;
    const supabaseUrl = String(raw.supabaseUrl || raw.url || "").trim();
    const supabaseAnonKey = String(raw.supabaseAnonKey || raw.anonKey || raw.key || "").trim();
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return { supabaseUrl, supabaseAnonKey, source: raw.source || "unknown" };
  }

  function fromWindow() {
    return normalize(window.__VM_SUPABASE__);
  }

  function fromCache() {
    try {
      return normalize(JSON.parse(localStorage.getItem(CACHE_KEY) || "null"));
    } catch {
      return null;
    }
  }

  function saveCache(cfg) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        source: cfg.source,
        cachedAt: new Date().toISOString()
      }));
    } catch (_) { /* ignore quota */ }
  }

  async function fromApi() {
    try {
      const res = await fetch("/api/config", { credentials: "same-origin" });
      if (!res.ok) return null;
      const data = await res.json();
      return normalize({ ...data, source: data.source || "api/config" });
    } catch {
      return null;
    }
  }

  async function fromLocalOverride() {
    const host = String(location.hostname || "");
    if (!/^(localhost|127\.0\.0\.1)$/i.test(host)) return null;
    try {
      const res = await fetch("./config.local.js", { cache: "no-store" });
      if (!res.ok) return null;
      const text = await res.text();
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.text = text;
        document.head.appendChild(script);
        resolve();
      });
      return normalize(window.__VM_SUPABASE__);
    } catch {
      return null;
    }
  }

  async function loadSupabaseConfig() {
    const local = await fromLocalOverride();
    if (local) {
      saveCache(local);
      return local;
    }

    const embedded = fromWindow();
    if (embedded) {
      saveCache(embedded);
      return embedded;
    }

    const remote = await fromApi();
    if (remote) {
      window.__VM_SUPABASE__ = remote;
      saveCache(remote);
      return remote;
    }

    const cached = fromCache();
    if (cached) {
      window.__VM_SUPABASE__ = cached;
      return { ...cached, source: `${cached.source || "cache"}+localStorage` };
    }

    return null;
  }

  window.VMConfig = { loadSupabaseConfig, CACHE_KEY };
})();
