(() => {
  // --------- Elementos base
  const form = document.getElementById('co-form');
  const step1 = document.querySelector('.co-step[data-step="1"]');
  const step2 = document.querySelector('.co-step[data-step="2"]');
  const step3 = document.querySelector('.co-step[data-step="3"]');
  const toStep2Btn = document.getElementById('to-step-2');
  const backBtn = step2?.querySelector('[data-back]');
  const payNowBtn = document.getElementById('pay-now');
  const steps = document.getElementById('steps');
  const needInv = document.getElementById('need-invoice');
  const invBox = document.getElementById('invoice-fields');
  const checkPolicies = document.getElementById('acepto-politicas');

  // Resumen / dinero
  const couponInput = document.getElementById('coupon');
  const couponBtn = document.getElementById('apply-coupon');
  const sub = document.getElementById('sub');
  const disc = document.getElementById('disc');
  const tot = document.getElementById('tot');
  const priceTag = document.getElementById('price-tag');

  // Confirmación
  const orderIdEl = document.getElementById('order-id');
  const orderEmailEl = document.getElementById('order-email');

  // Gateway
  const gatewayContainer = document.getElementById('gateway-container');
  const payRadios = step2?.querySelectorAll('input[name="pay"]') || [];

  // --------- Estado
  const STATE_KEY = 'espaciopaz.checkout';
  const CART_KEY = 'espaciopaz_cart_v1'; // Mismo key que en script.js
  
  // Leer carrito
  function readCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  
  // Calcular totales del carrito
  function calculateCartTotals(){
    const cart = readCart();
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    return { cart, subtotal };
  }
  
  let state = {
    name: '', email: '', country: '', city: '',
    invoice: false, doc: '', addr: '',
    method: '', subtotal: 0, descuento: 0, total: 0, coupon: ''
  };
  
  // Inicializar con datos del carrito
  const { cart, subtotal } = calculateCartTotals();
  state.subtotal = subtotal;
  state.total = subtotal;
  
  // Verificar que hay productos en el carrito
  if (!cart.length) {
    alert('Tu carrito está vacío. Te redirigimos a los cursos.');
    window.location.href = '../html/cursos.html';
    return;
  }

  // Cargar de localStorage
  try{
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    state = { ...state, ...saved };
    // Repintar campos si vuelven
    if (form?.name) form.name.value = state.name || '';
    if (form?.email) form.email.value = state.email || '';
    if (form?.country) form.country.value = state.country || '';
    if (form?.city) form.city.value = state.city || '';
    if (needInv) needInv.checked = !!state.invoice;
    if (needInv?.checked && invBox) invBox.hidden = false;
    if (form?.doc) form.doc.value = state.doc || '';
    if (form?.addr) form.addr.value = state.addr || '';
    if (couponInput) couponInput.value = state.coupon || '';
  }catch{}

  // Helpers
  const save = () => localStorage.setItem(STATE_KEY, JSON.stringify(state));
  const money = n => `USD ${n}`;

  function renderMoney(){
    if (sub) sub.textContent = money(state.subtotal);
    if (disc) disc.textContent = state.descuento ? `- ${money(state.descuento)}` : '—';
    state.total = Math.max(state.subtotal - state.descuento, 0);
    if (tot) tot.textContent = money(state.total);
    if (priceTag) priceTag.textContent = money(state.subtotal);
  }
  
  function renderCartItems(){
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;
    
    const cart = readCart();
    if (!cart.length) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <p class="muted">No hay cursos en el carrito</p>
          <a href="../html/cursos.html" class="btn-ghost">Ver cursos</a>
        </div>`;
      return;
    }
    
    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="course-line">
        <div class="thumb" style="background-image: url('../${item.img || 'img/placeholder.png'}')" aria-hidden="true"></div>
        <div class="meta">
          <p class="title">${item.name}</p>
          <p class="muted">Cantidad: ${item.qty}</p>
        </div>
        <strong class="price">${money(item.price * item.qty)}</strong>
      </div>
    `).join('');
  }
  
  renderMoney();
  renderCartItems();

  // --------- Validación paso 1
  function isStep1Valid(){
    if (!form) return false;
    const basic = form.name?.value.trim() && form.email?.validity.valid && form.country?.value.trim() && checkPolicies?.checked;
    // Si pidió factura, validar extras
    const invOk = !needInv?.checked || (form.doc?.value.trim() && form.addr?.value.trim());
    return basic && invOk;
  }
  function onStep1Change(){
    if (!form) return;
    state.name = form.name?.value.trim() || '';
    state.email = form.email?.value.trim() || '';
    state.country = form.country?.value.trim() || '';
    state.city = form.city?.value.trim() || '';
    state.invoice = !!needInv?.checked;
    state.doc = form.doc?.value.trim() || '';
    state.addr = form.addr?.value.trim() || '';
    save();
    if (toStep2Btn) toStep2Btn.disabled = !isStep1Valid();
  }
  if (form) form.addEventListener('input', onStep1Change);
  if (checkPolicies) checkPolicies.addEventListener('change', onStep1Change);
  if (needInv) needInv.addEventListener('change', () => {
    if (invBox) invBox.hidden = !needInv.checked;
    onStep1Change();
  });
  document.addEventListener('DOMContentLoaded', onStep1Change);

  // --------- Navegación de pasos
  function goTo(stepNumber){
    [step1, step2, step3].forEach(s => s && (s.hidden = true));
    const targetStep = document.querySelector(`.co-step[data-step="${stepNumber}"]`);
    if (targetStep) targetStep.hidden = false;
    // Progreso
    if (steps) {
      steps.querySelectorAll('[data-step-indicator]').forEach(li => {
        const n = Number(li.getAttribute('data-step-indicator'));
        li.classList.toggle('is-active', n === stepNumber);
      });
    }
    // Botones
    if (stepNumber === 2 && payNowBtn) {
      payNowBtn.disabled = !state.method;
    }
  }

  if (toStep2Btn) toStep2Btn.addEventListener('click', () => {
    if(!isStep1Valid()) return;
    goTo(2);
  });
  if (backBtn) backBtn.addEventListener('click', () => goTo(1));

  // --------- Cupón
  if (couponBtn) couponBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const code = couponInput?.value.trim().toUpperCase() || '';
    state.coupon = code;
    state.descuento = 0;
    
    // Aplicar descuentos basados en el subtotal actual
    if(code === 'PAZ10') state.descuento = Math.min(10, state.subtotal);
    if(code === 'PAZ25') state.descuento = Math.min(25, state.subtotal);
    if(code === 'PAZ50') state.descuento = Math.min(50, state.subtotal);
    
    save(); renderMoney();
    
    // Feedback visual
    if (state.descuento > 0) {
      couponInput.style.borderColor = '#22c55e';
      setTimeout(() => couponInput.style.borderColor = '', 2000);
    }
  });

  // --------- Métodos de pago (mock + hooks)
  payRadios.forEach(r => {
    r.addEventListener('change', () => {
      state.method = r.value; save();
      loadGatewayUI(state.method);
      if (payNowBtn) payNowBtn.disabled = false;
    });
  });

  function loadGatewayUI(method){
    // Limpia contenedor
    if (!gatewayContainer) return;
    gatewayContainer.innerHTML = '';
    if(method === 'card'){
      gatewayContainer.innerHTML = `
        <div class="form-grid-2">
          <div class="form-row">
            <label>Número de tarjeta</label>
            <input id="card-number" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456">
          </div>
          <div class="form-row">
            <label>Vencimiento</label>
            <input id="card-exp" placeholder="MM/AA" inputmode="numeric" autocomplete="cc-exp">
          </div>
          <div class="form-row">
            <label>Nombre en la tarjeta</label>
            <input id="card-name" autocomplete="cc-name" placeholder="Como figura en la tarjeta">
          </div>
          <div class="form-row">
            <label>CVV</label>
            <input id="card-cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="***">
          </div>
        </div>
        <p class="tiny-muted">Demo local. Reemplazá por el widget de tu pasarela.</p>
      `;
      // HOOK Stripe/Mercado Pago:
      // Aquí podrías montar Elements (Stripe) o CardForm (Mercado Pago).
    } else if(method === 'transfer'){
      gatewayContainer.innerHTML = `
        <p>Te mostraremos los datos de transferencia al confirmar. Acreditamos dentro de 24–48 h hábiles.</p>
      `;
    } else if(method === 'paypal'){
      gatewayContainer.innerHTML = `
        <p>Serás redirigida a PayPal para completar el pago.</p>
      `;
    }
  }
  if(state.method) loadGatewayUI(state.method);

  // --------- Pagar
  if (payNowBtn) payNowBtn.addEventListener('click', async () => {
    payNowBtn.disabled = true;
    payNowBtn.textContent = 'Procesando…';

    try{
      // 1) Crear "orden" en tu backend (HOOK)
      // const { checkoutUrl, orderId } = await fetch('/api/checkout', {method:'POST', body: JSON.stringify(state)}).then(r=>r.json());

      // 2) Dependiendo del método:
      if(state.method === 'paypal'){
        // window.location.href = checkoutUrl; (redirigir a PayPal)
      } else if(state.method === 'transfer'){
        // Mostrar instrucciones y marcar como "pendiente"
        fakeConfirm('PEND-' + Date.now());
        return;
      } else {
        // Tarjeta: tokenizar con pasarela y confirmar pago (HOOK)
        // const token = await gatewayTokenizeCard();
        // await fetch('/api/pay', {method:'POST', body: JSON.stringify({orderId, token})});
      }

      // DEMO: confirmación inmediata
      fakeConfirm('ORD-' + Math.floor(Math.random()*999999));
    }catch(err){
      alert('Hubo un problema con el pago. Intentá nuevamente.');
      console.error(err);
      payNowBtn.disabled = false;
      payNowBtn.textContent = 'Pagar ahora';
    }
  });

  function fakeConfirm(id){
    // Guardar "compra" y limpiar estado de cupón (opcional)
    state.orderId = id; save();
    if (orderIdEl) orderIdEl.textContent = '#' + id;
    if (orderEmailEl) orderEmailEl.textContent = state.email || '';
    goTo(3);
    // Limpieza ligera
    if (payNowBtn) payNowBtn.textContent = 'Pagar ahora';
  }

  // --------- Modal de Políticas (igual que antes)
  const modal = document.getElementById('politicas-modal');
  const policyLinks = document.querySelectorAll('[data-open="politicas-modal"]');
  let lastFocused = null;

  policyLinks.forEach(a => a.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); }));
  function openModal(){
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false; document.body.classList.add('modal-open');
    const title = modal.querySelector('#modal-title'); 
    if (title) { title.setAttribute('tabindex','-1'); title.focus(); }
    document.addEventListener('keydown', onEscClose);
    modal.addEventListener('click', onLightDismiss);
    document.addEventListener('focus', trapFocus, true);
  }
  function closeModal(){
    if (!modal) return;
    modal.hidden = true; document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onEscClose);
    modal.removeEventListener('click', onLightDismiss);
    document.removeEventListener('focus', trapFocus, true);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }
  function onEscClose(e){ if(e.key==='Escape') closeModal(); }
  function onLightDismiss(e){
    if (e.target.matches('[data-close]')) return closeModal();
    if (e.target.classList.contains('modal__backdrop')) return closeModal();
  }
  function trapFocus(e){ 
    if (!modal || modal.hidden) return; 
    if (!modal.contains(e.target)){ 
      e.stopPropagation(); 
      const focusable = modal.querySelector('.modal__close, #modal-title, .modal__footer .btn-primary');
      if (focusable) focusable.focus();
    } 
  }
})();
