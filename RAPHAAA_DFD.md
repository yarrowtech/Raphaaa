# DATA FLOW DIAGRAM (DFD)

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Notation:** Gane–Sarson style (External Entity = rectangle, Process = rounded/circle numbered, Data Store = cylinder, Data Flow = labeled arrow), expressed as diagram-as-code using Mermaid.
**Prepared From:** Current codebase snapshot (`/backend` routes, controllers, models)
**Companion Documents:** `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_SRS.md`, `RAPHAAA_FRS.md`

> **Rendering note:** All diagrams below are Mermaid `flowchart` code. They render natively in GitHub, GitLab, and VS Code (Markdown Preview Mermaid Support extension), or at https://mermaid.live.

---

## 1. Level 0 DFD — Context Diagram

The context diagram treats the entire Raphaaa platform as a single process and shows every external entity that exchanges data with it.

```mermaid
flowchart LR
    Guest["Guest / Visitor"]
    Customer["Customer"]
    Admin["Admin"]
    Merch["Merchandise Staff"]
    Delivery["Delivery Boy"]
    Marketing["Marketing Staff"]
    Gateway["Payment Gateway\n(Razorpay / PayPal)"]
    Shiprocket["Shiprocket\n(Shipping Partner)"]
    Cloudinary["Cloudinary\n(Media Storage)"]
    Comms["Email / SMS Provider"]
    Google["Google OAuth"]

    Sys((("0.0\nRaphaaa\nE-Commerce & Operations\nPlatform")))

    Guest -->|"Browse request, Registration data"| Sys
    Sys -->|"Catalog data, Account confirmation"| Guest

    Customer -->|"Login credentials, Cart/Checkout data,\nReviews, Complaints, Return requests"| Sys
    Sys -->|"Order status, Invoices, Wishlist,\nNotifications, Wallet balance"| Customer

    Admin -->|"Product/User/Order management commands,\nCMS content, Offer/Task definitions"| Sys
    Sys -->|"Dashboards, Analytics, Reports"| Admin

    Merch -->|"Inventory & order updates,\nTask status updates"| Sys
    Sys -->|"Inventory alerts, Sales trends,\nAssigned tasks"| Merch

    Delivery -->|"Delivery status updates"| Sys
    Sys -->|"Assigned orders, Shipping details"| Delivery

    Marketing -->|"Campaign & subscriber data,\nOffer broadcasts"| Sys
    Sys -->|"Campaign performance, Subscriber lists"| Marketing

    Sys -->|"Payment initiation request"| Gateway
    Gateway -->|"Payment confirmation, Webhook events"| Sys

    Sys -->|"Shipment creation request, Tracking sync request"| Shiprocket
    Shiprocket -->|"AWB code, Tracking status updates"| Sys

    Sys -->|"Image upload/delete request"| Cloudinary
    Cloudinary -->|"Hosted media URL"| Sys

    Sys -->|"Email/SMS/OTP dispatch request"| Comms
    Comms -->|"Delivery status"| Sys

    Sys -->|"OAuth token request"| Google
    Google -->|"Verified identity token"| Sys
```

---

## 2. Level 1 DFD — Major Process Decomposition

The single context process is decomposed into 10 major processes, each backed by one or more data stores.

