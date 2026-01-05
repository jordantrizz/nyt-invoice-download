# TODO – NYT Invoice Downloader Chrome Extension

## Project Setup

- [ ] **Create `manifest.json`** (Extension & Manifest Agent)
  - [ ] Define Manifest v3 structure
  - [ ] Set `matches` for `https://www.nytimes.com/*`
  - [ ] Add `host_permissions` for nytimes.com and samizdat-graphql.nytimes.com
  - [ ] Configure content script injection at `document_idle`
  - [ ] Reference `content.js`

- [ ] **Create `content.js`** (Content Script Layer)
  - [ ] Load the manifest and define basic lifecycle
  - [ ] Inject `injected.js` into page context via `<script>` tag
  - [ ] Handle page load and SPA navigation if needed

- [ ] **Create `injected.js`** (Injection & Hooking Agent + UI Agent)
  - [ ] **Part A: Fetch Hooking**
    - [ ] Monkeypatch `window.fetch` safely
    - [ ] Detect requests to `samizdat-graphql.nytimes.com/graphql/v2`
    - [ ] Parse JSON body and look for `operationName === "getDigitalInvoiceDetails"`
    - [ ] Extract `variables.invoiceId` from request
    - [ ] Clone and parse response to get `data.invoiceDetails.pdfDownloadUrl`
    - [ ] Store mapping in in-memory `Map<invoiceId, pdfDownloadUrl>`
    - [ ] Log new captures to console (no auth headers)
  
  - [ ] **Part B: UI Overlay Panel**
    - [ ] Create `createControlPanel()` function
    - [ ] Render fixed bottom-right panel with dark styling
    - [ ] Display "Invoices captured: N" status
    - [ ] Add "Download all PDFs" button
    - [ ] Style with inline CSS (unobtrusive, no overlaps on small screens)
  
  - [ ] **Part C: Download Handler**
    - [ ] Implement `downloadAllPdfs()` function
    - [ ] Iterate over `invoicePdfMap` and trigger downloads
    - [ ] Use `<a href="">` + `.click()` pattern for each PDF
    - [ ] Use `invoiceId` in filename if possible
  
  - [ ] **Part D: Auto-Expand Helper** (Selectors & Auto-Expand Agent)
    - [ ] Implement `expandAllInvoices()` function
    - [ ] Use stable selectors (e.g., `data-testid` attributes)
    - [ ] Check `aria-expanded` or `.collapsed` class
    - [ ] Click unexpanded buttons to trigger GraphQL calls
    - [ ] Log how many buttons were clicked
    - [ ] Add `setTimeout` delay before first invocation

- [ ] **Create `README.md`** (Documentation)
  - [ ] Installation instructions (load unpacked extension)
  - [ ] Usage: navigate to NYT billing, click "Download all PDFs"
  - [ ] Manual test plan (QA & Testing Agent checklist)
  - [ ] Troubleshooting and security notes

---

## Implementation Order (Next 3 Steps)

### Step 1: Create `manifest.json`
**Responsibility**: Extension & Manifest Agent  
**Instructions**:
- Generate Manifest v3 JSON with the project name, version, and permissions.
- Ensure `content_scripts` entry points to `content.js` on `https://www.nytimes.com/*`.
- Add minimal `host_permissions` (no `downloads` permission needed).

### Step 2: Create `content.js`
**Responsibility**: Content Script Layer  
**Instructions**:
- Create a simple script that injects `injected.js` into the page context.
- Use a `<script>` tag appended to `document.documentElement` or `document.head`.
- Optionally add a check to avoid re-injecting if already present.

### Step 3: Create `injected.js` (Core Implementation)
**Responsibility**: Injection & Hooking Agent + UI & UX Agent  
**Instructions**:
- Implement the `window.fetch` monkeypatch with full response parsing logic.
- Build the `createControlPanel()` and UI rendering.
- Implement `downloadAllPdfs()` and `expandAllInvoices()` helpers.
- Wire everything together: call `createControlPanel()` on page load, call `expandAllInvoices()` after a small delay.

---

## Testing & Validation

- [ ] Load unpacked extension in Chrome (`chrome://extensions`)
- [ ] Navigate to NYT billing page while logged in
- [ ] Verify overlay panel appears in bottom-right
- [ ] Expand one or more invoices
- [ ] Confirm invoice counter increments as GraphQL calls are intercepted
- [ ] Click "Download all PDFs" and verify downloads start
- [ ] Check browser console for logs and no errors
- [ ] Verify no cookies or auth headers logged to console

---

## Security & QA Checklist

- [ ] No hard-coded secrets or cookies in extension code
- [ ] `window.fetch` wrapper does not log sensitive headers
- [ ] All invoice data stays in-memory, not sent off-site
- [ ] Permissions are minimal (no overly broad patterns)
- [ ] Page reloads or SPA navigation does not break functionality

