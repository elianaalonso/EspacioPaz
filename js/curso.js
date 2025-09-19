
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


// ================= FAVORITOS =================
const FAV_KEY = 'espaciopaz_favs_v1';
function readFavs(){
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}
function writeFavs(items){
  localStorage.setItem(FAV_KEY, JSON.stringify(items));
}
function isFav(id){
  return readFavs().includes(id);
}
function toggleFav(id){
  let favs = readFavs();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
  } else {
    favs.push(id);
  }
  writeFavs(favs);
}

// Botón Agregar a favoritos con animación
const favBtn = document.querySelector('.btn-fav');
if(favBtn){
  const courseId = document.body.getAttribute('data-course-id');
  // Estado inicial
  if(isFav(courseId)){
    favBtn.classList.add('is-fav');
    favBtn.innerHTML = 'Favorito <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }
  favBtn.addEventListener('click', function(){
    const user = readUser();
    if (!user) {
      // Abrir modal de login si existe
      if (typeof openAuth === 'function') openAuth('login');
      else {
        // fallback: trigger modal manualmente
        const evt = new CustomEvent('open-auth-modal');
        document.dispatchEvent(evt);
      }
      return;
    }
    toggleFav(courseId);
    const isNowFav = isFav(courseId);
    favBtn.classList.toggle('is-fav', isNowFav);
    favBtn.innerHTML = (isNowFav
      ? 'Favorito <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>'
      : 'Agregar a favoritos <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>'
    );
    // Animación visual
    favBtn.classList.add('fav-anim');
    setTimeout(()=>favBtn.classList.remove('fav-anim'), 600);
  });
}

// Eliminar OWNED al cerrar sesión
document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('#btnLogout');
  if (!logoutBtn) return;
  // Limpiar compra simulada solo de este curso
  try { localStorage.removeItem(OWNED_KEY); } catch {}
  // Limpiar favoritos globales
  try { localStorage.removeItem('espaciopaz_favs_v1'); } catch {}
  // Limpiar usuario (por si no lo hace el global)
  try { localStorage.removeItem('espaciopaz_user_v1'); } catch {}
  // Actualizar botón de favoritos si existe
  const favBtn = document.querySelector('.btn-fav');
  if (favBtn) {
    favBtn.classList.remove('is-fav');
    favBtn.innerHTML = 'Agregar a favoritos <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }
  body.classList.remove('is-owned');
  $$('[data-owned-only]')?.forEach(x=>x.setAttribute('hidden',''));
});
