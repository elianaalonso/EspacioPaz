import { signUp, signIn, signOut, ensureProfile } from "./authSupabase.js";

/**
 * Toma el modal existente (panelLogin y panelRegister)
 * y hace login/registro real con Supabase.
 * Luego guarda compatibilidad con tu UI guardando espaciopaz_user_v1 en localStorage.
 */
function hookAuthModalSupabase() {
  const loginForm = document.getElementById("panelLogin");
  const regForm = document.getElementById("panelRegister");

  if (!loginForm || !regForm) {
    console.warn("[authModal.supabase] No encontré panelLogin/panelRegister");
    return;
  }

  // LOGIN
  loginForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const email = document.getElementById("loginEmail")?.value?.trim() || "";
      const pass = document.getElementById("loginPass")?.value || ""; // NO trim
      const msg = document.getElementById("loginMsg");

      try {
        if (!email || !pass) throw new Error("Completá email y contraseña.");

        await signIn(email, pass);
        const profile = await ensureProfile();

        const name = profile?.full_name || email.split("@")[0];

        // Compat con tu front actual
        localStorage.setItem(
          "espaciopaz_user_v1",
          JSON.stringify({ name, email })
        );

        if (msg) msg.textContent = "¡Sesión iniciada! ✨";

        // Cerrar modal
        document.getElementById("authClose")?.click();

        // Si estamos en cuenta, re-render
        if (typeof window.renderAll === "function") window.renderAll();
      } catch (err) {
        if (msg) msg.textContent = err?.message || "Error al iniciar sesión";
      }
    },
    true
  );

  // REGISTRO
  regForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const fullName = document.getElementById("regName")?.value?.trim() || "";
      const email = document.getElementById("regEmail")?.value?.trim() || "";
      const pass = document.getElementById("regPass")?.value || ""; // NO trim
      const msg = document.getElementById("regMsg");

      try {
        if (!email || !pass) throw new Error("Completá email y contraseña.");

        // Crear usuario
        await signUp(email, pass, fullName);

        // Loguear (para tener session)
        await signIn(email, pass);

        const profile = await ensureProfile();
        const name = profile?.full_name || fullName || email.split("@")[0];

        localStorage.setItem(
          "espaciopaz_user_v1",
          JSON.stringify({ name, email })
        );

        if (msg) msg.textContent = "¡Cuenta creada! 🌸";

        document.getElementById("authClose")?.click();
        if (typeof window.renderAll === "function") window.renderAll();
      } catch (err) {
        if (msg) msg.textContent = err?.message || "Error al crear cuenta";
      }
    },
    true
  );

  // LOGOUT real (si tu botón existe)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnLogout");
    if (!btn) return;

    try {
      await signOut();
    } catch (err) {
      console.warn(err);
    }

    localStorage.removeItem("espaciopaz_user_v1");

// Redirigir al inicio
window.location.href = "/index.html";

  });
}

hookAuthModalSupabase();








import { signUp, signIn, signOut, ensureProfile } from "./authSupabase.js";

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

        setMsg("loginMsg", "¡Sesión iniciada! ✨", true);
        setTimeout(closeAuthModal, 200);

        // Si estás en cuenta y existe renderAll, refrescá UI
        if (typeof window.renderAll === "function") window.renderAll();
      } catch (err) {
        setMsg("loginMsg", err?.message || "Error al iniciar sesión");
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

        setMsg("regMsg", "¡Cuenta creada! 🌸", true);
        setTimeout(closeAuthModal, 200);

        if (typeof window.renderAll === "function") window.renderAll();
      } catch (err) {
        setMsg("regMsg", err?.message || "Error al crear cuenta");
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

