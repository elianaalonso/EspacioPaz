/* js/blog.js */

(() => {
  // ---------- Animación al hacer scroll ----------
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = Array.from(document.querySelectorAll('.reveal'));

  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ---------- Cargar más ----------
  const grid = document.getElementById('blogGrid');
  const btn = document.getElementById('loadMoreBtn');
  if (!grid || !btn) return;

  const BATCH_SIZE = 3; // Cambiá si querés más/menos por click

  const getLazy = () => Array.from(grid.querySelectorAll('.blog-card[data-lazy="true"]'));

  function showNextBatch() {
    const lazy = getLazy();
    if (lazy.length === 0) {
      btn.disabled = true;
      btn.textContent = 'No hay más artículos';
      return;
    }

    const next = lazy.slice(0, BATCH_SIZE);
    next.forEach(card => {
      card.style.display = '';         // mostrar
      requestAnimationFrame(() => {
        card.classList.add('is-visible'); // animación reveal
      });
      card.removeAttribute('data-lazy');  // ya no es lazy
    });

    if (getLazy().length === 0) {
      btn.disabled = true;
      btn.textContent = 'No hay más artículos';
    } else {
      btn.setAttribute('aria-live', 'polite');
      btn.setAttribute('aria-label', `Se cargaron ${next.length} artículos más`);
    }
  }

  if (getLazy().length === 0) {
    btn.style.display = 'none';
  }

  btn.addEventListener('click', showNextBatch);

  // ---------- Modal de artículos ----------
  const modal = document.getElementById('blogModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalBody = document.getElementById('modalBody');

  // Contenido de los artículos (temporal - después podés cargar desde JSON o API)
  const articles = {
    'presente': {
      title: 'El poder de vivir el presente',
      date: '10 septiembre 2025',
      content: `
        <p>La ansiedad del futuro y el peso del pasado nos mantienen desconectados del único momento que realmente existe: el ahora.</p>
        
        <p>Cuando aprendés a soltar la preocupación por lo que todavía no sucedió y la rumiación sobre lo que ya pasó, comenzás a <strong>habitar tu vida</strong> de una manera completamente diferente.</p>
        
        <h2>¿Por qué nos cuesta tanto estar presentes?</h2>
        <p>Nuestro sistema nervioso fue diseñado para detectar amenazas y planificar soluciones. Pero en el mundo moderno, esa capacidad se convirtió en una hiperactivación constante que nos aleja del momento presente.</p>
        
        <h3>Tres prácticas para volver al ahora</h3>
        <ul>
          <li><strong>Respiración consciente:</strong> Cinco respiraciones profundas con atención plena pueden anclar tu mente en el cuerpo.</li>
          <li><strong>Observación sensorial:</strong> Notá tres cosas que podés ver, dos que podás escuchar y una que podás sentir en tu piel.</li>
          <li><strong>Movimiento mindful:</strong> Caminá despacio, sintiendo cada paso, cada contacto del pie con el suelo.</li>
        </ul>
        
        <p>El presente no es un lugar al que llegás una vez y te quedás para siempre. Es un <em>retorno constante</em>, una elección que hacés una y otra vez a lo largo del día.</p>
        
        <p>Cada vez que volvés al ahora, estás eligiendo la paz sobre el caos mental.</p>
      `
    },
    'gong': {
      title: 'Sanación con baños de gong',
      date: '2 septiembre 2025',
      content: `
        <p>Los baños de gong son una experiencia de <strong>inmersión sonora</strong> que actúa directamente sobre el sistema nervioso, las emociones y la memoria celular.</p>
        
        <p>A diferencia de la música, el gong produce <em>ondas vibratorias complejas</em> que literalmente atraviesan tu cuerpo, reorganizando patrones de tensión y liberando bloqueos energéticos profundos.</p>
        
        <h2>¿Cómo funciona el sonido sanador?</h2>
        <p>El gong emite frecuencias que sintonizan con las ondas cerebrales, llevándote a estados de relajación profunda (theta) o incluso estados meditativos (delta).</p>
        
        <p>En esos estados, el cuerpo puede <strong>liberar memorias emocionales</strong> que quedaron guardadas en el tejido, en los órganos, en la fascia.</p>
        
        <h3>Qué podés experimentar</h3>
        <ul>
          <li>Sensación de flotación o expansión corporal</li>
          <li>Imágenes, colores o recuerdos espontáneos</li>
          <li>Liberación emocional: llanto, risa o suspiros profundos</li>
          <li>Calma mental duradera después de la sesión</li>
        </ul>
        
        <p>No hace falta "hacer" nada. Solo entregarte a las vibraciones y permitir que el sonido haga su trabajo.</p>
        
        <p>Si te sentís sobrecargada mentalmente o emocionalmente estancada, un baño de gong puede ser el <em>reset</em> que necesitás.</p>
      `
    },
    'flores-bach': {
      title: 'Flores de Bach para el equilibrio emocional',
      date: '28 agosto 2025',
      content: `
        <p>Las <strong>Flores de Bach</strong> son esencias florales que trabajan sobre estados emocionales específicos, ayudándote a restaurar el equilibrio interno de manera suave y natural.</p>
        
        <p>No actúan como un medicamento químico, sino que <em>sintonizan</em> tu energía emocional con una frecuencia más armónica.</p>
        
        <h2>¿Cómo funcionan?</h2>
        <p>Cada flor tiene una vibración energética que resuena con un estado emocional particular. Al tomarlas, tu campo energético se recalibra, facilitando el procesamiento de emociones bloqueadas.</p>
        
        <h3>Cinco esencias esenciales</h3>
        <ul>
          <li><strong>Rescue Remedy:</strong> Para momentos de crisis, shock o estrés agudo.</li>
          <li><strong>Mimulus:</strong> Para miedos conocidos y específicos (volar, hablar en público, etc.).</li>
          <li><strong>White Chestnut:</strong> Para pensamientos repetitivos y rumiación mental.</li>
          <li><strong>Star of Bethlehem:</strong> Para traumas pasados o presentes.</li>
          <li><strong>Olive:</strong> Para agotamiento físico y mental profundo.</li>
        </ul>
        
        <h2>Cómo tomarlas</h2>
        <p>Podés diluir 4 gotas en un vaso de agua y beber a lo largo del día, o tomar directamente bajo la lengua 4 veces al día.</p>
        
        <p>Lo importante es la <em>regularidad</em>, no la cantidad. Las flores trabajan mejor con constancia.</p>
        
        <p>Si querés profundizar, consultá con un terapeuta floral para armar tu fórmula personalizada según tus necesidades actuales.</p>
      `
    },
    'respiracion': {
      title: 'Respirar para calmar el sistema nervioso',
      date: '20 agosto 2025',
      content: `
        <p>La respiración es la <strong>herramienta más poderosa</strong> que tenés para regular tu estado emocional y calmar tu sistema nervioso en tiempo real.</p>
        
        <p>A diferencia de otras funciones automáticas, la respiración es <em>consciente y voluntaria</em> a la vez, lo que te permite intervenir directamente en tu estado interno.</p>
        
        <h2>Ejercicio 1: Respiración 4-7-8 (para ansiedad)</h2>
        <ol>
          <li>Inhalá por la nariz contando hasta 4.</li>
          <li>Sostené el aire contando hasta 7.</li>
          <li>Exhalá por la boca contando hasta 8.</li>
          <li>Repetí 4 ciclos completos.</li>
        </ol>
        
        <p>Esta técnica activa el <strong>nervio vago</strong>, que le indica a tu cuerpo que es seguro relajarse.</p>
        
        <h2>Ejercicio 2: Respiración de caja (para concentración)</h2>
        <ol>
          <li>Inhalá contando hasta 4.</li>
          <li>Sostené contando hasta 4.</li>
          <li>Exhalá contando hasta 4.</li>
          <li>Sostené vacío contando hasta 4.</li>
          <li>Repetí 5-10 ciclos.</li>
        </ol>
        
        <p>Ideal antes de una reunión importante, un examen o cualquier momento que requiera claridad mental.</p>
        
        <h2>Ejercicio 3: Respiración con suspiro (para liberar tensión)</h2>
        <p>Inhalá profundo por la nariz y exhalá con un <em>suspiro audible</em> por la boca, soltando cualquier tensión que estés sosteniendo.</p>
        
        <p>Hacelo 3 veces seguidas. Vas a sentir cómo tu cuerpo se afloja.</p>
        
        <p>Estas técnicas son simples, pero requieren práctica. Cuanto más las uses, más rápido vas a poder volver a tu centro en momentos difíciles.</p>
      `
    },
    'rituales-cierre': {
      title: 'Rituales de cierre: 7 días para soltar',
      date: '12 agosto 2025',
      content: `
        <p>Los <strong>rituales de cierre</strong> son prácticas simbólicas que le permiten a tu inconsciente procesar finales, despedidas y transiciones.</p>
        
        <p>No es magia. Es <em>lenguaje simbólico</em> que tu mente profunda entiende mejor que las palabras racionales.</p>
        
        <h2>Ritual de 7 días: paso a paso</h2>
        
        <h3>Día 1: Reconocimiento</h3>
        <p>Escribí en un papel todo lo que necesitás soltar: personas, situaciones, emociones, creencias.</p>
        
        <h3>Día 2: Agradecimiento</h3>
        <p>Agradecé a cada cosa que escribiste por lo que te enseñó, incluso si dolió.</p>
        
        <h3>Día 3: Perdón</h3>
        <p>Perdoná a otros y a vos misma por todo lo que pasó. No es justificar, es liberar.</p>
        
        <h3>Día 4: Limpieza energética</h3>
        <p>Tomá un baño con sal marina y visualizá cómo se disuelve todo lo que no te pertenece.</p>
        
        <h3>Día 5: Ofrenda simbólica</h3>
        <p>Quemá el papel en un lugar seguro o enterralo en la tierra, devolviendo todo a la naturaleza.</p>
        
        <h3>Día 6: Vacío consciente</h3>
        <p>Permití sentir el vacío sin llenarlo inmediatamente. El espacio vacío es sagrado.</p>
        
        <h3>Día 7: Nueva intención</h3>
        <p>Escribí tu intención para el próximo ciclo. ¿Qué querés invitar ahora que soltaste lo viejo?</p>
        
        <h2>Importante</h2>
        <p>No esperes resultados inmediatos. Los rituales trabajan en el <em>tiempo del alma</em>, no del reloj.</p>
        
        <p>Puede que días o semanas después notes cambios internos sutiles: más ligereza, más claridad, menos apego.</p>
        
        <p>Confiá en el proceso.</p>
      `
    },
    'reiki-pasos': {
      title: 'Primeros pasos con Reiki',
      date: '5 agosto 2025',
      content: `
        <p><strong>Reiki</strong> es una práctica de canalización de energía vital que podés usar para armonizar tu cuerpo, tus emociones y tu espíritu.</p>
        
        <p>No hace falta creer en nada especial. Solo estar dispuesta a <em>sentir</em> y a darte tiempo y espacio para practicar.</p>
        
        <h2>¿Por dónde empezar?</h2>
        <p>Si recién estás empezando con Reiki, lo más importante es crear una <strong>práctica constante</strong>, aunque sea de 10 minutos al día.</p>
        
        <h3>Autotratamiento básico (21 días)</h3>
        <p>La tradición del Reiki sugiere un autotratamiento diario de 21 días para activar y estabilizar tu energía interna.</p>
        
        <ol>
          <li>Sentate o acostate en un lugar tranquilo.</li>
          <li>Colocá tus manos en diferentes posiciones sobre tu cuerpo (cabeza, pecho, abdomen).</li>
          <li>Sostené cada posición entre 3 y 5 minutos.</li>
          <li>Respirá con calma y dejá que la energía fluya.</li>
        </ol>
        
        <h2>Qué podés sentir</h2>
        <ul>
          <li>Calor o cosquilleo en las manos</li>
          <li>Sensación de paz o somnolencia</li>
          <li>Liberación emocional (llanto, suspiros)</li>
          <li>Imágenes o recuerdos espontáneos</li>
        </ul>
        
        <p>Todo es válido. No hay "forma correcta" de sentir Reiki.</p>
        
        <h2>Mantener la práctica</h2>
        <p>Después de los 21 días iniciales, seguí con al menos 3 sesiones semanales para mantener tu energía equilibrada.</p>
        
        <p>Podés integrar Reiki antes de dormir, al despertar, o en cualquier momento que necesites volver a tu centro.</p>
        
        <p>Si querés profundizar, considerá tomar el <em>Nivel I de Reiki Usui</em> para recibir la sintonización y el manual completo.</p>
        
        <p>La práctica es simple, pero profunda. Dale tiempo y confiá en tu intuición.</p>
      `
    }
  };

  // Función para abrir el modal
  function openModal(articleId) {
    const article = articles[articleId];
    if (!article) return;

    modalTitle.textContent = article.title;
    modalDate.textContent = article.date;
    modalBody.innerHTML = article.content;
    
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
  }

  // Función para cerrar el modal
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restaurar scroll
  }

  // Event listeners
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('[data-article]');
      const articleId = card.getAttribute('data-article');
      openModal(articleId);
    });
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });
})();
