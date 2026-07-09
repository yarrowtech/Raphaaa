# BACKEND API DOCUMENTATION

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Base URL (example):** `https://api.raphaaa.com` (production) / `http://localhost:3000` (local dev, per `backend/server.js`)
**Prepared From:** Every route definition in `backend/routes/*.js`, cross-checked against mount points in `backend/server.js` (current codebase snapshot — no endpoint listed here is inferred, all were located via direct route-declaration search)
**Companion Documents:** `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_FRS.md`, `RAPHAAA_DATABASE_STRUCTURE.md`

---

## 1. Headline Number

**198 active, reachable API endpoints**, across **41 mounted route modules** + **2 inline routes** in `server.js` (`GET /`, `GET /healthz`).

An additional **4 endpoints exist in the codebase but are not currently reachable** (their route files are never mounted in `server.js` — see Section 5), so the total endpoint *definitions* in `backend/routes/` is 202, of which 198 are live.

---

## 2. Conventions Used in This Document

| Column | Meaning |
|---|---|
| Method | HTTP verb |
| Endpoint | Full path as a client would call it (mount prefix + route path) |
| Auth | See legend below |
| Description | What the endpoint does (derived from route name, middleware, and file context) |

**Auth legend:**
| Tag | Meaning |
|---|---|
| **Public** | No middleware — callable by anyone |
| **Auth** | `protect` only — any logged-in role |
| **Admin** | `protect` + `admin` |
| **Admin/Merch** | `protect` + `adminOrMerchantise` (or `adminOrMerchantiseMiddleware`/`adminOrMerchantise` variants seen in different files) |
| **Role(x, y)** | `protect` + `roleCheck("x", "y", ...)` — restricted to the named roles |
| **Optional** | `optionalAuth` — works for both guest and logged-in users, with different behavior per case |

All authenticated requests carry `Authorization: Bearer <JWT>`. Standard error responses across the codebase follow `{ message: "..." }` with an appropriate HTTP status code (400/401/403/404/500).

---

## 3. API Inventory Summary (by Module)

| # | Module (Mount Path) | Route File | Endpoints |
|---|---|---|---|
| 1 | `/api/users` | `userRoutes.js` | 18 |
| 2 | `/api/products` | `productRoutes.js` | 13 |
| 3 | `/api/cart` | `cartRoutes.js` | 5 |
| 4 | `/api/checkout` | `checkoutRoutes.js` | 6 |
| 5 | `/api/orders` | `orderRoutes.js` | 14 |
| 6 | `/api/upload` | `uploadRoutes.js` | 3 |
| 7 | `/api` (subscribers) | `subscriberRoute.js` | 5 |
| 8 | `/api/paymentRoutes` | `paymentRoutes.js` | 8 |
| 9 | `/api/tasks` | `taskRoutes.js` | 5 |
| 10 | `/api/inventory` | `inventoryRoutes.js` | 1 |
| 11 | `/api/sales-analysis` | `salesRoutes.js` | 1 |
| 12 | `/api/reviews` | `reviewRoutes.js` | 3 |
| 13 | `/api/contact` | `contactRoutes.js` | 4 |
| 14 | `/api/website/hero` | `heroRoutes.js` | 2 |
| 15 | `/api/hero-slides` | `heroSlideRoutes.js` | 7 |
| 16 | `/api/suggestions` | `suggestionRoutes.js` | 1 |
| 17 | `/api/settings/contact` | `contactSettingRoutes.js` | 2 |
| 18 | `/api/settings/about` | `aboutRoutes.js` | 2 |
| 19 | `/api/collabs` | `collabRoutes.js` | 8 |
| 20 | `/api/payment/webhook` | `paymentWebhook.js` | 1 |
| 21 | `/api/user/addresses` | `userAddressRoutes.js` | 5 |
| 22 | `/api/settings/policy` | `policyRoutes.js` | 2 |
| 23 | `/api/offers` | `offerRoutes.js` | 6 |
| 24 | `/api/wishlist` | `wishlistRoutes.js` | 3 |
| 25 | `/api/recommendations` | `recommendationRoutes.js` | 4 |
| 26 | `/api/wallet` | `walletRoutes.js` | 5 |
| 27 | `/api/alerts` | `alertRoutes.js` | 3 |
| 28 | `/api/campaigns` | `campaignRoutes.js` | 7 |
| 29 | `/api/admin/users` | `adminRoutes.js` | 4 |
| 30 | `/api/admin/products` | `productAdminRoutes.js` | 1 |
| 31 | `/api/admin/orders` | `adminOrderRoutes.js` | 5 |
| 32 | `/api/meta-options` | `metaOptionRoutes.js` | 5 |
| 33 | `/api/complaints` | `complaintRoutes.js` | 4 |
| 34 | `/api/size-charts` | `sizeChartRoutes.js` | 4 |
| 35 | `/api/returns` | `returnRequestRoutes.js` | 13 |
| 36 | `/api/admin/analytics` | `analyticsRoutes.js` | 5 |
| 37 | `/api/qa` | `productQARoutes.js` | 4 |
| 38 | `/api/shipping-config` | `shippingConfigRoutes.js` | 2 |
| 39 | `/api/legal` | `legalRoutes.js` | 2 |
| 40 | `/api/referral` | `referralRoutes.js` | 2 |
| 41 | `/sitemap.xml` | `sitemapRoutes.js` | 1 |
| — | `/`, `/healthz` (inline in `server.js`) | — | 2 |
| | **Total** | | **198** |

