/**
 * WTF Upselling System
 * Handles flavor and booster upsells with dynamic show/hide logic
 */

class WTFUpselling {
  constructor() {
    this.boosters = {
      energy: { name: 'Energy Boost', price: 2, icon: '⚡' },
      focus: { name: 'Focus Blend', price: 2.5, icon: '🎯' },
      immunity: { name: 'Immunity Support', price: 3, icon: '🛡️' },
      protein: { name: 'Protein Shot', price: 3.5, icon: '💪' },
      cbd: { name: 'CBD Calm', price: 5, icon: '🌿' }
    };
    
    this.selectedBoosters = new Set();
    this.flavorMultiplier = 1;
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.renderBoosters();
  }
  
  bindEvents() {
    // Booster selection
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-booster-option]')) {
        e.preventDefault();
        this.toggleBooster(e.target.dataset.boosterOption);
      }
    });
    
    // Flavor intensity
    document.addEventListener('change', (e) => {
      if (e.target.matches('[data-flavor-intensity]')) {
        this.updateFlavorIntensity(e.target.value);
      }
    });
    
    // Size changes affect upselling options
    document.addEventListener('wtf:size-changed', (e) => {
      this.handleSizeChange(e.detail);
    });
  }
  
  renderBoosters() {
    const container = document.querySelector('[data-boosters-container]');
    if (!container) return;
    
    const boostersHTML = Object.entries(this.boosters).map(([key, booster]) => `
      <button
        class="chip chip--booster"
        data-booster-option="${key}"
        aria-pressed="false"
        role="button"
      >
        <span class="chip__icon">${booster.icon}</span>
        <span class="chip__label">${booster.name}</span>
        <span class="chip__price">+$${booster.price.toFixed(2)}</span>
      </button>
    `).join('');
    
    container.innerHTML = `
      <div class="modifier-group">
        <h3 class="modifier-group__title">Power Up Your Drink</h3>
        <div class="modifier-group__chips">
          ${boostersHTML}
        </div>
        <div class="modifier-group__selected" data-selected-boosters></div>
      </div>
    `;
  }
  
  toggleBooster(boosterKey) {
    if (!this.boosters[boosterKey]) return;
    
    const chip = document.querySelector(`[data-booster-option="${boosterKey}"]`);
    if (!chip) return;
    
    if (this.selectedBoosters.has(boosterKey)) {
      this.selectedBoosters.delete(boosterKey);
      chip.classList.remove('chip--selected');
      chip.setAttribute('aria-pressed', 'false');
    } else {
      // Limit to 3 boosters
      if (this.selectedBoosters.size >= 3) {
        this.showNotice('Maximum 3 boosters per drink');
        return;
      }
      
      this.selectedBoosters.add(boosterKey);
      chip.classList.add('chip--selected');
      chip.setAttribute('aria-pressed', 'true');
    }
    
    this.updateBoostersDisplay();
    this.updateTotalPrice();
    this.checkForBundleDiscount();
  }
  
  updateBoostersDisplay() {
    const displayEl = document.querySelector('[data-selected-boosters]');
    if (!displayEl) return;
    
    if (this.selectedBoosters.size === 0) {
      displayEl.innerHTML = '';
      return;
    }
    
    const selectedHTML = Array.from(this.selectedBoosters).map(key => {
      const booster = this.boosters[key];
      return `
        <span class="selected-chip">
          ${booster.icon} ${booster.name}
          <button 
            class="selected-chip__remove" 
            data-booster-option="${key}"
            aria-label="Remove ${booster.name}"
          >×</button>
        </span>
      `;
    }).join('');
    
    displayEl.innerHTML = `
      <div class="selected-boosters">
        <span class="selected-boosters__label">Selected:</span>
        ${selectedHTML}
      </div>
    `;
  }
  
  updateFlavorIntensity(value) {
    this.flavorMultiplier = parseFloat(value);
    
    // Update display
    const intensityLabel = document.querySelector('[data-intensity-label]');
    if (intensityLabel) {
      const labels = {
        '0.5': 'Light',
        '1': 'Regular',
        '1.5': 'Extra',
        '2': 'Double'
      };
      intensityLabel.textContent = labels[value] || 'Regular';
    }
    
    // Dispatch event
    this.dispatchUpsellChange();
  }
  
  handleSizeChange(sizeDetail) {
    // Hide certain boosters for small size
    if (sizeDetail.size === 'small') {
      document.querySelectorAll('[data-booster-option="protein"], [data-booster-option="cbd"]').forEach(el => {
        el.style.display = 'none';
        // Remove if selected
        if (this.selectedBoosters.has(el.dataset.boosterOption)) {
          this.toggleBooster(el.dataset.boosterOption);
        }
      });
    } else {
      document.querySelectorAll('[data-booster-option]').forEach(el => {
        el.style.display = '';
      });
    }
    
    // Special handling for gallon
    if (sizeDetail.size === 'gallon') {
      this.showBulkDiscountOptions();
    }
  }
  
  checkForBundleDiscount() {
    if (this.selectedBoosters.size === 3) {
      const totalBoosterPrice = Array.from(this.selectedBoosters)
        .reduce((sum, key) => sum + this.boosters[key].price, 0);
      
      const discountedPrice = totalBoosterPrice * 0.85; // 15% off
      const savings = totalBoosterPrice - discountedPrice;
      
      this.showNotice(`Bundle discount applied! Save $${savings.toFixed(2)} on 3 boosters`);
      
      // Apply discount
      this.dispatchUpsellChange({ bundleDiscount: savings });
    }
  }
  
  showBulkDiscountOptions() {
    const modal = document.createElement('div');
    modal.className = 'bulk-discount-modal';
    modal.innerHTML = `
      <div class="bulk-discount-modal__content">
        <h3>Gallon Size Special Offers</h3>
        <div class="bulk-offers">
          <label class="bulk-offer">
            <input type="checkbox" name="bulk-extras" value="cups">
            <span>Add 10 cups & lids (+$5)</span>
          </label>
          <label class="bulk-offer">
            <input type="checkbox" name="bulk-extras" value="straws">
            <span>Add 20 straws (+$2)</span>
          </label>
          <label class="bulk-offer">
            <input type="checkbox" name="bulk-extras" value="napkins">
            <span>Add napkins pack (FREE)</span>
          </label>
        </div>
        <button class="btn btn--primary" onclick="this.closest('.bulk-discount-modal').remove()">
          Apply Selections
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-close after interaction
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  showNotice(message) {
    const notice = document.createElement('div');
    notice.className = 'upsell-notice';
    notice.textContent = message;
    document.body.appendChild(notice);
    
    setTimeout(() => {
      notice.classList.add('upsell-notice--visible');
    }, 10);
    
    setTimeout(() => {
      notice.classList.remove('upsell-notice--visible');
      setTimeout(() => notice.remove(), 300);
    }, 3000);
  }
  
  updateTotalPrice() {
    const boosterTotal = Array.from(this.selectedBoosters)
      .reduce((sum, key) => sum + this.boosters[key].price, 0);
    
    // Dispatch event for price update
    this.dispatchUpsellChange({ boosterTotal });
  }
  
  dispatchUpsellChange() {
    const event = new CustomEvent('wtf:upsell-changed', {
      detail: {
        boosters: Array.from(this.selectedBoosters).map(key => ({
          key,
          ...this.boosters[key]
        })),
        flavorIntensity: this.flavorMultiplier,
        totalUpsellPrice: this.calculateTotalUpsell()
      }
    });
    
    document.dispatchEvent(event);
  }
  
  calculateTotalUpsell() {
    return Array.from(this.selectedBoosters)
      .reduce((sum, key) => sum + this.boosters[key].price, 0);
  }
  
  getSelectedUpsells() {
    return {
      boosters: Array.from(this.selectedBoosters).map(key => ({
        key,
        ...this.boosters[key]
      })),
      flavorIntensity: this.flavorMultiplier
    };
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.WTFUpselling = new WTFUpselling();
  });
} else {
  window.WTFUpselling = new WTFUpselling();
}

// Styles for upsell notices
const style = document.createElement('style');
style.textContent = `
  .upsell-notice {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--color-success, #28a745);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateY(100px);
    transition: transform 0.3s ease;
    z-index: 1000;
    max-width: 300px;
  }
  
  .upsell-notice--visible {
    transform: translateY(0);
  }
  
  .bulk-discount-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    animation: fadeIn 0.2s ease;
  }
  
  .bulk-discount-modal__content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    animation: slideUp 0.3s ease;
  }
  
  .bulk-offers {
    margin: 20px 0;
  }
  
  .bulk-offer {
    display: block;
    padding: 10px;
    margin: 8px 0;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .bulk-offer:hover {
    background: #f8f9fa;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);