// ===== Scroll Reveal Animation =====
function revealOnScroll() {
  const reveals = document.querySelectorAll('.reveal');
  const windowHeight = window.innerHeight;
  const revealPoint = 80;
  reveals.forEach(el => {
    const elementTop = el.getBoundingClientRect().top;
    if (elementTop < windowHeight - revealPoint) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('DOMContentLoaded', revealOnScroll);
// ===== NAV: Hamburguesa y dropdown =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');
const ddCursos = document.getElementById('ddCursos');

if (hamburgerBtn && navLinks) {
  hamburgerBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });

  // Cerrar menú al navegar en móvil
  navLinks.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=> navLinks.classList.remove('open'));
  });
}

if (ddCursos) {
  // Dropdown usable en móvil (tap para abrir/cerrar)
  const toggle = ddCursos.querySelector('.dropdown-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      if (window.matchMedia('(max-width: 920px)').matches) {
        // Solo prevenir si es tap en móvil
        e.preventDefault();
        ddCursos.classList.toggle('open');
        ddCursos.querySelector('.dropdown-menu').style.display =
          ddCursos.classList.contains('open') ? "flex" : "none";
      }
      // Si no es móvil, dejar que navegue normalmente
    });
  }
}


// ===== BUSCADOR con miniaturas (panel flotante) =====
// Inicializar el buscador de forma robusta: si las cards se insertan dinámicamente
// (p. ej. por `js/cursos.js`) reconstruimos el índice con un MutationObserver.
document.addEventListener('DOMContentLoaded', () => {
  const $input  = document.getElementById('searchInput');
  const $toggle = document.getElementById('searchToggle');
  const $wrap   = document.getElementById('searchWrap');
  const $panel  = document.getElementById('searchResults');

  if (!$input || !$panel || !$wrap) return;

  // Abrir/cerrar input
  if ($toggle) {
    $toggle.addEventListener('click', () => {
      $wrap.classList.toggle('open');
      if ($wrap.classList.contains('open')) {
        setTimeout(()=> $input.focus(), 10);
      } else {
        closePanel();
      }
    });
  }

  // Normalización y utilidades
  const norm = s => (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let items = [];
  let globalItems = []; // Mantener índice global separado

  // Construir índice a partir del DOM (rápido y tolerante a distintas estructuras)
  function buildIndex(){
    const cardNodes = document.querySelectorAll('.cursos-grid .course-card, #grid .course-card, .course-card, .curso-card');
    const seen = new Set();
    const localItems = Array.from(cardNodes).map(card => {
      if (seen.has(card)) return null; seen.add(card);
      const title = (card.querySelector('h3')?.textContent || card.getAttribute('data-title') || '').trim();
      const desc  = (card.querySelector('p')?.textContent || card.getAttribute('data-desc') || '').trim();
      const imgEl = card.querySelector('img');
      const img   = imgEl ? (imgEl.getAttribute('src') || '') : '';
      const a = card.querySelector('a') || card.querySelector('.course-card__link');
      const link  = a ? (a.getAttribute('href') || a.href || '#') : '#';
      return { title, desc, img, link, _t: norm(title), _d: norm(desc) };
    }).filter(Boolean);
    
    // Fusionar items locales con items globales, evitando duplicados
    const existingKeys = new Set(localItems.map(it => (it.link || it.title || '').toString()));
    items = localItems.slice();
    for (const g of globalItems) {
      const key = (g.link || g.title || '').toString();
      if (!existingKeys.has(key)) { 
        items.push(g); 
        existingKeys.add(key); 
      }
    }
    
    try { window.__searchIndex = items; } catch(e){}
  }

  // Cargar un índice global desde JSON (para búsquedas desde páginas sin cards)
  async function fetchJSONPaths(paths){
    for (const p of paths){
      try {
        const r = await fetch(p);
        if (!r.ok) continue; // Silenciosamente intentar siguiente ruta
        const j = await r.json();
        return { data: j, path: p };
      } catch(e){ /* intentar siguiente */ }
    }
    return null;
  }

  async function loadGlobalIndex(){
    if (window.__globalSearchIndex) return window.__globalSearchIndex;
    // Construir candidatos automáticamente según la profundidad de la página actual
    const maxUp = 6;
    const parts = location.pathname.split('/').filter(Boolean);
    
    // Función para obtener el prefijo según la profundidad
    const getPrefix = (up) => up === 0 ? '' : '../'.repeat(up);
    
    // Cargar los 3 archivos JSON: cursos, meditaciones y rituales
    const allData = [];
    const jsonFiles = ['datos/cursos.json', 'datos/meditaciones.json', 'datos/rituales.json'];
    
    for (const jsonFile of jsonFiles) {
      const candidates = [];
      // relative paths: '', ../, ../../, ... hasta maxUp
      for (let up = 0; up <= Math.min(parts.length, maxUp); up++){
        const prefix = getPrefix(up);
        candidates.push(prefix + jsonFile);
      }
      // absolute paths
      try { candidates.push('/' + jsonFile); } catch(e){}
      try { candidates.push(window.location.origin + '/' + jsonFile); } catch(e){}

      // Intentar cargar este archivo JSON
      const result = await fetchJSONPaths(candidates);
      if (result && result.data) {
        const data = result.data;
        // Agregar todos los items de este archivo al array global
        const items = Array.isArray(data) ? data : (data.cursos || data.meditaciones || data.rituales || data.items || []);
        allData.push(...items);
      }
    }
    
    // Si no se pudo cargar ningún archivo
    if (allData.length === 0) {
      console.warn && console.warn('search: no global index found');
      return [];
    }
    
    // Normalizar formato - ser tolerante a claves en español/inglés
    const global = allData.map(it => {
      const title = (it.title || it.titulo || it.nombre || it.name || '').toString().trim();
      const desc  = (it.desc || it.short_desc || it.descripcion || it.description || it.summary || '').toString().trim();
      const imgObj = it.image || {};
      const img   = (imgObj.src || it.img || it.thumbnail || it.thumbnailUrl || it.cover || '').toString();
      
      // Obtener el link - ajustar según la categoría
      let link = (it.link || it.url || it.href || '').toString();
      if (!link) {
        const slug = (it.slug || it.id || '').toString();
        const category = (it.category || '').toString().toLowerCase();
        if (slug) {
          // Construir el link según la categoría
          if (category === 'meditacion') {
            link = `html/meditaciones/${slug}.html`;
          } else if (category === 'ritual') {
            link = `html/rituales/${slug}.html`;
          } else {
            link = `html/cursos/${slug}.html`;
          }
        }
      }
      
      // Si sigue vacío, saltar (no útil para búsqueda)
      if (!title) return null;
      return { title, desc, img, link: link || '#', _t: norm(title), _d: norm(desc) };
    }).filter(Boolean);
    
    window.__globalSearchIndex = global;
    return global;
  }

  function debounce(fn, wait){ let t = null; return function(...args){ clearTimeout(t); t = setTimeout(()=> fn.apply(this, args), wait); }; }

  // Inicializar y observar cambios en el DOM
  buildIndex();
  // Cargar en background un índice global (para páginas que no tienen cards)
  let __globalIndexAvailable = false;
  let __isLoadingIndex = true;
  loadGlobalIndex().then(loadedItems => {
    __isLoadingIndex = false;
    if (!loadedItems || !loadedItems.length) { __globalIndexAvailable = false; return; }
    __globalIndexAvailable = true;
    
    // Guardar items globales
    globalItems = loadedItems;
    
    // Reconstruir índice fusionando local + global
    buildIndex();
    
    console.log('Buscador: índice global cargado con', items.length, 'elementos');
  }).catch((err)=>{ 
    __isLoadingIndex = false;
    __globalIndexAvailable = false; 
    console.warn('Buscador: error al cargar índice global', err);
  });
  const gridEl = document.getElementById('grid');
  const mo = new MutationObserver(debounce(buildIndex, 120));
  if (gridEl) mo.observe(gridEl, { childList: true, subtree: true });
  else mo.observe(document.body, { childList: true, subtree: true });

  // Filtrado + render
  let pos = -1; let t = null;

  $input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = $input.value.trim();
      if (!q) { closePanel(); return; }
      const nq = norm(q);
      
      // Si está cargando, mostrar mensaje de espera
      if (__isLoadingIndex && !items.length) {
        $panel.innerHTML = `<div class="search-empty">Cargando índice de búsqueda...</div>`;
        $panel.classList.add('show'); pos = -1; return;
      }
      
      // Si no hay items y no pudimos cargar el índice global, avisar al usuario
      if (!items.length && !__globalIndexAvailable && !__isLoadingIndex) {
        $panel.innerHTML = `<div class="search-empty">No hay índice local cargado. Si abriste los archivos desde el sistema de archivos (file://), el navegador bloquea la carga de datos. Iniciá un servidor local (por ejemplo: <code>python -m http.server</code> o usando Live Server) y recargá la página para usar el buscador global.</div>`;
        $panel.classList.add('show'); pos = -1; return;
      }
      
      const res = items.filter(it => it._t.includes(nq) || it._d.includes(nq)).slice(0, 6);
      renderResults(res, q);
    }, 120);
  });

  function highlight(text, q){ if (!q) return text; const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return text.replace(new RegExp(esc, 'ig'), m => `<mark>${m}</mark>`); }

  // Función para ajustar rutas según la ubicación actual
  function adjustPath(link) {
    if (!link || link === '#') return link;
    
    // Si el link ya es absoluto o comienza con http, devolverlo tal cual
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('/')) return link;
    
    // Calcular profundidad actual (cuántos niveles de carpetas tiene la página actual)
    const currentPath = location.pathname;
    const parts = currentPath.split('/').filter(Boolean);
    
    // Si estamos en la raíz (index.html), no necesitamos ajustar
    if (parts.length <= 1) {
      return link;
    }
    
    // Si estamos en una subcarpeta, necesitamos subir niveles
    // Por ejemplo, si estamos en html/meditaciones/algo.html, necesitamos ../../
    const depth = parts.length - 1; // restamos 1 porque el último es el archivo
    const prefix = '../'.repeat(depth);
    
    return prefix + link;
  }

  function renderResults(list, q){
    if (!list.length) { $panel.innerHTML = `<div class="search-empty">No se encontraron resultados para “${q}”.</div>`; $panel.classList.add('show'); pos = -1; return; }
    $panel.innerHTML = list.map((it,i)=>`
      <a class="search-item" href="${adjustPath(it.link)}" data-idx="${i}">
        <span class="search-thumb"><img src="${adjustPath(it.img)}" alt=""></span>
        <span class="search-text">
          <h4>${highlight(it.title, q)}</h4>
          <p>${highlight(it.desc, q)}</p>
        </span>
      </a>
    `).join('');
    $panel.classList.add('show'); pos = -1;
    setTimeout(() => { try { document.addEventListener('click', onDocClick, { once:true }); } catch(e){} }, 0);
  }

  function onDocClick(e){ if (!$wrap.contains(e.target)) closePanel(); else { try { document.addEventListener('click', onDocClick, { once:true }); } catch(e){} } }

  function closePanel(){ $panel.classList.remove('show'); $panel.innerHTML = ''; $input.value = ''; pos = -1; }

  // Teclado: / enfoca, Esc cierra, ▲▼ navega, Enter abre
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $input) { e.preventDefault(); $wrap.classList.add('open'); $input.focus(); return; }
    if (e.key === 'Escape') { closePanel(); $wrap.classList.remove('open'); $input.blur(); return; }
    if (!$panel.classList.contains('show')) return;
    const $items = Array.from($panel.querySelectorAll('.search-item'));
    if (!$items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); pos = (pos + 1) % $items.length; setActive($items, pos); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pos = (pos - 1 + $items.length) % $items.length; setActive($items, pos); }
    else if (e.key === 'Enter' && pos >= 0) { e.preventDefault(); $items[pos].click(); }
  });

  function setActive(nodes, idx){ nodes.forEach(n => n.classList.remove('active')); const n = nodes[idx]; if (n) { n.classList.add('active'); n.scrollIntoView({ block: 'nearest' }); } }

  $wrap.addEventListener('mouseleave', () => { if ($wrap.classList.contains('open')) { setTimeout(() => { if (! $wrap.matches(':hover')) { $wrap.classList.remove('open'); closePanel(); } }, 200); } });
});