---

## 4. Full Endpoint Reference

### 4.1 Authentication & User Account — `/api/users` (18)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/users/register` | Public | Register a new customer account |
| POST | `/api/users/prelogin-role` | Public | Resolve a user's role before login (role-aware login UX) |
| POST | `/api/users/login` | Public | Authenticate with email/password, issue JWT |
| POST | `/api/users/google-login` | Public | Authenticate via Google OAuth token |
| POST | `/api/users/send-otp` | Public | Send mobile OTP for verification |
| POST | `/api/users/verify-otp` | Public | Verify submitted mobile OTP |
| GET | `/api/users/profile` | Auth | Get the logged-in user's profile |
| PUT | `/api/users/update-profile` | Auth | Update the logged-in user's profile |
| POST | `/api/users/forgot-password` | Public | Request a password-reset email |
| PUT | `/api/users/reset-password/:token` | Public | Reset password using the emailed token |
| GET | `/api/users/my-coupon` | Auth | Get the user's personal coupon |
| POST | `/api/users/push-subscription` | Auth | Register a Web Push subscription |
| GET | `/api/users/my-coupons` | Auth | List coupons available to the user |
| POST | `/api/users/validate-coupon` | Auth | Validate a coupon code before checkout |
| GET | `/api/users/hierarchy` | Public | Get user/role hierarchy listing |
| POST | `/api/users/reset-password` | Auth | Change password while logged in |
| POST | `/api/users/send-email-otp` | Public | Send an email-based OTP |
| POST | `/api/users/verify-email-otp` | Public | Verify an email OTP |

### 4.2 Product Catalog — `/api/products` (13)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/products/delivery/check` | Public | Check delivery serviceability by pincode |
| POST | `/api/products` | Admin/Merch | Create a new product |
| GET | `/api/products` | Public | List/search/filter the catalog (paginated) |
| GET | `/api/products/facets` | Public | Get catalog filter facets (category/brand/price/etc.) |
| GET | `/api/products/inventory` | Admin | Get inventory listing across products |
| GET | `/api/products/by-ids` | Public | Fetch multiple products by ID list |
| GET | `/api/products/best-seller` | Public | List best-selling products |
| GET | `/api/products/new-arrivals` | Public | List newly added products |
| GET | `/api/products/similar/:id` | Public | Get products similar to a given product |
| PUT | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |
| GET | `/api/products/:id` | Public | Get single product detail |
| POST | `/api/products/:productId/reviews` | Auth | Submit a review for a product |

