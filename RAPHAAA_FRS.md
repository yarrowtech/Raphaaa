# FUNCTIONAL REQUIREMENTS SPECIFICATION (FRS)

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Prepared From:** Current codebase snapshot (`/backend`, `/frontend`, `/ml`)
**Companion Documents:** `RAPHAAA_SRS.md`, `RAPHAAA_PROJECT_SYNOPSIS.md`, `RAPHAAA_FUNCTIONAL_DOCUMENTATION.md`

---

## 1. Document Information

### 1.1 Purpose
This Functional Requirements Specification (FRS) describes, in detail, **how** each functional capability of the Raphaaa platform behaves — actors involved, triggering conditions, step-by-step process flow, business rules, validations, exception handling, and expected outcomes. Where the SRS states *what* the system must do at a requirement level, this FRS expands each requirement into its operational behavior, suitable for use as a build and test reference.

### 1.2 Scope
Covers all customer-facing and internal-operations functionality of Raphaaa: authentication, catalog, cart/wishlist, checkout, payments, orders, reviews, returns, marketing (offers/campaigns/subscribers), inventory/analytics, task and complaint management, CMS content, media upload, and recommendations.

### 1.3 Intended Audience
Developers (implementation reference), QA engineers (test case derivation), business/product stakeholders (behavior sign-off), and future maintainers.

### 1.4 Definitions and Acronyms
| Term | Meaning |
|---|---|
| FR | Functional Requirement |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| COD | Cash on Delivery |
| SKU/Variant | A specific size/colour configuration of a product |
| Webhook | Asynchronous server-to-server payment event notification |
| CMS | Content-managed storefront sections (Hero/About/Contact/Policy) |

### 1.5 System Actors
| Actor | Description |
|---|---|
| Guest | Unauthenticated site visitor |
| Customer | Registered, authenticated shopper |
| Admin | Full-privilege operator |
| Merchandise | Product/order/inventory operations staff |
| Delivery Boy | Fulfilment/delivery staff |
| Marketing | Campaign and communication staff |
| System (Scheduler) | Automated background process (Node-Cron jobs) |
| Payment Gateway | External actor (Razorpay/PayPal) triggering webhook events |

---

## 2. Functional Requirement Groups

Each functional area below is documented as: **Description → Actors → Preconditions → Main Flow → Business Rules → Alternate/Exception Flow → Postconditions.**

---

### FR-GROUP-01: User Registration & Authentication

**Description:** Allows a visitor to create an account and authenticate into the system.

**Actors:** Guest, Customer, System

**Preconditions:** User has a valid email address or mobile number.

**Main Flow (Registration):**
1. Guest submits name, email/mobile, and password on the Register form.
2. System validates input format (email pattern, password length/strength).
3. System checks for an existing account with the same email/mobile.
4. System hashes the password (Bcrypt) and creates a new User record with role = `customer`.
5. System issues a JWT and returns it to the client; client stores it for session use.

**Main Flow (Login):**
1. User submits email/mobile and password, or initiates Google login.
2. System verifies credentials against stored hash (or validates Google OAuth token).
3. On success, system issues a JWT containing user ID and role.
4. Client persists the token and attaches it as a Bearer token on subsequent requests.

**Main Flow (OTP Verification):**
1. User requests an OTP for mobile/email verification (`send-otp`).
2. System generates a time-bound OTP and dispatches it via SMS/email provider.
3. User submits the OTP (`verify-otp`); system validates code and expiry.
4. On success, system marks the corresponding contact method as verified.

**Business Rules:**
- Passwords must never be stored or logged in plaintext.
- Duplicate registration with the same verified email/mobile is rejected.
- OTPs expire after a configured time window and are single-use.
- JWTs carry an expiry; expired tokens are rejected on protected routes.

**Alternate/Exception Flow:**
- Invalid credentials → return 401 with a generic "invalid credentials" message (no user-enumeration hints).
- Duplicate registration attempt → return 409 with a clear conflict message.
- Expired/incorrect OTP → return an error and allow OTP resend after a cooldown.

**Postconditions:** User has an authenticated session (JWT) usable for role-appropriate actions.

