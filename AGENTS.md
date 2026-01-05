# AGENTS – NYT Invoice Downloader Chrome Extension

## Project Overview

Goal: Build a Chrome (Manifest v3) extension that:

- Runs on `nytimes.com` billing pages.
- Injects a script in the page context that:
  - Hooks `window.fetch` to intercept `getDigitalInvoiceDetails` GraphQL calls to `https://samizdat-graphql.nytimes.com/graphql/v2`.
  - Extracts `invoiceId` and `pdfDownloadUrl` from the responses.
  - Stores them in memory for the current page session.
- Provides a small, unobtrusive UI overlay:
  - Shows how many invoices have been captured.
  - Has a “Download all PDFs” button that triggers browser downloads for all captured `pdfDownloadUrl`s.
- Optionally auto-expands/clicks all invoice rows to ensure all invoices are fetched.

No secrets or cookies are hard-coded in the extension; it relies on the user’s existing logged-in NYT session.

---

## Tech Stack & Constraints

- **Tech stack**: JavaScript, Chrome Extension Manifest v3.
- **Target browser**: Google Chrome (and Chromium-based browsers).
- **Permissions**:
  - `host_permissions` for `https://www.nytimes.com/*` and `https://samizdat-graphql.nytimes.com/*`.
  - Avoid extra permissions unless strictly needed.
- **Security/Privacy**:
  - Do **not** log cookies, authorization headers, or send data off-site.
  - All invoice data stays in the browser; PDFs download directly from NYT.
- **UX**:
  - Floating control panel fixed to bottom-right.
  - Minimal styling, non-intrusive, easy to hide/ignore.
  - Robust to NYT page reloads / SPA navigation where possible.

---

## Repository Structure (Initial)

- `manifest.json`  
  Chrome extension manifest (v3) defining content scripts and permissions.

- `content.js`  
  Content script that:
  - Injects `injected.js` into the page context via a `<script>` tag.
  - Handles basic lifecycle (runs on `document_idle`).

- `injected.js`  
  Page-context script that:
  - Hooks `window.fetch` and inspects GraphQL requests to `samizdat-graphql.nytimes.com/graphql/v2`.
  - Detects `operationName === "getDigitalInvoiceDetails"` and reads `variables.invoiceId`.
  - Parses JSON response to capture `pdfDownloadUrl`.
  - Stores a mapping `{ invoiceId -> pdfDownloadUrl }` in memory.
  - Renders a control panel with:
    - A status label: “Invoices captured: N”
    - A button: “Download all PDFs”
  - Implements a helper `expandAllInvoices()` that:
    - Clicks the NYT billing expand/collapse buttons using robust selectors.

- `README.md`  
  Setup instructions: how to load the unpacked extension in Chrome, how to test on NYT billing pages.

- `AGENTS.md`  
  This file.

---

## Agents

### 1. Architect & Product Agent

**Mission:** Define scope, architecture, and constraints; keep the extension small, focused, and secure.

**Responsibilities:**
- Refine the core user stories:
  - “As a subscriber, I want to click one button and download all my NYT invoices as PDFs.”
- Define minimal permissions required.
- Decide how/where to inject `injected.js`.
- Define how we handle:
  - SPA navigation on nytimes.com
  - Future-proofing selectors (data-testid vs classnames).

**Key Questions to Ask:**
- Are we relying only on `fetch`, or should we also consider `XMLHttpRequest`?
- What are the most stable selectors for the billing expand buttons?

**Copilot Prompt Template:**
> You are the Architect & Product Agent for a Chrome Manifest v3 extension called "NYT Invoice Downloader". Given the current repo structure and code, review the design and summarize: (1) permissions used and whether they are minimal, (2) how `injected.js` is loaded and executed, and (3) any risks around stability if NYT’s DOM or GraphQL schema changes. Suggest concrete improvements in bullet points.

---

### 2. Extension & Manifest Agent

**Mission:** Own `manifest.json` and wiring of content scripts.

**Responsibilities:**
- Implement and maintain `manifest.json` using Manifest v3.
- Ensure correct `matches`, `host_permissions`, `run_at`, and file references.
- Keep permissions minimal (no `downloads` permission if not required).

**Copilot Prompt Template:**
> You are the Extension & Manifest Agent. Create a Manifest v3 `manifest.json` for a Chrome extension named "NYT Invoice Downloader" that:
> - Injects `content.js` on `https://www.nytimes.com/*` with `run_at: document_idle`.
> - Requires host permissions for `https://www.nytimes.com/*` and `https://samizdat-graphql.nytimes.com/*`.
> - Does not request any extra permissions.
> Output just the JSON.

---

### 3. Injection & Hooking Agent (Page Context Logic)

**Mission:** Implement `injected.js` logic to hook network requests and capture invoice data.

**Responsibilities:**
- Monkeypatch `window.fetch` safely:
  - Pass through all non-target calls.
  - On GraphQL calls to `samizdat-graphql.nytimes.com/graphql/v2`:
    - Parse `init.body` as JSON.
    - If `operationName === "getDigitalInvoiceDetails"`, read `variables.invoiceId`.
    - Clone the response and parse JSON to read `data.invoiceDetails.pdfDownloadUrl`.
    - Store results in an in-memory `Map<invoiceId, pdfDownloadUrl>`.
