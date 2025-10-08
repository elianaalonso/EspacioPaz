(() => {
  const form = document.getElementById('co-form');
  const check = document.getElementById('acepto-politicas');
  const payBtn = document.getElementById('btn-pagar');
  const needInv = document.getElementById('need-invoice');
  const invBox = document.getElementById('invoice-fields');
  const couponInput = document.getElementById('coupon');
  const couponBtn = document.getElementById('apply-coupon');
  const sub = document.getElementById('sub');
  const disc = document.getElementById('disc');
  const tot = document.getElementById('tot');

  // Estado monetario simple (mock)
  let subtotal = 99, descuento = 0;
  function renderMoney(){
    sub.textContent = `USD ${subtotal}`;
    disc.textContent = descuento ? `- USD ${descuento}` : '—';
    tot.textContent = `USD ${Math.max(subtotal - descuento, 0)}`;
  }
  renderMoney();

  // Habilitar pago cuando es válido + acepta políticas
  function togglePay(){
    const basicValid = form.name.value.trim() && form.email.validity.valid && form.country.value.trim();
    const ok = basicValid && check?.checked && form.pay?.value;
    payBtn.disabled = !ok;
    payBtn.setAttribute('aria-disabled', String(!ok));
  }
  form.addEventListener('input', togglePay);
  check?.addEventListener('change', togglePay);
  document.addEventListener('DOMContentLoaded', togglePay);

  // Toggle factura
  needInv?.addEventListener('change', () => {
    const show = needInv.checked;
    invBox.hidden = !show;
    if(!show){ form.doc.value=''; form.addr.value=''; }
  });

  // Cupón (ejemplo: PAZ10 -> USD 10 de descuento)
  couponBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    const code = couponInput.value.trim().toUpperCase();
    if(!code) return;
    if(code === 'PAZ10'){ descuento = 10; } 
    else if(code === 'PAZ25'){ descuento = 25; }
    else { descuento = 0; }
    renderMoney();
  });

  // Modal de políticas
  const modal = document.getElementById('politicas-modal');
  const policyLinks = document.querySelectorAll('[data-open="politicas-modal"]');
  let lastFocused = null;

  policyLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  function openModal(){
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const title = modal.querySelector('#modal-title');
    title?.setAttribute('tabindex','-1');
    title?.focus();
    document.addEventListener('keydown', onEscClose);
    modal.addEventListener('click', onLightDismiss);
    document.addEventListener('focus', trapFocus, true);
  }
  function closeModal(){
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onEscClose);
    modal.removeEventListener('click', onLightDismiss);
    document.removeEventListener('focus', trapFocus, true);
    lastFocused?.focus?.();
  }
  function onEscClose(e){ if(e.key==='Escape') closeModal(); }
  function onLightDismiss(e){
    if (e.target.matches('[data-close]')) return closeModal();
    if (e.target.classList.contains('modal__backdrop')) return closeModal();
  }
  function trapFocus(e){
    if (modal.hidden) return;
    if (!modal.contains(e.target)){
      e.stopPropagation();
      modal.querySelector('.modal__close, #modal-title, .modal__footer .btn-primary')?.focus();
    }
  }
})();
