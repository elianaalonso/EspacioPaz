/* js/blog.js */

(() => {
  // ---------- Animación al hacer scroll ----------
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = Array.from(document.querySelectorAll('.reveal'));

  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ---------- Cargar más ----------
  const grid = document.getElementById('blogGrid');
  const btn = document.getElementById('loadMoreBtn');
  if (!grid || !btn) return;

  const BATCH_SIZE = 3; // Cambiá si querés más/menos por click

  const getLazy = () => Array.from(grid.querySelectorAll('.blog-card[data-lazy="true"]'));

  function showNextBatch() {
    const lazy = getLazy();
    if (lazy.length === 0) {
      btn.disabled = true;
      btn.textContent = 'No hay más artículos';
      return;
    }

    const next = lazy.slice(0, BATCH_SIZE);
    next.forEach(card => {
      card.style.display = '';         // mostrar
      requestAnimationFrame(() => {
        card.classList.add('is-visible'); // animación reveal
      });
      card.removeAttribute('data-lazy');  // ya no es lazy
    });

    if (getLazy().length === 0) {
      btn.disabled = true;
      btn.textContent = 'No hay más artículos';
    } else {
      btn.setAttribute('aria-live', 'polite');
      btn.setAttribute('aria-label', `Se cargaron ${next.length} artículos más`);
    }
  }

  if (getLazy().length === 0) {
    btn.style.display = 'none';
  }

  btn.addEventListener('click', showNextBatch);
})();
