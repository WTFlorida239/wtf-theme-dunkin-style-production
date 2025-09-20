/**
 * WTF Theme Testing Framework
 * Comprehensive testing suite based on the Final Testing Checklist
 */

class WTFThemeTester {
  constructor() {
    this.issues = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  addIssue(category, description, severity = 'medium', fix = null) {
    this.issues.push({
      id: this.issues.length + 1,
      category,
      description,
      severity,
      fix,
      timestamp: new Date().toISOString()
    });
    this.failed++;
    this.log(`❌ ${category}: ${description}`, 'error');
  }

  pass(test) {
    this.passed++;
    this.log(`✅ ${test}`, 'success');
  }

  skip(test, reason) {
    this.skipped++;
    this.log(`⏭️ ${test} - ${reason}`, 'warning');
  }

  // Core Functionality Testing
  async testCoreFunctionality() {
    this.log('=== Core Functionality Testing ===');
    
    // Test Enhanced Drink Builder
    await this.testDrinkBuilder();
    
    // Test Cart System
    await this.testCartSystem();
    
    // Test Social Wall
    await this.testSocialWall();
  }

  async testDrinkBuilder() {
    this.log('Testing Enhanced Drink Builder...');
    
    // Check if drink builder section exists
    const drinkBuilderSection = document.querySelector('#enhanced-drink-builder');
    if (!drinkBuilderSection) {
      this.addIssue('Drink Builder', 'Enhanced drink builder section not found', 'high', 
        'Ensure enhanced-drink-builder.liquid is included in product templates');
      return;
    }

    // Test size selection
    const sizeRadios = drinkBuilderSection.querySelectorAll('input[name="size"]');
    if (sizeRadios.length === 0) {
      this.addIssue('Drink Builder', 'Size selection radios not found', 'high',
        'Check size radio implementation in enhanced-drink-builder.liquid');
    } else if (sizeRadios.length < 3) {
      this.addIssue('Drink Builder', `Expected 3 sizes (Medium, Large, Gallon), found ${sizeRadios.length}`, 'medium');
    } else {
      this.pass('Size selection contains expected number of options');
    }

    // Test strain selection
    const strainCheckboxes = drinkBuilderSection.querySelectorAll('input[name="strain"]');
    const expectedStrains = ['Green', 'Red', 'White', 'Yellow'];
    if (strainCheckboxes.length !== expectedStrains.length) {
      this.addIssue('Drink Builder', `Expected ${expectedStrains.length} strains, found ${strainCheckboxes.length}`, 'medium');
    } else {
      this.pass('Strain selection contains expected options');
    }

    // Test price calculation elements
    const priceElement = drinkBuilderSection.querySelector('#builder-price');
    if (!priceElement) {
      this.addIssue('Drink Builder', 'Price display element not found', 'high',
        'Add #builder-price element to enhanced-drink-builder.liquid');
    } else {
      this.pass('Price display element exists');
    }

    // Test form submission
    const form = drinkBuilderSection.querySelector('form[data-product-form]');
    if (!form) {
      this.addIssue('Drink Builder', 'Product form not found or missing data-product-form attribute', 'high');
    } else {
      this.pass('Product form exists with correct attributes');
    }

    // Test hidden inputs for line item properties
    const requiredProps = ['Size', 'Strain', 'Flavors', 'Flavor Category', 'Flavor Pump Detail'];
    requiredProps.forEach(prop => {
      const input = drinkBuilderSection.querySelector(`input[name="properties[${prop}]"]`);
      if (!input) {
        this.addIssue('Drink Builder', `Missing line item property input for ${prop}`, 'medium',
          `Add hidden input: <input type="hidden" name="properties[${prop}]" id="prop-${prop.toLowerCase().replace(/\s/g, '-')}" value="">`);
      } else {
        this.pass(`Line item property input exists for ${prop}`);
      }
    });
  }

  async testCartSystem() {
    this.log('Testing Cart System...');
    
    // Test cart drawer
    const cartDrawer = document.querySelector('[data-cart-drawer]') || 
                      document.querySelector('.cart-drawer') ||
                      document.querySelector('#cart-drawer');
    
    if (!cartDrawer) {
      this.addIssue('Cart System', 'Cart drawer not found', 'medium',
        'Implement cart drawer functionality or check wtf-cart.liquid section');
    } else {
      this.pass('Cart drawer exists');
    }

    // Test AJAX cart functionality
    if (!window.fetch) {
      this.addIssue('Cart System', 'Fetch API not available', 'high',
        'Add fetch polyfill for older browsers');
    } else {
      this.pass('Fetch API available for AJAX cart operations');
    }
  }

  async testSocialWall() {
    this.log('Testing Social Wall...');
    
    const socialWall = document.querySelector('.social-wall') ||
                      document.querySelector('[data-social-wall]') ||
                      document.querySelector('#social-wall');
    
    if (!socialWall) {
      this.skip('Social Wall', 'Social wall section not found on current page');
      return;
    }

    // Test platform filters
    const filters = socialWall.querySelectorAll('[data-platform-filter]');
    const expectedPlatforms = ['all', 'instagram', 'youtube', 'tiktok'];
    
    if (filters.length < expectedPlatforms.length) {
      this.addIssue('Social Wall', `Expected ${expectedPlatforms.length} platform filters, found ${filters.length}`, 'low');
    } else {
      this.pass('Social wall has expected platform filters');
    }
  }

  // File Structure Testing
  async testFileStructure() {
    this.log('=== File Structure Testing ===');
    
    const requiredFiles = [
      'assets/enhanced-drink-builder.js',
      'assets/wtf-analytics.js',
      'assets/wtf-accessibility.js',
      'assets/wtf-performance.js',
      'sections/enhanced-drink-builder.liquid',
      'snippets/gbp-hours.liquid',
      'snippets/store-contact.liquid',
      'snippets/enhanced-meta-tags.liquid'
    ];

    // This would require server-side file checking in real implementation
    this.log('File structure testing requires server-side validation');
    this.skip('File Structure', 'Requires server-side file system access');
  }

  // Accessibility Testing
  async testAccessibility() {
    this.log('=== Accessibility Testing ===');
    
    // Test ARIA labels
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, [role="button"]');
    let missingLabels = 0;
    
    interactiveElements.forEach(el => {
      const hasLabel = el.getAttribute('aria-label') || 
                      el.getAttribute('aria-labelledby') ||
                      el.closest('label') ||
                      document.querySelector(`label[for="${el.id}"]`);
      
      if (!hasLabel && el.type !== 'hidden') {
        missingLabels++;
      }
    });

    if (missingLabels > 0) {
      this.addIssue('Accessibility', `${missingLabels} interactive elements missing proper labels`, 'high',
        'Add aria-label, aria-labelledby, or associate with label elements');
    } else {
      this.pass('All interactive elements have proper labels');
    }

    // Test heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;
    let hierarchyIssues = 0;
    
    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      if (currentLevel > previousLevel + 1) {
        hierarchyIssues++;
      }
      previousLevel = currentLevel;
    });

