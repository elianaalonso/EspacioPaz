import { supabase } from "./supabaseClient.js";

async function courseGate() {
  // 0) Identificar curso
  const courseId =
    document.body?.dataset?.courseId ||
    document.querySelector(".js-comprar")?.dataset?.courseId ||
    "";

  if (!courseId) {
    console.warn("[courseGate] Falta data-course-id en body o en .js-comprar");
    return;
  }

  // 1) Helpers de UI
  const lockAllExceptPreview = () => {
    document.querySelectorAll(".leccion").forEach((li) => {
      // si la lección tiene link con data-preview => queda abierta
      const isPreview = !!li.querySelector("[data-preview]");
      if (!isPreview) li.classList.add("locked");
    });
  };

  const unlockAll = () => {
    const lessons = document.querySelectorAll(".leccion");
    lessons.forEach((li) => {
      li.classList.remove("locked");

      // si tenía candado en el HTML, lo cambiamos a "play"
      const icon = li.querySelector(".ic--lock");
      if (icon) {
        icon.classList.remove("ic--lock");
        icon.classList.add("ic--play");
        icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 6l10 6-10 6z"/></svg>`;
      }
    });
  };

  const hideBuyButtonsAndPrice = () => {
    // Ocultar todos los botones de compra (.js-comprar)
    document.querySelectorAll(".js-comprar").forEach((btn) => {
      btn.style.display = "none";
    });

    // Ocultar precios si están en elementos típicos
    document.querySelectorAll('[class*="price"], [class*="precio"]').forEach((el) => {
      if (el.textContent && el.textContent.includes("$")) {
        el.style.display = "none";
      }
    });
  };

  // 2) sesión
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // 3) Si NO está logueada: solo bloquear (menos preview). No tocar botones.
  if (!session) {
    lockAllExceptPreview();

    // bloquear clicks en lecciones locked
    document.addEventListener(
      "click",
      (e) => {
        const item = e.target.closest(".leccion.locked");
        if (item) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    console.log("[courseGate] No logueada => bloqueado (menos preview).");
    return;
  }

  // 4) Verificar compra approved
  const { data: purchase, error } = await supabase
    .from("purchases")
    .select("status")
    .eq("user_id", session.user.id)
    .eq("course_id", courseId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("[courseGate] error purchases", error);
    // en error, por seguridad: bloquear excepto preview
    lockAllExceptPreview();
    return;
  }

  // 5) Si tiene acceso
  if (purchase) {
    unlockAll();
    hideBuyButtonsAndPrice(); // opcional: deja el curso “ya comprado” sin CTA
    console.log("[courseGate] Comprado => desbloqueado.");
    return;
  }

  // 6) Si NO compró (logueada): bloquear (menos preview). No tocar botones.
  lockAllExceptPreview();

  // bloquear clicks en lecciones locked
  document.addEventListener(
    "click",
    (e) => {
      const item = e.target.closest(".leccion.locked");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  console.log("[courseGate] Logueada sin compra => bloqueado (menos preview).");
}

document.addEventListener("DOMContentLoaded", () => {
  courseGate().catch(console.error);
});
