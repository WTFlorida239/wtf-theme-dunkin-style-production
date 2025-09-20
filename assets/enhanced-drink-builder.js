(() => {
  const dataEl = document.getElementById('wtf-drink-data');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent || '{}');

  // Utilities
  const money = (n) => (Number(n || 0)).toFixed(2);
  const byTitle = (title) => data.variants.find(v => (v.title || '').toLowerCase().includes(title.toLowerCase()));

  // Resolve size -> variant id
  function getVariantIdForSize(size) {
    const map = data.variantMap || {};
    if (map[size]) return map[size];

    // Fallback: try to find variant by title containing the size
    const guess = byTitle(size);
    return guess ? guess.id : (data.variants[0] && data.variants[0].id);
  }

  // State
  const state = {
    size: 'Medium',
    strain: null, // for kava/kratom products
    thcConcentration: null, // for D9 only
    flavorCategory: 'regular', // 'regular' | 'sugar-free'
    flavors: [], // [{name, pumps, category}]
    boosters: [],
    creamers: [],
    sweeteners: []
  };

  // DOM refs (IDs/classes expected in your section file)
  const els = {
    sizeRadios: document.querySelectorAll('[name="wtf-size"]'),
    strainSelect: document.querySelector('#wtf-strain'),
    flavorWrap: document.querySelector('#wtf-flavors'),
    d9Concentration: document.querySelector('#wtf-thc'),
    priceNow: document.querySelector('#wtf-price-now'),
    upsell: document.querySelector('#wtf-upsell'),
    addBtn: document.querySelector('#wtf-add-to-cart'),
    form: document.querySelector('#wtf-atc-form'),
  };

  // Pump limits & cost
  const limits = data.pumpLimits || { medium: 4, large: 6, gallon: 12 };
  const pumpCost = Number(data.pumpCost || 0);

  function sizeKey() {
    return (state.size || 'Medium').toLowerCase();
  }

  function maxPumps() {
    return limits[sizeKey()] || 0;
  }

  function totalPumps() {
    return state.flavors.reduce((s, f) => s + (Number(f.pumps) || 0), 0);
  }

  function isGallon() {
    return sizeKey() === 'gallon';
  }

  function isDelta9Product() {
    return (data.handle || '').includes('thc') || (data.title || '').toLowerCase().includes('delta');
  }

  function baseVariant() {
    return data.variants.find(v => v.id === getVariantIdForSize(state.size)) || data.variants[0];
  }

  // UI: gallon rules
  function applyGallonLogic() {
    if (isGallon()) {
      if (isDelta9Product()) {
        // D9 gallon: show flavors + THC concentration
        toggle(els.flavorWrap, true);
        toggle(els.d9Concentration, true);
      } else {
        // Kava/Kratom gallon: hide flavors and show staff note
        toggle(els.flavorWrap, false);
        toggle(els.d9Concentration, false);
        // Reset flavors on hide
        state.flavors = [];
      }
    } else {
      toggle(els.flavorWrap, true);
      toggle(els.d9Concentration, isDelta9Product());
    }
  }

  function toggle(el, on) { if (el) el.style.display = on ? '' : 'none'; }

  // Price calc
  function computePrice() {
    const v = baseVariant();
    const basePrice = Number(v?.price || 0);
    const pumpFee = totalPumps() * pumpCost;
    return basePrice + pumpFee;
  }

  // Upsell message (Large vs current)
  function computeUpsell() {
    if (state.size.toLowerCase() === 'large') return null;
    const largeId = getVariantIdForSize('Large');
    const large = data.variants.find(v => v.id === largeId);
    if (!large) return null;
    const delta = Number(large.price || 0) - Number(baseVariant()?.price || 0);
    if (delta <= 0) return null;
    return `Upgrade to Large for $${money(delta)} more`;
  }

  function renderPrice() {
    if (els.priceNow) els.priceNow.textContent = `$${money(computePrice())}`;
    const up = computeUpsell();
    if (els.upsell) els.upsell.textContent = up || '';
  }

  // Wire size inputs
  els.sizeRadios.forEach(r => {
    r.addEventListener('change', () => {
      state.size = r.value;
      applyGallonLogic();
      renderPrice();
    });
  });

  // Example: flavor pump +/– handlers (expects data-flavor attribute on buttons)
  document.body.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-flavor-inc]');
    const dec = e.target.closest('[data-flavor-dec]');
    if (!inc && !dec) return;

    const flavor = (inc || dec).getAttribute('data-flavor');
    if (!flavor) return;

    const idx = state.flavors.findIndex(f => f.name === flavor);
    if (idx === -1) state.flavors.push({ name: flavor, pumps: 0, category: state.flavorCategory });

    const current = state.flavors.find(f => f.name === flavor);
    const totalBefore = totalPumps();

    if (inc && totalBefore < maxPumps()) current.pumps++;
    if (dec && current.pumps > 0) current.pumps--;

    // Clean zero-pump entries
    state.flavors = state.flavors.filter(f => f.pumps > 0);
    renderPrice();
  });

  // Add to cart (AJAX)
  els.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = getVariantIdForSize(state.size);
    const props = {
      Size: state.size,
      Strain: state.strain || undefined,
      'Flavor category': state.flavorCategory,
      Flavors: state.flavors.map(f => `${f.name} (${f.pumps})`).join(', '),
      Boosters: state.boosters.join(', ') || undefined,
      Creamers: state.creamers.join(', ') || undefined,
      Sweeteners: state.sweeteners.join(', ') || undefined,
      'THC Concentration': isDelta9Product() ? (state.thcConcentration || '') : undefined,
      'Gallon Note': isGallon() && !isDelta9Product() ? 'Discuss flavor preferences with staff' : undefined
    };

    const body = new URLSearchParams();
    body.set('id', String(id));
    body.set('quantity', '1');
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === '') continue;
      body.append(`properties[${k}]`, v);
    }

    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (res.ok) {
      // Optional: open drawer, update count, etc.
      window.dispatchEvent(new CustomEvent('wtf:added-to-cart'));
    } else {
      console.error('Add to cart failed', await res.text());
      alert('Could not add to cart. Please try again.');
    }
  });

  // Initial paint
  state.size = (document.querySelector('[name="wtf-size"]:checked')?.value) || 'Medium';
  applyGallonLogic();
  renderPrice();
})();
