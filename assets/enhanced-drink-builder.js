(function () {
  const sel = (q, el = document) => el.querySelector(q);
  const selAll = (q, el = document) => Array.from(el.querySelectorAll(q));

  /**
   * Helper: Submits a form to /cart/add.js, handles errors, and dispatches events.
   * @param {HTMLFormElement} form - The product form to submit.
   * @returns {Promise<object>} - A promise that resolves with the fresh cart object.
   */
  async function addToCartAjax(form) {
    const formData = new FormData(form);
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });

    if (!res.ok) {
      let msg = "Could not add to cart.";
      try {
        const err = await res.json();
        msg = err?.description || msg;
      } catch (e) {}
      const errEl = form.querySelector("[data-product-form-error]");
      if (errEl) {
        errEl.textContent = msg;
        errEl.hidden = false;
      }
      window.dispatchEvent(
        new CustomEvent("cart:add:error", { detail: { message: msg } })
      );
      throw new Error(msg);
    }

    const added = await res.json();
    window.dispatchEvent(
      new CustomEvent("cart:add:success", { detail: { item: added } })
    );

    // Get fresh cart and emit a global event for other scripts (like a cart drawer) to listen to.
    const cartRes = await fetch("/cart.js");
    const cart = await cartRes.json();
    window.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart } }));
    return cart;
  }

  /**
   * Dispatches a global event to signal that the cart drawer should open.
   */
  function openDrawer() {
    window.dispatchEvent(new CustomEvent("cart:drawer:open"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = sel("#enhanced-drink-builder");
    if (!root) return;

    // Core builder elements
    const form = sel("[data-product-form]", root);
    const priceEl = sel("#builder-price", root);
    const upsellEl = sel("#builder-upsell", root);
    const variantId = sel("#builder-variant-id", root);
    const sizeRadios = selAll('input[name="size"]', root);
    const strains = selAll('input[name="strain"]', root);
    const thcFieldset = sel("#thc-fieldset", root);
    const gallonNote = sel("#gallon-note", root);
    const addToCartBtn = sel("#builder-add", form) || sel('button[type="submit"]', form); // AJAX button
    const errorRegion = sel("[data-product-form-error]", form); // AJAX error region

    const prop = {
      size: sel("#prop-size", root),
      strain: sel("#prop-strain", root),
      thc: sel("#prop-thc", root),
      flavors: sel("#prop-flavors", root),
      flavorCategory: sel("#prop-flavor-category", root),
      pumpDetail: sel("#prop-pumps", root),
      boosters: sel("#prop-boosters", root),
      sweeteners: sel("#prop-sweeteners", root),
      creamers: sel("#prop-creamers", root),
    };

    // Variant data from the page
    const varData = JSON.parse(
      sel(`#builder-variants-${root.dataset.productId || ""}`)?.textContent ||
        "[]"
    );

    // Pump meta from the page
    const pumpMeta = sel("#pump-meta", root);
    const EXTRA_PRICE = Number(pumpMeta?.dataset.extra || 0.5);
    const MAX_FLAVORS = Number(pumpMeta?.dataset.maxflavors || 3);

    // Helpers
    const getSelectedSize = () => sizeRadios.find((r) => r.checked);
    const findVariantByTitle = (title) =>
      varData.find(
        (v) => String(v.title).toLowerCase() === String(title).toLowerCase()
      );
    const money = (n) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: Shopify.currency.active,
        }).format(n);
      } catch {
        return `$${n.toFixed(2)}`;
      }
    };

    function updateSize() {
      const s = getSelectedSize();
      if (!s) return;
      prop.size.value = s.value;

      const v = findVariantByTitle(s.value);
      if (v) {
        variantId.value = v.id;
        priceEl.textContent = money(v.price / 100);
        const isGallon = /gallon/i.test(s.value);
        gallonNote.hidden = !isGallon;
        if (thcFieldset) thcFieldset.hidden = !isGallon;
      }

      const sizes = ["Medium", "Large", "Gallon"];
      const idx = sizes.findIndex(
        (x) => x.toLowerCase() === s.value.toLowerCase()
      );
      const next = sizes[idx + 1] ? findVariantByTitle(sizes[idx + 1]) : null;
      if (next && v) {
        const diff = (next.price - v.price) / 100;
        upsellEl.textContent =
          diff > 0 ? `Upgrade to ${next.title} for ${money(diff)} more` : "";
      } else {
        upsellEl.textContent = "";
      }
    }

    function updateStrains() {
      const chosen = strains.filter((c) => c.checked).map((c) => c.value);
      if (chosen.length > 2) {
        const last = strains.findLast((c) => c.checked);
        if (last) last.checked = false;
        return updateStrains();
      }
      prop.strain.value = chosen.join(" + ");
    }

    function readFlavors() {
      const flavorRows = selAll("[data-flavor-row]", root);
      const picked = [];
      const catSet = new Set();
      let totalPumps = 0;

      for (const row of flavorRows) {
        const box = sel('input[type="checkbox"]', row);
        const name = box?.value;
        const cat = row.dataset.category || "Regular";
        const qty = Number(sel('input[type="number"]', row)?.value || 0);
        if (box?.checked && qty > 0) {
          picked.push(`${name} (${qty} pump${qty > 1 ? "s" : ""})`);
          catSet.add(cat);
          totalPumps += qty;
        }
      }

      const s = getSelectedSize();
      const sizeIncluded = /medium/i.test(s.value)
        ? 4
        : /large/i.test(s.value)
        ? 6
        : 12;
      const extra = Math.max(0, totalPumps - sizeIncluded);
      const v = findVariantByTitle(s.value);

      if (v) {
        const base = v.price / 100;
        const total = base + extra * EXTRA_PRICE;
        priceEl.textContent = money(total);
      }

      if (picked.length > MAX_FLAVORS) {
        const last = flavorRows.findLast(
          (r) => sel('input[type="checkbox"]', r)?.checked
        );
        if (last) {
          sel('input[type="checkbox"]', last).checked = false;
          sel('input[type="number"]', last).value = 0;
          return readFlavors();
        }
      }

      prop.flavors.value = picked.join(", ");
      prop.flavorCategory.value = Array.from(catSet).join(", ");
      prop.pumpDetail.value = `Total pumps: ${totalPumps} (Included ${sizeIncluded}, Extra ${extra} @ ${money(
        EXTRA_PRICE
      )} ea)`;
    }

    function collectGroup(name, target) {
      const vals = selAll(`input[name="${name}"]`, root)
        .filter((i) => i.checked)
        .map((i) => i.value);
      target.value = vals.join(", ");
    }

    // --- Wire events for UI changes ---
    sizeRadios.forEach((r) =>
      r.addEventListener("change", () => {
        updateSize();
        readFlavors();
      })
    );
    strains.forEach((c) => c.addEventListener("change", updateStrains));
    ["booster", "sweetener", "creamer"].forEach((group) => {
      selAll(`input[name="${group}"]`, root).forEach((c) =>
        c.addEventListener("change", () => {
          collectGroup("booster", prop.boosters);
          collectGroup("sweetener", prop.sweeteners);
          collectGroup("creamer", prop.creamers);
        })
      );
    });
    selAll('input[name="thc"]', root).forEach((r) =>
      r.addEventListener("change", () => (prop.thc.value = r.value))
    );
    root.addEventListener("change", (e) => {
      if (
        e.target.matches(
          '[data-flavor-row] input, [data-flavor-row] input[type="number"]'
        )
      ) {
        readFlavors();
      }
    });

    // --- Initialize UI state on page load ---
    updateSize();
    updateStrains();
    collectGroup("booster", prop.boosters);
    collectGroup("sweetener", prop.sweeteners);
    collectGroup("creamer", prop.creamers);

    // --- NEW: Handle form submission with AJAX ---
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Ensure the correct variant ID is set before submitting
      const s = getSelectedSize();
      const v = findVariantByTitle(s?.value);
      if (v) variantId.value = v.id;

      // Handle the AJAX request
      if (errorRegion) {
        errorRegion.textContent = "";
        errorRegion.hidden = true;
      }
      if (addToCartBtn) addToCartBtn.disabled = true;

      try {
        await addToCartAjax(form);
        openDrawer(); // Ask the theme to open the cart drawer
      } catch (err) {
        console.error(err);
      } finally {
        if (addToCartBtn) addToCartBtn.disabled = false;
      }
    });
  });
})();
