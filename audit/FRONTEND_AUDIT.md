# Frontend audit — 1 October 2026

The frontend builds successfully, but the reviewed code has release-blocking security and checkout defects. Prioritize the public HTML injection path, guest-order price validation, and checkout failure handling before cosmetic work.

This is a source audit plus limited browser smoke testing, not certification of every customer/admin workflow. No application source was changed and no orders, payments, registrations, or CMS edits were submitted.

## Coverage and evidence

- Reviewed routing, authentication/storage, storefront/search/filtering, product/cart/wishlist flows, checkout/payment integration, confirmation, shared layouts, CMS rendering, admin integration, accessibility patterns, dependencies, deployment configuration, and metadata.
- `npm run build`: passed; 3,927 modules transformed. Main JS: **3,719.18 kB**, **1,069.74 kB gzip**. CSS: **464.04 kB**, **82.40 kB gzip**. Vite emitted a chunk-size warning.
- `npm run lint`: **118 errors, 20 warnings across 165 inspected files**. Errors include 109 unused-variable findings, seven undefined-name findings, one parse failure and one empty-block finding. These are not 118 independently verified runtime bugs.
- `npm audit`: **18 affected dependency entries: 2 critical, 7 high, 8 moderate, 1 low**. Registry severity is not proof of exploitability in this application.
- Firefox smoke checks: **26 route/viewport combinations** at actual CSS viewport widths **1,366 and 500 px**. Requested 390 px was clamped by headless Firefox to 500 px. No document-level horizontal overflow in these checks.
- Routes sampled: `/`, `/collections/all`, `/login`, `/register`, `/checkout`, `/wishlist`, `/settings`, `/about`, `/privacy-policy`, `/terms`, `/admin`, a nonexistent product, and a nonexistent route. Anonymous `/wishlist` and `/admin` redirected to login.
- Browser reproduced a blank root after malformed cart storage, and focus entering an offscreen closed drawer.
- Local API requests to `http://localhost:9000` did not return usable data. Populated collections, valid products, authenticated accounts/admin screens and payment completion could not be verified end-to-end. No physical mobile, Safari/Chromium, automated contrast audit, or Lighthouse/Core Web Vitals measurement was performed.
- Evidence: [browser-results.json](browser-results.json), [eslint-results.json](eslint-results.json), [dependency-audit.json](dependency-audit.json). Current HEAD at report time: `2686064`.

## Findings

### 1. P0 — Public CMS writes lead to stored script execution in the storefront

**Evidence:** [frontend/src/components/Common/About.jsx:42](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Common/About.jsx:42), [frontend/src/components/Common/PrivacyPolicy.jsx:31](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Common/PrivacyPolicy.jsx:31), [backend/routes/aboutRoutes.js:20](/run/media/meow/Bala/experimental/Raphaaa/backend/routes/aboutRoutes.js:20), [backend/routes/policyRoutes.js:21](/run/media/meow/Bala/experimental/Raphaaa/backend/routes/policyRoutes.js:21), and their unguarded mounts in [backend/server.js:175](/run/media/meow/Bala/experimental/Raphaaa/backend/server.js:175) and `:179`.

About and Privacy render server content using `dangerouslySetInnerHTML`. Both corresponding PUT handlers accept and store arbitrary `content` without authentication/authorization or HTML sanitization. A caller can persist HTML event handlers that run when a shopper visits these pages. Authentication tokens are stored in JavaScript-readable localStorage, increasing the impact. This is a source-confirmed application path; no malicious content was submitted and deployed perimeter controls were not tested.

**Fix:** protect both write endpoints with authenticated role checks; sanitize HTML using an explicit allowlist at ingestion and rendering; inspect existing stored content. Apply the same sanitation policy to LegalPage and MarketingBroadcast HTML sinks. Frontend route guards cannot secure these APIs.

### 2. P1 — Guest checkout trusts client-provided prices

