
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
    // Desbloquear lecciones si ya se compró
    $$('.leccion.locked').forEach(li => {
      li.classList.remove('locked');
      // Ocultar candado y mostrar flecha play
      const lockIcon = li.querySelector('.ic--lock');
      if(lockIcon) lockIcon.style.display = 'none';
      let playIcon = li.querySelector('.ic--play');
      if(!playIcon){
        playIcon = document.createElement('span');
        playIcon.className = 'ic ic--play';
        playIcon.setAttribute('aria-hidden','true');
        playIcon.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8 6l10 6-10 6z"/></svg>';
        li.insertBefore(playIcon, li.firstChild);
      } else {
        playIcon.style.display = '';
      }
      // Si la lección tiene <span> en vez de <a>, lo convertimos en <a>
      const span = li.querySelector('span:not(.ic--lock):not(.ic--play):not(.time)');
      if(span){
        const label = span.textContent.trim();
        let src = '';
        if(label.includes('Proyecto sentido')) src = '/media/bio/proyecto-sentido.mp4';
        else if(label.includes('Programaciones')) src = '/media/bio/programaciones.mp4';
        else if(label.includes('Dobles')) src = '/media/bio/dobles.mp4';
        else if(label.includes('Práctica: línea del tiempo')) src = '/media/bio/linea-tiempo.mp4';
        else if(label.includes('Ritual: reconocimiento de excluidos')) src = '/media/bio/ritual-excluidos.mp4';
        else if(label.includes('Integración')) src = '/media/bio/integracion.mp4';
        else if(label.includes('Principios y lenguaje del cuerpo')) src = '/media/bio/03-principios.mp4';
        else if(label.includes('Práctica: observación amable')) src = '/media/bio/04-practica.mp4';
        else if(label.includes('Ritual de 7 días')) src = '/media/bio/ritual-7dias.mp4';
        else if(label.includes('Carta al cuerpo')) src = '/media/bio/carta-cuerpo.mp4';
        else if(label.includes('Agradecimiento al síntoma')) src = '/media/bio/agradecimiento.mp4';
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = label;
        a.setAttribute('data-src', src);
        a.style.pointerEvents = 'auto';
        a.style.color = '#3a2c48';
        a.style.textDecoration = 'none';
        a.setAttribute('tabindex', '0');
        span.replaceWith(a);
        a.addEventListener('click', e => { e.preventDefault(); playLesson(a); });
      } else {
        const a = li.querySelector('a');
        if(a){
          a.style.pointerEvents = 'auto';
          a.style.color = '#3a2c48';
          a.style.textDecoration = 'none';
          a.setAttribute('tabindex', '0');
        }
      }
    });
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

// ===== Player in-page =====

let currentPlayerWrap = null;
let currentActiveLesson = null;

