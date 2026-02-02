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
  
  function resolveCheckoutImageUrl(img){
    const fallback = '../img/usuario-default.jpeg';
    if (!img) return fallback;
    const raw = String(img).trim();
    if (!raw) return fallback;
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw; // absoluto desde la raíz del sitio
    if (raw.startsWith('../') || raw.startsWith('./')) return raw;
    if (raw.startsWith('img/')) return `../${raw}`;
    return raw;
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
    
    if (!courseCatalogMap) {
      ensureCourseCatalog().then(() => renderCartItems());
    }

    let shouldWrite = false;

    cartItemsContainer.innerHTML = cart.map(item => {
      let img = item.img;
      if (!img && courseCatalogMap) {
        const fromId = courseCatalogMap.byId.get(item.id);
        const fromLink = courseCatalogMap.byLink.get(normalizeCatalogLink(item.href));
        const src = fromId?.image?.src || fromLink?.image?.src || '';
        if (src) {
          img = src;
          item.img = src;
          shouldWrite = true;
        }
      }
      const imgUrl = resolveCheckoutImageUrl(img);
      return `
      <div class="course-line">
        <div class="thumb" style="background-image: url('${imgUrl}')" aria-hidden="true"></div>
        <div class="meta">
          <p class="title">${item.name}</p>
          <p class="muted">Cantidad: ${item.qty}</p>
        </div>
        <strong class="price">${money(item.price * item.qty)}</strong>
      </div>
    `;
    }).join('');

    if (shouldWrite) writeCart(cart);
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
      if (showMsgs) {
        // Solo cartelito coqueto al lado, no debajo
        let sideMsg = form.email.parentNode.querySelector('.side-msg');
        if (!sideMsg) {
          sideMsg = document.createElement('span');
          sideMsg.className = 'side-msg';
          sideMsg.style.marginLeft = '10px';
          sideMsg.style.color = '#e48bb2';
          sideMsg.style.fontSize = '0.98em';
          sideMsg.style.background = '#fff0fa';
          sideMsg.style.padding = '2px 10px';
          sideMsg.style.borderRadius = '8px';
          sideMsg.style.verticalAlign = 'middle';
          form.email.parentNode.appendChild(sideMsg);
        }
  sideMsg.textContent = 'Ingresá un correo válido';
      }
      // Eliminar mensaje de error debajo si existe
      let err = form.email.parentNode.querySelector('.error-msg');
      if (err) err.textContent = '';
      form.email.classList.remove('has-error');
    } else {
      // Limpiar ambos mensajes
      let sideMsg = form.email.parentNode.querySelector('.side-msg');
      if (sideMsg) sideMsg.textContent = '';
      let err = form.email.parentNode.querySelector('.error-msg');
      if (err) err.textContent = '';
      form.email.classList.remove('has-error');
    }
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
  // Validación en tiempo real para email
  if (form && form.email) {
    form.email.addEventListener('input', function() {
      isStep1Valid(true);
    });
    form.email.addEventListener('blur', function() {
      isStep1Valid(true);
    });
  }
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

