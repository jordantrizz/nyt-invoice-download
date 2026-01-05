/**
 * injected.js – NYT Invoice Downloader
 * Page-context script that hooks window.fetch to capture invoice data.
 */

(function() {
  'use strict';

  // Guard against re-injection
  if (window.__nytInvoiceDownloaderPageInjected) {
    console.warn('[NYT Invoice Downloader] Page injection already active. Skipping re-injection.');
    return;
  }
  window.__nytInvoiceDownloaderPageInjected = true;

  console.log('[NYT Invoice Downloader] Page-context script initialized.');

  // In-memory map to store invoiceId -> pdfDownloadUrl
  const invoicePdfMap = new Map();

  /**
   * Hook window.fetch to intercept GraphQL calls
   */
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [resource, init] = args;

    // Check if this is a request to the target GraphQL endpoint
    const isTargetEndpoint =
      typeof resource === 'string' &&
      resource.includes('samizdat-graphql.nytimes.com/graphql/v2');

    if (isTargetEndpoint && init && init.body) {
      try {
        // Parse the request body to extract operation details
        const body = JSON.parse(init.body);
        const operationName = body.operationName;
        const variables = body.variables || {};

        // Log the operation name (for debugging)
        console.log('[NYT Invoice Downloader] GraphQL operation:', operationName);

        // If this is the getDigitalInvoiceDetails operation, extract invoiceId
        if (operationName === 'getDigitalInvoiceDetails') {
          const invoiceId = variables.invoiceId;
          console.log('[NYT Invoice Downloader] Detected getDigitalInvoiceDetails operation for invoiceId:', invoiceId);
        }
      } catch (error) {
        console.error('[NYT Invoice Downloader] Error parsing request body:', error);
      }
    }

    // Call the original fetch and process the response
    return originalFetch.apply(this, args).then((response) => {
      // Clone the response so we can read it without consuming it
      if (isTargetEndpoint && response.ok) {
        // Clone for reading
        const cloneForRead = response.clone();

        cloneForRead.json()
          .then((data) => {
            try {
              // Check if this response contains invoice details
              if (data.data && data.data.invoiceDetails) {
                const invoiceDetails = data.data.invoiceDetails;
                const invoiceId = invoiceDetails.invoiceId;
                const pdfDownloadUrl = invoiceDetails.pdfDownloadUrl;

                if (invoiceId && pdfDownloadUrl) {
                  // Store the mapping
                  invoicePdfMap.set(invoiceId, pdfDownloadUrl);
                  console.log(
                    `[NYT Invoice Downloader] Captured invoice: ${invoiceId}. Total invoices: ${invoicePdfMap.size}`
                  );
                  // Update the UI status
                  setTimeout(updateStatusBadge, 100);
                }
              }
            } catch (error) {
              console.error('[NYT Invoice Downloader] Error processing response data:', error);
            }
          })
          .catch((error) => {
            console.error('[NYT Invoice Downloader] Error reading response JSON:', error);
          });
      }

      // Return the original response unchanged to the caller
      return response;
    });
  };

  /**
   * Get the current map of invoices
   */
  window.__nytInvoiceDownloaderGetInvoices = function() {
    return invoicePdfMap;
  };

  /**
   * Clear all stored invoices (for testing/reset)
   */
  window.__nytInvoiceDownloaderClear = function() {
    invoicePdfMap.clear();
    console.log('[NYT Invoice Downloader] Invoice map cleared.');
  };
  /**
   * Update the status display in the control panel
   */
  function updateStatusBadge() {
    const statusElement = document.getElementById('nyt-invoice-status');
    if (statusElement) {
      const count = invoicePdfMap.size;
      statusElement.textContent = `Invoices captured: ${count}`;
    }
  }

  /**
   * Download all captured PDFs
   */
  function downloadAllPdfs() {
    const invoices = Array.from(invoicePdfMap.entries());
    if (invoices.length === 0) {
      console.warn('[NYT Invoice Downloader] No invoices to download.');
      alert('No invoices captured yet.');
      return;
    }

    console.log(`[NYT Invoice Downloader] Starting download of ${invoices.length} invoices...`);

    invoices.forEach(([invoiceId, pdfUrl]) => {
      try {
        // Create a temporary anchor element
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `NYT_Invoice_${invoiceId}.pdf`;
        link.style.display = 'none';

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`[NYT Invoice Downloader] Triggered download for invoice: ${invoiceId}`);
      } catch (error) {
        console.error(`[NYT Invoice Downloader] Error downloading invoice ${invoiceId}:`, error);
      }
    });

    console.log(`[NYT Invoice Downloader] Initiated download of ${invoices.length} PDFs.`);
  }

  /**
   * Expand all collapsed invoice rows to trigger GraphQL calls
   */
  function expandAllInvoices() {
    try {
      // Stable selectors to find invoice toggle buttons
      // We'll try multiple selector patterns to be robust
      const selectors = [
        'button[data-testid*="billing-history"][aria-expanded="false"]',
        'button[aria-expanded="false"]',
        'button.collapsed',
      ];

      let clickedCount = 0;
      const clickedButtons = new Set(); // Track which buttons we've clicked

      // Try each selector pattern
      for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        
        buttons.forEach((button) => {
          // Avoid clicking the same button twice
          if (!clickedButtons.has(button)) {
            // Additional check: ensure it's related to invoices/billing
            const ariaLabel = button.getAttribute('aria-label') || '';
            const dataTestId = button.getAttribute('data-testid') || '';
            const innerHTML = button.innerHTML || '';
            
            // Only click if it looks like an invoice/billing toggle
            if (
              ariaLabel.toLowerCase().includes('expand') ||
              ariaLabel.toLowerCase().includes('collapse') ||
              dataTestId.toLowerCase().includes('billing') ||
              dataTestId.toLowerCase().includes('invoice') ||
              innerHTML.toLowerCase().includes('expand') ||
              innerHTML.toLowerCase().includes('collapse')
            ) {
              button.click();
              clickedButtons.add(button);
              clickedCount++;
              console.log('[NYT Invoice Downloader] Clicked expand button:', button.getAttribute('aria-label') || dataTestId);
            }
          }
        });
      }

      console.log(`[NYT Invoice Downloader] Clicked ${clickedCount} invoice toggle buttons.`);
      return clickedCount;
    } catch (error) {
      console.error('[NYT Invoice Downloader] Error in expandAllInvoices():', error);
      return 0;
    }
  }

  /**
   * Auto-expand all invoices with a delay
   */
  function autoExpandInvoices() {
    // Wait 500ms before expanding to allow the page to fully load
    setTimeout(() => {
      console.log('[NYT Invoice Downloader] Auto-expanding invoices...');
      expandAllInvoices();
    }, 500);
  }

  /**
   * Create and render the control panel
   */
  function createControlPanel() {
    // Avoid creating multiple panels
    if (document.getElementById('nyt-invoice-control-panel')) {
      console.log('[NYT Invoice Downloader] Control panel already exists.');
      return;
    }

    // Create the main panel container
    const panel = document.createElement('div');
    panel.id = 'nyt-invoice-control-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      min-width: 240px;
    `;

    // Create the status span
    const statusSpan = document.createElement('div');
    statusSpan.id = 'nyt-invoice-status';
    statusSpan.textContent = 'Invoices captured: 0';
    statusSpan.style.cssText = `
      display: block;
      margin-bottom: 10px;
      font-weight: 500;
    `;

    // Create the download button
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'nyt-download-button';
    downloadBtn.textContent = 'Download all PDFs';
    downloadBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      background-color: #0066cc;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background-color 0.2s ease;
    `;

    // Hover effect
    downloadBtn.onmouseover = function() {
      this.style.backgroundColor = '#0052a3';
    };
    downloadBtn.onmouseout = function() {
      this.style.backgroundColor = '#0066cc';
    };

    // Click handler
    downloadBtn.onclick = function() {
      downloadAllPdfs();
    };

    // Create the expand button
    const expandBtn = document.createElement('button');
    expandBtn.id = 'nyt-expand-button';
    expandBtn.textContent = 'Expand all invoices';
    expandBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      background-color: #28a745;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      margin-top: 8px;
      transition: background-color 0.2s ease;
    `;

    // Hover effect
    expandBtn.onmouseover = function() {
      this.style.backgroundColor = '#218838';
    };
    expandBtn.onmouseout = function() {
      this.style.backgroundColor = '#28a745';
    };

    // Click handler
    expandBtn.onclick = function() {
      expandAllInvoices();
    };

    // Assemble the panel
    panel.appendChild(statusSpan);
    panel.appendChild(downloadBtn);
    panel.appendChild(expandBtn);

    // Append to body
    document.body.appendChild(panel);

    console.log('[NYT Invoice Downloader] Control panel created.');
  }

  /**
   * Initialize the control panel when the DOM is ready
   */
  function initializeUI() {
    if (document.body) {
      createControlPanel();
    } else {
      // If body isn't ready yet, wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', createControlPanel);
    }
  }

  // Initialize UI
  initializeUI();

  // Expose functions to window for external access
  window.__nytInvoiceDownloaderUpdateStatus = updateStatusBadge;
  window.__nytInvoiceDownloaderDownloadAll = downloadAllPdfs;
  window.__nytInvoiceDownloaderExpandAll = expandAllInvoices;

  console.log('[NYT Invoice Downloader] Fetch hook installed and UI initialized.');
})();
