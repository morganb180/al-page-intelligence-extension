// Content script for X/Twitter - adds "Send to Al" button to tweets

// Observe for new tweets loading
const observer = new MutationObserver((mutations) => {
  addButtonsToTweets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial run
setTimeout(addButtonsToTweets, 1000);

function addButtonsToTweets() {
  // Find tweet action bars (the row with reply, retweet, like, etc.)
  const actionBars = document.querySelectorAll('[data-testid="tweet"] [role="group"]');
  
  actionBars.forEach(bar => {
    // Skip if already has our button
    if (bar.querySelector('.al-send-btn')) return;
    
    // Find the tweet container
    const tweet = bar.closest('[data-testid="tweet"]');
    if (!tweet) return;
    
    // Create our button
    const btn = document.createElement('button');
    btn.className = 'al-send-btn';
    btn.innerHTML = '⚡';
    btn.title = 'Send to Al';
    btn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      margin-left: 4px;
      border-radius: 50%;
      font-size: 16px;
      transition: background 0.2s;
    `;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(29, 155, 240, 0.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'none';
    });
    
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Extract tweet data
      const tweetText = tweet.querySelector('[data-testid="tweetText"]')?.innerText || '';
      const authorEl = tweet.querySelector('[data-testid="User-Name"]');
      const author = authorEl?.querySelector('a')?.textContent || 'Unknown';
      const tweetUrl = window.location.href;
      
      // Visual feedback
      btn.innerHTML = '✓';
      btn.style.color = '#22c55e';
      
      // Send to background script
      chrome.runtime.sendMessage({
        action: 'sendTweet',
        text: tweetText,
        author: author,
        url: tweetUrl
      });
      
      // Reset after 2 seconds
      setTimeout(() => {
        btn.innerHTML = '⚡';
        btn.style.color = '';
      }, 2000);
    });
    
    bar.appendChild(btn);
  });
}