// ================================
// CHECKOUT — Paso 1: datos + validación + persistencia (CI/RUT)
// ================================
(function checkoutStep1() {
  const form = document.getElementById("co-form");
  if (!form) return;

  const elName = document.getElementById("name");
  const elEmail = document.getElementById("email");
  const elCountry = document.getElementById("country");
  const elCity = document.getElementById("city");

  const elNeedInvoice = document.getElementById("need-invoice");
  const invoiceWrap = document.getElementById("invoice-fields");

  const elTaxType = document.getElementById("tax-type");
  const elTaxId = document.getElementById("tax-id");
  const elRsWrap = document.getElementById("rs-wrap");
  const elRazon = document.getElementById("razon-social");
  const elAddr = document.getElementById("addr"); // opcional

  const elPolicies = document.getElementById("acepto-politicas");
  const btnNext = document.getElementById("to-step-2");

  const STORAGE_KEY = "espaciopaz_checkout_data_v2";

  // --- Helpers
  const isEmailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  const trim = (v) => String(v || "").trim();
  const onlyDigits = (v) => String(v || "").replace(/\D+/g, "");

  function readData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeData() {
    const data = {
      name: trim(elName?.value),
      email: trim(elEmail?.value),
      country: trim(elCountry?.value),
      city: trim(elCity?.value),

      needInvoice: !!elNeedInvoice?.checked,
      taxType: elTaxType?.value || "ci",
      taxId: onlyDigits(elTaxId?.value),
      razonSocial: trim(elRazon?.value),
      addr: trim(elAddr?.value), // opcional

      policies: !!elPolicies?.checked,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  function loadData() {
    const data = readData();
    if (!data) return;

    if (elName && !elName.value) elName.value = data.name || "";
    if (elEmail && !elEmail.value) elEmail.value = data.email || "";
    if (elCountry && !elCountry.value) elCountry.value = data.country || "";
    if (elCity && !elCity.value) elCity.value = data.city || "";

    if (elNeedInvoice) elNeedInvoice.checked = !!data.needInvoice;

    if (elTaxType) elTaxType.value = data.taxType || "ci";
    if (elTaxId && !elTaxId.value) elTaxId.value = data.taxId || "";
    if (elRazon && !elRazon.value) elRazon.value = data.razonSocial || "";
    if (elAddr && !elAddr.value) elAddr.value = data.addr || "";

    if (elPolicies) elPolicies.checked = !!data.policies;

    syncInvoiceUI();
  }

  function syncInvoiceUI() {
    const on = !!elNeedInvoice?.checked;
    if (invoiceWrap) invoiceWrap.hidden = !on;

    const isRUT = (elTaxType?.value || "ci") === "rut";

    // Mostrar razón social SOLO si está on + rut
    if (elRsWrap) {
      const shouldShow = on && isRUT;
      elRsWrap.hidden = !shouldShow;
      // Force display style update
      elRsWrap.style.display = shouldShow ? '' : 'none';
    }

    // required
    if (elTaxType) elTaxType.required = on;
    if (elTaxId) elTaxId.required = on;
    if (elRazon) elRazon.required = on && isRUT;

    // dirección opcional
    if (elAddr) elAddr.required = false;
  }

  function validate() {
    const nameOk = trim(elName?.value).length >= 3;
    const emailOk = isEmailOk(elEmail?.value);
    const countryOk = trim(elCountry?.value).length >= 2;
    const policiesOk = !!elPolicies?.checked;

    let invoiceOk = true;
    if (elNeedInvoice?.checked) {
      const taxIdOk = onlyDigits(elTaxId?.value).length >= 6; // CI/RUT mínimo razonable
      const isRUT = (elTaxType?.value || "ci") === "rut";
      const razonOk = !isRUT || trim(elRazon?.value).length >= 2;
      invoiceOk = taxIdOk && razonOk;
    }

    const ok = nameOk && emailOk && countryOk && policiesOk && invoiceOk;
    if (btnNext) btnNext.disabled = !ok;
    return ok;
  }

  // --- Avanzar a paso 2
  function goToStep(stepNum) {
    const indicators = document.querySelectorAll("#steps [data-step-indicator]");
    indicators.forEach((li) => {
      const n = Number(li.getAttribute("data-step-indicator"));
      li.classList.toggle("is-active", n === stepNum);
    });

    const panels = document.querySelectorAll(".co-step[data-step]");
    panels.forEach((p) => {
      const n = Number(p.getAttribute("data-step"));
      p.hidden = n !== stepNum;
    });

    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  // --- Eventos
  loadData();
  validate();

  // Normalizar a dígitos en tax-id (sin molestar al usuario)
  if (elTaxId) {
    elTaxId.addEventListener("input", () => {
      const cur = elTaxId.value;
      const clean = onlyDigits(cur);
      if (cur !== clean) elTaxId.value = clean;
    });
  }

  form.addEventListener("input", () => {
    writeData();
    validate();
  });

  form.addEventListener("change", () => {
    syncInvoiceUI();
    writeData();
    validate();
  });

  if (elNeedInvoice) {
    elNeedInvoice.addEventListener("change", () => {
      if (elNeedInvoice.checked && elTaxType) elTaxType.value = "rut";
      syncInvoiceUI();
      writeData();
      validate();
    });
  }

  if (elTaxType) {
    elTaxType.addEventListener("change", () => {
      syncInvoiceUI();
      writeData();
      validate();
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      writeData();
      if (!validate()) return;
      goToStep(2);
    });
  }

  // Volver a datos desde paso 2
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => goToStep(1));
  });

  // Modal Políticas (open/close) - usar capture phase para ejecutar antes que el listener global
  document.querySelectorAll('[data-open="politicas-modal"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const m = document.getElementById("politicas-modal");
      if (m) m.hidden = false;
    }, true);
  });
  document.querySelectorAll("#politicas-modal [data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = document.getElementById("politicas-modal");
      if (m) m.hidden = true;
    });
  });
})();

