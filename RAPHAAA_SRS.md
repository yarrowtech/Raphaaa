# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Prepared From:** Current codebase snapshot (`/backend`, `/frontend`, `/ml`)
**Format Basis:** IEEE 830 SRS Standard

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional software requirements for **Raphaaa**, a full-stack, role-based e-commerce platform. It is intended to serve as the authoritative reference for developers, testers, and stakeholders on what the system does, who uses it, and under what constraints it must operate.

### 1.2 Document Conventions
- Functional requirements are tagged **FR-<Module>-<No.>** (e.g., `FR-AUTH-01`).
- Non-functional requirements are tagged **NFR-<Category>-<No.>** (e.g., `NFR-SEC-01`).
- Priority: **High (H)** — core to system operation; **Medium (M)** — important but not launch-blocking; **Low (L)** — enhancement-level.
- "System" refers to the Raphaaa application (frontend + backend + database) as a whole unless otherwise scoped.

### 1.3 Intended Audience
- Development team (frontend/backend engineers) — implementation reference.
- QA/testers — basis for test case derivation.
- Project stakeholders/reviewers — scope and acceptance reference.
- Future maintainers — onboarding and change-impact reference.

### 1.4 Project Scope
Raphaaa provides:
- A customer-facing storefront for product discovery, purchase, and post-purchase support.
- A role-based operational back office for Admin, Merchandise, Delivery Boy, and Marketing staff.
- Integrated payments, media storage, email/SMS communication, and scheduled automation.

Out of scope: native mobile apps, multi-currency/multi-warehouse operation, third-party marketplace syndication (see Section 2.5).

### 1.5 References
- `RAPHAAA_PROJECT_SYNOPSIS.md` — project synopsis and system design overview.
- `RAPHAAA_FUNCTIONAL_DOCUMENTATION.md` — role-wise and module-wise functional reference.
- `README.md` — setup and feature summary.
- IEEE Std 830-1998 — Recommended Practice for Software Requirements Specifications.

---

## 2. Overall Description

### 2.1 Product Perspective
Raphaaa is a standalone, self-hosted web application built on the MERN stack (MongoDB, Express.js, React.js, Node.js). It is not a plugin or extension of an existing platform; it owns its full data model and business logic, while delegating specialized concerns (payments, media hosting, email/SMS delivery) to third-party services via API integration.

**High-Level Architecture:**
```
[React SPA: Storefront + Admin Portal]
            |  REST/JSON over HTTPS
[Express.js API Layer: Route Modules + Auth/Role Middleware]
            |
[MongoDB (Mongoose ODM)]

External integrations: Razorpay, PayPal, Cloudinary, Email service, SMS/OTP service
```

### 2.2 Product Features (Summary)
- Product catalog, cart, wishlist, checkout, and order tracking.
- Secure authentication (JWT, OTP, Google login).
- Multi-role administrative operations (product, order, user, inventory).
- Payments via Razorpay/PayPal with webhook reconciliation.
- Marketing tools: campaigns, subscribers, offers/coupons.
- Inventory and sales/revenue analytics.
- Task management with automated status escalation.
- Complaint and return-request handling.
- Website content management (Hero, About, Contact, Privacy Policy).
- Product recommendations.

### 2.3 User Classes and Characteristics

| User Class | Description | Technical Expertise |
|---|---|---|
| Guest | Unauthenticated visitor browsing the storefront | None assumed |
| Customer | Registered shopper | None assumed |
| Admin | Full system owner/operator | Low–Moderate |
| Merchandise | Product, order, and inventory staff | Low–Moderate |
| Delivery Boy | Fulfilment/delivery staff | Low |
| Marketing | Campaign and communication staff | Low–Moderate |

### 2.4 Operating Environment
- **Client:** Modern evergreen web browsers (Chrome, Edge, Firefox, Safari) on desktop and mobile, minimum viewport width 320px.
- **Server:** Node.js runtime (v18+ recommended), deployed on cloud/serverless hosting (Vercel/Render-class).
- **Database:** MongoDB (self-hosted or Atlas-hosted cluster).
- **Network:** HTTPS required for all client-server and webhook traffic.

### 2.5 Design and Implementation Constraints
- Must use JWT-based stateless authentication (no server-side session store).
- Payment processing must go through PCI-compliant third parties (Razorpay/PayPal) — the system must never store raw card data.
- Media assets must be stored via Cloudinary, not on the application server's local disk, for horizontal scalability.
- Role checks must be enforced server-side (middleware), not only in the frontend UI.
- Single-currency (INR-oriented via Razorpay) and single-warehouse data model in the current version.

