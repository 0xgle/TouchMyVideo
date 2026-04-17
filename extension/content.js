// TouchMyVideo Content Script
// Runs on supported video sites - could be extended to add a download button overlay

(function() {
  'use strict';

  // Only run once
  if (window.__touchMyVideoLoaded) return;
  window.__touchMyVideoLoaded = true;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVideoUrl') {
      sendResponse({ url: window.location.href });
    }
  });
})();
