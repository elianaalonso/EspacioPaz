// Si no hay usuario en localStorage, abrimos el modal (no redirigimos)
document.addEventListener('DOMContentLoaded', () => {
  const userLS = localStorage.getItem('espaciopaz_user_v1');
  if (!userLS) {
    // abre el modal de script.js
    if (typeof window.openAuth === 'function') window.openAuth('login');
    else document.dispatchEvent(new Event('open-auth-modal'));
  }
});

/* =========================================
   Mi Cuenta — JS vanilla (tabs, mock data, modales)
========================================= */
const $ = (sel,ctx=document)=>ctx.querySelector(sel);
const $$ = (sel,ctx=document)=>Array.from(ctx.querySelectorAll(sel));

const state = {
  user: {
    name: "",
    lastname: "",
    email: "",
    phone: "",
    bio: "",
    avatar: "../img/usuario-default.jpeg"
  },

  membership: null,      // cuando exista una tabla real, lo llenamos
  orders: [],            // lo vamos a llenar desde purchases reales
  addresses: [],         // futuro
  courses: [],           // lo vamos a llenar desde purchases + courses
  favorites: [],         // futuro
  payments: [],          // futuro
  sessions: [],          // futuro
  downloads: []          // futuro (storage)
};

// Exponer state para integraciones (Supabase)
window.state = state;


// INIT
window.addEventListener('DOMContentLoaded', () => {
  // Tabs por hash y por clic
  initTabs();
  renderAll();
  bindForms();
  bindDialogs();
});

function initTabs(){
  const navLinks = $$('.account-nav__link');
  const tabs = $$('.tab');
  const show = (key) => {
    navLinks.forEach(a=>a.classList.toggle('is-active', a.dataset.tab===key));
    tabs.forEach(t=>t.classList.toggle('is-visible', t.id === `tab-${key}`));
    if(location.hash !== `#${key}`) history.replaceState(null, '', `#${key}`);
  };
  navLinks.forEach(a=>a.addEventListener('click', (e)=>{ e.preventDefault(); show(a.dataset.tab); }));
  $$('#tab-resumen [data-tab-link]').forEach(l=>l.addEventListener('click', (e)=>{
    e.preventDefault();
    const frag = new URL(l.href).hash.replace('#','');
    show(frag);
  }));
  const initial = (location.hash||'#resumen').replace('#','');
  show(initial);
}

function renderAll(){
  // defensas (para no romper si está vacío)
  if (!state.user) state.user = { name:"", email:"", avatar:"../img/usuario-default.jpeg" };
  if (!state.orders) state.orders = [];
  if (!state.courses) state.courses = [];
  if (!state.downloads) state.downloads = [];
  // membership puede ser null, lo manejamos abajo

  // Header user
  // Mantener avatar desde localStorage si existe
  let userLS = null;
  try {
    userLS = JSON.parse(localStorage.getItem('espaciopaz_user_v1'));
  } catch {}
  if (userLS) {
    state.user = {
      ...state.user,
      ...userLS
    };
  }
  // Mostrar solo las primeras 3-4 letras del nombre
  let nombreCorto = state.user.name ? (state.user.name.length > 4 ? state.user.name.slice(0,4) : state.user.name) : 'Usuario';
  $('#userName').textContent = nombreCorto;
  $('#userEmail').textContent = state.user.email;
  $('#avatarImg').src = state.user.avatar;

  // Resumen
  const ms = state.membership;
  $('#summaryMembership').textContent = ms
    ? `${ms.status} — Plan ${ms.plan}. Renueva ${fmtDate(ms.renews)}`
    : "Sin membresía activa.";
  $('#summaryLastOrder').textContent = state.orders.length ? `${state.orders[0].title || state.orders[0].id} · ${fmtDate(state.orders[0].date)} · ${state.orders[0].total_display || '$' + state.orders[0].total}` : 'Sin pedidos';
  $('#summaryCourses').textContent = state.courses.length ? `${state.courses.length} curso(s)` : 'Sin cursos aún';

  // Perfil form
  $('#name').value = state.user.name;
  $('#lastname').value = state.user.lastname;
  $('#email').value = state.user.email;
  $('#phone').value = state.user.phone;
  $('#bio').value = state.user.bio;

  // Pedidos
  renderOrders();
  // Direcciones
  renderAddresses();
  // Cursos
  renderCourses();
  // Membresía
  const mStatus = state.membership;
  $('#membershipStatus').textContent = mStatus
    ? `${mStatus.status} · ${mStatus.plan} · Renueva ${fmtDate(mStatus.renews)}`
    : "Sin membresía activa.";
  // Pagos
  renderPayments();
  // Sesiones
  renderSessions();
  // Descargas
  renderDownloads();

  // Favoritos
  renderFavorites();

  // KPIs (si existen en el HTML)
  const elOrders = document.getElementById("kpiOrders");
  const elCourses = document.getElementById("kpiCourses");
  const elSpent = document.getElementById("kpiSpent");

  if (elOrders) elOrders.textContent = state.orders.length;
  if (elCourses) elCourses.textContent = state.courses.length;

  // gastado = suma de órdenes del año actual
  if (elSpent) {
    const year = new Date().getFullYear();
    const sum = (state.orders || [])
      .filter(o => String(o.date || "").includes(String(year)))
      .reduce((acc, o) => acc + (o.total || 0), 0);

    elSpent.textContent = sum ? `$${sum}` : "—";
  }
}

