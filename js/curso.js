// ========== Bloqueo de recursos y recursos adicionales ========== 
function updateResourceLockState() {
  const owned = document.body.classList.contains('is-owned');
  document.querySelectorAll('.res-card[data-resource]').forEach(card => {
    if (owned) {
      card.style.pointerEvents = '';
      card.style.color = '';
      card.style.textDecoration = '';
      card.removeAttribute('tabindex');
      card.classList.remove('locked-resource');
    } else {
      card.style.pointerEvents = 'none';
      card.style.color = '#aaa';
      card.style.textDecoration = 'none';
      card.setAttribute('tabindex', '-1');
      card.classList.add('locked-resource');
    }
  });
}

// Ejecutar al cargar y al cambiar estado de compra/sesión
// window.addEventListener('DOMContentLoaded', updateResourceLockState); // Desactivado: no bloquear al recargar
window.addEventListener('logout', updateResourceLockState);
// Solo desbloquear recursos si el curso está comprado
function updateResourceLockStateStrict() {
  const owned = document.body.classList.contains('is-owned');
  document.querySelectorAll('.res-card[data-resource]').forEach(card => {
    if (owned) {
      card.style.pointerEvents = '';
      card.style.color = '';
      card.style.textDecoration = '';
      card.removeAttribute('tabindex');
      card.classList.remove('locked-resource');
    } else {
      card.style.pointerEvents = 'none';
      card.style.color = '#aaa';
      card.style.textDecoration = 'none';
      card.setAttribute('tabindex', '-1');
      card.classList.add('locked-resource');
    }
  });
}
window.addEventListener('DOMContentLoaded', updateResourceLockStateStrict);
window.addEventListener('logout', updateResourceLockStateStrict);
window.addEventListener('unlockAllIfOwned', updateResourceLockStateStrict);

// Si se compra el curso, desbloquear recursos
function unlockAllIfOwned() {
  unlockLessonsIfOwned();
  updateResourceLockState();
}
window.unlockAllIfOwned = unlockAllIfOwned;


// Checklist visual en cada lección y barra de progreso por módulo
function setModuleProgress(){
  $$('.modulo').forEach(mod => {
    const lis = [...mod.querySelectorAll('.leccion')];
    const total = lis.length;
    const done = lis.filter(li => (li.dataset.done === "1")).length;
    const pct = total ? Math.round(100*done/total) : 0;

    // Barra de progreso por módulo
    let bar = mod.querySelector('.progress i');
    if(!bar){
      let wrap = mod.querySelector('.progress');
      if(!wrap){ wrap = document.createElement('div'); wrap.className = 'progress'; wrap.innerHTML = '<i></i>'; mod.appendChild(wrap); }
      bar = wrap.querySelector('i');
    }
    bar.style.width = pct + '%';

    // Porcentaje en el header
    const hd = mod.querySelector('.modulo__hd');
    let s = hd.querySelector('.pct'); if(!s){ s = document.createElement('span'); s.className='pct'; hd.appendChild(s); }
    s.textContent = ` ${pct}%`;

    // Checklist visual en cada lección
    lis.forEach(li => {
      let check = li.querySelector('.tick');
      if(!check){
        check = document.createElement('button');
        check.type = 'button';
        check.className = 'tick';
        check.setAttribute('aria-label','Marcar completada');
        // Si hay .time, insertarlo después; si no, al final
        const timeSpan = li.querySelector('.time');
        if(timeSpan && timeSpan.nextSibling){
          li.insertBefore(check, timeSpan.nextSibling);
        }else{
          li.appendChild(check);
        }
        check.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          window.markDone(li, li.dataset.done !== "1");
        });
      }
      if(li.dataset.done === "1"){
        check.textContent = '✓';
      }else{
        check.textContent = '';
      }
    });
  });
}

// Actualizar checklist y barra al marcar done
const _oldMarkDone = typeof markDone === 'function' ? markDone : null;
window.markDone = function(li, value){
  if(_oldMarkDone) _oldMarkDone(li, value);
  setModuleProgress();
};

// Actualizar checklist y barra al iniciar
document.addEventListener('DOMContentLoaded', setModuleProgress);

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const body = document.body;
const OWNED_KEY = `owned_${body.dataset.courseId}`;
const USER_KEY = 'espaciopaz_user_v1';

// ============ Helpers ============
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();

function bindLessonClick(a){
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const src = a.dataset.src || a.getAttribute('href');
    if(!src) return;
    if (typeof playLesson === 'function') playLesson(a);
    else if (typeof setPlayer === 'function') setPlayer({ src, provider: a.dataset.provider||'mp4', title: a.textContent.trim() }, a.closest('.leccion'));
  });
}

