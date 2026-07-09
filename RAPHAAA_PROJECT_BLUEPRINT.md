# PROJECT BLUEPRINT

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Document Type:** Master Project Blueprint (Executive + Technical Reference)
**Prepared From:** Current codebase snapshot (`/backend`, `/frontend`, `/ml`)
**Companion Documents:** `RAPHAAA_PROJECT_SYNOPSIS.md`, `RAPHAAA_SRS.md`, `RAPHAAA_FRS.md`, `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_DFD.md`, `RAPHAAA_DATABASE_STRUCTURE.md`

> This Blueprint is the single top-level reference for the project — it ties the vision, architecture, modules, data, security, deployment, and roadmap together and points to the detailed companion document for each area. Read this first; drill into the companion docs for depth.

---

## 1. Executive Summary

**Raphaaa** is a production-oriented, full-stack e-commerce platform built on the MERN stack (MongoDB, Express.js, React.js, Node.js). It combines a customer-facing storefront with a role-based internal operations suite — product, order, inventory, marketing, task, and complaint management — under one codebase and one data model, eliminating the tool fragmentation typical of small-to-mid-scale e-commerce businesses.

| | |
|---|---|
| **Project Name** | Raphaaa Ecommerce Website |
| **Project Type** | B2C E-Commerce + Internal Business Operations Platform |
| **Architecture Style** | Monolithic layered 3-tier web app + async job worker |
| **Primary Stack** | React (Vite) · Node.js/Express · MongoDB (Mongoose) |
| **Deployment Targets** | Vercel (frontend), Vercel/Render (backend), MongoDB Atlas |
| **Roles Supported** | Guest, Customer, Admin, Merchandise, Delivery Boy, Marketing |
| **Collections in Database** | 28 (see `RAPHAAA_DATABASE_STRUCTURE.md`) |
| **Backend Route Modules** | ~40 |

---

## 2. Vision & Objectives

**Vision:** Provide a single, extensible platform where the storefront and the internal teams that run it (product, fulfilment, marketing) operate against the same live data, rather than through disconnected spreadsheets and third-party tools.

**Objectives:**
1. Deliver a complete customer shopping journey — discovery to delivery to post-purchase support.
2. Give every internal role (Admin, Merchandise, Delivery, Marketing) a scoped, purpose-built interface.
3. Automate reconciliation-heavy processes (payment confirmation, shipment tracking, task escalation) via scheduled jobs and a background worker instead of manual follow-up.
4. Keep the system deployable as two independently hosted units (frontend static build + backend API) with a single shared database.

---

## 3. Scope

### 3.1 In Scope
- Storefront: catalog, cart, wishlist, checkout, payments (Razorpay/PayPal/COD), order tracking, reviews, Q&A, returns.
- Operations: product/order/user/inventory management, sales & revenue analytics, task management with auto-escalation.
- Marketing: offers/coupons with a rule engine, campaign tracking, subscriber/contact management.
- Platform services: authentication (JWT/OTP/Google), wallet/referral system, CMS content, media upload (Cloudinary), shipment tracking (Shiprocket), a lightweight background job queue.

### 3.2 Out of Scope (current version)
- Native mobile applications.
- Multi-currency and multi-warehouse operation.
- Third-party marketplace syndication (Amazon/Flipkart listing sync).
- Trained ML-based recommendations (current recommendation logic is catalog/rule-based).

---

## 4. Stakeholders & Roles

| Role | Responsibility in the System |
|---|---|
| **Guest** | Anonymous browsing, registration, offer viewing |
| **Customer** | Shopping, checkout, order tracking, reviews, complaints, returns |
| **Admin** | Full system ownership — all modules |
| **Merchandise** | Product, order, and inventory operations; sales dashboards |
| **Delivery Boy** | Fulfilment-stage order visibility and delivery status updates |
| **Marketing** | Campaigns, offers, subscriber/contact broadcast |
| **System (Scheduler/Worker)** | Automated actor: task escalation, offer email dispatch, wallet expiry, Shiprocket sync, alert scanning |

