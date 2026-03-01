(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════ */
  const C = {
    speak    : 'ava/nara-speak.webp',
    espera   : 'ava/nara-espera.webp',
    intro    : 'ava/intro.mp3',
    ayuda    : 'ava/ayuda.mp3',
    faqAudio : n => `ava/faq-${n}.mp3`,
    wa       : 'https://wa.me/18098786115',
    cool     : 1400,
    SIZE     : 80,
  };

  /* ══════════════════════════════════════════════
     PERSISTENT STORAGE
  ══════════════════════════════════════════════ */
  const ls = {
    get: k => { try { return localStorage.getItem(k);  } catch(e) { return null; } },
    set: k => { try { localStorage.setItem(k, '1');     } catch(e) {}              },
  };

  /* ══════════════════════════════════════════════
     ESTADO
  ══════════════════════════════════════════════ */
  const S = {
    mode          : 'hidden',
    audioMain     : null,
    audioFaq      : null,
    activeFaqBtn  : null,
    permanentHide : false,
    lastDbl       : 0,
    lastTap       : 0,
    rafId         : null,   // requestAnimationFrame id para el anillo de progreso
  };

  let wrap, circle, img, btnFaq, btnBack, btnClose, faqEl, modalEl, mOk, mFollow;
  let firstFired = false;

  /* ══════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════ */
  function boot() {
    if (document.getElementById('ava-wrap')) return;
    injectCSS();
    buildDOM();
    bindEvents();

    ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(ev =>
      document.addEventListener(ev, onFirstInteraction, { capture: true })
    );
  }

  /* ══════════════════════════════════════════════
     PRIMERA INTERACCIÓN
     El AUDIO es el disparador principal del avatar.
     Primera visita: audio intro.mp3 → evento 'playing'
     → ENTONCES aparece el avatar con animación de habla.
     El avatar no se muestra antes de que el audio suene.
  ══════════════════════════════════════════════ */
  function onFirstInteraction() {
    if (firstFired || S.permanentHide) return;
    firstFired = true;

    ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(ev =>
      document.removeEventListener(ev, onFirstInteraction, { capture: true })
    );

    if (!ls.get('ava_intro_done')) {
      // ── Primera visita: audio primero, avatar después ──
      // El DOM ya existe pero wrap permanece oculto.
      // Solo cuando el browser confirma 'playing' lo mostramos.
      img.src = C.espera;

      playMain(
        C.intro,
        /* onPlaying → AUDIO SONANDO → ahora sí aparece */ () => {
          popIn();
          wrap.classList.add('ava-on');
          S.mode = 'intro';
          img.src = C.speak;
        },
        /* onEnd */ () => {
          ls.set('ava_intro_done');
          setState('waiting');
        }
      );
    } else {
      // ── Visitas posteriores: sin audio, avatar directo en espera ──
      popIn();
      setState('waiting');
    }
  }

  /* ══════════════════════════════════════════════
     ESTADOS
  ══════════════════════════════════════════════ */
  function setState(mode) {
    S.mode = mode;

    switch (mode) {

      case 'hidden':
        killAll();
        wrap.classList.remove('ava-on');
        break;

      case 'waiting':
        // Mata solo audio principal; el faq puede seguir
        killMain();
        wrap.classList.add('ava-on');
        hideBtns();
        closeFAQ();
        setPos('default');
        if (!S.audioFaq) img.src = C.espera;
        break;

      case 'help':
        // NO interrumpe ningún audio en curso
        wrap.classList.add('ava-on');
        showBtns();
        closeFAQ();

        // ayuda.mp3: solo la primera vez ever, y solo si no hay audio activo
        if (!ls.get('ava_ayuda_done') && !S.audioMain && !S.audioFaq) {
          ls.set('ava_ayuda_done');
          img.src = C.espera;
          playMain(
            C.ayuda,
            /* onPlaying */ () => { img.src = C.speak; },
            /* onEnd     */ () => { if (S.mode === 'help') img.src = C.espera; }
          );
        } else if (!S.audioMain && !S.audioFaq) {
          img.src = C.espera;
        }
        // Si hay audio en curso: no tocar img.src, que siga
        break;

      case 'faq':
        killMain();
        wrap.classList.add('ava-on');
        hideBtns();
        setPos('center');
        if (!S.audioFaq) img.src = C.espera;
        openFAQ();
        break;
    }
  }

  /* ══════════════════════════════════════════════
     AUDIO — MAIN
  ══════════════════════════════════════════════ */
  function playMain(src, onPlaying, onEnd) {
    killMain();
    const a = new Audio(src);
    S.audioMain = a;

    a.addEventListener('playing', () => {
      if (S.audioMain !== a) return;
      if (onPlaying) onPlaying();
    }, { once: true });

    const done = () => {
      if (S.audioMain !== a) return;
      S.audioMain = null;
      if (onEnd) onEnd();
    };
    a.addEventListener('ended', done, { once: true });
    a.addEventListener('error', done, { once: true });

    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const resume = () => { if (S.audioMain === a) a.play().catch(done); };
        ['click', 'keydown', 'touchstart'].forEach(ev =>
          document.addEventListener(ev, resume, { capture: true, once: true })
        );
      });
    }
  }

  function killMain() {
    if (S.audioMain) {
      try { S.audioMain.pause(); } catch(e) {}
      S.audioMain = null;
    }
  }

  /* ══════════════════════════════════════════════
     AUDIO — FAQ
  ══════════════════════════════════════════════ */
  function playFaqAudio(n, btn) {
    killFaqAudio();
    killMain();

    const a = new Audio(C.faqAudio(n));
    S.audioFaq     = a;
    S.activeFaqBtn = btn;

    btn.classList.add('faq-audio-playing');
    btn.setAttribute('aria-label', 'Detener audio');
    img.src = C.speak;

    // Inicia el anillo de progreso
    a.addEventListener('playing', () => { startProgressRaf(a, btn); }, { once: true });

    const done = () => {
      if (S.audioFaq !== a) return;
      S.audioFaq     = null;
      S.activeFaqBtn = null;
      stopProgressRaf();
      btn.classList.remove('faq-audio-playing');
      btn.setAttribute('aria-label', 'Escuchar respuesta');
      img.src = C.espera;
    };
    a.addEventListener('ended', done, { once: true });
    a.addEventListener('error', done, { once: true });

    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const resume = () => { if (S.audioFaq === a) a.play().catch(done); };
        ['click', 'keydown', 'touchstart'].forEach(ev =>
          document.addEventListener(ev, resume, { capture: true, once: true })
        );
      });
    }
  }

  function killFaqAudio() {
    if (S.audioFaq) {
      try { S.audioFaq.pause(); } catch(e) {}
      S.audioFaq = null;
    }
    stopProgressRaf();
    if (S.activeFaqBtn) {
      S.activeFaqBtn.classList.remove('faq-audio-playing');
      S.activeFaqBtn.setAttribute('aria-label', 'Escuchar respuesta');
      S.activeFaqBtn = null;
    }
    document.querySelectorAll('.faq-audio-btn.faq-audio-playing').forEach(b => {
      b.classList.remove('faq-audio-playing');
      b.setAttribute('aria-label', 'Escuchar respuesta');
    });
  }

  function killAll() {
    killMain();
    killFaqAudio();
    img.src = C.espera;
  }

  /* ══════════════════════════════════════════════
     ANILLO DE PROGRESO (SVG circular)
     Actualiza stroke-dashoffset en cada frame
     usando currentTime / duration del audio FAQ.
     Circunferencia del círculo r=11: 2π×11 ≈ 69.115
  ══════════════════════════════════════════════ */
  const FAB_CIRC = 2 * Math.PI * 11; // 69.115

  function startProgressRaf(audio, btn) {
    stopProgressRaf();
    const ring = btn.querySelector('.fab-ring-prog');
    if (!ring) return;

    function tick() {
      if (!S.audioFaq || S.audioFaq !== audio) return;
      const dur = audio.duration;
      const pct = (dur && isFinite(dur)) ? audio.currentTime / dur : 0;
      // dashoffset: FAB_CIRC (0%) → 0 (100%)
      ring.style.strokeDashoffset = FAB_CIRC * (1 - pct);
      S.rafId = requestAnimationFrame(tick);
    }

    S.rafId = requestAnimationFrame(tick);
  }

  function stopProgressRaf() {
    if (S.rafId !== null) {
      cancelAnimationFrame(S.rafId);
      S.rafId = null;
    }
    // Resetea todos los anillos visibles
    document.querySelectorAll('.fab-ring-prog').forEach(r => {
      r.style.strokeDashoffset = FAB_CIRC;
    });
  }

  /* ══════════════════════════════════════════════
     UI HELPERS
  ══════════════════════════════════════════════ */
  function popIn() {
    wrap.classList.add('ava-on');
    circle.classList.remove('ava-pop');
    void circle.offsetWidth;
    circle.classList.add('ava-pop');
  }

  function setPos(m) {
    wrap.style.cssText = '';
    wrap.className = 'ava-on pos-' + m;
  }

  function showBtns() { [btnFaq, btnBack, btnClose].forEach(b => b.classList.add('show')); }
  function hideBtns() { [btnFaq, btnBack, btnClose].forEach(b => b.classList.remove('show')); }
  function openFAQ()  { faqEl.classList.add('open'); }
  function closeFAQ() { faqEl.classList.remove('open'); }

  /* ══════════════════════════════════════════════
     CLICK EN AVATAR
  ══════════════════════════════════════════════ */
  function onCircleClick() {
    switch (S.mode) {
      case 'waiting':
      case 'intro':   setState('help');    break;
      case 'help':    setState('waiting'); break;
      case 'faq':     setState('waiting'); break;
    }
  }

  /* ══════════════════════════════════════════════
     DRAG
  ══════════════════════════════════════════════ */
  function bindDrag() {
    let dragging = false, moved = false;
    let startX, startY, startLeft, startTop;

    circle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true; moved = false;
      const r  = wrap.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = r.left; startTop = r.top;
      window.addEventListener('pointermove',   onMove);
      window.addEventListener('pointerup',     onUp);
      window.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
      if (moved) {
        const x = Math.max(0, Math.min(startLeft + dx, window.innerWidth  - C.SIZE - 10));
        const y = Math.max(0, Math.min(startTop  + dy, window.innerHeight - C.SIZE - 20));
        wrap.className = 'ava-on';
        wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
        wrap.style.right = 'auto'; wrap.style.transform = 'none';
      }
    }

    function onUp() {
      window.removeEventListener('pointermove',   onMove);
      window.removeEventListener('pointerup',     onUp);
      window.removeEventListener('pointercancel', onUp);
      const wasMoved = moved; dragging = false; moved = false;
      if (!wasMoved) onCircleClick();
    }
  }

  /* ══════════════════════════════════════════════
     EVENTOS
  ══════════════════════════════════════════════ */
  function bindEvents() {
    bindDrag();

    btnFaq.addEventListener('click',   e => { e.stopPropagation(); setState('faq'); });
    btnBack.addEventListener('click',  e => { e.stopPropagation(); setState('waiting'); });
    btnClose.addEventListener('click', e => {
      e.stopPropagation();
      hideBtns(); killAll();
      modalEl.classList.add('open');
    });

    mOk.addEventListener('click', () => {
      modalEl.classList.remove('open');
      setState('hidden');
      S.permanentHide = true;
    });
    mFollow.addEventListener('click', () => {
      modalEl.classList.remove('open');
      setState('waiting');
    });
    modalEl.addEventListener('click', e => {
      if (e.target === modalEl) modalEl.classList.remove('open');
    });

    faqEl.addEventListener('click', e => {
      if (e.target.closest('#ava-fq-back'))  { setState('waiting'); return; }
      if (e.target.closest('#ava-fq-close')) { setState('help');    return; }

      const audioBtn = e.target.closest('.faq-audio-btn');
      if (audioBtn) {
        e.stopPropagation();
        const n = parseInt(audioBtn.dataset.faqN, 10);
        if (S.activeFaqBtn === audioBtn) {
          killFaqAudio();
          img.src = C.espera;
        } else {
          playFaqAudio(n, audioBtn);
        }
      }
    });

    document.addEventListener('click', e => {
      if (!['help', 'faq'].includes(S.mode)) return;
      if (modalEl.classList.contains('open')) return;
      if (!e.target.closest('#ava-wrap') && !e.target.closest('#ava-faq')) {
        setState('waiting');
      }
    }, true);

    document.addEventListener('dblclick', e => {
      if (S.mode !== 'hidden' && !S.permanentHide) return;
      if (e.target.closest('#ava-wrap, #ava-faq, #ava-modal')) return;
      S.permanentHide = false;
      respawnAt(e.clientX, e.clientY);
    });

    document.addEventListener('touchend', e => {
      if (S.mode !== 'hidden' && !S.permanentHide) return;
      if (e.target.closest('#ava-wrap, #ava-faq, #ava-modal')) return;
      const now = Date.now();
      if (now - S.lastTap < 350) {
        const t = e.changedTouches[0];
        S.permanentHide = false;
        respawnAt(t.clientX, t.clientY);
        S.lastTap = 0; e.preventDefault();
      } else { S.lastTap = now; }
    }, { passive: false });
  }

  function respawnAt(cx, cy) {
    const now = Date.now();
    if (now - S.lastDbl < C.cool) return;
    S.lastDbl = now; firstFired = true;
    const x = Math.max(0,  Math.min(cx - C.SIZE / 2, window.innerWidth  - C.SIZE - 10));
    const y = Math.max(70, Math.min(cy - C.SIZE / 2, window.innerHeight - C.SIZE - 20));
    wrap.className = 'ava-on';
    wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
    wrap.style.right = 'auto'; wrap.style.transform = 'none';
    popIn(); setState('waiting');
  }

  /* ══════════════════════════════════════════════
     DOM
  ══════════════════════════════════════════════ */
  function buildDOM() {
    wrap = mk('div', { id: 'ava-wrap' });
    wrap.className = 'pos-default';

    circle = mk('div', { id: 'ava-c' });
    img    = mk('img', { id: 'ava-img', src: C.espera, alt: 'Nara', draggable: 'false' });
    circle.appendChild(img);

    btnFaq   = mkBtn('ava-b-faq',   '?', 'Preguntas frecuentes');
    btnBack  = mkBtn('ava-b-back',  '↺', 'Volver al menú');
    btnClose = mkBtn('ava-b-close', '✕', 'Ocultar asistente');

    wrap.appendChild(circle);
    wrap.appendChild(btnFaq);
    wrap.appendChild(btnBack);
    wrap.appendChild(btnClose);

    faqEl = mk('div', { id: 'ava-faq' });
    faqEl.innerHTML = buildFAQHTML();

    modalEl = mk('div', { id: 'ava-modal' });
    modalEl.innerHTML = `
      <div id="ava-mbox">
        <h3>👋 ¡Hasta pronto!</h3>
        <p>Puedes volver a llamarme con un <strong>doble clic</strong> (o doble tap en móvil) en cualquier parte de la pantalla.</p>
        <p style="margin-top:12px;color:#bf7c1a;font-size:0.85rem;">Siempre estoy aquí si necesitas ayuda.</p>
        <div style="display:flex;gap:10px;margin-top:22px;">
          <button id="ava-mok">Entendido</button>
          <button id="ava-mfollow">Seguir con avatar</button>
        </div>
      </div>`;

    document.body.appendChild(wrap);
    document.body.appendChild(faqEl);
    document.body.appendChild(modalEl);

    mOk     = document.getElementById('ava-mok');
    mFollow = document.getElementById('ava-mfollow');
  }

  /* ══════════════════════════════════════════════
     FAQ HTML
  ══════════════════════════════════════════════ */
  function buildFAQHTML() {
    const items = [
      { n:1, q:'📈 ¿Para qué necesito un sitio si ya tengo clientes?', a:'Tener clientes hoy no significa poder generar más cuando tú quieras. Si un mes baja el flujo, ¿cómo lo aumentas? Con Google Ads puedes <span class="line-gold" style="font-weight:600">encender la demanda cuando quieras</span>. Tu sitio es tu barbería en internet — y Google Ads es el botón que atrae a los que quieren un corte hoy. No es una medida de emergencia, <span class="word-gold">es tener control total sobre cuándo y cuántos clientes atraer.</span>' },
      { n:2, q:'💰 ¿Cuánto me cuesta probarlo?', a:'<span class="line-gold" style="font-weight:600">Nada por el sitio durante los primeros 14 días.</span> La única inversión inicial es entre <span class="word-gold">$20 y $30 USD</span> para activar tu propia campaña en Google Ads (dinero que va directo a promocionar tu barbería). Si llegan clientes y decides continuar, el sitio parte desde <span class="line-gold" style="font-weight:600">$250 USD en cuotas</span>. Si no te convence, no hay contratos ni presión.' },
      { n:3, q:'📸 ¿Y si ya tengo Instagram?', a:'Instagram es visibilidad social. <span class="word-gold">Google es intención de compra.</span> En Instagram compites por atención; en Google apareces cuando el cliente ya tiene la billetera en la mano y busca "barbería cerca de mí" para ir hoy mismo. Uno construye comunidad; el otro <span class="line-gold" style="font-weight:600">llena la agenda.</span>' },
      { n:4, q:'📊 ¿Esto realmente funciona?', a:'La diferencia no es tener una web; es poder <span class="word-gold">decidir</span> cuándo tu barbería aparece frente a personas que ya <span class="line-gold" style="font-weight:600">buscan un corte en tu zona</span>. Con Google Ads defines el área, los horarios y el presupuesto. Si una semana tienes huecos libres, aumentas tu presencia en tu zona. Si ya tienes la agenda llena, reduces la publicidad. <span class="word-gold">Eso es control real sobre el flujo de clientes.</span>' },
      { n:5, q:'⏱️ ¿Tengo que saber de tecnología?', a:'Nada. El sitio se entrega <span class="word-gold">listo en 24–48 horas</span>. Configuramos la primera campaña juntos en menos de 20 minutos desde tu teléfono. Tu único trabajo es tener las tijeras listas; <span class="line-gold" style="font-weight:600">del flujo de gente me encargo yo.</span>' },
      { n:6, q:'💬 ¿Cómo empiezo?', a:'Un mensaje es todo lo que necesitas. Escríbele a Guervency que te pedirá informacion sobre tu barberia — en menos de <span class="line-gold" style="font-weight:600">24 horas</span> tienes tu demo lista. Tú decides después.', wa:true },
    ];

    const WA_ICO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

    const head = `
      <div class="afq-head">
        <div class="afq-label-row">
          <div class="afq-line"></div><span class="afq-label">RESUELVE TUS DUDAS</span><div class="afq-line"></div>
        </div>
        <h2 class="font-rye font-extrabold uppercase text-[clamp(1.3rem,2.5vw,1.8rem)] leading-[1.1] text-twht relative z-10">
CONSIGUE<br>MÁS CLIENTES.<br>
<em class="font-rye gold-text-gradient not-italic text-[clamp(1.5rem,3vw,2.2rem)] leading-[1.3]">CUANDO QUIERAS.</em>
        </h2>
      </div>
      <div class="afq-ctrls">
        <button class="afq-ctrl" id="ava-fq-back">← Volver</button>
        <button class="afq-ctrl" id="ava-fq-close">✕ Cerrar</button>
      </div>`;

    const body = items.map(item => {
      const waBtn = item.wa ? `<a class="afq-wa-btn" href="${C.wa}" target="_blank" rel="noopener">${WA_ICO} Consultar por WhatsApp</a>` : '';
      return `
        <div class="afq-item">
          <div class="afq-bdr afq-bdr-top"></div><div class="afq-bdr afq-bdr-bot"></div>
          <div class="afq-bdr afq-bdr-lft"></div><div class="afq-bdr afq-bdr-rgt"></div>
          <details class="afq-details">
            <summary class="afq-summary">
              <span class="afq-q-text">${item.q}</span>
              <div class="afq-summary-end">
                <button class="faq-audio-btn" data-faq-n="${item.n}" aria-label="Escuchar respuesta" title="Escuchar respuesta">
                  <svg class="fab-ring-svg" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                    <circle class="fab-ring-track" cx="13" cy="13" r="11" fill="none" stroke-width="2"/>
                    <circle class="fab-ring-prog"  cx="13" cy="13" r="11" fill="none" stroke-width="2"
                      stroke-dasharray="69.115" stroke-dashoffset="69.115"
                      transform="rotate(-90 13 13)"/>
                  </svg>
                  <span class="fab-ico-play"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
                  <span class="fab-ico-stop"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg></span>
                </button>
                <span class="afq-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg></span>
              </div>
            </summary>
            <div class="afq-answer"><p>${item.a}</p>${waBtn}</div>
          </details>
        </div>`;
    }).join('');

    return head + '<div class="afq-list">' + body + '</div>';
  }

  function mk(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    return e;
  }
  function mkBtn(id, html, title) {
    const b = mk('button', { class: 'ava-btn', id, title });
    b.innerHTML = html; return b;
  }

  function injectCSS() {
    if (document.getElementById('ava-css')) return;
    const s = document.createElement('style');
    s.id = 'ava-css'; s.textContent = buildCSS();
    document.head.appendChild(s);
  }

  function buildCSS() {
    const gold='#bf7c1a',bg1='#0d0c0a',bg2='#0a0908',border='rgba(191,124,26,0.3)',gray='#8a8580',sz=C.SIZE;
    return `
      #ava-wrap{display:none;position:fixed;z-index:9100;width:${sz}px;font-family:'Raleway',sans-serif;}
      #ava-wrap.ava-on{display:block;}
      #ava-wrap.pos-default{top:74px;right:20px;left:auto;transform:none;}
      #ava-wrap.pos-center{top:74px;left:50%;right:auto;transform:translateX(-50%);}
      #ava-c{width:${sz}px;height:${sz}px;border-radius:50%;cursor:pointer;user-select:none;position:relative;overflow:visible;touch-action:none;}
      #ava-img{width:${sz}px;height:${sz}px;object-fit:cover;border-radius:50%;display:block;pointer-events:none;border:2px solid ${border};box-shadow:0 0 0 1px rgba(191,124,26,.15),0 6px 28px rgba(0,0,0,.65);transition:box-shadow .3s;}
      #ava-c:hover #ava-img{box-shadow:0 0 0 1px ${gold},0 0 18px rgba(191,124,26,.2),0 10px 36px rgba(0,0,0,.8);}
      @keyframes ava-pop{0%{opacity:0;transform:scale(.1) translateY(20px);}65%{opacity:1;transform:scale(1.07) translateY(-4px);}100%{opacity:1;transform:scale(1) translateY(0);}}
      #ava-c.ava-pop{animation:ava-pop .6s cubic-bezier(.34,1.56,.64,1) both;}
      .ava-btn{position:absolute;width:34px;height:34px;border-radius:50%;background:${bg2};border:1.5px solid ${border};color:${gray};font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.2);pointer-events:none;transition:opacity .22s,transform .3s cubic-bezier(.34,1.56,.64,1),background .15s,color .15s,border-color .15s;box-shadow:0 4px 18px rgba(0,0,0,.55);font-family:inherit;outline:none;}
      .ava-btn.show{opacity:1;transform:scale(1);pointer-events:all;}
      .ava-btn:hover{background:${gold};color:${bg1};border-color:${gold};}
      #ava-b-faq{left:23px;top:100px;transition-delay:.06s;background:${gold};color:${bg1};border-color:${gold};}
      #ava-b-back{left:-27px;top:88px;transition-delay:.02s;}
      #ava-b-close{left:73px;top:88px;transition-delay:0s;}
      #ava-faq{display:none;position:fixed;top:172px;left:50%;transform:translateX(-50%);width:min(640px,92vw);background:${bg1};border:1px solid ${border};padding:28px 24px;z-index:9090;box-shadow:0 24px 64px rgba(0,0,0,.78);max-height:68vh;overflow-y:auto;font-family:inherit;}
      #ava-faq.open{display:block;}
      #ava-faq::-webkit-scrollbar{width:3px;}
      #ava-faq::-webkit-scrollbar-thumb{background:${gold};border-radius:2px;}
      .afq-head{text-align:center;margin-bottom:20px;}
      .afq-label-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;}
      .afq-line{width:36px;height:1px;background:linear-gradient(90deg,transparent,${gold},transparent);}
      .afq-label{font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${gold};opacity:.8;}
      .afq-ctrls{display:flex;justify-content:flex-end;gap:6px;margin-bottom:18px;}
      .afq-ctrl{padding:4px 12px;border:1px solid ${border};background:transparent;color:${gray};font-size:.68rem;cursor:pointer;letter-spacing:.06em;transition:border-color .2s,color .2s;font-family:inherit;}
      .afq-ctrl:hover{border-color:${gold};color:${gold};}
      .afq-list{display:flex;flex-direction:column;gap:8px;}
      .afq-item{position:relative;background:${bg2};border:1px solid rgba(191,124,26,.1);}
      .afq-bdr{position:absolute;background:${gold};transition:all .28s ease;pointer-events:none;}
      .afq-bdr-top{top:0;left:0;width:0;height:1px;}
      .afq-bdr-bot{bottom:0;right:0;width:0;height:1px;}
      .afq-bdr-lft{top:0;left:0;width:1px;height:0;transition-delay:.14s;}
      .afq-bdr-rgt{bottom:0;right:0;width:1px;height:0;transition-delay:.14s;}
      .afq-item:hover .afq-bdr-top,.afq-item:hover .afq-bdr-bot{width:100%;}
      .afq-item:hover .afq-bdr-lft,.afq-item:hover .afq-bdr-rgt{height:100%;}
      .afq-details{width:100%;}
      .afq-summary{padding:14px 18px;cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;outline:none;}
      .afq-summary::-webkit-details-marker{display:none;}
      .afq-q-text{font-size:.8rem;font-weight:600;color:rgba(255,255,255,.85);letter-spacing:.02em;line-height:1.5;flex:1;}
      .afq-summary-end{display:flex;align-items:center;gap:7px;flex-shrink:0;}

      /* ── Botón audio con anillo de progreso SVG ── */
      .faq-audio-btn{
        position:relative;width:26px;height:26px;border-radius:50%;
        background:transparent;border:none;
        color:${gray};cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        overflow:visible;padding:0;outline:none;flex-shrink:0;
        transition:color .2s;
      }
      .faq-audio-btn:hover{ color:${gold}; }
      .faq-audio-btn.faq-audio-playing{ color:${gold}; background:rgba(191,124,26,.1); border-radius:50%; }

      /* SVG ring: cubre exactamente el botón */
      .fab-ring-svg{
        position:absolute;top:0;left:0;
        pointer-events:none;
      }
      /* Track: círculo de fondo tenue */
      .fab-ring-track{
        stroke:rgba(191,124,26,.2);
        transition:stroke .2s;
      }
      .faq-audio-btn:hover .fab-ring-track{ stroke:rgba(191,124,26,.45); }
      .faq-audio-btn.faq-audio-playing .fab-ring-track{ stroke:rgba(191,124,26,.3); }

      /* Arco de progreso */
      .fab-ring-prog{
        stroke:transparent;
        stroke-linecap:round;
        transition:stroke .25s;
      }
      .faq-audio-btn.faq-audio-playing .fab-ring-prog{ stroke:${gold}; }

      /* Íconos */
      .faq-audio-btn .fab-ico-stop{display:none;align-items:center;justify-content:center;}
      .faq-audio-btn .fab-ico-play{display:flex;align-items:center;justify-content:center;}
      .faq-audio-btn.faq-audio-playing .fab-ico-play{display:none;}
      .faq-audio-btn.faq-audio-playing .fab-ico-stop{display:flex;}
      .afq-arrow{width:26px;height:26px;border-radius:50%;flex-shrink:0;border:1px solid ${border};display:flex;align-items:center;justify-content:center;color:${gold};transition:border-color .2s,transform .35s;}
      .afq-details[open] .afq-arrow{transform:rotate(180deg);}
      .afq-item:hover .afq-arrow{border-color:${gold};}
      .afq-answer{padding:12px 18px 18px;border-top:1px solid ${border};}
      .afq-answer p{font-size:.78rem;color:#d6d0c8;line-height:1.85;}
      .afq-answer strong{color:#fff;}
      .afq-wa-btn{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:8px 16px;background:rgba(37,211,102,.04);border:1px solid rgba(37,211,102,.2);color:#4ade80;font-size:.73rem;font-weight:600;text-decoration:none;transition:background .18s,border-color .18s;font-family:inherit;}
      .afq-wa-btn:hover{background:rgba(37,211,102,.1);border-color:rgba(37,211,102,.4);}
      #ava-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
      #ava-modal.open{display:flex;}
      #ava-mbox{background:${bg1};border:1px solid ${border};padding:34px 28px;max-width:360px;width:88vw;text-align:center;box-shadow:0 28px 68px rgba(0,0,0,.86);font-family:inherit;position:relative;}
      #ava-mbox::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${gold},transparent);}
      #ava-mbox h3{font-size:1rem;font-weight:800;color:#fff;margin:0 0 13px;text-transform:uppercase;letter-spacing:.08em;}
      #ava-mbox p{font-size:.78rem;color:${gray};line-height:1.9;margin:0;}
      #ava-mbox strong{color:#fff;}
      #ava-mok,#ava-mfollow{padding:8px 16px;background:transparent;border:1px solid ${border};color:${gray};font-size:.73rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:border-color .2s,color .2s;font-family:inherit;flex:1;}
      #ava-mfollow{border-color:${gold};color:${gold};}
      #ava-mok:hover,#ava-mfollow:hover{border-color:${gold};color:${gold};}
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
