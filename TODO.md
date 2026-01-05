# TODO – NYT Invoice Downloader Chrome Extension

**Goal**: Build a fully-functioning Chrome Manifest v3 extension by version **1.0.0**  
**Structure**: Numbered versions (0.1.0, 0.2.0, ..., 1.0.0) for clear task assignment

---

## Release Versions

### 0.1.0 – Create `manifest.json`
**Responsibility**: Extension & Manifest Agent  
**Description**: Define the Manifest v3 configuration.  
**Checklist**:
- [ ] Create `manifest.json` with name, version, and icons placeholder
- [ ] Set `manifest_version: 3`
- [ ] Define `content_scripts` with `matches: ["https://www.nytimes.com/*"]` and `run_at: "document_idle"`
- [ ] Reference `content.js` as the content script
- [ ] Add `host_permissions` for `https://www.nytimes.com/*` and `https://samizdat-graphql.nytimes.com/*`
- [ ] Verify no unnecessary permissions (no `downloads`, no broad patterns)

**Status**: [ ] Not Started

---

### 0.2.0 – Create `content.js`
**Responsibility**: Content Script Layer  
**Description**: Content script that injects `injected.js` into the page context.  
**Checklist**:
- [ ] Create `content.js` with a function to safely inject `injected.js`
- [ ] Use a `<script>` tag appended to `document.documentElement` or `document.head`
- [ ] Include a guard to prevent re-injection (e.g., check for a global flag)
- [ ] Add basic logging to console for debugging

**Status**: [ ] Not Started

---

### 0.3.0 – Implement Fetch Hook (Part A of `injected.js`)
**Responsibility**: Injection & Hooking Agent  
**Description**: Monkeypatch `window.fetch` to intercept GraphQL calls.  
**Checklist**:
- [ ] Create `injected.js` with a safe fetch wrapper
- [ ] Detect requests to `samizdat-graphql.nytimes.com/graphql/v2`
- [ ] Parse JSON body to check for `operationName === "getDigitalInvoiceDetails"`
- [ ] Extract `variables.invoiceId` from the request
- [ ] Clone response and parse JSON to get `data.invoiceDetails.pdfDownloadUrl`
- [ ] Store mapping in in-memory `Map<invoiceId, pdfDownloadUrl>`
- [ ] Log new captures to console (verify no auth headers/cookies are logged)
- [ ] Return original response unchanged to caller

**Status**: [ ] Not Started

---

### 0.4.0 – Implement UI Overlay Panel (Part B of `injected.js`)
**Responsibility**: UI & UX Agent  
**Description**: Render the fixed bottom-right control panel.  
**Checklist**:
- [ ] Create `createControlPanel()` function
- [ ] Build a fixed-position `<div>` in bottom-right corner
- [ ] Add status span with id `nyt-invoice-status` showing "Invoices captured: N"
- [ ] Add "Download all PDFs" button with id `nyt-download-button`
- [ ] Apply inline CSS for dark background, light text, subtle shadow
- [ ] Ensure panel does not overlap NYT UI on smaller screens
- [ ] Call `createControlPanel()` on page load (after DOM is ready)
- [ ] Wire button click handler to `downloadAllPdfs()` (stub for now)

**Status**: [ ] Not Started

---

### 0.5.0 – Implement Download Handler (Part C of `injected.js`)
**Responsibility**: UI & UX Agent  
**Description**: Implement the logic to trigger PDF downloads.  
**Checklist**:
- [ ] Create `downloadAllPdfs()` function
- [ ] Iterate over `invoicePdfMap`
- [ ] For each entry, create a temporary `<a>` element
- [ ] Set `href` to `pdfDownloadUrl`
- [ ] Set `download` attribute to filename (use `invoiceId` if available)
- [ ] Trigger `.click()` to start browser download
- [ ] Clean up temporary `<a>` elements
- [ ] Add logging to console (e.g., "Downloading 3 PDFs...")
- [ ] Update status panel after downloads complete

