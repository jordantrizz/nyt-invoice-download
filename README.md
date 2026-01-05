# NYT Invoice Downloader

A lightweight Chrome extension (Manifest v3) that helps you download all your New York Times digital subscription invoices as PDFs in one click.

## Features

- **Automatic Invoice Capture**: Hooks `window.fetch` to intercept GraphQL API calls and capture invoice data from the NYT billing page.
- **Bulk Download**: Download all captured invoices with a single button click.
- **Auto-Expand Option**: Optionally auto-expands all invoice rows to ensure all invoices are fetched (useful if the page shows invoices progressively).
- **Minimal & Non-Intrusive**: Small floating control panel in the bottom-right corner that doesn't interfere with the NYT page.
- **Privacy-First**: All invoice data stays in your browser; no data is sent to third parties.

## Security & Privacy

- **No Hard-Coded Secrets**: The extension does not store or transmit any cookies, authorization tokens, or sensitive data.
- **Relies on Your Session**: Uses your existing logged-in NYT session to access invoice data.
- **Local Storage Only**: Invoice URLs and IDs are kept in-memory for the current page session only.
- **Direct Downloads**: PDFs are downloaded directly from New York Times servers; the extension does not proxy or store them.

## Installation

### Step 1: Clone or Download the Repository

```bash
git clone https://github.com/yourusername/nyt-invoice-download.git
cd nyt-invoice-download
```

Or download the ZIP file from GitHub and extract it.

### Step 2: Load the Unpacked Extension in Chrome

1. Open **Google Chrome** (or any Chromium-based browser like Edge, Brave, etc.).
2. Go to **`chrome://extensions/`** (or click the menu icon → "More tools" → "Extensions").
3. Enable **"Developer mode"** (toggle in the top-right corner).
4. Click **"Load unpacked"**.
5. Navigate to the folder where you cloned/extracted this repository and select it.
6. The extension should now appear in your extensions list.

### Step 3: Verify Installation

- Go to **`chrome://extensions/`** and confirm "NYT Invoice Downloader" is listed.
- Pin the extension to your toolbar for easy access (optional).

## Usage

### Accessing Your Invoices

