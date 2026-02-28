(function waitForGSAP() {
  if (typeof gsap === 'undefined') { setTimeout(waitForGSAP, 50); return; }

  const heroSection    = document.getElementById('hero');
  const heroContent    = document.querySelector('.hero-content');
  const slidesEl       = document.getElementById('hero-slides');
  const videoContainer = document.getElementById('hero-video');
  const videoElement   = document.getElementById('animated-video');
  const VIDEO_DURATION = 14500; // ← 15 segundos

  let tl = null;
  let playing = false;

  /* ══════════════════════════════════════════
     ELIGE UNA VERSIÓN: cambia ACTIVE_VERSION
     Valores: 1 | 2 | 3 | 4
  ══════════════════════════════════════════ */
  const ACTIVE_VERSION = 1;

  /* ── Helpers compartidos ── */
  function getTargetY() {
    const heroH    = heroSection.offsetHeight;
    const contentH = heroContent.offsetHeight;
    const rectHero = heroSection.getBoundingClientRect();
    const rectCont = heroContent.getBoundingClientRect();
    const currentTop = rectCont.top - rectHero.top;
    return heroH - currentTop - contentH - 52;
  }

  /* ════════════════════════════════════════════════════
     VERSIÓN 1 — "Cortina de humo"
     El bloque se disuelve hacia arriba como vapor,
     aparece recomponiéndose letra a letra desde abajo.
  ════════════════════════════════════════════════════ */
  function v1Down() {
    const targetY = getTargetY();
    const lines   = heroContent.querySelectorAll('h1 span, .hero-buttons');
    tl = gsap.timeline();
    tl
      .to(lines, {
        opacity: 0, y: -30, filter: 'blur(8px)',
        stagger: 0.08, duration: 0.4, ease: 'power2.in'
      })
      .set(heroContent, { justifyContent: 'flex-end', paddingTop: 0, paddingBottom: '52px' })
      .set(lines, { y: 40, opacity: 0, filter: 'blur(0px)' })
      .to(heroContent, { y: targetY, duration: 0, ease: 'none' })
      .to(lines, {
        opacity: 1, y: 0,
        stagger: 0.1, duration: 0.55, ease: 'expo.out'
      })
      .to('.line-gold', {
        color: '#f5d060',
        textShadow: '0 0 30px rgba(245,208,96,.7), 0 0 60px rgba(191,124,26,.4)',
        stagger: 0.12, duration: 0.6, ease: 'sine.inOut',
        yoyo: true, repeat: 1
      }, '-=0.2');
  }
  function v1Back() {
    const lines = heroContent.querySelectorAll('h1 span, .hero-buttons');
    tl = gsap.timeline({ onComplete: () => gsap.set(heroContent, { clearProps: 'all' }) });
    tl
      .to(lines, {
        opacity: 0, y: 20, filter: 'blur(6px)',
        stagger: 0.06, duration: 0.35, ease: 'power2.in'
      })
      .set(heroContent, { justifyContent: 'center', paddingTop: '70px', paddingBottom: '0px', y: 0 })
      .set(lines, { y: -25, opacity: 0, filter: 'blur(0px)' })
      .to(lines, {
        opacity: 1, y: 0,
        stagger: 0.09, duration: 0.5, ease: 'expo.out'
      });
  }

  /* ════════════════════════════════════════════════════
     VERSIÓN 2 — "Revelación lateral"
     El bloque sale deslizándose a la izquierda, viaja
     al fondo y entra desde la derecha con clip-path.
  ════════════════════════════════════════════════════ */
  function v2Down() {
    const targetY = getTargetY();
    tl = gsap.timeline();
    tl
      .to(heroContent, {
        x: '-110%', opacity: 0,
        duration: 0.5, ease: 'power3.in'
      })
      .set(heroContent, {
        justifyContent: 'flex-end', paddingTop: 0, paddingBottom: '52px',
        y: targetY, x: '110%', opacity: 1,
        clipPath: 'inset(0 0 0 100%)'
      })
      .to(heroContent, {
        x: 0, clipPath: 'inset(0 0 0 0%)',
        duration: 0.7, ease: 'expo.out'
      })
      .to('.line-gold', {
        color: '#f5d060',
        textShadow: '0 0 24px rgba(245,208,96,.6)',
        stagger: 0.15, duration: 0.45, ease: 'power1.inOut',
        yoyo: true, repeat: 1
      }, '-=0.3');
  }
  function v2Back() {
    tl = gsap.timeline({ onComplete: () => gsap.set(heroContent, { clearProps: 'all' }) });
    tl
      .to(heroContent, {
        x: '110%', clipPath: 'inset(0 100% 0 0)',
        duration: 0.45, ease: 'power3.in'
      })
      .set(heroContent, {
        justifyContent: 'center', paddingTop: '70px', paddingBottom: '0px',
        y: 0, x: '-110%', clipPath: 'inset(0 0 0 0%)'
      })
      .to(heroContent, {
        x: 0, duration: 0.65, ease: 'expo.out'
      });
  }

  /* ════════════════════════════════════════════════════
     VERSIÓN 3 — "Zoom cinematográfico"
     El bloque escala hacia afuera y se desvanece,
     luego aparece desde el fondo con zoom in y parallax.
  ════════════════════════════════════════════════════ */
  function v3Down() {
    const targetY = getTargetY();
    tl = gsap.timeline();
    tl
      .to(heroContent, {
        scale: 1.18, opacity: 0,
        duration: 0.4, ease: 'power2.in',
        transformOrigin: 'left center'
      })
      .set(heroContent, {
        justifyContent: 'flex-end', paddingTop: 0, paddingBottom: '52px',
        y: targetY, scale: 0.82, opacity: 0,
        transformOrigin: 'left bottom'
      })
      .to(heroContent, {
        scale: 1, opacity: 1,
        duration: 0.8, ease: 'expo.out'
      })
      .fromTo('.hero-buttons', {
        y: 22, opacity: 0
      }, {
        y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.8)'
      }, '-=0.3')
      .to('.line-gold', {
        color: '#ffd966',
        textShadow: '0 0 40px rgba(255,217,102,.65), 0 2px 0 rgba(0,0,0,.5)',
        stagger: 0.14, duration: 0.5, ease: 'power1.inOut',
        yoyo: true, repeat: 1
      }, '-=0.35');
  }
  function v3Back() {
    tl = gsap.timeline({ onComplete: () => gsap.set(heroContent, { clearProps: 'all' }) });
    tl
      .to(heroContent, {
        scale: 0.88, opacity: 0,
        duration: 0.35, ease: 'power2.in',
        transformOrigin: 'left bottom'
      })
      .set(heroContent, {
        justifyContent: 'center', paddingTop: '70px', paddingBottom: '0px',
        y: 0, scale: 1.1, opacity: 0,
        transformOrigin: 'left center'
      })
      .to(heroContent, {
        scale: 1, opacity: 1,
        duration: 0.7, ease: 'expo.out'
      });
  }

  /* ════════════════════════════════════════════════════
     VERSIÓN 4 — "Cascada dorada"
     Cada elemento cae en stagger como fichas de dominó,
     línea a línea, con rebote elegante al llegar al fondo.
  ════════════════════════════════════════════════════ */
  function v4Down() {
    const targetY = getTargetY();
    const items   = [...heroContent.querySelectorAll('svg, .flex.gap-\\[5px\\], h1 span, .hero-buttons')];
    tl = gsap.timeline();
    tl
      .to(items, {
        y: -18, opacity: 0,
        stagger: { each: 0.07, from: 'end' },
        duration: 0.3, ease: 'power1.in'
      })
      .set(heroContent, { justifyContent: 'flex-end', paddingTop: 0, paddingBottom: '52px' })
      .set(heroContent, { y: targetY })
      .set(items, { y: 50, opacity: 0 })
      .to(items, {
        y: 0, opacity: 1,
        stagger: { each: 0.09, from: 'start' },
        duration: 0.6, ease: 'back.out(1.4)'
      })
      .to('.line-gold', {
        color: '#f5d060',
        textShadow: '0 0 20px rgba(245,208,96,.55), 0 0 50px rgba(191,124,26,.3)',
        stagger: 0.18, duration: 0.55, ease: 'sine.inOut',
        yoyo: true, repeat: 1
      }, '-=0.4')
      /* Separador dorado que barre por debajo del título */
      .fromTo('.hero-buttons::before', {
        scaleX: 0
      }, {
        scaleX: 1, duration: 0.4, ease: 'power2.out'
      }, '-=0.6');
  }
  function v4Back() {
    const items = [...heroContent.querySelectorAll('svg, .flex.gap-\\[5px\\], h1 span, .hero-buttons')];
    tl = gsap.timeline({ onComplete: () => gsap.set(heroContent, { clearProps: 'all' }) });
    tl
      .to(items, {
        y: 16, opacity: 0,
        stagger: { each: 0.06, from: 'end' },
        duration: 0.28, ease: 'power1.in'
      })
      .set(heroContent, { justifyContent: 'center', paddingTop: '70px', paddingBottom: '0px', y: 0 })
      .set(items, { y: -30, opacity: 0 })
      .to(items, {
        y: 0, opacity: 1,
        stagger: { each: 0.08, from: 'start' },
        duration: 0.52, ease: 'expo.out'
      });
  }

  /* ── Despacho de versiones ── */
  const versions = {
    1: { down: v1Down, back: v1Back },
    2: { down: v2Down, back: v2Back },
    3: { down: v3Down, back: v3Back },
    4: { down: v4Down, back: v4Back }
  };

  /* ── Lógica principal de vídeo ── */
  function onPlay() {
    if (playing) return;
    playing = true;

    gsap.to(slidesEl, { opacity: 0, duration: 0.5 });
    videoContainer.classList.remove('hidden');
    gsap.set(videoContainer, { opacity: 1 });
    videoElement.src = 'img/video-hero.webp?' + Date.now();

    if (tl) tl.kill();
    versions[ACTIVE_VERSION].down();

    setTimeout(function () {
      gsap.to(videoContainer, {
        opacity: 0, duration: 0.6,
        onComplete: () => {
          videoContainer.classList.add('hidden');
          gsap.set(videoContainer, { opacity: 1 });
          videoElement.src = '';
        }
      });
      gsap.to(slidesEl, { opacity: 1, duration: 0.6 });

      if (tl) tl.kill();
      versions[ACTIVE_VERSION].back();
      playing = false;
    }, VIDEO_DURATION);
  }

  /* ── Reemplaza botón para limpiar listeners ── */
  const oldBtn = document.getElementById('play-video-btn');
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', onPlay);
})();