---

### FR-GROUP-02: Password Reset

**Description:** Allows a user who has forgotten their password to regain account access.

**Actors:** Customer, Admin, System

**Main Flow:**
1. User submits their registered email on the "Forgot Password" form.
2. System generates a signed, time-limited reset token and emails a reset link.
3. User opens the link and submits a new password.
4. System validates the token (signature + expiry) and updates the password hash.

**Business Rules:**
- Reset tokens are single-use and expire after a configured window.
- Reset does not reveal whether the submitted email exists in the system (prevents enumeration).

**Postconditions:** User can log in with the new password; old password is invalidated.

---

### FR-GROUP-03: Role-Based Access Control

**Description:** Restricts access to features and data based on the authenticated user's role.

**Actors:** All authenticated roles, System

**Main Flow:**
1. Every protected API request includes a JWT.
2. Middleware (`protect`) verifies the token and attaches the user context to the request.
3. Role-specific middleware (`admin`, `adminOrMerchantise`, generic role guard) checks the user's role against the route's allowed roles.
4. Request proceeds only if the role check passes; otherwise a 403 is returned.
5. Frontend route guards mirror backend checks to hide/prevent navigation to unauthorized admin sections.

**Business Rules:**
- Backend role enforcement is authoritative; frontend guarding is a UX convenience only, never the sole control.
- A user has exactly one role at a time.

**Exception Flow:** Unauthorized access attempt → 401 (not authenticated) or 403 (authenticated but wrong role), with no sensitive data leaked in the response.

---

### FR-GROUP-04: Product Catalog Browsing & Search

**Description:** Enables any visitor to discover products via listing, filtering, search, and detail views.

**Actors:** Guest, Customer

**Main Flow:**
1. User navigates to the storefront home, a collection page, or an exclusive-drop page.
2. System retrieves matching products (optionally filtered by category, price range, size, colour, or search keyword) with pagination.
3. User selects a product; system returns full product detail — images, description, price, available variants, size chart, and existing reviews/Q&A.
4. User may add the product to cart or wishlist directly from listing or detail views.

**Business Rules:**
- Only active/published products are shown to Guest/Customer.
- Out-of-stock variants are visibly disabled for selection but still displayed for discoverability.

**Postconditions:** User has viewed product information sufficient to make an add-to-cart decision.

---

### FR-GROUP-05: Product Management (Admin/Merchandise)

**Description:** Enables authorized staff to maintain the product catalog.

**Actors:** Admin, Merchandise

**Main Flow:**
1. Staff opens the Admin Product Management screen.
2. Staff creates a new product (name, description, price, category, variants, images) or edits/deletes an existing one.
3. System validates required fields and persists changes.
4. Uploaded images are sent to Cloudinary; the returned URLs are stored on the product record.
5. Catalog changes are immediately reflected on the public storefront.

**Business Rules:**
- Only Admin/Merchandise roles may create, edit, or delete products.
- Deleting a product referenced by historical orders does not remove those orders' line-item snapshots.

**Exception Flow:** Invalid/missing required fields → validation error returned with field-level messages.

---

### FR-GROUP-06: Cart Management

**Description:** Allows a user to build a set of intended purchases prior to checkout.

**Actors:** Guest (session-based), Customer

**Main Flow:**
1. User adds a product (with selected variant and quantity) to the cart.
2. System validates stock availability for the requested quantity.
3. User may update quantity or remove items; system recalculates cart subtotal on each change.
4. For authenticated users, cart contents persist server-side and are restored on next login.

**Business Rules:**
- Cart quantity cannot exceed available stock for a given variant.
- Cart prices reflect current catalog price at time of viewing (not locked until checkout).

**Postconditions:** Cart state accurately reflects the user's selected items and is ready for checkout.

---

### FR-GROUP-07: Wishlist Management

**Description:** Allows an authenticated customer to save products of interest for later.

**Actors:** Customer

**Main Flow:**
1. Customer adds/removes a product from their wishlist from the product card or detail page.
2. System persists the wishlist against the customer's user ID.
3. Customer can view and act on (add-to-cart from) their wishlist at any time.