// ================================
// CHECKOUT — Paso 2: método de pago (UX + flujo)
// ================================
(function checkoutStep2() {
  const payNowBtn = document.getElementById("pay-now");
  const hint = document.getElementById("gateway-hint");
  const widget = document.getElementById("gateway-widget");

  if (!payNowBtn || !hint || !widget) return;

  const payRadios = Array.from(document.querySelectorAll('input[name="pay"]'));
  let selected = null;

  const hints = {
    card: "Podés pagar con tarjeta de crédito o débito. El pago es seguro y encriptado.",
    mercadopago: "Serás redirigida a MercadoPago para completar el pago de forma segura.",
    transfer: "",
  };

  function renderWidget(method) {
    // LIMPIAMOS TODO SIEMPRE
    hint.textContent = "";
    widget.innerHTML = "";

    // Estado 0: nada seleccionado
    if (!method) {
      hint.textContent = "Seleccioná un método para cargar el formulario de pago.";
      payNowBtn.disabled = true;
      return;
    }

    // A partir de acá: hay método elegido
    payNowBtn.disabled = false;

    if (method === "card") {
      hint.textContent = "Podés pagar con tarjeta de crédito o débito.";
      widget.innerHTML = `
        <div class="tiny-muted">
          El formulario de tarjeta se cargará al integrar la pasarela.
        </div>
      `;
    }

    if (method === "transfer") {
      widget.innerHTML = `
        <div class="transfer-info">
          <p><strong>Transferencia bancaria</strong></p>
          <p>
            Al confirmar, te mostraremos los datos bancarios para realizar la transferencia.
          </p>
          <p>
            Luego enviás el comprobante por <strong>WhatsApp</strong> para activar tu acceso.
          </p>
          <p class="tiny-muted">
            Activación dentro de <strong>24–48 h hábiles</strong>.
          </p>

          <a
            href="https://wa.me/598092447600?text=Hola%20realic%C3%A9%20una%20transferencia%20y%20env%C3%ADo%20el%20comprobante%20de%20mi%20compra%20en%20Espacio%20Paz."
            target="_blank"
            class="btn-ghost btn-small"
            style="margin-top:.75rem;display:inline-block"
          >
            Enviar comprobante por WhatsApp
          </a>
        </div>
      `;
    }

    if (method === "mercadopago") {
      hint.textContent = "Serás redirigida a MercadoPago para completar el pago.";
      widget.innerHTML = `
        <div class="tiny-muted">
          En el próximo paso se generará el pago en MercadoPago.
        </div>
      `;
    }
  }

  // Detectar selección
  payRadios.forEach((r) => {
    r.addEventListener("change", () => {
      selected = r.value;
      renderWidget(selected);
    });
  });

  // Helpers: cambiar de paso
  function goToStep(stepNum) {
    const indicators = document.querySelectorAll("#steps [data-step-indicator]");
    indicators.forEach((li) => {
      const n = Number(li.getAttribute("data-step-indicator"));
      li.classList.toggle("is-active", n === stepNum);
    });

    const panels = document.querySelectorAll(".co-step[data-step]");
    panels.forEach((p) => {
      const n = Number(p.getAttribute("data-step"));
      p.hidden = n !== stepNum;
    });

    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  // Simulación de confirmación (placeholder)
  payNowBtn.addEventListener("click", () => {
    if (!selected) return;

    // Email en confirmación
    const email = document.getElementById("email")?.value || "—";
    const elOrderEmail = document.getElementById("order-email");
    if (elOrderEmail) elOrderEmail.textContent = email;

    // Order ID simple (placeholder)
    const orderId = "EP-" + Math.random().toString(16).slice(2, 10).toUpperCase();
    const elOrderId = document.getElementById("order-id");
    if (elOrderId) elOrderId.textContent = "#" + orderId;

    // Pasar a confirmación
    goToStep(3);
  });

  // Si al recargar ya había selección (por caché del navegador)
  const already = payRadios.find((r) => r.checked);
  if (already) {
    selected = already.value;
    renderWidget(selected);
  }
})();
