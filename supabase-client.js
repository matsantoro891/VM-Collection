/* Single shared Supabase browser client. Do not create a new client per render. */
(() => {
  let client = null;
  let initPromise = null;

  function getCreateClient() {
    const api = window.supabase;
    if (!api?.createClient) {
      throw new Error("Biblioteca Supabase não carregada (vendor/supabase.umd.js).");
    }
    return api.createClient;
  }

  async function initSupabaseClient() {
    if (client) return client;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const cfg = await window.VMConfig.loadSupabaseConfig();
      if (!cfg) {
        throw new Error(
          "Configuração do Supabase ausente. Defina SUPABASE_URL e SUPABASE_ANON_KEY na Vercel, ou use config.local.js."
        );
      }

      const createClient = getCreateClient();
      client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: "vmCollection.supabase.auth",
          flowType: "pkce"
        }
      });
      return client;
    })();

    try {
      return await initPromise;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  }

  function getSupabase() {
    if (!client) {
      throw new Error("Cliente Supabase ainda não inicializado. Chame initSupabaseClient() antes.");
    }
    return client;
  }

  function resetSupabaseClientForTests() {
    client = null;
    initPromise = null;
  }

  window.VMSupabase = {
    initSupabaseClient,
    getSupabase,
    resetSupabaseClientForTests
  };
})();
