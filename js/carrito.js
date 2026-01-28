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
  const card = btn.closest('.curso-card');
  if (!card) return;

  const id = btn.getAttribute('data-add') || card.dataset.href || crypto.randomUUID();
  const name = (card.querySelector('h3')?.textContent || 'Curso').trim();

  // Si la card tiene algo tipo "$ 5.500", limpiamos
  const priceText = (card.querySelector('.price')?.textContent || '0')
    .replace(/[^\d.,]/g,'')
    .replace(/\./g,'')     // saca separador miles si lo usan
    .replace(',','.');     // coma decimal a punto (por si acaso)

  const price = parseFloat(priceText) || 0;
  const img = card.querySelector('.curso-media img')?.getAttribute('src') || '';
  const href = card.dataset.href || '';

  const cart = readCart();

  // Curso digital: qty siempre 1 (si ya existe, no suma)
  const existing = cart.find(it => it.id === id);
  if (existing){
    existing.qty = 1;
  } else {
    cart.push({ id, name, price, img, qty: 1, href });
  }

  writeCart(cart);
  updateCartBadge();
  animateCartIcon();

  // feedback
  btn.disabled = true;
  const prev = btn.textContent.trim();
  btn.classList.add('added');
  btn.textContent = 'Agregado ✓';
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('added');
    btn.textContent = prev;
  }, 900);

  if (document.getElementById('cartList') && typeof window.draw === 'function') {
    window.draw();
  }
}

// Para páginas de curso (curso.html)
function addCourseFromCoursePage(btn){
  const courseId = btn.getAttribute('data-course-id') || document.body.dataset.courseId;
  const price = Number(btn.getAttribute('data-price') || 0);

  const title =
    document.querySelector('#curso-titulo')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    'Curso';

  // Intentar sacar una imagen (si hay)
  const img =
    document.querySelector('.profe__foto')?.getAttribute('src') ||
    '';

  const href = window.location.pathname;

  const cart = readCart();
  const existing = cart.find(it => it.id === courseId);

  if (existing){
    existing.qty = 1;
    existing.name = title;
    existing.price = price;
    existing.href = href;
    if (img) existing.img = img;
  } else {
    cart.push({ id: courseId, name: title, price, img, qty: 1, href });
  }

  writeCart(cart);
  updateCartBadge();
  animateCartIcon();
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

// Botones "Agregar al carrito" en cards
document.querySelectorAll('.btn-cart').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    addToCartFromCard(btn);
  });
});

// Badge al cargar
document.addEventListener('DOMContentLoaded', updateCartBadge);


/* ================== RENDER CARRITO ================== */
(function renderCartPage(){
  const list = document.getElementById('cartList');
  if (!list) return; // no estamos en carrito.html

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

    cart.forEach((it, i) => {
      // seguridad: curso digital qty=1
      it.qty = 1;

      const li = document.createElement('li');
      li.className = 'cart-item';
      totalQty += it.qty;
      total += (Number(it.price)||0) * it.qty;

      // Normalizar img: si viene vacío, placeholder
      const imgSrc = it.img ? it.img : '../img/placeholder.png';

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

  // Ir a pagar
  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) {
      renderToast('El carrito está vacío');
      return;
    }

    // Acá mantenés tu lógica de login si querés
    // (si no está logueada => abrís modal, etc.)
    // Si ya está logueada => checkout.html
    window.location.href = 'checkout.html';
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
