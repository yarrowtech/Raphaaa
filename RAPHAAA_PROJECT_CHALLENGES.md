# PROJECT CHALLENGES

## Raphaaa – Challenges Faced During Development

**Document Type:** Quick Reference (Point-Wise)
**Project:** Raphaaa E-Commerce Platform

---

### Architecture & Roles
- Designing clean role-based access (Guest, Customer, Admin, Merchandise, Delivery Boy, Marketing) without duplicating logic
- Keeping frontend route guards and backend middleware in sync

### Payments
- Reconciling payment status safely (client confirmation vs Razorpay webhook) without double-processing
- Supporting Razorpay + PayPal + COD in one consistent order flow
- Preventing stock oversell during checkout race conditions

### Orders & Fulfilment
- Syncing order/tracking status with Shiprocket without blocking API responses (moved to scheduled jobs)
- Handling guest checkout alongside authenticated checkout in the same schema
- Designing return/replace workflow with reverse-pickup tracking

### Data Modeling
- Product variant system evolved mid-project (legacy `variants[]` → `colorVariants[]`), leaving both in schema
- Ended up with two near-duplicate checkout schemas (`Checkout`/`Checkout1`) from iteration
- Keeping historical order data accurate even after products are edited/deleted (snapshotting)

### Marketing & Promotions
- Building a flexible offer/coupon rule engine (stacking, exclusivity, conditions) without conflicts
- Campaign click/impression/conversion tracking via public, unauthenticated endpoints (abuse risk)

### Auth & Security
- OTP verification across mobile + email + Google login in one user flow
- Some routes shipped without auth middleware (tasks, a few CMS settings) — caught late, now a known gap
- CORS configuration across multiple environments/subdomains

### Automation
- Getting cron jobs (task escalation, wallet expiry, alerts) and the background job worker right without duplicate/missed runs

### Ops/Deployment
- Splitting frontend/backend across Vercel/Render with environment-specific config
- MongoDB Atlas free-tier storage cap looming as data grows

---
**Companion Documents:** `RAPHAAA_PROJECT_BLUEPRINT.md`, `RAPHAAA_SRS.md`, `RAPHAAA_PROJECT_PHASES.md`
