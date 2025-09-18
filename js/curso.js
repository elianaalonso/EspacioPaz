
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const body = document.body;
const OWNED_KEY = `owned_${body.dataset.courseId}`;
const USER_KEY = 'espaciopaz_user_v1';

function readUser(){
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

// Restaurar estado
try{
  if(localStorage.getItem(OWNED_KEY)==='1'){
    body.classList.add('is-owned');
    $$('[data-owned-only]')?.forEach(x=>x.removeAttribute('hidden'));
  }
}catch{}

// Expandir/colapsar módulos
$$('.modulo').forEach(mod => {
  const hd = mod.querySelector('.modulo__hd');
  const list = mod.querySelector('.lecciones');
  const open = mod.hasAttribute('data-open');
  if(!open){ list.setAttribute('hidden',''); hd.setAttribute('aria-expanded','false'); }
  hd.addEventListener('click', () => {
    const expanded = hd.getAttribute('aria-expanded') === 'true';
    hd.setAttribute('aria-expanded', String(!expanded));
    list.toggleAttribute('hidden');
  });
});

// Previews (simulación)
$$('[data-preview]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  alert('▶ Aquí se abriría el player con la preview pública.');
}));

// Comprar: solo si está logueado
$$('.js-comprar').forEach(b => b.addEventListener('click', (e) => {
  const user = readUser();
  if (!user) {
    e.preventDefault();
    // Abrir modal de login si existe
    if (typeof openAuth === 'function') openAuth('login');
    else {
      // fallback: trigger modal manualmente
      const evt = new CustomEvent('open-auth-modal');
      document.dispatchEvent(evt);
    }
    return;
  }
  if(confirm('¿Simular compra y desbloquear el curso?')){
    body.classList.add('is-owned');
    try{ localStorage.setItem(OWNED_KEY,'1'); }catch{}
    $$('[data-owned-only]')?.forEach(x=>x.removeAttribute('hidden'));
    alert('¡Listo! Contenido desbloqueado.');
  }
}));

// Guardar
$$('.js-guardar').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('is-on')));

// Eliminar OWNED al cerrar sesión
document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('#btnLogout');
  if (!logoutBtn) return;
  // Limpiar compra simulada solo de este curso
  try { localStorage.removeItem(OWNED_KEY); } catch {}
  body.classList.remove('is-owned');
  $$('[data-owned-only]')?.forEach(x=>x.setAttribute('hidden',''));
});