(function(){const slides=document.querySelectorAll('.hero-slide'),dots=document.querySelectorAll('.slide-dot'),bar=document.getElementById('progress-bar'),DUR=5000;let cur=0,start,raf;function goTo(n){slides[cur].classList.remove('active');dots[cur].classList.remove('active');cur=(n+slides.length)%slides.length;slides[cur].classList.add('active');dots[cur].classList.add('active');reset();}function reset(){bar.style.width='0%';cancelAnimationFrame(raf);start=performance.now();tick();}function tick(){raf=requestAnimationFrame(t=>{const p=Math.min(((t-start)/DUR)*100,100);bar.style.width=p+'%';if(p<100)tick();else setTimeout(()=>goTo(cur+1),80);});}dots.forEach((d,i)=>d.addEventListener('click',()=>goTo(i)));reset();})();

(function(){const btn=document.getElementById('hamburger-btn'),menu=document.getElementById('nav-menu'),bd=document.getElementById('nav-backdrop');let open=false;function toggle(){open=!open;btn.classList.toggle('open',open);menu.classList.toggle('open',open);bd.classList.toggle('open',open);btn.setAttribute('aria-expanded',open);document.body.style.overflow=open?'hidden':'';}btn.addEventListener('click',toggle);bd.addEventListener('click',toggle);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)toggle();});window.closeMenu=()=>{if(open)toggle();};})();