**Evidence:** [frontend/src/components/Cart/GuestCheckout.jsx:97](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/GuestCheckout.jsx:97), [backend/routes/checkoutRoutes.js:218](/run/media/meow/Bala/experimental/Raphaaa/backend/routes/checkoutRoutes.js:218).

GuestCheckout sends `orderItems` and `totalPrice`; the public guest-order endpoint writes them directly to an order. Unlike authenticated Razorpay checkout, it never recalculates the order price from products on the server. A modified request can set an arbitrary total independent of the displayed quote. This backend boundary was inspected because it is required to assess the frontend checkout flow.

**Fix:** server-side product/variant, quantity, stock and pricing validation; calculate shipping and totals authoritatively during order creation. Never use the displayed client total as authoritative. Add repeat-submission protection.

### 3. P1 — Failed order creation leaves checkout permanently busy

**Evidence:** [frontend/src/components/Cart/Checkout.jsx:581](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/Checkout.jsx:581), `:632`, `:647`, `:654`, `:802`.

`handleCreateOrder` sets `orderProcessing` to true. COD/Razorpay rejected actions and the catch branch reset `orderInitiated`, but not `orderProcessing`; the finally block resets only `submitDisabled`. Since `isContinueDisabled` includes `orderProcessing`, a network/server rejection leaves “Wait…” and prevents retrying without leaving/reloading the page. Switching methods is not a reliable recovery when no order ID was created.

**Fix:** reset processing state on every creation failure and present the thunk's rejected payload. Verify network failure, invalid address, insufficient stock and backend validation rejection paths.

### 4. P1 — Selecting another delivery address does not refresh the price quote

**Evidence:** [frontend/src/components/Cart/Checkout.jsx:255](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/Checkout.jsx:255), `:280`, `:295`; [backend/services/pricingService.js:279](/run/media/meow/Bala/experimental/Raphaaa/backend/services/pricingService.js:279).

The quote request uses `shippingAddress`, but its effect depends only on cart products, payment method, coupons and wallet redemption. Selecting/loading an address or changing its PIN code does not independently refresh the quote, although backend zone charges depend on the PIN code. In-flight requests also have no response-order guard, and order submission is enabled while a new quote is pending.

**Fix:** include address/pricing inputs in quote invalidation, discard obsolete responses, and require a current successful quote before submission. Check selecting two addresses in different shipping zones.

### 5. P1 — Price mismatch routes an unpaid online order to the success page

**Evidence:** [frontend/src/components/Cart/Checkout.jsx:639](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/Checkout.jsx:639), [frontend/src/pages/OrderConfirmationPage.jsx:36](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/pages/OrderConfirmationPage.jsx:36) and its unconditional success header.

When the backend amount differs from `displayTotal`, checkout clears checkout state and navigates to `/order-confirmation` with the order ID. The confirmation page clears the local cart on receipt of that ID and displays “Order Placed Successfully!” without payment verification. Stale quotes from finding 4 can trigger this during legitimate checkout.

**Fix:** reconcile the authoritative amount and request customer confirmation before payment, or show an explicit pending-payment screen. Only use the paid confirmation flow after successful verification; retain a recoverable cart for unpaid/failed online orders.

### 6. P2 — Checkout price breakdown double-counts included amounts

**Evidence:** [frontend/src/components/Cart/Checkout.jsx:192](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/Checkout.jsx:192), `:215`, `:221`; [frontend/src/utils/gst.js:9](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/utils/gst.js:9); [backend/services/pricingService.js:287](/run/media/meow/Bala/experimental/Raphaaa/backend/services/pricingService.js:287).

The GST helper extracts tax already included in product prices, but the fallback total adds that tax again. With a valid quote and no discount, `discountsTotal` still includes the extracted GST, creating fictitious savings. The mobile `feesTotal` additionally adds `zoneCharge` even though the server's `shipping` already includes it. Wallet redemption is included in the calculated discount and also shown separately. COD charges are displayed as ₹0 even though backend configuration can add a charge.

