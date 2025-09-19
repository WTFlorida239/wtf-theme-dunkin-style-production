/* assets/enhanced-drink-builder.js
   WTF | Welcome To Florida — Enhanced Drink Builder
   - Works with sections/enhanced-drink-builder.liquid
   - Supports multiple instances on a page (unique section IDs)
   - No dependencies (vanilla JS)
*/

(function () {
  'use strict';

  // -------- Money formatting --------
  function formatMoney(cents) {
    // Try Shopify currency if available, else USD, else "$"
    const code =
      (window.Shopify &&
        window.Shopify.currency &&
        (window.Shopify.currency.active || window.Shopify.currency)) ||
      null;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code || 'USD',
        minimumFractionDigits: 2
      }).format((cents || 0) / 100);
    } catch (e) {
      const val = ((cents || 0) / 100).toFixed(2);
      return '$' + val;
    }
  }

  // -------- Section initializer --------
  function initEnhancedDrinkBuilder(root) {
    if (!root || root.dataset.wtfDbInited === '1') return;
    root.dataset.wtfDbInited = '1';

    const payloadEl = root.querySelector('script[data-variants]');
    if (!payloadEl) return; // nothing to do if no product payload
    let payload = null;
    try {
      payload = JSON.parse(payloadEl.textContent || '{}');
    } catch (e) {
      console.warn('WTF Drink Builder: invalid variants payload', e);
      return;
    }

    const sizeIndex = typeof payload.sizeIndex === 'number' ? payload.sizeIndex : 0;
    const variants = Array.isArray(payload.variants) ? payload.variants : [];

    // Key elements
    const form = root.querySelector('form[id^="wtf-product-form-"]');
    if (!form) return;

    const priceEl = root.querySelector('.wtf-db__price');
    const upsellEl = root.querySelector('.wtf-db__upsell');

    const sizeInputs = root.querySelectorAll('input[name="options[Size]"]');
    const idInput = form.querySelector('input[name="id"]');

    const flavorCatRadios = root.querySelectorAll('input[name="flavor_category_choice"]');
    const flavorSelectWrap = root.querySelector('.wtf-db__flavor-select-wrap');
    const flavorSelect = root.querySelector('#' + (flavorSelectWrap?.querySelector('select')?.id || ''));
    const flavorCatProp = form.querySelector('input[name="properties[Flavor Category]"]');
    const flavorProp = form.querySelector('input[name="properties[Flavor]"]');

    const boostersChecks = root.querySelectorAll('.wtf-boosters');
    const sweetenersChecks = root.querySelectorAll('.wtf-sweeteners');
    const creamersChecks = root.querySelectorAll('.wtf-creamers');
    const boostersProp = form.querySelector('input[name="properties[Boosters]"]');
    const sweetenersProp = form.querySelector('input[name="properties[Sweeteners]"]');
    const creamersProp = form.querySelector('input[name="properties[Creamers]"]');

    const thcWrap = root.querySelector('[data-thc-wrap]');
    const thcSelect = thcWrap ? thcWrap.querySelector('select') : null;
    const thcProp = form.querySelector('input[name="properties[THC Concentration]"]');

    const staffMsg = root.querySelector('[data-staff-msg]');
    const productKind = (root.querySelector('.wtf-db')?.getAttribute('data-product-kind') || 'kratom').toLowerCase();

    // ----- Helpers -----
    function getCurrentSize() {
      const r = Array.from(sizeInputs).find(i => i.checked);
      return r ? r.value : null;
    }

    function getVariantForSize(sizeValue) {
      if (!variants.length) return null;
      for (const v of variants) {
        if (sizeIndex >= 0 && v.options && v.options[sizeIndex] === sizeValue) {
          return v;
        }
      }
      // fallback
      return variants[0];
    }

    function priceForSize(sizeValue) {
      const v = getVariantForSize(sizeValue);
      return v ? v.price : null;
    }

    function filterFlavorOptions(categorySlug) {
      if (!flavorSelect) return;
      // Reset selection
      flavorSelect.value = '';
      const opts = flavorSelect.querySelectorAll('option[data-cat]');
      opts.forEach(opt => {
        const show = opt.getAttribute('data-cat') === categorySlug;
        opt.hidden = !show;
      });
    }

    function syncChecksToHidden(selector, hiddenInput) {
      if (!hiddenInput) return;
      const vals = Array.from(root.querySelectorAll(selector + ':checked')).map(i => i.value);
      hiddenInput.value = vals.join(', ');
    }

    function syncAllProperties() {
      syncChecksToHidden('.wtf-boosters', boostersProp);
      syncChecksToHidden('.wtf-sweeteners', sweetenersProp);
      syncChecksToHidden('.wtf-creamers', creamersProp);
      if (thcProp && thcSelect) thcProp.value = thcSelect.value || '';
    }

    // ----- UI update (price, upsell, gallon logic) -----
    function updateUI() {
      const size = getCurrentSize();
      const v = size ? getVariantForSize(size) : variants[0];
      if (!v) return;

      // Variant id + price
      if (idInput) idInput.value = v.id;
      if (priceEl) priceEl.textContent = formatMoney(v.price);

      // Upsell
      if (upsellEl) {
        let msg = '';
        const sizeLower = (size || '').toLowerCase();
        if (sizeLower === 'medium') {
          const pM = v.price;
          const pL = priceForSize('Large');
          if (pL && pL > pM) msg = 'Upgrade to Large for ' + formatMoney(pL - pM) + ' more';
        } else if (sizeLower === 'large') {
          const pL = v.price;
          const pG = priceForSize('Gallon');
          if (pG && pG > pL) msg = 'Upgrade to Gallon for ' + formatMoney(pG - pL) + ' more';
        }
        upsellEl.textContent = msg;
      }

      // Gallon logic
      const isGallon = ((size || '') + '').toLowerCase() === 'gallon';
      const isDelta9 = productKind === 'delta9';

      if (isGallon && !isDelta9) {
        // Kratom/Kava Gallon: hide flavor picker, show staff message, clear THC
        if (flavorSelectWrap) flavorSelectWrap.style.display = 'none';
        if (staffMsg) staffMsg.style.display = 'block';
        if (thcWrap) thcWrap.style.display = 'none';
        if (thcProp) thcProp.value = '';
        if (flavorProp) flavorProp.value = 'Discuss with staff';
      } else {
        if (flavorSelectWrap) flavorSelectWrap.style.display = '';
        if (staffMsg) staffMsg.style.display = 'none';
        if (isGallon && isDelta9) {
          if (thcWrap) thcWrap.style.display = '';
        } else {
          if (thcWrap) thcWrap.style.display = 'none';
          if (thcProp) thcProp.value = '';
        }
      }
    }

    // ----- Wire events -----
    // Default flavor category = sugar-free
    filterFlavorOptions('sugar-free');

    Array.from(sizeInputs).forEach(r => r.addEventListener('change', updateUI));

    Array.from(flavorCatRadios).forEach(r => {
      r.addEventListener('change', (e) => {
        const cat = e.target.value; // 'sugar-free' | 'regular'
        const pretty = (cat === 'sugar-free') ? 'Sugar-free' : 'Regular';
        filterFlavorOptions(cat);
        if (flavorCatProp) flavorCatProp.value = pretty;
        if (flavorProp) flavorProp.value = '';
      });
    });

    if (flavorSelect) {
      flavorSelect.addEventListener('change', () => {
        if (flavorProp) flavorProp.value = flavorSelect.value || '';
      });
    }

    Array.from(boostersChecks).forEach(c => c.addEventListener('change', syncAllProperties));
    Array.from(sweetenersChecks).forEach(c => c.addEventListener('change', syncAllProperties));
    Array.from(creamersChecks).forEach(c => c.addEventListener('change', syncAllProperties));
    if (thcSelect) thcSelect.addEventListener('change', syncAllProperties);

    form.addEventListener('submit', () => {
      // Make sure all hidden property fields are up to date before submit
      syncAllProperties();
      if (flavorSelect && flavorSelectWrap && flavorSelectWrap.style.display !== 'none') {
        if (flavorProp && !flavorProp.value) flavorProp.value = flavorSelect.value || '';
      }
    }, { capture: true });

    // Initial paint
    updateUI();
  }

  // -------- Auto-init on load & theme editor events --------
  function initAll() {
    document
      .querySelectorAll('[id^="enhanced-drink-builder-"]')
      .forEach(initEnhancedDrinkBuilder);
  }

  document.addEventListener('DOMContentLoaded', initAll);

  // Shopify Theme Editor support
  document.addEventListener('shopify:section:load', function (e) {
    if (!e || !e.target) return;
    const roots = e.target.querySelectorAll('[id^="enhanced-drink-builder-"]');
    roots.forEach(initEnhancedDrinkBuilder);
  });
})();