window.smoothTo=id=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth'});};
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}}));

(function(){const vs=['https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1000&q=85','https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1000&q=85','https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1000&q=85','https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1000&q=85'];let c=1,timer;function upd(){const p=(c-1+vs.length)%vs.length,n=(c+1)%vs.length;const lImg=document.querySelector('#vd-left img'),fImg=document.querySelector('#vd-featured img'),rImg=document.querySelector('#vd-right img');if(!lImg)return;lImg.style.opacity='0';fImg.style.opacity='0';rImg.style.opacity='0';setTimeout(()=>{lImg.src=vs[p];fImg.src=vs[c];rImg.src=vs[n];lImg.style.opacity='1';fImg.style.opacity='1';rImg.style.opacity='1';},200);}function next(){c=(c+1)%vs.length;upd();}function prev(){c=(c-1+vs.length)%vs.length;upd();}function startAuto(){timer=setInterval(next,3500);}function resetAuto(){clearInterval(timer);startAuto();}document.getElementById('vd-prev').onclick=()=>{prev();resetAuto();};document.getElementById('vd-next').onclick=()=>{next();resetAuto();};startAuto();})();

// pf-filter active style
const pfs=document.createElement('style');
pfs.textContent='.pf-filter-btn.active,.pf-filter-btn:hover{color:#0e0d0b;background:#bf7c1a;border-color:#bf7c1a;}';
document.head.appendChild(pfs);
gsap.registerPlugin(ScrollTrigger);
gsap.to('.hero-slides',{yPercent:22,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1.2}});
ScrollTrigger.create({trigger:'#about',start:'top 82%',once:true,onEnter:()=>{gsap.to('.g-left',{opacity:1,x:0,duration:1.15,ease:'power3.out'});gsap.to('.g-right',{opacity:1,x:0,duration:1.15,ease:'power3.out',delay:.15});}});
ScrollTrigger.create({trigger:'#services',start:'top 78%',once:true,onEnter:()=>{gsap.to('#services .g-fade',{opacity:1,duration:.7,ease:'power2.out'});gsap.fromTo('.services-big-title',{clipPath:'inset(0 100% 0 0)',opacity:1},{clipPath:'inset(0 0% 0 0)',duration:1.1,ease:'expo.out',delay:.1});gsap.to('#services .g-up',{opacity:1,y:0,duration:.9,ease:'power3.out',stagger:.14,delay:.3});gsap.to('#services .g-right',{opacity:1,x:0,duration:.7,ease:'power3.out',stagger:.1,delay:.2});}});
ScrollTrigger.create({trigger:'#videos-section',start:'top 82%',once:true,onEnter:()=>{gsap.from('.videos-heading-block',{opacity:0,y:28,duration:.85,ease:'power3.out'});gsap.from('.videos-arrows',{opacity:0,x:24,duration:.7,delay:.2,ease:'power2.out'});gsap.from('#vd-left',{opacity:0,x:-55,duration:.95,delay:.18,ease:'power3.out'});gsap.from('#vd-featured',{opacity:0,scale:.9,duration:1.05,delay:.05,ease:'back.out(1.3)'});gsap.from('#vd-right',{opacity:0,x:55,duration:.95,delay:.18,ease:'power3.out'});}});
ScrollTrigger.create({trigger:'#location',start:'top 82%',once:true,onEnter:()=>{gsap.to('.location-overline',{opacity:1,duration:.7,ease:'power2.out'});}});
ScrollTrigger.create({trigger:'#contact',start:'top 82%',once:true,onEnter:()=>{gsap.from('#contact .flex-col',{opacity:0,y:30,duration:.9,ease:'power3.out'});}});