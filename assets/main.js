let tours = [];
const grid = document.getElementById('tourGrid');
const filtersEl = document.getElementById('filters');
const searchInput = document.getElementById('searchInput');
const detailView = document.getElementById('detailView');
const homeView = document.getElementById('homeView');
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
const mainContent = document.getElementById('main-content');
const hero = document.getElementById('home');
const heroPreview = document.getElementById('heroPreview');
const galleryModal = document.getElementById('galleryModal');
const galleryModalImg = document.getElementById('galleryModalImg');
const galleryModalCount = document.getElementById('galleryModalCount');
let activeCategory = 'All';
let heroSlideIndex = 0;
let heroSlideshowTimer;
let heroSlideshowPaused = false;
let heroFadeTimer;
let modalReturnTarget;
let modalGalleryItems = [];
let modalGalleryIndex = 0;
let categories = ['All'];
let heroSlides = [];

const assetUrl = path => new URL(path, document.baseURI).href;
const cssImage = path => `url(${assetUrl(path)})`;
const whatsappNumber = '18095105168';
const whatsappLink = excursionName => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`I would like to know more about the ${excursionName} excursion...`)}`;
const attr = value => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

async function loadTours() {
    const response = await fetch('assets/tours.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error(`Unable to load tours.json (${response.status})`);
    tours = await response.json();
}

function buildDerivedData() {
    activeCategory = 'All';
    categories = ['All', ...Array.from(new Set(tours.map(t => t.category.split(' & ')[0]).filter(Boolean)))];
    heroSlides = [
        {src: 'assets/images/home-hero.jpg', label: 'Dominican Republic adventure collage'},
        ...tours.flatMap(t => [
            {src: t.heroImage, label: t.title},
            ...t.gallery.map((src, index) => ({src, label: `${t.title} activity ${index + 1}`}))
        ])
    ];
    setHeroSlide(0);
}

async function initApp() {
    try {
        await loadTours();
        buildDerivedData();
        startHeroSlideshow();
        initFilters();
        renderCards();
        wireReveals();
        route();
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="info-card" style="grid-column:1/-1"><h3>Excursions could not load</h3><p>Please refresh the page and try again.</p></div>`;
        showToast('Excursions could not load');
    }
}

function setHeroSlide(index) {
    if (!hero || !heroSlides.length) return;
    heroSlideIndex = (index + heroSlides.length) % heroSlides.length;
    const slide = heroSlides[heroSlideIndex];
    hero.style.setProperty('--cover', cssImage(slide.src));
    hero.style.setProperty('--cover-next', cssImage(slide.src));
    heroPreview?.setAttribute('aria-label', slide.label);
}

function transitionHeroSlide(index) {
    if (!hero || !heroSlides.length) return;
    const nextIndex = (index + heroSlides.length) % heroSlides.length;
    const slide = heroSlides[nextIndex];
    const nextImage = cssImage(slide.src);
    window.clearTimeout(heroFadeTimer);
    heroSlideIndex = nextIndex;
    hero.style.setProperty('--cover-next', nextImage);
    heroPreview?.setAttribute('aria-label', slide.label);
    hero.classList.add('is-fading');
    heroFadeTimer = window.setTimeout(() => {
        hero.style.setProperty('--cover', nextImage);
        hero.classList.remove('is-fading');
    }, 900);
}

function randomHeroSlide() {
    if (heroSlides.length < 2) return;
    let nextIndex = heroSlideIndex;
    while (nextIndex === heroSlideIndex) {
        nextIndex = Math.floor(Math.random() * heroSlides.length);
    }
    transitionHeroSlide(nextIndex);
}

function startHeroSlideshow() {
    window.clearInterval(heroSlideshowTimer);
    heroSlideshowTimer = window.setInterval(() => {
        if (!heroSlideshowPaused) randomHeroSlide();
    }, 5000);
}

function toggleHeroSlideshow(button) {
    heroSlideshowPaused = !heroSlideshowPaused;
    button.setAttribute('aria-pressed', String(heroSlideshowPaused));
    button.setAttribute('aria-label', heroSlideshowPaused ? 'Resume image slideshow' : 'Pause image slideshow');
    button.textContent = heroSlideshowPaused ? '▶' : 'Ⅱ';
}

function initFilters() {
    filtersEl.innerHTML = categories.map(cat => `<button class="filter-btn ${cat === activeCategory ? 'active' : ''}" type="button" data-category="${cat}" aria-pressed="${cat === activeCategory}">${cat}</button>`).join('');
    filtersEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        initFilters();
        renderCards();
    }));
}

function cardTemplate(t) {
    return `<a class="tour-card" href="#tour/${attr(t.id)}" style="--img:${cssImage(t.heroImage)}" aria-label="Open details for ${attr(t.title)}">
      <div class="card-topline"><span class="order-badge">${t.order}</span><span class="category-badge">${t.category}</span></div>
      <div class="tour-card-content">
        <div class="mini-meta"><span>${t.duration}</span><span>${t.level}</span></div>
        <h3 class="serif">${t.title}</h3>
        <p>${t.short}</p>
        <div class="card-actions"><span class="view-link">View details <span class="arrow">→</span></span></div>
      </div>
    </a>`;
}