// ===== Newsletter (sin recargar, con mensajito) =====
(() => {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const email = document.getElementById('nlEmail');
  const msg   = document.getElementById('nlMsg');
  const btn   = form.querySelector('.btn-nl');

  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  form.addEventListener('submit', (e) => {
    e.preventDefault();                       // no recargar
    const v = email.value;

    if (!isEmail(v)) {
      msg.textContent = 'Ingresá un email válido ✉️';
      msg.className = 'nl-msg error';
      email.focus();
      return;
    }

    // Simulamos éxito inmediato (luego podés conectar Mailchimp/ConvertKit)
    form.classList.add('sent');
    msg.textContent = '¡Listo! Ya estás en la lista 💌';
    msg.className = 'nl-msg ok';
    btn.disabled = true;
  });
})();

// ===== MODAL AUTH (login / register) — robusto con delegación =====
(() => {
  const modal    = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  const closeBtn = document.getElementById('authClose');

  const tabLogin     = document.getElementById('tabLogin');
  const tabRegister  = document.getElementById('tabRegister');
  const panelLogin   = document.getElementById('panelLogin');
  const panelRegister= document.getElementById('panelRegister');

  if (!modal || !backdrop || !tabLogin || !tabRegister || !panelLogin || !panelRegister) return;

  function setTab(mode){
    const isLogin = mode === 'login';
    tabLogin.setAttribute('aria-selected', isLogin);
    tabRegister.setAttribute('aria-selected', !isLogin);
    panelLogin.hidden    = !isLogin;
    panelRegister.hidden =  isLogin;
  }
  function openModal(mode='login'){
    document.body.classList.add('modal-open');
    backdrop.classList.add('show');
    modal.hidden = false;
    setTab(mode);
    const focusEl = (mode === 'login'
      ? document.getElementById('loginEmail')
      : document.getElementById('regName'));
    setTimeout(()=> focusEl?.focus(), 50);
  }
  function closeModal(){
    document.body.classList.remove('modal-open');
    backdrop.classList.remove('show');
    modal.hidden = true;
  }

  // Exponer globalmente para otros scripts
  window.openAuth = openModal;

  // ✅ Delegación: cualquier elemento con data-open="login" o "register" abre el modal
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open]');
    if (!trigger) return;
    const mode = trigger.getAttribute('data-open'); // "login" | "register"
    if (mode === 'login' || mode === 'register') {
      e.preventDefault();
      openModal(mode);
    }
  });

  // ✅ Soporte para evento personalizado desde otros scripts
  document.addEventListener('open-auth-modal', function(){
    openModal('login');
  });

  // Cerrar y tabs
  closeBtn?.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  tabLogin.addEventListener('click', ()=> setTab('login'));
  tabRegister.addEventListener('click', ()=> setTab('register'));
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // Validaciones mínimas (simuladas)
  document.getElementById('panelLogin')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim();
    const pass  = document.getElementById('loginPass')?.value.trim();
    const msg   = document.getElementById('loginMsg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !pass) {
      msg.textContent = 'Completá email y contraseña válidos.'; msg.className = 'auth-msg error'; return;
    }
    msg.textContent = '¡Bienvenida/o! Sesión iniciada ✨'; msg.className = 'auth-msg ok';
    setTimeout(closeModal, 800);
  });

  document.getElementById('panelRegister')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name  = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const pass  = document.getElementById('regPass')?.value.trim();
    const msg   = document.getElementById('regMsg');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || (pass?.length < 6)) {
      msg.textContent = 'Revisá los datos. La contraseña debe tener 6+ caracteres.'; msg.className = 'auth-msg error'; return;
    }
    msg.textContent = '¡Cuenta creada! Te damos la bienvenida 🌸'; msg.className = 'auth-msg ok';
    setTimeout(()=> setTab('login'), 900);
  });
})();