**Business Rules:** Wishlist is available only to authenticated customers.

---

### FR-GROUP-08: Checkout & Address Management

**Description:** Captures shipping details and converts a cart into a submitted order.

**Actors:** Customer

**Main Flow:**
1. Customer proceeds to checkout from the cart.
2. Customer selects a saved address or enters a new one; new addresses may optionally be saved to their address book.
3. System calculates order total (items + shipping, per shipping configuration) and displays it for confirmation.
4. Customer selects a payment method (Razorpay, PayPal, or COD where enabled) and confirms.
5. System creates a Checkout/Order record in a pending state pending payment confirmation (or directly confirmed for COD).

**Business Rules:**
- An order cannot be created from an empty cart.
- Address fields (name, phone, pin code, address lines) are validated before checkout proceeds.
- Stock is re-validated at checkout time to prevent overselling between cart-add and checkout.

**Exception Flow:** Stock insufficient at checkout time → customer is notified and the affected line item is flagged for adjustment before proceeding.

**Postconditions:** An order exists in the system in a state consistent with the chosen payment method.

---

### FR-GROUP-09: Payment Processing

**Description:** Handles online payment initiation, verification, and reconciliation.

**Actors:** Customer, Payment Gateway (Razorpay/PayPal), System

**Main Flow (Razorpay):**
1. System creates a Razorpay order and returns payment parameters to the client.
2. Customer completes payment on the Razorpay-hosted interface.
3. Client submits the payment response (order ID, payment ID, signature) to the backend verification endpoint.
4. System verifies the signature against the Razorpay secret; on success, marks the order as paid.
5. Razorpay independently sends a webhook event; the webhook handler idempotently confirms/reconciles the payment and updates inventory.

**Main Flow (PayPal):** Analogous flow using the PayPal button component and PayPal's confirmation callback.

**Main Flow (COD):** Order is confirmed without an online payment step; payment status is marked "pending — COD" until fulfilment.

**Business Rules:**
- Orders are only marked "confirmed/paid" after signature/webhook verification — never on client-reported success alone.
- Webhook processing must be idempotent (a repeated webhook for the same event must not double-decrement stock or duplicate confirmation).
- Stock is decremented only upon confirmed payment (or confirmed COD order), not at cart or checkout-initiation time.

**Exception Flow:** Signature mismatch or webhook validation failure → payment is not confirmed; order remains pending and is flagged for manual/automated retry review.

**Postconditions:** Order and payment status accurately reflect the true transaction outcome; inventory is correctly decremented exactly once.

---

### FR-GROUP-10: Order Lifecycle & Fulfilment Management

**Description:** Tracks an order from placement through delivery.

**Actors:** Customer, Admin, Merchandise, Delivery Boy

**Main Flow:**
1. Confirmed order enters the operational order queue.
2. Admin/Merchandise update order status through defined stages (e.g., processing → shipped → out for delivery → delivered), and may cancel where applicable.
3. Delivery Boy views orders assigned/relevant to their fulfilment role and updates delivery-stage status as permitted.
4. Customer views real-time order status and details on their Order History page.

**Business Rules:**
- Status transitions follow a defined forward sequence; arbitrary backward transitions are restricted to Admin override.
- Cancellation is only permitted before a defined fulfilment cutoff stage (e.g., before shipment).

**Postconditions:** Order status is consistent and visible identically to both the customer and internal staff views.

---

### FR-GROUP-11: Return Request Management

**Description:** Allows a customer to request a return/refund on an eligible delivered order and staff to process it.

**Actors:** Customer, Admin, Merchandise

**Main Flow:**
1. Customer opens an eligible delivered order and submits a return request with reason (and optional images).
2. System validates the order is within the return-eligibility window.
3. Admin/Merchandise reviews the request and approves, rejects, or requests more information.
4. On approval, the return proceeds through pickup/refund stages tracked on the ReturnRequest record.

**Business Rules:** Return requests are only permitted for delivered orders within the configured return window.

---

### FR-GROUP-12: Reviews & Product Q&A

**Description:** Allows customers to rate/review purchased products and ask product questions.

