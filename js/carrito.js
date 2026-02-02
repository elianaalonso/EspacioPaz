/* ================== CARRITO (localStorage) ================== */
const CART_KEY = 'espaciopaz_cart_v1';

function readCart(){
  try { 
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    // Limpiar automáticamente si hay precios en pesos (mayores a 500)
    const hasOldPrices = cart.some(item => Number(item.price) > 500);
    if (hasOldPrices) {
      console.log('Limpiando carrito con precios antiguos...');
      localStorage.removeItem(CART_KEY);
      return [];
    }
    return cart;
  }
  catch { return []; }
}

function writeCart(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function cartCount(){
  return readCart().reduce((acc, it) => acc + (it.qty || 0), 0);
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
  void btn.offsetWidth; // reflow
  btn.classList.add('bump');
}

/* ===== Formato de dinero =====
   Queremos: "USD 12.000" (sin .00) */
function formatUSD(n){
  const value = Number(n) || 0;
  return `USD ${value.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`;
}

/* ================== ADD TO CART (CURSOS) ================== */

// Para cards (cursos.html)
function addToCartFromCard(btn){
  console.log('🛒 addToCartFromCard ejecutándose...', btn);
  
  // Si ya fue procesado, no hacer nada
  if (btn.dataset.inCart === 'true') {
    console.log('⚠️ Ya estaba en carrito, saliendo...');
    return;
  }
  
  const card = btn.closest('.curso-card, .course-card');
  if (!card) return;

  const id = btn.getAttribute('data-add') || btn.getAttribute('data-id') || card.dataset.href || crypto.randomUUID();
  const name = (card.querySelector('h3, .course-card__title')?.textContent || 'Curso').trim();

  // Si la card tiene algo tipo "$ 5.500", limpiamos
  const priceText = (card.querySelector('.price')?.textContent || '0')
    .replace(/[^\d.,]/g,'')
    .replace(/\./g,'')     // saca separador miles si lo usan
    .replace(',','.');     // coma decimal a punto (por si acaso)

  const price = parseFloat(priceText) || 0;
  
  // Buscar imagen: intentar varios selectores
  let img = '';
  const imgSelectors = [
    '.curso-media img',
    '.course-card__media img',
    '.course-card img',
    'img'
  ];
  
  for (let selector of imgSelectors) {
    const imgEl = card.querySelector(selector);
    if (imgEl) {
      img = imgEl.getAttribute('src') || '';
      if (img) break; // Si encontramos una, salimos
    }
  }
  
  // Normalizar ruta de imagen: si empieza con /, convertir a ../
  if (img && img.startsWith('/')) {
    img = '..' + img;
  }
  
  const href = card.dataset.href || card.querySelector('a')?.getAttribute('href') || '';

  const cart = readCart();

  // Revisar si ya existe
  const existing = cart.find(it => it.id === id);
  if (existing){
    console.log('⚠️ Curso ya existe en carrito');
    return;
  }

  // No existe, agregarlo
  cart.push({ id, name, price, img, qty: 1, href });

  writeCart(cart);
  updateCartBadge();
  animateCartIcon();

  // Marcar botón como agregado PERMANENTEMENTE
  btn.disabled = true;
  btn.classList.add('added');
  btn.textContent = 'Agregado ✓';
  btn.dataset.inCart = 'true'; // Marcar para evitar duplicados
  
  console.log('✅ Botón marcado:', btn.textContent, 'disabled:', btn.disabled);

  if (document.getElementById('cartList') && typeof window.draw === 'function') {
    window.draw();
  }
}

// Exponer globalmente para cursos.js
window.addToCartFromCard = addToCartFromCard;

// Para páginas de curso (curso.html)
function addCourseFromCoursePage(btn){
  // Si ya fue procesado, no hacer nada
  if (btn.dataset.inCart === 'true') return;
  
  const courseId = btn.getAttribute('data-course-id') || document.body.dataset.courseId;
  const price = Number(btn.getAttribute('data-price') || 0);

  const title =
    document.querySelector('#curso-titulo')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    'Curso';

  // Intentar sacar una imagen (si hay)
  let img =
    document.querySelector('.profe__foto')?.getAttribute('src') ||
    '';
  
  // Normalizar ruta de imagen: si empieza con /, convertir a ../
  if (img && img.startsWith('/')) {
    img = '..' + img;
  }

  const href = window.location.pathname;

  const cart = readCart();
  const existing = cart.find(it => it.id === courseId);

  if (existing){
    // Ya está en carrito, no agregar de nuevo
    return;
  }

  cart.push({ id: courseId, name: title, price, img, qty: 1, href });

  writeCart(cart);
  updateCartBadge();
  animateCartIcon();
  
  // Marcar botón como agregado
  btn.disabled = true;
  btn.classList.add('added');
  btn.textContent = 'Agregado ✓';
  btn.dataset.inCart = 'true'; // Marcar para evitar duplicados
}

// Exponemos una API global para que curso.js la use
window.cartApi = {
  addCourseAndGo(btn){
    addCourseFromCoursePage(btn);

    // Desde /html/cursos/*.html => ../carrito.html
    // Desde otros => carrito.html
    const isCoursePage = window.location.pathname.includes('/cursos/');
    window.location.href = isCoursePage ? '../carrito.html' : 'carrito.html';
  }
};


/* ================== BINDS (Agregar al carrito) ================== */

// Usar delegación de eventos para capturar TODOS los clicks en botones de carrito
// Esto funciona incluso si los botones se regeneran dinámicamente
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-cart, .add-cart');
  if (!btn) return;
  
  e.stopPropagation();
  e.stopImmediatePropagation();
  e.preventDefault();
  
  console.log('🎯 Click detectado en botón carrito');
  addToCartFromCard(btn);
}, true); // capture phase = ejecutar ANTES que cualquier otro listener