function unlockLessonsIfOwned(){
  if(!document.body.classList.contains('is-owned')) return;

  document.querySelectorAll('.leccion.locked').forEach(li => {
    // si ya tiene <a>, no hacemos nada (evita duplicados tipo "Bienvenida")
    if (li.querySelector('a')) { li.classList.remove('locked'); return; }

    const src = li.dataset.src;
    const provider = li.dataset.provider || 'mp4';
    if (!src) return;

    const labelEl = li.querySelector('span:nth-child(2)') || li.querySelector('span:not(.ic):not(.time)');
    const timeEl  = li.querySelector('.time') || li.appendChild(document.createElement('span'));
    timeEl.classList.add('time');

    const a = document.createElement('a');
    a.textContent = (labelEl?.textContent || '').trim();
    a.href = '#';
    a.dataset.src = src;
    a.dataset.provider = provider;

    if (labelEl && labelEl.tagName.toLowerCase() === 'span') labelEl.replaceWith(a);
    else li.insertBefore(a, timeEl);

    // icono: candado -> play
    const ic = li.querySelector('.ic');
    if (ic){
      ic.classList.remove('ic--lock');
      ic.classList.add('ic--play');
      ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l10 6-10 6z"/></svg>';
    }

    li.classList.remove('locked');
    bindLessonClick(a);
  });

  // Recalcular duraciones si tenés esa lógica
  if (typeof assignVideosAndDurations === 'function') {
    assignVideosAndDurations();
  }
}
function parseMMSS(s){ const m = (s||'').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]*60 + +m[2]) : 0; }
function mmToLabel(totalSec){
  const h = Math.floor(totalSec/3600), m = Math.round((totalSec%3600)/60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
function updateAllModuleTotals(){
  document.querySelectorAll('.modulo').forEach(mod=>{
    const secs = [...mod.querySelectorAll('.time')].map(el => parseMMSS(el.textContent)).reduce((a,b)=>a+b,0);
    const lessons = mod.querySelectorAll('.leccion').length;
    const meta = mod.querySelector('.modulo__meta');
    if (meta) meta.textContent = `${lessons} lecciones • ${mmToLabel(secs)}`;
  });
}

function readUser(){
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

// Restaurar estado
// Lista de videos de YouTube aleatorios para demo
const YT_VIDEOS = [
  'https://www.youtube.com/watch?v=ysz5S6PUM-U',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
  'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=60ItHLz5WEA',
  'https://www.youtube.com/watch?v=OPf0YbXqDm0',
  'https://www.youtube.com/watch?v=RgKAFK5djSk'
];

// Utilidad para obtener el ID de YouTube
function getYouTubeId(url){
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
  return match ? match[1] : null;
}

// Utilidad para obtener duración de video YouTube (API pública)
async function fetchYouTubeDuration(videoId){
  // Demo: usar API pública de noembed para obtener duración aproximada
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    // data.duration está en segundos
    if(data && data.duration) return data.duration;
  } catch{}
  return null;
}

// Formatear segundos a mm:ss
function formatDuration(sec){
  if(!sec) return '--:--';
  const m = Math.floor(sec/60);
  const s = Math.round(sec%60);
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// Asignar videos y duraciones a las lecciones
async function assignVideosAndDurations(){
  const lecciones = document.querySelectorAll('.leccion');
  let totalSec = 0;
  // ...el resto de la función puede quedar vacío o solo con lógica de asignación de videos si lo necesitas...
}

// Ejecutar al cargar
window.addEventListener('DOMContentLoaded', () => {
  assignVideosAndDurations();
  try{
    if(localStorage.getItem(OWNED_KEY)==='1'){
      body.classList.add('is-owned');
      unlockLessonsIfOwned();
    }
  }catch{}
});

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
document.querySelectorAll('.leccion a[data-src]:not([data-preview])').forEach(a=>{
  a.addEventListener('click', e => { e.preventDefault(); playLesson(a); });
});

// AUTOCARGA: primera preview o primera lección si la usuaria es dueña
// El reproductor solo aparece al hacer click, no autoload

// Comprar: solo si está logueado
$$('.js-comprar').forEach(b => b.addEventListener('click', (e) => {
  const user = readUser();
  if (!user) {
    e.preventDefault();
    if (typeof openAuth === 'function') openAuth('login');
    else document.dispatchEvent(new CustomEvent('open-auth-modal'));
    return;
  }

  if(confirm('¿Simular compra y desbloquear el curso?')){
  body.classList.add('is-owned');
  try{ localStorage.setItem(OWNED_KEY,'1'); }catch{}
  unlockAllIfOwned();
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
}

// Ejemplo: restaurar al cerrar sesión
window.addEventListener('logout', restoreLockedState);
window.addEventListener('logout', () => {
  // Eliminar progreso y completados del curso actual
  try {
    localStorage.removeItem(`done_${body.dataset.courseId}`);
    localStorage.removeItem(`dur_${body.dataset.courseId}`);
    localStorage.removeItem(`owned_${body.dataset.courseId}`);
  } catch(e){}
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
  // Disparar evento logout para animación y recarga
  window.dispatchEvent(new Event('logout'));
});

// ================= DURACIONES AUTO (lecciones y módulos) =================
(function(){
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const $  = (s, el=document) => el.querySelector(s);

  // --- formatos ---
  const pad2 = n => String(n).padStart(2,'0');
  function secondsToClock(s){
    s = Math.max(0, Math.floor(s||0));
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return h ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
  }
  function secondsToHM(s){
    s = Math.round(s/60); // a minutos
    const h = Math.floor(s/60);
    const m = s%60;
    return h ? `${h} h ${m} min` : `${m} min`;
  }
  function parseDurationToSeconds(txt){
    if(!txt) return 0;
    const s = String(txt).trim().toLowerCase();

    // H:MM:SS
    let m = s.match(/^(\d+):([0-5]?\d):([0-5]?\d)$/);
    if(m) return (+m[1])*3600 + (+m[2])*60 + (+m[3]);

    // MM:SS
    m = s.match(/^([0-5]?\d):([0-5]?\d)$/);
    if(m) return (+m[1])*60 + (+m[2]);

    // "X h Y min" | "Xh Ym" | "X h" | "Y min"
    m = s.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?/);
    if(m && (m[1] || m[2])){
      return (+(m[1]||0))*3600 + (+(m[2]||0))*60;
    }
    return 0;
  }

  // --- YouTube helper (solo si hace falta) ---
  let ytApiReady;
  function ensureYT(){
    if(ytApiReady) return ytApiReady;
    ytApiReady = new Promise(res=>{
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => res();
    });
    return ytApiReady;
  }
  function parseYTId(url){
    try{
      const u = new URL(url);
      if(u.hostname.includes('youtu.be')){
        return u.pathname.slice(1);
      }
      if(u.hostname.includes('youtube.com')){
        if(u.searchParams.get('v')) return u.searchParams.get('v');
        const m = u.pathname.match(/\/embed\/([A-ZaZ0-9_-]+)/);
        if(m) return m[1];
      }
    }catch{}
    return null;
  }
  function getYouTubeDurationSec(videoId){
    return ensureYT().then(()=> new Promise(resolve=>{
      const holder = document.createElement('div');
      holder.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(holder);
      /* global YT */
      const player = new YT.Player(holder, {
        width: 1, height: 1, videoId,
        events: {
          onReady: () => {
            // a veces da 0 al principio; reintentar breve
            const start = performance.now();
            (function tick(){
              const d = Math.floor(player.getDuration() || 0);
              if(d>0 || performance.now()-start>3000){
                try{ player.destroy(); }catch{}
                holder.remove();
                resolve(d>0 ? d : 0);
              } else {
                requestAnimationFrame(tick);
              }
            })();
          }
        }
      });
    }));
  }

  // --- archivos de vídeo (mp4/webm) ---
  function getFileVideoDurationSec(src){
    return new Promise(resolve=>{
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.src = src;
      const done = () => {
        const d = Math.floor(v.duration || 0);
        cleanup(); resolve(d);
      };
      const fail = () => { cleanup(); resolve(0); };
      const cleanup = () => {
        v.removeEventListener('loadedmetadata', done);
        v.removeEventListener('error', fail);
        v.src = '';
      };
      v.addEventListener('loadedmetadata', done);
      v.addEventListener('error', fail);
      // por si no dispara nunca
      setTimeout(fail, 7000);
    });
  }

  // --- escribir tiempo en .time sin perder la .tag ---
  function renderTime(elTime, seconds){
    const tag = elTime.querySelector('.tag');
    elTime.dataset.seconds = seconds || 0;
    elTime.textContent = seconds ? secondsToClock(seconds) : '';
    if(tag){ elTime.append(' '); elTime.append(tag); }
  }

  // --- sumar módulo ---
  function updateModuloMeta(mod){
    const meta = $('.modulo__meta', mod);
    if(!meta) return;
    let total = 0;
    $$('.leccion .time', mod).forEach(t=>{
      const ds = +t.dataset.seconds || 0;
      // si aún no tiene dataset pero sí texto tipo "04:12", lo parseo
      if(!ds){
        const parsed = parseDurationToSeconds(t.textContent);
        if(parsed){
          t.dataset.seconds = parsed;
          renderTime(t, parsed);
          total += parsed;
        }
      }else{
        total += ds;
      }
    });
    const lessons = $$('.leccion', mod).length;
    meta.textContent = `${lessons} lecciones • ${secondsToHM(total)}`;
  }

  async function resolveOneLesson(lessonLi){
    try {
      const timeEl = $('.time', lessonLi) || lessonLi.appendChild(Object.assign(document.createElement('span'),{className:'time'}));

      // 1) data-duration explícito
      const explicit = lessonLi.dataset.duration || timeEl.dataset.duration;
      if(explicit){
        const sec = parseDurationToSeconds(explicit);
        renderTime(timeEl, sec);
        return sec;
      }

      // 2) si ya viene texto, úsalo
      const existing = parseDurationToSeconds(timeEl.textContent);
      if(existing){
        renderTime(timeEl, existing);
        return existing;
      }

      // 3) data-youtube o data-src en <a> o <li>
      const a = lessonLi.querySelector('[data-youtube], [data-src]');
      const liSrc = lessonLi.dataset.src || null;
      const aSrc  = a?.dataset?.src || null;
      const ytId  = a?.dataset?.youtube || parseYTId(aSrc || liSrc);

      let seconds = 0;
      if (ytId) {
        seconds = await getYouTubeDurationSec(ytId);
      } else if (aSrc || liSrc) {
        seconds = await getFileVideoDurationSec(aSrc || liSrc);
      }

      renderTime(timeEl, seconds);
      return seconds;
    } catch {
      renderTime($('.time', lessonLi) || lessonLi, 0);
      return 0;
    }
  }

  // --- proceso general ---
  (async function boot(){
    let grandTotal = 0;
    let totalLessonsAcross = 0;

    for (const mod of $$('.modulo')) {
      const lessons = $$('.leccion', mod);

      // Resolver duraciones de cada lección (en paralelo por módulo)
      await Promise.all(lessons.map(li => resolveOneLesson(li)));

      // Actualizar el encabezado del módulo
      updateModuloMeta(mod);

      // Acumular totales globales
      totalLessonsAcross += lessons.length;
      $$('.leccion .time', mod).forEach(t => {
        grandTotal += (+t.dataset.seconds || 0);
      });
    }

    // ---- Actualizar meta del HERO ----
    const heroMeta = $('.curso-hero .meta');
    if (heroMeta) {
      // Duración total
      const durSpan = [...heroMeta.querySelectorAll('span')]
        .find(s => /duración:/i.test(s.textContent));
      if (durSpan) {
        durSpan.innerHTML = `<strong>Duración:</strong> ${secondsToHM(grandTotal)}`;
      }

      // Cantidad total de clases
      const clsSpan = [...heroMeta.querySelectorAll('span')]
        .find(s => /clases:/i.test(s.textContent));
      if (clsSpan) {
        clsSpan.innerHTML = `<strong>Clases:</strong> ${totalLessonsAcross} lecciones`;
      }
    }
  })();
})();

// ================= PREVIEW INLINE (estilo Domestika) =================
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-preview]');
  if (!a) return;
  e.preventDefault();
  toggleInlinePreview(a);
});

function toggleInlinePreview(anchor){
  const li = anchor.closest('.leccion');
  if (!li) return;

  // Si ya está abierto en este, cerrarlo y salir
  if (li.nextElementSibling?.classList.contains('preview-slot')) {
    li.nextElementSibling.remove();
    return;
  }

  // Cerrar cualquier otro preview abierto
  document.querySelectorAll('.preview-slot.open').forEach(s => s.remove());

  // Crear contenedor
  const slot = document.createElement('div');
  slot.className = 'preview-slot open';
  slot.innerHTML = renderPreviewHTML(anchor);
  li.after(slot);

  // Enfocar para accesibilidad
  const focusable = slot.querySelector('iframe,video');
  focusable?.focus({preventScroll:true});
}

function renderPreviewHTML(anchor){
  const yt = anchor.dataset.youtube;          // ej: data-youtube="dQw4w9WgXcQ"
  const src = anchor.dataset.src;             // ej: data-src="/videos/bienvenida.mp4"

  if (yt) {
    const url = `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`;
    return `
      <div class="preview-inner">
        <div class="player-box">
          <iframe src="${url}" title="Preview" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>`;
  }

  if (src) {
    return `
      <div class="preview-inner">
        <div class="player-box">
          <video src="${src}" controls playsinline></video>
        </div>
      </div>`;
  }

  // Fallback si aún no definiste fuente
  return `
    <div class="preview-inner">
      <div class="player-box fallback">
        <p>La preview estará disponible pronto.</p>
      </div>
    </div>`;
}

// --- Ticks clickeables y progreso ---
function bindTicks(){
  $$('.leccion .tick').forEach(tick=>{
    // evitar doble binding
    if(tick.dataset.bound) return; tick.dataset.bound = '1';

    tick.addEventListener('click', (e)=>{
      e.stopPropagation(); // que no dispare el link
      const row = tick.closest('.leccion');

      // Soportar <input type="checkbox"> o <button>
      if(tick.type === 'checkbox'){
        row.classList.toggle('is-done', tick.checked);
      }else{
        const on = !(tick.getAttribute('aria-pressed')==='true');
        tick.setAttribute('aria-pressed', String(on));
        tick.classList.toggle('is-on', on);
        row.classList.toggle('is-done', on);
      }

      // Actualizar progreso (tu función existente)
      if(typeof updateProgress === 'function') updateProgress();
    });
  });
}

// Llamalo al iniciar y cada vez que renderices el player/listas
bindTicks();

// ===== Checklist + % por módulo + progreso global =====
(function(){
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const COURSE_ID = document.body.dataset.courseId || 'curso';
  const DONE_KEY  = `done_${COURSE_ID}`;

  function loadDone(){
    try{ return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; }catch{ return {}; }
  }
  function saveDone(map){ localStorage.setItem(DONE_KEY, JSON.stringify(map)); }

  const doneMap = loadDone();

  // Etiquetar lecciones con un id estable y montar el tick
  $$('.modulo').forEach((mod, mi)=>{
    // chip % a la izquierda del título
    const hd = mod.querySelector('.modulo__hd');
    if(hd && !hd.querySelector('.pct')){
      const chip = document.createElement('span');
      chip.className = 'pct';
      chip.textContent = '0%';
      hd.insertBefore(chip, hd.firstChild);
    }

    $$('.leccion', mod).forEach((li, lii)=>{
      const id = `${mi+1}:${lii+1}`;
      li.dataset.lid = id;

      // insertar tick (después del icono)
      if(!li.querySelector('.tick')){
        const tick = document.createElement('input');
        tick.type = 'checkbox';
        tick.className = 'tick';
        tick.title = 'Marcar lección como completada';
        const afterIcon = li.children[1] || null;
        li.insertBefore(tick, afterIcon); // icono (0), tick (1)
        tick.addEventListener('click', e => e.stopPropagation());
        tick.addEventListener('change', ()=>{
          const on = tick.checked;
          li.dataset.done = on ? '1' : '0';
          li.classList.toggle('is-done', on);
          doneMap[id] = on ? 1 : 0;
          saveDone(doneMap);
          updateModuleProgress(mod);
          updateGlobalProgress();
        });
      }

      // restaurar estado
      const on = !!doneMap[id];
      li.dataset.done = on ? '1' : '0';
      li.classList.toggle('is-done', on);
      const t = li.querySelector('.tick'); if(t) t.checked = on;
    });

    updateModuleProgress(mod);
  });

  function updateModuleProgress(mod){
    const all  = $$('.leccion', mod).length;
    const done = $$('.leccion[data-done="1"]', mod).length;
    const pct  = all ? Math.round(100*done/all) : 0;
    const chip = mod.querySelector('.modulo__hd .pct');
    if(chip) chip.textContent = `${pct}%`;
  }

  function updateGlobalProgress(){
    const allLessons  = $$('.leccion').length;
    const doneLessons = $$('.leccion[data-done="1"]').length;
    const pct = allLessons ? Math.round(100*doneLessons/allLessons) : 0;

    // Barra y texto del bloque "progreso-curso"
    const bar = $('.progreso-barra .progreso-fill');
    if(bar) bar.style.width = pct + '%';
    const pctTxt = $('.progreso-text .prog-pct');    if(pctTxt) pctTxt.textContent = pct + '%';
    const dTxt   = $('.progreso-text .prog-done');   if(dTxt)   dTxt.textContent   = doneLessons;
    const tTxt   = $('.progreso-text .prog-total');  if(tTxt)   tTxt.textContent   = allLessons;

    // Texto del HERO
    const heroPct = $('#pctGlobal');
    if(heroPct) heroPct.textContent = `Progreso: ${pct}% completado`;
  }

  // expone por si querés actualizar desde otros lugares
  window.updateProgress = updateGlobalProgress;

  // primera pintada
  updateGlobalProgress();
})();
