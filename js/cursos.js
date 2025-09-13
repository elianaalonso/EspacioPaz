(()=>{
	const $  = (s, c=document)=>c.querySelector(s);
	const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

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
	const items = $$('#grid .course-card');
	const count = $('#count');
	function updateCount(){
		if(!count) return; const visible = items.filter(li=>li.style.display!== 'none').length; count.textContent = visible;
	}
	function applyFilter(cat){
		items.forEach(li=>{
			const cats = (li.dataset.cats||'').split(',');
			li.style.display = (cat==='todos' || cats.includes(cat)) ? '' : 'none';
		});
		updateCount();
	}
	chips.forEach(ch=> ch.addEventListener('click', ()=>{
		chips.forEach(c=>c.classList.remove('is-active'));
		ch.classList.add('is-active');
		applyFilter(ch.dataset.filter);
	}));
	applyFilter('todos');

	// Ordenar
	const select = $('#orden');
	function sortBy(value){
		const grid = $('#grid');
		const arr = items.slice().filter(li => li.style.display !== 'none');
		const key = {
			pop:      li => Number(li.dataset.pop||0) * -1, // descendente
			new:      li => -new Date(li.dataset.date).getTime(),
			priceAsc: li => Number(li.dataset.price||0),
			priceDesc:li => -Number(li.dataset.price||0)
		}[value] || (li=>0);
		arr.sort((a,b)=> key(a) - key(b));
		arr.forEach(li=> grid.appendChild(li));
	}
	if(select){ select.addEventListener('change', ()=> sortBy(select.value)); sortBy(select.value); }

	// Buscar en hero
	const form = $('.courses-hero__search');
	const input = $('#q');
	if(form && input){
		form.addEventListener('submit', (e)=>{
			e.preventDefault();
			const q = input.value.trim().toLowerCase();
			items.forEach(li =>{
				const text = li.textContent.toLowerCase();
				li.style.display = text.includes(q) ? '' : 'none';
			});
			updateCount();
		});
	}

	// Botón "Agregar al carrito" (stub)
	$$('.add-cart').forEach(btn => btn.addEventListener('click', (e)=>{
		e.preventDefault();
		const id = btn.dataset.id;
		alert('Agregado al carrito: ' + id);
	}));

	// Año en footer
	const y = document.getElementById('year');
	if(y) y.textContent = new Date().getFullYear();
})();

/* ============================= */
/* FIN js/cursos.js              */
/* ============================= */