- Provide helper functions:
  - `updateStatusBadge()`
  - `downloadAllPdfs()`
  - `expandAllInvoices()` (with DOM selector abstractions).

**Copilot Prompt Template:**
> You are the Injection & Hooking Agent. In `injected.js`, implement a safe wrapper around `window.fetch` that:
> - Detects requests to `https://samizdat-graphql.nytimes.com/graphql/v2`.
> - Parses the JSON body and checks for `operationName === "getDigitalInvoiceDetails"`.
> - Reads `variables.invoiceId`.
> - Clones the response and parses JSON to extract `data.invoiceDetails.pdfDownloadUrl`.
> - Stores `invoiceId -> pdfDownloadUrl` in a `Map`.
> - Logs to console when a new invoice is captured.
> Avoid logging any cookies or auth headers. Return the original response unchanged.

---

### 4. UI & UX Agent (Overlay Panel)

**Mission:** Implement the floating control panel and UX around it.

**Responsibilities:**
- Render a small fixed panel in the bottom-right corner:
  - Dark background, light text, subtle shadow.
  - Text: “Invoices captured: N”
  - Button: “Download all PDFs”
- Hook button click to `downloadAllPdfs()`, which:
  - Iterates over `invoicePdfMap` and triggers downloads via `<a>` elements.
- Ensure panel does not overlap important NYT UI on smaller screens.

**Copilot Prompt Template:**
> You are the UI & UX Agent for this extension. In `injected.js`, add a function `createControlPanel()` that:
> - Creates a fixed-position `<div>` in the bottom-right corner.
> - Shows a status span with id `nyt-invoice-status`.
> - Shows a button "Download all PDFs" that calls `downloadAllPdfs()` on click.
> Style it with inline styles for a small, unobtrusive dark panel. Then call `createControlPanel()` on page load.

---

### 5. Selectors & Auto-Expand Agent

**Mission:** Make `expandAllInvoices()` robust and maintainable.

**Responsibilities:**
- Inspect NYT billing DOM (e.g., `data-testid` attributes).
- Implement `expandAllInvoices()` to:
  - Find all collapsed invoice toggles.
  - Click them once to trigger the GraphQL calls.
- Avoid over-clicking or breaking the page.

**Copilot Prompt Template:**
> You are the Selectors & Auto-Expand Agent. Implement `expandAllInvoices()` in `injected.js` that:
> - Selects all expand/collapse buttons for billing items using stable selectors like `data-testid="billing-history-item-toggle"` (adjustable via a small config array).
> - For each button whose `aria-expanded` is `"false"` or which has a `.collapsed` class, call `.click()`.
> - Log to the console how many buttons were clicked.
> Add a small delay (e.g. via `setTimeout`) before you first call this function after page load to let the DOM render.

---

### 6. QA & Testing Agent

**Mission:** Validate core flows and guard against regressions.

**Responsibilities:**
- Define manual test plan:
  - Load extension via `chrome://extensions` → “Load unpacked”.
  - Navigate to NYT billing page while logged in.
  - Confirm overlay appears and invoice counter updates.
  - Confirm PDFs download with correct filenames.
- Suggest small `console.assert` checks where helpful.

**Copilot Prompt Template:**
> You are the QA & Testing Agent. Generate a short, checklist-style manual test plan for the NYT Invoice Downloader extension that covers:
> - Installing the unpacked extension.
> - Verifying fetch hook behavior.
> - Verifying the overlay panel is rendered.
> - Confirming PDF downloads for multiple invoices.
> Present the plan as markdown bullet points.

---

## Workflow With Copilot in VS Code

1. **Open the repo** and `AGENTS.md`.
2. For each file (`manifest.json`, `content.js`, `injected.js`):
   - Open a new Copilot Chat tab.
   - Paste a relevant Agent prompt from above.
   - Reference the current file: “Use the currently open file as the target.”
3. Use inline Copilot completions to refine functions:
   - Type the function signature and a clear comment.
   - Ask Copilot: “Complete this function according to the spec in AGENTS.md’s [Agent Name] section.”
4. After first working version:
   - Ask Copilot: “Act as the QA & Testing Agent and review the repo for any obvious security, permissions, or robustness issues.”

---

## 2. Ready-to-paste Copilot “master prompt”

You can use this once in Copilot Chat to orient it to the whole project:

> You are helping me build a Chrome Manifest v3 extension called "NYT Invoice Downloader". It:
> - Runs on nytimes.com billing pages.
> - Injects `injected.js` through `content.js`.
> - Hooks `window.fetch` to intercept the GraphQL operation `getDigitalInvoiceDetails` sent to `https://samizdat-graphql.nytimes.com/graphql/v2`.
> - Extracts `invoiceId` and `data.invoiceDetails.pdfDownloadUrl` from responses.
> - Stores them in a Map.
> - Shows a bottom-right overlay with a counter and a "Download all PDFs" button that iterates the Map and triggers downloads via `<a>` tags.
> Use the structure and responsibilities defined in AGENTS.md in the workspace. Propose the next 3 concrete edits or new files I should make, in order, with brief instructions for each. Then help me implement the first one.

---

If you want, next step I can:  

- Generate an initial `manifest.json`, `content.js`, and `injected.js` skeleton matching this AGENTS.md so you can drop everything into VS Code and let Copilot iterate from there.