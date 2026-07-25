/* Central auth layer — email/password, session restore, no inactivity logout. */
(() => {
  const state = {
    authInitializing: true,
    loading: false,
    user: null,
    session: null,
    error: null,
    configError: null,
    ready: false
  };

  const listeners = new Set();
  let authSubscription = null;
  let visibilityBound = false;
  let refreshInFlight = null;

  function snapshot() {
    return { ...state };
  }

  function emit() {
    const current = snapshot();
    listeners.forEach((fn) => {
      try { fn(current); } catch (e) { console.error(e); }
    });
  }

  function setState(patch) {
    Object.assign(state, patch);
    emit();
  }

  function mapAuthError(error) {
    if (!error) return "Ocorreu um erro. Tente novamente.";
    const msg = String(error.message || error.error_description || "").toLowerCase();
    const status = error.status || error.code;

    if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("fetch")) {
      return "Falha de conexão. Verifique a internet e tente novamente.";
    }
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return "E-mail ou senha incorretos.";
    }
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.";
    }
    if (msg.includes("user already registered") || msg.includes("already been registered")) {
      return "Este e-mail já possui uma conta. Tente entrar.";
    }
    if (msg.includes("password") && (msg.includes("least") || msg.includes("weak") || msg.includes("short"))) {
      return "A senha não atende aos requisitos mínimos.";
    }
    if (msg.includes("invalid email") || msg.includes("unable to validate email") || status === 400 && msg.includes("email")) {
      return "Informe um e-mail válido.";
    }
    if (msg.includes("session") && (msg.includes("expired") || msg.includes("invalid") || msg.includes("refresh"))) {
      return "Sessão encerrada. Entre novamente.";
    }
    if (typeof location !== "undefined" && location.hostname === "localhost") {
      console.warn("[VMAuth]", error);
    }
    return "Não foi possível concluir a autenticação. Tente novamente.";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function applySession(session) {
    setState({
      session: session || null,
      user: session?.user || null,
      error: null
    });
  }

  async function safeGetSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function refreshSessionOnce() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const client = window.VMSupabase.getSupabase();
        const { data, error } = await client.auth.refreshSession();
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("refresh") && (msg.includes("invalid") || msg.includes("not found") || msg.includes("expired"))) {
            applySession(null);
            setState({ error: mapAuthError(error) });
            return null;
          }
          // Temporary network / server issues: keep existing session
          if (typeof location !== "undefined" && location.hostname === "localhost") {
            console.warn("[VMAuth] refresh adiato/ignorado:", error);
          }
          return state.session;
        }
        applySession(data.session || null);
        return data.session || null;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  function bindVisibilityRefresh() {
    if (visibilityBound) return;
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (!state.session || state.authInitializing) return;
      refreshSessionOnce().catch(() => {});
    });
    window.addEventListener("online", () => {
      if (!state.session || state.authInitializing) return;
      refreshSessionOnce().catch(() => {});
    });
  }

  async function initAuth() {
    setState({ authInitializing: true, ready: false, error: null, configError: null });
    try {
      const client = await window.VMSupabase.initSupabaseClient();
      const session = await safeGetSession(client);
      applySession(session);

      if (authSubscription) {
        authSubscription.subscription?.unsubscribe?.();
        authSubscription = null;
      }

      const { data } = client.auth.onAuthStateChange((event, nextSession) => {
        if (typeof location !== "undefined" && location.hostname === "localhost") {
          console.info("[VMAuth] event", event);
        }
        applySession(nextSession);
        if (event === "SIGNED_OUT") {
          setState({ error: null });
        }
        if (event === "PASSWORD_RECOVERY") {
          setState({ error: null });
          window.dispatchEvent(new CustomEvent("vm-password-recovery"));
        }
        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          setState({ error: null });
        }
      });
      authSubscription = data;
      bindVisibilityRefresh();
      setState({ authInitializing: false, ready: true });
      return snapshot();
    } catch (error) {
      const message = mapAuthError(error);
      const isConfig = String(error.message || "").includes("Configuração do Supabase");
      setState({
        authInitializing: false,
        ready: true,
        session: null,
        user: null,
        error: message,
        configError: isConfig ? message : null
      });
      return snapshot();
    }
  }

  async function signUp({ email, password, name }) {
    if (state.loading) return { ok: false, error: "Aguarde a solicitação em andamento." };
    if (!isValidEmail(email)) return { ok: false, error: "Informe um e-mail válido." };
    if (!password) return { ok: false, error: "Informe uma senha." };
    if (String(password).length < 6) return { ok: false, error: "A senha deve ter pelo menos 6 caracteres." };

    setState({ loading: true, error: null });
    try {
      const client = window.VMSupabase.getSupabase();
      const { data, error } = await client.auth.signUp({
        email: String(email).trim(),
        password,
        options: {
          data: { name: String(name || "").trim() },
          emailRedirectTo: `${location.origin}/`
        }
      });
      if (error) throw error;

      if (data.session) applySession(data.session);
      else if (data.user && !data.session) {
        setState({ loading: false });
        return {
          ok: true,
          needsEmailConfirmation: true,
          message: "Conta criada. Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada antes de entrar."
        };
      }

      setState({ loading: false });
      return { ok: true, needsEmailConfirmation: false };
    } catch (error) {
      const message = mapAuthError(error);
      setState({ loading: false, error: message });
      return { ok: false, error: message };
    }
  }

  async function signIn({ email, password }) {
    if (state.loading) return { ok: false, error: "Aguarde a solicitação em andamento." };
    if (!isValidEmail(email)) return { ok: false, error: "Informe um e-mail válido." };
    if (!password) return { ok: false, error: "Informe a senha." };

    setState({ loading: true, error: null });
    try {
      const client = window.VMSupabase.getSupabase();
      const { data, error } = await client.auth.signInWithPassword({
        email: String(email).trim(),
        password
      });
      if (error) throw error;
      applySession(data.session);
      setState({ loading: false });
      return { ok: true };
    } catch (error) {
      const message = mapAuthError(error);
      setState({ loading: false, error: message });
      return { ok: false, error: message };
    }
  }

  async function resetPassword(email) {
    if (state.loading) return { ok: false, error: "Aguarde a solicitação em andamento." };
    if (!isValidEmail(email)) return { ok: false, error: "Informe um e-mail válido." };

    setState({ loading: true, error: null });
    try {
      const client = window.VMSupabase.getSupabase();
      const { error } = await client.auth.resetPasswordForEmail(String(email).trim(), {
        redirectTo: `${location.origin}/`
      });
      if (error) throw error;
      setState({ loading: false });
      // Same message whether or not the email exists
      return {
        ok: true,
        message: "Se este e-mail estiver cadastrado, você receberá instruções para redefinir a senha."
      };
    } catch (error) {
      const message = mapAuthError(error);
      // Still avoid revealing account existence on generic failures when possible
      if (String(error.message || "").toLowerCase().includes("rate")) {
        setState({ loading: false, error: message });
        return { ok: false, error: message };
      }
      setState({ loading: false });
      return {
        ok: true,
        message: "Se este e-mail estiver cadastrado, você receberá instruções para redefinir a senha."
      };
    }
  }

  async function updatePassword(newPassword) {
    if (!newPassword) return { ok: false, error: "Informe a nova senha." };
    if (String(newPassword).length < 6) return { ok: false, error: "A senha deve ter pelo menos 6 caracteres." };
    setState({ loading: true, error: null });
    try {
      const client = window.VMSupabase.getSupabase();
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setState({ loading: false });
      return { ok: true, message: "Senha atualizada. Você já pode usar o aplicativo." };
    } catch (error) {
      const message = mapAuthError(error);
      setState({ loading: false, error: message });
      return { ok: false, error: message };
    }
  }

  async function signOut() {
    setState({ loading: true, error: null });
    try {
      const client = window.VMSupabase.getSupabase();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      applySession(null);
      setState({ loading: false });
      return { ok: true };
    } catch (error) {
      // Even on network failure, clear local session intent without wiping collection data
      applySession(null);
      const message = mapAuthError(error);
      setState({ loading: false, error: message });
      return { ok: true, warning: message };
    }
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(snapshot());
    return () => listeners.delete(fn);
  }

  function isAuthenticated() {
    return !state.authInitializing && !!state.session?.user;
  }

  window.VMAuth = {
    initAuth,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    subscribe,
    getState: snapshot,
    isAuthenticated,
    mapAuthError,
    isValidEmail
  };
})();