    if (hierarchyIssues > 0) {
      this.addIssue('Accessibility', `${hierarchyIssues} heading hierarchy violations found`, 'medium',
        'Ensure headings follow logical hierarchy (h1 -> h2 -> h3, etc.)');
    } else {
      this.pass('Heading hierarchy is logical');
    }

    // Test focus indicators
    const style = getComputedStyle(document.documentElement);
    const focusStyles = style.getPropertyValue('--focus-color') || 
                       document.querySelector(':focus')?.style.outline;
    
    if (!focusStyles) {
      this.addIssue('Accessibility', 'No focus indicators detected', 'high',
        'Add CSS focus styles for keyboard navigation');
    } else {
      this.pass('Focus indicators appear to be implemented');
    }
  }

  // Performance Testing
  async testPerformance() {
    this.log('=== Performance Testing ===');
    
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        const lcp = navigation.loadEventEnd - navigation.fetchStart;
        const fcp = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        if (lcp > 2500) {
          this.addIssue('Performance', `Load time ${lcp}ms exceeds 2.5s target`, 'medium',
            'Optimize images, minify CSS/JS, implement lazy loading');
        } else {
          this.pass(`Load time ${lcp}ms meets performance target`);
        }
        
        if (fcp > 2000) {
          this.addIssue('Performance', `First Contentful Paint ${fcp}ms exceeds 2s target`, 'medium');
        } else {
          this.pass(`First Contentful Paint ${fcp}ms meets target`);
        }
      }
    } else {
      this.skip('Performance', 'Performance API not available');
    }

    // Test image optimization
    const images = document.querySelectorAll('img');
    let unoptimizedImages = 0;
    
    images.forEach(img => {
      if (!img.loading || !img.src.includes('webp')) {
        unoptimizedImages++;
      }
    });

    if (unoptimizedImages > 0) {
      this.addIssue('Performance', `${unoptimizedImages} images not optimized (missing lazy loading or WebP format)`, 'low',
        'Add loading="lazy" attribute and serve WebP format when possible');
    } else if (images.length > 0) {
      this.pass('All images appear optimized');
    }
  }

  // Cross-browser Testing
  async testBrowserCompatibility() {
    this.log('=== Browser Compatibility Testing ===');
    
    const userAgent = navigator.userAgent;
    const isModernBrowser = 'fetch' in window && 'Promise' in window && 'classList' in document.documentElement;
    
    if (!isModernBrowser) {
      this.addIssue('Browser Compatibility', 'Missing modern browser features', 'high',
        'Add polyfills for fetch, Promise, and classList');
    } else {
      this.pass('Modern browser features available');
    }

    // Test CSS Grid support
    const supportsGrid = CSS.supports('display', 'grid');
    if (!supportsGrid) {
      this.addIssue('Browser Compatibility', 'CSS Grid not supported', 'medium',
        'Add fallback layouts for browsers without Grid support');
    } else {
      this.pass('CSS Grid supported');
    }
  }

  // Generate Report
  generateReport() {
    const total = this.passed + this.failed + this.skipped;
    const successRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
    
    console.log('\n=== WTF Theme Testing Report ===');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`⏭️ Skipped: ${this.skipped}`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (this.issues.length > 0) {
      console.log('\n=== Issues Found ===');
      this.issues.forEach(issue => {
        console.log(`\n${issue.id}. [${issue.severity.toUpperCase()}] ${issue.category}`);
        console.log(`   Description: ${issue.description}`);
        if (issue.fix) {
          console.log(`   Suggested Fix: ${issue.fix}`);
        }
      });
    }

    return {
      total,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      successRate,
      issues: this.issues
    };
  }

  // Run All Tests
  async runAllTests() {
    this.log('Starting WTF Theme comprehensive testing...');
    
    try {
      await this.testCoreFunctionality();
      await this.testAccessibility();
      await this.testPerformance();
      await this.testBrowserCompatibility();
      await this.testFileStructure();
      
      return this.generateReport();
    } catch (error) {
      this.log(`Testing framework error: ${error.message}`, 'error');
      this.addIssue('Framework', `Testing error: ${error.message}`, 'high');
      return this.generateReport();
    }
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WTFThemeTester;
} else if (typeof window !== 'undefined') {
  window.WTFThemeTester = WTFThemeTester;
}