### 2.6 Assumptions and Dependencies
- Third-party services (Razorpay, PayPal, Cloudinary, email/SMS provider) are available and correctly configured via environment variables.
- MongoDB instance is reachable and provisioned with adequate storage for product images metadata, orders, and logs.
- Users have a valid email or mobile number for OTP-based verification flows.
- Node-Cron scheduled jobs assume the server process runs continuously (or via a platform equivalent to sustain cron ticks).

---

## 3. External Interface Requirements

### 3.1 User Interfaces
- **Storefront UI:** Home, category/collection pages, product detail, cart, checkout, order history, profile, wishlist, offers, exclusive drops, static content pages (About/Contact/Privacy).
- **Admin Portal UI:** Role-aware sidebar navigation; dashboards for products, orders, users, inventory, sales/revenue, tasks, offers, campaigns, subscribers/contacts, complaints, and website settings.
- All interfaces must be responsive (mobile, tablet, desktop breakpoints) per Tailwind CSS design system.

### 3.2 Hardware Interfaces
None directly — the system is a standard web application with no bespoke hardware interfacing. Client devices require only a browser and network connectivity.

### 3.3 Software Interfaces
| Interface | Purpose | Protocol |
|---|---|---|
| Razorpay API | Payment initiation, verification, webhook events | HTTPS REST + Webhook |
| PayPal | Alternate payment method (frontend button flow) | HTTPS REST |
| Cloudinary API | Image upload/delete for products and site content | HTTPS REST |
| Email service provider | Transactional and marketing email delivery | SMTP/API |
| SMS/OTP provider | Mobile number verification | HTTPS REST |
| MongoDB | Primary data persistence | MongoDB Wire Protocol (via Mongoose) |

### 3.4 Communications Interfaces
- All client-server communication over HTTPS using JSON payloads.
- Authenticated requests carry a JWT in the `Authorization` header.
- Payment and webhook endpoints validate provider signatures before processing.

---

## 4. System Features (Functional Requirements)

### 4.1 Authentication & Account Management
| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | The system shall allow a guest to register an account using email/mobile and password. | H |
| FR-AUTH-02 | The system shall allow login via email/password, and via Google OAuth. | H |
| FR-AUTH-03 | The system shall issue a JWT on successful login and validate it on protected requests. | H |
| FR-AUTH-04 | The system shall support OTP-based mobile number verification (send-otp/verify-otp). | H |
| FR-AUTH-05 | The system shall support forgot-password and reset-password flows for users and admin-side reset. | H |
| FR-AUTH-06 | The system shall allow authenticated users to update their profile information. | M |

### 4.2 Role & Access Control
| ID | Requirement | Priority |
|---|---|---|
| FR-ROLE-01 | The system shall assign each user one role: Guest, Customer, Admin, Merchandise, Delivery Boy, or Marketing. | H |
| FR-ROLE-02 | The system shall enforce role checks at the API layer via middleware (`protect`, `admin`, `adminOrMerchantise`, generic role guard) before granting access to restricted routes. | H |
| FR-ROLE-03 | The frontend shall hide/guard admin routes based on the authenticated user's role, in addition to backend enforcement. | M |

### 4.3 Product Catalog
| ID | Requirement | Priority |
|---|---|---|
| FR-CAT-01 | The system shall display a paginated, filterable, searchable product listing to all users. | H |
| FR-CAT-02 | The system shall display product detail pages including images, price, variants (size/colour), and size chart. | H |
| FR-CAT-03 | The system shall allow Admin/Merchandise roles to create, update, and delete products. | H |
| FR-CAT-04 | The system shall support configurable catalog meta-options (e.g., attributes/categories) managed by Admin/Merchandise. | M |
| FR-CAT-05 | The system shall allow customers to submit product questions (Q&A) and view existing answers. | L |

### 4.4 Cart & Wishlist
| ID | Requirement | Priority |
|---|---|---|
| FR-CART-01 | The system shall allow a user to add, update quantity, and remove items from a cart. | H |
| FR-CART-02 | The system shall persist cart contents for authenticated users across sessions. | M |
| FR-CART-03 | The system shall allow authenticated customers to add/remove products from a wishlist. | M |

### 4.5 Checkout & Order Management
| ID | Requirement | Priority |
|---|---|---|
| FR-ORD-01 | The system shall capture a shipping address during checkout, reusing saved addresses where available. | H |
| FR-ORD-02 | The system shall create an order record upon successful checkout submission. | H |
| FR-ORD-03 | The system shall allow customers to view their order history and individual order status/details. | H |
| FR-ORD-04 | The system shall allow Admin/Merchandise/Delivery roles to update order status through defined lifecycle stages. | H |
| FR-ORD-05 | The system shall allow customers to submit a return request for an eligible delivered order. | M |

