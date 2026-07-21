/**
 * KWIKMEAL FRESH HEAT-N-EAT CORE ENGINE
 * Handles ZIP code validation, weekly cutoff & delivery calculation, and cart line-item properties.
 */

(function () {
  'use strict';

  window.FHEEngine = window.FHEEngine || {};

  const DEFAULT_CONFIG = {
    cutoffDay: 'Sunday',     // e.g. Sunday
    cutoffTime: '11:00 AM',  // e.g. 11:00 AM
    deliveryDay: 'Friday',   // e.g. Friday
    allowedZips: [
      '48187', '48189', '48150', '48151', '48152', '48153', '48154',
      '48331', '48332', '48334', '48335', '48336', '48170', '48374',
      '48375', '48376', '48377', '48167', '48168'
    ]
  };

  const DAYS_MAP = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize configuration from theme globals
  FHEEngine.getConfig = function () {
    const globals = window.FHE_SETTINGS || {};
    return {
      cutoffDay: globals.cutoffDay || DEFAULT_CONFIG.cutoffDay,
      cutoffTime: globals.cutoffTime || DEFAULT_CONFIG.cutoffTime,
      deliveryDay: globals.deliveryDay || DEFAULT_CONFIG.deliveryDay,
      allowedZips: globals.allowedZips || DEFAULT_CONFIG.allowedZips
    };
  };

  // ZIP Code Engine
  FHEEngine.zip = {
    getStoredZip: function () {
      return localStorage.getItem('fhe_user_zip') || '';
    },
    setStoredZip: function (zip) {
      localStorage.setItem('fhe_user_zip', zip.trim());
    },
    validate: function (zipInput) {
      const config = FHEEngine.getConfig();
      const cleaned = (zipInput || '').trim();
      if (!cleaned) return { valid: false, message: 'Please enter a valid ZIP code.' };

      const isAllowed = config.allowedZips.includes(cleaned);
      if (isAllowed) {
        this.setStoredZip(cleaned);
        return { valid: true, zip: cleaned, message: `Great news! Fresh Heat-N-Eat delivers to ZIP ${cleaned}.` };
      } else {
        return { valid: false, zip: cleaned, message: `Sorry, Fresh Heat-N-Eat is currently unavailable in ZIP ${cleaned}.` };
      }
    }
  };

  // Cutoff & Delivery Calculator
  FHEEngine.calculateDelivery = function () {
    const config = FHEEngine.getConfig();
    const now = new Date();

    const cutoffDayNum = DAYS_MAP[config.cutoffDay.toLowerCase()] ?? 0;
    const deliveryDayNum = DAYS_MAP[config.deliveryDay.toLowerCase()] ?? 5;

    // Parse cutoff time e.g. "11:00 AM"
    let cutoffHour = 11;
    let cutoffMin = 0;
    if (config.cutoffTime) {
      const match = config.cutoffTime.match(/(\d+):?(\d+)?\s*(AM|PM)?/i);
      if (match) {
        cutoffHour = parseInt(match[1], 10);
        cutoffMin = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3] ? match[3].toUpperCase() : 'AM';
        if (ampm === 'PM' && cutoffHour < 12) cutoffHour += 12;
        if (ampm === 'AM' && cutoffHour === 12) cutoffHour = 0;
      }
    }

    // Determine current week's cutoff Date object
    const currentDayNum = now.getDay();
    let daysUntilCutoff = cutoffDayNum - currentDayNum;

    const currentCutoffDate = new Date(now);
    currentCutoffDate.setDate(now.getDate() + daysUntilCutoff);
    currentCutoffDate.setHours(cutoffHour, cutoffMin, 0, 0);

    let isPastCutoff = false;

    // If today is past the cutoff day, or it IS the cutoff day but past the cutoff time
    if (daysUntilCutoff < 0 || (daysUntilCutoff === 0 && now >= currentCutoffDate)) {
      isPastCutoff = true;
    }

    // Determine target delivery date
    const targetDeliveryDate = new Date(now);
    let daysUntilDelivery = deliveryDayNum - currentDayNum;

    if (isPastCutoff) {
      // Moves to next week's batch
      daysUntilDelivery += 7;
      if (daysUntilDelivery <= 0) daysUntilDelivery += 7;
    } else {
      if (daysUntilDelivery <= 0) daysUntilDelivery += 7;
    }

    targetDeliveryDate.setDate(now.getDate() + daysUntilDelivery);

    const formattedDeliveryDate = `${DAY_NAMES[targetDeliveryDate.getDay()]}, ${MONTH_NAMES[targetDeliveryDate.getMonth()]} ${targetDeliveryDate.getDate()}`;
    const weekLabel = `Week of ${MONTH_NAMES[targetDeliveryDate.getMonth()]} ${targetDeliveryDate.getDate()}`;

    // Calculate time remaining until cutoff
    let nextCutoff = new Date(currentCutoffDate);
    if (isPastCutoff) {
      nextCutoff.setDate(nextCutoff.getDate() + 7);
    }
    const diffMs = nextCutoff - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isPastCutoff,
      deliveryDateStr: formattedDeliveryDate,
      weekLabel,
      hoursLeft: Math.max(0, diffHours),
      minsLeft: Math.max(0, diffMins),
      cutoffDay: config.cutoffDay,
      cutoffTime: config.cutoffTime,
      deliveryDay: config.deliveryDay
    };
  };

  // UI Initializer & Event Listeners
  FHEEngine.initUI = function () {
    const calc = FHEEngine.calculateDelivery();

    // Update all elements expecting delivery date strings
    document.querySelectorAll('.fhe-calculated-delivery-date').forEach(el => {
      el.textContent = calc.deliveryDateStr;
    });

    // Update countdown timers
    document.querySelectorAll('.fhe-calculated-cutoff-timer').forEach(el => {
      el.textContent = `${calc.hoursLeft}h ${calc.minsLeft}m remaining for ${calc.deliveryDateStr} delivery`;
    });

    // Initialize ZIP Code input forms across page
    document.querySelectorAll('.fhe-zip-form').forEach(form => {
      const input = form.querySelector('.fhe-zip-input');
      const status = form.parentElement.querySelector('.fhe-zip-status');
      const stored = FHEEngine.zip.getStoredZip();

      if (input && stored) {
        input.value = stored;
        const res = FHEEngine.zip.validate(stored);
        if (status) {
          status.textContent = res.message;
          status.className = `fhe-zip-status ${res.valid ? 'is-valid' : 'is-invalid'}`;
        }
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!input) return;
        const res = FHEEngine.zip.validate(input.value);
        if (status) {
          status.textContent = res.message;
          status.className = `fhe-zip-status ${res.valid ? 'is-valid' : 'is-invalid'}`;
        }
      });
    });

    // Attach hidden line item properties to all cart forms for Heat-N-Eat products
    document.querySelectorAll('form[action*="/cart/add"]').forEach(form => {
      if (form.classList.contains('fhe-processed-form')) return;
      form.classList.add('fhe-processed-form');

      let deliveryProp = form.querySelector('input[name="properties[Expected Delivery Date]"]');
      if (!deliveryProp) {
        deliveryProp = document.createElement('input');
        deliveryProp.type = 'hidden';
        deliveryProp.name = 'properties[Expected Delivery Date]';
        form.appendChild(deliveryProp);
      }
      deliveryProp.value = calc.deliveryDateStr;

      let weekProp = form.querySelector('input[name="properties[Delivery Week]"]');
      if (!weekProp) {
        weekProp = document.createElement('input');
        weekProp.type = 'hidden';
        weekProp.name = 'properties[Delivery Week]';
        form.appendChild(weekProp);
      }
      weekProp.value = calc.weekLabel;
    });

    // Accordion handler
    document.querySelectorAll('.fhe-faq-question').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.parentElement;
        item.classList.toggle('is-open');
      });
    });

    // Filter pills handler
    document.querySelectorAll('.fhe-filter-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const filter = this.getAttribute('data-filter');
        document.querySelectorAll('.fhe-filter-btn').forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');

        document.querySelectorAll('.fhe-meal-card').forEach(card => {
          if (filter === 'all') {
            card.style.display = 'flex';
          } else {
            const tags = (card.getAttribute('data-dietary') || '').toLowerCase();
            if (tags.includes(filter.toLowerCase())) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          }
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    FHEEngine.initUI();
  });
})();
