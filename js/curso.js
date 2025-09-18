const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const body = document.body;
const OWNED_KEY = `owned_${body.dataset.courseId}`;

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

// Comprar (simulación)
$$('.js-comprar').forEach(b => b.addEventListener('click', () => {
  if(confirm('¿Simular compra y desbloquear el curso?')){
    body.classList.add('is-owned');
    try{ localStorage.setItem(OWNED_KEY,'1'); }catch{}
    $$('[data-owned-only]')?.forEach(x=>x.removeAttribute('hidden'));
    alert('¡Listo! Contenido desbloqueado.');
  }
}));

// Guardar
$$('.js-guardar').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('is-on')));
