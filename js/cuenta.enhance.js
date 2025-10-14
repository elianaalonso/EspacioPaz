/* cuenta.enhance.js — inyecta contenido “de relleno útil”
   No toca tu estado ni funciones. Se ejecuta solo si encuentra los nodos. */
(function(){
  const $=(s,c=document)=>c.querySelector(s);
  const html=(str)=>{const t=document.createElement('template');t.innerHTML=str.trim();return t.content};

  function once(id, host){
    if(!host || host.dataset?.enhanced===id) return false;
    host.dataset.enhanced = id;
    return true;
  }

  // ===== RESUMEN: KPIs + atajos =====
  (function enhanceResumen(){
    const tab = $('#tab-resumen .card'); if(!tab || !once('resumen', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="kpis">
        <div class="kpi"><div class="kpi__value">12</div><div class="kpi__label">Pedidos totales</div></div>
        <div class="kpi"><div class="kpi__value">2</div><div class="kpi__label">Cursos activos</div></div>
        <div class="kpi"><div class="kpi__value">$2.970</div><div class="kpi__label">Gastado 2025</div></div>
      </div>
      <div class="divider"></div>
      <div class="cards-3">
        <div class="mcard"><div class="mcard__title">Actualizar perfil</div><p class="mcard__text">Nombre, email, bio y teléfono.</p></div>
        <div class="mcard"><div class="mcard__title">Dirección principal</div><p class="mcard__text">Usada por defecto en envíos.</p></div>
        <div class="mcard"><div class="mcard__title">Métodos de pago</div><p class="mcard__text">Gestioná tus tarjetas.</p></div>
      </div>
    `));
  })();

  // ===== PEDIDOS: actividad reciente =====
  (function enhancePedidos(){
    const tab = $('#tab-pedidos .card'); if(!tab || !once('pedidos', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="timeline">
        <div class="ti"><strong>EP-1042</strong> entregado — 01/10/2025</div>
        <div class="ti"><strong>EP-1036</strong> en curso — 12/09/2025</div>
        <div class="ti"><strong>EP-1021</strong> cancelado — 28/08/2025</div>
      </div>
    `));
  })();

  // ===== DIRECCIONES: tips =====
  (function enhanceDirecciones(){
    const tab = $('#tab-direcciones .card'); if(!tab || !once('direcciones', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="benefits">
        <div class="benefit">Podés tener varias direcciones y elegir una principal.</div>
        <div class="benefit">Editá o eliminá cuando quieras: el cambio es inmediato.</div>
      </div>
    `));
  })();

  // ===== CURSOS: “descubre más” estático =====
  (function enhanceCursos(){
    const tab = $('#tab-cursos .card'); if(!tab || !once('cursos', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="mcard"><div class="mcard__title">Próxima clase</div><p class="mcard__text">Viernes 19:00 — Meditación guiada.</p></div>
      <div class="discover">
        <div class="mcard"><div class="mcard__title">Reiki II</div><p class="mcard__text">Profundizá tu práctica.</p></div>
        <div class="mcard"><div class="mcard__title">Sonido y gong</div><p class="mcard__text">Explorá vibraciones sanadoras.</p></div>
        <div class="mcard"><div class="mcard__title">Respiración consciente</div><p class="mcard__text">Rutinas diarias.</p></div>
      </div>
    `));
  })();

  // ===== FAVORITOS: si está vacío, sugerí acciones =====
  (function enhanceFavoritos(){
    const tab = $('#tab-favoritos .card'); if(!tab || !once('favs', tab)) return;
    const grid = $('#favsGrid');
    if(grid && grid.children.length===0){
      grid.before(html(`
        <div class="mcard"><div class="mcard__title">¿Aún sin favoritos?</div>
        <p class="mcard__text">Tocá el corazón en cursos o recursos para guardarlos acá.</p></div>
        <div class="divider"></div>
      `));
    }
  })();

  // ===== MEMBRESÍA: beneficios + próximos cargos =====
  (function enhanceMembresia(){
    const tab = $('#tab-membresia .card'); if(!tab || !once('membresia', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="benefits">
        <div class="benefit">Acceso ilimitado a cursos incluidos.</div>
        <div class="benefit">Materiales descargables actualizados.</div>
        <div class="benefit">Descuentos en talleres en vivo.</div>
      </div>
      <div class="divider"></div>
      <table class="table table--mini" aria-label="Próximos cargos">
        <thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead>
        <tbody>
          <tr><td>09/11/2025</td><td>Renovación plan mensual</td><td>$890</td></tr>
        </tbody>
      </table>
    `));
  })();

  // ===== PAGOS: últimos movimientos =====
  (function enhancePagos(){
    const tab = $('#tab-pagos .card'); if(!tab || !once('pagos', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <table class="table table--mini" aria-label="Últimos movimientos">
        <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead>
        <tbody>
          <tr><td>01/10/2025</td><td>EP-1042</td><td>$1890</td></tr>
          <tr><td>12/09/2025</td><td>EP-1036</td><td>$890</td></tr>
        </tbody>
      </table>
    `));
  })();

  // ===== SEGURIDAD: FAQs simples =====
  (function enhanceSeguridad(){
    const tab = $('#tab-seguridad .card'); if(!tab || !once('seg', tab)) return;
    tab.append(html(`
      <div class="faqs">
        <details><summary>¿Cada cuánto cambiar la contraseña?</summary><p>Recomendado cada 6–12 meses o si detectás actividad inusual.</p></details>
        <details><summary>¿Cómo cierro sesiones en otros dispositivos?</summary><p>Usá “Sesiones activas” y revocá cualquier sesión que no reconozcas.</p></details>
      </div>
    `));
  })();

  // ===== NOTIFICACIONES: checklist breve =====
  (function enhanceNotificaciones(){
    const tab = $('#tab-notificaciones .card'); if(!tab || !once('notif', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="benefits">
        <div class="benefit">Podés pausar emails promocionales cuando quieras.</div>
        <div class="benefit">Los recordatorios de clases llegan 24 h antes.</div>
      </div>
    `));
  })();

  // ===== DESCARGAS: tips + timeline =====
  (function enhanceDescargas(){
    const tab = $('#tab-descargas .card'); if(!tab || !once('desc', tab)) return;
    tab.append(html(`
      <div class="divider"></div>
      <div class="timeline">
        <div class="ti">Se agregó <strong>Complemento_Biodescodificación.pdf</strong> — 04/10/2025</div>
        <div class="ti">Se actualizó <strong>Ritual_7_dias.pdf</strong> — 20/09/2025</div>
      </div>
    `));
  })();

})();