```mermaid
flowchart TB
    Guest["Guest"]
    Customer["Customer"]
    Admin["Admin"]
    Merch["Merchandise"]
    Delivery["Delivery Boy"]
    Marketing["Marketing"]
    Gateway["Payment Gateway"]
    Shiprocket["Shiprocket"]
    Cloudinary["Cloudinary"]
    Comms["Email/SMS Provider"]

    P1(("1.0\nManage Authentication\n& Access Control"))
    P2(("2.0\nManage Product\nCatalog"))
    P3(("3.0\nManage Cart\n& Checkout"))
    P4(("4.0\nProcess\nPayment"))
    P5(("5.0\nManage Order\n& Fulfilment"))
    P6(("6.0\nManage Marketing\n(Offers/Campaigns/Subscribers)"))
    P7(("7.0\nManage Inventory\n& Analytics"))
    P8(("8.0\nManage Tasks\n& Complaints"))
    P9(("9.0\nManage Website\nCMS Content"))
    P10(("10.0\nManage Reviews\n& Return Requests"))

    D1[("D1: Users")]
    D2[("D2: Products")]
    D3[("D3: Carts")]
    D4[("D4: Orders")]
    D5[("D5: Payments")]
    D6[("D6: Offers/Campaigns/\nSubscribers/Contacts")]
    D7[("D7: Inventory & Analytics\n(derived from Orders/Products)")]
    D8[("D8: Tasks/Complaints")]
    D9[("D9: CMS Content\n(Hero/About/Policy/Collab)")]
    D10[("D10: Reviews/ReturnRequests")]
    D11[("D11: Wallet Ledger")]

    Guest -->|"Register/Login request"| P1
    Customer -->|"Login/OTP/Profile update"| P1
    P1 <-->|"Credentials, Role, JWT"| D1
    P1 -->|"Session token"| Customer

    Guest -->|"Browse/search request"| P2
    Customer -->|"Browse/search request"| P2
    Admin -->|"Create/Update/Delete product"| P2
    Merch -->|"Create/Update/Delete product"| P2
    P2 <-->|"Product records"| D2
    P2 -->|"Media file"| Cloudinary
    Cloudinary -->|"Hosted URL"| P2
    P2 -->|"Catalog data"| Customer

    Customer -->|"Add/Update/Remove cart item,\nAddress, Checkout confirm"| P3
    P3 <-->|"Cart items"| D3
    P3 -->|"Stock check"| D2
    P3 -->|"Order draft"| D4
    P3 -->|"Address"| D1

    Customer -->|"Payment method selection"| P4
    P4 -->|"Payment init request"| Gateway
    Gateway -->|"Payment result / Webhook"| P4
    P4 <-->|"Payment record"| D5
    P4 -->|"Payment status update"| D4
    P4 -->|"Stock decrement"| D2
    P4 -->|"Wallet debit/credit"| D11

    Admin -->|"Order status update"| P5
    Merch -->|"Order status update"| P5
    Delivery -->|"Delivery status update"| P5
    P5 <-->|"Order records"| D4
    P5 -->|"Shipment request / sync"| Shiprocket
    Shiprocket -->|"AWB, tracking status"| P5
    P5 -->|"Order confirmation, Invoice"| Customer
    P5 -->|"Notification dispatch"| Comms

    Admin -->|"Create offer/campaign"| P6
    Marketing -->|"Create/track campaign,\nBroadcast message"| P6
    Guest -->|"Subscribe/Contact submission"| P6
    P6 <-->|"Offer/Campaign/Subscriber data"| D6
    P6 -->|"Broadcast email"| Comms
    P6 -->|"Offer showcase data"| Customer

    Admin -->|"View dashboard request"| P7
    Merch -->|"View dashboard request"| P7
    P7 -->|"Reads"| D2
    P7 -->|"Reads"| D4
    P7 -->|"Reads"| D5
    P7 -->|"Aggregated report"| Admin
    P7 -->|"Aggregated report"| Merch

    Admin -->|"Create/assign task"| P8
    Merch -->|"Update task status"| P8
    Customer -->|"Submit complaint"| P8
    P8 <-->|"Task/Complaint records"| D8
    P8 -->|"Assigned task"| Merch

    Admin -->|"Edit CMS content"| P9
    P9 <-->|"Content records"| D9
    P9 -->|"Published content"| Guest
    P9 -->|"Published content"| Customer

    Customer -->|"Submit review/return request"| P10
    Admin -->|"Moderate review, Process return"| P10
    P10 <-->|"Review/Return records"| D10
    P10 -->|"Reads eligibility"| D4
    P10 -->|"Refund trigger"| D11
```

---

## 3. Level 2 DFD — Process 3.0 & 4.0: Cart, Checkout, and Payment (Drill-Down)

