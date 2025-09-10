// ../js/membresia.js
(() => {
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    // Destacar plan anual como recomendado al cargar
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

    // Smooth scroll "Ver planes" del hero
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const el = $(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Links de checkout (poné tus URLs)
    const CHECKOUT = {
      mensual: "https://tu-checkout.mensual", // TODO reemplazar
      anual:   "https://tu-checkout.anual"    // TODO reemplazar
    };
    $$('[data-checkout]').forEach(btn => {
      const plan = btn.getAttribute('data-checkout');
      btn.addEventListener('click', (e) => {
        const url = CHECKOUT[plan];
        if (!url || url === '#') {
          e.preventDefault();
          alert('Configurar link de checkout para: ' + plan);
        } else {
          btn.setAttribute('href', url);
        }
      }, { passive:false });
    });
  });
})();
// ../js/membresia.js
(() => {
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  // Paths relativos: membresia.html y checkout.html viven en /html/
  const CHECKOUT_PATH = "checkout.html";

  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    const authModal   = $("#authModal");
    const backdrop    = $("#authBackdrop");
    const closeBtn    = $("#authClose");
    const tabLogin    = $("#tabLogin");
    const tabRegister = $("#tabRegister");
    const panelLogin  = $("#panelLogin");
    const panelReg    = $("#panelRegister");

    // ————— helpers modal —————
    function openAuth(defaultTab = "register"){
      if (!authModal || !backdrop) return;
      authModal.hidden = false;
      backdrop.classList.add("show");
      document.body.classList.add("modal-open");
      switchTab(defaultTab);
      // foco inicial accesible
      const firstInput = defaultTab === "login" ? $("#loginEmail") : $("#regName");
      firstInput?.focus();
    }
    function closeAuth(){
      if (!authModal || !backdrop) return;
      authModal.hidden = true;
      backdrop.classList.remove("show");
      document.body.classList.remove("modal-open");
    }
    function switchTab(which){
      const isLogin = which === "login";
      tabLogin?.setAttribute("aria-selected", isLogin ? "true" : "false");
      tabRegister?.setAttribute("aria-selected", isLogin ? "false" : "true");
      panelLogin?.toggleAttribute("hidden", !isLogin);
      panelReg?.toggleAttribute("hidden", isLogin);
    }

    // Tabs click (por si no lo tenías aún)
    tabLogin?.addEventListener("click", () => switchTab("login"));
    tabRegister?.addEventListener("click", () => switchTab("register"));

    // Cerrar modal
    closeBtn?.addEventListener("click", closeAuth);
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) closeAuth();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAuth();
    });

    // ————— estado auth “simple” con localStorage —————
    // Guardamos un objeto mínimo para simular sesión
    const KEY = "pazUser";
    function isAuth(){
      try{ return Boolean(localStorage.getItem(KEY)); }
      catch{ return false; }
    }
    function saveUser(obj){
      try{ localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
    }

    // ————— CTA unirse: abre modal o va a checkout —————
    $$('[data-join]').forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (isAuth()) {
          // Ya autenticada -> directo a checkout
          window.location.href = CHECKOUT_PATH;
        } else {
          // Mostramos registro por defecto (podés cambiar a "login")
          openAuth("register");
        }
      });
    });

    // ————— Submit LOGIN —————
    panelLogin?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#loginEmail")?.value?.trim();
      const pass  = $("#loginPass")?.value?.trim();
      const msg   = $("#loginMsg");

      if (!email || !pass) {
        if (msg) msg.textContent = "Completá email y contraseña.";
        return;
      }

      // Aquí conectarías con tu backend real.
      // Simulación: “loguear” y seguir.
      saveUser({ email });
      if (msg) msg.textContent = "¡Listo! Redirigiendo…";

      closeAuth();
      window.location.href = CHECKOUT_PATH;
    });

    // ————— Submit REGISTER —————
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

      // Aquí conectarías con tu backend real.
      // Simulación: guardar “cuenta” y seguir a checkout.
      saveUser({ name, email });
      if (msg) msg.textContent = "¡Cuenta creada! Redirigiendo…";

      closeAuth();
      window.location.href = CHECKOUT_PATH;
    });

    // ————— Mejora opcional: si ya está logueada, muestra “Mi cuenta” en lugar de “Entrar” —————
    // Si te interesa, después lo integramos con el área #authArea de la navbar.
  });
})();

// js/membresia.js
(() => {
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  // membresia.html vive en /html/ → checkout al mismo nivel
  const CHECKOUT_PATH = "checkout.html";

  // Delegación: abre modal al clickear cualquier [data-join]
  document.addEventListener("click", (e) => {
    const join = e.target.closest("[data-join]");
    if (!join) return;
    e.preventDefault();

    // Si ya está autenticada, va directo a checkout
    if (window.AuthModal?.isAuth?.()) {
      window.location.href = CHECKOUT_PATH;
      return;
    }
    // Si no, abrimos modal (por defecto en "registrarse")
    window.AuthModal?.open?.("register");
  });

  // Cuando el modal completa login/registro → redirigir a checkout
  document.addEventListener("auth:success", () => {
    window.location.href = CHECKOUT_PATH;
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