For example, with ₹1,000 of products, no fees/discounts/wallet and a quoted total of ₹1,000, the discount formula displays approximately ₹47.62 of savings solely from extracting included tax.

**Fix:** use explicit server quote fields for all monetary lines, never add inclusive GST to the total, and verify that subtotal plus fees minus actual discounts and wallet exactly equals the displayed payable amount. This is an arithmetic finding, not a review of current tax-law rates.

### 7. P2 — Wishlist “Buy Now” ignores the chosen product

**Evidence:** [frontend/src/components/Layout/WishlistDrawer.jsx:9](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Layout/WishlistDrawer.jsx:9), [frontend/src/components/Cart/Checkout.jsx](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/Checkout.jsx), [frontend/src/pages/Login.jsx:34](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/pages/Login.jsx:34).

The drawer navigates to `/checkout?productId=...` without adding an item. Checkout only reads the cart and does not consume this query parameter. The shopper gets an empty checkout or their unrelated existing cart. The guest path uses `redirect=checkout`, which Login rejects because it requires a leading slash, and loses the product selection.

**Fix:** navigate to the product for required variant selection, or explicitly add a validated variant before checkout. Preserve a valid absolute application path through login.

### 8. P1 — Malformed saved data prevents the entire app from rendering

**Evidence:** [frontend/src/redux/slices/cartSlice.js:215](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/redux/slices/cartSlice.js:215), [frontend/src/redux/slices/authSlice.js:286](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/redux/slices/authSlice.js:286), [frontend/src/main.jsx:14](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/main.jsx:14).

Both slices parse localStorage JSON at module initialization without recovery. In an isolated browser profile, setting `cart` to `{broken` and refreshing produced **zero root children and an empty page**. Removing the invalid value restored rendering. There is no root error boundary; an error boundary alone also cannot catch errors thrown before the app mounts.

**Fix:** guard storage reads/parsing, validate stored shapes, discard invalid records, and provide safe defaults. Add rendering error boundaries separately for runtime component failures.

### 9. P2 — Closed drawers remain keyboard-focusable

**Evidence:** [frontend/src/components/Layout/CartDrawer.jsx:44](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Layout/CartDrawer.jsx:44), [frontend/src/components/Layout/WishlistDrawer.jsx:29](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Layout/WishlistDrawer.jsx:29).

Drawers remain mounted and are hidden only with transforms. Their buttons remain focusable and exposed to assistive technology. Browser testing focused the closed cart close button at x=835 while the viewport was only 500 px wide. Open drawers lack dialog semantics, focus trapping/restoration and Escape handling; close buttons have no accessible names.

**Fix:** make closed contents inert/hidden to interaction, name the close controls, and implement modal focus lifecycle and keyboard dismissal. Preserve saved-for-later data in state rather than relying on interactive offscreen DOM.

### 10. P2 — Form controls lack explicit accessible labels

**Evidence:** [frontend/src/pages/Register.jsx:149](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/pages/Register.jsx:149), [frontend/src/components/Common/Footer.jsx:120](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Common/Footer.jsx:120), [frontend/src/components/Cart/GuestCheckout.jsx:157](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/GuestCheckout.jsx:157).

Browser inspection found all four registration inputs without associated labels or ARIA labels. The shared footer email input is placeholder-only. Guest checkout renders labels adjacent to inputs without `htmlFor`/matching IDs. Placeholder text disappears after entry and does not provide a persistent visible label; the audit's unnamed-button heuristic also flagged shared icon controls.

**Fix:** associate visible labels with inputs; add names to icon buttons, appropriate autocomplete attributes and programmatically linked errors. Follow with keyboard and screen-reader testing; the browser heuristic is not a complete accessibility conformance test.

### 11. P2 — Payment script failure has no timeout or cleanup

**Evidence:** [frontend/src/components/Cart/RazorpayButton.jsx:388](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/RazorpayButton.jsx:388), `:401`.