---

## 5. Architecture Blueprint (Summary)

Raphaaa is a **3-tier layered monolith** with one asynchronous tier bolted on for reconciliation work. Full diagrams (component, deployment, sequence) live in `RAPHAAA_SYSTEM_DESIGN.md`; summarized here:

```
Client (React SPA: Storefront + Admin Portal)
        │  HTTPS/JSON
Application (Express: Middleware → Routes → Controllers → Services → Models)
        │
Data (MongoDB via Mongoose)

Async tier: node-cron schedulers + in-process job worker (workers/jobWorker.js)
External services: Razorpay, PayPal, Cloudinary, Shiprocket, Email/SMS, Google OAuth
```

**Backend layering:** Route → Auth/Role Middleware (`protect`, `admin`, `adminOrMerchantise`, `roleCheck`) → Controller → Service (pricingService, walletService, alertService, jobQueue) → Mongoose Model.

**Key architectural decisions:**
- Stateless JWT authentication (no server-side session store) → horizontal scalability.
- Payment confirmation is dual-verified: client-side signature check **and** an independent, idempotent webhook handler — never trusts client-reported success alone.
- Slow/retryable operations (emails, webhook side-effects, Shiprocket sync, wallet expiry, alert scans) are pulled out of the request/response cycle into `node-cron` jobs and a polling job worker, rather than blocking API responses.
- Role enforcement is server-side and authoritative; frontend route guards are a UX layer only.

*→ Full architecture, component, deployment, and sequence diagrams: `RAPHAAA_SYSTEM_DESIGN.md`. Data flow diagrams (context/level-1/level-2): `RAPHAAA_DFD.md`.*

---

## 6. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18, Vite, Redux Toolkit, React Router, Tailwind CSS | SPA with role-gated admin routes |
| Backend | Node.js, Express.js | ~40 route modules |
| Database | MongoDB (Mongoose ODM) | 28 collections |
| Auth | JWT, Bcrypt, Google OAuth, SMS/Email OTP | Stateless session model |
| Payments | Razorpay, PayPal, COD | Webhook-reconciled |
| Media | Cloudinary | Product/CMS image hosting + CDN |
| Shipping | Shiprocket | Shipment creation + tracking sync (15-min interval) |
| Scheduling | node-cron | Task escalation, wallet expiry, alert scan, offer email |
| Background jobs | Custom job queue + worker (`services/jobQueue.js`, `workers/jobWorker.js`) | Retry-capable async processing |
| Analytics/UI | Chart.js / Recharts | Sales trend & revenue dashboards |
| Hosting | Vercel (frontend), Vercel/Render (backend), MongoDB Atlas | Two independently deployable units |

---

## 7. Functional Module Blueprint

| # | Module | Key Actors | Detail Reference |
|---|---|---|---|
| 1 | Authentication & Account | Guest, Customer, System | FRS §FR-GROUP-01/02 |
| 2 | Role-Based Access Control | All roles | FRS §FR-GROUP-03 |
| 3 | Product Catalog (browse + manage) | Guest, Customer, Admin, Merchandise | FRS §FR-GROUP-04/05 |
| 4 | Cart & Wishlist | Guest, Customer | FRS §FR-GROUP-06/07 |
| 5 | Checkout & Address | Customer | FRS §FR-GROUP-08 |
| 6 | Payment Processing | Customer, Payment Gateway | FRS §FR-GROUP-09 |
| 7 | Order Lifecycle & Fulfilment | Customer, Admin, Merchandise, Delivery | FRS §FR-GROUP-10 |
| 8 | Return Requests | Customer, Admin, Merchandise | FRS §FR-GROUP-11 |
| 9 | Reviews & Product Q&A | Customer, Admin | FRS §FR-GROUP-12 |
| 10 | Offers & Promotions (rule engine) | Admin, Marketing | FRS §FR-GROUP-13 |
| 11 | Campaign Tracking | Marketing | FRS §FR-GROUP-14 |
| 12 | Subscribers & Contacts | Guest, Marketing | FRS §FR-GROUP-15 |
| 13 | Complaint Management | Customer, Admin, Merchandise | FRS §FR-GROUP-16 |
| 14 | Inventory & Sales Analytics | Admin, Merchandise | FRS §FR-GROUP-17 |
| 15 | Task Management + Auto-Escalation | Admin, Merchandise, Scheduler | FRS §FR-GROUP-18 |
| 16 | Website CMS | Admin | FRS §FR-GROUP-19 |
| 17 | Media Upload | Admin, Merchandise | FRS §FR-GROUP-20 |
| 18 | Product Recommendations | Guest, Customer | FRS §FR-GROUP-21 |
| 19 | Wallet & Referral | Customer, System | Models: `WalletLedger`, `User.referralCode` |
| 20 | Shipment Tracking (Shiprocket) | System, Delivery | `RAPHAAA_SYSTEM_DESIGN.md` §8.4 |