/* ===== Testimonios slider ===== */
(() => {
  const wrap = document.getElementById('tSlider');
  if (!wrap) return;
  const items = Array.from(wrap.querySelectorAll('.t-item'));
  const dotsWrap = document.getElementById('tDots');
  let i = 0, t;

  function renderDots(){
    dotsWrap.innerHTML = items.map((_,idx)=>`<button role="tab" aria-selected="${idx===0?'true':'false'}" aria-controls="t${idx}" tabindex="${idx===0?'0':'-1'}"></button>`).join('');
    dotsWrap.addEventListener('click', e=>{
      const b = e.target.closest('button'); if(!b) return;
      i = Array.from(dotsWrap.children).indexOf(b); show(i, true);
    });
  }
  function show(idx, manual){
    items.forEach((el, k)=> el.classList.toggle('is-active', k===idx));
    Array.from(dotsWrap.children).forEach((d,k)=>{
      d.setAttribute('aria-selected', k===idx ? 'true':'false');
      d.tabIndex = (k===idx?0:-1);
    });
    i = idx;
    if (!manual) return;
    clearInterval(t); // si clickean, pausamos 8s y retomamos
    t = setInterval(()=> show((i+1)%items.length, false), 5000);
  }
  renderDots();
  items[0].classList.add('is-active');
  t = setInterval(()=> show((i+1)%items.length, false), 5000);
})();