### 4.3 Cart — `/api/cart` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/cart` | Public | Add item to cart (guest or authenticated, via `guestId`) |
| PUT | `/api/cart` | Public | Update a cart item's quantity/variant |
| DELETE | `/api/cart` | Public | Remove an item from the cart |
| GET | `/api/cart` | Public | Fetch current cart contents |
| POST | `/api/cart/merge` | Auth | Merge a guest cart into the logged-in user's cart |

### 4.4 Checkout — `/api/checkout` (6)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/checkout/quote` | Auth | Get a price quote (shipping/discount breakdown) before placing an order |
| POST | `/api/checkout` | Auth | Create a checkout session |
| PUT | `/api/checkout/:id/pay` | Auth | Mark a checkout session as paid |
| POST | `/api/checkout/:id/finalize` | Auth | Convert a finalized checkout into an Order |
| POST | `/api/checkout/guest-quote` | Public | Get a price quote for a guest checkout |
| POST | `/api/checkout/guest-order` | Public | Place an order without an account |

### 4.5 Orders — `/api/orders` (14)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/orders/cod` | Auth | Place a Cash-on-Delivery order |
| PUT | `/api/orders/:id/status` | Auth | Update an order's fulfilment status |
| GET | `/api/orders/my-orders` | Auth | List the logged-in customer's orders |
| GET | `/api/orders` | Auth | List orders (operational/admin view) |
| GET | `/api/orders/:id` | Auth | Get order details |
| GET | `/api/orders/:id/invoice` | Auth | Generate/download the order's PDF invoice |
| GET | `/api/orders/revenue/total` | Admin/Merch | Get total revenue figure |
| POST | `/api/orders/:id/cancel` | Auth | Cancel an order (pre-fulfilment) |
| GET | `/api/orders/revenue/weekly` | Auth | Weekly revenue report |
| GET | `/api/orders/revenue/monthly` | Auth | Monthly revenue report |
| GET | `/api/orders/revenue/yearly` | Auth | Yearly revenue report |
| GET | `/api/orders/revenue/today` | Auth | Today's revenue figure |
| GET | `/api/orders/revenue/:period` | Admin/Merch | Revenue report for an arbitrary period |
| GET | `/api/orders/verify/:orderId` | Auth | Verify/look up an order by its public `orderId` |

> **Code-quality note:** `orderRoutes.js` registers a **second, unreachable `GET /` handler** later in the file (line 782) — Express matches the first-registered handler, so this duplicate is dead code worth removing.

### 4.6 Media Upload — `/api/upload` (3)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/upload` | Admin | Upload an image to Cloudinary |
| DELETE | `/api/upload/:publicId` | Admin | Delete an uploaded image by Cloudinary public ID |
| POST | `/api/upload/delete` | Admin | Delete an uploaded image (body-based variant) |

### 4.7 Newsletter/Push Subscribers — `/api` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/subscribe` | Public | Subscribe an email to the newsletter |
| POST | `/api/subscribe/push` | Public | Register a Web Push subscription for a subscriber |
| GET | `/api/unsubscribe/:email` | Public | Unsubscribe an email |
| GET | `/api/subscribers` | Auth | List all subscribers (admin/marketing view) |
| DELETE | `/api/subscribers/:id` | Auth | Delete a subscriber record |

### 4.8 Payments — `/api/paymentRoutes` (8)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/paymentRoutes/create-order` | Auth | Create a Razorpay order for checkout |
| POST | `/api/paymentRoutes/verify-payment` | Auth | Verify Razorpay payment signature and confirm payment |
| GET | `/api/paymentRoutes/order-status/:orderId` | Auth | Get current payment status for an order |
| POST | `/api/paymentRoutes/payment-failed` | Auth | Record a failed payment attempt |
| GET | `/api/paymentRoutes/payment-history` | Auth | List the user's payment history |
| POST | `/api/paymentRoutes/refund/:paymentId` | Auth | Initiate a refund for a payment |
| POST | `/api/paymentRoutes/webhook` | Public | Razorpay webhook receiver (signature-verified internally) |
| PUT | `/api/paymentRoutes/cancel/:orderId` | Auth | Cancel a payment/order |

