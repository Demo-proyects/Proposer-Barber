(function() {
  // Configuración de horarios por día (claves en español)
  const scheduleConfig = {
    Lunes: {
      available: false,
      slots: []
    },
    Martes: {
      available: true,
      slots: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
    },
    Miércoles: {
      available: true,
      slots: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
    },
    Jueves: {
      available: true,
      slots: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
    },
    Viernes: {
      available: true,
      slots: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
    },
    Sábado: {
      available: true,
      slots: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
    },
    Domingo: {
      available: true,
      slots: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
    }
  };

  // Elementos del formulario
  const daySelect = document.querySelector('select[name="day"]');
  const timeInput = document.querySelector('input[name="time"]');
  const form = document.getElementById('ct-form');

  if (!daySelect || !timeInput) return;

  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = 'time-notification';
  notification.innerHTML = 'Por favor selecciona un día primero';
  document.body.appendChild(notification);

  let notificationTimeout;

  function showNotification(message) {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    notification.textContent = message;
    notification.classList.add('visible');
    notificationTimeout = setTimeout(() => {
      notification.classList.remove('visible');
    }, 2500);
  }

  // Crear el modal de horarios
  let timePickerModal = null;
  let currentDay = '';

  function createTimePickerModal(day) {
    if (timePickerModal) {
      updateModalContent(day);
      timePickerModal.classList.add('visible');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'time-picker-modal';
    modal.innerHTML = `
      <div class="time-picker-overlay"></div>
      <div class="time-picker-container">
        <div class="time-picker-header">
          <h3>Horarios disponibles para <span class="time-picker-day">${day}</span></h3>
          <button class="time-picker-close">&times;</button>
        </div>
        <div class="time-picker-grid">
          <!-- Los horarios se insertan aquí dinámicamente -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    timePickerModal = modal;

    modal.querySelector('.time-picker-overlay').addEventListener('click', closeModal);
    modal.querySelector('.time-picker-close').addEventListener('click', closeModal);

    updateModalContent(day);
    modal.classList.add('visible');
  }

  function updateModalContent(day) {
    if (!timePickerModal) return;

    const daySpan = timePickerModal.querySelector('.time-picker-day');
    const grid = timePickerModal.querySelector('.time-picker-grid');

    if (daySpan) daySpan.textContent = day;
    if (!grid) return;

    const schedule = scheduleConfig[day];

    if (!schedule || !schedule.available) {
      grid.innerHTML = '<div class="time-picker-no-slots">No hay horarios disponibles para este día</div>';
      return;
    }

    grid.innerHTML = schedule.slots.map(time => {
      const [hourStr, minutes] = time.split(':');
      const hour = parseInt(hourStr);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayTime = `${hour12}:${minutes} ${ampm}`;

      return `
        <button class="time-picker-slot" data-time="${time}">
          ${displayTime}
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.time-picker-slot').forEach(btn => {
      btn.addEventListener('click', function() {
        const selectedTime = this.dataset.time;
        timeInput.value = selectedTime;
        timeInput.dispatchEvent(new Event('change', { bubbles: true }));
        closeModal();
      });
    });
  }

  function closeModal() {
    if (timePickerModal) {
      timePickerModal.classList.remove('visible');
    }
  }

  // Modificar el input de tiempo
  timeInput.readOnly = true;
  timeInput.placeholder = 'Haz clic para seleccionar la hora';
  timeInput.classList.add('time-picker-trigger');

  // Evento click en el input de tiempo
  timeInput.addEventListener('click', function() {
    const selectedDay = daySelect.value;

    if (!selectedDay) {
      showNotification('Por favor selecciona un día primero');
      daySelect.style.transition = 'border-color 0.2s';
      daySelect.style.borderColor = '#bf7c1a';
      setTimeout(() => {
        daySelect.style.borderColor = '';
      }, 500);
      return;
    }

    if (!scheduleConfig[selectedDay]?.available) {
      showNotification('No hay citas disponibles para este día');
      return;
    }

    currentDay = selectedDay;
    createTimePickerModal(selectedDay);
  });

  // Si cambia el día y ya hay una hora seleccionada, limpiarla si no está disponible
  daySelect.addEventListener('change', function() {
    const selectedDay = this.value;
    const currentTime = timeInput.value;

    if (currentTime && selectedDay) {
      const schedule = scheduleConfig[selectedDay];
      if (!schedule?.slots.includes(currentTime)) {
        timeInput.value = '';
      }
    }
  });

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && timePickerModal?.classList.contains('visible')) {
      closeModal();
    }
  });

})();