/* ===== Focus trap en modal de auth ===== */
(() => {
  const modal = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  if (!modal || !backdrop) return;

  function getFocusables(){
    return Array.from(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }
  function trap(e){
    if (e.key !== 'Tab') return;
    const f = getFocusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length-1];
    if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
  }
  // enganchar en open/close del modal (ya lo manejás)
  const _open = document.body.classList.contains('modal-open');
  const obs = new MutationObserver(()=>{
    if (!modal.hidden){ document.addEventListener('keydown', trap); }
    else { document.removeEventListener('keydown', trap); }
  });
  obs.observe(modal, { attributes:true, attributeFilter:['hidden'] });
})();

/* ===== Newsletter: feedback inmediato (ya lo tenés, sumo mini toast CSS) ===== */
// (Tu bloque existente ya maneja .sent y .nl-msg; no hace falta tocar más)

/* ======= Cards: hacer toda la card clickeable y evitar navegar al agregar ======= */
document.querySelectorAll('.curso-card').forEach(card => {
  const href = card.getAttribute('data-href');
  if (!href) return;

  // click en card → navega
  card.addEventListener('click', e => {
    // si clickean el botón de carrito, no navegamos
    if (e.target.closest('.btn-cart')) return;
    window.location.href = href;
  });

  // Enter/Space accesible
  card.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.btn-cart')) {
      e.preventDefault();
      window.location.href = href;
    }
  });
});

// botón Agregar al carrito (stub)
document.querySelectorAll('.btn-cart').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation(); // no disparar navegación de la card
    const id = btn.getAttribute('data-add');
    // Acá integrarías tu carrito real; por ahora, feedback rápido:
    btn.disabled = true;
    const prev = btn.textContent.trim();
    btn.textContent = 'Agregado ✓';
    setTimeout(() => { btn.disabled = false; btn.textContent = prev; }, 1500);
  });
});

