// Enhanced popup script with comprehensive extraction

// Load saved settings
chrome.storage.sync.get(['alEnabled'], (config) => {
  document.getElementById('alEnabled').checked = config.alEnabled !== false;
});

// Settings toggle
document.getElementById('settingsToggle').addEventListener('click', () => {
  document.getElementById('settings').classList.toggle('visible');
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', async () => {
  const alEnabled = document.getElementById('alEnabled').checked;
  
  chrome.storage.sync.set({ alEnabled });
  showStatus('Settings saved!', 'success');
  
  // Test connection
  try {
    const response = await fetch('http://165.22.136.90:8092/status', {
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      document.getElementById('connectionStatus').innerHTML = '✅ Connected to Al @ 165.22.136.90';
    } else {
      document.getElementById('connectionStatus').innerHTML = '⚠️ Connection issue - check settings';
    }
  } catch (error) {
    document.getElementById('connectionStatus').innerHTML = '❌ Cannot reach Al - check network';
  }
});

// FULL CAPTURE - The comprehensive extraction
document.getElementById('fullCaptureBtn').addEventListener('click', async () => {
  const config = await chrome.storage.sync.get(['alEnabled']);
  if (config.alEnabled === false) {
    showStatus('Enable Al integration first', 'error');
    return;
  }
  
  showStatus('🔍 Extracting everything...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject and run comprehensive extractor
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['comprehensive-extractor.js']
    });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const extractor = new PageExtractor();
        const data = await extractor.extractAll();
        return data;
      }
    });
    
    const pageData = results[0]?.result;
    
    if (!pageData) {
      showStatus('Failed to extract page data', 'error');
      return;
    }

    // Format the comprehensive data for Al
    const message = formatComprehensiveData(pageData, tab);
    
    await sendToAl(message);
    showStatus('🎯 Full page capture sent to Al!', 'success');
    
    // Show summary
    const summary = `Captured: ${pageData.content.wordCount} words, ${pageData.media.stats.totalImages} images, ${pageData.media.stats.totalVideos} videos, ${pageData.actionable.forms.length} forms`;
    document.getElementById('lastCapture').textContent = summary;
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    console.error('Full capture error:', error);
  }
});

// Quick screenshot with basic info
document.getElementById('screenshotBtn').addEventListener('click', async () => {
  const config = await chrome.storage.sync.get(['alEnabled']);
  if (config.alEnabled === false) {
    showStatus('Enable Al integration first', 'error');
    return;
  }
  
  showStatus('📸 Capturing screenshot...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Take actual screenshot
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png', quality: 90});
    
    // Get basic page info
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getMeta = (name) => {
          const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return el?.content || '';
        };
        
        return {
          title: document.title,
          description: getMeta('description'),
          h1: document.querySelector('h1')?.innerText || '',
          mainText: (document.querySelector('main, article, .content')?.innerText || document.body.innerText).substring(0, 500)
        };
      }
    });
    
    const info = results[0]?.result || {};
    
    const message = `📸 **SCREENSHOT CAPTURED**\n\n` +
      `**Page:** ${info.title}\n` +
      `**URL:** ${tab.url}\n` +
      `**H1:** ${info.h1}\n` +
      `**Description:** ${info.description}\n\n` +
      `**Preview Text:**\n${info.mainText}...\n\n` +
      `**Screenshot:** [Base64 data attached - ${Math.round(screenshot.length/1024)}KB]`;
    
    // Send with screenshot as attachment
    await sendToAlWithImage(message, screenshot);
    showStatus('📸 Screenshot sent to Al!', 'success');
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
});

