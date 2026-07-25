/* Auth screens UI — matches VM Life ARCHIVE visual identity. */
(() => {
  let mounted = false;
  let showPassword = false;
  let mode = "signin"; // signin | signup | recovery | updatePassword

  function $(id) {
    return document.getElementById(id);
  }

  function setMode(next) {
    mode = next;
    const signin = $("authSignInPanel");
    const signup = $("authSignUpPanel");
    const recovery = $("authRecoveryPanel");
    const update = $("authUpdatePasswordPanel");
    if (signin) signin.hidden = mode !== "signin";
    if (signup) signup.hidden = mode !== "signup";
    if (recovery) recovery.hidden = mode !== "recovery";
    if (update) update.hidden = mode !== "updatePassword";
    clearMessages();
  }

  function clearMessages() {
    ["authSignInError", "authSignUpError", "authRecoveryError", "authUpdatePasswordError",
      "authSignInInfo", "authSignUpInfo", "authRecoveryInfo", "authUpdatePasswordInfo"].forEach((id) => {
      const el = $(id);
      if (el) el.textContent = "";
    });
  }

  function setError(id, message) {
    const el = $(id);
    if (el) el.textContent = message || "";
  }

  function setInfo(id, message) {
    const el = $(id);
    if (el) el.textContent = message || "";
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = !!busy;
    button.classList.toggle("is-loading", !!busy);
  }

  function syncPasswordVisibility() {
    const type = showPassword ? "text" : "password";
    ["authSignInPassword", "authSignUpPassword", "authSignUpPasswordConfirm", "authNewPassword", "authNewPasswordConfirm"]
      .forEach((id) => { if ($(id)) $(id).type = type; });
    document.querySelectorAll("[data-auth-toggle-password]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(showPassword));
      btn.textContent = showPassword ? "Ocultar" : "Mostrar";
    });
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const email = $("authSignInEmail")?.value.trim() || "";
    const password = $("authSignInPassword")?.value || "";
    const btn = $("authSignInSubmit");
    clearMessages();
    setBusy(btn, true);
    const result = await window.VMAuth.signIn({ email, password });
    setBusy(btn, false);
    if (!result.ok) setError("authSignInError", result.error);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    const name = $("authSignUpName")?.value.trim() || "";
    const email = $("authSignUpEmail")?.value.trim() || "";
    const password = $("authSignUpPassword")?.value || "";
    const confirm = $("authSignUpPasswordConfirm")?.value || "";
    const btn = $("authSignUpSubmit");
    clearMessages();

    if (!window.VMAuth.isValidEmail(email)) {
      setError("authSignUpError", "Informe um e-mail válido.");
      return;
    }
    if (!password) {
      setError("authSignUpError", "Informe uma senha.");
      return;
    }
    if (password !== confirm) {
      setError("authSignUpError", "A confirmação da senha não confere.");
      return;
    }

    setBusy(btn, true);
    const result = await window.VMAuth.signUp({ email, password, name });
    setBusy(btn, false);
    if (!result.ok) {
      setError("authSignUpError", result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setInfo("authSignUpInfo", result.message);
      setMode("signin");
      setInfo("authSignInInfo", result.message);
      return;
    }
    if (name) await window.VMSync.ensureProfileRow(name);
  }

  async function handleRecovery(e) {
    e.preventDefault();
    const email = $("authRecoveryEmail")?.value.trim() || "";
    const btn = $("authRecoverySubmit");
    clearMessages();
    setBusy(btn, true);
    const result = await window.VMAuth.resetPassword(email);
    setBusy(btn, false);
    if (!result.ok) setError("authRecoveryError", result.error);
    else setInfo("authRecoveryInfo", result.message);
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    const password = $("authNewPassword")?.value || "";
    const confirm = $("authNewPasswordConfirm")?.value || "";
    const btn = $("authUpdatePasswordSubmit");
    clearMessages();
    if (!password) {
      setError("authUpdatePasswordError", "Informe a nova senha.");
      return;
    }
    if (password !== confirm) {
      setError("authUpdatePasswordError", "A confirmação da senha não confere.");
      return;
    }
    setBusy(btn, true);
    const result = await window.VMAuth.updatePassword(password);
    setBusy(btn, false);
    if (!result.ok) setError("authUpdatePasswordError", result.error);
    else setInfo("authUpdatePasswordInfo", result.message);
  }

  function mount() {
    if (mounted) return;
    mounted = true;

    $("authSignInForm")?.addEventListener("submit", handleSignIn);
    $("authSignUpForm")?.addEventListener("submit", handleSignUp);
    $("authRecoveryForm")?.addEventListener("submit", handleRecovery);
    $("authUpdatePasswordForm")?.addEventListener("submit", handleUpdatePassword);

    $("authGoSignUp")?.addEventListener("click", () => setMode("signup"));
    $("authGoSignIn")?.addEventListener("click", () => setMode("signin"));
    $("authGoSignInFromRecovery")?.addEventListener("click", () => setMode("signin"));
    $("authGoRecovery")?.addEventListener("click", () => setMode("recovery"));

    document.querySelectorAll("[data-auth-toggle-password]").forEach((btn) => {
      btn.addEventListener("click", () => {
        showPassword = !showPassword;
        syncPasswordVisibility();
      });
    });

    window.addEventListener("vm-password-recovery", () => setMode("updatePassword"));
    setMode("signin");
    syncPasswordVisibility();
  }

  function showAuth() {
    $("authGate")?.classList.add("is-visible");
    $("authGate")?.removeAttribute("hidden");
    $("appShell")?.setAttribute("hidden", "");
    $("authBootScreen")?.setAttribute("hidden", "");
  }

  function showApp() {
    $("authGate")?.classList.remove("is-visible");
    $("authGate")?.setAttribute("hidden", "");
    $("authBootScreen")?.setAttribute("hidden", "");
    $("appShell")?.removeAttribute("hidden");
  }

  function showBoot(message) {
    const boot = $("authBootScreen");
    if (boot) {
      boot.removeAttribute("hidden");
      const copy = $("authBootMessage");
      if (copy) copy.textContent = message || "Preparando sua sessão…";
    }
    $("authGate")?.setAttribute("hidden", "");
    $("appShell")?.setAttribute("hidden", "");
  }

  function showConfigError(message) {
    showAuth();
    setMode("signin");
    setError("authSignInError", message || "Configuração do Supabase ausente.");
  }

  window.VMAuthUI = {
    mount,
    showAuth,
    showApp,
    showBoot,
    showConfigError,
    setMode
  };
})();
