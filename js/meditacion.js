/* =========================================
   🧘 JavaScript para páginas de meditación
   Espacio Paz
========================================= */

// Tabs de Video/Audio
(function(){
  const tabs = document.querySelectorAll('.media-tab');
  const panels = document.querySelectorAll('.media-panel');
  
  if (tabs.length === 0) return;
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Remove active from all tabs and panels
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      // Add active to clicked tab and corresponding panel
      tab.classList.add('active');
      document.querySelector(`[data-panel="${targetTab}"]`).classList.add('active');
    });
  });
})();

// Barra de progreso de lectura
(function(){
  const bar = document.createElement('div');
  bar.className = 'read-progress';
  document.body.appendChild(bar);
  
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
    bar.style.width = (scrolled * 100) + '%';
  };
  
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Recordar última posición del audio (por slug de la página)
(function(){
  const audio = document.querySelector('.media-panel[data-panel="audio"] audio');
  if(!audio) return;
  
  const key = 'med-audio-pos::' + (document.body.dataset.courseId || location.pathname);
  const saved = +localStorage.getItem(key) || 0;
  
  if (saved && !isNaN(saved)) audio.currentTime = saved;
  
  audio.addEventListener('timeupdate', () => {
    // guarda cada ~2s para no escribir tanto
    if (Math.floor(audio.currentTime) % 2 === 0) {
      localStorage.setItem(key, Math.floor(audio.currentTime));
    }
  });
})();

// Carousel de meditaciones relacionadas (infinite loop / rueda continua)
(function(){
  const container = document.querySelector('.carousel-track-container');
  const track = document.querySelector('.carousel-track');
  const originalItems = Array.from(document.querySelectorAll('.carousel-item'));
  const prevBtn = document.querySelector('.carousel-btn-prev');
  const nextBtn = document.querySelector('.carousel-btn-next');
  const dotsContainer = document.querySelector('.carousel-dots');
  
  if (!track || originalItems.length === 0) return;
  
  // Clonar items para crear efecto infinito
  const clonesBefore = originalItems.map(item => item.cloneNode(true));
  const clonesAfter = originalItems.map(item => item.cloneNode(true));
  
  // Añadir clones al principio y al final
  clonesBefore.forEach(clone => track.insertBefore(clone, track.firstChild));
  clonesAfter.forEach(clone => track.appendChild(clone));
  
  const allItems = Array.from(track.querySelectorAll('.carousel-item'));
  const totalOriginal = originalItems.length;
  let currentIndex = totalOriginal; // Empezar en el primer original (después de los clones)
  let isTransitioning = false;
  
  // Crear dots (uno por cada item original)
  for (let i = 0; i < totalOriginal; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Ir a meditación ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i + totalOriginal));
    dotsContainer.appendChild(dot);
  }
  
  const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
  
  function getItemWidth() {
    return allItems[0].offsetWidth + 20; // 20px = gap
  }
  
  function updateCarousel(smooth = true) {
    const offset = currentIndex * getItemWidth();
    track.style.transition = smooth ? 'transform 0.5s ease' : 'none';
    track.style.transform = `translateX(-${offset}px)`;
    
    // Update dots (mapear currentIndex a dot original)
    const dotIndex = ((currentIndex - totalOriginal) % totalOriginal + totalOriginal) % totalOriginal;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === dotIndex);
    });
  }
  
  function goToSlide(index) {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex = index;
    updateCarousel(true);
    
    setTimeout(() => {
      isTransitioning = false;
      // Si estamos en un clon, saltar al original correspondiente sin animación
      if (currentIndex < totalOriginal) {
        currentIndex += totalOriginal;
        updateCarousel(false);
      } else if (currentIndex >= totalOriginal * 2) {
        currentIndex -= totalOriginal;
        updateCarousel(false);
      }
    }, 500);
  }
  
  prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
  nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
  
  // Posicionar inicialmente
  updateCarousel(false);
  
  // Update on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCarousel(false);
    }, 250);
  });
})();