// Enhanced video extraction
document.getElementById('videoBtn').addEventListener('click', async () => {
  const config = await chrome.storage.sync.get(['alEnabled']);
  if (config.alEnabled === false) {
    showStatus('Enable Al integration first', 'error');
    return;
  }
  
  showStatus('🎬 Scanning for videos...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const videos = [];
        
        // HTML5 video elements with full details
        document.querySelectorAll('video').forEach(v => {
          videos.push({
            type: 'HTML5 Video',
            src: v.src || v.currentSrc,
            poster: v.poster,
            duration: v.duration ? `${Math.round(v.duration)}s` : 'Unknown',
            dimensions: `${v.videoWidth || v.width}x${v.videoHeight || v.height}`,
            controls: v.controls,
            autoplay: v.autoplay,
            sources: Array.from(v.querySelectorAll('source')).map(s => `${s.type}: ${s.src}`)
          });
        });
        
        // YouTube videos with metadata
        document.querySelectorAll('iframe[src*="youtube"], iframe[src*="youtu.be"]').forEach(f => {
          const match = f.src.match(/(?:embed\/|watch\?v=|youtu.be\/)([^&?\n]+)/);
          videos.push({
            type: 'YouTube Embed',
            videoId: match?.[1] || 'Unknown',
            src: f.src,
            dimensions: `${f.width}x${f.height}`,
            title: f.title
          });
        });
        
        // Vimeo videos
        document.querySelectorAll('iframe[src*="vimeo"]').forEach(f => {
          const match = f.src.match(/vimeo\.com\/(\d+)/);
          videos.push({
            type: 'Vimeo Embed',
            videoId: match?.[1] || 'Unknown',
            src: f.src,
            dimensions: `${f.width}x${f.height}`,
            title: f.title
          });
        });
        
        // TikTok embeds
        document.querySelectorAll('iframe[src*="tiktok"]').forEach(f => {
          videos.push({
            type: 'TikTok Embed',
            src: f.src,
            dimensions: `${f.width}x${f.height}`
          });
        });
        
        // Video thumbnails and previews
        document.querySelectorAll('img[src*="video"], img[alt*="video"], img[class*="video"]').forEach(img => {
          videos.push({
            type: 'Video Thumbnail',
            src: img.src,
            alt: img.alt,
            dimensions: `${img.naturalWidth}x${img.naturalHeight}`
          });
        });
        
        return videos;
      }
    });
    
    const videos = results[0]?.result || [];
    
    if (videos.length === 0) {
      showStatus('No videos found', 'info');
      return;
    }
    
    const videoDetails = videos.map(v => {
      let details = `**${v.type}**`;
      if (v.title) details += `\nTitle: ${v.title}`;
      if (v.duration) details += `\nDuration: ${v.duration}`;
      if (v.dimensions) details += `\nSize: ${v.dimensions}`;
      if (v.videoId) details += `\nVideo ID: ${v.videoId}`;
      details += `\nURL: ${v.src}`;
      if (v.sources?.length) details += `\nSources: ${v.sources.join(', ')}`;
      return details;
    }).join('\n\n---\n\n');
    
    const message = `🎬 **VIDEO ANALYSIS** (${videos.length} found)\n\n` +
      `**Page:** ${tab.title}\n` +
      `**URL:** ${tab.url}\n\n` +
      `**Videos Found:**\n\n${videoDetails}`;
    
    await sendToAl(message);
    showStatus(`Found ${videos.length} videos - sent to Al!`, 'success');
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
});

// Enhanced links extraction with context
document.getElementById('linksBtn').addEventListener('click', async () => {
  const config = await chrome.storage.sync.get(['alEnabled']);
  if (config.alEnabled === false) {
    showStatus('Enable Al integration first', 'error');
    return;
  }
  
  showStatus('🔗 Analyzing links...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const links = [];
        const seen = new Set();
        
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.href;
          if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !seen.has(href)) {
            seen.add(href);
            
            const text = a.innerText.trim();
            const isExternal = !href.startsWith(window.location.origin);
            const isDownload = a.hasAttribute('download') || href.match(/\.(pdf|doc|zip|exe|dmg)$/i);
            
            let category = 'internal';
            if (isExternal) category = 'external';
            if (isDownload) category = 'download';
            if (href.includes('mailto:')) category = 'email';
            if (href.includes('tel:')) category = 'phone';
            if (href.match(/\.(jpg|png|gif|webp|svg)$/i)) category = 'image';
            
            links.push({
              url: href,
              text: text || '[No text]',
              category,
              title: a.title,
              target: a.target
            });
          }
        });
        
        return links.slice(0, 50); // Limit to prevent huge payloads
      }
    });
    
    const links = results[0]?.result || [];
    
    // Group links by category
    const grouped = {};
    links.forEach(link => {
      if (!grouped[link.category]) grouped[link.category] = [];
      grouped[link.category].push(link);
    });
    
    let linksSummary = '';
    Object.entries(grouped).forEach(([category, categoryLinks]) => {
      linksSummary += `\n**${category.toUpperCase()} LINKS (${categoryLinks.length}):**\n`;
      categoryLinks.slice(0, 10).forEach(link => {
        linksSummary += `• ${link.text}\n  ${link.url}\n`;
        if (link.title) linksSummary += `  Title: ${link.title}\n`;
      });
      if (categoryLinks.length > 10) {
        linksSummary += `  ... and ${categoryLinks.length - 10} more\n`;
      }
    });
    
    const message = `🔗 **LINK ANALYSIS** (${links.length} total links)\n\n` +
      `**Page:** ${tab.title}\n` +
      `**URL:** ${tab.url}\n${linksSummary}`;
    
    await sendToAl(message);
    showStatus(`Analyzed ${links.length} links - sent to Al!`, 'success');
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
});

