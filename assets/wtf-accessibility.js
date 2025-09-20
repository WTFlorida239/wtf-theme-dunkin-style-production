/**
 * WTF Accessibility - WCAG 2.1 AA compliance utilities
 * Focus management, screen reader support, keyboard navigation
 */

(function() {
  'use strict';

  const WTFAccessibility = {
    // Configuration
    config: {
      focusableSelectors: 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      trapFocus: true,
      announceChanges: true,
      debug: window.WTF_A11Y_DEBUG || false
    },

    // Initialize accessibility features
    init() {
      this.setupFocusManagement();
      this.setupKeyboardNavigation();
      this.setupAriaLiveRegions();
      this.setupScreenReaderSupport();
      this.setupMotionPreferences();
      
      if (this.config.debug) {
        console.log('WTF Accessibility initialized');
      }
    },

    // Focus Management
    setupFocusManagement() {
      // Enhanced focus indicators
      document.addEventListener('focusin', (e) => {
        e.target.classList.add('wtf-focused');
      });

      document.addEventListener('focusout', (e) => {
        e.target.classList.remove('wtf-focused');
      });

      // Skip links functionality
      const skipLinks = document.querySelectorAll('.skip-link');
      skipLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').slice(1);
          const target = document.getElementById(targetId);
          if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    },

    // Keyboard Navigation
    setupKeyboardNavigation() {
      // Escape key handler for modals and overlays
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.handleEscapeKey(e);
        }
      });

      // Arrow key navigation for chip groups
      document.addEventListener('keydown', (e) => {
        if (e.target.matches('.chip input[type="radio"], .chip input[type="checkbox"]')) {
          this.handleChipNavigation(e);
        }
      });

      // Tab trapping in forms
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && e.target.closest('.wtf-builder')) {
          this.handleFormTabbing(e);
        }
      });
    },

    // Handle Escape key for closing overlays
    handleEscapeKey(e) {
      // Close cart drawer
      const cartDrawer = document.querySelector('[data-cart-drawer].open');
      if (cartDrawer) {
        this.closeDrawer(cartDrawer);
        return;
      }

      // Close any open modals
      const modal = document.querySelector('.modal.open, .popup.open');
      if (modal) {
        this.closeModal(modal);
        return;
      }

      // Clear form focus if needed
      if (e.target.matches('input, textarea, select')) {
        e.target.blur();
      }
    },

    // Handle arrow key navigation in chip groups
    handleChipNavigation(e) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      const currentChip = e.target.closest('.chip');
      const chipGroup = currentChip.closest('.chip-row, .wtf-db__chips');
      const allChips = Array.from(chipGroup.querySelectorAll('.chip input'));
      const currentIndex = allChips.indexOf(e.target);

      let nextIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % allChips.length;
      } else {
        nextIndex = (currentIndex - 1 + allChips.length) % allChips.length;
      }

      allChips[nextIndex].focus();
      e.preventDefault();
    },

    // Handle tab navigation in forms
    handleFormTabbing(e) {
      const form = e.target.closest('.wtf-builder');
      const focusableElements = form.querySelectorAll(this.config.focusableSelectors);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && e.target === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && e.target === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },

    // ARIA Live Regions for Dynamic Content
    setupAriaLiveRegions() {
      // Create live regions if they don't exist
      if (!document.getElementById('wtf-sr-live-polite')) {
        const politeRegion = document.createElement('div');
        politeRegion.id = 'wtf-sr-live-polite';
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'true');
        politeRegion.className = 'sr-only';
        document.body.appendChild(politeRegion);
      }

      if (!document.getElementById('wtf-sr-live-assertive')) {
        const assertiveRegion = document.createElement('div');
        assertiveRegion.id = 'wtf-sr-live-assertive';
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        document.body.appendChild(assertiveRegion);
      }
    },

    // Announce changes to screen readers
    announce(message, priority = 'polite') {
      if (!this.config.announceChanges) return;

      const regionId = priority === 'assertive' ? 'wtf-sr-live-assertive' : 'wtf-sr-live-polite';
      const region = document.getElementById(regionId);
      
      if (region) {
        region.textContent = '';
        setTimeout(() => {
          region.textContent = message;
        }, 100);
        
        if (this.config.debug) {
          console.log(`Announced (${priority}): ${message}`);
        }
      }
    },

    // Screen Reader Support
    setupScreenReaderSupport() {
      // Add screen reader descriptions for complex interactions
      this.addDrinkBuilderDescriptions();
      this.addCartDescriptions();
      
      // Monitor for dynamic content changes
      this.observeContentChanges();
    },

    // Add descriptions for drink builder
    addDrinkBuilderDescriptions() {
      const drinkBuilder = document.querySelector('#enhanced-drink-builder');
      if (!drinkBuilder) return;

      // Add description for size selection
      const sizeFieldset = drinkBuilder.querySelector('fieldset legend');
      if (sizeFieldset && sizeFieldset.textContent.includes('Size')) {
        const description = 'Select drink size. Price updates automatically. Larger sizes include more flavor pumps.';
        this.addDescription(sizeFieldset.closest('fieldset'), description);
      }

      // Add description for strain selection
      const strainFieldset = Array.from(drinkBuilder.querySelectorAll('fieldset legend'))
        .find(legend => legend.textContent.toLowerCase().includes('strain'));
      if (strainFieldset) {
        const description = 'Select up to 2 strains. You can mix strains for half and half combinations.';
        this.addDescription(strainFieldset.closest('fieldset'), description);
      }

      // Add description for flavor selection
      const flavorFieldset = Array.from(drinkBuilder.querySelectorAll('fieldset legend'))
        .find(legend => legend.textContent.toLowerCase().includes('flavor'));
      if (flavorFieldset) {
        const description = 'Select flavors and pump counts. Extra pumps beyond included amount incur additional charges.';
        this.addDescription(flavorFieldset.closest('fieldset'), description);
      }
    },

    // Add descriptions for cart
    addCartDescriptions() {
      const cartItems = document.querySelectorAll('[data-cart-item]');
      cartItems.forEach(item => {
        const customizations = item.querySelector('.line-item-properties');
        if (customizations) {
          const description = 'Custom drink with selected modifications. Review details below.';
          this.addDescription(item, description);
        }
      });
    },

    // Helper to add aria-describedby
    addDescription(element, description) {
      const id = 'desc-' + Math.random().toString(36).substr(2, 9);
      const descElement = document.createElement('div');
      descElement.id = id;
      descElement.className = 'sr-only';
      descElement.textContent = description;
      
      element.appendChild(descElement);
      element.setAttribute('aria-describedby', id);
    },

    // Monitor content changes for announcements
    observeContentChanges() {
      // Price changes
      const priceObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.target.id === 'builder-price') {
            const newPrice = mutation.target.textContent;
            this.announce(`Price updated to ${newPrice}`);
          }
        });
      });

      const priceElement = document.getElementById('builder-price');
      if (priceElement) {
        priceObserver.observe(priceElement, { childList: true, subtree: true });
      }

      // Cart changes
      const cartObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.target.matches('[data-cart-count]')) {
            const count = mutation.target.textContent;
            this.announce(`Cart updated. ${count} items in cart`);
          }
        });
      });

      const cartCount = document.querySelector('[data-cart-count]');
      if (cartCount) {
        cartObserver.observe(cartCount, { childList: true, subtree: true });
      }
    },

    // Motion Preferences
    setupMotionPreferences() {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduced-motion');
        
        // Disable smooth scrolling
        document.documentElement.style.scrollBehavior = 'auto';
        
        // Reduce animation durations
        const style = document.createElement('style');
        style.textContent = `
          .reduced-motion *,
          .reduced-motion *::before,
          .reduced-motion *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        `;
        document.head.appendChild(style);
      }
    },

    // Modal and Drawer Management
    openModal(modal, triggerElement) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      
      // Set focus to first focusable element
      const firstFocusable = modal.querySelector(this.config.focusableSelectors);
      if (firstFocusable) {
        firstFocusable.focus();
      }

      // Store trigger for return focus
      modal._triggerElement = triggerElement;
      
      // Trap focus
      if (this.config.trapFocus) {
        this.trapFocus(modal);
      }

      this.announce('Modal opened', 'assertive');
    },

    closeModal(modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      
      // Return focus to trigger
      if (modal._triggerElement) {
        modal._triggerElement.focus();
        modal._triggerElement = null;
      }

      this.announce('Modal closed', 'assertive');
    },

    openDrawer(drawer, triggerElement) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      
      const firstFocusable = drawer.querySelector(this.config.focusableSelectors);
      if (firstFocusable) {
        firstFocusable.focus();
      }

      drawer._triggerElement = triggerElement;
      
      if (this.config.trapFocus) {
        this.trapFocus(drawer);
      }

      this.announce('Cart drawer opened', 'assertive');
    },

    closeDrawer(drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      
      if (drawer._triggerElement) {
        drawer._triggerElement.focus();
        drawer._triggerElement = null;
      }

      this.announce('Cart drawer closed', 'assertive');
    },

    // Focus Trapping
    trapFocus(container) {
      const focusableElements = container.querySelectorAll(this.config.focusableSelectors);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      container.addEventListener('keydown', function trapFocusHandler(e) {
        if (e.key === 'Tab') {
          if (e.shiftKey && e.target === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && e.target === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      });
    },

    // Utility Functions
    isVisible(element) {
      return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    },

    hasValidLabel(element) {
      return !!(
        element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        element.closest('label') ||
        document.querySelector(`label[for="${element.id}"]`)
      );
    },

    // Testing and Validation
    validateAccessibility() {
      const issues = [];
      
      // Check for missing labels on form controls
      const formControls = document.querySelectorAll('input, select, textarea');
      formControls.forEach(control => {
        if (control.type !== 'hidden' && !this.hasValidLabel(control)) {
          issues.push(`Form control missing label: ${control.outerHTML}`);
        }
      });

      // Check for proper heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      headings.forEach(heading => {
        const currentLevel = parseInt(heading.tagName.charAt(1));
        if (currentLevel > previousLevel + 1) {
          issues.push(`Heading hierarchy violation: ${heading.outerHTML}`);
        }
        previousLevel = currentLevel;
      });

      // Check for missing alt text on images
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          issues.push(`Image missing alt text: ${img.outerHTML}`);
        }
      });

      if (issues.length > 0) {
        console.warn('Accessibility issues found:', issues);
      } else {
        console.log('No accessibility issues detected');
      }

      return issues;
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WTFAccessibility.init());
  } else {
    WTFAccessibility.init();
  }

  // Export for global use
  window.WTFAccessibility = WTFAccessibility;
  window.wtfA11y = WTFAccessibility; // Shorter alias

})();