Payment startup polls `window.Razorpay` every 200 ms indefinitely. If the external script is blocked or fails to load, there is no timeout, script `onerror`, customer-facing recovery or unmount cleanup for the polling interval. Repeated clicks can create multiple pollers/payment openings. Checkout also passes a backend `keyId`, but RazorpayButton ignores it and exclusively uses its build-time environment key.

**Fix:** load the SDK once through a shared promise with a bounded timeout/error state, disable concurrent starts, clean up on unmount, and use the key associated with the created backend order.

### 12. P2 — Guest confirmation offers invoice/track actions that require an account

**Evidence:** [frontend/src/pages/OrderConfirmationPage.jsx:47](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/pages/OrderConfirmationPage.jsx:47), `:83`, its action buttons; [backend/routes/orderRoutes.js:630](/run/media/meow/Bala/experimental/Raphaaa/backend/routes/orderRoutes.js:630), `:690`.

GuestCheckout explicitly enters confirmation with `isGuest: true`, but confirmation still fetches protected order details and invoices with `Bearer null`. The invoice endpoint requires authentication, so the guest invoice button cannot succeed. “Track My Order” goes to `/profile`, not a guest tracking flow.

**Fix:** provide a securely scoped guest-access mechanism or tailor the controls to supported guest behavior. Avoid redundant unauthorized detail fetches when the guest order response already contains display data.

### 13. P2 — Guest cart returns after completing an order

**Evidence:** [frontend/src/components/Cart/GuestCheckout.jsx:97](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/GuestCheckout.jsx:97), [backend/routes/checkoutRoutes.js:218](/run/media/meow/Bala/experimental/Raphaaa/backend/routes/checkoutRoutes.js:218), [frontend/src/pages/OrderConfirmationPage.jsx:36](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/pages/OrderConfirmationPage.jsx:36), [frontend/src/components/Layout/CartDrawer.jsx:15](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Layout/CartDrawer.jsx:15).

Confirmation clears Redux/localStorage only. Guest order creation neither receives a guest cart identity nor deletes that cart. Opening the cart drawer calls `fetchCart` for the unchanged guest ID and can restore the already-purchased items from the server, inviting duplicate purchases.

**Fix:** consume the correct server-side guest cart on successful order creation and reset/rotate its client identity consistently. Validate reopening and refreshing the cart after guest checkout.

### 14. P2 — Initial storefront download includes heavy admin/reporting code

**Evidence:** [frontend/src/App.jsx:1](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/App.jsx:1), build output.

Most customer and admin pages are eagerly imported, including dependencies used for spreadsheet exports, charts, rich-text editing and invoices. Only a small number of components are lazy-loaded. The measured main bundle is 3.72 MB uncompressed / 1.07 MB gzip before images and CSS, imposing download/parse work on first-time storefront visitors.

**Fix:** lazy-load route modules, split admin routes from the storefront, and dynamically import export/editor tools at their point of use. Measure real-device performance after splitting; bundle size alone is not a measured loading-time score.

### 15. P1 — Dependency audit reports critical/high affected packages

**Evidence:** [dependency-audit.json](dependency-audit.json), [frontend/package.json](/run/media/meow/Bala/experimental/Raphaaa/frontend/package.json).

The registry reported two critical entries (`jspdf`, `swiper`) and seven high entries, including direct dependencies `xlsx` and `firebase`, plus transitive packages. `jsPDF` is imported by OrderDetailsPage and `xlsx` by UserManagement. Some advisories concern server-only APIs or configurations and may not be reachable in this browser application; dependency counts include transitive propagation.

**Fix:** inventory reachable usage, upgrade or replace affected packages, remove unused/server-only dependencies from the frontend, and rerun audit/build. Do not blindly use force upgrades: the audit proposes major-version changes for some packages and reports no npm fix for the installed `xlsx` package line. Advisory URLs and ranges are retained in the evidence file.

### 16. P2 — Lint gate fails, and unused Q&A code does not parse

