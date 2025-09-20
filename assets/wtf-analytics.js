/**
 * WTF Analytics - Multi-platform tracking integration
 * Supports GA4, Facebook Pixel, TikTok Pixel
 * Enhanced e-commerce tracking for drink builder
 */

(function() {
  'use strict';

  // Configuration - these should be set via theme settings
  const config = {
    ga4: {
      measurementId: window.WTF_GA4_ID || null,
      enabled: false
    },
    facebook: {
      pixelId: window.WTF_FB_PIXEL_ID || null,
      enabled: false
    },
    tiktok: {
      pixelId: window.WTF_TIKTOK_PIXEL_ID || null,
      enabled: false
    },
    debug: window.WTF_ANALYTICS_DEBUG || false
  };

  // Initialize configuration from meta tags or global variables
  function initConfig() {
    // Check for meta tags
    const ga4Meta = document.querySelector('meta[name="ga4-measurement-id"]');
    const fbMeta = document.querySelector('meta[name="facebook-pixel-id"]');
    const tiktokMeta = document.querySelector('meta[name="tiktok-pixel-id"]');

    if (ga4Meta && ga4Meta.content) {
      config.ga4.measurementId = ga4Meta.content;
      config.ga4.enabled = true;
    }

    if (fbMeta && fbMeta.content) {
      config.facebook.pixelId = fbMeta.content;
      config.facebook.enabled = true;
    }

    if (tiktokMeta && tiktokMeta.content) {
      config.tiktok.pixelId = tiktokMeta.content;
      config.tiktok.enabled = true;
    }

    if (config.debug) {
      console.log('WTF Analytics Config:', config);
    }
  }

  // Google Analytics 4 Integration
  const GA4 = {
    init() {
      if (!config.ga4.enabled || !config.ga4.measurementId) return;

      // Load gtag if not already loaded
      if (typeof gtag === 'undefined') {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4.measurementId}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { dataLayer.push(arguments); };
      }

      gtag('js', new Date());
      gtag('config', config.ga4.measurementId, {
        page_title: document.title,
        page_location: window.location.href
      });

      if (config.debug) console.log('GA4 initialized');
    },

    track(eventName, parameters = {}) {
      if (!config.ga4.enabled || typeof gtag === 'undefined') return;
      
      gtag('event', eventName, parameters);
      if (config.debug) console.log('GA4 Event:', eventName, parameters);
    }
  };

  // Facebook Pixel Integration
  const FacebookPixel = {
    init() {
      if (!config.facebook.enabled || !config.facebook.pixelId) return;

      // Load Facebook Pixel if not already loaded
      if (typeof fbq === 'undefined') {
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      }

      fbq('init', config.facebook.pixelId);
      fbq('track', 'PageView');

      if (config.debug) console.log('Facebook Pixel initialized');
    },

    track(eventName, parameters = {}) {
      if (!config.facebook.enabled || typeof fbq === 'undefined') return;
      
      fbq('track', eventName, parameters);
      if (config.debug) console.log('Facebook Pixel Event:', eventName, parameters);
    }
  };

  // TikTok Pixel Integration
  const TikTokPixel = {
    init() {
      if (!config.tiktok.enabled || !config.tiktok.pixelId) return;

      // Load TikTok Pixel if not already loaded
      if (typeof ttq === 'undefined') {
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        }(window, document, 'ttq');
      }

      ttq.load(config.tiktok.pixelId);
      ttq.page();

      if (config.debug) console.log('TikTok Pixel initialized');
    },

    track(eventName, parameters = {}) {
      if (!config.tiktok.enabled || typeof ttq === 'undefined') return;
      
      ttq.track(eventName, parameters);
      if (config.debug) console.log('TikTok Pixel Event:', eventName, parameters);
    }
  };

  // Enhanced E-commerce Tracking for Drink Builder
  const Ecommerce = {
    // Track when user begins drink customization
    trackBeginCustomization(productData) {
      const eventData = {
        currency: 'USD',
        value: productData.price || 0,
        items: [{
          item_id: productData.id,
          item_name: productData.name || 'Custom Drink',
          item_category: productData.type || 'Beverages',
          price: productData.price || 0,
          quantity: 1
        }]
      };

      GA4.track('begin_checkout', eventData);
      FacebookPixel.track('InitiateCheckout', {
        content_ids: [productData.id],
        content_type: 'product',
        value: productData.price || 0,
        currency: 'USD'
      });
      TikTokPixel.track('InitiateCheckout', {
        content_id: productData.id,
        content_type: 'product',
        value: productData.price || 0,
        currency: 'USD'
      });
    },

    // Track add to cart with customizations
    trackAddToCart(productData, customizations = {}) {
      const eventData = {
        currency: 'USD',
        value: productData.price || 0,
        items: [{
          item_id: productData.id,
          item_name: productData.name || 'Custom Drink',
          item_category: productData.type || 'Beverages',
          item_variant: customizations.size || '',
          price: productData.price || 0,
          quantity: 1,
          // Custom parameters for drink builder
          custom_strain: customizations.strain || '',
          custom_flavors: customizations.flavors || '',
          custom_size: customizations.size || ''
        }]
      };

      GA4.track('add_to_cart', eventData);
      FacebookPixel.track('AddToCart', {
        content_ids: [productData.id],
        content_type: 'product',
        value: productData.price || 0,
        currency: 'USD'
      });
      TikTokPixel.track('AddToCart', {
        content_id: productData.id,
        content_type: 'product',
        value: productData.price || 0,
        currency: 'USD'
      });
    },

    // Track purchase completion
    trackPurchase(orderData) {
      const eventData = {
        transaction_id: orderData.order_id,
        value: orderData.total,
        currency: 'USD',
        items: orderData.items || []
      };

      GA4.track('purchase', eventData);
      FacebookPixel.track('Purchase', {
        content_ids: orderData.items.map(item => item.id),
        content_type: 'product',
        value: orderData.total,
        currency: 'USD'
      });
      TikTokPixel.track('CompletePayment', {
        content_id: orderData.items.map(item => item.id),
        content_type: 'product',
        value: orderData.total,
        currency: 'USD'
      });
    }
  };

  // Performance Tracking
  const Performance = {
    trackCoreWebVitals() {
      if (!config.ga4.enabled) return;

      // Track Core Web Vitals when available
      if ('web-vitals' in window) {
        // If web-vitals library is loaded
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = window.webVitals;
        
        getCLS((metric) => GA4.track('CLS', { value: metric.value }));
        getFID((metric) => GA4.track('FID', { value: metric.value }));
        getFCP((metric) => GA4.track('FCP', { value: metric.value }));
        getLCP((metric) => GA4.track('LCP', { value: metric.value }));
        getTTFB((metric) => GA4.track('TTFB', { value: metric.value }));
      } else {
        // Basic performance tracking with Performance API
        if ('performance' in window) {
          window.addEventListener('load', () => {
            setTimeout(() => {
              const navigation = performance.getEntriesByType('navigation')[0];
              if (navigation) {
                GA4.track('page_load_time', {
                  value: Math.round(navigation.loadEventEnd - navigation.fetchStart)
                });
              }
            }, 0);
          });
        }
      }
    }
  };

  // Main Analytics Controller
  const WTFAnalytics = {
    init() {
      initConfig();
      GA4.init();
      FacebookPixel.init();
      TikTokPixel.init();
      Performance.trackCoreWebVitals();
      
      // Set up global tracking function
      window.wtfTrack = this.track.bind(this);
    },

    track(eventName, data = {}) {
      switch (eventName) {
        case 'begin_customization':
          Ecommerce.trackBeginCustomization(data);
          break;
        case 'add_to_cart':
          Ecommerce.trackAddToCart(data.product, data.customizations);
          break;
        case 'purchase':
          Ecommerce.trackPurchase(data);
          break;
        default:
          // Generic event tracking
          GA4.track(eventName, data);
          if (data.fbEvent) FacebookPixel.track(data.fbEvent, data);
          if (data.tiktokEvent) TikTokPixel.track(data.tiktokEvent, data);
      }
    },

    // Enhanced event tracking for drink builder interactions
    trackDrinkBuilder: {
      sizeChange(size, price) {
        WTFAnalytics.track('drink_size_selected', {
          custom_size: size,
          value: price,
          fbEvent: 'ViewContent',
          tiktokEvent: 'ViewContent'
        });
      },

      strainChange(strains) {
        WTFAnalytics.track('drink_strain_selected', {
          custom_strains: strains.join(', ')
        });
      },

      flavorChange(flavors, totalPumps) {
        WTFAnalytics.track('drink_flavors_selected', {
          custom_flavors: flavors.join(', '),
          pump_count: totalPumps
        });
      },

      customizationComplete(customizationData) {
        WTFAnalytics.track('drink_customization_complete', {
          custom_size: customizationData.size,
          custom_strain: customizationData.strain,
          custom_flavors: customizationData.flavors,
          total_pumps: customizationData.totalPumps,
          final_price: customizationData.price
        });
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WTFAnalytics.init);
  } else {
    WTFAnalytics.init();
  }

  // Export for global use
  window.WTFAnalytics = WTFAnalytics;

})();