### 4.6 Payment Processing
| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-01 | The system shall initiate a Razorpay payment for orders paid online. | H |
| FR-PAY-02 | The system shall support PayPal as an alternate payment method at checkout. | M |
| FR-PAY-03 | The system shall verify payment authenticity via signature validation on the payment confirmation endpoint. | H |
| FR-PAY-04 | The system shall process payment webhook events to update order/payment status and reconcile stock. | H |
| FR-PAY-05 | The system shall support Cash on Delivery (COD) as a payment option where enabled. | M |

### 4.7 Reviews & Feedback
| ID | Requirement | Priority |
|---|---|---|
| FR-REV-01 | The system shall allow customers to submit ratings and reviews (with optional images) for purchased products. | M |
| FR-REV-02 | The system shall allow Admin/Merchandise to moderate and view submitted reviews. | L |

### 4.8 Marketing: Offers, Campaigns, Subscribers
| ID | Requirement | Priority |
|---|---|---|
| FR-MKT-01 | The system shall allow Admin/Marketing to create, edit, and schedule promotional offers. | M |
| FR-MKT-02 | The system shall automatically trigger scheduled promotional email broadcasts via a background scheduler. | M |
| FR-MKT-03 | The system shall allow Marketing role to create and track campaigns, including click and conversion tracking endpoints. | M |
| FR-MKT-04 | The system shall capture newsletter subscribers and contact-form leads for marketing outreach. | M |
| FR-MKT-05 | The system shall allow Marketing to send broadcasts to subscriber/contact lists. | L |

### 4.9 Inventory & Analytics
| ID | Requirement | Priority |
|---|---|---|
| FR-INV-01 | The system shall track stock levels per product/variant and flag low-stock items. | H |
| FR-INV-02 | The system shall provide Admin/Merchandise with sales trend visualizations over configurable time ranges. | M |
| FR-INV-03 | The system shall provide a revenue report summarizing sales performance. | M |

### 4.10 Task & Complaint Management
| ID | Requirement | Priority |
|---|---|---|
| FR-TASK-01 | The system shall allow Admin/Merchandise to create tasks and assign them to a staff member by email. | M |
| FR-TASK-02 | The system shall allow assignees to update task status. | M |
| FR-TASK-03 | The system shall automatically mark unresolved tasks as "not-completed" after a configured daily cutoff via scheduled job. | M |
| FR-COMP-01 | The system shall allow customers to submit complaints. | M |
| FR-COMP-02 | The system shall allow Admin/Merchandise to view and process submitted complaints. | M |

### 4.11 Website Content Management (CMS)
| ID | Requirement | Priority |
|---|---|---|
| FR-CMS-01 | The system shall allow Admin to edit Hero banner content shown on the storefront home page. | L |
| FR-CMS-02 | The system shall allow Admin to edit About, Contact, and Privacy Policy content without a code deployment. | L |
| FR-CMS-03 | The system shall allow Admin to manage collaboration/exclusive-drop showcase content. | L |

### 4.12 Media & File Upload
| ID | Requirement | Priority |
|---|---|---|
| FR-MED-01 | The system shall allow authenticated, authorized users to upload product/site images to Cloudinary. | H |
| FR-MED-02 | The system shall allow deletion of previously uploaded media. | M |
| FR-MED-03 | Upload endpoints shall be protected by authentication and role middleware. | H |

### 4.13 Recommendations
| ID | Requirement | Priority |
|---|---|---|
| FR-REC-01 | The system shall present related/recommended products on product detail and cart pages. | L |

---

## 5. Non-Functional Requirements

### 5.1 Performance
| ID | Requirement |
|---|---|
| NFR-PERF-01 | Product listing and search pages should return results within 2 seconds under normal load. |
| NFR-PERF-02 | The system shall support pagination/lazy-loading for large product catalogs to limit payload size. |
| NFR-PERF-03 | Image assets shall be served via Cloudinary's CDN to minimize server load and latency. |