1. Log in to your **New York Times account** on [nytimes.com](https://www.nytimes.com).
2. Navigate to your **billing or account settings page** (typically at `https://www.nytimes.com/account`).
3. Find the **"Billing"** or **"Invoices"** section.

### Downloading Invoices

1. Once on the NYT billing page, you should see a small **floating control panel** in the **bottom-right corner** of the page.
2. The panel displays:
   - **"Invoices captured: N"** — the number of invoices intercepted by the extension.
   - **"Download all PDFs"** button.
3. Optionally, click **"Expand All Invoices"** (if available) to auto-expand all invoice rows and ensure all invoices are fetched from the server.
4. Click **"Download all PDFs"** to download all captured invoices.
   - Your browser's default download folder will receive the PDF files.
   - Files are named using the invoice ID from the NYT system.

### Troubleshooting

**Panel Not Visible**
- Ensure you are on a NYT page (`nytimes.com/*`).
- Check that the extension is enabled at `chrome://extensions/`.
- Try reloading the page (Ctrl+R or Cmd+R).

**No Invoices Captured**
- Make sure you are logged into your NYT account.
- Navigate to the actual billing page where invoices are listed.
- The extension only captures invoices when the NYT page makes GraphQL requests to fetch them.
- Check the browser console (F12 → "Console" tab) for any debug messages from the extension.

**Downloads Not Starting**
- Check your browser's download settings and ensure downloads are allowed.
- Verify you are not in incognito/private mode (some browsers restrict downloads there).
- Check the console for any error messages.

## Technical Details

### Architecture

The extension consists of three main components:

1. **manifest.json**: Defines extension metadata, permissions, and content script configuration.
2. **content.js**: Content script that injects `injected.js` into the page context.
3. **injected.js**: Page-context script that:
   - Monkeypatches `window.fetch` to intercept GraphQL requests.
   - Detects calls to `https://samizdat-graphql.nytimes.com/graphql/v2` with `operationName === "getDigitalInvoiceDetails"`.
   - Extracts `invoiceId` and `pdfDownloadUrl` from the response.
   - Stores them in an in-memory `Map`.
   - Renders the control panel with status and download buttons.

### Permissions

- **`https://www.nytimes.com/*`**: Allows the extension to run on NYT pages.
- **`https://samizdat-graphql.nytimes.com/*`**: Allows interception of GraphQL API calls to fetch invoice details.

## Manual Testing Checklist

### Pre-Test Setup

- [ ] Extension is installed and enabled at `chrome://extensions/`.
- [ ] You are logged into your NYT account.
- [ ] You have at least one active NYT subscription.

### Test 1: Page Load & Panel Visibility

1. [ ] Navigate to `https://www.nytimes.com/account` (or your NYT billing page).
2. [ ] Confirm the control panel appears in the **bottom-right corner**.
3. [ ] Confirm it shows **"Invoices captured: 0"** initially.

### Test 2: Fetch Hook & Invoice Capture

1. [ ] On the billing page, click into the **"Billing"** or **"Invoices"** section.
2. [ ] Confirm the panel updates to show **"Invoices captured: N"** (where N > 0).
3. [ ] Open the browser console (F12 → "Console") and confirm you see messages like:
   ```
   [NYT Invoice Downloader] Captured invoice: <invoiceId>
   ```
4. [ ] Reload the page and confirm invoices are captured again.

### Test 3: Auto-Expand Invoices (Optional)

1. [ ] If your NYT billing page shows invoices in a collapsed state:
   - [ ] Click **"Expand All Invoices"** (if the button is present).
   - [ ] Confirm the invoice count in the panel increases.

### Test 4: Bulk Download

1. [ ] With at least one invoice captured, click **"Download all PDFs"**.
2. [ ] Confirm your browser's download dialog opens (or files download automatically).
3. [ ] Verify the PDF files are downloaded to your default download folder.
4. [ ] Open one of the PDFs to confirm it is a valid NYT invoice.

### Test 5: SPA Navigation (If Applicable)

1. [ ] While on the NYT billing page, navigate to another section (e.g., "Manage Subscriptions").
2. [ ] Navigate back to the billing section.
3. [ ] Confirm the panel is still present and functioning.

### Test 6: Multiple Sessions

1. [ ] Reload the page and confirm the panel resets (invoice count goes back to 0).
2. [ ] Confirm invoices are re-captured on subsequent page loads.

### Debugging Tips

- **Enable console logging**: Open the browser console (F12) to see debug messages from the extension.
- **Check network requests**: In the browser DevTools → "Network" tab, look for requests to `samizdat-graphql.nytimes.com/graphql/v2` to confirm GraphQL calls are being made.
- **Inspect page context**: The control panel is injected into the page's DOM; you can inspect it in DevTools to verify styling and event listeners.

## Known Limitations

- **Invoice Visibility**: The extension only captures invoices that the NYT page has fetched. If your billing page shows invoices progressively (e.g., pagination or lazy loading), you may need to scroll or click "Expand All Invoices" to ensure all invoices are fetched.
- **Browser Support**: Designed for Chrome and Chromium-based browsers. Firefox and Safari support for extensions is different and would require additional work.
- **Session Dependency**: The extension relies on an active NYT session. If you are logged out, the extension cannot access invoices.

## Contributing

If you find bugs or have suggestions, please open an issue or submit a pull request.

## License

This project is provided as-is. Please refer to the LICENSE file (if present) for details.

## Disclaimer

This extension is not affiliated with The New York Times Company. It is a third-party tool designed to improve your user experience. Use at your own risk and ensure you comply with The New York Times' terms of service.

---

**Questions or Issues?**  
Open an issue on GitHub or check the troubleshooting section above.
