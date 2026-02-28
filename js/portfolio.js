/* ── GALERIA FOTOS ── */
(function(){
  const GALLERY_DATA = [
{cat:'haircut', span:'tall', src:'img/pelo-1.jpg',     alt:'Classic Haircut', loading:'lazy', decoding:'async'},
{cat:'styling', span:'',     src:'img/styling-1.jpg',  alt:'Premium Styling',  loading:'lazy',  decoding:'async'},
{cat:'shaving', span:'',     src:'img/shaving-1.jpg',  alt:'Hot Shave',        loading:'lazy',  decoding:'async'},
{cat:'trimming',span:'',     src:'img/trimming-1.jpg', alt:'Beard Trim',       loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'',     src:'img/pelo-2.jpg',     alt:'Fade Haircut',     loading:'lazy',  decoding:'async'},
{cat:'shaving', span:'wide', src:'img/shaving-2.jpg',  alt:'Straight Razor',   loading:'lazy',  decoding:'async'},
{cat:'styling', span:'',     src:'img/styling-2.jpg',  alt:'Hair Styling',     loading:'lazy',  decoding:'async'},
{cat:'trimming',span:'',     src:'img/trimming-2.jpg', alt:'Shape Up',         loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'wide', src:'img/pelo-3.jpg',     alt:'Textured Cut',     loading:'lazy',  decoding:'async'},
{cat:'trimming',span:'tall', src:'img/trimming-3.jpg', alt:'Beard Detail',     loading:'lazy',  decoding:'async'},
{cat:'shaving', span:'',     src:'img/shaving-3.jpg',  alt:'Blade Shave',      loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'',     src:'img/pelo-4.jpg',     alt:'Crop Cut',         loading:'lazy',  decoding:'async'},
{cat:'styling', span:'tall', src:'img/styling-3.jpg',  alt:'Pompadour',        loading:'lazy',  decoding:'async'},
{cat:'shaving', span:'',     src:'img/shaving-4.jpg',  alt:'Wet Shave',        loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'',     src:'img/pelo-5.jpg',     alt:'Clean Cut',        loading:'lazy',  decoding:'async'},
{cat:'trimming',span:'wide', src:'img/trimming-4.jpg', alt:'Full Groom',       loading:'lazy',  decoding:'async'},
{cat:'styling', span:'',     src:'img/styling-4.jpg',  alt:'Textured Style',   loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'',     src:'img/pelo-6.jpg',     alt:'Mid Fade',         loading:'lazy',  decoding:'async'},
{cat:'shaving', span:'tall', src:'img/shaving-5.jpg',  alt:'Classic Shave',    loading:'lazy',  decoding:'async'},
{cat:'trimming',span:'',     src:'img/trimming-5.jpg', alt:'Line Up',          loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'',     src:'img/pelo-7.jpg',     alt:'Taper Fade',       loading:'lazy',  decoding:'async'},
{cat:'styling', span:'wide', src:'img/styling-5.jpg',  alt:'Volume Styling',   loading:'lazy',  decoding:'async'},
{cat:'trimming',span:'',     src:'img/trimming-6.jpg', alt:'Precision Trim',   loading:'lazy',  decoding:'async'},
{cat:'haircut', span:'',     src:'img/pelo-8.jpg',     alt:'Skin Fade',        loading:'lazy',  decoding:'async'}
  ];

  const PER_PAGE = 9;
  let visibleCount = PER_PAGE, currentFilter = 'all',
      currentLbIndex = 0, lbImages = [],
      autoplayTimer = null, autoplaySpeed = 3000,
      isPlaying = false, zoomLevel = 1;

  const grid        = document.getElementById('gallery-grid');
  const loadBtn     = document.getElementById('load-more-btn');
  const progressBar = document.getElementById('pf-lb-progress-bar');
  const lb          = document.getElementById('pf-lightbox');
  const lbImg       = document.getElementById('pf-lb-img');
  const lbImgWrap   = document.getElementById('pf-lb-img-wrap');

  function getFilteredData() {
    return currentFilter === 'all'
      ? [...GALLERY_DATA]
      : GALLERY_DATA.filter(d => d.cat === currentFilter);
  }

  function buildItem(d, index) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    if (currentFilter === 'all') {
      if (d.span === 'tall') div.style.gridRow    = 'span 2';
      if (d.span === 'wide') div.style.gridColumn = 'span 2';
    }
    div.innerHTML = `<img src="${d.src}" alt="${d.alt}" loading="${d.loading}" decoding="${d.decoding}"/>
      <div class="gallery-label">
        <span class="font-rally text-[.65rem] font-bold tracking-[.2em] uppercase text-gold">${d.cat}</span>
      </div>`;
    div.addEventListener('click', () => openLightbox(index));
    return div;
  }

  function renderGallery() {
    grid.innerHTML = '';
    const data  = getFilteredData();
    lbImages    = data;
    const slice = data.slice(0, visibleCount);
    slice.forEach((d, i) => {
      const el = buildItem(d, i);
      grid.appendChild(el);
      requestAnimationFrame(() => setTimeout(() => el.classList.add('visible'), i * 50));
    });
    const done = visibleCount >= data.length;
    loadBtn.querySelector('span').textContent = done ? 'Todo cargado' : 'Ver más';
    loadBtn.disabled = done;
  }

  document.querySelectorAll('.filter-btn').forEach(btn =>
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      visibleCount  = PER_PAGE;
      renderGallery();
    })
  );

  loadBtn.addEventListener('click', () => { visibleCount += PER_PAGE; renderGallery(); });

  /* ── Lightbox ── */
  function openLightbox(index) {
    currentLbIndex = index;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    showLbSlide(index);
  }

  function closeLightbox() {
    stopAutoplay();
    lb.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
    lbImg.classList.remove('loaded');
    document.querySelector('.pf-lb-speed-menu').classList.remove('open');
  }

  function showLbSlide(index) {
    const d = lbImages[index];
    if (!d) return;
    lbImg.classList.remove('loaded');
    lbImg.src  = d.src;
    lbImg.alt  = d.alt;
    lbImg.onload = () => lbImg.classList.add('loaded');
    document.getElementById('pf-lb-cat').textContent     = d.cat.charAt(0).toUpperCase() + d.cat.slice(1);
    document.getElementById('pf-lb-counter').textContent = `${index + 1} / ${lbImages.length}`;
    resetZoom();
    if (isPlaying) startProgressAnimation();
  }

  function lbNavigate(dir) {
    stopAutoplay();
    currentLbIndex = (currentLbIndex + dir + lbImages.length) % lbImages.length;
    showLbSlide(currentLbIndex);
  }

  function startProgressAnimation() {
    clearTimeout(autoplayTimer);
    progressBar.style.transition = 'none';
    progressBar.style.width      = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      progressBar.style.transition = `width ${autoplaySpeed}ms linear`;
      progressBar.style.width      = '100%';
    }));
    autoplayTimer = setTimeout(() => {
      if (!isPlaying) return;
      currentLbIndex = (currentLbIndex + 1) % lbImages.length;
      showLbSlide(currentLbIndex);
    }, autoplaySpeed);
  }

  function stopAutoplay() {
    isPlaying = false;
    clearTimeout(autoplayTimer);
    const btn = document.getElementById('pf-lb-autoplay');
    btn.classList.remove('playing');
    btn.querySelector('.pf-lb-play-icon').style.display  = 'block';
    btn.querySelector('.pf-lb-pause-icon').style.display = 'none';
    progressBar.style.transition = 'none';
    progressBar.style.width      = '0%';
  }

  function applyZoom(l) {
    zoomLevel = Math.min(Math.max(l, 1), 4);
    lbImgWrap.style.transform = `scale(${zoomLevel})`;
    lbImgWrap.classList.toggle('zoomed', zoomLevel > 1);
  }
  function resetZoom() { applyZoom(1); }

  document.getElementById('pf-lb-autoplay').addEventListener('click', () => {
    if (isPlaying) { stopAutoplay(); return; }
    isPlaying = true;
    const btn = document.getElementById('pf-lb-autoplay');
    btn.classList.add('playing');
    btn.querySelector('.pf-lb-play-icon').style.display  = 'none';
    btn.querySelector('.pf-lb-pause-icon').style.display = 'block';
    startProgressAnimation();
  });

  document.getElementById('pf-lb-prev').addEventListener('click',  () => lbNavigate(-1));
  document.getElementById('pf-lb-next').addEventListener('click',  () => lbNavigate(1));
  document.getElementById('pf-lb-close').addEventListener('click', closeLightbox);
  lb.querySelector('.pf-lb-backdrop').addEventListener('click',    closeLightbox);

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft')  lbNavigate(-1);
    if (e.key === 'ArrowRight') lbNavigate(1);
    if (e.key === 'Escape')     closeLightbox();
  });

  lbImgWrap.addEventListener('click', () => applyZoom(zoomLevel === 1 ? 2 : 1));
  document.getElementById('pf-lb-zoom-in').addEventListener('click',  () => applyZoom(zoomLevel + .5));
  document.getElementById('pf-lb-zoom-out').addEventListener('click', () => applyZoom(zoomLevel - .5));

  document.getElementById('pf-lb-speed-btn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('pf-lb-speed-menu').classList.toggle('open');
  });
  document.addEventListener('click', () =>
    document.getElementById('pf-lb-speed-menu').classList.remove('open')
  );
  document.querySelectorAll('.pf-lb-speed-opt').forEach(opt =>
    opt.addEventListener('click', e => {
      e.stopPropagation();
      autoplaySpeed = parseInt(opt.dataset.speed);
      document.querySelectorAll('.pf-lb-speed-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      document.getElementById('pf-lb-speed-btn').textContent = opt.textContent;
      document.getElementById('pf-lb-speed-menu').classList.remove('open');
      if (isPlaying) { stopAutoplay(); startProgressAnimation(); }
    })
  );

  renderGallery();
})();


