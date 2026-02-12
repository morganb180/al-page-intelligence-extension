// Comprehensive page extraction - gets everything needed for Al to act on captured content

class PageExtractor {
  constructor() {
    this.data = {
      metadata: {},
      content: {},
      media: {},
      technical: {},
      actionable: {}
    };
  }

  // Main extraction function
  async extractAll() {
    console.log('🔍 Starting comprehensive page extraction...');
    
    // Run all extraction methods
    this.extractMetadata();
    this.extractContent();
    await this.extractMedia();
    this.extractTechnical();
    this.extractActionableElements();
    this.extractCookies();
    this.extractLocalStorage();
    
    console.log('✅ Page extraction complete', this.data);
    return this.data;
  }

  // Extract page metadata and SEO info
  extractMetadata() {
    const getMeta = (name) => {
      const selectors = [
        `meta[name="${name}"]`,
        `meta[property="${name}"]`,
        `meta[http-equiv="${name}"]`
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el?.content) return el.content;
      }
      return null;
    };

    const getCanonical = () => {
      const link = document.querySelector('link[rel="canonical"]');
      return link?.href || window.location.href;
    };

    this.data.metadata = {
      url: window.location.href,
      canonical: getCanonical(),
      title: document.title,
      description: getMeta('description'),
      keywords: getMeta('keywords'),
      author: getMeta('author'),
      robots: getMeta('robots'),
      viewport: getMeta('viewport'),
      
      // Open Graph
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      ogUrl: getMeta('og:url'),
      ogType: getMeta('og:type'),
      ogSiteName: getMeta('og:site_name'),
      
      // Twitter Cards
      twitterCard: getMeta('twitter:card'),
      twitterSite: getMeta('twitter:site'),
      twitterCreator: getMeta('twitter:creator'),
      twitterTitle: getMeta('twitter:title'),
      twitterDescription: getMeta('twitter:description'),
      twitterImage: getMeta('twitter:image'),
      
      // Additional
      generator: getMeta('generator'),
      theme: getMeta('theme-color'),
      manifest: document.querySelector('link[rel="manifest"]')?.href,
      favicon: document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href,
      
      // Page structure
      headings: {
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 10),
        h3: Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 5)
      }
    };
  }

  // Extract main content and text
  extractContent() {
    // Get main article content using multiple strategies
    const getMainContent = () => {
      // Try semantic HTML5 elements first
      const selectors = [
        'main article',
        'main',
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '#content',
        '[role="main"]',
        '.main-content'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 200) {
          return el;
        }
      }

      // Fallback: find largest text block
      const textBlocks = Array.from(document.querySelectorAll('div, section, article, p'))
        .filter(el => el.innerText.length > 100)
        .sort((a, b) => b.innerText.length - a.innerText.length);
      
      return textBlocks[0] || document.body;
    };

    const mainEl = getMainContent();

    this.data.content = {
      // Main text content
      mainText: mainEl.innerText.trim(),
      fullText: document.body.innerText.trim(),
      
      // HTML content (cleaned)
      mainHtml: this.cleanHtml(mainEl.innerHTML),
      
      // Specific content types
      paragraphs: Array.from(mainEl.querySelectorAll('p'))
        .map(p => p.innerText.trim())
        .filter(text => text.length > 20)
        .slice(0, 20),
      
      lists: Array.from(mainEl.querySelectorAll('ul, ol'))
        .map(list => ({
          type: list.tagName.toLowerCase(),
          items: Array.from(list.querySelectorAll('li')).map(li => li.innerText.trim())
        }))
        .slice(0, 10),
      
      // Code blocks
      codeBlocks: Array.from(document.querySelectorAll('pre, code'))
        .map(code => ({
          language: code.className.match(/language-(\w+)/)?.[1] || 'unknown',
          content: code.innerText
        }))
        .slice(0, 5),
      
      // Tables
      tables: Array.from(mainEl.querySelectorAll('table'))
        .map(table => {
          const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
          const rows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(0, 10).map(row => 
            Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText.trim())
          );
          return { headers, rows };
        })
        .slice(0, 3),
      
      // Word/character counts
      wordCount: mainEl.innerText.split(/\s+/).length,
      charCount: mainEl.innerText.length,
      
      // Language detection
      language: document.documentElement.lang || document.querySelector('meta[http-equiv="content-language"]')?.content || 'en'
    };
  }

  // Extract all media elements
  async extractMedia() {
    const images = [];
    const videos = [];
    const audio = [];

    // Images
    document.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.startsWith('data:image/svg')) {
        images.push({
          src: img.src,
          alt: img.alt || '',
          title: img.title || '',
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          loading: img.loading || 'eager',
          srcset: img.srcset || '',
          sizes: img.sizes || ''
        });
      }
    });

    // Background images
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
        const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && match[1] && !match[1].startsWith('data:')) {
          images.push({
            src: match[1],
            alt: '',
            title: 'Background image',
            width: 0,
            height: 0,
            loading: 'eager',
            type: 'background'
          });
        }
      }
    });

    // Videos
    document.querySelectorAll('video').forEach(video => {
      videos.push({
        src: video.src || video.currentSrc,
        poster: video.poster,
        duration: video.duration,
        width: video.videoWidth || video.width,
        height: video.videoHeight || video.height,
        controls: video.controls,
        autoplay: video.autoplay,
        loop: video.loop,
        muted: video.muted,
        sources: Array.from(video.querySelectorAll('source')).map(s => ({
          src: s.src,
          type: s.type
        }))
      });
    });

    // Embedded videos (YouTube, Vimeo, etc.)
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src;
      if (src) {
        if (src.includes('youtube.com') || src.includes('youtu.be')) {
          const videoId = src.match(/(?:embed\/|watch\?v=|youtu.be\/)([^&?\n]+)/)?.[1];
          videos.push({
            type: 'youtube',
            src: src,
            videoId: videoId,
            width: iframe.width,
            height: iframe.height,
            title: iframe.title
          });
        } else if (src.includes('vimeo.com')) {
          const videoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
          videos.push({
            type: 'vimeo',
            src: src,
            videoId: videoId,
            width: iframe.width,
            height: iframe.height,
            title: iframe.title
          });
        } else if (src.includes('tiktok.com')) {
          videos.push({
            type: 'tiktok',
            src: src,
            width: iframe.width,
            height: iframe.height,
            title: iframe.title
          });
        }
      }
    });

    // Audio
    document.querySelectorAll('audio').forEach(audio => {
      audio.push({
        src: audio.src || audio.currentSrc,
        duration: audio.duration,
        controls: audio.controls,
        autoplay: audio.autoplay,
        loop: audio.loop,
        muted: audio.muted,
        sources: Array.from(audio.querySelectorAll('source')).map(s => ({
          src: s.src,
          type: s.type
        }))
      });
    });

    this.data.media = {
      images: images.slice(0, 50), // Limit to prevent huge payloads
      videos: videos.slice(0, 20),
      audio: audio.slice(0, 10),
      
      // Summary stats
      stats: {
        totalImages: images.length,
        totalVideos: videos.length,
        totalAudio: audio.length
      }
    };
  }

  // Extract technical information
  extractTechnical() {
    // Performance timing
    const perf = performance.timing;
    const loadTime = perf.loadEventEnd - perf.navigationStart;

    this.data.technical = {
      // Page load info
      performance: {
        loadTime: loadTime,
        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
      },

      // Technology detection
      technologies: this.detectTechnologies(),

      // Scripts and stylesheets
      scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).slice(0, 20),
      stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(s => s.href).slice(0, 20),

      // Page structure stats
      structure: {
        totalElements: document.querySelectorAll('*').length,
        totalLinks: document.querySelectorAll('a[href]').length,
        totalImages: document.querySelectorAll('img').length,
        totalForms: document.querySelectorAll('form').length,
        totalInputs: document.querySelectorAll('input, textarea, select').length
      },

      // Security
      security: {
        https: location.protocol === 'https:',
        mixedContent: this.detectMixedContent(),
        csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || null
      }
    };
  }

  // Extract actionable elements (forms, buttons, CTAs)
  extractActionableElements() {
    // Forms
    const forms = Array.from(document.querySelectorAll('form')).map(form => ({
      action: form.action,
      method: form.method,
      id: form.id,
      name: form.name,
      fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
        name: field.name,
        type: field.type,
        id: field.id,
        placeholder: field.placeholder,
        required: field.required,
        value: field.type === 'password' ? '[HIDDEN]' : field.value
      }))
    }));

    // Buttons and CTAs
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[class*="btn"], a[class*="button"]'))
      .map(btn => ({
        text: btn.innerText || btn.value,
        type: btn.type,
        href: btn.href,
        class: btn.className,
        id: btn.id
      }))
      .slice(0, 30);

    // Contact information
    const contactInfo = this.extractContactInfo();

    // Social links
    const socialLinks = Array.from(document.querySelectorAll('a[href*="twitter.com"], a[href*="facebook.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="youtube.com"]'))
      .map(link => ({
        platform: link.href.match(/(twitter|facebook|linkedin|instagram|youtube)/)?.[1],
        url: link.href,
        text: link.innerText
      }));

    this.data.actionable = {
      forms,
      buttons,
      contactInfo,
      socialLinks,
      
      // Email addresses found in text
      emails: (this.data.content?.fullText || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
      
      // Phone numbers found in text
      phones: (this.data.content?.fullText || '').match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []
    };
  }

  // Extract cookies
  extractCookies() {
    const cookies = document.cookie.split(';').map(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      return {
        name: name,
        value: valueParts.join('=') || ''
      };
    }).filter(cookie => cookie.name);

    this.data.technical.cookies = {
      count: cookies.length,
      cookies: cookies.slice(0, 50) // Limit for privacy/size
    };
  }

  // Extract localStorage
  extractLocalStorage() {
    try {
      const localStorage = {};
      const sessionStorage = {};

      // Get localStorage (limit for privacy)
      for (let i = 0; i < Math.min(window.localStorage.length, 20); i++) {
        const key = window.localStorage.key(i);
        if (key && !key.includes('token') && !key.includes('password')) {
          const value = window.localStorage.getItem(key);
          localStorage[key] = value?.length > 100 ? value.substring(0, 100) + '...' : value;
        }
      }

      // Get sessionStorage
      for (let i = 0; i < Math.min(window.sessionStorage.length, 10); i++) {
        const key = window.sessionStorage.key(i);
        if (key && !key.includes('token') && !key.includes('password')) {
          const value = window.sessionStorage.getItem(key);
          sessionStorage[key] = value?.length > 100 ? value.substring(0, 100) + '...' : value;
        }
      }

      this.data.technical.storage = {
        localStorage,
        sessionStorage
      };
    } catch (e) {
      this.data.technical.storage = { error: 'Storage access denied' };
    }
  }

  // Helper methods
  cleanHtml(html) {
    // Remove scripts and styles
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .substring(0, 5000); // Limit size
  }

  detectTechnologies() {
    const tech = {};

    // Framework detection
    if (window.React) tech.react = true;
    if (window.Vue) tech.vue = true;
    if (window.angular) tech.angular = true;
    if (window.jQuery || window.$) tech.jquery = true;
    if (document.querySelector('[ng-app], [ng-controller]')) tech.angularjs = true;
    if (document.querySelector('script[src*="bootstrap"]')) tech.bootstrap = true;
    if (window.gtag || window.ga) tech.googleAnalytics = true;
    if (document.querySelector('script[src*="shopify"]')) tech.shopify = true;
    if (document.querySelector('script[src*="wordpress"]')) tech.wordpress = true;

    return tech;
  }

  detectMixedContent() {
    if (location.protocol !== 'https:') return false;
    
    const httpResources = [];
    document.querySelectorAll('img, script, link').forEach(el => {
      const src = el.src || el.href;
      if (src && src.startsWith('http://')) {
        httpResources.push(src);
      }
    });
    
    return httpResources.length > 0 ? httpResources.slice(0, 10) : false;
  }

  extractContactInfo() {
    const text = this.data.content?.fullText || '';
    
    return {
      emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
      phones: text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [],
      addresses: text.match(/\d+\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5}/g) || []
    };
  }
}

// Export for use by popup
window.PageExtractor = PageExtractor;