/* WTF AJAX Cart
   - Intercepts <form data-wtf-ajax> submits
   - Posts to /cart/add.js, updates cart count, dispatches 'wtf:cart:update'
   - If a cart drawer exists, you can listen for the event to refresh/open it
*/
(function () {
  function $(s, c) {
    return (c || document).querySelector(s);
  }

  async function getCart() {
    const res = await fetch("/cart.js", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Cart fetch failed");
    return await res.json();
  }

  function setCartCount(n) {
    const el = document.querySelector("[data-cart-count]");
    if (!el) return;
    const num = parseInt(n || 0, 10);
    el.textContent = num;
    el.hidden = num === 0;
  }

  async function addItem(form) {
    const data = new FormData(form);
    if (!data.get("quantity")) data.set("quantity", "1");

    const res = await fetch("/cart/add.js", {
      method: "POST",
      body: data,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      let msg = "Add to cart failed";
      try {
        const j = await res.json();
        msg = j.description || j.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const item = await res.json(); // line item that was added
    const cart = await getCart();
    setCartCount(cart.item_count);

    // Notify the theme (drawer, badges, etc.)
    const detail = { cart, last_added: item };
    document.dispatchEvent(new CustomEvent("wtf:cart:update", { detail }));
    // Back-compat generic events used by other components
    document.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
    document.dispatchEvent(new CustomEvent("cart:added", { detail: { item, cart } }));
    // Open drawer if available
    try { if (window.WTF_CART && typeof window.WTF_CART.open === 'function') window.WTF_CART.open(); } catch(e) {}
    // Legacy signal some projects used
    document.dispatchEvent(new CustomEvent("wtf:cart:open"));
  }

  function attach() {
    document.addEventListener(
      "submit",
      (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (!form.matches("[data-wtf-ajax]")) return;

        e.preventDefault();
        const btn = form.querySelector('[type="submit"]');
        const orig = btn ? btn.textContent : "";
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Adding…";
        }

        addItem(form)
          .then(() => {
            if (btn) {
              btn.disabled = false;
              btn.textContent = orig || "Add to cart";
            }
          })
          .catch((err) => {
            console.warn("[wtf-ajax-cart]", err.message);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Try again";
            }
            // Optional: surface a toast/snackbar
          });
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