> **Naming note:** There are **two separate webhook endpoints** in the codebase — `POST /api/paymentRoutes/webhook` (this file) and `POST /api/payment/webhook` (Section 4.20, `paymentWebhook.js`). Confirm with the Razorpay dashboard configuration which one is the actual live webhook target; the other may be legacy/unused and worth removing to avoid confusion.

### 4.9 Task Management — `/api/tasks` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/tasks` | ⚠️ None visible | Create a new task |
| GET | `/api/tasks` | ⚠️ None visible | List all tasks |
| GET | `/api/tasks/user/:email` | ⚠️ None visible | List tasks assigned to a given email |
| PUT | `/api/tasks/:id` | ⚠️ None visible | Update a task's status |
| DELETE | `/api/tasks/:id` | ⚠️ None visible | Delete a task |

> **Security note:** No `protect`/role middleware is visible on any route in `taskRoutes.js` — these currently appear open to any caller who knows the URL. Recommend adding `protect` + `adminOrMerchantise` here, consistent with the SRS Appendix C hardening item.

### 4.10 Inventory — `/api/inventory` (1)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/inventory/stock` | Public | Get current stock levels |

### 4.11 Sales Analysis — `/api/sales-analysis` (1)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/sales-analysis` | Admin | Get sales trend analysis data |

### 4.12 Reviews — `/api/reviews` (3)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/reviews/:productId` | Auth | Submit a review (with up to 5 images) for a product |
| GET | `/api/reviews/product/:productId` | Public | List reviews for a product |
| GET | `/api/reviews/my-reviews` | Auth | List the logged-in user's own reviews |

### 4.13 Contact Form — `/api/contact` (4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/contact` | Public | Submit a contact-form message |
| GET | `/api/contact` | ⚠️ None visible | List contact messages (admin inbox) |
| DELETE | `/api/contact/:id` | ⚠️ None visible | Delete a contact message |
| POST | `/api/contact/reply` | ⚠️ None visible | Reply to a contact message |

### 4.14 Hero Banner (Legacy) — `/api/website/hero` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/website/hero` | Public | Get the legacy single hero banner content |
| POST | `/api/website/hero` | Public | Create/update the hero banner (with image upload) |

### 4.15 Hero Slides (Current Carousel) — `/api/hero-slides` (7)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/hero-slides` | Public | Get visible hero slides for the storefront |
| GET | `/api/hero-slides/all` | Admin | Get all slides including hidden ones |
| POST | `/api/hero-slides` | Admin | Create a new hero slide |
| PUT | `/api/hero-slides/:id` | Admin | Update a hero slide |
| DELETE | `/api/hero-slides/:id` | Admin | Delete a hero slide |
| PATCH | `/api/hero-slides/:id/toggle` | Admin | Toggle a slide's visibility |
| POST | `/api/hero-slides/reorder` | Admin | Reorder hero slides |

### 4.16 Search Suggestions — `/api/suggestions` (1)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/suggestions` | Public | Get search/autocomplete suggestions |

### 4.17 Contact Settings (CMS) — `/api/settings/contact` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/settings/contact` | Public | Get site-wide contact/social/legal settings |
| PUT | `/api/settings/contact` | ⚠️ None visible | Update contact/social/legal settings |

### 4.18 About Page (CMS) — `/api/settings/about` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/settings/about` | Public | Get About Us page content |
| PUT | `/api/settings/about` | ⚠️ None visible | Update About Us page content |

### 4.19 Collaborations / Exclusive Drops — `/api/collabs` (8)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/collabs` | ⚠️ None visible | Create a collab/exclusive-drop showcase |
| GET | `/api/collabs/all` | Public | List all collabs (admin listing variant) |
| GET | `/api/collabs` | Public | List published collabs |
| GET | `/api/collabs/active` | Public | List currently active collabs |
| GET | `/api/collabs/:id` | Public | Get a single collab's detail |
| PUT | `/api/collabs/:id` | ⚠️ None visible | Update a collab |
| DELETE | `/api/collabs/:id` | ⚠️ None visible | Delete a collab |
| GET | `/api/collabs/footballer/:slug` | Public | Get a collaborator's showcase page by slug |