function toEmbed(url){
  if(!url) return '';
  // YouTube normal -> embed
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/i.exec(url);
  if(yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;

  // Vimeo normal -> embed
  const vm = /vimeo\.com\/(\d+)/i.exec(url);
  if(vm) return `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`;

  return url; // MP4 u otro embed ya listo
}

function setPlayer(src){
  if(!src) return '';
  const isMp4 = /\.mp4(\?|$)/i.test(src);
  const url = isMp4 ? src : toEmbed(src);
  return isMp4
    ? `<video controls playsinline preload="metadata"><source src="${url}" type="video/mp4"></video>`
    : `<iframe src="${url}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
}

function playLesson(linkEl){
  const src = linkEl.dataset.src;
  if(!src) return;

  const li = linkEl.closest('.leccion');
  const locked = li?.classList.contains('locked');
  const owned  = document.body.classList.contains('is-owned');
  const isPreview = linkEl.hasAttribute('data-preview');

  // gate
  if(locked && !owned && !isPreview){
    if (typeof openAuth === 'function') openAuth('login');
    else document.dispatchEvent(new CustomEvent('open-auth-modal'));
    return;
  }

  // Si ya está activa, ocultar el reproductor
  if (li === currentActiveLesson) {
    if (currentPlayerWrap) {
      currentPlayerWrap.remove();
      currentPlayerWrap = null;
      currentActiveLesson.classList.remove('is-active');
      currentActiveLesson = null;
    }
    return;
  }

  // Eliminar reproductor anterior si existe
  if (currentPlayerWrap) {
    currentPlayerWrap.remove();
    if (currentActiveLesson) currentActiveLesson.classList.remove('is-active');
  }

  // Crear y mostrar el reproductor debajo de la lección
  const playerWrap = document.createElement('section');
  playerWrap.className = 'player-wrap';
  playerWrap.innerHTML = `
    <div class="player-box" role="region" aria-label="Video del curso">
      ${setPlayer(src)}
    </div>
    <div class="player-meta">
      <div class="playing">
        <strong class="playing-label">Reproduciendo:</strong>
        <span class="playing-title">${linkEl.textContent.trim()}</span>
      </div>
    </div>
  `;
  li.after(playerWrap);
  li.classList.add('is-active');
  currentPlayerWrap = playerWrap;
  currentActiveLesson = li;

  // scroll al reproductor si está fuera de vista
  playerWrap.scrollIntoView({behavior:'smooth', block:'center'});
}

// listeners en todas las lecciones con data-src
document.querySelectorAll('.leccion a[data-src]').forEach(a=>{
  a.addEventListener('click', e => { e.preventDefault(); playLesson(a); });
});

// AUTOCARGA: primera preview o primera lección si la usuaria es dueña
// El reproductor solo aparece al hacer click, no autoload

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
    // Quitar 'locked' y ocultar candados en todas las lecciones
    $$('.leccion.locked').forEach(li => {
      li.classList.remove('locked');
      // Ocultar candado y mostrar flecha play
      const lockIcon = li.querySelector('.ic--lock');
      if(lockIcon) lockIcon.style.display = 'none';
      let playIcon = li.querySelector('.ic--play');
      if(!playIcon){
        playIcon = document.createElement('span');
        playIcon.className = 'ic ic--play';
        playIcon.setAttribute('aria-hidden','true');
        playIcon.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8 6l10 6-10 6z"/></svg>';
        li.insertBefore(playIcon, li.firstChild);
      } else {
        playIcon.style.display = '';
      }
      // Si la lección tiene <span> en vez de <a>, lo convertimos en <a>
      const span = li.querySelector('span:not(.ic--lock):not(.ic--play):not(.time)');
      if(span){
        const label = span.textContent.trim();
        let src = '';
        if(label.includes('Proyecto sentido')) src = '/media/bio/proyecto-sentido.mp4';
        else if(label.includes('Programaciones')) src = '/media/bio/programaciones.mp4';
        else if(label.includes('Dobles')) src = '/media/bio/dobles.mp4';
        else if(label.includes('Práctica: línea del tiempo')) src = '/media/bio/linea-tiempo.mp4';
        else if(label.includes('Ritual: reconocimiento de excluidos')) src = '/media/bio/ritual-excluidos.mp4';
        else if(label.includes('Integración')) src = '/media/bio/integracion.mp4';
        else if(label.includes('Principios y lenguaje del cuerpo')) src = '/media/bio/03-principios.mp4';
        else if(label.includes('Práctica: observación amable')) src = '/media/bio/04-practica.mp4';
        else if(label.includes('Ritual de 7 días')) src = '/media/bio/ritual-7dias.mp4';
        else if(label.includes('Carta al cuerpo')) src = '/media/bio/carta-cuerpo.mp4';
        else if(label.includes('Agradecimiento al síntoma')) src = '/media/bio/agradecimiento.mp4';
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = label;
        a.setAttribute('data-src', src);
        a.style.pointerEvents = 'auto';
        a.style.color = '#3a2c48';
        a.style.textDecoration = 'none';
        a.setAttribute('tabindex', '0');
        span.replaceWith(a);
        a.addEventListener('click', e => { e.preventDefault(); playLesson(a); });
      } else {
        const a = li.querySelector('a');
        if(a){
          a.style.pointerEvents = 'auto';
          a.style.color = '#3a2c48';
          a.style.textDecoration = 'none';
          a.setAttribute('tabindex', '0');
        }
      }
    });
    alert('¡Listo! Contenido desbloqueado.');
  }
}));


// ================= FAVORITOS =================
// Función para restaurar el estado bloqueado al cerrar sesión
function restoreLockedState() {
  // Solo bloquear si es cierre de sesión, no al recargar
  // Volver a poner 'locked' y mostrar candados en todas las lecciones bloqueables
  $$('.leccion').forEach(li => {
    const a = li.querySelector('a');
    if (a && !a.hasAttribute('data-preview')) {
      li.classList.add('locked');
      const lockIcon = li.querySelector('.ic--lock');
      if(lockIcon) lockIcon.removeAttribute('hidden');
      a.style.pointerEvents = 'none';
      a.style.color = '#aaa';
      a.style.textDecoration = 'none';
      a.setAttribute('tabindex', '-1');
    }
  });
  // Ocultar recursos solo para dueños
  $$('[data-owned-only]').forEach(x => x.setAttribute('hidden', ''));
}

// Ejemplo: restaurar al cerrar sesión
window.addEventListener('logout', restoreLockedState);
window.addEventListener('logout', () => {
  restoreLockedState();
  // Animación de cierre de sesión
  let overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(255,255,255,0.85)';
  overlay.style.zIndex = 9999;
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontSize = '2rem';
  overlay.style.fontWeight = 'bold';
  overlay.style.color = '#444';
  overlay.style.transition = 'opacity 0.5s';
  overlay.innerHTML = '<span>⏳ Cerrando sesión...</span>';
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.style.opacity = 0;
    setTimeout(() => {
      location.reload();
    }, 400);
  }, 1200);
});
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
  // Disparar evento logout para animación y recarga
  window.dispatchEvent(new Event('logout'));
});