*→ Full behavioral detail (flows, business rules, exceptions) for each module: `RAPHAAA_FRS.md`.*

---

## 8. Data Blueprint (Summary)

- **28 MongoDB collections**, grouped into: Identity & Access (`User`), Catalog (`Product`, `MetaOption`, `SizeChart`, `ProductQA`, `ProductAlert`), Shopping (`Cart`, `Wishlist`, `Checkout`/`Checkout1`), Orders & Payments (`Order`, `Payment`, `ReturnRequest`), Wallet (`WalletLedger`), Reviews (`Review`), Marketing (`Offer`, `Campaign`, `Subscriber`, `Contact`), Operations (`Task`, `Complaint`, `Job`), and CMS (`Hero`, `HeroSlide`, `About`, `Policy`, `ContactSetting`, `Collab`), plus the singleton `ShippingConfig`.
- **Design principles:** embed data always accessed together (order line items, addresses, product variants); reference data with independent lifecycles (users, products); **snapshot** financial data at transaction time so historical orders survive later catalog edits; use idempotency keys on `Order` and `Payment` to make retried checkout/webhook calls safe.
- **Known technical debt** (see `RAPHAAA_DATABASE_STRUCTURE.md` §9): `Product` carries both a legacy `variants[]` array and the current `colorVariants[]` structure side by side; `Checkout` and `Checkout1` are near-duplicate schemas that should be consolidated.

*→ Full schema reference, ER diagrams, UML class diagram, indexing strategy: `RAPHAAA_DATABASE_STRUCTURE.md`.*

---

## 9. Security Blueprint

| Concern | Approach |
|---|---|
| Authentication | JWT (stateless), Bcrypt password hashing, Google OAuth, OTP verification |
| Authorization | Server-side role middleware on every protected route (`protect`, `admin`, `adminOrMerchantise`, `roleCheck`) |
| Payment integrity | Signature verification (client callback) + independent signed webhook reconciliation; idempotency keys prevent double-processing |
| Data in transit | HTTPS enforced in production; CORS allow-list configured in `server.js` (explicit origins + `*.vercel.app`/`raphaaa.com` pattern match) |
| Secrets management | Environment variables (`.env`), never committed; separate `config/` modules isolate third-party SDK credentials |
| Known gap | Some CMS/settings routes currently lack explicit middleware protection — flagged in SRS Appendix C as a hardening item before scaled production use |

---

## 10. Deployment Blueprint

| Component | Platform | Notes |
|---|---|---|
| Frontend (React build) | Vercel | Static build + CDN edge caching; `frontend/vercel.json` |
| Backend (Express API) | Vercel / Render | `backend/vercel.json`; long-running cron + worker processes favor a persistent-process host (Render) over serverless functions |
| Database | MongoDB Atlas (or self-hosted) | Single cluster, 28 collections |
| Media | Cloudinary | Externalized from app server for scalability |
| Health check | `GET /healthz` | Uptime monitoring / self-ping support |

