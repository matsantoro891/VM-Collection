/* Application bootstrap: auth gate → local app → optional cloud pull. */
(async function bootVmCollection() {
  const bootMessage = (text) => window.VMAuthUI?.showBoot?.(text);

  function waitForAppStarter() {
    if (typeof window.startVmCollectionApp === "function") return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (typeof window.startVmCollectionApp === "function") {
          clearInterval(timer);
          resolve();
        }
      }, 20);
    });
  }

  let appStarted = false;
  async function ensureAppStarted() {
    await waitForAppStarter();
    if (!appStarted) {
      appStarted = true;
      await window.startVmCollectionApp();
    } else if (typeof window.refreshCloudCollection === "function") {
      await window.refreshCloudCollection();
    }
  }

  window.VMAuthUI.mount();
  bootMessage("Preparando sua sessão…");

  const authState = await window.VMAuth.initAuth();

  if (authState.configError) {
    window.VMAuthUI.showConfigError(authState.configError);
  }

  window.VMAuth.subscribe(async (state) => {
    if (state.authInitializing) {
      bootMessage("Restaurando sessão…");
      return;
    }

    if (state.session?.user) {
      window.VMAuthUI.showApp();
      try {
        await ensureAppStarted();
      } catch (error) {
        console.error(error);
        alert("Não foi possível abrir o aplicativo após o login.");
      }
      return;
    }

    window.VMAuthUI.showAuth();
  });

  // Initial route after initAuth (subscribe also fires, but ensure boot screen clears)
  if (!authState.authInitializing && !authState.session?.user && !authState.configError) {
    window.VMAuthUI.showAuth();
  }
})().catch((error) => {
  console.error(error);
  window.VMAuthUI?.showConfigError?.(
    "Não foi possível iniciar a autenticação. Recarregue a página ou verifique a configuração."
  );
});
