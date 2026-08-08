/**
 * KWIKMEAL FRESH HEAT-N-EAT CORE ENGINE
 * Handles ZIP code validation, weekly cutoff & delivery calculation,
 * multi-addon checkboxes, quantity adjusters, search, sorting, and AJAX cart submission.
 */

(function () {
  'use strict';

  window.FHEEngine = window.FHEEngine || {};

  const DEFAULT_CONFIG = {
    cutoffDay: 'Sunday',     // e.g. Sunday
    cutoffTime: '11:59 PM',  // e.g. 11:59 PM
    deliveryDay: 'Friday',   // e.g. Friday
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
    const config = FHEEngine.getConfig();
    const now = new Date();

    const cutoffDayNum = DAYS_MAP[config.cutoffDay.toLowerCase()] ?? 0;
    const deliveryDayNum = DAYS_MAP[config.deliveryDay.toLowerCase()] ?? 5;

    // Parse cutoff time e.g. "11:59 PM"
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
      cutoffDateStr: `${DAY_NAMES[nextCutoff.getDay()]}, ${MONTH_NAMES[nextCutoff.getMonth()]} ${nextCutoff.getDate()}`,
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

    // Update countdown timers with delivery date
    document.querySelectorAll('.fhe-calculated-cutoff-timer').forEach(el => {
      el.textContent = `${calc.hoursLeft} Hr ${calc.minsLeft} Min remaining for order cutoff for delivery on ${calc.deliveryDateStr}`;
    });

    // Update dynamic cutoff deadline elements (Step 3)
    document.querySelectorAll('.fhe-calculated-cutoff-deadline').forEach(el => {
      el.innerHTML = `Order before ${calc.cutoffDateStr} (${calc.cutoffTime})<br>for ${calc.deliveryDateStr} Delivery`;
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

    // Realtime Add-on & Quantity Price Engine
    function updateCardPrice(card) {
      const basePrice = parseFloat(card.dataset.basePrice || card.dataset.price || 0);
      const priceElem = card.querySelector('.fhe-meal-card__price, .fhe-pdp-price');
      const qtyInput = card.querySelector('.fhe-qty-input, input[name="quantity"]');
      const qty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
      const checkboxes = card.querySelectorAll('.fhe-addon-checkbox');

      let addOnTotal = 0;
      checkboxes.forEach(cb => {
        if (cb.checked) {
          addOnTotal += parseFloat(cb.dataset.price || 0);
        }
      });

      const unitPrice = basePrice + addOnTotal;
      const totalPrice = unitPrice * qty;
      if (priceElem) {
        priceElem.textContent = '$' + totalPrice.toFixed(2);
      }
    }

    function syncQty(container, value) {
      container.querySelectorAll('.fhe-qty-input, input[name="quantity"]').forEach(input => {
        if(input.value !== value) input.value = value;
      });
    }

    // Quantity +/- picker handlers
    document.querySelectorAll('.fhe-qty-picker').forEach(picker => {
      const minusBtn = picker.querySelector('.fhe-qty-btn--minus');
      const plusBtn = picker.querySelector('.fhe-qty-btn--plus');
      const qtyInput = picker.querySelector('.fhe-qty-input, input[name="quantity"]');
      const container = picker.closest('.fhe-meal-card, .fhe-product-info, #fhe-meal-modal') || document;

      if (minusBtn && qtyInput) {
        minusBtn.addEventListener('click', function () {
          let currentVal = parseInt(qtyInput.value, 10) || 1;
          if (currentVal > 1) {
            qtyInput.value = currentVal - 1;
            syncQty(container, qtyInput.value);
            updateCardPrice(container);
          }
        });
      }

      if (plusBtn && qtyInput) {
        plusBtn.addEventListener('click', function () {
          let currentVal = parseInt(qtyInput.value, 10) || 1;
          qtyInput.value = currentVal + 1;
          syncQty(container, qtyInput.value);
          updateCardPrice(container);
        });
      }

      if (qtyInput) {
        qtyInput.addEventListener('input', function () {
          syncQty(container, qtyInput.value);
          updateCardPrice(container);
        });
      }
    });

    // Add-on checkboxes handler (Updates hidden input & triggers price calculation)
    document.querySelectorAll('.fhe-meal-card, .fhe-product-info').forEach(card => {
      const checkboxes = card.querySelectorAll('.fhe-addon-checkbox');
      const hiddenInput = card.querySelector('.fhe-addon-hidden-input');

      checkboxes.forEach(cb => {
        cb.addEventListener('change', function () {
          const selected = Array.from(checkboxes)
            .filter(c => c.checked)
            .map(c => c.value);

          if (hiddenInput) {
            hiddenInput.value = selected.length > 0 ? selected.join(', ') : 'None';
          }
          updateCardPrice(card);
        });
      });

      // Initial price calculation on page load
      updateCardPrice(card);
    });

    // Helper to resolve real Variant ID for an add-on checkbox
    const addonVariantCache = {};
    async function resolveAddonVariantId(cb) {
      let rawId = (cb.dataset.variantId || '').trim();
      const rawTitle = cb.dataset.title || cb.value || '';
      const handle = rawTitle.split('(')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      if (!handle) return rawId;

      if (addonVariantCache[handle]) {
        return addonVariantCache[handle];
      }

      // Try fetching product JSON to get variants[0].id
      try {
        const res = await fetch('/products/' + handle + '.js');
        if (res.ok) {
          const prodData = await res.json();
          if (prodData && prodData.variants && prodData.variants.length > 0) {
            const realVariantId = String(prodData.variants[0].id);
            addonVariantCache[handle] = realVariantId;
            cb.dataset.variantId = realVariantId;
            return realVariantId;
          }
        }
      } catch (err) {
        console.warn('Add-on variant resolution fallback for:', handle, err);
      }

      return rawId;
    }

    // AJAX Form submission logic with Multi-Item Payload & Cart Drawer Refresh
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

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const card = form.closest('.fhe-meal-card, .fhe-product-info') || form.parentElement;
        const submitBtn = form.querySelector('button[type="submit"]');
        const variantInput = form.querySelector('input[name="id"]');
        const qtyInput = form.querySelector('input[name="quantity"]');
        const quantity = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('is-loading');
        }

        const mealVariantId = variantInput ? variantInput.value : 'demo-variant-1';
        const selectedAddons = [];
        const items = [];

        // Collect checked add-on variants asynchronously
        const checkboxes = card ? Array.from(card.querySelectorAll('.fhe-addon-checkbox:checked')) : [];
        for (const cb of checkboxes) {
          const addonTitle = cb.dataset.title || cb.value;
          selectedAddons.push(addonTitle);

          const resolvedVariantId = await resolveAddonVariantId(cb);
          if (resolvedVariantId && !resolvedVariantId.startsWith('demo')) {
            items.push({
              id: resolvedVariantId,
              quantity: quantity
            });
          }
        }

        // Main meal variant item
        const mainItem = {
          id: mealVariantId,
          quantity: quantity,
          properties: {
            'Add-ons': selectedAddons.length > 0 ? selectedAddons.join(', ') : 'None',
            'Expected Delivery Date': calc.deliveryDateStr,
            'Delivery Week': calc.weekLabel
          }
        };
        items.unshift(mainItem);

        // Function to handle cart UI update after success
        const handleCartSuccess = () => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
          }

          const mealTitle = card ? (card.querySelector('.fhe-meal-card__title, h1, h2, h3')?.textContent || 'Meal') : 'Meal';
          FHEEngine.showToast(`Added ${quantity} ${mealTitle} to your order!`);

          const cartDrawer = document.querySelector('m-cart-drawer');
          if (cartDrawer) {
            if (typeof cartDrawer.onCartDrawerUpdate === 'function') {
              cartDrawer.onCartDrawerUpdate();
            }
            if (typeof cartDrawer.open === 'function') {
              cartDrawer.open();
            }
          } else {
            fetch('/cart.js')
              .then(res => res.json())
              .then(cart => {
                document.querySelectorAll('.m-cart-count-bubble, .cart-count, .cart-count-bubble').forEach(el => {
                  el.textContent = cart.item_count;
                  el.classList.remove('m:hidden', 'hidden');
                });
              });
          }
        };

        // Submit via AJAX /cart/add.js
        try {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ items: items })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw errData;
          }

          handleCartSuccess();
        } catch (error) {
          console.warn('Primary multi-item cart add failed, attempting fallback:', error);

          // Fallback: If add-on variant failed, try adding just the main meal
          if (items.length > 1) {
            try {
              const fallbackResponse = await fetch('/cart/add.js', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({ items: [mainItem] })
              });

              if (fallbackResponse.ok) {
                handleCartSuccess();
                return;
              }
            } catch (fallbackErr) {
              console.error('Fallback cart add failed:', fallbackErr);
            }
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
          }

          const errMessage = error.description || error.message || 'Could not add item to cart';
          if (mealVariantId.toString().includes('demo')) {
            const mealTitle = card ? (card.querySelector('.fhe-meal-card__title')?.textContent || 'Meal') : 'Meal';
            FHEEngine.showToast(`Added ${quantity} ${mealTitle} to your draft order!`);

            const cartDrawer = document.querySelector('m-cart-drawer');
            if (cartDrawer && typeof cartDrawer.open === 'function') {
              cartDrawer.open();
            }
          } else {
            FHEEngine.showToast(errMessage, true);
          }
        }
      });
    });

    // Quick View Meal Details Modal Controller
    (function initMealModal() {
      const modal = document.querySelector('#fhe-meal-modal');
      if (!modal) return;

      const closeBtn = modal.querySelector('.fhe-modal-close');
      const modalImg = modal.querySelector('#fhe-modal-img');
      const modalTitle = modal.querySelector('#fhe-modal-title');
      const modalDesc = modal.querySelector('#fhe-modal-desc');
      const modalMacros = modal.querySelector('#fhe-modal-macros');
      const modalIngredients = modal.querySelector('#fhe-modal-ingredients');
      const modalVariantInput = modal.querySelector('#fhe-modal-variant-id');
      const modalAddons = modal.querySelector('#fhe-modal-addons');

      const ingredientsMap = {
        'demo-1': 'Boneless chicken breast, aged basmati rice, tomato puree, butter, cream, onions, garlic, ginger, garam masala, fenugreek, fresh coriander.',
        'demo-2': 'Artisanal cottage cheese (paneer), jeera basmati rice, bell peppers, onion, tomato gravy, yogurt, cumin, turmeric, garlic, ginger.',
        'demo-3': 'Durum wheat penne pasta, grilled chicken breast, broccoli florets, heavy cream, parmesan cheese, minced garlic, extra virgin olive oil, parsley.',
        'demo-4': 'Herb-marinated grilled chicken breast, organic quinoa, roasted sweet potatoes, green beans, extra virgin olive oil, lemon herb dressing.',
        'demo-5': 'Glazed tender chicken thighs, steamed jasmine rice, broccoli florets, julienne carrots, sesame seeds, teriyaki reduction sauce.',
        'demo-6': 'Crispy chickpea falafel, saffron basmati rice, English cucumber, cherry tomatoes, house tahini sauce, hummus, fresh parsley.',
        'demo-7': 'Tender chicken breast, coconut milk, green curry paste, bamboo shoots, Thai basil, red bell pepper, jasmine rice.',
        'demo-8': 'Cilantro lime rice, seasoned black beans, sweet corn salsa, sauted bell peppers, pico de gallo, lime dressing.',
        'demo-9': 'Smokey BBQ marinated chicken breast, roasted Yukon gold potatoes, sweet corn, honey barbecue glaze.',
        'demo-10': 'Seasoned rice, sauted bell peppers & onions, black beans, shredded jack cheese, salsa verde.',
        'demo-11': 'Double grilled chicken breast, romaine & baby spinach, hard-boiled egg, cherry tomatoes, cucumbers, house vinaigrette.',
        'demo-12': 'Paneer tikka curry, Dal makhani, cumin basmati rice, 2 whole wheat rotis, sweet gulab jamun.'
      };

      function openModal(card) {
        const productUrl = card.dataset.productUrl;
        if (productUrl && productUrl !== '#' && productUrl !== '') {
          window.location.href = productUrl;
          return;
        }

        const productId = card.dataset.productId || 'demo-1';
        const title = card.querySelector('.fhe-meal-card__title')?.textContent?.trim() || '';
        const desc = card.querySelector('.fhe-meal-card__desc')?.textContent?.trim() || '';
        const imgSrc = card.querySelector('.fhe-meal-card__img')?.src || '';
        const macrosHtml = card.querySelector('.fhe-meal-card__macros')?.innerHTML || '';
        const variantId = card.querySelector('input[name="id"]')?.value || 'demo-variant-1';
        const basePrice = card.dataset.basePrice || card.dataset.price || '13.99';

        if (modalImg) modalImg.src = imgSrc;
        if (modalTitle) modalTitle.textContent = title;
        if (modalDesc) modalDesc.textContent = desc;
        if (modalMacros) modalMacros.innerHTML = macrosHtml;
        if (modalVariantInput) modalVariantInput.value = variantId;
        if (modalIngredients) {
          modalIngredients.textContent = card.dataset.ingredients || ingredientsMap[productId] || 'Fresh chef-selected ingredients, premium spices, and quality seasonings.';
        }

        if (modalAddons) {
          modalAddons.innerHTML = '';
          const cardAddons = card.querySelectorAll('.fhe-addon-checkbox-item');
          cardAddons.forEach(item => {
            const clone = item.cloneNode(true);
            modalAddons.appendChild(clone);
          });
        }

        const qtyInput = modal.querySelector('.fhe-qty-input');
        if (qtyInput) qtyInput.value = 1;

        modal.dataset.basePrice = basePrice;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        updateCardPrice(modal);
      }

      function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });

      document.querySelectorAll('.fhe-meal-card').forEach(card => {
        const mediaLink = card.querySelector('.fhe-meal-card__media a');
        const titleLink = card.querySelector('.fhe-meal-card__title a');

        [mediaLink, titleLink].forEach(link => {
          if (link) {
            link.addEventListener('click', function (e) {
              const href = link.getAttribute('href');
              if (!href || href === '#' || href === 'javascript:void(0)') {
                e.preventDefault();
                openModal(card);
              }
            });
          }
        });
      });
    })();

    // Accordion FAQ handler
    document.querySelectorAll('.fhe-faq-question').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.parentElement;
        item.classList.toggle('is-open');
        const isOpen = item.classList.contains('is-open');
        this.setAttribute('aria-expanded', isOpen);
      });
    });

    // Search & Filter & Sort handlers
    const searchInput = document.querySelector('.fhe-menu-search-input');
    const sortSelect = document.querySelector('.fhe-menu-sort-select');

    function filterAndSortMeals() {
      const activeFilter = (document.querySelector('.fhe-filter-btn.is-active')?.getAttribute('data-filter') || 'all').toLowerCase();
      const searchQuery = (searchInput?.value || '').trim().toLowerCase();
      const sortValue = sortSelect?.value || 'default';

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

      // Sorting
      if (sortValue === 'price-asc') {
        cards.sort((a, b) => (parseFloat(a.getAttribute('data-price') || 0)) - (parseFloat(b.getAttribute('data-price') || 0)));
      } else if (sortValue === 'price-desc') {
        cards.sort((a, b) => (parseFloat(b.getAttribute('data-price') || 0)) - (parseFloat(a.getAttribute('data-price') || 0)));
      } else if (sortValue === 'calories') {
        cards.sort((a, b) => (parseInt(a.getAttribute('data-calories') || 0, 10)) - (parseInt(b.getAttribute('data-calories') || 0, 10)));
      }

      cards.forEach(card => grid.appendChild(card));
    }

    if (searchInput) {
      searchInput.addEventListener('input', filterAndSortMeals);
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', filterAndSortMeals);
    }

    // Dietary Filter pills handler
    document.querySelectorAll('.fhe-filter-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.fhe-filter-btn').forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');
        filterAndSortMeals();
      });
    });

    // Initialize Banner Framer Motion Reel
    if (typeof FHEEngine.initBannerFramerReel === 'function') {
      FHEEngine.initBannerFramerReel();
    }
  };

  // Framer Motion Infinite Reel Engine
  FHEEngine.initBannerFramerReel = function () {
    const reelCard = document.querySelector('.fhe-framer-reel-card');
    if (!reelCard) return;
    if (reelCard.dataset.initialized === 'true') return;
    reelCard.dataset.initialized = 'true';

    const track = reelCard.querySelector('.fhe-framer-track');
    const tabs = reelCard.querySelectorAll('.fhe-framer-tab');
    if (!track) return;

    // Save original items
    const originalItems = Array.from(track.children);

    function setupLoop(filterCategory = 'all') {
      track.innerHTML = '';
      
      let itemsToUse = originalItems;
      if (filterCategory !== 'all') {
        itemsToUse = originalItems.filter(item => item.dataset.category === filterCategory);
      }

      if (itemsToUse.length === 0) return;

      itemsToUse.forEach(item => track.appendChild(item.cloneNode(true)));
    }

    setupLoop('all');

    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        tabs.forEach(t => t.classList.remove('is-active'));
        this.classList.add('is-active');
        const filter = this.dataset.framerFilter || 'all';
        setupLoop(filter);
      });
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    FHEEngine.initUI();
    // Auto-refresh countdown every 60 seconds
    setInterval(FHEEngine.initUI, 60000);
  });
})();