**Actors:** Customer, Admin, Merchandise

**Main Flow (Review):**
1. Customer opens a delivered order's product and submits a rating, written review, and optional images.
2. System stores the review linked to the product and the purchasing customer.
3. Review appears on the product detail page; Admin/Merchandise may moderate/remove inappropriate content.

**Main Flow (Q&A):**
1. Any customer submits a question on a product detail page.
2. Staff or other customers may respond; system stores the Q&A thread against the product.

**Business Rules:** A review is ideally tied to a verified purchase (order-linked) to reduce unverified/spam reviews.

---

### FR-GROUP-13: Offers & Promotions

**Description:** Enables creation and scheduled delivery of promotional offers.

**Actors:** Admin, Marketing, System (Scheduler)

**Main Flow:**
1. Admin/Marketing creates an offer (discount rules, validity window, target audience/segment).
2. Offer is published to the storefront offers showcase within its validity window.
3. The scheduler service periodically checks for offers due for email broadcast and triggers dispatch to relevant subscribers.

**Business Rules:** Expired offers are automatically excluded from the public showcase without manual intervention.

---

### FR-GROUP-14: Campaign Tracking

**Description:** Enables the Marketing role to run and measure promotional campaigns.

**Actors:** Marketing, Guest/Customer (as campaign recipients), System

**Main Flow:**
1. Marketing creates a campaign with tracking parameters.
2. Campaign links/pixels are distributed (e.g., via email); recipient interactions hit public click/impression tracking endpoints.
3. Conversion tracking endpoint records when a tracked visit results in a qualifying action (e.g., purchase).
4. Marketing views aggregated campaign performance (clicks, impressions, conversions).

**Business Rules:** Tracking endpoints must remain publicly accessible (unauthenticated) since they are hit by anonymous recipients, but must validate/sanitize input to prevent abuse.

---

### FR-GROUP-15: Subscriber & Contact Management

**Description:** Captures and manages newsletter subscribers and contact-form leads.

**Actors:** Guest, Customer, Admin, Marketing

**Main Flow:**
1. Visitor submits their email to subscribe, or submits a contact form message.
2. System stores the subscriber/contact record and de-duplicates repeat submissions.
3. Marketing/Admin views subscriber and contact lists and may send broadcast communications.

**Business Rules:** Duplicate subscription attempts with an already-subscribed email are handled gracefully (no duplicate record, confirmatory message shown).

---

### FR-GROUP-16: Complaint Management

**Description:** Captures and tracks customer grievances to resolution.

**Actors:** Customer, Admin, Merchandise

**Main Flow:**
1. Customer submits a complaint (category, description, related order if applicable).
2. System stores the complaint with an open status.
3. Admin/Merchandise reviews and updates the complaint status through to resolution, optionally responding to the customer.

---

### FR-GROUP-17: Inventory Monitoring & Sales Analytics

**Description:** Provides operational staff visibility into stock and sales performance.

**Actors:** Admin, Merchandise

**Main Flow:**
1. Staff opens the Inventory dashboard; system displays current stock per product/variant and flags items below a low-stock threshold.
2. Staff opens the Sales Trend dashboard; system aggregates confirmed order data over a selected time range into a chart.
3. Staff opens the Revenue Report; system computes total/period revenue from confirmed payments.

**Business Rules:** Analytics figures are derived only from confirmed (paid or confirmed-COD) orders, not from pending/abandoned carts or unconfirmed checkouts.

---

### FR-GROUP-18: Task Management & Automated Escalation

**Description:** Supports internal work assignment and automatic follow-up.

**Actors:** Admin, Merchandise, System (Scheduler)

**Main Flow:**
1. Admin/Merchandise creates a task and assigns it to a staff member by email.
2. Assignee updates task status (e.g., in-progress, completed) as work proceeds.
3. A daily scheduled job scans open tasks past their due cutoff and automatically marks them "not-completed," flagging them for follow-up.

**Business Rules:** Only the assigned user or Admin/Merchandise may update a task's status.

---

### FR-GROUP-19: Website Content Management (CMS)

