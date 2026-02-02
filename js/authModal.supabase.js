import { signUp, signIn, signOut, ensureProfile } from "./authSupabase.js";

function translateAuthError(err) {
  const msg = err?.message?.toLowerCase() || "";

  if (msg.includes("invalid login credentials")) {
    return "El correo o la contraseña no son correctos.";
  }

  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Este correo ya tiene una cuenta. Probá iniciar sesión.";
  }

  if (msg.includes("password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (msg.includes("email")) {
    return "El correo ingresado no es válido.";
  }

  return "Ocurrió un error. Intentá nuevamente en unos segundos.";
}

function setMsg(id, text, ok = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = ok ? "auth-msg ok" : "auth-msg error";
}

function saveUserCompat(name, email) {
  if (typeof window.writeUser === "function") {
    window.writeUser({ name, email });
  } else {
    localStorage.setItem("espaciopaz_user_v1", JSON.stringify({ name, email }));
  }
  if (typeof window.renderAuthUI === "function") window.renderAuthUI();
}

function closeAuthModal() {
  document.getElementById("authClose")?.click();
}

function hookAuthModalSupabase() {
  const loginForm = document.getElementById("panelLogin");
  const regForm = document.getElementById("panelRegister");

  if (!loginForm || !regForm) {
    console.warn("[authModal.supabase] No encontré panelLogin/panelRegister en esta página");
    return;
  }

  // LOGIN (captura: true) para ganarle al handler fake de script.js
  loginForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const email = document.getElementById("loginEmail")?.value?.trim() || "";
      const pass = document.getElementById("loginPass")?.value || "";

      try {
        if (!email || !pass) throw new Error("Completá email y contraseña.");

        await signIn(email, pass);
        const profile = await ensureProfile();

        const name = profile?.full_name || email.split("@")[0];
        saveUserCompat(name, email);
        // Si estoy en checkout, recargo para que checkout.js se inicialice
        if (location.pathname.includes("checkout.html")) {
          setTimeout(() => location.reload(), 250);
        }

        setMsg("loginMsg", "¡Sesión iniciada! ✨", true);
        setTimeout(closeAuthModal, 200);

        // Si estás en cuenta y existe renderAll, refrescá UI
        if (typeof window.renderAll === "function") window.renderAll();
      } catch (err) {
        setMsg("loginMsg", translateAuthError(err));
      }
    },
    true
  );

  // REGISTER
  regForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const fullName = document.getElementById("regName")?.value?.trim() || "";
      const email = document.getElementById("regEmail")?.value?.trim() || "";
      const pass = document.getElementById("regPass")?.value || "";

      try {
        if (!email || !pass) throw new Error("Completá email y contraseña.");
        if (pass.length < 6) throw new Error("La contraseña debe tener 6+ caracteres.");

        await signUp(email, pass, fullName);
        await signIn(email, pass);
        const profile = await ensureProfile();

        const name = profile?.full_name || fullName || email.split("@")[0];
        saveUserCompat(name, email);
        // Si estoy en checkout, recargo para que checkout.js se inicialice
        if (location.pathname.includes("checkout.html")) {
          setTimeout(() => location.reload(), 250);
        }

        setMsg("regMsg", "¡Cuenta creada! 🌸", true);
        setTimeout(closeAuthModal, 200);

        if (typeof window.renderAll === "function") window.renderAll();
      } catch (err) {
        setMsg("regMsg", translateAuthError(err));
      }
    },
    true
  );

  // LOGOUT (redirigir al index como querés)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnLogout");
    if (!btn) return;

    try { await signOut(); } catch {}

    localStorage.removeItem("espaciopaz_user_v1");
    window.location.href = "/index.html";
  });
}

// Esperar DOM (si no, a veces no engancha el modal)
document.addEventListener("DOMContentLoaded", hookAuthModalSupabase);

// ===== Exponer función global para abrir el modal desde cualquier script =====
window.openAuthModal = window.openAuthModal || function(tab = 'login') {
  // Intentar usar la función global de script.js si existe
  if (typeof window.openAuth === 'function') {
    window.openAuth(tab);
    return;
  }

  // Fallback: manipular el DOM directamente
  const modal = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  
  if (!modal) {
    console.warn('[authModal] No se encontró #authModal en la página');
    return;
  }

  // Abrir modal
  document.body.classList.add('modal-open');
  if (backdrop) backdrop.classList.add('show');
  modal.hidden = false;

  // Cambiar tab si es necesario
  const panelLogin = document.getElementById('panelLogin');
  const panelRegister = document.getElementById('panelRegister');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');

  if (panelLogin && panelRegister) {
    const isLogin = tab === 'login';
    panelLogin.hidden = !isLogin;
    panelRegister.hidden = isLogin;
    if (tabLogin) tabLogin.setAttribute('aria-selected', isLogin);
    if (tabRegister) tabRegister.setAttribute('aria-selected', !isLogin);
  }

  // Focus en el primer campo
  setTimeout(() => {
    const focusEl = tab === 'login' 
      ? document.getElementById('loginEmail')
      : document.getElementById('regName');
    focusEl?.focus();
  }, 50);
};

