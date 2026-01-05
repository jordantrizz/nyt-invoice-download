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
  /**
   * Hook Response.prototype.json() to catch all JSON parsing
   */
  /**
   * Extract invoice data from the DOM
   */
  function extractInvoicesFromDOM() {
    console.log('[NYT Invoice Downloader] Extracting invoices from DOM...');
    
    // The invoice list table contains all invoices
    const invoiceTable = document.querySelector('[data-testid="invoice-list-table"]');
    if (!invoiceTable) {
      console.log('[NYT Invoice Downloader] Could not find invoice table');
      return;
    }
    
    const fullText = invoiceTable.innerText;
    console.log('[NYT Invoice Downloader] Full text length:', fullText.length);
    
    // Parse invoices by looking for "Account Number" sections
    // Each invoice section starts with Account Number and ends before the next one
    const invoiceSections = fullText.split('Account Number');
    console.log('[NYT Invoice Downloader] Found', invoiceSections.length - 1, 'invoices');
    
    invoiceSections.slice(1).forEach((section, index) => {
      try {
        // Extract account number (first line after "Account Number")
        const lines = section.split('\n').filter(l => l.trim());
        const accountNumber = lines[0]?.trim();
        
        if (!accountNumber) {
          console.log(`[NYT Invoice Downloader] Skipping invoice ${index + 1}: no account number`);
          return;
        }
        
        console.log(`[NYT Invoice Downloader] Processing invoice ${index + 1}: Account ${accountNumber}`);
        console.log('[NYT Invoice Downloader] Full section:', section.substring(0, 200));
        
        // Create invoice object
        const invoiceData = {
          headers: [
            { headerName: 'Account Number', headerValue: accountNumber }
          ],
          sections: [],
          totals: []
        };
        
        // Parse the section text to extract service period, payment due, line items, totals
        let currentSection = null;
        let servicePeriod = '';
        let inTotals = false;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Skip empty lines
          if (!line) continue;
          
          if (line === 'Service Period' && i + 1 < lines.length) {
            servicePeriod = lines[i + 1].trim();
            invoiceData.headers.push({
              headerName: 'Service Period',
              headerValue: servicePeriod
            });
            i++; // Skip next line as we already processed it
            continue;
          }
          
          if (line === 'Payment Due' && i + 1 < lines.length) {
            invoiceData.headers.push({
              headerName: 'Payment Due',
              headerValue: lines[i + 1].trim()
            });
            i++; // Skip next line
            continue;
          }
          
          // Start a new section (subscription type)
          // Only create new section if we're not already in this exact section
          if ((line === 'All Access Family' || line === 'All Access') && currentSection?.sectionTitle !== line) {
            currentSection = {
              sectionTitle: line,
              sectionLines: [],
              sectionTotal: '',
              sectionNote: ''
            };
            invoiceData.sections.push(currentSection);
            continue;
          }
          
          if (line === '*Credits') {
            currentSection = {
              sectionTitle: line,
              sectionLines: [],
              sectionTotal: '',
              sectionNote: ''
            };
            invoiceData.sections.push(currentSection);
            continue;
          }
          
          if (line === 'Total' && i + 1 < lines.length) {
            inTotals = true;
            const totalAmount = lines[i + 1].trim();
            invoiceData.totals.push({
              totalTitle: 'Total',
              totalAmount: totalAmount,
              totalNote: ''
            });
            i++; // Skip next line
            continue;
          }
          
          // Payment received lines
          if ((line.includes('Payment') || line.includes('Visa')) && i + 1 < lines.length && lines[i + 1].includes('$')) {
            invoiceData.totals.push({
              totalTitle: line,
              totalAmount: lines[i + 1].trim(),
              totalNote: ''
            });
            i++; // Skip next line
            continue;
          }
          
          // Handle line items
          if (currentSection) {
            // Handle "Subscription" or "Sales tax" followed by amount on next line
            if ((line === 'Subscription' || line === 'Sales tax') && i + 1 < lines.length && lines[i + 1].includes('$')) {
              const amount = lines[i + 1].trim();
              currentSection.sectionLines.push({
                lineName: line,
                lineAmount: amount,
                linePeriod: ''
              });
              i++; // Skip next line
              continue;
            }
            
            // Handle items with currency on the same line
            if (line.includes('$')) {
              const amount = line.match(/C?\$[\d.]+/)?.[0];
              const itemName = line.replace(/C?\$[\d.]+/, '').trim();
              if (amount && itemName) {
                currentSection.sectionLines.push({
                  lineName: itemName,
                  lineAmount: amount,
                  linePeriod: ''
                });
              }
            }
          }
        }
        
        // Store the invoice with a unique key: account number + service period
        // If this key already exists, append _2, _3, etc.
        if (invoiceData.headers.length > 0 && servicePeriod) {
          let baseKey = `${accountNumber}_${servicePeriod}`;
          let uniqueKey = baseKey;
          let counter = 2;
          
          // If key already exists, keep incrementing until we find a unique one
          while (invoiceMap.has(uniqueKey)) {
            uniqueKey = `${baseKey}_${counter}`;
            counter++;
          }
          
          invoiceMap.set(uniqueKey, invoiceData);
          console.log(`[NYT Invoice Downloader] ✓ Stored invoice: ${uniqueKey}`);
          console.log(`[NYT Invoice Downloader]   Sections: ${invoiceData.sections.length}, Totals: ${invoiceData.totals.length}`);
          invoiceData.sections.forEach((sec, idx) => {
            console.log(`[NYT Invoice Downloader]   Section ${idx}: ${sec.sectionTitle} (${sec.sectionLines.length} items)`);
          });
        } else {
          console.log('[NYT Invoice Downloader] ✗ Skipping invoice: missing headers or service period');
          console.log(`[NYT Invoice Downloader]   Account: ${accountNumber}, Period: ${servicePeriod}, Headers: ${invoiceData.headers.length}`);
        }
      } catch (e) {
        console.error('[NYT Invoice Downloader] Error parsing invoice:', e);
      }
    });
    
    console.log(`[NYT Invoice Downloader] Total invoices extracted: ${invoiceMap.size}`);
    updateStatusBadge();
  }
  
  // Expose for manual debugging
  window.__nytInvoiceDownloaderExtractFromDOM = extractInvoicesFromDOM;

  // In-memory map to store invoiceId -> invoice data
  const invoiceMap = new Map();

  /**
   * Get the current map of invoices
   */
  window.__nytInvoiceDownloaderGetInvoices = function() {
    return invoiceMap;
  };

  /**
   * Clear all stored invoices (for testing/reset)
   */
  window.__nytInvoiceDownloaderClear = function() {
    invoiceMap.clear();
    console.log('[NYT Invoice Downloader] Invoice map cleared.');
  };

  /**
   * Update the status display in the control panel
   */
  function updateStatusBadge() {
    const statusElement = document.getElementById('nyt-invoice-status');
    if (statusElement) {
      const count = invoiceMap.size;
      statusElement.textContent = `Invoices captured: ${count}`;
    }
  }

  /**
   * Generate HTML for an invoice
   */
  function generateInvoiceHTML(invoiceId, invoiceData) {
    const headers = invoiceData.headers || [];
    const sections = invoiceData.sections || [];
    const totals = invoiceData.totals || [];

    let html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>NYT Invoice - ${invoiceId}</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          max-width: 8.5in; 
          margin: 0.5in auto; 
          color: #333;
          line-height: 1.5;
        }
        h1 { font-size: 28px; margin: 0 0 30px 0; font-weight: 600; }
        .header-section { 
          margin-bottom: 30px; 
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 20px 40px;
        }
        .header-item { 
          display: contents;
        }
        .header-label { 
          font-weight: 600;
          color: #333;
        }
        .header-value {
          text-align: right;
          color: #333;
        }
        .section { 
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .section-title { 
          font-weight: 600;
          font-size: 15px;
          margin: 20px 0 12px 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        .section-lines {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          align-items: center;
          margin-bottom: 10px;
        }
        .section-line {
          display: contents;
        }
        .line-name {
          text-align: left;
          color: #333;
        }
        .line-amount {
          text-align: right;
          color: #333;
        }
        .totals { 
          margin-top: 30px;
          border-top: 2px solid #000;
          padding-top: 15px;
        }
        .total-line {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          margin-bottom: 12px;
          font-weight: 600;
        }
        .total-title {
          text-align: left;
        }
        .total-amount {
          text-align: right;
        }
        @media print { 
          body { margin: 0; padding: 20px; }
          h1 { margin: 0 0 20px 0; }
        }
      </style>
    </head>
    <body>
      <h1>New York Times Invoice</h1>
      <div class="header-section">
    `;

    headers.forEach(header => {
      html += `
        <div class="header-item">
          <div class="header-label">${header.headerName}:</div>
          <div class="header-value">${header.headerValue}</div>
        </div>
      `;
    });

    html += `</div>`;

    sections.forEach(section => {
      html += `
        <div class="section">
          <div class="section-title">${section.sectionTitle}</div>
          <div class="section-lines">
      `;

      section.sectionLines.forEach(line => {
        html += `
            <div class="section-line">
              <div class="line-name">${line.lineName}${line.linePeriod ? ' (' + line.linePeriod + ')' : ''}</div>
              <div class="line-amount">${line.lineAmount}</div>
            </div>
        `;
      });

      html += `
          </div>
      `;

      if (section.sectionTotal) {
        html += `
          <div class="section-lines" style="font-weight: 600; margin-top: 10px;">
            <div class="section-line">
              <div class="line-name"></div>
              <div class="line-amount">${section.sectionTotal}</div>
            </div>
          </div>
        `;
      }

      if (section.sectionNote) {
        html += `<div style="font-size: 12px; color: #666; margin-top: 8px;">${section.sectionNote}</div>`;
      }

      html += `</div>`;
    });

    if (totals.length > 0) {
      html += `<div class="totals">`;
      totals.forEach(total => {
        html += `
          <div class="total-line">
            <div class="total-title">${total.totalTitle}${total.totalNote ? ' - ' + total.totalNote : ''}</div>
            <div class="total-amount">${total.totalAmount}</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Download all invoices as JSON
   */
  function downloadAsJSON() {
    const invoices = Array.from(invoiceMap.entries());
    if (invoices.length === 0) {
      alert('No invoices captured yet.');
      return;
    }

    const jsonData = {};
    invoices.forEach(([key, data]) => {
      jsonData[key] = data;
    });

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NYT_Invoices_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`[NYT Invoice Downloader] Downloaded ${invoices.length} invoices as JSON`);
    alert(`Downloaded ${invoices.length} invoice(s) as JSON`);
  }

  /**
   * View invoice in new window
   */
  function viewInvoiceInWindow() {
    const invoices = Array.from(invoiceMap.entries());
    if (invoices.length === 0) {
      alert('No invoices captured yet.');
      return;
    }

    // If only one invoice, open it directly
    if (invoices.length === 1) {
      const [invoiceId, invoiceData] = invoices[0];
      const html = generateInvoiceHTML(invoiceId, invoiceData);
      const newWindow = window.open();
      newWindow.document.write(html);
      newWindow.document.close();
      console.log(`[NYT Invoice Downloader] Opened invoice in new window: ${invoiceId}`);
      return;
    }

    // Multiple invoices: open the most recent one
    const lastInvoice = invoices[invoices.length - 1];
    const [invoiceId, invoiceData] = lastInvoice;
    const html = generateInvoiceHTML(invoiceId, invoiceData);
    const newWindow = window.open();
    newWindow.document.write(html);
    newWindow.document.close();
    console.log(`[NYT Invoice Downloader] Opened invoice in new window: ${invoiceId}`);
  }

  /**
   * Download all captured invoices as HTML files
   */
  function downloadAllPdfs() {
    const invoices = Array.from(invoiceMap.entries());
    if (invoices.length === 0) {
      console.warn('[NYT Invoice Downloader] No invoices to download.');
      alert('No invoices captured yet.');
      return;
    }

    console.log(`[NYT Invoice Downloader] Starting download of ${invoices.length} invoices...`);

    invoices.forEach(([invoiceId, invoiceData]) => {
      try {
        const html = generateInvoiceHTML(invoiceId, invoiceData);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NYT_Invoice_${invoiceId}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`[NYT Invoice Downloader] Downloaded invoice: ${invoiceId}`);
      } catch (error) {
        console.error(`[NYT Invoice Downloader] Error downloading invoice ${invoiceId}:`, error);
      }
    });

    alert(`Downloaded ${invoices.length} invoice(s) as HTML files.`);
  }

  /**
   * Expand all collapsed invoice rows to trigger GraphQL calls
   */
  function expandAllInvoices() {
    try {
      console.log('[NYT Invoice Downloader] expandAllInvoices() called');
      
      // Click expand buttons
      const selectors = [
        'button[data-testid*="expand-button"]',
        'button[data-testid*="billing-history"][aria-expanded="false"]',
        'button[aria-expanded="false"]',
        'button.collapsed',
      ];

      let clickedCount = 0;
      const clickedButtons = new Set();

      for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        
        buttons.forEach((button) => {
          if (!clickedButtons.has(button)) {
            button.click();
            clickedButtons.add(button);
            clickedCount++;
            const dataTestId = button.getAttribute('data-testid') || '';
            console.log('[NYT Invoice Downloader] Clicked expand button:', dataTestId);
          }
        });
      }

      console.log(`[NYT Invoice Downloader] Clicked ${clickedCount} invoice toggle buttons.`);
      
      // Wait a moment for the DOM to update, then extract invoices
      setTimeout(() => {
        console.log('[NYT Invoice Downloader] Extracting invoices from expanded DOM...');
        extractInvoicesFromDOM();
      }, 500);
      
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

    // Create the extract button
    const extractBtn = document.createElement('button');
    extractBtn.id = 'nyt-extract-button';
    extractBtn.textContent = 'Extract data';
    extractBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      background-color: #6c757d;
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
    extractBtn.onmouseover = function() {
      this.style.backgroundColor = '#5a6268';
    };
    extractBtn.onmouseout = function() {
      this.style.backgroundColor = '#6c757d';
    };

    // Click handler
    extractBtn.onclick = function() {
      extractInvoicesFromDOM();
    };

    // Create the JSON download button
    const jsonBtn = document.createElement('button');
    jsonBtn.id = 'nyt-json-button';
    jsonBtn.textContent = 'Download as JSON';
    jsonBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      background-color: #fd7e14;
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
    jsonBtn.onmouseover = function() {
      this.style.backgroundColor = '#e66a00';
    };
    jsonBtn.onmouseout = function() {
      this.style.backgroundColor = '#fd7e14';
    };

    // Click handler
    jsonBtn.onclick = function() {
      downloadAsJSON();
    };

    // Create the view invoice button
    const viewBtn = document.createElement('button');
    viewBtn.id = 'nyt-view-button';
    viewBtn.textContent = 'View HTML Invoice';
    viewBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      background-color: #6f42c1;
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
    viewBtn.onmouseover = function() {
      this.style.backgroundColor = '#5a32a3';
    };
    viewBtn.onmouseout = function() {
      this.style.backgroundColor = '#6f42c1';
    };

    // Click handler
    viewBtn.onclick = function() {
      viewInvoiceInWindow();
    };

    // Assemble the panel
    panel.appendChild(statusSpan);
    panel.appendChild(downloadBtn);
    panel.appendChild(expandBtn);
    panel.appendChild(extractBtn);
    panel.appendChild(jsonBtn);
    panel.appendChild(viewBtn);

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