/* ======= Testimonios: carrusel horizontal ======= */
(() => {
  const track = document.getElementById('tTrack');
  const dotsWrap = document.getElementById('tDots');
  const prev = document.querySelector('.t-prev');
  const next = document.querySelector('.t-next');
  if (!track || !dotsWrap) return;

  const slides = Array.from(track.children);
  let i = 0, t;

  function sizeSlides(){
    // asegurar ancho completo por slide
    const vw = document.getElementById('tViewport').clientWidth;
    slides.forEach(s => s.style.width = vw + 'px');
    track.style.transform = `translateX(${-i*vw}px)`;
  }

  function renderDots(){
    dotsWrap.innerHTML = slides.map((_,idx)=>
      `<button role="tab" aria-selected="${idx===0?'true':'false'}" aria-controls="t${idx}" tabindex="${idx===0?'0':'-1'}"></button>`
    ).join('');
    dotsWrap.addEventListener('click', e=>{
      const b = e.target.closest('button'); if(!b) return;
      i = Array.from(dotsWrap.children).indexOf(b); show(i, true);
    });
  }

  function setDots(){
    [...dotsWrap.children].forEach((d,idx)=>{
      d.setAttribute('aria-selected', idx===i?'true':'false');
      d.tabIndex = idx===i?0:-1;
    });
  }

  function show(n, manual){
    const vw = document.getElementById('tViewport').clientWidth;
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(${-i*vw}px)`;
    setDots();
    if (manual){
      clearInterval(t);
      t = setInterval(()=> show(i+1, false), 5000);
    }
  }

  // flechas
  prev?.addEventListener('click', ()=> show(i-1, true));
  next?.addEventListener('click', ()=> show(i+1, true));

  // init
  renderDots();
  sizeSlides();
  window.addEventListener('resize', sizeSlides);
  t = setInterval(()=> show(i+1, false), 5000);
})();

/* ================== CARRITO (localStorage) ================== */
const CART_KEY = 'espaciopaz_cart_v1';

function readCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function writeCart(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}
function cartCount(){
  return readCart().reduce((acc, it) => acc + (it.qty||0), 0);
}
function updateCartBadge(){
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const n = cartCount();
  badge.textContent = n;
  badge.style.visibility = n > 0 ? 'visible' : 'hidden';
}
function animateCartIcon(){
  const btn = document.getElementById('cartButton');
  if (!btn) return;
  btn.classList.remove('bump');
  // trigger reflow to restart animation
  void btn.offsetWidth;
  btn.classList.add('bump');
}

function addToCartFromCard(btn){
  const card = btn.closest('.curso-card');
  if (!card) return;

  // Datos desde la card (sin tocar tu HTML):
  const id = btn.getAttribute('data-add') || card.dataset.href || crypto.randomUUID();
  const name = (card.querySelector('h3')?.textContent || 'Curso').trim();
  const priceText = (card.querySelector('.price')?.textContent || '0').replace(/[^\d.,]/g,'').replace(',','.');
  const price = parseFloat(priceText) || 0;
  const img = card.querySelector('.curso-media img')?.getAttribute('src') || '';

  const cart = readCart();
  const idx = cart.findIndex(it => it.id === id);
  if (idx >= 0){
    cart[idx].qty += 1;
  } else {
    cart.push({ id, name, price, img, qty: 1 });
  }
  writeCart(cart);
  updateCartBadge();
  animateCartIcon();

  // feedback visual rápido en el botón
  btn.disabled = true;
  const prev = btn.textContent.trim();
  btn.classList.add('added');
  btn.textContent = 'Agregado ✓';
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('added');
    btn.textContent = prev;
  }, 900);
  // Si estamos en la página de carrito, actualiza la vista
  if (document.getElementById('cartList') && typeof window.draw === 'function') {
    window.draw();
  }
}

// Bind a los botones "Agregar al carrito"
document.querySelectorAll('.btn-cart').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation(); // no navegar a la card
    addToCartFromCard(btn);
  });
});

// Badge al cargar
document.addEventListener('DOMContentLoaded', updateCartBadge);

/* ================== RENDER DE PAGINA CARRITO ================== */
(function renderCartPage(){
  const list = document.getElementById('cartList');
  if (!list) return; // no estamos en carrito.html

  function formatUSD(n){ return `$${n.toFixed(2)} USD`; }

  function draw(){
    const cart = readCart();
    list.innerHTML = '';

    const emptyMsg = document.getElementById('cartEmptyMsg');
    if (!cart.length){
      list.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      document.getElementById('cartTotal').textContent = formatUSD(0);
      document.getElementById('sumCount').textContent = '0 productos';
      document.getElementById('sumSubtotal').textContent = 'USD 0';
      updateCartBadge();
      return;
    } else {
      if (emptyMsg) emptyMsg.style.display = 'none';
    }

    let total = 0;
    let totalQty = 0;

    cart.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      totalQty += it.qty;
      total += it.price * it.qty;

      li.innerHTML = `
        <img src="../${it.img || 'img/placeholder.png'}" alt="" class="cart-thumb">
        <div class="cart-info">
          <strong>${it.name}</strong>
        </div>
        <div class="cart-qty" style="justify-content: flex-start;">
          <button type="button" class="q minus" aria-label="Quitar uno">−</button>
          <input type="text" value="${it.qty}" inputmode="numeric" aria-label="Cantidad" style="text-align:center; margin-left:0;">
          <button type="button" class="q plus" aria-label="Agregar uno">+</button>
        </div>
        <div class="cart-price">${formatUSD(it.price)}</div>
        <button type="button" class="cart-remove" aria-label="Eliminar" style="padding:0; background:none; border:none;">
          <svg class="trash-animated" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48">
            <path fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="3" d="M29.5,11.5V11c0-3-2.5-5.5-5.5-5.5S18.5,8,18.5,11v0.5"></path>
            <line x1="7.5" x2="40.5" y1="11.5" y2="11.5" fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="3"></line>
            <line x1="36.5" x2="38" y1="27" y2="11.5" fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="3"></line>
            <path fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="3" d="M10.7,18.6l2,20.3c0.2,2.1,1.9,3.6,4,3.6h14.7c2.1,0,3.8-1.6,4-3.6l0.5-4.8"></path>
          </svg>
        </button>
      `;
      li.style.display = 'grid';
      li.style.gridTemplateColumns = '72px 1fr 160px 120px 60px';

      // handlers
      li.querySelector('.minus').addEventListener('click', () => {
        const c = readCart();
        c[i].qty = Math.max(1, c[i].qty - 1);
        writeCart(c); draw();
      });
      li.querySelector('.plus').addEventListener('click', () => {
        const c = readCart();
        c[i].qty += 1;
        writeCart(c); draw();
      });
      li.querySelector('.cart-remove').addEventListener('click', () => {
        const c = readCart();
        c.splice(i,1);
        writeCart(c); draw();
      });
      li.querySelector('input').addEventListener('change', (e) => {
        const val = Math.max(1, parseInt(e.target.value.replace(/\D/g,''),10) || 1);
        const c = readCart();
        c[i].qty = val;
        writeCart(c); draw();
      });

      list.appendChild(li);
    });

    document.getElementById('cartTotal').textContent = formatUSD(total);
    document.getElementById('sumCount').textContent = `${totalQty} producto${totalQty === 1 ? '' : 's'}`;
    document.getElementById('sumSubtotal').textContent = `USD ${total.toFixed(2)}`;
    updateCartBadge();

    // Mostrar total en moneda local según país detectado
    const localDiv = document.getElementById('cartTotalLocal');
    function setLocalCurrency(country) {
      // Tabla de monedas populares
      const currencies = {
        AR: { rate: 950, symbol: '$', code: 'ARS', locale: 'es-AR' },
        UY: { rate: 39, symbol: '$', code: 'UYU', locale: 'es-UY' },
        BR: { rate: 5.2, symbol: 'R$', code: 'BRL', locale: 'pt-BR' },
        CL: { rate: 950, symbol: '$', code: 'CLP', locale: 'es-CL' },
        MX: { rate: 18, symbol: '$', code: 'MXN', locale: 'es-MX' },
        US: { rate: 1, symbol: '$', code: 'USD', locale: 'en-US' },
        ES: { rate: 0.95, symbol: '€', code: 'EUR', locale: 'es-ES' },
        CO: { rate: 4100, symbol: '$', code: 'COP', locale: 'es-CO' },
        PE: { rate: 3.7, symbol: 'S/', code: 'PEN', locale: 'es-PE' },
        EC: { rate: 1, symbol: '$', code: 'USD', locale: 'es-EC' },
        PY: { rate: 7300, symbol: '₲', code: 'PYG', locale: 'es-PY' },
        BO: { rate: 6.9, symbol: 'Bs', code: 'BOB', locale: 'es-BO' },
        VE: { rate: 36, symbol: 'Bs', code: 'VES', locale: 'es-VE' },
        CR: { rate: 530, symbol: '₡', code: 'CRC', locale: 'es-CR' },
        PA: { rate: 1, symbol: 'B/.', code: 'PAB', locale: 'es-PA' },
        GT: { rate: 7.8, symbol: 'Q', code: 'GTQ', locale: 'es-GT' },
        DO: { rate: 57, symbol: 'RD$', code: 'DOP', locale: 'es-DO' },
        HN: { rate: 24.7, symbol: 'L', code: 'HNL', locale: 'es-HN' },
        SV: { rate: 8.75, symbol: '$', code: 'USD', locale: 'es-SV' },
        NI: { rate: 36.5, symbol: 'C$', code: 'NIO', locale: 'es-NI' },
      };
      const c = currencies[country] || { rate: 1, symbol: '$', code: 'USD', locale: 'en-US' };
      const totalLocal = Math.round(total * c.rate);
      if (localDiv) {
        if (c.code !== 'USD' || country === 'EC' || country === 'SV' || country === 'PA') {
          localDiv.textContent = `≈ ${c.symbol}${totalLocal.toLocaleString(c.locale)} ${c.code}`;
        } else {
          localDiv.textContent = '';
        }
      }
    }
    // Detectar país por geolocalización IP (servicio externo)
    if (window._userCountry) {
      setLocalCurrency(window._userCountry);
    } else {
      fetch('https://ipapi.co/country/').then(r=>r.text()).then(code=>{
        window._userCountry = code.trim();
        setLocalCurrency(window._userCountry);
      }).catch(()=>{
        setLocalCurrency('USD');
      });
    }

    // Mostrar ahorro si hay descuentos
    let saving = 0;
    cart.forEach(it => {
      if (it.discount) {
        saving += (it.discount * it.qty);
      }
    });
    const savingDiv = document.getElementById('cartSaving');
    if (savingDiv) {
      if (saving > 0) {
        savingDiv.textContent = `¡Ahorrás USD ${saving.toFixed(2)} en descuentos!`;
        savingDiv.style.display = 'block';
      } else {
        savingDiv.style.display = 'none';
      }
    }
  }

  window.draw = draw; // Make draw accessible globally
  draw();

  document.getElementById('clearCart')?.addEventListener('click', () => {
    writeCart([]); 
    renderToast('Carrito vacío.');
    draw();
  });

  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    // Verificar que hay items en el carrito
    const cart = readCart();
    if (!cart.length) {
      renderToast('El carrito está vacío');
      return;
    }
    // Verificar usuario logueado
    const u = readUser();
    if (!u || !u.email) {
      // Mostrar cartelito coqueto antes del modal
      let msgModal = document.getElementById('loginMsgModal');
      if (!msgModal) {
        msgModal = document.createElement('div');
        msgModal.id = 'loginMsgModal';
        msgModal.style.position = 'fixed';
        msgModal.style.top = 0;
        msgModal.style.left = 0;
        msgModal.style.width = '100vw';
        msgModal.style.height = '100vh';
        msgModal.style.background = 'rgba(255,255,255,0.85)';
        msgModal.style.display = 'flex';
        msgModal.style.alignItems = 'center';
        msgModal.style.justifyContent = 'center';
        msgModal.style.zIndex = 9999;
        msgModal.innerHTML = `
          <div style="background:#fff;border-radius:18px;box-shadow:0 8px 32px #e48bb299;padding:2em 2.5em;text-align:center;max-width:340px;">
            <h3 style="color:#e48bb2;font-size:1.3em;margin-bottom:0.7em;">¡Hola! 🌸</h3>
            <p style="font-size:1.1em;margin-bottom:1.2em;">Para finalizar tu compra y acceder a los cursos, primero iniciá sesión o creá tu cuenta.<br><br><span style="color:#e48bb2;font-weight:bold">¡Tu carrito está guardado!</span></p>
            <button id="loginMsgOk" style="background:#c7a4e7;color:#fff;border:none;border-radius:8px;padding:0.7em 1.5em;font-size:1em;cursor:pointer;">Iniciar sesión</button>
          </div>
        `;
        document.body.appendChild(msgModal);
        document.getElementById('loginMsgOk').onclick = function(){
          msgModal.remove();
          window.openAuth && window.openAuth('login');
        };
      }
      return;
    }
    // Si está logueada, mostrar loader y luego redirigir
    let loader = document.getElementById('cartLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'cartLoader';
      loader.style.position = 'fixed';
      loader.style.top = 0;
      loader.style.left = 0;
      loader.style.width = '100vw';
      loader.style.height = '100vh';
      loader.style.background = 'rgba(255,255,255,0.85)';
      loader.style.display = 'flex';
      loader.style.flexDirection = 'column';
      loader.style.alignItems = 'center';
      loader.style.justifyContent = 'center';
      loader.style.zIndex = 9999;
      loader.innerHTML = `
        <div class="loader" style="width:48px;height:48px;border:6px solid #e48bb2;border-top:6px solid #fff;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:1em;"></div>
        <p style="font-size:1.2em;color:#e48bb2;text-align:center;">Preparando tu checkout…</p>
      `;
      document.body.appendChild(loader);
      if (!document.getElementById('loaderStyle')) {
        const style = document.createElement('style');
        style.id = 'loaderStyle';
        style.textContent = `@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`;
        document.head.appendChild(style);
      }
    }
    setTimeout(() => {
      loader.remove();
      window.location.href = 'checkout.html';
    }, 1200);
  });

  function renderToast(msg){
    let t = document.getElementById('toast');
    if (!t){
      t = document.createElement('div');
      t.id = 'toast';
      t.style.position='fixed'; t.style.left='50%'; t.style.bottom='20px';
      t.style.transform='translateX(-50%)';
      t.style.background='#333'; t.style.color='#fff'; t.style.padding='10px 14px';
      t.style.borderRadius='10px'; t.style.boxShadow='0 8px 20px #00000033';
      t.style.zIndex='9999'; document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity='1';
    setTimeout(()=> t.style.opacity='0', 1400);
  }
})();

/* ======= Usuario en localStorage + UI de navbar ======= */
const USER_KEY = 'espaciopaz_user_v1';

function readUser(){
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}
function writeUser(u){ localStorage.setItem(USER_KEY, JSON.stringify(u)); }
// Eliminar solo el usuario
function clearUser(){ localStorage.removeItem(USER_KEY); }

// Limpiar TODO el estado de la usuaria en localStorage (logout completo)
function clearAllUserData(){
  try {
    // Claves conocidas
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('espaciopaz_favs_v1');
    localStorage.removeItem('espaciopaz_cart_v1');
    // Quitar cualquier clave de curso: owned_, done_, dur_
    const prefixes = ['owned_', 'done_', 'dur_'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const p of prefixes) {
        if (key.startsWith(p)) { localStorage.removeItem(key); break; }
      }
      // Borrar keys relacionadas con membresía/checkout/otros
      if (key === 'pazJoinIntent' || key === 'pazUser' || key === 'STATE_CHECKOUT' || key === 'pazIntent') {
        localStorage.removeItem(key);
      }
    }
  } catch(e){ console.error('clearAllUserData failed', e); }
}
window.clearAllUserData = clearAllUserData;

function initialsFromName(nameOrEmail){
  const s = (nameOrEmail || '').trim();
  if (!s) return 'U';
  // Si viene email, usa lo anterior a @
  const base = s.includes('@') ? s.split('@')[0] : s;
  const parts = base.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Render dinámico del área de autenticación
function renderAuthUI(){
  const mount = document.getElementById('authArea');
  if (!mount) return;
  const u = readUser();

  if (!u){
    mount.innerHTML = `
      <a href="#" data-open="login">Iniciar sesión</a>
      <a href="#" data-open="register">Registrarse</a>
    `;
    // reengancha los triggers del modal si los usás
    mount.querySelector('[data-open="login"]')?.addEventListener('click', e=>{ e.preventDefault(); openAuth?.('login'); });
    mount.querySelector('[data-open="register"]')?.addEventListener('click', e=>{ e.preventDefault(); openAuth?.('register'); });
    return;
  }

  // Íconos minimalistas para cada item
  const iconHeart = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  const iconUser = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>`;
  const iconStar = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>`;
  const iconBag = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M6 2l1.5 4h9L18 2"/><rect x="3" y="6" width="18" height="16" rx="2"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
  const iconLogout = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

  let avatarHtml = '';
  if (u.avatar) {
    avatarHtml = `<span class="user-avatar"><img src="${u.avatar}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;"></span>`;
  } else {
    const initials = initialsFromName(u.name || u.email);
    avatarHtml = `<span class="user-avatar">${initials}</span>`;
  }
  mount.innerHTML = `
    <div class="user-menu" id="userMenu">
      <button class="user-toggle" type="button" aria-haspopup="menu" aria-expanded="false">
        ${avatarHtml}
        <span>${u.name || u.email}</span>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="user-dropdown" role="menu">
        <a href="/html/cuenta.html#resumen" role="menuitem">${iconUser}<span>Mi cuenta</span></a>
        <a href="/html/cuenta.html#favoritos" role="menuitem" class="user-fav">${iconHeart}<span>Favoritos</span></a>
        <a href="/html/membresia.html" role="menuitem">${iconStar}<span>Membresía</span></a>
  <a href="/html/cuenta.html#pedidos" role="menuitem">${iconBag}<span>Compras</span></a>
        <button type="button" id="btnLogout" role="menuitem">${iconLogout}<span>Cerrar sesión</span></button>
      </div>
    </div>
  `;

  const menu = mount.querySelector('#userMenu');
  const toggle = menu.querySelector('.user-toggle');
  const dropdown = menu.querySelector('.user-dropdown');

  // abrir/cerrar
  toggle.addEventListener('click', ()=>{
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // cerrar al click fuera
  document.addEventListener('click', (e)=>{
    if (!menu.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    }
  });
  // logout
  menu.querySelector('#btnLogout')?.addEventListener('click', ()=>{
    // Clear all user data (owned courses, favs, cart, etc.)
    if (typeof clearAllUserData === 'function') clearAllUserData();
    // Update any UI widgets on this page
    renderAuthUI();
    // Emit logout event for other modules to react (curso.js listens to this)
    try { window.dispatchEvent(new Event('logout')); } catch(e){}
    // Show a universal logout screen/overlay (with hourglass), then redirect to index
    showLogoutScreen({ message: '⏳ Cerrando sesión...', redirect: '/index.html', delay: 900 });
  });
}

// Hookear el login/registro existentes para guardar el usuario:
(function hookAuthForms(){
  const loginForm = document.getElementById('panelLogin');
  const regForm = document.getElementById('panelRegister');

  loginForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim();
    if (!email) return;
    // Podés validar contraseña aquí si tenés backend; por ahora guardamos
    const name = email.split('@')[0];
    writeUser({ email, name });
    // feedback que ya hacías
    const msg = document.getElementById('loginMsg');
    if (msg) msg.textContent = 'Bienvenida ✨';
    // cerrar modal y actualizar UI
    setTimeout(()=>{
      typeof closeAuth === 'function' && closeAuth();
      renderAuthUI();
    }, 400);
  });

  regForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    if (!email) return;
    writeUser({ email, name: name || email.split('@')[0] });
    const msg = document.getElementById('regMsg');
    if (msg) msg.textContent = 'Cuenta creada ✓';
    setTimeout(()=>{
      typeof closeAuth === 'function' && closeAuth();
      renderAuthUI();
    }, 400);
  });
})();

// Pintar al cargar
document.addEventListener('DOMContentLoaded', renderAuthUI);

// ===== Pantalla universal de cierre de sesión (overlay) =====
function showLogoutScreen({ message = '⏳ Cerrando sesión...', redirect = null, delay = 1200 } = {}){
  try{
    // Use the same simple overlay previously used in curso.js so behaviour is identical
    let overlay = document.getElementById('logoutOverlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'logoutOverlay';
      overlay.style.position = 'fixed';
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.background = 'rgba(255,255,255,0.85)';
      overlay.style.zIndex = 99999;
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.fontSize = '1.75rem';
      overlay.style.fontWeight = '700';
      overlay.style.color = '#444';
      overlay.style.transition = 'opacity 0.4s ease';
      overlay.innerHTML = `<span>${message}</span>`;
      document.body.appendChild(overlay);
    } else {
      overlay.textContent = message;
      overlay.style.opacity = '';
      overlay.style.display = 'flex';
    }

    setTimeout(() => {
      // If redirect is provided, navigate there; otherwise reload the page (same behavior as index overlay)
      if (redirect) {
        try { window.location.href = redirect; } catch(e){ console.error('redirect after logout failed', e); }
      } else {
        try { overlay.style.opacity = 0; } catch(e){}
        setTimeout(() => { try { location.reload(); } catch(e){ console.error(e); } }, 400);
      }
    }, delay);
  } catch(e){ console.error('showLogoutScreen error', e); }
}



/* ======= Carrusel de opiniones ======= */
const opiniones = [
  {
    texto: "“Las meditaciones me ayudaron muchísimo a encontrar calma en mi día a día. ¡Gracias Paz!”",
    autor: "— Lucía G."
  },
  {
    texto: "“El curso de Reiki superó mis expectativas. Muy claro y amoroso.”",
    autor: "— Mariana S."
  },
  {
    texto: "“Me encantó la variedad de prácticas y la calidez de Paz. Lo recomiendo.”",
    autor: "— Florencia R."
  }
];

let idx = 0;
let autoSlide;
const carrusel = document.getElementById('carruselOpiniones');

function crearBlockquote(opinion) {
  const block = document.createElement('blockquote');
  block.innerHTML = `<p>${opinion.texto}</p><footer>${opinion.autor}</footer>`;
  return block;
}

function mostrarOpinion(nuevoIdx, animacion = 'der') {
  if (!carrusel) return;
  const actual = carrusel.querySelector('blockquote');
  const nueva = crearBlockquote(opiniones[nuevoIdx]);
  nueva.classList.add(`entrada-${animacion}`);
  carrusel.appendChild(nueva);

  if (actual) {
    actual.classList.add(`salida-${animacion}`);
    setTimeout(() => {
      if (actual.parentNode) actual.parentNode.removeChild(actual);
    }, 500);
  }
  setTimeout(() => {
    nueva.classList.remove(`entrada-${animacion}`);
  }, 20); // para que la transición se aplique
  idx = nuevoIdx;
}

function siguienteOpinion(manual = false) {
  let nuevoIdx = (idx + 1) % opiniones.length;
  mostrarOpinion(nuevoIdx, 'der');
  if (manual) reiniciarAuto();
}
function anteriorOpinion(manual = false) {
  let nuevoIdx = (idx - 1 + opiniones.length) % opiniones.length;
  mostrarOpinion(nuevoIdx, 'izq');
  if (manual) reiniciarAuto();
}

function reiniciarAuto() {
  clearInterval(autoSlide);
  autoSlide = setInterval(siguienteOpinion, 5000);
}

const _prevOpinionBtn = document.getElementById('prevOpinion');
const _nextOpinionBtn = document.getElementById('nextOpinion');
if (_prevOpinionBtn) _prevOpinionBtn.onclick = () => anteriorOpinion(true);
if (_nextOpinionBtn) _nextOpinionBtn.onclick = () => siguienteOpinion(true);

// Inicializar
mostrarOpinion(idx, 'der');
autoSlide = setInterval(siguienteOpinion, 5000);

// ===== Carrusel de opiniones (autoplay, animado, centrado) =====
(() => {
  const opiniones = [
    {
      texto: "“Las meditaciones me ayudaron muchísimo a encontrar calma en mi día a día. ¡Gracias Paz!”",
      autor: "— Lucía G."
    },
    {
      texto: "“El curso de Reiki superó mis expectativas. Muy claro y amoroso.”",
      autor: "— Mariana S."
    },
    {
      texto: "“Me encantó la variedad de prácticas y la calidez de Paz. Lo recomiendo.”",
      autor: "— Florencia R."
    }
  ];
  let idx = 0;
  let autoSlide;
  const carrusel = document.getElementById('carruselOpiniones');
  function crearBlockquote(opinion) {
    const block = document.createElement('blockquote');
    block.innerHTML = `<p>${opinion.texto}</p><footer>${opinion.autor}</footer>`;
    return block;
  }
  function mostrarOpinion(nuevoIdx, animacion = 'der') {
    if (!carrusel) return;
    const actual = carrusel.querySelector('blockquote');
    const nueva = crearBlockquote(opiniones[nuevoIdx]);
    nueva.classList.add(`entrada-${animacion}`);
    carrusel.appendChild(nueva);
    if (actual) {
      actual.classList.add(`salida-${animacion}`);
      setTimeout(() => {
        if (actual.parentNode) actual.parentNode.removeChild(actual);
      }, 500);
    }
    setTimeout(() => {
      nueva.classList.remove(`entrada-${animacion}`);
    }, 20);
    idx = nuevoIdx;
  }
  function siguienteOpinion(manual = false) {
    let nuevoIdx = (idx + 1) % opiniones.length;
    mostrarOpinion(nuevoIdx, 'der');
    if (manual) reiniciarAuto();
  }
  function anteriorOpinion(manual = false) {
    let nuevoIdx = (idx - 1 + opiniones.length) % opiniones.length;
    mostrarOpinion(nuevoIdx, 'izq');
    if (manual) reiniciarAuto();
  }
  function reiniciarAuto() {
    clearInterval(autoSlide);
    autoSlide = setInterval(siguienteOpinion, 5000);
  }
  const _prevOpinionBtn2 = document.getElementById('prevOpinion');
  const _nextOpinionBtn2 = document.getElementById('nextOpinion');
  if (_prevOpinionBtn2) _prevOpinionBtn2.onclick = () => anteriorOpinion(true);
  if (_nextOpinionBtn2) _nextOpinionBtn2.onclick = () => siguienteOpinion(true);
  mostrarOpinion(idx, 'der');
  autoSlide = setInterval(siguienteOpinion, 5000);
})();

document.addEventListener("DOMContentLoaded", () => {
  const fab = document.querySelector(".fab-cta");
  const footer = document.querySelector(".site-footer");

  if (!fab || !footer || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        fab.classList.add("fab-up");   // footer visible → subimos la FAB
      } else {
        fab.classList.remove("fab-up"); // footer oculto → FAB en su lugar normal
      }
    },
    { root: null, threshold: 0.01 }
  );

  io.observe(footer);
});