// Quick send with current page context
document.getElementById('sendBtn').addEventListener('click', async () => {
  const config = await chrome.storage.sync.get(['alEnabled']);
  if (config.alEnabled === false) {
    showStatus('Enable Al integration first', 'error');
    return;
  }
  
  const message = document.getElementById('quickMessage').value.trim();
  if (!message) {
    showStatus('Enter a message first', 'error');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Get some context about the current page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText || '',
        description: document.querySelector('meta[name="description"]')?.content || '',
        selectedText: window.getSelection().toString()
      };
    }
  });
  
  const context = results[0]?.result || {};
  
  let fullMessage = `📝 **USER NOTE:**\n\n${message}\n\n`;
  fullMessage += `**Page Context:**\n`;
  fullMessage += `Title: ${context.title}\n`;
  fullMessage += `URL: ${tab.url}\n`;
  if (context.h1) fullMessage += `H1: ${context.h1}\n`;
  if (context.description) fullMessage += `Description: ${context.description}\n`;
  if (context.selectedText) fullMessage += `\n**Selected Text:**\n${context.selectedText}\n`;
  
  await sendToAl(fullMessage);
  document.getElementById('quickMessage').value = '';
  showStatus('Note with context sent to Al!', 'success');
});

// Format comprehensive data for Al
function formatComprehensiveData(data, tab) {
  let message = `🎯 **COMPREHENSIVE PAGE CAPTURE**\n\n`;
  
  // Basic info
  message += `**URL:** ${data.metadata.url}\n`;
  message += `**Title:** ${data.metadata.title}\n`;
  if (data.metadata.description) message += `**Description:** ${data.metadata.description}\n`;
  message += `**Captured:** ${new Date().toISOString()}\n\n`;
  
  // Content summary
  message += `**CONTENT ANALYSIS:**\n`;
  message += `• Words: ${data.content.wordCount.toLocaleString()}\n`;
  message += `• Characters: ${data.content.charCount.toLocaleString()}\n`;
  message += `• Language: ${data.content.language}\n`;
  message += `• Headings: H1(${data.metadata.headings.h1.length}) H2(${data.metadata.headings.h2.length}) H3(${data.metadata.headings.h3.length})\n\n`;
  
  // Main headings
  if (data.metadata.headings.h1.length > 0) {
    message += `**H1 HEADINGS:**\n`;
    data.metadata.headings.h1.forEach(h => message += `• ${h}\n`);
    message += `\n`;
  }
  
  // Media summary
  message += `**MEDIA INVENTORY:**\n`;
  message += `• Images: ${data.media.stats.totalImages}\n`;
  message += `• Videos: ${data.media.stats.totalVideos}\n`;
  message += `• Audio: ${data.media.stats.totalAudio}\n\n`;
  
  // Key images
  if (data.media.images.length > 0) {
    message += `**KEY IMAGES:**\n`;
    data.media.images.slice(0, 5).forEach(img => {
      message += `• ${img.src}\n`;
      if (img.alt) message += `  Alt: ${img.alt}\n`;
      message += `  Size: ${img.width}x${img.height}\n`;
    });
    if (data.media.images.length > 5) message += `  ... and ${data.media.images.length - 5} more images\n`;
    message += `\n`;
  }
  
  // Videos with details
  if (data.media.videos.length > 0) {
    message += `**VIDEOS FOUND:**\n`;
    data.media.videos.forEach(video => {
      message += `• ${video.type || 'Video'}\n`;
      message += `  URL: ${video.src || video.videoId}\n`;
      if (video.title) message += `  Title: ${video.title}\n`;
      if (video.duration) message += `  Duration: ${video.duration}\n`;
      if (video.width && video.height) message += `  Size: ${video.width}x${video.height}\n`;
    });
    message += `\n`;
  }
  
  // Actionable elements
  message += `**ACTIONABLE ELEMENTS:**\n`;
  message += `• Forms: ${data.actionable.forms.length}\n`;
  message += `• Buttons/CTAs: ${data.actionable.buttons.length}\n`;
  message += `• Social Links: ${data.actionable.socialLinks.length}\n`;
  message += `• Email addresses: ${data.actionable.emails.length}\n`;
  message += `• Phone numbers: ${data.actionable.phones.length}\n\n`;
  
  // Forms details
  if (data.actionable.forms.length > 0) {
    message += `**FORMS FOUND:**\n`;
    data.actionable.forms.forEach((form, i) => {
      message += `${i+1}. ${form.action || 'No action'} (${form.method || 'GET'})\n`;
      message += `   Fields: ${form.fields.map(f => `${f.name}(${f.type})`).join(', ')}\n`;
    });
    message += `\n`;
  }
  
  // Technology stack
  const techList = Object.keys(data.technical.technologies).filter(key => data.technical.technologies[key]);
  if (techList.length > 0) {
    message += `**TECHNOLOGY DETECTED:**\n`;
    message += `${techList.map(tech => `• ${tech}`).join('\n')}\n\n`;
  }
  
  // Performance
  if (data.technical.performance.loadTime) {
    message += `**PERFORMANCE:**\n`;
    message += `• Load Time: ${data.technical.performance.loadTime}ms\n`;
    message += `• DOM Ready: ${data.technical.performance.domContentLoaded}ms\n\n`;
  }
  
  // Security info
  message += `**SECURITY:**\n`;
  message += `• HTTPS: ${data.technical.security.https ? 'Yes' : 'No'}\n`;
  message += `• Mixed Content: ${data.technical.security.mixedContent ? 'Found' : 'None'}\n`;
  message += `• Cookies: ${data.technical.cookies.count}\n\n`;
  
  // Main content preview
  message += `**CONTENT PREVIEW:**\n`;
  message += `${data.content.mainText.substring(0, 1000)}${data.content.mainText.length > 1000 ? '...' : ''}\n\n`;
  
  // Contact information found
  if (data.actionable.emails.length > 0 || data.actionable.phones.length > 0) {
    message += `**CONTACT INFO FOUND:**\n`;
    if (data.actionable.emails.length > 0) {
      message += `Emails: ${data.actionable.emails.join(', ')}\n`;
    }
    if (data.actionable.phones.length > 0) {
      message += `Phones: ${data.actionable.phones.join(', ')}\n`;
    }
    message += `\n`;
  }
  
  // SEO/Meta information
  if (data.metadata.ogTitle || data.metadata.twitterCard) {
    message += `**SEO/SOCIAL META:**\n`;
    if (data.metadata.ogTitle) message += `• OG Title: ${data.metadata.ogTitle}\n`;
    if (data.metadata.ogDescription) message += `• OG Description: ${data.metadata.ogDescription}\n`;
    if (data.metadata.ogImage) message += `• OG Image: ${data.metadata.ogImage}\n`;
    if (data.metadata.twitterCard) message += `• Twitter Card: ${data.metadata.twitterCard}\n`;
    message += `\n`;
  }
  
  message += `**📋 SUMMARY:**\n`;
  message += `This comprehensive capture includes all page content, media assets, interactive elements, technical details, and actionable data. You have everything needed to understand and act on this page.`;
  
  return message;
}

// Send to Al via bridge server
async function sendToAl(text) {
  try {
    const response = await fetch('http://165.22.136.90:8092/send', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `🔍 EXTENSION: ${text}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Bridge server error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send to Al:', error);
    throw new Error(`Send failed: ${error.message}`);
  }
}

// Send to Al with image attachment
async function sendToAlWithImage(text, imageDataUrl) {
  try {
    const response = await fetch('http://165.22.136.90:8092/send-image', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `🔍 EXTENSION: ${text}`,
        image: imageDataUrl
      })
    });
    
    if (!response.ok) {
      throw new Error(`Bridge server error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send image to Al:', error);
    throw new Error(`Send failed: ${error.message}`);
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  
  if (type === 'success') {
    setTimeout(() => { status.className = 'status'; }, 3000);
  }
}