// Exponer renderAll para que cuenta.supabase.js pueda llamarla
window.renderAll = renderAll;

function renderOrders(){
  const wrap = $('#ordersWrap');
  if(!state.orders.length){ wrap.innerHTML = `<div class="empty">Aún no hay pedidos</div>`; return; }
  const rows = state.orders.map(o=>{
    const link = o.link ? (o.link.startsWith('html/') ? '../' + o.link : o.link) : '#';
    return `
    <tr>
      <td><strong>${o.title || o.id}</strong></td>
      <td>${fmtDate(o.date)}</td>
      <td>${o.total_display || `$${o.total}`}</td>
      <td>${badge(o.status)}</td>
      <td><a class="btn btn--light" href="${link}">Ir al curso</a></td>
    </tr>
  `}).join('');
  wrap.innerHTML = `
    <table class="table" role="table" aria-label="Historial de pedidos">
      <thead><tr><th>Curso</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderAddresses(){
  const list = $('#addressesList');
  if(!state.addresses.length){ list.innerHTML = `<div class="empty">Sin direcciones cargadas</div>`; return; }
  list.innerHTML = state.addresses.map(a=>`
    <div class="address ${a.isDefault?'is-default':''}">
      <strong>${a.fullName}</strong>
      <div class="address__meta"><span class="dot"></span><span>${a.street}, ${a.city}, ${a.state} ${a.zip}</span></div>
      <div class="muted">${a.phone||''}</div>
      <div class="actions">
        ${a.isDefault?'':'<button class="btn btn--light" data-action="makeDefault" data-id="'+a.id+'">Marcar principal</button>'}
        <button class="btn btn--light" data-action="edit" data-id="${a.id}">Editar</button>
        <button class="btn btn--ghost" data-action="remove" data-id="${a.id}">Eliminar</button>
      </div>
    </div>
  `).join('');
  // bind buttons
  $('#btnAddAddress').onclick = ()=>openAddressDialog();
  $$('#tab-direcciones [data-action]').forEach(b=>b.onclick = onAddressAction);
}

function renderCourses(){
  const grid = $('#coursesGrid');
  if(!state.courses.length){ grid.innerHTML = `<div class="empty">Aún no hay cursos</div>`; return; }
  grid.innerHTML = state.courses.map(c=>{
    // Ajustar link: si empieza con 'html/', agregar '../' 
    let courseLink = c.link || '/curso/' + c.id;
    if (courseLink.startsWith('html/')) {
      courseLink = '../' + courseLink;
    }
    return `
    <article class="course">
      <div class="course__media" style="background-image:url(${c.cover || '../img/usuario-default.jpeg'}); background-size:cover; background-position:center;" role="img" aria-label="Portada del curso"></div>
      <div class="course__body">
        <h3 class="course__title">${c.title}</h3>
        <div class="course__meta">
          <span>${Math.round(c.progress*100)}% completado</span>
          <a class="btn btn--light" href="${courseLink}">Continuar</a>
        </div>
      </div>
    </article>
  `;}).join('');
}

function renderPayments(){
  const list = $('#paymentsList');
  if(!state.payments.length){ list.innerHTML = `<div class="empty">Sin métodos de pago</div>`; return; }
  list.innerHTML = state.payments.map(p=>`
    <div class="payment">
      <div><strong>${p.brand}</strong> · •••• ${p.last4} · ${p.exp} ${p.default?'<span class="badge badge--ok">Predeterminada</span>':''}</div>
      <div>
        ${p.default?'':'<button class="btn btn--light" data-pm="default" data-id="'+p.id+'">Predeterminar</button>'}
        <button class="btn btn--ghost" data-pm="remove" data-id="${p.id}">Eliminar</button>
      </div>
    </div>
  `).join('');
  $$('#tab-pagos [data-pm]').forEach(b=>b.onclick = onPaymentAction);
  $('#btnAddCard').onclick = ()=>alert('Integrar con pasarela (Stripe/MercadoPago)');
}

function renderSessions(){
  const list = $('#sessionsList');
  if(!state.sessions.length){ list.innerHTML = `<div class="empty">Sin sesiones activas</div>`; return; }
  list.innerHTML = state.sessions.map(s=>`
    <div class="session">
      <div>${s.device} · ${s.ip} · ${s.last} ${s.current?'<span class="badge">Actual</span>':''}</div>
      <button class="btn btn--light" data-session="revoke" data-id="${s.id}">${s.current?'Cerrar aquí':'Revocar'}</button>
    </div>
  `).join('');
  $$('#tab-sesiones [data-session]').forEach(b=>b.onclick = onSessionAction);
}

function renderDownloads(){
  const list = $('#downloadsList');
  if(!state.downloads.length){ list.innerHTML = `<div class="empty">Sin descargas disponibles</div>`; return; }
  list.innerHTML = state.downloads.map(d=>`
    <div class="download">
      <div>${d.name} · ${fmtDate(d.date)}</div>
      <a class="btn btn--light" href="${d.url}">Descargar</a>
    </div>
  `).join('');
}

// Forms
function bindForms(){
  $('#formProfile').addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    state.user = { ...state.user,
      name: fd.get('name'), lastname: fd.get('lastname'), email: fd.get('email'), phone: fd.get('phone'), bio: fd.get('bio') };
    // Guardar en localStorage con la misma clave que usa la navbar
    try {
      localStorage.setItem('espaciopaz_user_v1', JSON.stringify(state.user));
    } catch {}
    if (window.renderAuthUI) window.renderAuthUI();
    renderAll();
    toast('Perfil actualizado');
  });
  $('#formPassword').addEventListener('submit', (e)=>{
    e.preventDefault();
    const cur = $('#pwdCurrent').value, n1 = $('#pwdNew').value, n2 = $('#pwdRepeat').value;
    if(n1.length < 8) return toast('La nueva contraseña debe tener al menos 8 caracteres');
    if(n1 !== n2) return toast('Las contraseñas no coinciden');
    // TODO: llamar API seguras
    e.currentTarget.reset();
    toast('Contraseña actualizada');
  });
  $('#formNotifications').addEventListener('submit', (e)=>{
    e.preventDefault();
    toast('Preferencias guardadas');
  });
}

// Address dialog
let editingAddressId = null;
function bindDialogs(){
  // Selector de avatar: abre modal
  const avatarBtn = document.getElementById('avatarBtn');
  const avatarModal = document.getElementById('avatarModal');
  const avatarImg = document.getElementById('avatarImg');
  const formAvatar = document.getElementById('formAvatar');
  const avatarFile = document.getElementById('avatarFile');

  if (avatarBtn && avatarModal) {
    avatarBtn.addEventListener('click', () => {
      avatarModal.showModal();
    });
  }

  if (formAvatar) {
    formAvatar.addEventListener('submit', (e) => {
      e.preventDefault();
      let newAvatar = null;
      const updateAvatar = (src) => {
        avatarImg.src = src;
        state.user.avatar = src;
        try {
          localStorage.setItem('espaciopaz_user_v1', JSON.stringify(state.user));
        } catch {}
        if (window.renderAuthUI) window.renderAuthUI();
        avatarModal.close();
      };
      if (avatarFile && avatarFile.files && avatarFile.files[0]) {
        const file = avatarFile.files[0];
        const reader = new FileReader();
        reader.onload = function(evt) {
          updateAvatar(evt.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        const selected = formAvatar.querySelector('input[name="avatar"]:checked');
        if (selected) {
          updateAvatar(selected.value);
        } else {
          avatarModal.close();
        }
      }
// Actualiza el avatar en la navbar
function actualizarAvatarNavbar(src) {
  const navbarAvatar = document.querySelector('.user-avatar img');
  if (navbarAvatar) {
    navbarAvatar.src = src;
  }
}

// Guarda el usuario actualizado en localStorage
function guardarUsuarioLocal() {
  try {
    localStorage.setItem('espaciopaz_user_v1', JSON.stringify(state.user));
  } catch {}
}
    });
  }
  $('#btnLogout').onclick = ()=>
    openConfirm('Cerrar sesión','¿Seguro que querés cerrar sesión?', ()=>{
      // TODO: llamar API logout
      toast('Sesión cerrada');
      // Limpiar todo el estado de usuario en localStorage si la función global está disponible
      if (typeof window.clearAllUserData === 'function') {
        try { window.clearAllUserData(); } catch(e){ console.error(e); }
      } else {
        try { localStorage.removeItem('espaciopaz_user_v1'); } catch(e){}
        try { localStorage.removeItem('espaciopaz_favs_v1'); } catch(e){}
        try { localStorage.removeItem('espaciopaz_cart_v1'); } catch(e){}
      }
      try { window.dispatchEvent(new Event('logout')); } catch(e){}
      location.href = '../index.html';
    });
  $('#btnDelete').onclick = ()=>
    openConfirm('Eliminar cuenta','Esta acción no se puede deshacer. ¿Seguro?', ()=>{
      // TODO: llamar API de borrado
      toast('Cuenta eliminada');
    });
}

function onAddressAction(e){
  const id = e.currentTarget.dataset.id;
  const action = e.currentTarget.dataset.action;
  if(action==='edit'){
    editingAddressId = id; openAddressDialog(state.addresses.find(a=>a.id===id));
  } else if(action==='remove'){
    openConfirm('Eliminar dirección','¿Querés eliminar esta dirección?', ()=>{
      state.addresses = state.addresses.filter(a=>a.id!==id);
      renderAddresses();
      toast('Dirección eliminada');
    });
  } else if(action==='makeDefault'){
    state.addresses = state.addresses.map(a=>({...a, isDefault:a.id===id}));
    renderAddresses();
    toast('Marcada como principal');
  }
}

function openAddressDialog(addr={}){
  const dlg = $('#dialogAddress');
  const form = $('#formAddress');
  form.reset();
  ['fullName','phone','street','city','state','zip','isDefault'].forEach(k=>{
    if(k==='isDefault') form.elements[k].checked = !!addr[k];
    else if(addr[k]) form.elements[k].value = addr[k];
  });
  dlg.showModal();
  $('#saveAddressBtn').onclick = ()=>{
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const model = { id: editingAddressId || `addr-${Date.now()}`,
      fullName:data.fullName, phone:data.phone, street:data.street, city:data.city, state:data.state, zip:data.zip,
      isDefault: !!fd.get('isDefault') };
    if(editingAddressId){
      state.addresses = state.addresses.map(a=>a.id===editingAddressId?{...model}:a);
    }else{
      if(model.isDefault) state.addresses = state.addresses.map(a=>({...a, isDefault:false}));
      state.addresses.push(model);
    }
    editingAddressId = null; dlg.close(); renderAddresses(); toast('Dirección guardada');
  };
}

function onPaymentAction(e){
  const id = e.currentTarget.dataset.id;
  const type = e.currentTarget.dataset.pm;
  if(type==='default'){
    state.payments = state.payments.map(p=>({...p, default:p.id===id}));
    renderPayments(); toast('Método predeterminado');
  } else if(type==='remove'){
    openConfirm('Eliminar método','¿Eliminar esta tarjeta?', ()=>{
      state.payments = state.payments.filter(p=>p.id!==id);
      renderPayments(); toast('Método eliminado');
    });
  }
}

function onSessionAction(e){
  const id = e.currentTarget.dataset.id;
  const s = state.sessions.find(x=>x.id===id);
  if(s.current){ toast('Cerrando sesión actual…'); /* llamar API */ }
  state.sessions = state.sessions.filter(x=>x.id!==id);
  renderSessions(); toast('Sesión revocada');
}

// Helpers UI
function badge(status){
  const norm = (status||'').toLowerCase();
  let cls = 'badge';
  if(/entregado|complet/.test(norm)) cls += ' badge--ok';
  else if(/curso|pend|en curso|proces/.test(norm)) cls += ' badge--warn';
  else if(/cancel|fall/.test(norm)) cls += ' badge--err';
  return `<span class="${cls}">${status}</span>`;
}
function fmtDate(iso){
  if(!iso) return "—";
  try{
    const d = iso.includes("T") ? new Date(iso) : new Date(`${iso}T00:00:00`);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-UY");
  }catch{
    return "—";
  }
}

function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg; el.className = 'toast';
  Object.assign(el.style,{position:'fixed',inset:'auto 1rem 1rem auto',padding:'.6rem .8rem',background:'#2e2a32',color:'#fff',borderRadius:'12px',boxShadow:'var(--shadow)',zIndex:99,opacity:0,transition:'opacity .15s ease'});
  document.body.appendChild(el); requestAnimationFrame(()=>el.style.opacity=1);
  setTimeout(()=>{ el.style.opacity=0; el.addEventListener('transitionend',()=>el.remove(),{once:true}); }, 1800);
}

// Confirm dialog generic
function openConfirm(title, msg, onOk){
  const dlg = $('#dialogConfirm');
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = msg;
  dlg.showModal();
  $('#confirmOkBtn').onclick = ()=>{ dlg.close(); onOk?.(); };
}

/* =====================
   Favoritos (Mi cuenta)
   Lee/escribe la misma clave usada en paginas de curso (curso.js)
===================== */
// Clave de storage usada por curso.js
const FAV_STORAGE_KEY = 'espaciopaz_favs_v1';

function readFavIds(){
  try{ return JSON.parse(localStorage.getItem(FAV_STORAGE_KEY)) || []; }
  catch{ return []; }
}
function writeFavIds(ids){
  try{ localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(ids)); }catch{}
}

// Mapea IDs -> metadatos para mostrar (completalo a medida que sumes cursos)
const FAV_META = {
  'curso-biodecodificacion-n1': { title: 'Biodescodificación Emocional — Nivel 1', kind:'course', href: '../html/cursos/biodecodificacion-emocional-nivel-1.html', img: '../img/bio.png' },
  'curso-biodecodificacion-n2': { title: 'Biodescodificación Emocional — Nivel 2 (Transgeneracional)', kind:'course', href: '../html/cursos/biodecodificacion-emocional-nivel-2.html', img: '../img/bio.png' },
  'curso-reiki-usui-n1': { title: 'Reiki Usui — Nivel 1', kind:'course', href: '../html/cursos/reiki-usui-nivel-1.html', img: '../img/reiki1.jpg' },
  'curso-reiki-usui-n2': { title: 'Reiki Usui — Nivel 2', kind:'course', href: '../html/cursos/reiki-usui-nivel-2.html', img: '../img/reiki2.png' },
  'curso-reiki-usui-n3': { title: 'Reiki Usui — Nivel 3', kind:'course', href: '../html/cursos/reiki-usui-nivel-3.html', img: '../img/reiki3.png' },
  'curso-mentoria-herida-al-alma': { title: 'Mentoría — De la herida al alma', kind:'course', href: '../html/cursos/mentoria-de-la-herida-al-alma.html', img: '../img/reiki3.png' },
};

function favsToObjects(ids){
  return (ids||[]).map(id => {
    const meta = FAV_META[id] || {};
    return {
      id,
      title: meta.title || (id || 'Favorito'),
      kind: meta.kind || 'course',
      href: meta.href || '../html/cursos.html',
      img: meta.img || ''
    };
  });
}

function renderFavorites(){
  const grid = $('#favsGrid');
  if(!grid) return;
  const favs = window.state.favorites || [];

  if(!favs.length){
    grid.innerHTML = `
      <div class="placeholder">
        <div class="placeholder__row">Aún no agregaste favoritos.</div>
        <div class="placeholder__row">Tocá el corazón en un curso para guardarlo acá.</div>
        <a class="btn" href="../html/cursos.html">Ver cursos</a>
      </div>`;
    return;
  }

  grid.innerHTML = favs.map(f => {
    // Obtener imagen del fav
    const img = f.img ? `background-image: url('${f.img}')` : '';
    const typeLabel = f.type === 'course' ? 'Curso' : (f.type === 'ritual' ? 'Ritual' : 'Meditación');
    return `
    <article class="favorite">
      <div class="favorite__media" role="img" aria-label="${f.title}" style="${img}"></div>
      <div class="favorite__body">
        <h3 class="favorite__title">${f.title}</h3>
        <div class="favorite__meta">
          <span>${typeLabel}</span>
          <div>
            ${f.href ? `<a class="btn btn--light" href="${f.href}">Abrir</a>` : ''}
            <button class="btn btn--ghost" data-unfav-type="${f.type}" data-unfav-id="${f.id}">Quitar</button>
          </div>
        </div>
      </div>
    </article>
  `;
  }).join('');
}

// Quitar desde la pestaña Favoritos
addEventListener('click', (e)=>{
  const btn = e.target.closest?.('[data-unfav-id]');
  if(!btn) return;
  const type = btn.getAttribute('data-unfav-type');
  const id = btn.getAttribute('data-unfav-id');
  // Emitir evento que cuenta.supabase.js escucha
  document.dispatchEvent(new CustomEvent('favorites:remove', {
    detail: { type, id }
  }));
});

