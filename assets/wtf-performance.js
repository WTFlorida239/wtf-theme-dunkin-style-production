/**
 * WTF Performance - Core Web Vitals monitoring and optimization
 * Tracks LCP, FID, CLS, FCP, TTFB and provides optimization utilities
 */

(function() {
  'use strict';

  const WTFPerformance = {
    // Configuration
    config: {
      enableMetrics: true,
      enableOptimizations: true,
      enableNetworkAware: true,
      debug: window.WTF_PERF_DEBUG || false,
      thresholds: {
        LCP: 2500, // Largest Contentful Paint (ms)
        FID: 100,  // First Input Delay (ms)
        CLS: 0.1,  // Cumulative Layout Shift
        FCP: 2000, // First Contentful Paint (ms)
        TTFB: 800  // Time to First Byte (ms)
      }
    },

    // Metrics storage
    metrics: {},
    observers: [],

    // Initialize performance monitoring
    init() {
      if (this.config.enableMetrics) {
        this.setupCoreWebVitals();
        this.setupCustomMetrics();
      }

      if (this.config.enableOptimizations) {
        this.setupOptimizations();
      }

      if (this.config.enableNetworkAware) {
        this.setupNetworkAwareness();
      }

      this.setupResourceHints();
      
      if (this.config.debug) {
        console.log('WTF Performance initialized');
      }
    },

    // Core Web Vitals Monitoring
    setupCoreWebVitals() {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.recordMetric('LCP', lastEntry.startTime);
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.push(lcpObserver);
        } catch (e) {
          if (this.config.debug) console.warn('LCP observer not supported');
        }

        // First Input Delay (FID)
        try {
          const fidObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              this.recordMetric('FID', entry.processingStart - entry.startTime);
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          this.observers.push(fidObserver);
        } catch (e) {
          if (this.config.debug) console.warn('FID observer not supported');
        }

        // Cumulative Layout Shift (CLS)
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            this.recordMetric('CLS', clsValue);
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.push(clsObserver);
        } catch (e) {
          if (this.config.debug) console.warn('CLS observer not supported');
        }

        // Navigation Timing for FCP and TTFB
        try {
          const navObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              if (entry.responseStart) {
                this.recordMetric('TTFB', entry.responseStart - entry.fetchStart);
              }
              if (entry.firstContentfulPaint) {
                this.recordMetric('FCP', entry.firstContentfulPaint);
              }
            });
          });
          navObserver.observe({ entryTypes: ['navigation'] });
          this.observers.push(navObserver);
        } catch (e) {
          if (this.config.debug) console.warn('Navigation observer not supported');
        }

        // Paint Timing for FCP fallback
        try {
          const paintObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              if (entry.name === 'first-contentful-paint') {
                this.recordMetric('FCP', entry.startTime);
              }
            });
          });
          paintObserver.observe({ entryTypes: ['paint'] });
          this.observers.push(paintObserver);
        } catch (e) {
          if (this.config.debug) console.warn('Paint observer not supported');
        }
      }

      // Fallback for browsers without PerformanceObserver
      this.setupFallbackMetrics();
    },

    // Record and analyze metrics
    recordMetric(name, value) {
      this.metrics[name] = value;
      
      const threshold = this.config.thresholds[name];
      const status = threshold ? (value <= threshold ? 'good' : 'poor') : 'unknown';
      
      if (this.config.debug) {
        console.log(`${name}: ${Math.round(value)}${name === 'CLS' ? '' : 'ms'} (${status})`);
      }

      // Send to analytics if available
      if (window.wtfTrack) {
        window.wtfTrack(`performance_${name.toLowerCase()}`, {
          value: Math.round(value),
          status: status,
          threshold: threshold
        });
      }

      // Trigger optimization if needed
      if (status === 'poor') {
        this.handlePoorPerformance(name, value);
      }
    },

    // Handle poor performance metrics
    handlePoorPerformance(metric, value) {
      switch (metric) {
        case 'LCP':
          this.optimizeLCP();
          break;
        case 'FID':
          this.optimizeFID();
          break;
        case 'CLS':
          this.optimizeCLS();
          break;
        case 'FCP':
          this.optimizeFCP();
          break;
        case 'TTFB':
          this.reportSlowServer();
          break;
      }
    },

    // Fallback metrics for older browsers
    setupFallbackMetrics() {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            // Calculate basic metrics
            if (!this.metrics.TTFB) {
              this.recordMetric('TTFB', navigation.responseStart - navigation.fetchStart);
            }
            if (!this.metrics.FCP) {
              this.recordMetric('FCP', navigation.domContentLoadedEventEnd - navigation.fetchStart);
            }
            
            // Basic load time
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            this.recordMetric('LOAD', loadTime);
          }
        }, 0);
      });
    },

    // Custom Performance Metrics
    setupCustomMetrics() {
      // Drink Builder Load Time
      this.measureDrinkBuilderPerformance();
      
      // Cart Operations
      this.measureCartPerformance();
      
      // Image Loading
      this.measureImagePerformance();
    },

    measureDrinkBuilderPerformance() {
      const drinkBuilder = document.querySelector('#enhanced-drink-builder');
      if (drinkBuilder) {
        const startTime = performance.now();
        
        const observer = new MutationObserver(() => {
          const isReady = drinkBuilder.querySelector('input[name="size"]:checked') && 
                         drinkBuilder.querySelector('#builder-price');
          
          if (isReady) {
            const loadTime = performance.now() - startTime;
            this.recordMetric('DRINK_BUILDER_READY', loadTime);
            observer.disconnect();
          }
        });
        
        observer.observe(drinkBuilder, { childList: true, subtree: true });
        
        // Timeout after 5 seconds
        setTimeout(() => observer.disconnect(), 5000);
      }
    },

    measureCartPerformance() {
      // Measure add to cart operations
      document.addEventListener('cart:add:success', (e) => {
        const addTime = performance.now() - (e.detail.startTime || 0);
        this.recordMetric('ADD_TO_CART', addTime);
      });

      // Measure cart updates
      document.addEventListener('cart:updated', (e) => {
        const updateTime = performance.now() - (e.detail.startTime || 0);
        this.recordMetric('CART_UPDATE', updateTime);
      });
    },

    measureImagePerformance() {
      const images = document.querySelectorAll('img');
      let loadedImages = 0;
      const startTime = performance.now();

      images.forEach(img => {
        if (img.complete) {
          loadedImages++;
        } else {
          img.addEventListener('load', () => {
            loadedImages++;
            if (loadedImages === images.length) {
              const allImagesLoaded = performance.now() - startTime;
              this.recordMetric('ALL_IMAGES_LOADED', allImagesLoaded);
            }
          });
        }
      });
    },

    // Performance Optimizations
    setupOptimizations() {
      this.optimizeImages();
      this.optimizeScripts();
      this.optimizeFonts();
      this.optimizeCSS();
    },

    optimizeImages() {
      // Lazy load images that aren't in viewport
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
              }
            }
          });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
          imageObserver.observe(img);
        });
      }

      // Preload critical images
      const heroImages = document.querySelectorAll('.hero img, [data-preload]');
      heroImages.forEach(img => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src || img.dataset.src;
        document.head.appendChild(link);
      });
    },

    optimizeScripts() {
      // Defer non-critical scripts
      const scripts = document.querySelectorAll('script[data-defer]');
      scripts.forEach(script => {
        script.defer = true;
      });

      // Load analytics scripts after interaction
      let interacted = false;
      const loadAnalytics = () => {
        if (!interacted) {
          interacted = true;
          if (window.WTFAnalytics && !window.WTFAnalytics.initialized) {
            window.WTFAnalytics.init();
          }
        }
      };

      ['mousedown', 'touchstart', 'keydown', 'scroll'].forEach(event => {
        document.addEventListener(event, loadAnalytics, { once: true, passive: true });
      });
    },

    optimizeFonts() {
      // Font loading optimization
      if ('fonts' in document) {
        document.fonts.ready.then(() => {
          this.recordMetric('FONTS_LOADED', performance.now());
        });
      }

      // Preload critical fonts
      const criticalFonts = [
        '/assets/fonts/primary-font.woff2',
        '/assets/fonts/secondary-font.woff2'
      ];

      criticalFonts.forEach(font => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        link.href = font;
        document.head.appendChild(link);
      });
    },

    optimizeCSS() {
      // Load non-critical CSS asynchronously
      const nonCriticalCSS = document.querySelectorAll('link[data-async]');
      nonCriticalCSS.forEach(link => {
        link.media = 'print';
        link.addEventListener('load', () => {
          link.media = 'all';
        });
      });
    },

    // Specific optimizations for poor metrics
    optimizeLCP() {
      if (this.config.debug) console.log('Optimizing LCP...');
      
      // Preload LCP candidate images
      const lcpCandidates = document.querySelectorAll('.hero img, .banner img, [data-lcp]');
      lcpCandidates.forEach(img => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src || img.dataset.src;
        document.head.appendChild(link);
      });
    },

    optimizeFID() {
      if (this.config.debug) console.log('Optimizing FID...');
      
      // Break up long tasks
      this.scheduleWork();
      
      // Remove unused event listeners
      this.cleanupEventListeners();
    },

    optimizeCLS() {
      if (this.config.debug) console.log('Optimizing CLS...');
      
      // Add size attributes to images without them
      const images = document.querySelectorAll('img:not([width]):not([height])');
      images.forEach(img => {
        img.addEventListener('load', function() {
          this.width = this.naturalWidth;
          this.height = this.naturalHeight;
        });
      });
    },

    optimizeFCP() {
      if (this.config.debug) console.log('Optimizing FCP...');
      
      // Inline critical CSS
      const criticalCSS = document.querySelector('style[data-critical]');
      if (criticalCSS) {
        criticalCSS.innerHTML = this.getCriticalCSS();
      }
    },

    reportSlowServer() {
      if (this.config.debug) console.log('Slow server response detected');
      
      // Report to analytics
      if (window.wtfTrack) {
        window.wtfTrack('slow_server_response', {
          ttfb: this.metrics.TTFB
        });
      }
    },

    // Network-aware loading
    setupNetworkAwareness() {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        
        // Adapt based on network conditions
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.enableLowDataMode();
        }
        
        // Monitor connection changes
        connection.addEventListener('change', () => {
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            this.enableLowDataMode();
          } else {
            this.disableLowDataMode();
          }
        });
      }
    },

    enableLowDataMode() {
      document.documentElement.classList.add('low-data-mode');
      
      // Disable non-essential features
      const nonEssential = document.querySelectorAll('[data-low-data="disable"]');
      nonEssential.forEach(el => el.hidden = true);
      
      if (this.config.debug) console.log('Low data mode enabled');
    },

    disableLowDataMode() {
      document.documentElement.classList.remove('low-data-mode');
      
      const nonEssential = document.querySelectorAll('[data-low-data="disable"]');
      nonEssential.forEach(el => el.hidden = false);
      
      if (this.config.debug) console.log('Low data mode disabled');
    },

    // Resource hints
    setupResourceHints() {
      // DNS prefetch for external domains
      const externalDomains = [
        '//www.google-analytics.com',
        '//connect.facebook.net',
        '//analytics.tiktok.com'
      ];

      externalDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      });

      // Preconnect to important origins
      const preconnectOrigins = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
      ];

      preconnectOrigins.forEach(origin => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    },

    // Utility functions
    scheduleWork() {
      if ('scheduler' in window && 'postTask' in scheduler) {
        // Use Scheduler API for better task scheduling
        scheduler.postTask(() => this.processNonCriticalWork(), { priority: 'background' });
      } else if ('requestIdleCallback' in window) {
        // Fallback to requestIdleCallback
        requestIdleCallback(() => this.processNonCriticalWork());
      } else {
        // Fallback to setTimeout
        setTimeout(() => this.processNonCriticalWork(), 0);
      }
    },

    processNonCriticalWork() {
      // Process non-critical tasks here
      this.cleanupOldMetrics();
      this.validatePerformanceThresholds();
    },

    cleanupEventListeners() {
      // Remove passive event listeners that are no longer needed
      // This would be implemented based on specific event listener usage
    },

    cleanupOldMetrics() {
      // Keep only recent metrics
      const maxAge = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      
      Object.keys(this.metrics).forEach(key => {
        if (this.metrics[key].timestamp && now - this.metrics[key].timestamp > maxAge) {
          delete this.metrics[key];
        }
      });
    },

    validatePerformanceThresholds() {
      const report = this.generatePerformanceReport();
      if (this.config.debug) {
        console.table(report);
      }
      return report;
    },

    getCriticalCSS() {
      // Return critical CSS for above-the-fold content
      return `
        .hero, .wtf-builder, .btn-primary {
          /* Critical styles */
        }
      `;
    },

    // Performance reporting
    generatePerformanceReport() {
      const report = {};
      
      Object.entries(this.config.thresholds).forEach(([metric, threshold]) => {
        const value = this.metrics[metric];
        if (value !== undefined) {
          report[metric] = {
            value: Math.round(value),
            threshold: threshold,
            status: value <= threshold ? 'good' : 'poor'
          };
        }
      });

      return report;
    },

    // Cleanup
    destroy() {
      this.observers.forEach(observer => observer.disconnect());
      this.observers = [];
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WTFPerformance.init());
  } else {
    WTFPerformance.init();
  }

  // Export for global use
  window.WTFPerformance = WTFPerformance;
  window.wtfPerf = WTFPerformance; // Shorter alias

})();