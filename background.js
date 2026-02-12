// Send to Al - Background Service Worker

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToAl",
    title: "⚡ Send to Al",
    contexts: ["selection", "page", "link"]
  });
  
  chrome.contextMenus.create({
    id: "sendToAlIdea",
    title: "💡 Send as Idea",
    contexts: ["selection", "page"]
  });
  
  chrome.contextMenus.create({
    id: "sendToAlCompetitor",
    title: "🔍 Send as Competitor Intel",
    contexts: ["selection", "page", "link"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let content = '';
  let prefix = '';
  
  // Determine content type
  if (info.menuItemId === 'sendToAlIdea') {
    prefix = '💡 IDEA: ';
  } else if (info.menuItemId === 'sendToAlCompetitor') {
    prefix = '🔍 COMPETITOR: ';
  } else {
    prefix = '📌 NOTE: ';
  }
  
  // Get content
  if (info.selectionText) {
    content = info.selectionText;
  } else if (info.linkUrl) {
    content = info.linkUrl;
  } else {
    content = tab.url;
  }
  
  // Get page title
  const pageTitle = tab.title || '';
  const pageUrl = tab.url || '';
  
  // Build message
  const message = `${prefix}${content}\n\nSource: ${pageTitle}\n${pageUrl}`;
  
  // Send to Al via Telegram
  await sendToTelegram(message);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendTweet') {
    const message = `🐦 X/TWITTER:\n\n${request.author}: "${request.text}"\n\n${request.url}`;
    sendToTelegram(message).then(() => sendResponse({success: true}));
    return true;
  }
  
  if (request.action === 'sendCustom') {
    sendToTelegram(request.message).then(() => sendResponse({success: true}));
    return true;
  }
});

// Send message directly to Al via OpenClaw session API
async function sendToTelegram(text) {
  // Check if Al integration is enabled
  const config = await chrome.storage.sync.get(['alEnabled']);
  
  if (config.alEnabled === false) {
    // Show disabled message
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    return;
  }
  
  try {
    // Send directly to Al's OpenClaw session
    const response = await fetch(`http://165.22.136.90:18789/api/sessions/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dbba0049762540d60dcf821b3c14d6ca39aa73bcecf052ab44d6f008e8c4298f'
      },
      body: JSON.stringify({
        sessionKey: 'agent:main:main',
        message: text
      })
    });
    
    if (response.ok) {
      // Show success badge
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
    } else {
      console.error('OpenClaw API error:', response.status, response.statusText);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  } catch (error) {
    console.error('Send failed:', error);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }
}
