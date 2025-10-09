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

  // --------- RESTRICCIÓN: solo usuarios logueados pueden acceder al checkout
  // Suponemos que el usuario logueado está en localStorage bajo "espaciopaz_user_v1" y tiene email
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("espaciopaz_user_v1") || "null");
  } catch {}
  // Solo mostrar el cartel/modal si NO está logueado
  if (!user || !user.email) {
    // Si ya existe el modal, no lo muestres de nuevo
    if (!document.getElementById('loginMsgModal')) {
      const msgModal = document.createElement('div');
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
  
  // Función para actualizar todo
  function updateCheckout() {
    const { cart, subtotal } = calculateCartTotals();
    state.subtotal = subtotal;
    // Mantener descuento proporcional si había uno
    if (state.descuento > 0) {
      state.descuento = Math.min(state.descuento, subtotal);
    }
    state.total = Math.max(subtotal - state.descuento, 0);
    renderMoney();
    renderCartItems();
  }

  // Actualizar cuando el usuario vuelve a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateCheckout();
    }
  });

  // Actualizar cuando la ventana recibe foco
  window.addEventListener('focus', updateCheckout);

  // Escuchar cambios en localStorage (si agregas desde otra pestaña)
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      updateCheckout();
    }
  });

  // Botón actualizar manual
  const refreshBtn = document.getElementById('refresh-cart');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      updateCheckout();
      // Feedback visual
      refreshBtn.textContent = '✓ Actualizado';
      setTimeout(() => {
        refreshBtn.textContent = '↻ Actualizar';
      }, 1500);
    });
  }

  // Render inicial
  updateCheckout();

  // --------- Validación paso 1 mejorada y mensajes de error
  function showError(input, msg) {
    let err = input.parentNode.querySelector('.error-msg');
    if (!err) {
      err = document.createElement('div');
      err.className = 'error-msg';
      input.parentNode.appendChild(err);
    }
    err.textContent = msg;
    input.classList.add('has-error');
  }
  function clearError(input) {
    let err = input.parentNode.querySelector('.error-msg');
    if (err) err.textContent = '';
    input.classList.remove('has-error');
  }
  function isEmailValid(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }
  function isStep1Valid(showMsgs = false){
    if (!form) return false;
    let valid = true;
    // Nombre
    if (!form.name.value.trim()) {
      valid = false;
      if (showMsgs) showError(form.name, 'Ingresá tu nombre');
    } else { clearError(form.name); }
    // Email
    if (!form.email.value.trim() || !isEmailValid(form.email.value.trim())) {
      valid = false;
      if (showMsgs) showError(form.email, 'Email inválido');
    } else { clearError(form.email); }
    // País
    if (!form.country.value.trim()) {
      valid = false;
      if (showMsgs) showError(form.country, 'Ingresá tu país');
    } else { clearError(form.country); }
    // Políticas
    if (!checkPolicies.checked) {
      valid = false;
      if (showMsgs) showError(checkPolicies, 'Debés aceptar las políticas');
    } else { clearError(checkPolicies); }
    // Factura
    if (needInv.checked) {
      if (!form.doc.value.trim()) {
        valid = false;
        if (showMsgs) showError(form.doc, 'Ingresá tu documento/CUIT');
      } else { clearError(form.doc); }
      if (!form.addr.value.trim()) {
        valid = false;
        if (showMsgs) showError(form.addr, 'Ingresá tu dirección');
      } else { clearError(form.addr); }
    } else {
      if (form.doc) clearError(form.doc);
      if (form.addr) clearError(form.addr);
    }
    return valid;
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
  if (form) form.addEventListener('blur', onStep1Change, true);
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
    
    // Actualizar carrito cuando cambias de paso
    updateCheckout();
    
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
    if(!isStep1Valid(true)) return;
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
    else if(code === 'PAZ25') state.descuento = Math.min(25, state.subtotal);
    else if(code === 'PAZ50') state.descuento = Math.min(50, state.subtotal);
    else state.descuento = 0;
    save(); renderMoney();
    // Feedback visual y mensaje si cupón no válido
    if (state.descuento > 0) {
      couponInput.style.borderColor = '#22c55e';
      couponInput.setCustomValidity('');
      let msg = couponInput.parentNode.querySelector('.error-msg');
      if (msg) msg.textContent = '';
      setTimeout(() => couponInput.style.borderColor = '', 2000);
    } else if (code) {
      couponInput.style.borderColor = '#ef4444';
      couponInput.setCustomValidity('Cupón inválido');
      let msg = couponInput.parentNode.querySelector('.error-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'error-msg';
        couponInput.parentNode.appendChild(msg);
      }
      msg.textContent = 'Cupón inválido';
      setTimeout(() => {
        couponInput.style.borderColor = '';
        msg.textContent = '';
      }, 2500);
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
    // Loader visual
    payNowBtn.classList.add('loading');
    try{
      // 1) Validar datos antes de pagar
      if (!isStep1Valid(true)) {
        payNowBtn.disabled = false;
        payNowBtn.textContent = 'Pagar ahora';
        payNowBtn.classList.remove('loading');
        return;
      }
      // 2) Crear "orden" en tu backend (HOOK)
      // const { checkoutUrl, orderId } = await fetch('/api/checkout', {method:'POST', body: JSON.stringify(state)}).then(r=>r.json());

      // 3) Dependiendo del método:
      if(state.method === 'paypal'){
        // window.location.href = checkoutUrl; (redirigir a PayPal)
      } else if(state.method === 'transfer'){
        // Mostrar instrucciones y marcar como "pendiente"
        fakeConfirm('PEND-' + Date.now());
        payNowBtn.classList.remove('loading');
        return;
      } else {
        // Tarjeta: tokenizar con pasarela y confirmar pago (HOOK)
        // const token = await gatewayTokenizeCard();
        // await fetch('/api/pay', {method:'POST', body: JSON.stringify({orderId, token})});
      }

      // DEMO: confirmación inmediata
      setTimeout(() => {
        fakeConfirm('ORD-' + Math.floor(Math.random()*999999));
        payNowBtn.classList.remove('loading');
      }, 1200);
    }catch(err){
      alert('Hubo un problema con el pago. Intentá nuevamente.');
      console.error(err);
      payNowBtn.disabled = false;
      payNowBtn.textContent = 'Pagar ahora';
      payNowBtn.classList.remove('loading');
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
