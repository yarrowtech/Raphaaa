# PROJECT SYNOPSIS

## Raphaaa – A Role-Based Full-Stack E-Commerce and Business Operations Platform

---

## 1. Title of the Project
**Raphaaa: A Multi-Role Full-Stack E-Commerce Platform with Integrated Business Operations, Marketing, and Inventory Intelligence**

## 2. Project Category
Web-Based Application — E-Commerce (B2C) with Enterprise Operations Module
**Technology:** MERN Stack (MongoDB, Express.js, React.js, Node.js)

---

## 3. Introduction

E-commerce platforms today are expected to do far more than list products and accept payments. A modern online store must simultaneously serve customers with a fast, reliable shopping experience while giving the business behind it real-time control over inventory, orders, promotions, and customer communication.

**Raphaaa** is a full-stack e-commerce web application built to meet both needs in a single, unified system. It provides a complete customer-facing storefront — product discovery, cart, checkout, payments, and order tracking — alongside a role-based administrative back office that supports product management, order fulfilment, inventory monitoring, sales analytics, marketing campaigns, and internal task handling.

Rather than treating "admin panel" as a single flat role, Raphaaa is designed around **multiple operational roles** (Admin, Merchandise, Delivery Boy, Marketing), each with a scoped view of the system suited to their responsibilities. This reflects how real e-commerce businesses are organised into functional teams rather than a single administrator.

## 4. Existing System

Typical small-to-mid scale e-commerce setups rely on:
- A storefront built on a generic template or SaaS platform with limited customization.
- A single, undifferentiated "admin" role with no separation of duties between product, delivery, and marketing staff.
- Manual or spreadsheet-based inventory and sales tracking, disconnected from the live store.
- Marketing (campaigns, subscriber lists, offers) handled through third-party tools not integrated with order or customer data.
- Delayed or manual order status updates with no automated task/complaint workflow.

**Drawbacks of the Existing System:**
- Data fragmentation across multiple disconnected tools.
- No fine-grained, role-based access control for internal staff.
- Poor real-time visibility into stock levels and sales trends.
- Slow, manual marketing and communication workflows.
- No centralized handling of customer complaints, tasks, or returns.

## 5. Proposed System

Raphaaa proposes a **single, self-hosted, full-stack platform** that unifies the customer storefront and internal business operations under one codebase and one database, with access differentiated strictly by user role.

**Advantages of the Proposed System:**
- One consistent source of truth for products, orders, users, and payments.
- Role-based dashboards so each internal team (Admin, Merchandise, Delivery, Marketing) sees only what is relevant to them.
- Real-time inventory, sales trend, and revenue reporting driven directly from live order data.
- Integrated marketing tools (campaign tracker, subscriber broadcast, offer scheduling) working against the same customer/order data as the storefront.
- Automated workflows (task status escalation, scheduled promotional emails, webhook-driven payment/stock updates) reducing manual operational overhead.
- Secure, extensible architecture built on widely adopted open technologies (MERN), making the system maintainable and scalable.

## 6. Objectives

1. Design and implement a complete customer shopping journey — catalog browsing, cart, wishlist, checkout, payment, and order tracking.
2. Implement secure, JWT-based authentication with OTP verification and Google login support.
3. Build a role-based access control system covering Admin, Merchandise, Delivery Boy, and Marketing roles.
4. Provide administrative modules for product, order, user, and inventory management.
5. Integrate a secure payment gateway (Razorpay, with PayPal support) including webhook-based order/stock reconciliation.
6. Build analytics dashboards for inventory levels, sales trends, and revenue.
7. Implement marketing tooling: campaign tracking, subscriber management, and offer/coupon broadcast.
8. Provide internal operational tooling: task assignment with automated status escalation, and complaint/return-request handling.
9. Support a content management layer (Hero banners, About, Contact, Privacy Policy) editable without code changes.

## 7. Scope of the Project

The system scope covers:
- **Customer-facing storefront:** product catalog with filters/search, product detail pages with variants (size, colour), cart, wishlist, checkout, order history, product reviews and Q&A, size charts, and return requests.
- **Administrative back office:** product/order/user/inventory management, sales and revenue analytics, task management, and website content settings.
- **Marketing operations:** campaign creation and click/conversion tracking, subscriber and contact-lead management, promotional offer scheduling.
- **Payments and fulfilment:** Razorpay/PayPal integration, payment webhooks, shipping configuration, and delivery-role order visibility.
- **Recommendation support:** a product recommendation module surfacing related/suggested products to customers.