**Status**: [ ] Not Started

---

### 0.6.0 – Implement Auto-Expand Helper (Part D of `injected.js`)
**Responsibility**: Selectors & Auto-Expand Agent  
**Description**: Click unexpanded invoice toggles to fetch all invoices.  
**Checklist**:
- [ ] Create `expandAllInvoices()` function
- [ ] Use stable selectors to find invoice toggle buttons (e.g., `data-testid`)
- [ ] Check `aria-expanded="false"` or presence of `.collapsed` class
- [ ] Click each unexpanded button to trigger GraphQL calls
- [ ] Add `setTimeout` delay (e.g., 500ms) before first invocation
- [ ] Log how many buttons were clicked
- [ ] Optionally add delay between clicks to avoid overwhelming the page
- [ ] Wire a manual "Expand All Invoices" button (optional enhancement)

**Status**: [ ] Not Started

---

### 0.7.0 – Create `README.md`
**Responsibility**: Documentation / QA Agent  
**Description**: Write user-facing setup and usage documentation.  
**Checklist**:
- [ ] Installation instructions (load unpacked extension in Chrome)
- [ ] Usage instructions (navigate to NYT billing, interact with panel)
- [ ] Feature overview (what the extension does)
- [ ] Screenshots or visual guide (optional)
- [ ] Manual test checklist for QA
- [ ] Troubleshooting section (common issues)
- [ ] Security notes (no data sent off-site, no logging of auth)
- [ ] Development notes for future maintenance

**Status**: [ ] Not Started

---

### 0.8.0 – Test & Validate Core Flows
**Responsibility**: QA & Testing Agent  
**Description**: Manual end-to-end testing of all features.  
**Checklist**:
- [ ] Load unpacked extension in Chrome (`chrome://extensions`)
- [ ] Navigate to NYT billing page while logged in
- [ ] Verify overlay panel appears in bottom-right corner
- [ ] Manually expand one invoice
- [ ] Confirm invoice counter increments in panel (1 invoice captured)
- [ ] Expand additional invoices
- [ ] Confirm counter updates correctly
- [ ] Click "Download all PDFs" button
- [ ] Verify browser downloads PDFs with correct filenames
- [ ] Check browser console for logs (no errors, no auth data logged)
- [ ] Test page reload (overlay and data persist if possible)
- [ ] Test SPA navigation if applicable
- [ ] Verify panel does not break on mobile-width screens

**Status**: [ ] Not Started

---

### 0.9.0 – Code Review & Security Audit
**Responsibility**: Architect & Product Agent  
**Description**: Final review before release candidate.  
**Checklist**:
- [ ] Review `manifest.json` for minimal permissions
- [ ] Audit `injected.js` for no hard-coded secrets or cookies
- [ ] Verify fetch hook does not log sensitive headers
- [ ] Confirm all invoice data stays in-memory (not sent off-site)
- [ ] Check for any console warnings or errors
- [ ] Review error handling (graceful failures if GraphQL schema changes)
- [ ] Validate selector robustness (will they break if NYT updates DOM?)
- [ ] Review code comments for clarity

**Status**: [ ] Not Started

---

## 1.0.0 – Release (Fully Functioning)
**Description**: Extension is production-ready and all features are working.  
**Criteria**:
- ✓ All versions 0.1.0 through 0.9.0 are complete
- ✓ Manual testing passed
- ✓ Security audit passed
- ✓ README.md is complete and accurate
- ✓ Extension can be packaged and distributed

**Status**: [ ] Not Started

---

## How to Use This TODO

1. **Pick a version**: Say "Work on 0.3.0" or "Help me with 0.5.0"
2. **I'll implement it**: I'll create/update the files and check off the checklist items
3. **Move to next**: Once complete, we move to the next version
4. **Reach 1.0.0**: When all versions are done, the extension is fully functional

**Current Version**: 0.1.0 ready to start