/* ══════════════════════════════════════════════════════════════
    VIDEOS
   ══════════════════════════════════════════════════════════════ */
(function () {

  const SRCS    = [
    'https://bouzen.org/wp-content/uploads/2026/02/baber-1.mp4',
    'https://bouzen.org/wp-content/uploads/2026/02/barber-3.mp4',
    'https://bouzen.org/wp-content/uploads/2026/02/barber-2.mp4'
  ];
  const INITIAL = 1;

  const $ = id => document.getElementById(id);
  const player   = $('vd-player'),   playZone = $('vd-play-zone'),
        playBtn  = $('vd-play-btn'), iPlay    = $('vd-icon-play'),
        iPause   = $('vd-icon-pause'),iSnd    = $('vd-icon-sound'),
        iMut     = $('vd-icon-muted'), fill   = $('vd-progress-fill'),
        track    = $('vd-progress-track'), loader = $('vd-loader'),
        wrapper  = $('vs-wrapper');

  let current = INITIAL, swiper;

  const tog     = (el, show) => el.classList.toggle('hidden', !show);
  const setPlay = on => {
    tog(iPlay, !on); tog(iPause, on);
    playBtn.style.opacity   = on ? '0'          : '1';
    playBtn.style.transform = on ? 'scale(.85)' : 'scale(1)';
  };
  const setThumbs = idx =>
    document.querySelectorAll('.vs-thumb')
      .forEach((t, i) => t.classList.toggle('is-active', i === idx));

  function buildSlides() {
    wrapper.innerHTML = SRCS.map((src, i) => `
      <div class="swiper-slide vs-thumb" data-idx="${i}" data-src="${src}">
  <div class="vs-ti relative overflow-hidden" style="aspect-ratio:16/9;">
    <img src="img/video-${i + 1}.png" alt="Video ${i + 1}" width="320" height="180" loading="lazy" decoding="async"
               class="absolute inset-0 w-full h-full object-cover pointer-events-none"
               style="filter:brightness(.55) saturate(.9);">
          <div class="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="vd-thumb-play w-8 h-8 rounded-full flex items-center justify-center"
                 style="background:rgba(255,255,255,.18);backdrop-filter:blur(4px);">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
      </div>`
    ).join('');
  }

  function load(idx, play = true) {
    current    = idx;
    player.src = SRCS[idx];
    fill.style.width = '0%';
    loader.classList.remove('hidden');
    player.load();
    setThumbs(idx);
    if (play) {
      player.play()
        .then(()  => { loader.classList.add('hidden'); setPlay(true);  })
        .catch(() => { loader.classList.add('hidden'); setPlay(false); });
    } else {
      loader.classList.add('hidden');
      setPlay(false);
    }
  }

  playZone.addEventListener('click', () =>
    player.paused ? (player.play(), setPlay(true)) : (player.pause(), setPlay(false))
  );

  ['mouseenter', 'mouseleave'].forEach(ev =>
    playZone.addEventListener(ev, () => {
      if (!player.paused) {
        playBtn.style.opacity   = ev === 'mouseenter' ? '1'          : '0';
        playBtn.style.transform = ev === 'mouseenter' ? 'scale(1)'   : 'scale(.85)';
      }
    })
  );

  player.addEventListener('timeupdate', () => {
    if (player.duration)
      fill.style.width = (player.currentTime / player.duration * 100) + '%';
  });
  player.addEventListener('ended', () => {
    setPlay(false);
    playBtn.style.opacity   = '1';
    playBtn.style.transform = 'scale(1)';
  });
  track.addEventListener('click', e => {
    const r = track.getBoundingClientRect();
    player.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * player.duration;
  });
  $('vd-mute').addEventListener('click', e => {
    e.stopPropagation();
    player.muted = !player.muted;
    tog(iSnd, !player.muted);
    tog(iMut,  player.muted);
  });

  function initSwiper() {
    swiper = new Swiper('.vs-swiper', {
      slidesPerView: 'auto', spaceBetween: 14,
      centeredSlides: true,  initialSlide: INITIAL,
      grabCursor: true,
      pagination: { el: '.vs-pagination', clickable: true },
      on: { slideChange(s) { load(s.activeIndex); } }
    });

    document.querySelectorAll('.vs-thumb').forEach((t, i) =>
      t.addEventListener('click', () => { swiper.slideTo(i); load(i); })
    );

    [['vd-prev', 'slidePrev'], ['vd-next', 'slideNext'],
     ['vd-prev-mob', 'slidePrev'], ['vd-next-mob', 'slideNext']]
      .forEach(([id, fn]) => {
        const el = $(id);
        if (el) el.addEventListener('click', () => swiper[fn]());
      });
  }

  function initGsap() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: '#videos-section', start: 'top 82%', once: true,
      onEnter() {
        gsap.from('.videos-heading-block', { opacity:0, y:28, duration:.85, ease:'power3.out' });
        gsap.from('.vs-arrows',            { opacity:0, x:24, duration:.7,  delay:.2,  ease:'power2.out' });
        gsap.from('.vs-player-wrap',       { opacity:0, y:38, scale:.97, duration:1, delay:.1, ease:'power3.out' });
        gsap.from('.vs-thumb',             { opacity:0, y:22, stagger:.1, delay:.3, duration:.7, ease:'power2.out' });
      }
    });
  }

  buildSlides();

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    initSwiper();
    initGsap();
    load(INITIAL, false); // ← pre-carga sin autoplay
  }, { threshold: 0.1 });

  obs.observe(document.getElementById('videos-section'));

})();