Out of scope: native mobile applications, multi-warehouse/multi-currency support, and third-party marketplace syndication (Amazon/Flipkart listings) — noted under Future Scope.

## 8. Feasibility Study

| Type | Assessment |
|---|---|
| **Technical** | Built entirely on mature, well-documented open-source technologies (React, Node.js, Express, MongoDB) with abundant tooling and community support. All third-party integrations (Razorpay, Cloudinary, email/SMS) provide stable REST/SDK interfaces. |
| **Operational** | Role-based interfaces map directly onto existing store operational roles (product, delivery, marketing), minimizing staff retraining. |
| **Economic** | Uses free/open-source frameworks and pay-as-you-go third-party services (Cloudinary, Razorpay, email/SMS providers), keeping infrastructure cost low and usage-proportional. |
| **Schedule** | Modular route/model structure allowed each functional area (auth, catalog, orders, marketing, operations) to be built and tested independently, supporting incremental delivery. |

## 9. System Requirements

### 9.1 Hardware Requirements
- Standard development machine (min. 8 GB RAM, multi-core CPU) for local development.
- Cloud hosting instance/serverless deployment for production (e.g., Vercel/Render-class infrastructure).

### 9.2 Software Requirements
| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, Redux Toolkit, React Router, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT, Bcrypt, Google OAuth, OTP (SMS/email) |
| Payments | Razorpay, PayPal |
| Media Storage | Cloudinary |
| Scheduling/Automation | Node-Cron |
| Analytics/Charts | Chart.js / Recharts |
| Version Control | Git, GitHub |
| Deployment | Vercel / Render |

## 10. System Design Overview

### 10.1 Architecture
Raphaaa follows a **three-tier client-server architecture**:
1. **Presentation Layer** — React single-page application (customer storefront + role-gated admin portal), communicating via REST APIs.
2. **Application Layer** — Node.js/Express server exposing route-modules for each domain (auth, product, order, payment, marketing, operations), enforcing authentication and role middleware.
3. **Data Layer** — MongoDB with Mongoose schemas modelling users, products, orders, payments, offers, campaigns, tasks, and content settings.

### 10.2 Role Model
- **Guest / Public** — Browse catalog, view offers and content pages.
- **Customer** — Full storefront access: cart, checkout, orders, reviews, wishlist, complaints.
- **Admin** — Full system access across all modules.
- **Merchandise** — Product, order, and inventory operations; sales dashboards.
- **Delivery Boy** — Operational visibility into assigned orders and delivery status.
- **Marketing** — Campaign management, subscriber/contact handling, promotional broadcast.

### 10.3 Data Flow (Textual)
1. Guest/customer browses catalog → adds items to cart/wishlist → proceeds to checkout.
2. Checkout collects address → initiates payment via Razorpay/PayPal → payment webhook confirms transaction.
3. Confirmed order updates inventory and enters the order-management queue.
4. Merchandise/Admin roles update order/delivery status; Delivery role views assigned fulfilment tasks.
5. Marketing role runs campaigns/offers against subscriber and customer data, tracked via click/conversion endpoints.
6. Analytics module aggregates order/inventory data into sales trend and revenue dashboards for Admin/Merchandise.

### 10.4 Key Data Entities
User, Product, Cart, Checkout, Order, Payment, Review, Wishlist, Offer, Campaign, Task, Subscriber, Contact, Complaint, ReturnRequest, Hero, About, Policy, ShippingConfig, SizeChart, MetaOption, Collab.

## 11. Modules Description

1. **Authentication & Account Module** — Registration, login, JWT sessions, Google login, OTP verification, password reset, profile management.
2. **Role & Access Control Module** — Middleware-enforced role checks (`protect`, `admin`, `adminOrMerchantise`, generic role guards) with matching frontend route protection.
3. **Product Catalog Module** — Public listing, filtering/search, product detail with variants, size charts, product Q&A, and admin CRUD.
4. **Cart & Wishlist Module** — Add/update/remove cart items, wishlist management, and "previously viewed" tracking.
5. **Checkout & Order Module** — Address capture, order placement, order history, and admin/ops order board with status updates.
6. **Payment Module** — Razorpay and PayPal integration with webhook-driven payment confirmation and stock reconciliation.
7. **Review & Q&A Module** — Product ratings/reviews with optional images, and customer product questions.
8. **Return Request Module** — Post-delivery return submission and processing workflow.
9. **Website CMS Module** — Editable Hero banners, About content, Contact settings, and Privacy Policy — all editable without redeployment.
10. **Offers & Promotions Module** — Offer creation, scheduling, and storefront showcase, with automated scheduled email broadcast.
11. **Campaign Tracking Module** — Marketing campaign CRUD, click/impression tracking pixels, and conversion tracking.
12. **Subscriber & Contact Module** — Newsletter subscription capture and contact-form lead management with marketing broadcast tools.
13. **Complaint Management Module** — Customer complaint submission and internal resolution tracking.
14. **Inventory & Sales Intelligence Module** — Stock-level monitoring with low-stock alerts, sales trend charts, and revenue reporting.
15. **Task Management Module** — Internal task assignment with a daily automated scheduler that escalates unresolved tasks.
16. **Recommendation Module** — Suggests related/relevant products to customers based on catalog and behavioural signals.
17. **Collaboration & Exclusive Drops Module** — Manages footballer/brand collaboration showcases and limited-edition product drops.
18. **File Upload & Media Module** — Secure, role-protected Cloudinary-backed image upload/delete for products and site content.
19. **Address Management Module** — Customer address book, integrated with checkout for repeat ordering.