```mermaid
flowchart TB
    Customer["Customer"]
    Gateway["Payment Gateway\n(Razorpay/PayPal)"]

    P3_1(("3.1\nAdd/Update\nCart Item"))
    P3_2(("3.2\nValidate\nStock"))
    P3_3(("3.3\nCapture Shipping\nAddress"))
    P3_4(("3.4\nCreate Order\n(Pending)"))
    P4_1(("4.1\nInitiate Payment\nwith Gateway"))
    P4_2(("4.2\nVerify Payment\nSignature"))
    P4_3(("4.3\nProcess Payment\nWebhook (Idempotent)"))
    P4_4(("4.4\nConfirm Order &\nDecrement Stock"))

    D2[("D2: Products")]
    D3[("D3: Carts")]
    D4[("D4: Orders")]
    D5[("D5: Payments")]
    D1[("D1: Users\n(Addresses)")]

    Customer -->|"Product + qty + variant"| P3_1
    P3_1 <-->|"Cart line items"| D3
    P3_1 -->|"Requested qty"| P3_2
    P3_2 -->|"Stock lookup"| D2
    D2 -->|"Available stock"| P3_2
    P3_2 -->|"Stock OK / Insufficient stock error"| Customer

    Customer -->|"Select/enter address"| P3_3
    P3_3 <-->|"Saved addresses"| D1
    P3_3 -->|"Confirmed shipping address"| P3_4

    P3_4 -->|"Cart snapshot"| D3
    P3_4 -->|"New order (status=Processing, isPaid=false)"| D4
    P3_4 -->|"Order ID + amount"| P4_1

    P4_1 -->|"Create payment order request"| Gateway
    Gateway -->|"gateway_order_id, payment params"| P4_1
    P4_1 -->|"Payment session data"| Customer

    Customer -->|"Payment completed on gateway UI"| P4_2
    P4_2 -->|"Verify HMAC signature"| P4_2
    P4_2 -->|"Payment record"| D5
    P4_2 -->|"isPaid=true (client-confirmed)"| D4

    Gateway -->|"Webhook: payment.captured/failed"| P4_3
    P4_3 -->|"Verify webhook signature\n(idempotency check)"| P4_3
    P4_3 <-->|"Payment record"| D5
    P4_3 -->|"Confirmed status"| P4_4

    P4_4 -->|"Update order status = confirmed"| D4
    P4_4 -->|"Decrement countInStock"| D2
    P4_4 -->|"Order confirmation"| Customer
```

---

## 4. Level 2 DFD — Process 5.0: Order & Fulfilment Management (Drill-Down)

```mermaid
flowchart TB
    Admin["Admin"]
    Merch["Merchandise"]
    Delivery["Delivery Boy"]
    Customer["Customer"]
    Shiprocket["Shiprocket API"]
    Comms["Email/SMS Provider"]
    Scheduler["node-cron Scheduler\n(15-min interval)"]

    P5_1(("5.1\nUpdate Order\nStatus"))
    P5_2(("5.2\nCreate Shipment\nwith Shiprocket"))
    P5_3(("5.3\nSync Tracking\nStatus (Scheduled)"))
    P5_4(("5.4\nNotify Customer\non Status Change"))
    P5_5(("5.5\nProcess Cancellation"))

    D4[("D4: Orders")]

    Admin -->|"Manual status update"| P5_1
    Merch -->|"Manual status update"| P5_1
    P5_1 <-->|"Order record"| D4
    P5_1 -->|"Trigger shipment"| P5_2

    P5_2 -->|"Create shipment request"| Shiprocket
    Shiprocket -->|"shipmentId, AWB code"| P5_2
    P5_2 -->|"Store shiprocket.awbCode etc."| D4

    Scheduler -->|"Trigger every 15 min"| P5_3
    P5_3 -->|"Fetch open/shipped orders"| D4
    P5_3 -->|"GET tracking status"| Shiprocket
    Shiprocket -->|"Tracking payload"| P5_3
    P5_3 -->|"Update trackingStatus, lastSyncAt"| D4
    P5_3 -->|"Status change event"| P5_4

    P5_1 -->|"Status change event"| P5_4
    P5_4 -->|"Send notification"| Comms
    Comms -->|"Order update"| Customer

    Customer -->|"Cancellation request\n(pre-shipment only)"| P5_5
    P5_5 -->|"Eligibility check"| D4
    P5_5 -->|"Update cancellation{} + status=Cancelled"| D4
    Delivery -->|"Delivery confirmation"| P5_1
```

---

## 5. Level 2 DFD — Process 8.0: Task Management with Auto-Escalation (Drill-Down)

```mermaid
flowchart TB
    Admin["Admin"]
    Merch["Merchandise"]
    Scheduler["node-cron\n(Daily 19:00 IST)"]

    P8_1(("8.1\nCreate & Assign\nTask"))
    P8_2(("8.2\nUpdate Task\nStatus"))
    P8_3(("8.3\nAuto-Escalate\nOverdue Tasks"))

    D8[("D8: Tasks")]

    Admin -->|"Task title, description, assignee email"| P8_1
    P8_1 -->|"New task (status=working)"| D8
    P8_1 -->|"Assigned task notice"| Merch

    Merch -->|"Status update (completed/working)"| P8_2
    P8_2 <-->|"Task record"| D8

    Scheduler -->|"Trigger at 19:00 IST daily"| P8_3
    P8_3 -->|"Query: status=working AND createdAt=today"| D8
    D8 -->|"Matching tasks"| P8_3
    P8_3 -->|"updateMany(status='not completed')"| D8
```

