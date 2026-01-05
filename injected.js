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

  console.log('[NYT Invoice Downloader] Fetch hook installed.');
})();