> **Code-quality note:** `GET /api/collabs/all` is registered **twice** in `collabRoutes.js` (lines 21 and 47) — the second registration is unreachable dead code.

### 4.20 Payment Webhook (Alternate) — `/api/payment/webhook` (1)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payment/webhook` | Public | Alternate/legacy Razorpay webhook receiver — see naming note in §4.8 |

### 4.21 User Addresses — `/api/user/addresses` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/user/addresses` | Auth | List the user's saved addresses |
| POST | `/api/user/addresses` | Auth | Add a new address |
| DELETE | `/api/user/addresses/:index` | Auth | Delete an address by index |
| PUT | `/api/user/addresses/:index` | Auth | Update an address by index |
| PUT | `/api/user/addresses/addresses/:index` | Auth | Duplicate/legacy path to the same update handler — likely a leftover route worth removing |

### 4.22 Privacy Policy (CMS) — `/api/settings/policy` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/settings/policy` | Public | Get Privacy Policy content |
| PUT | `/api/settings/policy` | ⚠️ None visible | Update Privacy Policy content |

### 4.23 Offers & Promotions — `/api/offers` (6)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/offers` | Admin | Create a new offer/promotion |
| GET | `/api/offers/public` | Public | List currently active public offers |
| GET | `/api/offers` | Admin | List all offers (admin view) |
| GET | `/api/offers/:id` | Admin | Get a single offer's detail |
| PUT | `/api/offers/:id` | Admin | Update an offer |
| DELETE | `/api/offers/:id` | Admin | Delete an offer |

### 4.24 Wishlist — `/api/wishlist` (3)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/wishlist` | Auth | Get the user's wishlist |
| POST | `/api/wishlist/add/:productId` | Auth | Add a product to the wishlist |
| DELETE | `/api/wishlist/remove/:productId` | Auth | Remove a product from the wishlist |

### 4.25 Recommendations — `/api/recommendations` (4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/recommendations/recently-viewed/:productId` | Auth | Record a product as recently viewed |
| GET | `/api/recommendations/recently-viewed` | Auth | Get the user's recently viewed products |
| GET | `/api/recommendations/fbt/:productId` | Public | Get "Frequently Bought Together" suggestions |
| GET | `/api/recommendations/complete-the-look/:productId` | Public | Get "Complete the Look" suggestions |

### 4.26 Wallet — `/api/wallet` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/wallet` | Auth | Get wallet balance and ledger history |
| POST | `/api/wallet/earn` | Admin | Credit wallet earnings to a user |
| POST | `/api/wallet/topup/create-order` | Auth | Create a Razorpay order to top up the wallet |
| POST | `/api/wallet/topup/verify` | Auth | Verify a wallet top-up payment |
| POST | `/api/wallet/admin-credit` | Admin | Manually credit/adjust a user's wallet |

### 4.27 Back-in-Stock / Price-Drop Alerts — `/api/alerts` (3)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/alerts/subscribe` | Public | Subscribe to a back-in-stock or price-drop alert |
| POST | `/api/alerts/unsubscribe` | Public | Unsubscribe from an alert |
| GET | `/api/alerts/my` | Auth | List the logged-in user's active alerts |

### 4.28 Campaigns — `/api/campaigns` (7)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/campaigns` | Role(marketing) | Create a marketing campaign |
| GET | `/api/campaigns` | Role(marketing) | List campaigns |
| PUT | `/api/campaigns/:id` | Role(marketing) | Update a campaign |
| DELETE | `/api/campaigns/:id` | Role(marketing) | Delete a campaign |
| GET | `/api/campaigns/r/:id` | Public | Click-tracking redirect for a campaign link |
| GET | `/api/campaigns/:id/pixel.gif` | Public | Impression-tracking pixel |
| POST | `/api/campaigns/:id/conversion` | Public | Record a conversion event for a campaign |