## 12. Technology Stack Justification

- **React + Vite:** Fast, component-driven UI development with quick build/reload cycles for a large multi-page storefront and admin portal.
- **Redux Toolkit:** Predictable state management across cart, auth, and admin data flows.
- **Tailwind CSS:** Utility-first styling enabling a consistent, responsive design system without heavy custom CSS.
- **Node.js + Express:** Lightweight, non-blocking API layer well suited to I/O-heavy e-commerce workloads (payments, uploads, emails).
- **MongoDB + Mongoose:** Flexible document schema fits the varied and evolving data shapes of products, orders, and CMS content.
- **JWT + Bcrypt:** Industry-standard stateless authentication and password hashing.
- **Razorpay/PayPal:** Trusted, PCI-compliant payment processors with strong webhook support for reconciliation.
- **Cloudinary:** Offloads image storage/transformation from the application server.
- **Node-Cron:** Enables in-process scheduled automation (task escalation, promotional email dispatch) without external infrastructure.

## 13. Testing Approach

- **Unit-level checks** on critical backend logic (order/payment state transitions, role middleware).
- **Functional/manual testing** of end-to-end flows per role: guest browsing, customer checkout/payment, admin product/order management, marketing campaign lifecycle, delivery order visibility.
- **Integration testing** of third-party services: Razorpay payment + webhook flow, Cloudinary upload/delete, email/OTP delivery.
- **Regression testing** on module interaction (e.g., verifying inventory updates correctly after a payment webhook fires).

## 14. Advantages of the System

- Single unified codebase and database eliminate data silos between storefront and operations.
- Clear separation of duties through role-based dashboards improves accountability and security.
- Real-time inventory and sales visibility supports faster business decisions.
- Automated scheduling (tasks, promotional emails) reduces manual operational load.
- Modular route/model structure makes the system straightforward to extend with new features.

## 15. Limitations

- Some settings routes currently lack strict middleware and should be hardened before scaled production use.
- No native mobile application; the platform is web-only (responsive, not app-packaged).
- Single-currency, single-warehouse assumption in the current data model.
- Recommendation logic is currently rule/catalog-based rather than a trained ML model.

## 16. Future Scope

- Enhanced KPI dashboards with predictive sales analytics.
- Fine-grained, auditable permission controls and activity logging.
- Machine-learning-driven personalized product recommendations.
- Deeper delivery-lifecycle automation (real-time tracking, courier API integration).
- Multi-warehouse and multi-currency support for geographic expansion.
- Native mobile application built on the existing REST API layer.

## 17. Conclusion

Raphaaa demonstrates that a single, well-structured MERN application can serve both a customer-facing e-commerce storefront and the internal operational needs of a real business — product management, fulfilment, marketing, and analytics — without relying on a patchwork of disconnected tools. Its role-based architecture, integrated payment/media services, and automation-driven operational modules make it a practical, extensible foundation for a growing online retail business.

## 18. Bibliography / References

- React.js Documentation — https://react.dev
- Node.js Documentation — https://nodejs.org/docs
- Express.js Documentation — https://expressjs.com
- MongoDB & Mongoose Documentation — https://www.mongodb.com/docs, https://mongoosejs.com
- Razorpay API Documentation — https://razorpay.com/docs
- Cloudinary Documentation — https://cloudinary.com/documentation
- Tailwind CSS Documentation — https://tailwindcss.com/docs
- Project codebase: `/backend`, `/frontend`, `/ml` (current repository)

---
**Document Type:** Project Synopsis (IT Project Format)
**Project:** Raphaaa E-Commerce Platform
**Prepared From:** Current codebase snapshot
