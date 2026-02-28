(function(){
  const REVIEWS = [
    { src:'Google',   w:340, init:'JR', name:'James R.',   svc:'Corte de Precisión',   half:false, text:'El mejor degradado que he tenido. Marcus se tomó su tiempo para entender exactamente lo que quería y superó mis expectativas. El toque final con toalla caliente fue un gran detalle. Este lugar marca la pauta.' },
{ src:'Yelp',     w:320, init:'DM', name:'David M.',   svc:'Esculpido de Barba',   half:false, text:'Entré pareciendo un desastre y salí como un hombre diferente. El esculpido de barba fue increíblemente preciso. No voy a ir a ningún otro lado.' },
{ src:'Google',   w:360, init:'AL', name:'Anthony L.', svc:'Afeitado con Toalla Caliente', half:false, text:'La experiencia del afeitado con toalla caliente aquí no se parece a nada en la ciudad. Se sintió como un ritual — el pre-aceite, el vapor, la navaja recta. Salí con la piel más suave de mi vida. Vale cada dólar.' },
{ src:'Facebook', w:330, init:'KP', name:'Kevin P.',   svc:'Curso Online de Barbería', half:true,  text:'Tomé el curso online de barbería y cambió todo. Pasé de cero a reservar clientes en 3 meses. Los módulos son detallados, las sesiones de preguntas son oro. Lo recomiendo si hablas en serio.' },
{ src:'Google',   w:340, init:'TW', name:'Tyler W.',   svc:'Corte de Precisión',   half:false, text:'Local limpio, personal profesional, cero espera. Mi skin fade quedó perfecto — la transición en los laterales fue impecable. Esta es mi barbería ahora, sin duda alguna.' },
{ src:'Yelp',     w:320, init:'MG', name:'Marco G.',   svc:'Peinado Profesional',  half:false, text:'Me hice el peinado pompadour y el resultado fue increíble. Usaron productos premium que se mantuvieron todo el día sin sentirse pesados. Recibí cumplidos todo el fin de semana. Volveré.' },
{ src:'Google',   w:350, init:'RS', name:'Robert S.',  svc:'Esculpido de Barba',   half:false, text:'Manejé 40 minutos solo para venir aquí y lo haría de nuevo cada vez. La atención al detalle en mi perfilado fue quirúrgica. Cada línea estaba perfecta. Así es como se ve una barbería de primera clase.' }
];

  const stars = (half) =>
    Array.from({length:5}, (_,i) =>
      `<div class="rv-star${i===4&&half?' half':''}"></div>`
    ).join('');

  document.getElementById('rv-wrapper').innerHTML = REVIEWS.map(r => `
    <div class="swiper-slide" style="width:${r.w}px;">
      <div class="rv-card">
        <span class="rv-source">${r.src}</span>
        <div class="rv-stars">${stars(r.half)}</div>
        <p class="rv-text">${r.text}</p>
        <div class="rv-author">
          <div class="rv-avatar">${r.init}</div>
          <div>
            <div class="rv-name">${r.name}</div>
            <div class="rv-service">${r.svc}</div>
          </div>
        </div>
      </div>
    </div>`
  ).join('');

  new Swiper('#rv-swiper', {
    slidesPerView:'auto', spaceBetween:20, grabCursor:true, loop:true, speed:700,
    autoplay:{ delay:4000, disableOnInteraction:false, pauseOnMouseEnter:true },
    scrollbar:{ el:'.rv-scrollbar', draggable:true },
    navigation:{ prevEl:'#rv-prev', nextEl:'#rv-next' },
    pagination:{ el:'#rv-pagination', clickable:true },
    breakpoints:{ 0:{ spaceBetween:14 }, 768:{ spaceBetween:20 } }
  });
})();