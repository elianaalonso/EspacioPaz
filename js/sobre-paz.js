(function () {
  "use strict";

  // Marcar el CTA como ocupado para feedback (sin romper la navegación)
  const verCursos = document.getElementById("cta-ver-cursos");
  if (verCursos) {
    verCursos.addEventListener("click", function () {
      verCursos.setAttribute("aria-busy", "true");
    });
  }

  // Hook para abrir tu modal de login/registro (si existe en tu app)
  const abrirAuth = document.getElementById("abrir-auth");
  if (abrirAuth) {
    abrirAuth.addEventListener("click", function () {
      // Si tenés una función global, llamala acá. Ej:
      // window.ui?.openAuthModal?.();
      const ev = new CustomEvent("open-auth-modal", { bubbles: true });
      document.dispatchEvent(ev);
    });
  }

  // Aparición suave al hacer scroll (accesible, sin romper layout)
  const revelar = document.querySelectorAll(
    ".sobre-card, .sobre-proposito, .sobre-cta-card, .sobre-img, .sobre-foto"
  );
  if ("IntersectionObserver" in window && revelar.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.style.transition = "opacity .6s, transform .6s";
            en.target.style.opacity = 1;
            en.target.style.transform = "none";
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revelar.forEach((el) => {
      el.style.opacity = 0;
      el.style.transform = "translateY(.6rem)";
      io.observe(el);
    });
  }
})();
