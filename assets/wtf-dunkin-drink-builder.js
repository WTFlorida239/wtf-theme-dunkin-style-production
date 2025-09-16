/**
 * WTF Dunkin-Style Drink Builder
 * Mobile-first drink customization with chip UI
 * Supports: Size, Flavors, Creamers, Sweetness, Ice, Boosters
 */

window.WTFDunkinBuilder = (function() {
  'use strict';

  // Price configuration
  const PRICES = {
    sizes: {
      Small: { base: 7.00, pumps: 1 },
      Medium: { base: 9.00, pumps: 2 },
      Large: { base: 15.00, pumps: 3 },
      Gallon: { base: 100.00, pumps: 0 } // Custom pumps for gallon
    },
    modifiers: {
      extraPump: 0.50,
      booster: 2.50,
      premiumIce: 0.50,
      creamer: 0.00, // Free
      sweetener: 0.00 // Free
    }
  };

  // Modifier options
  const MODIFIERS = {
    creamers: ['None', 'Oat Milk', 'Almond Milk', 'Coconut Milk', 'Regular'],
    sweetness: ['No Sugar', 'Light', 'Regular', 'Extra'],
    ice: ['No Ice', 'Light Ice', 'Regular Ice', 'Extra Ice', 'Premium Ice +$0.50'],
    boosters: [
      { name: 'Energy', price: 2.50, icon: '⚡' },
      { name: 'Immunity', price: 2.50, icon: '🛡️' },
      { name: 'Focus', price: 3.00, icon: '🎯' },
      { name: 'Relax', price: 2.50, icon: '😌' }
    ]
  };

  class DrinkBuilder {
    constructor(element, config = {}) {
      this.element = element;
      this.config = {
        productType: config.productType || 'default',
        variantId: config.variantId || null,
        flavors: config.flavors || [],
        strains: config.strains || [],
        requireStrain: config.requireStrain || false,
        allowGallon: config.allowGallon !== false,
        ...config
      };

      this.state = {
        size: 'Medium',
        strain: null,
        flavors: new Set(),
        creamer: 'None',
        sweetness: 'Regular',
        ice: 'Regular Ice',
        boosters: new Set(),
        extraPumps: 0,
        quantity: 1,
        comments: ''
      };

      this.init();
    }

    init() {
      this.render();
      this.attachEventListeners();
      this.updatePrice();
      this.checkGallonLogic();
    }

    render() {
      this.element.innerHTML = `
        <div class="wtf-dunkin-builder">
          <div class="builder-section">
            <label class="section-label">Size</label>
            <div class="chip-group" data-modifier="size">
              ${Object.keys(PRICES.sizes).map(size => 
                this.config.allowGallon || size !== 'Gallon' ? `
                  <button 
                    class="chip ${size === this.state.size ? 'chip--active' : ''}"
                    data-value="${size}"
                    aria-label="Size: ${size}"
                    aria-checked="${size === this.state.size}"
                    role="radio">
                    ${size}
                    ${this.renderPriceDiff('Medium', size)}
                  </button>
                ` : ''
              ).join('')}
            </div>
          </div>

          ${this.config.requireStrain && this.config.strains.length ? `
            <div class="builder-section">
              <label class="section-label">Strain <span class="required">*</span></label>
              <div class="chip-group" data-modifier="strain">
                ${this.config.strains.map(strain => `
                  <button 
                    class="chip"
                    data-value="${strain}"
                    aria-label="Strain: ${strain}"
                    role="radio">
                    ${strain}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="builder-section" id="flavors-section">
            <label class="section-label">
              Flavors 
              <span class="pumps-indicator">${this.getIncludedPumps()} pumps included</span>
            </label>
            <div class="chip-group chip-group--multi" data-modifier="flavors">
              ${this.config.flavors.map(flavor => `
                <button 
                  class="chip"
                  data-value="${flavor}"
                  aria-label="Flavor: ${flavor}"
                  role="checkbox">
                  ${flavor}
                </button>
              `).join('')}
            </div>
            <div class="pump-distribution" id="pump-distribution" style="display:none;">
              <strong>Pump Distribution:</strong>
              <div class="distribution-list"></div>
            </div>
          </div>

          <div class="builder-section">
            <label class="section-label">Creamer</label>
            <div class="chip-group" data-modifier="creamer">
              ${MODIFIERS.creamers.map(creamer => `
                <button 
                  class="chip ${creamer === this.state.creamer ? 'chip--active' : ''}"
                  data-value="${creamer}"
                  aria-label="Creamer: ${creamer}"
                  role="radio">
                  ${creamer}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="builder-section">
            <label class="section-label">Sweetness</label>
            <div class="chip-group" data-modifier="sweetness">
              ${MODIFIERS.sweetness.map(level => `
                <button 
                  class="chip ${level === this.state.sweetness ? 'chip--active' : ''}"
                  data-value="${level}"
                  aria-label="Sweetness: ${level}"
                  role="radio">
                  ${level}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="builder-section">
            <label class="section-label">Ice</label>
            <div class="chip-group" data-modifier="ice">
              ${MODIFIERS.ice.map(ice => `
                <button 
                  class="chip ${ice === this.state.ice ? 'chip--active' : ''}"
                  data-value="${ice}"
                  aria-label="Ice: ${ice}"
                  role="radio">
                  ${ice}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="builder-section">
            <label class="section-label">Wellness Boosters</label>
            <div class="chip-group chip-group--multi" data-modifier="boosters">
              ${MODIFIERS.boosters.map(booster => `
                <button 
                  class="chip chip--booster"
                  data-value="${booster.name}"
                  data-price="${booster.price}"
                  aria-label="Booster: ${booster.name} +$${booster.price}"
                  role="checkbox">
                  ${booster.icon} ${booster.name}
                  <span class="chip-price">+$${booster.price}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="builder-section">
            <label class="section-label">Extra Flavor Pumps</label>
            <div class="pump-control">
              <button class="pump-btn pump-btn--minus" data-action="decrease">−</button>
              <span class="pump-count">${this.state.extraPumps}</span>
              <button class="pump-btn pump-btn--plus" data-action="increase">+</button>
              <span class="pump-price">${this.state.extraPumps > 0 ? `+$${(this.state.extraPumps * PRICES.modifiers.extraPump).toFixed(2)}` : ''}</span>
            </div>
          </div>

          <div class="builder-section">
            <label class="section-label">Special Instructions</label>
            <textarea 
              class="comments-input"
              placeholder="Any special requests?"
              rows="2">${this.state.comments}</textarea>
          </div>

          <div class="builder-section">
            <label class="section-label">Quantity</label>
            <div class="quantity-control">
              <button class="qty-btn qty-btn--minus" data-action="decrease">−</button>
              <input type="number" class="qty-input" value="${this.state.quantity}" min="1" max="99">
              <button class="qty-btn qty-btn--plus" data-action="increase">+</button>
            </div>
          </div>

          <div class="price-summary">
            <div class="price-breakdown">
              <div class="price-line">
                <span>Base (${this.state.size})</span>
                <span>$${this.getBasePrice().toFixed(2)}</span>
              </div>
              ${this.state.extraPumps > 0 ? `
                <div class="price-line">
                  <span>Extra Pumps (${this.state.extraPumps})</span>
                  <span>+$${(this.state.extraPumps * PRICES.modifiers.extraPump).toFixed(2)}</span>
                </div>
              ` : ''}
              ${this.state.ice.includes('Premium') ? `
                <div class="price-line">
                  <span>Premium Ice</span>
                  <span>+$${PRICES.modifiers.premiumIce.toFixed(2)}</span>
                </div>
              ` : ''}
              ${this.state.boosters.size > 0 ? `
                <div class="price-line">
                  <span>Boosters (${this.state.boosters.size})</span>
                  <span>+$${this.getBoostersTotal().toFixed(2)}</span>
                </div>
              ` : ''}
              ${this.state.quantity > 1 ? `
                <div class="price-line">
                  <span>Quantity</span>
                  <span>×${this.state.quantity}</span>
                </div>
              ` : ''}
            </div>
            <div class="price-total">
              <span>Total</span>
              <span class="price-amount">$${this.getTotalPrice().toFixed(2)}</span>
            </div>
          </div>

          <div class="upsell-message" id="upsell-message"></div>

          <button class="add-to-cart-btn" id="add-to-cart">
            Add to Cart — $${this.getTotalPrice().toFixed(2)}
          </button>
        </div>
      `;

      // Add styles
      this.injectStyles();
    }

    attachEventListeners() {
      // Chip selections
      this.element.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const group = chip.closest('.chip-group');
        const modifier = group.dataset.modifier;
        const value = chip.dataset.value;

        if (group.classList.contains('chip-group--multi')) {
          // Multi-select (flavors, boosters)
          this.handleMultiSelect(modifier, value, chip);
        } else {
          // Single select (size, creamer, etc)
          this.handleSingleSelect(modifier, value, group);
        }

        this.updatePrice();
        this.checkGallonLogic();
      });

      // Extra pumps
      this.element.addEventListener('click', (e) => {
        if (e.target.classList.contains('pump-btn')) {
          const action = e.target.dataset.action;
          if (action === 'increase') {
            this.state.extraPumps++;
          } else if (action === 'decrease' && this.state.extraPumps > 0) {
            this.state.extraPumps--;
          }
          this.updatePumpDisplay();
          this.updatePrice();
        }
      });

      // Quantity
      this.element.addEventListener('click', (e) => {
        if (e.target.classList.contains('qty-btn')) {
          const action = e.target.dataset.action;
          if (action === 'increase') {
            this.state.quantity++;
          } else if (action === 'decrease' && this.state.quantity > 1) {
            this.state.quantity--;
          }
          this.element.querySelector('.qty-input').value = this.state.quantity;
          this.updatePrice();
        }
      });

      // Quantity input
      const qtyInput = this.element.querySelector('.qty-input');
      if (qtyInput) {
        qtyInput.addEventListener('change', (e) => {
          this.state.quantity = Math.max(1, parseInt(e.target.value) || 1);
          e.target.value = this.state.quantity;
          this.updatePrice();
        });
      }

      // Comments
      const commentsInput = this.element.querySelector('.comments-input');
      if (commentsInput) {
        commentsInput.addEventListener('input', (e) => {
          this.state.comments = e.target.value;
        });
      }

      // Add to cart
      const addBtn = this.element.querySelector('#add-to-cart');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.addToCart());
      }
    }

    handleSingleSelect(modifier, value, group) {
      // Remove active from all chips in group
      group.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('chip--active');
        chip.setAttribute('aria-checked', 'false');
      });

      // Add active to selected chip
      const selectedChip = group.querySelector(`[data-value="${value}"]`);
      if (selectedChip) {
        selectedChip.classList.add('chip--active');
        selectedChip.setAttribute('aria-checked', 'true');
      }

      // Update state
      this.state[modifier] = value;
    }

    handleMultiSelect(modifier, value, chip) {
      if (modifier === 'flavors') {
        if (this.state.flavors.has(value)) {
          this.state.flavors.delete(value);
          chip.classList.remove('chip--active');
          chip.setAttribute('aria-checked', 'false');
        } else {
          // Check max flavors
          const maxFlavors = this.config.maxFlavors || 4;
          if (this.state.flavors.size >= maxFlavors) {
            this.showToast(`Maximum ${maxFlavors} flavors allowed`);
            return;
          }
          this.state.flavors.add(value);
          chip.classList.add('chip--active');
          chip.setAttribute('aria-checked', 'true');
        }
        this.updatePumpDistribution();
        this.autoCalculateExtraPumps();
      } else if (modifier === 'boosters') {
        if (this.state.boosters.has(value)) {
          this.state.boosters.delete(value);
          chip.classList.remove('chip--active');
          chip.setAttribute('aria-checked', 'false');
        } else {
          this.state.boosters.add(value);
          chip.classList.add('chip--active');
          chip.setAttribute('aria-checked', 'true');
        }
      }
    }

    checkGallonLogic() {
      if (this.state.size !== 'Gallon') {
        // Show flavors for non-gallon sizes
        const flavorsSection = this.element.querySelector('#flavors-section');
        if (flavorsSection) {
          flavorsSection.style.display = 'block';
        }
        return;
      }

      // Gallon selected - check product type
      const flavorsSection = this.element.querySelector('#flavors-section');
      if (!flavorsSection) return;

      if (this.config.productType === 'kratom' || this.config.productType === 'kava') {
        // Hide flavors for kratom/kava gallon
        flavorsSection.style.display = 'none';
        this.state.flavors.clear();
        
        // Show special message
        const dist = this.element.querySelector('#pump-distribution');
        if (dist) {
          dist.style.display = 'block';
          dist.innerHTML = '<p class="gallon-message">🗣️ Gallon size - discuss flavor preferences with staff</p>';
        }
      } else if (this.config.productType === 'delta-9') {
        // Show flavors and concentration options for THC
        flavorsSection.style.display = 'block';
        
        // Add concentration selector if not exists
        if (!this.element.querySelector('[data-modifier="concentration"]')) {
          const concentrationHtml = `
            <div class="builder-section">
              <label class="section-label">THC Concentration</label>
              <div class="chip-group" data-modifier="concentration">
                <button class="chip chip--active" data-value="Regular">Regular (10mg/oz)</button>
                <button class="chip" data-value="Strong">Strong (15mg/oz)</button>
                <button class="chip" data-value="Extra">Extra (20mg/oz)</button>
              </div>
            </div>
          `;
          flavorsSection.insertAdjacentHTML('afterend', concentrationHtml);
        }
      }
    }

    getIncludedPumps() {
      return this.state.size === 'Gallon' ? 0 : (PRICES.sizes[this.state.size]?.pumps || 0);
    }

    getBasePrice() {
      return PRICES.sizes[this.state.size]?.base || 0;
    }

    getBoostersTotal() {
      let total = 0;
      this.state.boosters.forEach(name => {
        const booster = MODIFIERS.boosters.find(b => b.name === name);
        if (booster) total += booster.price;
      });
      return total;
    }

    getTotalPrice() {
      let price = this.getBasePrice();
      price += this.state.extraPumps * PRICES.modifiers.extraPump;
      price += this.getBoostersTotal();
      if (this.state.ice.includes('Premium')) {
        price += PRICES.modifiers.premiumIce;
      }
      return price * this.state.quantity;
    }

    renderPriceDiff(baseSize, targetSize) {
      if (baseSize === targetSize) return '';
      const diff = PRICES.sizes[targetSize].base - PRICES.sizes[baseSize].base;
      if (diff > 0) {
        return `<span class="price-diff">+$${diff.toFixed(2)}</span>`;
      }
      return '';
    }

    updatePumpDistribution() {
      const dist = this.element.querySelector('.distribution-list');
      const distContainer = this.element.querySelector('#pump-distribution');
      
      if (!dist || !distContainer) return;
      
      if (this.state.flavors.size === 0) {
        distContainer.style.display = 'none';
        return;
      }

      const includedPumps = this.getIncludedPumps();
      if (includedPumps === 0 && this.state.size === 'Gallon') {
        // Already handled in checkGallonLogic
        return;
      }

      const flavorsArray = Array.from(this.state.flavors);
      const pumpsPerFlavor = Math.floor(includedPumps / flavorsArray.length);
      const remainder = includedPumps % flavorsArray.length;

      let html = '';
      flavorsArray.forEach((flavor, i) => {
        const pumps = pumpsPerFlavor + (i < remainder ? 1 : 0);
        html += `<div class="dist-item">• ${flavor}: ${pumps} pump${pumps !== 1 ? 's' : ''}</div>`;
      });

      dist.innerHTML = html;
      distContainer.style.display = 'block';
    }

    autoCalculateExtraPumps() {
      const includedPumps = this.getIncludedPumps();
      const neededPumps = Math.max(0, this.state.flavors.size - includedPumps);
      
      if (neededPumps > this.state.extraPumps) {
        this.state.extraPumps = neededPumps;
        this.updatePumpDisplay();
      }
    }

    updatePumpDisplay() {
      const countEl = this.element.querySelector('.pump-count');
      const priceEl = this.element.querySelector('.pump-price');
      
      if (countEl) countEl.textContent = this.state.extraPumps;
      if (priceEl) {
        priceEl.textContent = this.state.extraPumps > 0 
          ? `+$${(this.state.extraPumps * PRICES.modifiers.extraPump).toFixed(2)}`
          : '';
      }
    }

    updatePrice() {
      // Update price breakdown
      this.render();
      
      // Show upsell message
      this.showUpsellMessage();
    }

    showUpsellMessage() {
      const upsellEl = this.element.querySelector('#upsell-message');
      if (!upsellEl) return;

      const currentSize = this.state.size;
      const sizes = ['Small', 'Medium', 'Large'];
      const currentIndex = sizes.indexOf(currentSize);

      if (currentIndex >= 0 && currentIndex < sizes.length - 1) {
        const nextSize = sizes[currentIndex + 1];
        const currentPrice = PRICES.sizes[currentSize].base;
        const nextPrice = PRICES.sizes[nextSize].base;
        const diff = nextPrice - currentPrice;

        upsellEl.innerHTML = `
          <div class="upsell-card">
            <span class="upsell-icon">💡</span>
            <span class="upsell-text">Upgrade to ${nextSize} for just $${diff.toFixed(2)} more!</span>
            <button class="upsell-btn" data-upgrade-to="${nextSize}">Upgrade</button>
          </div>
        `;

        // Handle upgrade button
        const upgradeBtn = upsellEl.querySelector('.upsell-btn');
        if (upgradeBtn) {
          upgradeBtn.addEventListener('click', () => {
            const sizeChip = this.element.querySelector(`.chip[data-value="${nextSize}"]`);
            if (sizeChip) sizeChip.click();
          });
        }
      } else {
        upsellEl.innerHTML = '';
      }
    }

    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'wtf-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    async addToCart() {
      // Validate
      if (this.config.requireStrain && !this.state.strain) {
        this.showToast('Please select a strain');
        return;
      }

      if (this.state.flavors.size === 0 && this.state.size !== 'Gallon') {
        this.showToast('Please select at least one flavor');
        return;
      }

      if (!this.config.variantId) {
        this.showToast('Product configuration error');
        return;
      }

      // Build properties
      const properties = {
        Size: this.state.size,
        Flavors: Array.from(this.state.flavors).join(', '),
        Creamer: this.state.creamer,
        Sweetness: this.state.sweetness,
        Ice: this.state.ice,
        'Extra Pumps': String(this.state.extraPumps)
      };

      if (this.state.strain) {
        properties.Strain = this.state.strain;
      }

      if (this.state.boosters.size > 0) {
        properties.Boosters = Array.from(this.state.boosters).join(', ');
      }

      if (this.state.comments) {
        properties.Comments = this.state.comments;
      }

      // Add to cart
      const addBtn = this.element.querySelector('#add-to-cart');
      const originalText = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = 'Adding...';

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: this.config.variantId,
            quantity: this.state.quantity,
            properties: properties
          })
        });

        if (response.ok) {
          this.showToast('Added to cart! 🎉');
          document.dispatchEvent(new CustomEvent('wtf:cart:update'));
          
          // Reset some state
          this.state.flavors.clear();
          this.state.boosters.clear();
          this.state.extraPumps = 0;
          this.state.quantity = 1;
          this.state.comments = '';
          this.render();
          this.attachEventListeners();
        } else {
          throw new Error('Failed to add to cart');
        }
      } catch (error) {
        console.error('Add to cart error:', error);
        this.showToast('Failed to add to cart');
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = originalText;
      }
    }

    injectStyles() {
      if (document.getElementById('wtf-dunkin-styles')) return;

      const styles = `
        <style id="wtf-dunkin-styles">
          .wtf-dunkin-builder {
            max-width: 600px;
            margin: 0 auto;
            padding: 1rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .builder-section {
            margin-bottom: 1.5rem;
          }

          .section-label {
            display: block;
            font-weight: 700;
            font-size: 0.95rem;
            color: #333;
            margin-bottom: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .section-label .required {
            color: #ff6b35;
          }

          .pumps-indicator {
            font-size: 0.85rem;
            color: #28a745;
            font-weight: 500;
            text-transform: none;
            letter-spacing: 0;
            margin-left: 0.5rem;
          }

          .chip-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .chip {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 24px;
            padding: 0.75rem 1.25rem;
            font-size: 0.95rem;
            font-weight: 500;
            color: #495057;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
            touch-action: manipulation;
          }

          .chip:hover {
            background: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          .chip--active {
            background: #28a745;
            color: white;
            border-color: #1e7e34;
          }

          .chip--active:hover {
            background: #218838;
          }

          .chip--booster {
            padding-right: 3rem;
          }

          .chip-price {
            position: absolute;
            right: 0.75rem;
            font-size: 0.8rem;
            color: #ff6b35;
            font-weight: 600;
          }

          .chip--active .chip-price {
            color: #fff3cd;
          }

          .price-diff {
            font-size: 0.75rem;
            color: #ff6b35;
            margin-left: 0.25rem;
            font-weight: 600;
          }

          .pump-distribution {
            margin-top: 1rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 12px;
            font-size: 0.9rem;
          }

          .dist-item {
            padding: 0.25rem 0;
            color: #495057;
          }

          .gallon-message {
            color: #ff6b35;
            font-weight: 500;
          }

          .pump-control,
          .quantity-control {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .pump-btn,
          .qty-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #dee2e6;
            background: white;
            font-size: 1.25rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .pump-btn:hover,
          .qty-btn:hover {
            background: #ff6b35;
            color: white;
            border-color: #ff6b35;
          }

          .pump-count {
            font-size: 1.25rem;
            font-weight: 600;
            min-width: 30px;
            text-align: center;
          }

          .pump-price {
            color: #ff6b35;
            font-weight: 500;
            font-size: 0.9rem;
          }

          .qty-input {
            width: 60px;
            text-align: center;
            padding: 0.5rem;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .comments-input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #dee2e6;
            border-radius: 12px;
            font-family: inherit;
            font-size: 0.95rem;
            resize: vertical;
            transition: border-color 0.2s ease;
          }

          .comments-input:focus {
            outline: none;
            border-color: #ff6b35;
          }

          .price-summary {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 1.25rem;
            margin: 1.5rem 0;
          }

          .price-breakdown {
            padding-bottom: 1rem;
            border-bottom: 2px solid #dee2e6;
            margin-bottom: 1rem;
          }

          .price-line {
            display: flex;
            justify-content: space-between;
            padding: 0.25rem 0;
            color: #495057;
            font-size: 0.9rem;
          }

          .price-total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
            font-size: 1.1rem;
            color: #333;
          }

          .price-amount {
            color: #ff6b35;
            font-size: 1.5rem;
          }

          .upsell-card {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border: 2px solid #ffc107;
            border-radius: 12px;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin: 1rem 0;
          }

          .upsell-icon {
            font-size: 1.5rem;
          }

          .upsell-text {
            flex: 1;
            color: #856404;
            font-weight: 500;
          }

          .upsell-btn {
            background: #ffc107;
            color: #333;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .upsell-btn:hover {
            background: #e0a800;
            transform: scale(1.05);
          }

          .add-to-cart-btn {
            width: 100%;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            border: none;
            padding: 1.25rem;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
          }

          .add-to-cart-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
          }

          .add-to-cart-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .wtf-toast {
            position: fixed;
            bottom: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-weight: 500;
            z-index: 10000;
            transition: bottom 0.3s ease;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          }

          .wtf-toast.show {
            bottom: 30px;
          }

          @media (max-width: 768px) {
            .wtf-dunkin-builder {
              padding: 0.75rem;
            }

            .chip {
              font-size: 0.9rem;
              padding: 0.6rem 1rem;
              min-height: 44px;
            }

            .add-to-cart-btn {
              position: sticky;
              bottom: 10px;
              z-index: 100;
            }
          }
        </style>
      `;

      document.head.insertAdjacentHTML('beforeend', styles);
    }
  }

  // Public API
  return {
    init: function(selector, config) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => new DrinkBuilder(el, config));
    }
  };
})();

// Auto-initialize if elements exist
document.addEventListener('DOMContentLoaded', function() {
  // Check for builder elements
  const builders = document.querySelectorAll('[data-wtf-dunkin-builder]');
  builders.forEach(el => {
    const config = {
      productType: el.dataset.productType,
      variantId: el.dataset.variantId,
      flavors: (el.dataset.flavors || '').split(',').filter(Boolean),
      strains: (el.dataset.strains || '').split(',').filter(Boolean),
      requireStrain: el.dataset.requireStrain === 'true',
      allowGallon: el.dataset.allowGallon !== 'false'
    };
    WTFDunkinBuilder.init(el, config);
  });
});