### 4.29 Admin — User Management — `/api/admin/users` (4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin/Merch | Create a new (staff) user |
| PUT | `/api/admin/users/:id` | Admin | Update a user (role, details) |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user |

### 4.30 Admin — Product Management — `/api/admin/products` (1)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/products` | Admin | List products scoped to the admin/merchandise view (with caching) |

### 4.31 Admin — Order Management — `/api/admin/orders` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/orders` | Admin/Merch | List orders (operational view) |
| PUT | `/api/admin/orders/:id` | Admin/Merch | Update an order (status/fulfilment) |
| DELETE | `/api/admin/orders/:id` | Admin | Delete an order |
| GET | `/api/admin/orders/stats` | Admin/Merch | Get order statistics |
| POST | `/api/admin/orders/shiprocket/sync` | Admin/Merch | Manually trigger a Shiprocket tracking sync |

### 4.32 Catalog Meta-Options — `/api/meta-options` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/meta-options/public` | Public | Get public catalog attribute values (category/collection/gender/material) |
| GET | `/api/meta-options` | Admin/Merch | List all meta-options |
| POST | `/api/meta-options` | Admin/Merch | Create a new meta-option value |
| PUT | `/api/meta-options/:id` | Admin/Merch | Update a meta-option |
| DELETE | `/api/meta-options/:id` | Admin/Merch | Delete a meta-option |

### 4.33 Complaints — `/api/complaints` (4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/complaints/add` | Auth | Submit a complaint (with optional image) |
| GET | `/api/complaints` | Auth | List complaints (own or all, per role logic) |
| GET | `/api/complaints/verify/:orderId` | Auth | Verify order eligibility before filing a complaint |
| DELETE | `/api/complaints/:id` | Auth | Delete a complaint |

### 4.34 Size Charts — `/api/size-charts` (4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/size-charts` | Public | List size chart templates |
| POST | `/api/size-charts` | Admin/Merch | Create a size chart template |
| PUT | `/api/size-charts/:id` | Admin/Merch | Update a size chart template |
| DELETE | `/api/size-charts/:id` | Admin/Merch | Delete a size chart template |

### 4.35 Return / Replace Requests — `/api/returns` (13)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/returns` | Auth | Submit a return/replace request (with evidence images) |
| GET | `/api/returns/my` | Auth | List the logged-in user's return requests |
| GET | `/api/returns` | Role(admin, merchantise, marketing) | List all return requests |
| GET | `/api/returns/:id` | Auth | Get a return request's detail |
| POST | `/api/returns/:id/approve` | Role(admin, merchantise, marketing) | Approve a return request |
| POST | `/api/returns/:id/reject` | Role(admin, merchantise, marketing) | Reject a return request |
| POST | `/api/returns/:id/pickup` | Role(admin, merchantise, marketing) | Schedule reverse pickup |
| POST | `/api/returns/:id/picked-up` | Role(admin, merchantise, marketing) | Mark item picked up |
| POST | `/api/returns/:id/received` | Role(admin, merchantise, marketing) | Mark item received at warehouse |
| POST | `/api/returns/:id/replacement-dispatched` | Role(admin, merchantise, marketing) | Mark replacement dispatched |
| POST | `/api/returns/:id/replacement-delivered` | Role(admin, merchantise, marketing) | Mark replacement delivered |
| POST | `/api/returns/:id/sync-shiprocket` | Role(admin, merchantise, marketing) | Sync reverse-pickup status with Shiprocket |
| POST | `/api/returns/:id/refund-complete` | Role(admin, merchantise, marketing) | Mark refund as completed |

### 4.36 Admin Analytics — `/api/admin/analytics` (5)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/analytics/overview` | Admin/Merch | Get overall analytics dashboard summary |
| GET | `/api/admin/analytics/funnel` | Admin/Merch | Get conversion funnel analytics |
| GET | `/api/admin/analytics/cancellation-reasons` | Admin/Merch | Get order cancellation reason breakdown |
| GET | `/api/admin/analytics/return-reasons` | Admin/Merch | Get return reason breakdown |
| GET | `/api/admin/analytics/retention-cohorts` | Admin/Merch | Get customer retention cohort analysis |

