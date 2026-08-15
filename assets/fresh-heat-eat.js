/**
 * KWIKMEAL FRESH HEAT-N-EAT CORE ENGINE
 * Production-Grade Implementation: Virtual Bundling, Meal Customizer,
 * Quick Add, PDP, Cart Grouping, and Edit Add-ons.
 */

(function () {
  'use strict';

  window.FHEEngine = window.FHEEngine || {};

  const DEFAULT_CONFIG = {
    cutoffDay: 'Sunday',
    cutoffTime: '11:59 PM',
    deliveryDay: 'Friday',
    allowedZips: [
      '48187', '48188', '48150', '48151', '48152', '48153', '48154',
      '48025', '48331', '48334', '48335', '48336', '48170', '48374',
      '48375', '48376', '48377', '48167', '48168', '48185', '48186'
    ]
  };

  const DAYS_MAP = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Robust Price Parser Helper (handles string, formatted, float, null, etc.)
  function parsePrice(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const str = String(val).trim();
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // ── 1. Configuration & Storage ──────────────────────────────────────────
  FHEEngine.getConfig = function () {
    const globals = window.FHE_SETTINGS || {};
    return {
      cutoffDay: globals.cutoffDay || DEFAULT_CONFIG.cutoffDay,
      cutoffTime: globals.cutoffTime || DEFAULT_CONFIG.cutoffTime,
      deliveryDay: globals.deliveryDay || DEFAULT_CONFIG.deliveryDay,
      allowedZips: globals.allowedZips || DEFAULT_CONFIG.allowedZips
    };
  };

  // Toast Notification Engine
  FHEEngine.showToast = function (message, type = 'success') {
    let container = document.querySelector('.fhe-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'fhe-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `fhe-toast fhe-toast--${type}`;
    toast.innerHTML = `<span></span> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
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
    try {
      const config = FHEEngine.getConfig();
      const now = new Date();

      const cutoffDayStr = (config.cutoffDay || 'Sunday').toString().toLowerCase();
      const deliveryDayStr = (config.deliveryDay || 'Friday').toString().toLowerCase();
      const cutoffDayNum = DAYS_MAP[cutoffDayStr] ?? 0;
      const deliveryDayNum = DAYS_MAP[deliveryDayStr] ?? 5;

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

      const currentDayNum = now.getDay();
      let daysUntilCutoff = cutoffDayNum - currentDayNum;

      const currentCutoffDate = new Date(now);
      currentCutoffDate.setDate(now.getDate() + daysUntilCutoff);
      currentCutoffDate.setHours(cutoffHour, cutoffMin, 0, 0);

      let isPastCutoff = false;
      if (daysUntilCutoff < 0 || (daysUntilCutoff === 0 && now >= currentCutoffDate)) {
        isPastCutoff = true;
      }

      const targetDeliveryDate = new Date(now);
      let daysUntilDelivery = deliveryDayNum - currentDayNum;

      if (isPastCutoff) {
        daysUntilDelivery += 7;
        if (daysUntilDelivery <= 0) daysUntilDelivery += 7;
      } else {
        if (daysUntilDelivery <= 0) daysUntilDelivery += 7;
      }

      targetDeliveryDate.setDate(now.getDate() + daysUntilDelivery);

      const formattedDeliveryDate = `${DAY_NAMES[targetDeliveryDate.getDay()]}, ${MONTH_NAMES[targetDeliveryDate.getMonth()]} ${targetDeliveryDate.getDate()}`;
      const weekLabel = `Week of ${MONTH_NAMES[targetDeliveryDate.getMonth()]} ${targetDeliveryDate.getDate()}`;

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
        cutoffDateStr: `${DAY_NAMES[nextCutoff.getDay()]}, ${MONTH_NAMES[nextCutoff.getMonth()]} ${nextCutoff.getDate()}`,
        weekLabel,
        hoursLeft: Math.max(0, diffHours),
        minsLeft: Math.max(0, diffMins),
        cutoffDay: config.cutoffDay,
        cutoffTime: config.cutoffTime,
        deliveryDay: config.deliveryDay
      };
    } catch (e) {
      console.warn('Delivery calculation fallback:', e);
      return {
        isPastCutoff: false,
        deliveryDateStr: 'Friday',
        cutoffDateStr: 'Sunday',
        weekLabel: 'Current Week',
        hoursLeft: 24,
        minsLeft: 0
      };
    }
  };

  // ── 2. Addon Variant Resolver ───────────────────────────────────────────
  const _addonVariantCache = {};
  async function resolveAddonVariantId(cb) {
    let rawId = (cb.dataset.variantId || '').trim();
    if (rawId && /^\d+$/.test(rawId)) return rawId;

    const rawTitle = cb.dataset.title || cb.value || '';
    const handle = rawTitle.split('(')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!handle) return rawId;
    if (_addonVariantCache[handle]) return _addonVariantCache[handle];

    try {
      const res = await fetch('/products/' + handle + '.js');
      if (res.ok) {
        const prodData = await res.json();
        if (prodData && prodData.variants && prodData.variants.length > 0) {
          const realId = String(prodData.variants[0].id);
          _addonVariantCache[handle] = realId;
          cb.dataset.variantId = realId;
          return realId;
        }
      }
    } catch (err) {
      console.warn('Add-on variant resolution fallback for:', handle, err);
    }
    return rawId;
  }

  function getAddonQty(cb) {
    const row = cb.closest('.fhe-addon-row');
    if (!row) return 1;
    const val = row.querySelector('.fhe-addon-qty__val');
    return Math.max(1, parseInt(val ? val.textContent : '1', 10) || 1);
  }

  // ── 3. Price Calculators ────────────────────────────────────────────────
  function updateCardPrice(card) {
    if (!card) return;
    const basePrice = parsePrice(card.dataset.basePrice || card.dataset.price);
    const priceElem = card.querySelector('.fhe-meal-card__price, .fhe-pdp-price');
    const qtyInput = card.querySelector('.fhe-qty-input, input[name="quantity"]');
    const mainQty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
    const checkboxes = card.querySelectorAll('.fhe-addon-checkbox');

    let addOnTotal = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) {
        const addonQty = getAddonQty(cb);
        addOnTotal += parsePrice(cb.dataset.price) * addonQty;
      }
    });

    const totalPrice = (basePrice * mainQty) + addOnTotal;
    if (priceElem) {
      priceElem.textContent = '$' + totalPrice.toFixed(2);
    }
  }

  function calculateCustomizerTotal(rawContainer) {
    if (!rawContainer) return { basePrice: 0, mealQty: 1, addOnTotal: 0, total: 0 };
    // Ensure we target the top modal/drawer element if rawContainer is nested inside one
    const modalParent = rawContainer.closest('#fhe-meal-modal, #fhe-cart-edit-drawer');
    const container = modalParent || rawContainer;

    const basePrice = parsePrice(container.dataset.productPrice || container.dataset.basePrice);
    const qtyInput = container.querySelector('.fhe-qty-input, input[name="quantity"]');
    const mealQty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
    const checkboxes = container.querySelectorAll('.fhe-addon-checkbox');

    let addOnTotal = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) {
        const addonQty = getAddonQty(cb);
        addOnTotal += parsePrice(cb.dataset.price) * addonQty;
      }
    });

    const mealTotal = basePrice * mealQty;
    const total = mealTotal + addOnTotal;

    const mealPriceElem = container.querySelector('.fhe-customizer-meal-price');
    const addonsPriceElem = container.querySelector('.fhe-customizer-addons-price');
    const totalPriceElem = container.querySelector('.fhe-customizer-total-price');
    const btnPriceElem = container.querySelector('.fhe-customizer-btn-price');

    if (mealPriceElem) mealPriceElem.textContent = '$' + mealTotal.toFixed(2);
    if (addonsPriceElem) addonsPriceElem.textContent = '$' + addOnTotal.toFixed(2);
    if (totalPriceElem) totalPriceElem.textContent = '$' + total.toFixed(2);
    if (btnPriceElem) btnPriceElem.textContent = '$' + total.toFixed(2);

    return { basePrice, mealQty, addOnTotal, total };
  }

  FHEEngine.updateCustomizerPrice = calculateCustomizerTotal;

  // ── 4. Cart Helper: Refresh & Open Cart Drawer ──────────────────────────
  function refreshAndOpenCartDrawer() {
    document.dispatchEvent(new CustomEvent('cart:refresh'));
    document.dispatchEvent(new CustomEvent('cart:updated'));
    if (window.MinimogEvents && window.MinimogTheme && MinimogTheme.pubSubEvents) {
      window.MinimogEvents.emit(MinimogTheme.pubSubEvents.cartUpdate, { source: 'fhe-cart-update' });
    }

    const cartDrawer = document.querySelector('m-cart-drawer');
    if (cartDrawer) {
      if (typeof cartDrawer.onCartDrawerUpdate === 'function') {
        cartDrawer.onCartDrawerUpdate();
      }
      if (typeof cartDrawer.open === 'function') {
        cartDrawer.open();
      }
    } else {
      window.location.href = '/cart';
    }
  }

  // ── 5. CORE: Add Meal Bundle to Cart ────────────────────────────────────
  async function addMealBundle({ mealVariantId, mealTitle, mealQty, checkedBoxes, triggerBtn }) {
    if (!mealVariantId) {
      console.warn('FHE addMealBundle called without mealVariantId');
      FHEEngine.showToast('Could not add item: missing variant ID', 'error');
      return;
    }

    if (triggerBtn) {
      if (triggerBtn.dataset.fheSubmitting === 'true') return;
      triggerBtn.dataset.fheSubmitting = 'true';
      triggerBtn.disabled = true;
      triggerBtn.classList.add('is-loading', 'm-spinner-loading');
    }

    const bundleId = `fhe-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const calcResult = FHEEngine.calculateDelivery();
    const selectedAddonStrings = [];
    const items = [];

    try {
      for (const cb of checkedBoxes) {
        const addonTitle = cb.dataset.title || cb.value;
        const addonQty = getAddonQty(cb);
        selectedAddonStrings.push(`${addonTitle} x${addonQty}`);

        const resolvedVariantId = await resolveAddonVariantId(cb);
        if (resolvedVariantId && /^\d+$/.test(resolvedVariantId)) {
          items.push({
            id: resolvedVariantId,
            quantity: addonQty,
            properties: {
              '_bundle_id': bundleId,
              '_parent_title': mealTitle,
              'Item Type': 'Add-on'
            }
          });
        }
      }

      const addonsSummary = selectedAddonStrings.length > 0 ? selectedAddonStrings.join(', ') : 'None';

      items.unshift({
        id: mealVariantId,
        quantity: mealQty,
        properties: {
          '_bundle_id': bundleId,
          'Add-ons': addonsSummary,
          'Expected Delivery Date': calcResult.deliveryDateStr,
          'Delivery Week': calcResult.weekLabel
        }
      });

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: items })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.description || 'Failed to add meal bundle to cart.');
      }

      const addedToastMsg = checkedBoxes.length > 0
        ? `Added ${mealQty} ${mealTitle} + ${checkedBoxes.length} side(s) to your cart!`
        : `Added ${mealQty} ${mealTitle} to your cart!`;
      FHEEngine.showToast(addedToastMsg);

      // Close customize modal if open
      const modal = document.querySelector('#fhe-meal-modal');
      if (modal && modal.classList.contains('is-open')) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      refreshAndOpenCartDrawer();
    } catch (err) {
      console.error('Error adding meal bundle:', err);
      FHEEngine.showToast(err.message || 'Could not add item to cart. Please try again.', 'error');
    } finally {
      if (triggerBtn) {
        triggerBtn.dataset.fheSubmitting = 'false';
        triggerBtn.disabled = false;
        triggerBtn.classList.remove('is-loading', 'm-spinner-loading');
      }
    }
  }

  // ── 6. UI Text Updater (safe to call repeatedly) ───────────────────────
  FHEEngine.initUI = function () {
    const calc = FHEEngine.calculateDelivery();

    document.querySelectorAll('.fhe-calculated-delivery-date').forEach(el => {
      el.textContent = calc.deliveryDateStr;
    });

    document.querySelectorAll('.fhe-calculated-cutoff-timer').forEach(el => {
      el.textContent = `${calc.hoursLeft} Hr ${calc.minsLeft} Min remaining for order cutoff for delivery on ${calc.deliveryDateStr}`;
    });

    document.querySelectorAll('.fhe-calculated-cutoff-deadline').forEach(el => {
      el.innerHTML = `Order before ${calc.cutoffDateStr} (${calc.cutoffTime})<br>for ${calc.deliveryDateStr} Delivery`;
    });

    document.querySelectorAll('.fhe-zip-form').forEach(form => {
      const input = form.querySelector('.fhe-zip-input');
      const status = form.parentElement?.querySelector('.fhe-zip-status');
      const stored = FHEEngine.zip.getStoredZip();

      if (input && stored && !input.value) {
        input.value = stored;
        const res = FHEEngine.zip.validate(stored);
        if (status) {
          status.textContent = res.message;
          status.className = `fhe-zip-status ${res.valid ? 'is-valid' : 'is-invalid'}`;
        }
      }
    });

    document.querySelectorAll('.fhe-meal-card').forEach(card => {
      updateCardPrice(card);
    });
  };

  // ── 7. MASTER EVENT LISTENERS (REGISTERED ONCE AT MODULE LEVEL) ─────────

  // A. Close Customize Modal (Close Button & Backdrop Click)
  document.addEventListener('click', function (e) {
    const closeBtn = e.target.closest('.fhe-modal-close');
    if (closeBtn) {
      const modal = closeBtn.closest('#fhe-meal-modal, .fhe-modal-backdrop, #fhe-cart-edit-drawer');
      if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }
    if (e.target.matches('#fhe-meal-modal.fhe-modal-backdrop') || e.target.matches('#fhe-cart-edit-drawer.fhe-cart-edit-backdrop')) {
      e.target.classList.remove('is-open');
      e.target.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  // B. Master Quantity Stepper (+/-) Handler via Delegation
  document.addEventListener('click', function (e) {
    const qtyBtn = e.target.closest('.fhe-qty-btn');
    if (!qtyBtn) return;
    const picker = qtyBtn.closest('.fhe-qty-picker');
    if (!picker) return;
    const input = picker.querySelector('.fhe-qty-input, input[name="quantity"]');
    if (!input) return;

    let val = parseInt(input.value, 10) || 1;
    if (qtyBtn.classList.contains('fhe-qty-btn--plus')) {
      val++;
    } else if (qtyBtn.classList.contains('fhe-qty-btn--minus') && val > 1) {
      val--;
    }
    input.value = val;

    const customizer = picker.closest('#fhe-meal-modal, #fhe-cart-edit-drawer, .fhe-meal-card, .fhe-meal-customizer, .m-main-product--info, .fhe-product-info');
    if (customizer) {
      calculateCustomizerTotal(customizer);
      if (customizer.classList.contains('fhe-meal-card')) {
        updateCardPrice(customizer);
      }
    }
  });

  // C. Add-on Checkbox & Row Stepper Handlers
  document.addEventListener('change', function (e) {
    if (e.target.matches('.fhe-addon-checkbox')) {
      const row = e.target.closest('.fhe-addon-row');
      if (row) {
        const minus = row.querySelector('.fhe-addon-qty__btn--minus');
        const plus  = row.querySelector('.fhe-addon-qty__btn--plus');
        const qtyVal = row.querySelector('.fhe-addon-qty__val');
        const isChecked = e.target.checked;
        if (minus) minus.disabled = !isChecked;
        if (plus)  plus.disabled  = !isChecked;
        if (!isChecked && qtyVal) qtyVal.textContent = '1';
        row.classList.toggle('fhe-addon-row--active', isChecked);
      }

      const customizer = e.target.closest('#fhe-meal-modal, #fhe-cart-edit-drawer, .fhe-meal-card, .fhe-meal-customizer, .m-main-product--info, .fhe-product-info');
      if (customizer) {
        calculateCustomizerTotal(customizer);
        if (customizer.classList.contains('fhe-meal-card')) {
          updateCardPrice(customizer);
        }
      }
    }
  });

  document.addEventListener('click', function (e) {
    const addonBtn = e.target.closest('.fhe-addon-qty__btn');
    if (addonBtn && !addonBtn.disabled) {
      const row = addonBtn.closest('.fhe-addon-row');
      const qtyVal = row ? row.querySelector('.fhe-addon-qty__val') : null;
      if (qtyVal) {
        let current = parseInt(qtyVal.textContent, 10) || 1;
        if (addonBtn.classList.contains('fhe-addon-qty__btn--plus')) {
          current++;
        } else if (addonBtn.classList.contains('fhe-addon-qty__btn--minus') && current > 1) {
          current--;
        }
        qtyVal.textContent = current;
        const customizer = addonBtn.closest('#fhe-meal-modal, #fhe-cart-edit-drawer, .fhe-meal-card, .fhe-meal-customizer, .m-main-product--info, .fhe-product-info');
        if (customizer) {
          calculateCustomizerTotal(customizer);
          if (customizer.classList.contains('fhe-meal-card')) {
            updateCardPrice(customizer);
          }
        }
      }
    }
  });

  // D. Click "Customize & Add" on listing card -> Open Customizer Drawer/Modal
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.fhe-customize-btn');
    if (!btn) return;

    e.preventDefault();
    const variantId = btn.dataset.variantId;
    const productId = btn.dataset.productId;
    const title = btn.dataset.productTitle || 'Meal';
    const price = parsePrice(btn.dataset.productPrice);

    const card = btn.closest('.fhe-meal-card');
    const imgSrc = card ? card.querySelector('.fhe-meal-card__img')?.src || '' : '';
    const desc = card ? card.querySelector('.fhe-meal-card__desc')?.textContent?.trim() || '' : '';
    const macrosHtml = card ? card.querySelector('.fhe-meal-card__macros')?.innerHTML || '' : '';

    const modal = document.querySelector('#fhe-meal-modal');
    if (!modal) return;

    const modalImg = modal.querySelector('#fhe-modal-img');
    const modalTitle = modal.querySelector('#fhe-modal-title');
    const modalDesc = modal.querySelector('#fhe-modal-desc');
    const modalMacros = modal.querySelector('#fhe-modal-macros');
    const modalVariantInput = modal.querySelector('#fhe-modal-variant-id');
    const modalProductInput = modal.querySelector('#fhe-modal-product-id');

    if (modalImg) modalImg.src = imgSrc;
    if (modalTitle) modalTitle.textContent = title;
    if (modalDesc) modalDesc.textContent = desc;
    if (modalMacros) modalMacros.innerHTML = macrosHtml;
    if (modalVariantInput) modalVariantInput.value = variantId;
    if (modalProductInput) modalProductInput.value = productId;

    modal.dataset.productPrice = price;
    modal.dataset.basePrice = price;

    modal.querySelectorAll('.fhe-addon-checkbox').forEach(cb => {
      cb.checked = false;
      const row = cb.closest('.fhe-addon-row');
      if (row) {
        row.classList.remove('fhe-addon-row--active');
        const minus = row.querySelector('.fhe-addon-qty__btn--minus');
        const plus  = row.querySelector('.fhe-addon-qty__btn--plus');
        const qtyVal = row.querySelector('.fhe-addon-qty__val');
        if (minus) minus.disabled = true;
        if (plus) plus.disabled = true;
        if (qtyVal) qtyVal.textContent = '1';
      }
    });

    const qtyInput = modal.querySelector('.fhe-qty-input');
    if (qtyInput) qtyInput.value = 1;

    calculateCustomizerTotal(modal);

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });

  // E. Click "Quick Add" on listing card -> Add immediately without addons
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.fhe-quick-add-btn');
    if (!btn) return;

    e.preventDefault();
    const variantId = btn.dataset.variantId;
    const title = btn.dataset.productTitle || 'Meal';

    addMealBundle({
      mealVariantId: variantId,
      mealTitle: title,
      mealQty: 1,
      checkedBoxes: [],
      triggerBtn: btn
    });
  });

  // F. Click "Add to Cart" inside Customize Modal
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.fhe-submit-customizer-btn');
    if (!btn) return;

    const modal = btn.closest('#fhe-meal-modal');
    if (!modal) return;

    e.preventDefault();
    const variantId = modal.querySelector('#fhe-modal-variant-id')?.value;
    const title = modal.querySelector('#fhe-modal-title')?.textContent?.trim() || 'Meal';
    const qtyInput = modal.querySelector('.fhe-qty-input');
    const mealQty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
    const checkedBoxes = Array.from(modal.querySelectorAll('.fhe-addon-checkbox:checked'));

    addMealBundle({
      mealVariantId: variantId,
      mealTitle: title,
      mealQty: mealQty,
      checkedBoxes: checkedBoxes,
      triggerBtn: btn
    });
  });

  // G. PDP Page "Add to Weekly Order" Button
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.fhe-pdp-submit-btn, .m-add-to-cart');
    if (!btn) return;

    const pdpContainer = btn.closest('.fhe-product-details-section, .m-main-product--info, .fhe-product-info');
    if (!pdpContainer || !pdpContainer.querySelector('.fhe-addon-checkbox')) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const variantInput = pdpContainer.querySelector('input[name="id"]');
    const variantId = variantInput ? variantInput.value : btn.dataset.variantId;
    const title = pdpContainer.querySelector('h1, .fhe-pdp-title')?.textContent?.trim() || 'Meal';
    const qtyInput = pdpContainer.querySelector('input[name="quantity"], .fhe-qty-input');
    const mealQty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
    const checkedBoxes = Array.from(pdpContainer.querySelectorAll('.fhe-addon-checkbox:checked'));

    addMealBundle({
      mealVariantId: variantId,
      mealTitle: title,
      mealQty: mealQty,
      checkedBoxes: checkedBoxes,
      triggerBtn: btn
    });
  }, true);

  // H. Cart Edit Add-ons Flow
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.fhe-edit-addons-btn');
    if (!btn) return;

    e.preventDefault();
    const bundleId = btn.dataset.bundleId;
    const variantId = btn.dataset.variantId;
    const productId = btn.dataset.productId;
    const mealTitle = btn.dataset.productTitle || 'Meal';
    const price = parsePrice(btn.dataset.productPrice);

    const editDrawer = document.querySelector('#fhe-cart-edit-drawer');
    if (!editDrawer) return;

    const titleElem = editDrawer.querySelector('#fhe-edit-meal-name');
    const bundleIdInput = editDrawer.querySelector('#fhe-edit-bundle-id');
    const productIdInput = editDrawer.querySelector('#fhe-edit-product-id');
    const variantIdInput = editDrawer.querySelector('#fhe-edit-variant-id');
    const titleInput = editDrawer.querySelector('#fhe-edit-meal-title');

    if (titleElem) titleElem.textContent = mealTitle;
    if (bundleIdInput) bundleIdInput.value = bundleId;
    if (productIdInput) productIdInput.value = productId;
    if (variantIdInput) variantIdInput.value = variantId;
    if (titleInput) titleInput.value = mealTitle;

    editDrawer.dataset.productPrice = price;
    editDrawer.dataset.basePrice = price;

    try {
      const cartRes = await fetch('/cart.js');
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        const bundleAddons = cartData.items.filter(item => 
          item.properties && item.properties['_bundle_id'] === bundleId && item.properties['Item Type'] === 'Add-on'
        );

        editDrawer.querySelectorAll('.fhe-addon-checkbox').forEach(cb => {
          const addonVariantId = cb.dataset.variantId;
          const existingAddon = bundleAddons.find(item => String(item.variant_id) === String(addonVariantId));
          const row = cb.closest('.fhe-addon-row');
          
          if (existingAddon) {
            cb.checked = true;
            if (row) {
              row.classList.add('fhe-addon-row--active');
              const minus = row.querySelector('.fhe-addon-qty__btn--minus');
              const plus  = row.querySelector('.fhe-addon-qty__btn--plus');
              const qtyVal = row.querySelector('.fhe-addon-qty__val');
              if (minus) minus.disabled = false;
              if (plus) plus.disabled = false;
              if (qtyVal) qtyVal.textContent = existingAddon.quantity;
            }
          } else {
            cb.checked = false;
            if (row) {
              row.classList.remove('fhe-addon-row--active');
              const minus = row.querySelector('.fhe-addon-qty__btn--minus');
              const plus  = row.querySelector('.fhe-addon-qty__btn--plus');
              const qtyVal = row.querySelector('.fhe-addon-qty__val');
              if (minus) minus.disabled = true;
              if (plus) plus.disabled = true;
              if (qtyVal) qtyVal.textContent = '1';
            }
          }
        });

        const parentMeal = cartData.items.find(item => item.properties && item.properties['_bundle_id'] === bundleId && item.properties['Item Type'] !== 'Add-on');
        const qtyInput = editDrawer.querySelector('.fhe-qty-input');
        if (parentMeal && qtyInput) {
          qtyInput.value = parentMeal.quantity;
        }
      }
    } catch (err) {
      console.error('Error reading cart for bundle edit:', err);
    }

    calculateCustomizerTotal(editDrawer);
    editDrawer.classList.add('is-open');
    editDrawer.setAttribute('aria-hidden', 'false');
  });

  // Save Cart Edit Changes
  document.addEventListener('click', async function (e) {
    const saveBtn = e.target.closest('.fhe-save-cart-edit-btn');
    if (!saveBtn) return;

    const editDrawer = saveBtn.closest('#fhe-cart-edit-drawer');
    if (!editDrawer) return;

    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Changes...';

    const bundleId = editDrawer.querySelector('#fhe-edit-bundle-id')?.value;
    const mealTitle = editDrawer.querySelector('#fhe-edit-meal-title')?.value || 'Meal';
    const checkedBoxes = Array.from(editDrawer.querySelectorAll('.fhe-addon-checkbox:checked'));

    try {
      const cartRes = await fetch('/cart.js');
      if (!cartRes.ok) throw new Error('Could not fetch cart.');
      const cartData = await cartRes.json();

      const existingAddonItems = cartData.items.filter(item => 
        item.properties && item.properties['_bundle_id'] === bundleId && item.properties['Item Type'] === 'Add-on'
      );

      const updatesPayload = {};
      existingAddonItems.forEach(item => {
        updatesPayload[item.key] = 0;
      });

      if (Object.keys(updatesPayload).length > 0) {
        await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ updates: updatesPayload })
        });
      }

      const newAddonItems = [];
      const selectedAddonStrings = [];

      for (const cb of checkedBoxes) {
        const addonTitle = cb.dataset.title || cb.value;
        const addonQty = getAddonQty(cb);
        selectedAddonStrings.push(`${addonTitle} x${addonQty}`);

        const resolvedVariantId = await resolveAddonVariantId(cb);
        if (resolvedVariantId && /^\d+$/.test(resolvedVariantId)) {
          newAddonItems.push({
            id: resolvedVariantId,
            quantity: addonQty,
            properties: {
              '_bundle_id': bundleId,
              '_parent_title': mealTitle,
              'Item Type': 'Add-on'
            }
          });
        }
      }

      if (newAddonItems.length > 0) {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: newAddonItems })
        });
      }

      const updatedCartRes = await fetch('/cart.js');
      if (updatedCartRes.ok) {
        const updatedCart = await updatedCartRes.json();
        const parentItem = updatedCart.items.find(item => 
          item.properties && item.properties['_bundle_id'] === bundleId && item.properties['Item Type'] !== 'Add-on'
        );

        if (parentItem) {
          const addonsSummary = selectedAddonStrings.length > 0 ? selectedAddonStrings.join(', ') : 'None';
          const updatedProperties = { ...parentItem.properties, 'Add-ons': addonsSummary };

          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              line: parentItem.index + 1,
              properties: updatedProperties
            })
          });
        }
      }

      FHEEngine.showToast('Updated your meal sides!');

      editDrawer.classList.remove('is-open');
      editDrawer.setAttribute('aria-hidden', 'true');

      refreshAndOpenCartDrawer();
    } catch (err) {
      console.error('Error saving cart edit:', err);
      FHEEngine.showToast('Could not update sides. Please try again.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  // Helper: Refresh Cart Drawer UI and re-open drawer smoothly
  function refreshAndOpenCartDrawer() {
    const cartDrawer = document.querySelector('m-cart-drawer');
    if (cartDrawer) {
      if (typeof cartDrawer.onCartDrawerUpdate === 'function') {
        cartDrawer.onCartDrawerUpdate();
      }
      if (typeof cartDrawer.open === 'function') {
        cartDrawer.open();
      }
    } else {
      window.location.reload();
    }
  }

  // I. Remove Single Side Item [×]
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.fhe-remove-single-addon-btn');
    if (!btn) return;

    e.preventDefault();
    const key = btn.dataset.key;
    const lineIndex = btn.dataset.index;
    const bundleId = btn.dataset.bundleId;

    btn.disabled = true;
    btn.style.opacity = '0.5';

    try {
      const changePayload = key ? { id: key, quantity: 0 } : { line: parseInt(lineIndex, 10), quantity: 0 };
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(changePayload)
      });

      const cartRes = await fetch('/cart.js');
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        const parentItem = cartData.items.find(item => 
          item.properties && item.properties['_bundle_id'] === bundleId && item.properties['Item Type'] !== 'Add-on'
        );
        const remainingAddons = cartData.items.filter(item => 
          item.properties && item.properties['_bundle_id'] === bundleId && item.properties['Item Type'] === 'Add-on'
        );

        if (parentItem) {
          const summaryString = remainingAddons.length > 0
            ? remainingAddons.map(a => `${a.product.title} x${a.quantity}`).join(', ')
            : 'None';

          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              line: parentItem.index + 1,
              properties: { ...parentItem.properties, 'Add-ons': summaryString }
            })
          });
        }
      }

      FHEEngine.showToast('Removed side from your meal.');
      refreshAndOpenCartDrawer();
    } catch (err) {
      console.error('Error removing single side:', err);
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  });

  // J. Remove Entire Bundle when Parent Meal Remove Button is Clicked
  document.addEventListener('click', async function (e) {
    const removeBtn = e.target.closest('.fhe-cart-remove-wrapper, m-cart-remove-button');
    if (!removeBtn) return;

    const itemCard = removeBtn.closest('[data-bundle-id]');
    const bundleId = itemCard ? itemCard.dataset.bundleId : null;

    if (!bundleId) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const cartRes = await fetch('/cart.js');
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        const bundleItems = cartData.items.filter(item => 
          item.properties && item.properties['_bundle_id'] === bundleId
        );

        const updatesPayload = {};
        bundleItems.forEach(item => {
          updatesPayload[item.key] = 0;
        });

        if (Object.keys(updatesPayload).length > 0) {
          await fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ updates: updatesPayload })
          });
        }
      }

      FHEEngine.showToast('Meal removed from cart.');
      refreshAndOpenCartDrawer();
    } catch (err) {
      console.error('Error removing bundle:', err);
    }
  }, true);

  // K. ZIP Form Submission
  document.addEventListener('submit', function (e) {
    const form = e.target.closest('.fhe-zip-form');
    if (!form) return;

    e.preventDefault();
    const input = form.querySelector('.fhe-zip-input');
    const status = form.parentElement?.querySelector('.fhe-zip-status');
    if (!input) return;

    const res = FHEEngine.zip.validate(input.value);
    if (status) {
      status.textContent = res.message;
      status.className = `fhe-zip-status ${res.valid ? 'is-valid' : 'is-invalid'}`;
    }
  });

  // L. Menu Search, Filter, & Sort Handlers
  document.addEventListener('input', function (e) {
    if (e.target.matches('.fhe-menu-search-input')) {
      filterAndSortMeals();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.matches('.fhe-menu-sort-select')) {
      filterAndSortMeals();
    }
  });

  document.addEventListener('click', function (e) {
    const filterBtn = e.target.closest('.fhe-filter-btn');
    if (filterBtn) {
      document.querySelectorAll('.fhe-filter-btn').forEach(b => b.classList.remove('is-active'));
      filterBtn.classList.add('is-active');
      filterAndSortMeals();
    }
  });

  function filterAndSortMeals() {
    const activeFilter = (document.querySelector('.fhe-filter-btn.is-active')?.getAttribute('data-filter') || 'all').toLowerCase();
    const searchQuery = (document.querySelector('.fhe-menu-search-input')?.value || '').trim().toLowerCase();
    const sortValue = document.querySelector('.fhe-menu-sort-select')?.value || 'default';

    const grid = document.querySelector('.fhe-menu-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.fhe-meal-card'));

    cards.forEach(card => {
      const tags = (card.getAttribute('data-dietary') || '').toLowerCase();
      const title = (card.querySelector('.fhe-meal-card__title')?.textContent || '').toLowerCase();
      const desc = (card.querySelector('.fhe-meal-card__desc')?.textContent || '').toLowerCase();

      const matchesFilter = activeFilter === 'all' || tags.includes(activeFilter);
      const matchesSearch = !searchQuery || title.includes(searchQuery) || desc.includes(searchQuery);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    if (sortValue === 'price-asc') {
      cards.sort((a, b) => (parsePrice(a.getAttribute('data-price'))) - (parsePrice(b.getAttribute('data-price'))));
    } else if (sortValue === 'price-desc') {
      cards.sort((a, b) => (parsePrice(b.getAttribute('data-price'))) - (parsePrice(a.getAttribute('data-price'))));
    } else if (sortValue === 'calories') {
      cards.sort((a, b) => (parseInt(a.getAttribute('data-calories') || 0, 10)) - (parseInt(b.getAttribute('data-calories') || 0, 10)));
    }

    cards.forEach(card => grid.appendChild(card));
  }

  // ── 8. SELF-INITIALIZING BOOTSTRAP GUARD ───────────────────────────────
  function boot() {
    FHEEngine.initUI();
    if (typeof FHEEngine.initBannerFramerReel === 'function') {
      FHEEngine.initBannerFramerReel();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  setInterval(function () {
    const calc = FHEEngine.calculateDelivery();
    document.querySelectorAll('.fhe-calculated-cutoff-timer').forEach(el => {
      el.textContent = `${calc.hoursLeft} Hr ${calc.minsLeft} Min remaining for order cutoff for delivery on ${calc.deliveryDateStr}`;
    });
  }, 60000);

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.fhe-continue-shopping-btn');
    if (btn) {
      e.preventDefault();
      const cartDrawer = document.querySelector('m-cart-drawer');
      if (cartDrawer && typeof cartDrawer.close === 'function') {
        cartDrawer.close();
      }
    }
  });

})();
