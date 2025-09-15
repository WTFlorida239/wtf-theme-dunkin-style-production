/* WTF Variant Resolver - canonical, lightweight, no deps
   Requirements:
   - Buttons (or any clickable) with data-option="<OptionName>" and data-value="<Value>"
   - ONE <input type="hidden" name="id"> inside the purchase form
   - (Optional) <input name="quantity"> (defaults to 1 if omitted)
   - Works on product pages (uses {{ product | json }}) and custom pages:
       - window.WTF_PRODUCT_HANDLE = 'handle' OR
       - window.WTF_PRODUCT_JSON = { ...product json... }
*/
(function () {
  const STATE = {
    product: null,
    options: [], // [{name, position, values[]}]
    selection: {}, // { 'Size': 'Large', ... }
    form: null,
    idInput: null,
  };

  function $(s, c) {
    return (c || document).querySelector(s);
  }
  function $all(s, c) {
    return Array.from((c || document).querySelectorAll(s));
  }

  async function loadProductJSON() {
    if (window.WTF_PRODUCT_JSON) return window.WTF_PRODUCT_JSON;
    if (window.productJson) return window.productJson; // some themes expose this
    if (window.ProductJson) return window.ProductJson;

    if (window.WTF_PRODUCT_HANDLE) {
      const res = await fetch(`/products/${window.WTF_PRODUCT_HANDLE}.js`);
      if (!res.ok) throw new Error("Failed to load product JSON");
      return await res.json();
    }

    // Last resort: look for an embedded JSON script tag
    const script = $('script[type="application/json"][data-product-json]');
    if (script) return JSON.parse(script.textContent);

    throw new Error(
      "No product JSON available. Provide WTF_PRODUCT_JSON or WTF_PRODUCT_HANDLE."
    );
  }

  function findVariant(product, selection) {
    // Build selection array in product.options order
    const optionOrder = product.options || [];
    const picked = optionOrder.map((name) => selection[name] || null);

    // Match a variant whose option1..optionN equal the picked values
    return (
      (product.variants || []).find((v) => {
        const arr = [v.option1, v.option2, v.option3].filter(
          (x) => x !== undefined
        );
        if (arr.length !== picked.length) return false;
        for (let i = 0; i < arr.length; i++) {
          if (!picked[i] || arr[i] !== picked[i]) return false;
        }
        return v.available !== false; // prefer available variant
      }) || (product.variants || [])[0]
    ); // fallback: first variant
  }

  function updateActiveChips() {
    // Visually mark active choices
    $all("[data-option][data-value]", STATE.form).forEach((btn) => {
      const name = btn.getAttribute("data-option");
      const value = btn.getAttribute("data-value");
      const on = STATE.selection[name] === value;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.classList.toggle("wtf-chip--active", on);
    });
  }

  function setVariantId(variant) {
    if (!STATE.idInput) return;
    STATE.idInput.value = variant && variant.id ? variant.id : "";
    const evt = new CustomEvent("wtf:variant:change", { detail: { variant } });
    document.dispatchEvent(evt);
  }

  function onChipClick(e) {
    const t = e.currentTarget;
    const name = t.getAttribute("data-option");
    const value = t.getAttribute("data-value");
    if (!name || !value) return;

    // Toggle selection to this value (radio-like)
    STATE.selection[name] = value;
    updateActiveChips();

    const variant = findVariant(STATE.product, STATE.selection);
    setVariantId(variant);
  }

  function wireChips() {
    $all("[data-option][data-value]", STATE.form).forEach((btn) => {
      btn.setAttribute("role", "radio");
      btn.setAttribute("tabindex", "0");
      btn.addEventListener("click", onChipClick);
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChipClick(e);
        }
      });
    });
  }

  async function init() {
    // Find the purchase form (the one with data-wtf-ajax or a likely product form)
    STATE.form = $("[data-wtf-ajax]") || $('form[action*="/cart/add"]');
    if (!STATE.form) return;

    STATE.idInput = STATE.form.querySelector('input[name="id"]');
    if (!STATE.idInput) {
      // Create it if missing
      STATE.idInput = document.createElement("input");
      STATE.idInput.type = "hidden";
      STATE.idInput.name = "id";
      STATE.form.appendChild(STATE.idInput);
    }

    try {
      STATE.product = await loadProductJSON();
    } catch (err) {
      console.warn("[wtf-variants] " + err.message);
      return;
    }

    // Initialize selection from any pre-marked .wtf-chip--active or first value per option
    const optionNames = STATE.product.options || [];
    optionNames.forEach((name) => {
      const active = STATE.form.querySelector(
        `[data-option="${name}"].wtf-chip--active`
      );
      if (active) {
        STATE.selection[name] = active.getAttribute("data-value");
      } else {
        // default to first available chip value if present
        const first = STATE.form.querySelector(
          `[data-option="${name}"][data-value]`
        );
        if (first) STATE.selection[name] = first.getAttribute("data-value");
      }
    });

    wireChips();
    updateActiveChips();

    const variant = findVariant(STATE.product, STATE.selection);
    setVariantId(variant);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