### 4.37 Product Q&A — `/api/qa` (4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/qa/:productId` | Public | List Q&A for a product |
| POST | `/api/qa/:productId` | Optional | Ask a question on a product (guest or logged-in) |
| POST | `/api/qa/:questionId/answer` | Optional | Answer a product question |
| PATCH | `/api/qa/:questionId/helpful` | Public | Mark a Q&A entry as helpful |

### 4.38 Shipping Configuration — `/api/shipping-config` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/shipping-config` | Public | Get current shipping fee/zone configuration |
| PUT | `/api/shipping-config` | Admin | Update shipping fee/zone configuration |

### 4.39 Legal Pages — `/api/legal` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/legal/:type` | Public | Get a legal page's content by type |
| PUT | `/api/legal/:type` | Admin | Update a legal page's content |

### 4.40 Referral Program — `/api/referral` (2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/referral/my-code` | Auth | Get the user's referral code |
| POST | `/api/referral/apply` | Auth | Apply a referral code |

### 4.41 Sitemap — `/sitemap.xml` (1)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/sitemap.xml` | Public | Generate the storefront's XML sitemap |

### 4.42 System — Root & Health (2, inline in `server.js`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Welcome/API root message |
| GET | `/healthz` | Public | Health-check endpoint for uptime monitoring |

---

## 5. Routes Defined but NOT Currently Mounted (Dead Code)

These route files exist in `backend/routes/` but are **not wired up** in `server.js` — calling them would 404, since Express never registers them. Flagged here so they aren't mistaken for live API surface:

| File | Endpoints Defined | Status |
|---|---|---|
| `merchRoutes.js` | `POST /login` | Import and `app.use` are both **commented out** in `server.js` (lines 22, 191) |
| `websiteRoutes.js` | `GET /about`, `POST /about` | Never imported/mounted in `server.js` — appears superseded by `aboutRoutes.js` (`/api/settings/about`) |
| `notificationRoutes.js` | `POST /send-new-arrivals` | Never imported/mounted in `server.js` |

*Recommendation: either mount these intentionally or delete them — as-is they are unreachable dead code that could confuse future maintainers into thinking they're part of the live API.*

---

## 6. Findings Summary (Code-Quality Observations)

| # | Finding | Location |
|---|---|---|
| 1 | Duplicate `GET /` handler (second is unreachable) | `orderRoutes.js` |
| 2 | Duplicate `GET /all` handler (second is unreachable) | `collabRoutes.js` |
| 3 | Two independent webhook endpoints for the same purpose (`/api/paymentRoutes/webhook` and `/api/payment/webhook`) | `paymentRoutes.js`, `paymentWebhook.js` |
| 4 | Redundant path alias (`PUT /:index` and `PUT /addresses/:index` both hit the same handler) | `userAddressRoutes.js` |
| 5 | No visible `protect`/role middleware on write routes | `taskRoutes.js` (all 5 routes), `contactRoutes.js` (GET/DELETE/reply), `contactSettingRoutes.js` (PUT), `aboutRoutes.js` (PUT), `collabRoutes.js` (POST/PUT/DELETE), `policyRoutes.js` (PUT) |
| 6 | Three route files defined but never mounted | `merchRoutes.js`, `websiteRoutes.js`, `notificationRoutes.js` |

Findings #5 and #6 corroborate the hardening item already tracked in `RAPHAAA_SRS.md` Appendix C and scoped into **Phase 2** of `RAPHAAA_PROJECT_PHASES.md` — this document gives that item a concrete, file-by-file checklist to work from.

---
**Document Type:** Backend API Reference Documentation
**Project:** Raphaaa E-Commerce Platform
**Companion Documents:** `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_FRS.md`, `RAPHAAA_DATABASE_STRUCTURE.md`, `RAPHAAA_SRS.md`, `RAPHAAA_PROJECT_PHASES.md`