**Description:** Allows non-code-based updates to key storefront content sections.

**Actors:** Admin

**Main Flow:**
1. Admin opens the relevant settings screen (Hero, About, Contact, Privacy Policy, Collab/Exclusive Drop showcase).
2. Admin edits content/images and saves.
3. Changes are immediately reflected on the corresponding public page without a deployment.

**Business Rules:** Only Admin may modify CMS content (current implementation note: some settings routes should be hardened with explicit middleware — see SRS Appendix C).

---

### FR-GROUP-20: Media Upload

**Description:** Handles image upload/deletion for products and site content.

**Actors:** Admin, Merchandise, System

**Main Flow:**
1. Authorized staff selects an image for upload via a product or CMS form.
2. System forwards the file to Cloudinary and receives a hosted URL/public ID.
3. The URL is stored against the relevant record (product/CMS content).
4. Staff may delete a previously uploaded image, triggering removal from Cloudinary.

**Business Rules:** Upload/delete endpoints require authentication and role authorization; unauthenticated upload attempts are rejected.

---

### FR-GROUP-21: Product Recommendations

**Description:** Surfaces related/suggested products to customers.

**Actors:** Guest, Customer, System

**Main Flow:**
1. Customer views a product detail page or cart.
2. System queries the recommendation endpoint, which returns related products based on catalog attributes (category, tags) and/or behavioural signals.
3. Recommended products are displayed as a carousel/section.

**Business Rules:** Recommendations exclude the currently viewed/purchased product itself and out-of-stock items where possible.

---

## 3. Consolidated Business Rules

1. All monetary calculations (cart, checkout, revenue) must use consistent currency handling (INR-oriented via Razorpay) to avoid rounding discrepancies.
2. Stock decrements occur only on confirmed payment/order — never speculatively.
3. Role checks are enforced server-side on every request; the frontend UI guard is a convenience layer only.
4. All scheduled automation (task escalation, promotional email) runs independently of user-initiated requests and must not block the main request/response cycle.
5. Webhook-driven state changes (payment) must be idempotent and signature-verified.
6. Personally identifiable information (address, phone, email) is only exposed to roles with a legitimate operational need (Admin, Merchandise for orders; Delivery Boy limited to fulfilment-relevant fields).

## 4. Reports and System Outputs

| Report/Output | Consumers | Source Data |
|---|---|---|
| Sales Trend Chart | Admin, Merchandise | Confirmed Orders/Payments over time |
| Revenue Report | Admin, Merchandise | Confirmed Payments |
| Low-Stock Alert List | Admin, Merchandise | Product/Inventory stock levels |
| Campaign Performance Summary | Marketing | Campaign click/impression/conversion records |
| Order Invoice (PDF) | Customer, Admin | Confirmed Order + Payment data |
| Task Status Digest | Admin, Merchandise | Task records (including auto-escalated items) |

## 5. Traceability to SRS

Each FR-GROUP in this document elaborates the corresponding requirement IDs defined in `RAPHAAA_SRS.md` Section 4 (e.g., FR-GROUP-01 elaborates `FR-AUTH-01`–`FR-AUTH-06`; FR-GROUP-09 elaborates `FR-PAY-01`–`FR-PAY-05`). Refer to the SRS for the concise, prioritized requirement statements and to this FRS for their detailed operational behavior.

## 6. Assumptions and Constraints

- All flows assume third-party services (Razorpay, PayPal, Cloudinary, email/SMS provider) are correctly configured and reachable; their outage is handled as an exception case, not a normal flow.
- Single-warehouse, single-currency operation is assumed throughout (see SRS Section 2.5 and Limitations in the Project Synopsis).
- Concurrent-edit conflicts (e.g., two staff editing the same product simultaneously) are resolved on a last-write-wins basis unless explicitly stated otherwise.

---
**Document Type:** Functional Requirements Specification (FRS)
**Project:** Raphaaa E-Commerce Platform
**Companion Documents:** `RAPHAAA_SRS.md`, `RAPHAAA_PROJECT_SYNOPSIS.md`, `RAPHAAA_FUNCTIONAL_DOCUMENTATION.md`
