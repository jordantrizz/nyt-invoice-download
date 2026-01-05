/**
 * content.js – NYT Invoice Downloader
 * Content script that safely injects the page-context script into the DOM.
 */

(function() {
  // Guard against re-injection
  if (window.__nytInvoiceDownloaderInjected) {
    console.warn('[NYT Invoice Downloader] Already injected. Skipping re-injection.');
    return;
  }
  window.__nytInvoiceDownloaderInjected = true;

  console.log('[NYT Invoice Downloader] Content script loaded.');

  /**
   * Inject the page-context script (injected.js) into the DOM.
   * This allows the script to access and monkeypatch window.fetch directly.
   */
  function injectPageScript() {
    try {
      const scriptElement = document.createElement('script');
      scriptElement.type = 'text/javascript';
      scriptElement.src = chrome.runtime.getURL('injected.js');
      scriptElement.onload = function() {
        console.log('[NYT Invoice Downloader] injected.js loaded successfully.');
        this.remove();
      };
      scriptElement.onerror = function() {
        console.error('[NYT Invoice Downloader] Failed to load injected.js.');
        this.remove();
      };

      // Append to document.documentElement to ensure early execution
      (document.documentElement || document.head || document.body).appendChild(scriptElement);
    } catch (error) {
      console.error('[NYT Invoice Downloader] Error injecting script:', error);
    }
  }

  // Wait for DOM to be ready, then inject
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPageScript);
  } else {
    // DOM is already ready
    injectPageScript();
  }
})();