function renderCards() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const filtered = tours.filter(t => {
        const categoryOk = activeCategory === 'All' || t.category.toLowerCase().includes(activeCategory.toLowerCase());
        const haystack = [t.title, t.short, t.category, t.tagline, ...t.destinations, ...t.highlights].join(' ').toLowerCase();
        return categoryOk && (!q || haystack.includes(q));
    });
    grid.setAttribute('aria-live', q ? 'polite' : 'off');
    grid.innerHTML = filtered.length ? filtered.map(cardTemplate).join('') : `<div class="info-card" style="grid-column:1/-1"><h3>No excursions found</h3><p>Try a different search or select All.</p></div>`;
    grid.querySelectorAll('.tour-card').forEach((card, index) => {
        requestAnimationFrame(() => setTimeout(() => card.classList.add('show'), 70 * index));
    });
}

function list(items, cls = '') {
    return `<ul class="${cls}">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

function detailTemplate(t) {
    const otherTours = tours.filter(x => x.id !== t.id).slice(0, 8).map(x => `<a class="mini-tour" href="#tour/${attr(x.id)}" style="--img:${cssImage(x.heroImage)}" aria-label="Open details for ${attr(x.title)}"><span>${x.title}</span></a>`).join('');
    const activities = t.activities.map((a, i) => `<article class="activity-card reveal"><img src="${assetUrl(t.gallery[i])}" alt="${a.title}"><div class="activity-body"><div class="activity-num">${a.num}</div><h3 class="serif">${a.title}</h3><p>${a.text}</p></div></article>`).join('');
    const bookingUrl = whatsappLink(t.title);
    const gallery = t.gallery.map((src, i) => {
        const imageUrl = assetUrl(src);
        const alt = `${t.title} gallery image ${i + 1}`;
        return `<button class="gallery-slide" type="button" data-action="open-gallery-modal" data-index="${i}" data-src="${attr(imageUrl)}" data-alt="${attr(alt)}" aria-label="Open ${attr(alt)}"><img src="${imageUrl}" alt="${attr(alt)}" loading="lazy"></button>`;
    }).join('');
    return `
      <button class="back-btn" type="button" data-action="all-excursions">← All excursions</button>
      <section class="detail-hero" style="--hero:${cssImage(t.heroImage)}">
        <div class="detail-hero-content">
          <div>
            <div class="eyebrow reveal">${t.category}</div>
            <h1 class="serif reveal">${t.title}</h1>
            <p class="reveal">${t.tagline}</p>
            <div class="detail-actions reveal">
              <a class="btn btn-primary" href="${bookingUrl}" target="_blank" rel="noopener">Book this adventure <span>→</span></a>
              <a class="btn btn-ghost" href="#overview" data-action="view-overview">View activities <span>↓</span></a>
            </div>
          </div>
          <aside class="detail-panel reveal">
            <div class="detail-stat-grid">
              <div class="detail-stat"><small>Duration</small><b>${t.duration}</b></div>
              <div class="detail-stat"><small>Activity level</small><b>${t.level}</b></div>
              <div class="detail-stat"><small>Group size</small><b>${t.group}</b></div>
              <div class="detail-stat"><small>Destinations</small><b>${t.destinations.slice(0, 2).join(', ')}</b></div>
            </div>
          </aside>
        </div>
      </section>
      <div class="content-wrap">
        <div class="detail-layout">
          <article class="info-card reveal" id="overview"><div class="section-kicker">Overview</div><h2 class="serif">Get to know the experience</h2><p>${t.overview}</p></article>
          <aside class="info-card reveal"><h3 class="serif">Destinations</h3>${list(t.destinations, 'pill-list')}</aside>
        </div>
        <div class="detail-layout detail-layout-three">
          <article class="info-card reveal"><h3 class="serif">Tour highlights</h3>${list(t.highlights, 'check-list')}</article>
          <article class="info-card reveal"><h3 class="serif">Essential information</h3>${list(t.info, 'detail-list')}</article>
          <article class="info-card reveal"><h3 class="serif">Bring</h3>${list(t.bring, 'detail-list')}</article>
        </div>
        <article class="info-card reveal activities-heading" id="activities"><div class="section-kicker">Experiences that create lasting memories</div><h2 class="serif">Your tour activities</h2></article>
        <section class="activity-grid">${activities}</section>
        <section class="excursion-gallery reveal" aria-label="${attr(t.title)} image gallery">
          <div class="gallery-head">
            <div><div class="section-kicker">Inside the experience</div><h2 class="serif">Excursion gallery</h2></div>
            <div class="gallery-controls" aria-label="Gallery controls">
              <button type="button" data-action="gallery-prev" aria-label="Previous gallery images">←</button>
              <button type="button" data-action="gallery-next" aria-label="Next gallery images">→</button>
            </div>
          </div>
          <div class="gallery-carousel">
            <div class="gallery-track" tabindex="0">${gallery}</div>
          </div>
        </section>
        <article class="info-card reveal" style="margin-top:24px"><h3 class="serif">More excursions</h3><div class="next-tours">${otherTours}</div></article>
      </div>`;
}

function openTour(id, push = true) {
    const t = tours.find(x => x.id === id);
    if (!t) return goHome(false);
    detailView.innerHTML = detailTemplate(t);
    document.body.classList.add('detail-open');
    detailView.classList.add('active');
    closeMenu();
    if (push) location.hash = `tour/${id}`;
    window.scrollTo(0, 0);
    wireReveals();
    detailView.querySelector('h1')?.setAttribute('tabindex', '-1');
    detailView.querySelector('h1')?.focus({preventScroll: true});
}

function goHome(push = true) {
    detailView.classList.remove('active');
    detailView.innerHTML = '';
    document.body.classList.remove('detail-open');
    if (push) location.hash = 'excursions';
    setTimeout(() => document.getElementById('excursions')?.scrollIntoView({behavior: 'smooth', block: 'start'}), 40);
    wireReveals();
    mainContent?.focus({preventScroll: true});
}

function route() {
    const hash = location.hash.replace('#', '');
    if (hash.startsWith('tour/')) openTour(hash.split('/')[1], false);
    else {
        detailView.classList.remove('active');
        detailView.innerHTML = '';
        document.body.classList.remove('detail-open');
        if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 10);
    }
}

function openRandomTour() {
    const t = tours[Math.floor(Math.random() * tours.length)];
    openTour(t.id);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

function closeMenu() {
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
}

function toggleMenu() {
    const isOpen = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

function moveGallery(button, direction) {
    const track = button.closest('.excursion-gallery')?.querySelector('.gallery-track');
    if (!track) return;
    track.scrollBy({left: direction * track.clientWidth * .82, behavior: 'smooth'});
}

function openGalleryModal(button) {
    if (!galleryModal || !galleryModalImg) return;
    modalReturnTarget = button;
    modalGalleryItems = Array.from(button.closest('.gallery-track')?.querySelectorAll('.gallery-slide') || []).map(item => ({
        src: item.dataset.src,
        alt: item.dataset.alt || 'Excursion gallery image',
        trigger: item
    }));
    modalGalleryIndex = Math.max(0, modalGalleryItems.findIndex(item => item.trigger === button));
    setGalleryModalImage(modalGalleryIndex);
    galleryModal.classList.add('active');
    galleryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    galleryModal.querySelector('.modal-close')?.focus({preventScroll: true});
}

function setGalleryModalImage(index) {
    if (!galleryModalImg || !modalGalleryItems.length) return;
    modalGalleryIndex = (index + modalGalleryItems.length) % modalGalleryItems.length;
    const item = modalGalleryItems[modalGalleryIndex];
    galleryModalImg.src = item.src;
    galleryModalImg.alt = item.alt;
    if (galleryModalCount) galleryModalCount.textContent = `${modalGalleryIndex + 1} / ${modalGalleryItems.length}`;
}

function moveGalleryModal(direction) {
    if (!galleryModal?.classList.contains('active')) return;
    setGalleryModalImage(modalGalleryIndex + direction);
}

function closeGalleryModal() {
    if (!galleryModal || !galleryModalImg) return;
    galleryModal.classList.remove('active');
    galleryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    galleryModalImg.removeAttribute('src');
    const focusTarget = modalGalleryItems[modalGalleryIndex]?.trigger || modalReturnTarget;
    focusTarget?.focus({preventScroll: true});
    modalReturnTarget = null;
    modalGalleryItems = [];
    modalGalleryIndex = 0;
    if (galleryModalCount) galleryModalCount.textContent = '';
}

function wireReveals() {
    const reveals = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, {threshold: .12});
    reveals.forEach(el => io.observe(el));
}

menuBtn.addEventListener('click', toggleMenu);
navLinks?.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeMenu();
        menuBtn.focus();
    }
});
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('click', e => {
    const actionTarget = e.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    if (action === 'view-overview') {
        e.preventDefault();
        detailView.querySelector('#overview')?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
    if (action === 'random-tour') openRandomTour();
    if (action === 'all-excursions') goHome();
    if (action === 'toggle-hero-slideshow') toggleHeroSlideshow(actionTarget);
    if (action === 'gallery-prev') moveGallery(actionTarget, -1);
    if (action === 'gallery-next') moveGallery(actionTarget, 1);
    if (action === 'open-gallery-modal') openGalleryModal(actionTarget);
    if (action === 'close-gallery-modal') closeGalleryModal();
    if (action === 'modal-gallery-prev') moveGalleryModal(-1);
    if (action === 'modal-gallery-next') moveGalleryModal(1);
});
document.addEventListener('keydown', e => {
    if (!galleryModal?.classList.contains('active')) return;
    if (e.key === 'Escape') closeGalleryModal();
    if (e.key === 'ArrowLeft') moveGalleryModal(-1);
    if (e.key === 'ArrowRight') moveGalleryModal(1);
});
searchInput.addEventListener('input', renderCards);
window.addEventListener('hashchange', route);

initApp();