### 5.2 Security
| ID | Requirement |
|---|---|
| NFR-SEC-01 | All passwords shall be hashed (Bcrypt) before storage; plaintext passwords shall never be persisted or logged. |
| NFR-SEC-02 | All authenticated API access shall require a valid JWT; expired/invalid tokens shall be rejected with 401. |
| NFR-SEC-03 | Role-restricted endpoints shall verify the caller's role server-side on every request. |
| NFR-SEC-04 | Payment webhook endpoints shall validate provider signatures to prevent spoofed events. |
| NFR-SEC-05 | All traffic shall be served over HTTPS in production. |
| NFR-SEC-06 | Sensitive configuration (API keys, secrets) shall be stored in environment variables, not committed to source control. |

### 5.3 Reliability & Availability
| ID | Requirement |
|---|---|
| NFR-REL-01 | The system shall expose a health-check endpoint to support uptime monitoring/self-ping. |
| NFR-REL-02 | Scheduled jobs (task escalation, promotional email) shall log failures without crashing the main server process. |
| NFR-REL-03 | Payment/order state changes driven by webhooks shall be idempotent to tolerate provider retries. |

### 5.4 Usability
| ID | Requirement |
|---|---|
| NFR-USE-01 | The storefront UI shall be responsive across mobile, tablet, and desktop breakpoints. |
| NFR-USE-02 | Role-based admin navigation shall only display sections relevant to the logged-in user's role, reducing cognitive load. |
| NFR-USE-03 | Form validation errors (checkout, registration) shall be surfaced inline and in plain language. |

### 5.5 Maintainability & Scalability
| ID | Requirement |
|---|---|
| NFR-MAINT-01 | Backend functionality shall be organized into independent route/controller/model modules per domain to support isolated changes. |
| NFR-MAINT-02 | The system shall be stateless at the application layer (JWT-based auth) to support horizontal scaling. |
| NFR-MAINT-03 | Environment-based configuration shall allow the same codebase to run in development, staging, and production without code changes. |

### 5.6 Compatibility
| ID | Requirement |
|---|---|
| NFR-COMP-01 | The storefront and admin portal shall function correctly on the latest two major versions of Chrome, Firefox, Edge, and Safari. |

---

## 6. Data Requirements

### 6.1 Key Entities
User, Product, Cart, Checkout/Checkout1, Order, Payment, Review, Wishlist, Offer, Campaign, Task, Subscriber, Contact/ContactSetting, Complaint, ReturnRequest, Hero/HeroSlide, About, Policy, ShippingConfig, SizeChart, MetaOption, Collab, WalletLedger.

### 6.2 Data Retention & Integrity
- Order and payment records shall be retained indefinitely for financial/audit traceability.
- Referential integrity between Order, Payment, and Product/Inventory records shall be maintained at the application layer via Mongoose schema references.
- Uploaded media shall be referenced by URL/public ID from Cloudinary rather than duplicated in the primary database.

---

## 7. Other Requirements

### 7.1 Legal & Compliance
- The system shall provide a Privacy Policy page and shall not store raw payment card data, in line with PCI-DSS delegation to Razorpay/PayPal.

### 7.2 Deployment
- The frontend and backend shall be independently deployable (e.g., Vercel for frontend, Vercel/Render for backend), configured via `vercel.json`/`render.yaml` and environment variables.

---

## Appendix A: Glossary
| Term | Definition |
|---|---|
| JWT | JSON Web Token, used for stateless authentication. |
| OTP | One-Time Password, used for mobile/email verification. |
| Webhook | Server-to-server callback used by Razorpay/PayPal to notify payment events asynchronously. |
| COD | Cash on Delivery. |
| CMS | Content Management System — here, the editable Hero/About/Contact/Policy content. |
| SKU/Variant | A specific purchasable configuration of a product (e.g., size/colour combination). |

## Appendix B: Actor–Module Traceability (Summary)

| Actor | Primary Modules |
|---|---|
| Guest | Catalog, Offers, Content pages |
| Customer | Catalog, Cart, Checkout, Payment, Orders, Reviews, Wishlist, Complaints, Return Requests |
| Admin | All modules |
| Merchandise | Catalog, Orders, Inventory, Analytics, Tasks, Offers |
| Delivery Boy | Order fulfilment visibility, Profile |
| Marketing | Campaigns, Offers, Subscribers, Contacts |

## Appendix C: Open Issues
- Certain CMS settings routes currently lack explicit middleware protection and should be hardened before production hardening sign-off.
- Recommendation module is currently catalog/rule-based; a trained ML model is a future enhancement, not a current requirement.

---
**Document Type:** Software Requirements Specification (IEEE 830-based)
**Project:** Raphaaa E-Commerce Platform
**Companion Documents:** `RAPHAAA_PROJECT_SYNOPSIS.md`, `RAPHAAA_FUNCTIONAL_DOCUMENTATION.md`
