(()=>{
	const $  = (s, c=document)=>c.querySelector(s);
	const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

	// Efecto typing en el placeholder del buscador
	const heroInput = $('#q');
	if(heroInput){
		const texts = [
			'Buscar cursos...',
			'Buscar meditaciones...',
			'Buscar rituales...',
			'Buscar Reiki...',
			'Buscar biodescodificación...'
		];
		let textIndex = 0;
		let charIndex = 0;
		let isDeleting = false;

		function typeEffect(){
			const currentText = texts[textIndex];
			let typingSpeed = 100; // Velocidad de escritura
			
			if(!isDeleting){
				heroInput.placeholder = currentText.substring(0, charIndex + 1);
				charIndex++;
				
				if(charIndex === currentText.length){
					isDeleting = true;
					typingSpeed = 2000; // Pausa al terminar de escribir
				}
			} else {
				heroInput.placeholder = currentText.substring(0, charIndex - 1);
				charIndex--;
				typingSpeed = 50; // Velocidad de borrado
				
				if(charIndex === 0){
					isDeleting = false;
					textIndex = (textIndex + 1) % texts.length;
					typingSpeed = 500; // Pausa antes de escribir el siguiente
				}
			}
			
			setTimeout(typeEffect, typingSpeed);
		}
		
		// Iniciar el efecto después de un pequeño delay
		setTimeout(typeEffect, 1000);
	}

	// Navbar: toggle menú en mobile
	const navToggle = $('.nav-toggle');
	const menu = $('#menu');
	if(navToggle && menu){
		navToggle.addEventListener('click', ()=>{
			const open = menu.classList.toggle('show');
			navToggle.setAttribute('aria-expanded', String(open));
		});
	}

	// Submenú
	$$('.sub-toggle').forEach(btn=>{
		btn.addEventListener('click', (e)=>{
			const li = e.currentTarget.closest('.has-sub');
			const sub = li.querySelector('.sub');
			sub.style.display = (sub.style.display==='block') ? 'none' : 'block';
		});
	});

	// Sidebar: toggle filtros en mobile
	const toggleBtn = $('.courses-sidebar__toggle');
	const panel = $('#cats-list');
	if(toggleBtn && panel){
		toggleBtn.addEventListener('click', ()=>{
			const open = panel.style.display === 'block';
			panel.style.display = open ? 'none' : 'block';
			toggleBtn.setAttribute('aria-expanded', String(!open));
		});
	}

	// Filtros por categoría
	const chips = $$('.chip');
	const grid = $('#grid');
	const count = $('#count');
	let allItems = [];
	// Utilidad para cargar JSON
	function fetchJSON(url){
		return fetch(url).then(r=>r.json());
	}
	// Renderiza una card
	function renderCard(item){
		// Determinar categoría para el filtro
		let cat = item.area || item.category || '';
		if(item.category === 'meditacion') cat = 'meditaciones';
		if(item.category === 'ritual') cat = 'rituales';
		if(item.category === 'curso' && item.area === 'biodecodificacion') cat = 'biodecodificacion';
		if(item.category === 'curso' && item.area === 'reiki') cat = 'reiki';
		if(item.category === 'curso' && item.area === 'mentoria') cat = 'mentoria';
		// Precio
		let price = item.price ? (item.price.amount > 0 ? `USD ${item.price.amount}` : 'Gratis') : '';
		// Imagen
		let img = '';
		if (item.image && item.image.src) {
			let src = item.image.src || '';
			// Si la ruta no es absoluta ni es una URL, convertirla en absoluta respecto al root
			if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) src = '/' + src.replace(/^\/.*/,'');
			img = `<img src="${src}" alt="${item.image.alt||''}">`;
		}
		// Badges
		let badge = (item.badges && item.badges.length) ? `<span class="badge">${item.badges.join(', ')}</span>` : '';
		// Link (resolver como absoluto si es relativo)
		let link = item.link || '#';
		if (link && !/^https?:\/\//i.test(link) && !link.startsWith('/')) link = '/' + link.replace(/^\/.*/,'');
		// Card
		return `<li class="course-card" data-cats="${cat}" data-price="${item.price ? item.price.amount : ''}" data-pop="${item.badges && item.badges.includes('popular') ? 100 : ''}" data-date="" style="">
			<a class="course-card__link" href="${link}">
				<div class="course-card__media">${img}</div>
				<div class="course-card__body">
					${badge}
					<h3 class="course-card__title">${item.title}</h3>
					<p class="course-card__desc">${item.short_desc}</p>
					<div class="course-card__meta">
						<span class="price">${price}</span>
						<button class="btn btn-ghost add-cart" data-id="${item.id}" type="button">Agregar al carrito</button>
					</div>
				</div>
			</a>
		</li>`;
	}
	// Renderiza todas las cards
	function renderAll(){
		if(!grid) return;
		grid.innerHTML = allItems.map(renderCard).join('');
		updateCount();
		// Re-asignar eventos de carrito
		$$('.add-cart').forEach(btn => btn.addEventListener('click', (e)=>{
			e.preventDefault();
			addToCartFromCard(btn);
		}));
	}
	// Filtrado
	function applyFilter(cat){
		// Agregar clase de filtrado
		if(grid) grid.classList.add('is-filtering');
		
		// Pequeño delay para la animación
		setTimeout(() => {
			$$('#grid .course-card').forEach((li, index) => {
				const cats = (li.dataset.cats||'').split(',');
				const shouldShow = (cat==='todos' || cats.includes(cat));
				
				if(shouldShow) {
					li.style.display = '';
					// Re-animar con delay escalonado
					li.style.animation = 'none';
					setTimeout(() => {
						li.style.animation = `scaleIn 0.5s ease-out ${index * 0.05}s forwards`;
					}, 10);
				} else {
					li.style.display = 'none';
				}
			});
			
			updateCount();
			
			// Remover clase de filtrado
			setTimeout(() => {
				if(grid) grid.classList.remove('is-filtering');
			}, 300);
		}, 100);
	}
	function updateCount(){
		if(!count) return;
		const visible = $$('#grid .course-card').filter(li=>li.style.display!== 'none').length;
		count.textContent = visible;
	}
	// Filtros
	chips.forEach(ch=> ch.addEventListener('click', ()=>{
		chips.forEach(c=>c.classList.remove('is-active'));
		ch.classList.add('is-active');
		applyFilter(ch.dataset.filter);
	}));
	// Leer parámetro URL y aplicar filtro automáticamente
	const urlParams = new URLSearchParams(window.location.search);
	const categoryFromURL = urlParams.get('cat');
	function autoFilter(){
		if(categoryFromURL){
			const targetChip = chips.find(ch => ch.dataset.filter === categoryFromURL);
			if(targetChip){
				chips.forEach(c=>c.classList.remove('is-active'));
				targetChip.classList.add('is-active');
				applyFilter(categoryFromURL);
			} else {
				applyFilter('todos');
			}
		} else {
			applyFilter('todos');
		}
	}
	// Cargar todos los datos y renderizar
	Promise.all([
		fetchJSON('../datos/cursos.json'),
		fetchJSON('../datos/meditaciones.json'),
		fetchJSON('../datos/rituales.json')
	]).then(([cursos, meditaciones, rituales])=>{
		allItems = [...cursos, ...meditaciones, ...rituales];
		renderAll();
		autoFilter();
	});

	// Ordenar
	const select = $('#orden');
	function sortBy(value){
		const arr = $$('#grid .course-card').filter(li => li.style.display !== 'none');
		const key = {
			pop:      li => Number(li.dataset.pop||0) * -1,
			new:      li => 0, // No hay fecha en los JSON, se puede mejorar si se agrega
			priceAsc: li => Number(li.dataset.price||0),
			priceDesc:li => -Number(li.dataset.price||0)
		}[value] || (li=>0);
		arr.sort((a,b)=> key(a) - key(b));
		arr.forEach(li=> grid.appendChild(li));
	}
	if(select){ select.addEventListener('change', ()=> sortBy(select.value)); }

	// Buscar en hero (filtrado en vivo como en el index)
	const form = $('.courses-hero__search');
	const input = $('#q');
	if(form && input){
		function doSearch(){
			const q = input.value.trim().toLowerCase();
			$$('#grid .course-card').forEach(li =>{
				const text = li.textContent.toLowerCase();
				li.style.display = text.includes(q) ? '' : 'none';
			});
			updateCount();
		}
		input.addEventListener('input', doSearch);
		form.addEventListener('submit', (e)=>{
			e.preventDefault();
			doSearch();
		});
	}


		// Botón "Agregar al carrito" (real, igual que en index)
		function readCart(){
			try { return JSON.parse(localStorage.getItem('espaciopaz_cart_v1')) || []; }
			catch { return []; }
		}
		function writeCart(items){
			localStorage.setItem('espaciopaz_cart_v1', JSON.stringify(items));
		}
		function cartCount(){
			return readCart().reduce((acc, it) => acc + (it.qty||0), 0);
		}
		function updateCartBadge(){
			const badge = document.getElementById('cartBadge');
			if (!badge) return;
			const n = cartCount();
			badge.textContent = n;
			badge.style.visibility = n > 0 ? 'visible' : 'hidden';
		}
		function animateCartIcon(){
			const btn = document.getElementById('cartButton');
			if (!btn) return;
			btn.classList.remove('bump');
			void btn.offsetWidth;
			btn.classList.add('bump');
		}
		function addToCartFromCard(btn){
			const card = btn.closest('.course-card');
			if (!card) return;
			const id = btn.dataset.id || card.dataset.href || crypto.randomUUID();
			const name = (card.querySelector('h3')?.textContent || 'Curso').trim();
			const priceText = (card.querySelector('.price')?.textContent || '0').replace(/[^\d.,]/g,'').replace(',','.');
			const price = parseFloat(priceText) || 0;
			const img = card.querySelector('.course-card__media img')?.getAttribute('src') || '';
			const cart = readCart();
			const idx = cart.findIndex(it => it.id === id);
			if (idx >= 0){ cart[idx].qty += 1; }
			else { cart.push({ id, name, price, img, qty: 1 }); }
			writeCart(cart);
			updateCartBadge();
			animateCartIcon();
			// feedback visual rápido en el botón
			btn.disabled = true;
			const prev = btn.textContent.trim();
			btn.classList.add('added');
			btn.textContent = 'Agregado ✓';
			setTimeout(() => {
				btn.disabled = false;
				btn.classList.remove('added');
				btn.textContent = prev;
			}, 900);
		}
		$$('.add-cart').forEach(btn => btn.addEventListener('click', (e)=>{
			e.preventDefault();
			addToCartFromCard(btn);
		}));
		document.addEventListener('DOMContentLoaded', updateCartBadge);

	// Año en footer
	const y = document.getElementById('year');
	if(y) y.textContent = new Date().getFullYear();
})();