---

## 6. Data Store Dictionary

| ID | Data Store | Backing Model(s) | Key Contents |
|---|---|---|---|
| D1 | Users | `User.js` | Credentials (hashed), role, addresses, referral data, mobile/OTP verification state |
| D2 | Products | `Product.js` | Catalog details, price, stock, variants, images, SEO metadata |
| D3 | Carts | `Cart.js` | Per-user cart line items and computed totals |
| D4 | Orders | `Order.js`, `Checkout.js`, `Checkout1.js` | Order items, shipping address, payment method, status, Shiprocket tracking, cancellation/refund timeline |
| D5 | Payments | `payment.js` | Gateway transaction ID, status, amount, linked order |
| D6 | Offers/Campaigns/Subscribers/Contacts | `offer.js`, `campaignModel.js`, `Subscriber.js`, `Contact.js` | Promotion rules, campaign performance counters, subscriber/contact lists |
| D7 | Inventory & Analytics (derived) | Aggregated from `Product.js` + `Order.js` | Stock levels, low-stock flags, sales trend/revenue aggregates (no dedicated store — computed on read) |
| D8 | Tasks/Complaints | `taskModel.js`, `complaintModel.js` | Assignment, status, due/cutoff tracking |
| D9 | CMS Content | `Hero.js`, `HeroSlide.js`, `About.js`, `policyModel.js`, `Collab.js`, `ContactSetting.js` | Editable storefront content sections |
| D10 | Reviews/Return Requests | `Review.js`, `ReturnRequest.js`, `ProductQA.js` | Ratings, review text/images, return reason/status, product Q&A |
| D11 | Wallet Ledger | `WalletLedger.js` | Credit/debit entries, expiry dates, running balance |

## 7. Data Flow Dictionary (Selected Critical Flows)

| Flow | From → To | Description |
|---|---|---|
| Registration data | Guest → P1.0 | Name, email/mobile, password |
| Session token (JWT) | P1.0 → Customer | Signed token carrying user ID and role, used on all subsequent authenticated calls |
| Stock check | P3.2 → D2 | Read-only lookup of `countInStock` for requested variant before allowing checkout |
| Payment init request | P4.1 → Gateway | Amount, currency, order reference sent to Razorpay/PayPal to create a payable order |
| Webhook event | Gateway → P4.3 | Asynchronous, signed event (`payment.captured`, `payment.failed`) processed idempotently |
| Stock decrement | P4.4 → D2 | Applied exactly once, only after confirmed payment (client verification + webhook reconciliation) |
| Tracking sync request | P5.3 → Shiprocket | Polling request every 15 minutes for AWB status of open/shipped orders |
| Auto-escalation update | P8.3 → D8 | Bulk status update applied by the daily 19:00 IST cron job, without any external actor input |

---

## 8. Notes on Interpretation

- This DFD models **logical data movement**, not the physical REST endpoints (those are documented per-route in `RAPHAAA_FRS.md`).
- Processes 4.3 (Webhook) and 5.3/8.3 (Scheduler-driven) are **system-triggered**, not user-triggered — they appear because Raphaaa's architecture relies on asynchronous reconciliation (`node-cron`, `workers/jobWorker.js`) rather than purely synchronous request/response for payment confirmation and status escalation. This is a deliberate deviation from a "pure" user-driven DFD and reflects the actual codebase behavior in `server.js`.
- D7 (Inventory & Analytics) has no dedicated Mongoose model — it is intentionally shown as a derived/virtual data store computed at query time from Products and Orders, to avoid implying a persisted analytics table that does not exist in the schema.

---
**Document Type:** Data Flow Diagram (Gane–Sarson notation, Mermaid diagram-as-code)
**Project:** Raphaaa E-Commerce Platform
**Companion Documents:** `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_SRS.md`, `RAPHAAA_FRS.md`, `RAPHAAA_PROJECT_SYNOPSIS.md`