// Marcar botones que ya están en el carrito
function markCartButtons() {
  const cart = readCart();
  const cartIds = new Set(cart.map(it => it.id));
  
  document.querySelectorAll('.btn-cart, .add-cart').forEach(btn => {
    const card = btn.closest('.curso-card, .course-card');
    if (!card) return;
    
    const id = btn.getAttribute('data-add') || btn.getAttribute('data-id') || card.dataset.href;
    if (cartIds.has(id)) {
      btn.disabled = true;
      btn.classList.add('added');
      btn.textContent = 'Agregado ✓';
      btn.dataset.inCart = 'true'; // Marcar como procesado
      console.log('🔖 Botón marcado al cargar:', id);
    }
  });
}

// Exponer globalmente para que cursos.js pueda usarla
window.markCartButtons = markCartButtons;

// Badge y marcar botones al cargar
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  markCartButtons();
});

// También marcar después de que se agregue algo al carrito
window.addEventListener('storage', (e) => {
  if (e.key === CART_KEY) {
    updateCartBadge();
    markCartButtons();
  }
});


/* ================== RENDER CARRITO ================== */
(function renderCartPage(){
  const list = document.getElementById('cartList');
  if (!list) return; // no estamos en carrito.html

  let courseCatalogPromise = null;
  let courseCatalogMap = null;

  function normalizeCatalogLink(link){
    if (!link) return '';
    let raw = link;
    try {
      if (/^https?:/i.test(raw)) raw = new URL(raw).pathname;
    } catch {}
    raw = raw.split('#')[0].split('?')[0];
    raw = raw.replace(/^\.+\//g, '');
    raw = raw.replace(/^\//, '');
    return raw;
  }

  function ensureCourseCatalog(){
    if (courseCatalogPromise) return courseCatalogPromise;
    courseCatalogPromise = fetch('../datos/cursos.json')
      .then(res => res.ok ? res.json() : [])
      .then(list => {
        const byId = new Map();
        const byLink = new Map();
        (Array.isArray(list) ? list : []).forEach(item => {
          if (item?.id) byId.set(item.id, item);
          const link = normalizeCatalogLink(item?.link);
          if (link) byLink.set(link, item);
        });
        courseCatalogMap = { byId, byLink };
        return courseCatalogMap;
      })
      .catch(() => {
        courseCatalogMap = { byId: new Map(), byLink: new Map() };
        return courseCatalogMap;
      });
    return courseCatalogPromise;
  }

  function resolveCartImageUrl(img){
    const fallback = '../img/usuario-default.jpeg';
    if (!img) return fallback;
    const raw = String(img).trim();
    if (!raw) return fallback;
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('../') || raw.startsWith('./')) return raw;
    if (raw.startsWith('img/')) return `../${raw}`;
    return raw;
  }

  function draw(){
    const cart = readCart();
    list.innerHTML = '';

    const emptyMsg = document.getElementById('cartEmptyMsg');
    if (!cart.length){
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

    if (!courseCatalogMap) {
      ensureCourseCatalog().then(() => draw());
    }

    let shouldWrite = false;

    cart.forEach((it, i) => {
      // seguridad: curso digital qty=1
      it.qty = 1;

      const li = document.createElement('li');
      li.className = 'cart-item';
      totalQty += it.qty;
      total += (Number(it.price)||0) * it.qty;

      // Resolver imagen: usar catálogo si falta
      if (!it.img && courseCatalogMap) {
        const fromId = courseCatalogMap.byId.get(it.id);
        const fromLink = courseCatalogMap.byLink.get(normalizeCatalogLink(it.href));
        const src = fromId?.image?.src || fromLink?.image?.src || '';
        if (src) {
          it.img = src;
          shouldWrite = true;
        }
      }

      // Normalizar img: si viene vacío, fallback
      const imgSrc = resolveCartImageUrl(it.img);

      li.innerHTML = `
        <img src="${imgSrc}" alt="" class="cart-thumb">

        <div class="cart-info">
          <strong>${it.name}</strong>
        </div>

        <!-- Cantidad: cursos digitales => fijo en 1 -->
        <div class="cart-qty" style="justify-content:flex-start; opacity:.6;">
          <button type="button" class="q minus" aria-label="Quitar uno" disabled>−</button>
          <input type="text" value="1" inputmode="numeric" aria-label="Cantidad" readonly
            style="text-align:center; margin-left:0; background:transparent;">
          <button type="button" class="q plus" aria-label="Agregar uno" disabled>+</button>
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
      li.style.gridTemplateColumns = '72px 1fr 160px 140px 60px';

      li.querySelector('.cart-remove').addEventListener('click', () => {
        const c = readCart();
        c.splice(i, 1);
        writeCart(c);
        draw();
      });

      list.appendChild(li);
    });

    if (shouldWrite) writeCart(cart);

    document.getElementById('cartTotal').textContent = formatUSD(total);
    document.getElementById('sumCount').textContent = `${totalQty} producto${totalQty === 1 ? '' : 's'}`;
    document.getElementById('sumSubtotal').textContent = `USD ${total.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`;
    updateCartBadge();

    const localDiv = document.getElementById('cartTotalLocal');
    renderLocalTotal(localDiv, total);
  }

  window.draw = draw;
  draw();

  // Vaciar carrito
  document.getElementById('clearCart')?.addEventListener('click', () => {
    writeCart([]);
    renderToast('Carrito vacío.');
    draw();
  });

  // ===== Loader full screen (Carrito -> Checkout) | Espacio Paz =====
  function showCheckoutLoader(message = 'Preparando tu checkout…') {
    let overlay = document.getElementById('cartLoaderOverlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cartLoaderOverlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');

      // Si querés que muestre el logo, dejá este true.
      // Si no querés logo, ponelo en false.
      const SHOW_LOGO = true;

      overlay.innerHTML = `
        <div class="ep-loader__wrap" aria-label="Cargando">
          <div class="ep-loader__card">
            ${SHOW_LOGO ? `
              <div class="ep-loader__brand" aria-hidden="true">
                <img src="../img/logo.png" alt="" class="ep-loader__logo">
                <span class="ep-loader__name">Espacio Paz</span>
              </div>
            ` : ''}

            <div class="ep-loader__row">
              <div class="ep-loader__spinner" aria-hidden="true"></div>
              <div class="ep-loader__text">
                <p class="ep-loader__title"></p>
                <p class="ep-loader__sub">Un segundo…</p>
              </div>
            </div>

            <div class="ep-loader__bar" aria-hidden="true">
              <span></span>
            </div>

            <div class="ep-loader__dots" aria-hidden="true">
              <i></i><i></i><i></i>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
    }

    const title = overlay.querySelector('.ep-loader__title');
    if (title) title.textContent = message;

    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
  }

  function hideCheckoutLoader() {
    const overlay = document.getElementById('cartLoaderOverlay');
    if (overlay) overlay.remove();
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
  }

  // Ir a pagar (primero login, luego loader)
  document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
    const cart = readCart();
    if (!cart.length) {
      renderToast('El carrito está vacío');
      return;
    }

    // 1) Validar login ANTES del loader
    // Checkear localStorage directamente (key correcta)
    const userStored = localStorage.getItem('espaciopaz_user_v1');
    const isLogged = userStored ? !!JSON.parse(userStored)?.email : false;

    if (!isLogged) {
      // Guardar intención (para redirigir post-login)
      sessionStorage.setItem('postAuthRedirect', 'checkout.html');

      // Mostrar cartel lindo en el medio
      if (!document.getElementById('cartLoginModal')) {
        const msgModal = document.createElement('div');
        msgModal.id = 'cartLoginModal';
        msgModal.style.position = 'fixed';
        msgModal.style.top = 0;
        msgModal.style.left = 0;
        msgModal.style.width = '100vw';
        msgModal.style.height = '100vh';
        msgModal.style.background = 'rgba(255,255,255,0.85)';
        msgModal.style.backdropFilter = 'blur(8px)';
        msgModal.style.display = 'flex';
        msgModal.style.alignItems = 'center';
        msgModal.style.justifyContent = 'center';
        msgModal.style.zIndex = 99998;
        msgModal.innerHTML = `
          <div style="background:#fff;border-radius:18px;box-shadow:0 8px 32px #e48bb299;padding:2em 2.5em;text-align:center;max-width:340px;">
            <h3 style="color:#e48bb2;font-size:1.3em;margin-bottom:0.7em;">¡Hola! 🌸</h3>
            <p style="font-size:1.1em;margin-bottom:1.2em;">Para continuar con tu compra, primero iniciá sesión o creá tu cuenta.<br><br><span style="color:#e48bb2;font-weight:bold">¡Tu carrito está guardado!</span></p>
            <button id="cartLoginBtn" style="background:#c7a4e7;color:#fff;border:none;border-radius:8px;padding:0.7em 1.5em;font-size:1em;cursor:pointer;">Iniciar sesión</button>
          </div>
        `;
        document.body.appendChild(msgModal);
        document.getElementById('cartLoginBtn').onclick = function(){
          msgModal.remove();
          if (typeof window.openAuth === 'function') {
            window.openAuth('login');
          }
        };
      }

      return; // IMPORTANTÍSIMO: no loader, no redirect
    }

    // 2) Si está logueada: loader + redirect
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Cargando…';
      checkoutBtn.classList.add('loading');
    }

    showCheckoutLoader('Preparando tu checkout…');

    setTimeout(() => {
      window.location.href = 'checkout.html';
    }, 950);
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