**Evidence:** [eslint-results.json](eslint-results.json), [frontend/src/components/Products/ProductQA.jsx:109](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Products/ProductQA.jsx:109), [frontend/src/components/Cart/ViewAddress.jsx:133](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/ViewAddress.jsx:133).

ProductQA ends with an empty `return ( );`, causing a parse error. Its ProductDetails import is commented out, explaining why the production build still succeeds. ViewAddress has undefined `setWishlistItems`, `dispatch`, `logout` and `clearCart` references in unused handlers. The service worker `clients` and Tailwind `module` findings are environment configuration issues, not proof those globals fail in their actual execution environments.

**Fix:** repair/remove dead modules and handlers, configure ESLint environments correctly, and establish a passing lint baseline. There is no frontend test script or discovered frontend test suite; add targeted regression coverage for the checkout/security/storage defects rather than tests that only mirror rendering.

### 17. P2 — Product cart limit reads a storage structure the app never writes

**Evidence:** [frontend/src/components/Products/ProductDetails.jsx:1158](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Products/ProductDetails.jsx:1158), [frontend/src/redux/slices/cartSlice.js:216](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/redux/slices/cartSlice.js:216), [frontend/src/redux/store.js](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/redux/store.js).

The ten-item check reads `persist:root.cart.cartItems`. The actual cart slice stores `cart` with a `products` array, and the store does not configure redux-persist. Consequently, normal saved cart contents count as zero during the product-page check, allowing repeated additions to exceed the displayed ten-item policy.

**Fix:** derive the aggregate from the live Redux cart and enforce the same rule server-side if it is a business requirement.

### 18. P3 — Online checkout silently drops the order note

**Evidence:** [frontend/src/components/Cart/Checkout.jsx:611](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Cart/Checkout.jsx:611), [frontend/src/redux/slices/checkoutSlice.js:240](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/redux/slices/checkoutSlice.js:240), [backend/routes/paymentRoutes.js:450](/run/media/meow/Bala/experimental/Raphaaa/backend/routes/paymentRoutes.js:450).

The UI collects `orderNote` and includes it in `orderData`, but the Razorpay thunk reconstructs the request without it and the online-order route does not consume it. COD passes the complete payload and persists the note. Online shoppers can enter delivery instructions that never reach fulfillment.

**Fix:** propagate and persist the note consistently for each payment path, or remove the unsupported field for that flow.

### 19. P3 — Content fetch failures appear as permanent loading

**Evidence:** [frontend/src/components/Common/About.jsx:13](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Common/About.jsx:13), [frontend/src/components/Common/PrivacyPolicy.jsx:14](/run/media/meow/Bala/experimental/Raphaaa/frontend/src/components/Common/PrivacyPolicy.jsx:14).

Failed requests only log errors. With empty content, the view continues to say “Loading content…” or “Loading privacy policy…” indefinitely. Empty saved content has the same behavior. LegalPage instead maps errors to “Content coming soon,” concealing service failures as missing editorial content.

**Fix:** distinguish loading, empty, failure and success states; show a retryable failure message and retain previously loaded content only where appropriate.

## Additional gaps and remediation order

Route metadata is inconsistent: collection/product routes set metadata while many informational/account views retain the global title. App's visibility handler captures the initial title and restores it on tab return, which can overwrite a later route title. Product SEO/social previews and crawlability need validation against the deployed rendering strategy; local SPA behavior is not enough to establish search-engine outcomes.

1. Close the public CMS write/HTML execution path and fix server-authoritative guest pricing.
2. Repair order failure recovery, quote invalidation, unpaid confirmation routing and storage initialization.
3. Correct pricing display, guest lifecycle, wishlist purchase flow and SDK loading; add focused regression checks.
4. Triage dependencies and establish passing lint/build gates.
5. Repair keyboard/label issues, split routes, then run authenticated end-to-end checks with a local/test backend, payment sandbox, 320/390/768 px viewports and multiple browsers.

The source defects above are actionable now. A claim that the entire frontend is verified would require the missing data-backed and authenticated tests.
