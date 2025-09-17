/**
 * WTF Size Selector
 * Handles size selection with price deltas and upselling
 */

class WTFSizeSelector {
  constructor() {
    this.sizes = {
      small: { name: 'Small', price: 0, volume: '12oz' },
      medium: { name: 'Medium', price: 1, volume: '16oz' },
      large: { name: 'Large', price: 2, volume: '20oz' },
      gallon: { name: 'Gallon', price: 35, volume: '128oz' }
    };
    
    this.currentSize = 'medium';
    this.basePrice = 0;
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updateDisplay();
  }
  
  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-size-option]')) {
        e.preventDefault();
        this.selectSize(e.target.dataset.sizeOption);
      }
    });
    
    // Listen for product changes
    document.addEventListener('wtf:product-changed', (e) => {
      this.basePrice = e.detail.price || 0;
      this.updateDisplay();
    });
  }
  
  selectSize(size) {
    if (!this.sizes[size]) return;
    
    const previousSize = this.currentSize;
    this.currentSize = size;
    
    // Update UI
    this.updateDisplay();
    
    // Handle gallon-specific rules
    if (size === 'gallon') {
      this.handleGallonSelection();
    } else if (previousSize === 'gallon') {
      this.handleNonGallonSelection();
    }
    
    // Dispatch event
    this.dispatchSizeChange();
    
    // Show upsell if applicable
    if (size === 'small' || size === 'medium') {
      this.showUpsellMessage();
    }
  }
  
  updateDisplay() {
    // Update size chips
    document.querySelectorAll('[data-size-option]').forEach(chip => {
      const isSelected = chip.dataset.sizeOption === this.currentSize;
      chip.classList.toggle('chip--selected', isSelected);
      chip.setAttribute('aria-pressed', isSelected);
      
      // Update price display on chip
      const size = chip.dataset.sizeOption;
      const priceDelta = this.sizes[size].price;
      const priceEl = chip.querySelector('.chip__price');
      
      if (priceEl) {
        if (priceDelta > 0) {
          priceEl.textContent = `+$${priceDelta.toFixed(2)}`;
        } else {
          priceEl.textContent = '';
        }
      }
    });
    
    // Update total price
    this.updateTotalPrice();
  }
  
  updateTotalPrice() {
    const totalPrice = this.basePrice + this.sizes[this.currentSize].price;
    const priceElements = document.querySelectorAll('[data-total-price]');
    
    priceElements.forEach(el => {
      el.textContent = `$${totalPrice.toFixed(2)}`;
    });
    
    // Update price preview
    const previewEl = document.querySelector('[data-price-preview]');
    if (previewEl) {
      previewEl.innerHTML = `
        <div class="price-preview__current">
          <span class="price-preview__size">${this.sizes[this.currentSize].name} (${this.sizes[this.currentSize].volume})</span>
          <span class="price-preview__amount">$${totalPrice.toFixed(2)}</span>
        </div>
      `;
    }
  }
  
  handleGallonSelection() {
    const productType = document.querySelector('[data-product-type]')?.dataset.productType;
    
    // Hide flavor options for Kava/Kratom Tea gallons
    if (productType === 'kava' || productType === 'kratom') {
      document.querySelectorAll('[data-flavor-group]').forEach(group => {
        group.style.display = 'none';
      });
      
      // Show gallon notice
      this.showNotice('Gallon size: Flavors not available for this product type');
    }
    
    // Show concentration options for Delta-9 gallons
    if (productType === 'delta9') {
      const concentrationGroup = document.querySelector('[data-concentration-group]');
      if (concentrationGroup) {
        concentrationGroup.style.display = 'block';
      }
    }
  }
  
  handleNonGallonSelection() {
    // Restore flavor options
    document.querySelectorAll('[data-flavor-group]').forEach(group => {
      group.style.display = '';
    });
    
    // Hide concentration options
    const concentrationGroup = document.querySelector('[data-concentration-group]');
    if (concentrationGroup) {
      concentrationGroup.style.display = 'none';
    }
  }
  
  showUpsellMessage() {
    const largePriceDelta = this.sizes.large.price - this.sizes[this.currentSize].price;
    
    if (largePriceDelta > 0) {
      const message = `Upgrade to Large for only $${largePriceDelta.toFixed(2)} more!`;
      
      // Create upsell banner
      const upsellBanner = document.querySelector('[data-upsell-banner]');
      if (upsellBanner) {
        upsellBanner.innerHTML = `
          <div class="upsell-banner__content">
            <span class="upsell-banner__text">${message}</span>
            <button class="upsell-banner__button btn btn--small" data-size-option="large">
              Upgrade Now
            </button>
          </div>
        `;
        upsellBanner.classList.add('upsell-banner--visible');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          upsellBanner.classList.remove('upsell-banner--visible');
        }, 5000);
      }
    }
  }
  
  showNotice(message) {
    const noticeEl = document.querySelector('[data-notice]');
    if (noticeEl) {
      noticeEl.textContent = message;
      noticeEl.classList.add('notice--visible');
      
      setTimeout(() => {
        noticeEl.classList.remove('notice--visible');
      }, 3000);
    }
  }
  
  dispatchSizeChange() {
    const event = new CustomEvent('wtf:size-changed', {
      detail: {
        size: this.currentSize,
        sizeData: this.sizes[this.currentSize],
        priceDelta: this.sizes[this.currentSize].price
      }
    });
    
    document.dispatchEvent(event);
  }
  
  getCurrentSelection() {
    return {
      size: this.currentSize,
      ...this.sizes[this.currentSize]
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.WTFSizeSelector = new WTFSizeSelector();
  });
} else {
  window.WTFSizeSelector = new WTFSizeSelector();
}