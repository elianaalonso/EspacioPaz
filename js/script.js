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
(function(){
  const $input  = document.getElementById('searchInput');
  const $toggle = document.getElementById('searchToggle');
  const $wrap   = document.getElementById('searchWrap');
  const $panel  = document.getElementById('searchResults');
  const $cards  = document.querySelectorAll('.cursos-grid .curso-card');

  if (!$input || !$panel || !$wrap || !$cards.length) return;

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

  // Construir índice desde las cards existentes
  const norm = s => (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const items = Array.from($cards).map(card => {
    const title = card.querySelector('h3')?.textContent?.trim() || '';
    const desc  = card.querySelector('p')?.textContent?.trim()  || '';
    const img   = card.querySelector('.curso-media img')?.getAttribute('src') || '';
    const link  = card.querySelector('.btn-cart')?.getAttribute('href') || '#';
    return { title, desc, img, link, _t: norm(title), _d: norm(desc) };
  });

  // Filtrado + render
  let pos = -1; // posición activa en la lista
  let t = null;

  $input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = $input.value.trim();
      if (!q) { closePanel(); return; }
      const nq = norm(q);
      const res = items.filter(it => it._t.includes(nq) || it._d.includes(nq)).slice(0, 6);
      renderResults(res, q);
    }, 120);
  });

  function highlight(text, q){
    if (!q) return text;
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(esc, 'ig'), m => `<mark>${m}</mark>`);
  }

  function renderResults(list, q){
    if (!list.length) {
      $panel.innerHTML = `<div class="search-empty">No se encontraron cursos para “${q}”.</div>`;
      $panel.classList.add('show'); pos = -1; return;
    }
    $panel.innerHTML = list.map((it,i)=>`
      <a class="search-item" href="${it.link}" data-idx="${i}">
        <span class="search-thumb"><img src="${it.img}" alt=""></span>
        <span class="search-text">
          <h4>${highlight(it.title, q)}</h4>
          <p>${highlight(it.desc, q)}</p>
        </span>
      </a>
    `).join('');
    $panel.classList.add('show'); pos = -1;

    // click fuera cierra (se re-registra tras render)
    setTimeout(() => {
      document.addEventListener('click', onDocClick, { once:true });
    }, 0);
  }

  function onDocClick(e){
    if (!$wrap.contains(e.target)) closePanel();
    else document.addEventListener('click', onDocClick, { once:true }); // seguir escuchando hasta click fuera
  }

  function closePanel(){
    $panel.classList.remove('show');
    $panel.innerHTML = '';
    $input.value = '';
    pos = -1;
  }

  // Teclado: / enfoca, Esc cierra, ▲▼ navega, Enter abre
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $input) {
      e.preventDefault(); $wrap.classList.add('open'); $input.focus(); return;
    }
    if (e.key === 'Escape') { closePanel(); $wrap.classList.remove('open'); $input.blur(); return; }

    if (!$panel.classList.contains('show')) return;
    const $items = Array.from($panel.querySelectorAll('.search-item'));
    if (!$items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      pos = (pos + 1) % $items.length;
      setActive($items, pos);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      pos = (pos - 1 + $items.length) % $items.length;
      setActive($items, pos);
    } else if (e.key === 'Enter' && pos >= 0) {
      e.preventDefault();
      $items[pos].click();
    }
  });

  function setActive(nodes, idx){
    nodes.forEach(n => n.classList.remove('active'));
    const n = nodes[idx];
    if (n) {
      n.classList.add('active');
      n.scrollIntoView({ block: 'nearest' });
    }
  }

  // Cierre automático al sacar el mouse del área (input + lupa + panel)
  $wrap.addEventListener('mouseleave', () => {
    if ($wrap.classList.contains('open')) {
      setTimeout(() => {
        if (! $wrap.matches(':hover')) {
          $wrap.classList.remove('open');
          closePanel();
        }
      }, 200);
    }
  });
})();

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
function clearUser(){ localStorage.removeItem(USER_KEY); }

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

  const initials = initialsFromName(u.name || u.email);
  mount.innerHTML = `
    <div class="user-menu" id="userMenu">
      <button class="user-toggle" type="button" aria-haspopup="menu" aria-expanded="false">
        <span class="user-avatar">${initials}</span>
        <span>${u.name || u.email}</span>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="user-dropdown" role="menu">
  <a href="/html/cuenta.html" role="menuitem">${iconUser}<span>Mi cuenta</span></a>
  <a href="/html/favoritos.html" role="menuitem" class="user-fav">${iconHeart}<span>Favoritos</span></a>
        <a href="/html/membresia.html" role="menuitem">${iconStar}<span>Membresía</span></a>
        <a href="/html/compras.html" role="menuitem">${iconBag}<span>Compras</span></a>
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
    clearUser();
    renderAuthUI();
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

document.getElementById('prevOpinion').onclick = () => anteriorOpinion(true);
document.getElementById('nextOpinion').onclick = () => siguienteOpinion(true);

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
  document.getElementById('prevOpinion').onclick = () => anteriorOpinion(true);
  document.getElementById('nextOpinion').onclick = () => siguienteOpinion(true);
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
