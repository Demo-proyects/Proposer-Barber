(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════ */
  const C = {
    speak  : 'ava/nara-speak.webp',
    espera : 'ava/nara-espera.webp',
    stat   : 'ava/nara-estatico.png',
    intro  : 'ava/intro.mp3',       // Primera visita ever → una sola vez
    ayuda  : 'ava/ayuda.mp3',       // Primera vez que abre el panel → una sola vez ever
    saludo2: 'ava/saludo-2.mp3',    // Visitas posteriores → loop infinito
    wa     : 'https://wa.me/18098786115',
    cool   : 1400,
    SIZE   : 80,
  };

  /* ══════════════════════════════════════════════
     PERSISTENT STORAGE (localStorage = sobrevive entre visitas)
  ══════════════════════════════════════════════ */
  const ls = {
    get: k  => { try { return localStorage.getItem(k);    } catch(e) { return null; } },
    set: k  => { try { localStorage.setItem(k, '1');       } catch(e) {}              },
  };

  /* ══════════════════════════════════════════════
     ESTADO
  ══════════════════════════════════════════════ */
  const S = {
    mode          : 'hidden',
    audioMain     : null,    // intro.mp3 o saludo-2.mp3
    audioHelp     : null,    // ayuda.mp3
    speakLock     : false,   // true mientras un audio esté emitiendo sonido en modo habla
    introPlaying  : false,   // true mientras intro.mp3 esté sonando
    permanentHide : false,
    lastDbl       : 0,
    lastTap       : 0,
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

    // Escucha primera interacción del usuario
    ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(ev =>
      document.addEventListener(ev, onFirstInteraction, { capture: true })
    );
  }

  function onFirstInteraction() {
    if (firstFired || S.permanentHide) return;
    firstFired = true;

    // Quita todos los listeners de primera interacción
    ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(ev =>
      document.removeEventListener(ev, onFirstInteraction, { capture: true })
    );

    popIn();

    if (!ls.get('ava_intro_done')) {
      // Primera visita ever → intro.mp3
      setState('intro');
    } else {
      // Visita posterior → saludo-2.mp3 en loop + espera
      setState('waiting');
      startLoop();
    }
  }

  /* ══════════════════════════════════════════════
     ESTADOS
  ══════════════════════════════════════════════ */
  function setState(mode) {
    S.mode = mode;

    switch (mode) {

      /* ─── HIDDEN ──────────────────────────── */
      case 'hidden':
        killAll();
        wrap.classList.remove('ava-on');
        break;

      /* ─── INTRO ───────────────────────────── */
      case 'intro':
        wrap.classList.add('ava-on');
        hideBtns();
        closeFAQ();
        S.introPlaying = true;
        // img permanece en espera hasta que el audio REALMENTE empiece
        img.src = C.espera;

        playOnce(
          'main',
          C.intro,
          /* onStart — audio emitiendo: ahora sí anima habla */
          () => { img.src = C.speak; },
          /* onEnd — audio terminó */
          () => {
            S.introPlaying = false;
            ls.set('ava_intro_done');
            if (S.mode === 'help') {
              img.src = C.stat;
            } else {
              setState('waiting');
            }
          }
        );
        break;

      /* ─── WAITING ─────────────────────────── */
      case 'waiting':
        // Si un audio está emitiendo en modo habla, no interrumpir
        if (S.speakLock) return;
        S.introPlaying = false;
        wrap.classList.add('ava-on');
        hideBtns();
        closeFAQ();
        setPos('default');
        img.src = C.espera;
        break;

      /* ─── HELP ────────────────────────────── */
      case 'help':
        wrap.classList.add('ava-on');
        showBtns();
        closeFAQ();

        if (S.introPlaying) {
          // Intro sigue sonando: muestra botones, mantiene imagen habla intacta
          // speakLock ya activo, onEnd de intro hará la transición final
          break;
        }

        if (!ls.get('ava_ayuda_done')) {
          ls.set('ava_ayuda_done');
          // img en espera hasta que ayuda.mp3 realmente empiece
          img.src = C.espera;
          playOnce(
            'help',
            C.ayuda,
            /* onStart */ () => { img.src = C.speak; },
            /* onEnd   */ () => { if (S.mode === 'help') img.src = C.stat; }
          );
        } else {
          img.src = C.stat;
        }
        break;

      /* ─── FAQ ─────────────────────────────── */
      case 'faq':
        wrap.classList.add('ava-on');
        hideBtns();
        setPos('center');
        img.src = C.stat;
        openFAQ();
        break;
    }
  }

  /* ══════════════════════════════════════════════
     AUDIO
  ══════════════════════════════════════════════ */
  // onStart  → se llama cuando el audio REALMENTE empieza a sonar ('playing')
  // onEnd    → se llama cuando termina o falla
  function playOnce(slot, src, onStart, onEnd) {
    const key = slot === 'main' ? 'audioMain' : 'audioHelp';
    killAudio(slot);

    const a = new Audio(src);
    S[key] = a;

    const done = () => {
      if (S[key] !== a) return; // ya fue reemplazado
      S[key] = null;
      S.speakLock = false;
      if (onEnd) onEnd();
    };

    // 'playing' = el browser ya decodificó y está emitiendo audio real
    a.addEventListener('playing', () => {
      S.speakLock = true;
      if (onStart) onStart();
    }, { once: true });

    a.addEventListener('ended', done, { once: true });
    a.addEventListener('error', done, { once: true });

    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const resume = () => { if (S[key] === a) a.play().catch(done); };
        ['click', 'keydown', 'touchstart'].forEach(ev =>
          document.addEventListener(ev, resume, { capture: true, once: true })
        );
      });
    }
  }

  function startLoop() {
    killAudio('main');
    const a = new Audio(C.saludo2);
    S.audioMain = a;
    a.loop = true;

    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const resume = () => { if (S.audioMain === a) a.play().catch(() => {}); };
        ['click', 'keydown', 'touchstart'].forEach(ev =>
          document.addEventListener(ev, resume, { capture: true, once: true })
        );
      });
    }
  }

  function killAudio(slot) {
    const key = slot === 'main' ? 'audioMain' : 'audioHelp';
    if (S[key]) {
      try { S[key].pause(); } catch(e) {}
      S[key] = null;
    }
    // Si se mata el audio que tenía el lock, liberar
    if (slot === 'main' || slot === 'help') S.speakLock = false;
  }

  function killAll() {
    killAudio('main');
    killAudio('help');
    S.speakLock    = false;
    S.introPlaying = false;
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
    // Limpia estilos inline y aplica clase de posición
    wrap.style.cssText = '';
    wrap.className = 'ava-on pos-' + m;
  }

  function showBtns() { [btnFaq, btnBack, btnClose].forEach(b => b.classList.add('show')); }
  function hideBtns() { [btnFaq, btnBack, btnClose].forEach(b => b.classList.remove('show')); }
  function openFAQ()  { faqEl.classList.add('open'); }
  function closeFAQ() { faqEl.classList.remove('open'); }

  /* ══════════════════════════════════════════════
     LÓGICA DE CLICK EN AVATAR
  ══════════════════════════════════════════════ */
  function onCircleClick() {
    switch (S.mode) {

      case 'waiting':
        setState('help');
        break;

      case 'intro':
        // Intro sonando: muestra botones sin interrumpir audio ni animación
        // Marca ayuda como vista (el usuario ya está siendo orientado por intro)
        ls.set('ava_ayuda_done');
        S.mode = 'help';   // set manual sin llamar setState completo
        showBtns();
        // img.src sigue siendo C.speak (intro callback lo cambiará al terminar)
        break;

      case 'help':
        setState('waiting');
        break;

      case 'faq':
        setState('waiting');
        break;
    }
  }

  /* ══════════════════════════════════════════════
     DRAG — usa window listeners para máxima compatibilidad
  ══════════════════════════════════════════════ */
  function bindDrag() {
    let dragging = false, moved = false;
    let startX, startY, startLeft, startTop;

    circle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();

      dragging = true;
      moved    = false;

      // Captura posición actual del wrapper (screen coords)
      const r = wrap.getBoundingClientRect();
      startX    = e.clientX;
      startY    = e.clientY;
      startLeft = r.left;
      startTop  = r.top;

      // Usa window para no perder el drag al salir del círculo
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup',   onUp);
      window.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;

      if (moved) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x  = Math.max(0,  Math.min(startLeft + dx, vw - C.SIZE - 10));
        const y  = Math.max(0,  Math.min(startTop  + dy, vh - C.SIZE - 20));

        // Cambia a posicionamiento absoluto
        wrap.className      = 'ava-on';
        wrap.style.left     = x + 'px';
        wrap.style.top      = y + 'px';
        wrap.style.right    = 'auto';
        wrap.style.transform = 'none';
      }
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
      window.removeEventListener('pointercancel', onUp);

      const wasMoved = moved;
      dragging = false;
      moved    = false;

      if (!wasMoved) onCircleClick();
    }
  }

  /* ══════════════════════════════════════════════
     EVENTOS GENERALES
  ══════════════════════════════════════════════ */
  function bindEvents() {
    bindDrag();

    // Botones del panel
    btnFaq.addEventListener('click',   e => { e.stopPropagation(); setState('faq');     });
    btnBack.addEventListener('click',  e => { e.stopPropagation(); setState('waiting'); });
    btnClose.addEventListener('click', e => {
      e.stopPropagation();
      hideBtns();
      killAll();
      modalEl.classList.add('open');
    });

    // Modal
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

    // FAQ botones internos
    faqEl.addEventListener('click', e => {
      if (e.target.closest('#ava-fq-back'))  { setState('waiting'); return; }
      if (e.target.closest('#ava-fq-close')) { setState('help');    return; }
    });

    // Click fuera → vuelve a espera
    document.addEventListener('click', e => {
      if (!['help', 'faq'].includes(S.mode)) return;
      if (modalEl.classList.contains('open')) return;
      if (!e.target.closest('#ava-wrap') && !e.target.closest('#ava-faq')) {
        setState('waiting');
      }
    }, true);

    // Doble clic desktop → respawn
    document.addEventListener('dblclick', e => {
      if (S.mode !== 'hidden' && !S.permanentHide) return;
      if (e.target.closest('#ava-wrap, #ava-faq, #ava-modal')) return;
      S.permanentHide = false;
      respawnAt(e.clientX, e.clientY);
    });

    // Doble tap móvil → respawn
    document.addEventListener('touchend', e => {
      if (S.mode !== 'hidden' && !S.permanentHide) return;
      if (e.target.closest('#ava-wrap, #ava-faq, #ava-modal')) return;

      const now = Date.now();
      if (now - S.lastTap < 350) {
        const t = e.changedTouches[0];
        S.permanentHide = false;
        respawnAt(t.clientX, t.clientY);
        S.lastTap = 0;
        e.preventDefault();
      } else {
        S.lastTap = now;
      }
    }, { passive: false });
  }

  function respawnAt(cx, cy) {
    const now = Date.now();
    if (now - S.lastDbl < C.cool) return;
    S.lastDbl = now;

    firstFired = true; // evita que onFirstInteraction vuelva a dispararse

    const x = Math.max(0,  Math.min(cx - C.SIZE / 2, window.innerWidth  - C.SIZE - 10));
    const y = Math.max(70, Math.min(cy - C.SIZE / 2, window.innerHeight - C.SIZE - 20));

    wrap.className      = 'ava-on';
    wrap.style.left     = x + 'px';
    wrap.style.top      = y + 'px';
    wrap.style.right    = 'auto';
    wrap.style.transform = 'none';

    popIn();
    setState('waiting');

    // Reanuda loop si no es primera visita
    if (ls.get('ava_intro_done')) startLoop();
  }

  /* ══════════════════════════════════════════════
     BUILD DOM
  ══════════════════════════════════════════════ */
  function buildDOM() {
    wrap   = mk('div', { id: 'ava-wrap' });
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
  {
    q: '📈 ¿Para qué necesito un sitio si ya tengo clientes?',
    a: 'Tener clientes hoy no significa poder generar más cuando tú quieras. Si un mes baja el flujo, ¿cómo lo activas? Un sitio bien posicionado te da <span class="line-gold" style="font-weight:600">control sobre la demanda</span>. No es para cuando estás vacío, es para que tengas una herramienta real que puedas usar cuando decidas crecer. No es una medida de emergencia, <span class="word-gold">es ganar control total sobre la demanda de tu negocio.</span>'
  },
  {
    q: '💰 ¿Cuánto me cuesta probarlo?',
    a: '<span class="line-gold" style="font-weight:600">Nada por el sitio durante los primeros 14 días.</span> La única inversión inicial es entre <span class="word-gold">$20 y $30 USD</span> para activar tu propia campaña en Google Ads (dinero que va directo a promocionar tu barbería). Si llegan clientes y decides continuar, el sitio parte desde <span class="line-gold" style="font-weight:600">$250 USD en cuotas</span>. Si no te convence, no hay contratos ni presión.'
  },
  {
    q: '📸 ¿Y si ya tengo Instagram?',
    a: 'Instagram es visibilidad social. <span class="word-gold">Google es intención de compra.</span> En Instagram compites por atención; en Google apareces cuando el cliente ya tiene la billetera en la mano y busca "barbería cerca de mí" para ir hoy mismo. Uno construye comunidad; el otro <span class="line-gold" style="font-weight:600">llena la agenda.</span>'
  },
  {
  q: '📊 ¿Esto realmente funciona?',
  a: 'La diferencia no es tener una web; es poder <span class="word-gold">decidir</span> cuándo tu barbería aparece frente a personas que ya <span class="line-gold" style="font-weight:600">buscan un corte en tu zona</span>. Con Google Ads defines el área, los horarios y el presupuesto. Si una semana tienes huecos libres, aumentas tu presencia en tu zona. Si ya tienes la agenda llena, reduces la publicidad. <span class="word-gold">Eso es control real sobre el flujo de clientes.</span>'
  },
  {
    q: '⏱️ ¿Tengo que saber de tecnología?',
    a: 'Nada. El sitio se entrega <span class="word-gold">listo en 24–48 horas</span>. Configuramos la primera campaña juntos en menos de 20 minutos desde tu teléfono. Tu único trabajo es tener las tijeras listas; <span class="line-gold" style="font-weight:600">del flujo de gente me encargo yo.</span>'
  },
  {
    q: '💬 ¿Cómo empiezo?',
    a: 'Envíame un mensaje por WhatsApp con el nombre de tu barbería y tu ciudad. En menos de <span class="line-gold" style="font-weight:600">24 horas</span> tienes tu demo lista para verla y decidir sin compromiso.',
    wa: true
  }
];

    const WA_ICO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

    const head = `
      <div class="afq-head">
  <div class="afq-label-row">
    <div class="afq-line"></div>
    <span class="afq-label">RESUELVE TUS DUDAS</span>
    <div class="afq-line"></div>
  </div>
  <h2 class="font-rye font-extrabold uppercase text-[clamp(1.3rem,2.5vw,1.8rem)] leading-[1.1] text-twht relative z-10">
  MÁS CLIENTES.<br>
  <em class="font-rye gold-text-gradient not-italic text-[clamp(1.5rem,3vw,2.2rem)] leading-[1.3]">CUANDO QUIERAS.</em>
</h2>
</div>
      <div class="afq-ctrls">
        <button class="afq-ctrl" id="ava-fq-back">← Volver</button>
        <button class="afq-ctrl" id="ava-fq-close">✕ Cerrar</button>
      </div>`;

    const body = items.map(item => {
      const waBtn = item.wa
        ? `<a class="afq-wa-btn" href="${C.wa}" target="_blank" rel="noopener">${WA_ICO} Consultar por WhatsApp</a>`
        : '';
      return `
        <div class="afq-item">
          <div class="afq-bdr afq-bdr-top"></div><div class="afq-bdr afq-bdr-bot"></div>
          <div class="afq-bdr afq-bdr-lft"></div><div class="afq-bdr afq-bdr-rgt"></div>
          <details class="afq-details">
            <summary class="afq-summary">
              <span class="afq-q-text">${item.q}</span>
              <span class="afq-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg></span>
            </summary>
            <div class="afq-answer"><p>${item.a}</p>${waBtn}</div>
          </details>
        </div>`;
    }).join('');

    return head + '<div class="afq-list">' + body + '</div>';
  }

  /* ══════════════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════════════ */
  function mk(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    return e;
  }

  function mkBtn(id, html, title) {
    const b = mk('button', { class: 'ava-btn', id, title });
    b.innerHTML = html;
    return b;
  }

  /* ══════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('ava-css')) return;
    const s = document.createElement('style');
    s.id = 'ava-css';
    s.textContent = buildCSS();
    document.head.appendChild(s);
  }

  function buildCSS() {
    const gold   = '#bf7c1a';
    const bg1    = '#0d0c0a';
    const bg2    = '#0a0908';
    const border = 'rgba(191,124,26,0.3)';
    const gray   = '#8a8580';
    const sz     = C.SIZE;

    return `
      /* ─── Wrap ─────────────────────────────── */
      #ava-wrap{
        display:none;position:fixed;z-index:9100;
        width:${sz}px;font-family:'Raleway',sans-serif;
      }
      #ava-wrap.ava-on { display:block; }
      #ava-wrap.pos-default { top:74px; right:48px; left:auto; transform:none; }
      #ava-wrap.pos-center  { top:74px; left:50%; right:auto; transform:translateX(-50%); }

      /* ─── Círculo ───────────────────────────── */
      #ava-c{
        width:${sz}px;height:${sz}px;border-radius:50%;
        cursor:pointer;user-select:none;position:relative;overflow:visible;
        touch-action:none;
      }
      #ava-img{
        width:${sz}px;height:${sz}px;object-fit:cover;border-radius:50%;
        display:block;pointer-events:none;
        border:2px solid ${border};
        box-shadow:0 0 0 1px rgba(191,124,26,.15),0 6px 28px rgba(0,0,0,.65);
        transition:box-shadow .3s;
      }
      #ava-c:hover #ava-img{
        box-shadow:0 0 0 1px ${gold},0 0 18px rgba(191,124,26,.2),0 10px 36px rgba(0,0,0,.8);
      }

      @keyframes ava-pop{
        0%  { opacity:0; transform:scale(.1) translateY(20px); }
        65% { opacity:1; transform:scale(1.07) translateY(-4px); }
        100%{ opacity:1; transform:scale(1)   translateY(0); }
      }
      #ava-c.ava-pop{ animation:ava-pop .6s cubic-bezier(.34,1.56,.64,1) both; }

      /* ─── Botones satélite ──────────────────── */
      .ava-btn{
        position:absolute;width:34px;height:34px;border-radius:50%;
        background:${bg2};border:1.5px solid ${border};color:${gray};
        font-size:14px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        opacity:0;transform:scale(.2);pointer-events:none;
        transition:opacity .22s,transform .3s cubic-bezier(.34,1.56,.64,1),
                   background .15s,color .15s,border-color .15s;
        box-shadow:0 4px 18px rgba(0,0,0,.55);
        font-family:inherit;outline:none;
      }
      .ava-btn.show{ opacity:1; transform:scale(1); pointer-events:all; }
      .ava-btn:hover{ background:${gold}; color:${bg1}; border-color:${gold}; }

      /* posiciones:
         ?  = centro inferior   (FAQ)
         ↺  = izquierda         (back)
         ✕  = derecha           (close)         */
      #ava-b-faq  { left:23px;  top:100px; transition-delay:.06s; background:${gold}; color:${bg1}; border-color:${gold}; }
      #ava-b-back { left:-27px; top:88px;  transition-delay:.02s; }
      #ava-b-close{ left:73px;  top:88px;  transition-delay:0s;   }

      /* ─── FAQ Panel ─────────────────────────── */
      #ava-faq{
        display:none;position:fixed;
        top:172px;left:50%;transform:translateX(-50%);
        width:min(640px,92vw);background:${bg1};
        border:1px solid ${border};padding:28px 24px;
        z-index:9090;box-shadow:0 24px 64px rgba(0,0,0,.78);
        max-height:68vh;overflow-y:auto;font-family:inherit;
      }
      #ava-faq.open{ display:block; }
      #ava-faq::-webkit-scrollbar{ width:3px; }
      #ava-faq::-webkit-scrollbar-thumb{ background:${gold}; border-radius:2px; }

      .afq-head{ text-align:center; margin-bottom:20px; }
      .afq-label-row{ display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px; }
      .afq-line{ width:36px;height:1px;background:linear-gradient(90deg,transparent,${gold},transparent); }
      .afq-label{ font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${gold};opacity:.8; }
      .afq-title{ font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;margin:0; }
      .afq-accent{ color:${gold}; }

      .afq-ctrls{ display:flex;justify-content:flex-end;gap:6px;margin-bottom:18px; }
      .afq-ctrl{ padding:4px 12px;border:1px solid ${border};background:transparent;color:${gray};font-size:.68rem;cursor:pointer;letter-spacing:.06em;transition:border-color .2s,color .2s;font-family:inherit; }
      .afq-ctrl:hover{ border-color:${gold};color:${gold}; }

      .afq-list{ display:flex;flex-direction:column;gap:8px; }
      .afq-item{ position:relative;background:${bg2};border:1px solid rgba(191,124,26,.1); }

      .afq-bdr{ position:absolute;background:${gold};transition:all .28s ease;pointer-events:none; }
      .afq-bdr-top{ top:0;left:0;width:0;height:1px; }
      .afq-bdr-bot{ bottom:0;right:0;width:0;height:1px; }
      .afq-bdr-lft{ top:0;left:0;width:1px;height:0;transition-delay:.14s; }
      .afq-bdr-rgt{ bottom:0;right:0;width:1px;height:0;transition-delay:.14s; }
      .afq-item:hover .afq-bdr-top,.afq-item:hover .afq-bdr-bot{ width:100%; }
      .afq-item:hover .afq-bdr-lft,.afq-item:hover .afq-bdr-rgt{ height:100%; }

      .afq-details{ width:100%; }
      .afq-summary{ padding:14px 18px;cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;outline:none; }
      .afq-summary::-webkit-details-marker{ display:none; }
      .afq-q-text{ font-size:.8rem;font-weight:600;color:rgba(255,255,255,.85);letter-spacing:.02em;line-height:1.5; }
      .afq-arrow{ width:26px;height:26px;border-radius:50%;flex-shrink:0;border:1px solid ${border};display:flex;align-items:center;justify-content:center;color:${gold};transition:border-color .2s,transform .35s; }
      .afq-details[open] .afq-arrow{ transform:rotate(180deg); }
      .afq-item:hover .afq-arrow{ border-color:${gold}; }
      .afq-answer{ padding:12px 18px 18px;border-top:1px solid ${border}; }
      .afq-answer p{ font-size:.78rem;color:#d6d0c8;line-height:1.85; }
      .afq-answer strong{ color:#fff; }

      .afq-wa-btn{ display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:8px 16px;background:rgba(37,211,102,.04);border:1px solid rgba(37,211,102,.2);color:#4ade80;font-size:.73rem;font-weight:600;text-decoration:none;transition:background .18s,border-color .18s;font-family:inherit; }
      .afq-wa-btn:hover{ background:rgba(37,211,102,.1);border-color:rgba(37,211,102,.4); }

      /* ─── Modal ─────────────────────────────── */
      #ava-modal{ display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;align-items:center;justify-content:center;backdrop-filter:blur(6px); }
      #ava-modal.open{ display:flex; }
      #ava-mbox{ background:${bg1};border:1px solid ${border};padding:34px 28px;max-width:360px;width:88vw;text-align:center;box-shadow:0 28px 68px rgba(0,0,0,.86);font-family:inherit;position:relative; }
      #ava-mbox::before{ content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${gold},transparent); }
      #ava-mbox h3{ font-size:1rem;font-weight:800;color:#fff;margin:0 0 13px;text-transform:uppercase;letter-spacing:.08em; }
      #ava-mbox p{ font-size:.78rem;color:${gray};line-height:1.9;margin:0; }
      #ava-mbox strong{ color:#fff; }
      #ava-mok,#ava-mfollow{ padding:8px 16px;background:transparent;border:1px solid ${border};color:${gray};font-size:.73rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:border-color .2s,color .2s;font-family:inherit;flex:1; }
      #ava-mfollow{ border-color:${gold};color:${gold}; }
      #ava-mok:hover,#ava-mfollow:hover{ border-color:${gold};color:${gold}; }
    `;
  }

  /* ── ARRANQUE ─────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();