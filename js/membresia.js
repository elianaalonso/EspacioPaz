(() => {
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const CHECKOUT_PATH = "checkout.html";
  const KEY = "pazUser";

  // Helpers auth
  function isAuth() {
    try { return Boolean(localStorage.getItem(KEY)); } catch { return false; }
  }
  function openAuth(defaultTab = "register") {
    const authModal = $("#authModal");
    const backdrop = $("#authBackdrop");
    if (!authModal || !backdrop) return;
    authModal.hidden = false;
    backdrop.classList.add("show");
    document.body.classList.add("modal-open");
    switchTab(defaultTab);
    const firstInput = defaultTab === "login" ? $("#loginEmail") : $("#regName");
    firstInput?.focus();
  }
  function closeAuth() {
    const authModal = $("#authModal");
    const backdrop = $("#authBackdrop");
    if (!authModal || !backdrop) return;
    authModal.hidden = true;
    backdrop.classList.remove("show");
    document.body.classList.remove("modal-open");
  }
  function switchTab(which) {
    const tabLogin = $("#tabLogin");
    const tabRegister = $("#tabRegister");
    const panelLogin = $("#panelLogin");
    const panelReg = $("#panelRegister");
    const isLogin = which === "login";
    tabLogin?.setAttribute("aria-selected", isLogin ? "true" : "false");
    tabRegister?.setAttribute("aria-selected", isLogin ? "false" : "true");
    panelLogin?.toggleAttribute("hidden", !isLogin);
    panelReg?.toggleAttribute("hidden", isLogin);
  }
  function saveUser(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
  }

  // Destacar plan anual
  document.addEventListener("DOMContentLoaded", () => {
    const anual = $('[data-plan-card="anual"]');
    const mensual = $('[data-plan-card="mensual"]');
    const grid = $('.planes-grid');
    if (anual) {
      anual.classList.add('is-active','featured');
      if (grid && grid.firstElementChild !== anual) {
        grid.insertBefore(anual, grid.firstElementChild);
      }
    }
    if (mensual) {
      mensual.classList.remove('is-active');
    }

    // Tabs click
    const tabLogin = $("#tabLogin");
    const tabRegister = $("#tabRegister");
    tabLogin?.addEventListener("click", () => switchTab("login"));
    tabRegister?.addEventListener("click", () => switchTab("register"));

    // Cerrar modal
    const closeBtn = $("#authClose");
    const backdrop = $("#authBackdrop");
    closeBtn?.addEventListener("click", closeAuth);
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) closeAuth();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAuth();
    });

    // Submit LOGIN
    const panelLogin = $("#panelLogin");
    panelLogin?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#loginEmail")?.value?.trim();
      const pass  = $("#loginPass")?.value?.trim();
      const msg   = $("#loginMsg");
      if (!email || !pass) {
        if (msg) msg.textContent = "Completá email y contraseña.";
        return;
      }
      saveUser({ email });
      if (msg) msg.textContent = "¡Listo! Redirigiendo…";
      closeAuth();
      window.location.href = CHECKOUT_PATH;
    });

    // Submit REGISTER
    const panelReg = $("#panelRegister");
    panelReg?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name  = $("#regName")?.value?.trim();
      const email = $("#regEmail")?.value?.trim();
      const pass  = $("#regPass")?.value?.trim();
      const msg   = $("#regMsg");
      if (!name || !email || !pass) {
        if (msg) msg.textContent = "Completá nombre, email y contraseña.";
        return;
      }
      if (pass.length < 6) {
        if (msg) msg.textContent = "La contraseña debe tener al menos 6 caracteres.";
        return;
      }
      saveUser({ name, email });
      if (msg) msg.textContent = "¡Cuenta creada! Redirigiendo…";
      closeAuth();
      window.location.href = CHECKOUT_PATH;
    });
  });

  // Unirme ahora: si logueada va a checkout, si no abre modal
  document.addEventListener("click", (e) => {
    const join = e.target.closest("[data-join]");
    if (!join) return;
    e.preventDefault();
    if (isAuth()) {
      window.location.href = CHECKOUT_PATH;
      return;
    }
    openAuth("register");
  });

  // Smooth scroll para anchors internos (#planes, etc.)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id === "#" || !id) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