**Environment separation:** dev/staging/production behavior is controlled entirely through environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `RAZORPAY_KEY_ID/SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `JOB_WORKER_INTERVAL_MS`, `JOB_WORKER_CONCURRENCY`) — no code changes needed between environments.

---

## 11. Automation & Background Processing Blueprint

| Job | Trigger | Purpose |
|---|---|---|
| Task auto-escalation | `node-cron` daily @ 19:00 IST | Marks unresolved tasks `not completed` |
| Shiprocket order sync | `setInterval` every 15 min | Updates tracking status for open/shipped orders |
| Shiprocket return sync | `setInterval` every 10 min | Updates reverse-pickup status for open return requests |
| Wallet credit expiry | `node-cron` hourly (`10 * * * *`) | Expires due wallet credits |
| Alert scan (stock/price) | `node-cron` every 5 min | Triggers back-in-stock / price-drop alerts |
| Background job worker | Continuous poll (`JOB_WORKER_INTERVAL_MS`) | Processes queued jobs (`send_email`, `webhook`, `stock_sync`) with retry (`maxAttempts`) |
| Scheduled promotional email | On server startup + scheduled | Sends due offer broadcasts |

*→ Sequence diagrams for these flows: `RAPHAAA_SYSTEM_DESIGN.md` §8.3–8.4.*

---

## 12. Quality Assurance Blueprint

- **Functional testing** per role: guest browsing, customer checkout/payment, admin product/order management, marketing campaign lifecycle, delivery order visibility.
- **Integration testing** of third-party boundaries: Razorpay payment + webhook, Cloudinary upload/delete, Shiprocket shipment/tracking, email/OTP delivery.
- **Regression focus areas:** stock reconciliation after payment webhook, order status consistency across customer/staff views, idempotent webhook handling under retry.

---

## 13. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Unprotected CMS/settings routes | Unauthorized content changes | Add explicit auth/role middleware (tracked in SRS Appendix C) |
| Duplicate `Checkout`/`Checkout1` schemas | Data drift, maintenance confusion | Consolidate into a single checkout model |
| Webhook delivery delay/failure from Razorpay | Order stuck in unconfirmed state | Job worker retry (`maxAttempts`) + reconciliation job |
| Shiprocket API outage | Stale tracking status shown to customer | Sync jobs fail gracefully and retry on next interval without crashing the server |
| Single-region MongoDB dependency | Downtime affects entire platform | Standard MongoDB Atlas backup/replica-set practices (operational, outside app scope) |

---

## 14. Roadmap / Future Scope

- Predictive sales analytics and enhanced KPI dashboards.
- Fine-grained audit logging and permission controls.
- ML-based personalized recommendations (current system is catalog/rule-based).
- Multi-warehouse and multi-currency support.
- Native mobile application on top of the existing REST API.
- Consolidation of `Checkout`/`Checkout1` and the legacy/structured product variant systems.

---

## 15. Document Map

| Document | Focus |
|---|---|
| `RAPHAAA_PROJECT_SYNOPSIS.md` | Academic-style project rationale, feasibility, objectives |
| `RAPHAAA_SRS.md` | Prioritized functional/non-functional requirements (IEEE 830) |
| `RAPHAAA_FRS.md` | Detailed functional behavior per module (flows, business rules) |
| `RAPHAAA_SYSTEM_DESIGN.md` | Architecture, component/deployment diagrams, UML (class/use-case/sequence) |
| `RAPHAAA_DFD.md` | Data flow diagrams (context, level 1, level 2 drill-downs) |
| `RAPHAAA_DATABASE_STRUCTURE.md` | Full schema reference, ER diagrams, UML class diagram, indexing |
| **`RAPHAAA_PROJECT_BLUEPRINT.md`** *(this document)* | Top-level executive + technical summary tying all of the above together |

---
**Document Type:** Project Blueprint (Master Reference)
**Project:** Raphaaa E-Commerce Platform
