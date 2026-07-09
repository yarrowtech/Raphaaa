# PERFORMANCE & COST PLAN

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Document Type:** Infrastructure Performance Specification + Cost Plan (INR)
**Baseline Infrastructure (as provided):** Domain (.com), MongoDB Atlas (Free Tier), AWS EC2 `t3.large` (backend), Shiprocket (wallet-based), Razorpay (payment gateway)
**Companion Documents:** `RAPHAAA_PROJECT_BLUEPRINT.md`, `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_PROJECT_PHASES.md`

> **Disclaimer:** All figures are **indicative planning estimates**, not vendor quotes. USD→INR conversion assumed at **₹84 = $1**. Cloud/SaaS list prices change frequently and vary by region/promotion — verify against each provider's live pricing page (AWS Pricing Calculator, MongoDB Atlas pricing, Razorpay pricing, Shiprocket plans) before budgeting a committed spend. GST (18%) is called out separately where it applies to Indian vendor invoices (domain registrars, SaaS billed in INR); AWS/Atlas USD invoices are typically subject to IGST reverse charge, not shown here.

---

## 1. Purpose

This document specifies (a) the **expected performance/capacity envelope** of the current infrastructure choices, and (b) a **monthly and annual cost plan in INR** covering one-time, fixed-recurring, and usage-based (variable) costs — so infrastructure spend can be planned against expected order volume rather than guessed at.

---

## 2. Current Infrastructure Snapshot

| Layer | Current Choice | Billing Model |
|---|---|---|
| Domain | `.com` | Annual renewal (not truly one-time) |
| Backend Hosting | AWS EC2 `t3.large` (2 vCPU, 8 GB RAM, burstable) | Hourly on-demand (or Reserved for discount) |
| Database | MongoDB Atlas — **Free Tier (M0)** | Free, capacity-capped |
| Media Storage | Cloudinary (assumed Free tier, per `RAPHAAA_SYSTEM_DESIGN.md`) | Free credits/month, then paid |
| Frontend Hosting | Vercel (per `RAPHAAA_SYSTEM_DESIGN.md`) | Free (Hobby) or Pro |
| Payments | Razorpay (+ PayPal path) | Per-transaction fee, no monthly charge |
| Shipping | Shiprocket | Prepaid wallet, per-shipment deduction |
| Communication | Email/SMS OTP provider | Per-message/usage-based |

---

## 3. Performance Specification Table

| Component | Technical Specification | Capacity / Expected Throughput | Risk / Bottleneck Note |
|---|---|---|---|
| **AWS EC2 t3.large** | 2 vCPU (burstable, T3 credit-based), 8 GB RAM, up to 5 Gbps burstable network, EBS-optimized | Comfortably serves an Express/Node.js API for an SMB storefront: ≈ **150–300 requests/sec** on typical JSON API routes, ≈ **300–600 concurrent users** browsing/checkout, depending on payload size and DB latency | Single instance = **no high availability**; a crash/restart causes downtime. CPU credits can be exhausted under sustained (non-bursty) load, throttling performance — monitor `CPUCreditBalance` in CloudWatch |
| **MongoDB Atlas M0 (Free)** | Shared vCPU/RAM, **512 MB storage hard cap**, max ~500 connections | Adequate for **dev/early-stage production only** (roughly up to a few thousand orders and a few hundred products before hitting the storage cap) | No backups, no dedicated performance, shared noisy-neighbor tenancy; **must upgrade to M10+ before serious production traffic** to avoid storage-cap outages |
| **Cloudinary (Free)** | ~25 monthly credits (storage + bandwidth + transformations combined) | Sufficient for a few hundred products with moderate image traffic | Free tier bandwidth/storage exhausts quickly with large product galleries + high traffic; monitor usage dashboard |
| **Vercel (Frontend, Free/Hobby)** | Global CDN edge network | 100 GB/month bandwidth (Hobby tier fair-use) | Hobby tier is licensed for non-commercial use — a live commercial storefront should be on a paid Pro plan for support/SLA compliance |
| **Razorpay** | Managed payment gateway, PCI-DSS compliant | No meaningful rate limit at this scale; settlement T+2 days (standard) | Not a performance bottleneck at current scale |
| **Shiprocket** | Aggregator API across courier partners | API rate limits are plan-dependent, not typically a bottleneck at SMB volume | Shipment creation depends on wallet balance being sufficient — a depleted wallet blocks new shipment creation |

### Target Service-Level Objectives (SLOs)
| Metric | Target |
|---|---|
| API response time (p95, non-payment routes) | < 300 ms |
| Storefront homepage load (LCP) | < 2.5 s |
| Checkout → payment confirmation round-trip | < 5 s (excluding gateway UI interaction time) |
| Uptime (current single-instance AWS setup) | ~99.0–99.5% realistic target (no HA); 99.9%+ requires the multi-instance/load-balanced setup planned in Phase 4 |
| MongoDB Atlas storage headroom (Free tier) | Alert and plan upgrade at 70% of 512 MB (~360 MB) |

---

## 4. Cost Plan (INR)

### 4.1 One-Time / Setup Costs

| Item | Estimated Cost (INR) | Notes |
|---|---|---|
| `.com` domain registration (Year 1, promotional rate) | ₹700 – ₹1,200 | One-time for first year only; renews annually (see 4.2) |
| SSL/TLS certificate | ₹0 | Free via Let's Encrypt / included with Vercel & most hosts |
| AWS account/initial server setup effort | Not a vendor cost | Internal engineering time, not billed by AWS |

### 4.2 Fixed Recurring Costs (Monthly, INR)

| Item | Monthly Cost (INR) | Basis |
|---|---|---|
| Domain renewal (₹1,499/yr amortized) | ≈ ₹125 | .com renewal ~₹1,499–₹1,999/year depending on registrar |
| AWS EC2 `t3.large` (ap-south-1, On-Demand, ~$0.093/hr × 730 hrs) | ≈ ₹5,700 | Compute only, On-Demand pricing |
| EBS storage (30 GB gp3, ~$0.08/GB/month) | ≈ ₹200 | Root/data volume |
| Data transfer out (estimate, moderate traffic) | ≈ ₹500 – ₹1,500 | First 100 GB/month often free (12-month AWS Free Tier), then ~$0.09/GB |
| MongoDB Atlas M0 (Free Tier) | ₹0 | Capacity-capped — see Section 3 risk note |
| Cloudinary (Free tier) | ₹0 | Until credit quota exceeded |
| Vercel (Hobby/Free) | ₹0 | Pro tier ≈ ₹1,680/month (~$20) if commercial-tier support/SLA needed |
| Email/SMS OTP provider (budgeted, usage-based) | ₹1,000 – ₹3,000 | Depends on OTP + transactional email volume |
| **Subtotal — Fixed Infra (current, Free-tier DB)** | **≈ ₹7,500 – ₹10,000 / month** | Excludes payment gateway and shipping (fully usage-based, below) |

### 4.3 Usage-Based / Variable Costs

| Item | Rate | Notes |
|---|---|---|
| **Razorpay** transaction fee | ~2% + 18% GST on the fee (≈ **2.36% effective**) on cards/netbanking/wallets | **UPI and RuPay debit cards are currently 0% merchant fee** under RBI's zero-MDR mandate (policy subject to change — confirm current Razorpay terms) |
| Razorpay international cards | ~3% + GST | If applicable |
| **Shiprocket** wallet-funded shipping | ≈ ₹35 – ₹90 per shipment (varies by weight slab, source/destination zone, forward vs. COD) | Prepaid wallet — recharge before balance depletes to avoid blocked shipment creation |
| Shiprocket COD remittance/handling | Typically included in per-shipment rate, some plans add a small COD fee (~1–2% of order value) | Confirm on current Shiprocket plan |
| AWS data transfer overage | ≈ ₹7.5/GB beyond free allowance | Scales with storefront traffic/media served directly from the backend (media itself is served via Cloudinary CDN, reducing this) |

---

## 5. Estimated Monthly Total — By Order-Volume Scenario

| Scenario | Orders/Month | Fixed Infra (₹) | Razorpay Fees (₹, @2.36% on est. GMV) | Shiprocket Wallet (₹, @₹55/shipment avg) | **Estimated Monthly Total (₹)** |
|---|---|---|---|---|---|
| **Low (current stage)** | ~500 | 7,500 – 10,000 | ~11,800 (on ₹5,00,000 GMV) | ~27,500 | **≈ ₹47,000 – ₹49,500** |
| **Medium (growth stage)** | ~2,000 | 24,700 *(incl. Atlas M10 upgrade + Vercel Pro)* | ~47,200 (on ₹20,00,000 GMV) | ~1,10,000 | **≈ ₹1,82,000** |
| **High (scale stage)** | ~10,000 | 60,000 – 90,000 *(Atlas M30, larger/multi-instance compute, Cloudinary paid tier)* | ~2,36,000 (on ₹1,00,00,000 GMV) | ~5,50,000 | **≈ ₹8,46,000 – ₹8,76,000** |

*Average order value (AOV) assumed ≈ ₹1,000 for GMV estimates above — recalculate with your actual AOV. Payment gateway and shipping costs scale with order volume/value, not with infrastructure tier, so they dominate total spend at higher volumes — infra is a small fraction of overall monthly cost once the store is transacting meaningfully.*

---

## 6. Annual Cost Projection (Current/Low Scenario)

| Item | Annual Cost (INR) |
|---|---|
| Domain renewal | ~₹1,500 |
| AWS EC2 `t3.large` (On-Demand) | ~₹68,400 |
| AWS EC2 `t3.large` (1-Year Reserved Instance, ~30–40% discount) | ~₹41,000 – ₹47,900 |
| MongoDB Atlas (Free) | ₹0 |
| Email/SMS budget | ~₹12,000 – ₹36,000 |
| **Fixed infra total (On-Demand)** | **≈ ₹82,000 – ₹1,06,000/year** |
| **Fixed infra total (with 1-yr AWS Reserved Instance)** | **≈ ₹55,000 – ₹85,000/year** |

*Razorpay and Shiprocket are excluded from this annual fixed total since they scale directly with sales/order volume, not with a fixed subscription — see Section 5 for volume-linked projections.*

---

## 7. Scaling / Upgrade Cost Reference

| Trigger | Upgrade | Approx. New Monthly Cost |
|---|---|---|
| Atlas Free tier storage nearing 512 MB cap | Upgrade to **M10** (dedicated, 2 GB RAM, 10 GB storage) | ≈ ₹4,800/month |
| Sustained high DB load / need for backups | Upgrade to **M20/M30** | ≈ ₹12,000 – ₹33,000/month |
| `t3.large` CPU credit exhaustion under sustained load | Move to `t3.xlarge` or `m5.large` (non-burstable) | ≈ ₹11,000 – ₹14,000/month (On-Demand) |
| Need for HA/zero-downtime | Add a second instance + Application Load Balancer | + ≈ ₹5,700/month per additional instance + ~₹1,700/month ALB |
| Cloudinary free credits exceeded | **Plus** plan | ≈ $99/month ≈ ₹8,316/month |
| Commercial frontend SLA/support needed | Vercel **Pro** | ≈ $20/month/seat ≈ ₹1,680/month |

*This scaling path aligns with **Phase 4 — Scale, Performance & Multi-Region Readiness** in `RAPHAAA_PROJECT_PHASES.md`.*

---

## 8. Key Assumptions & Notes

1. USD→INR rate assumed at ₹84/$1 — recompute at the prevailing rate when budgeting.
2. AWS pricing assumes `ap-south-1` (Mumbai) region, On-Demand Linux pricing; Reserved Instances or Savings Plans reduce compute cost by roughly 30–40% for a 1-year commitment.
3. Razorpay's 0% UPI/RuPay merchant fee is a regulatory (RBI zero-MDR) policy that has shifted before and could change — do not treat it as permanently guaranteed in financial modeling.
4. Shiprocket per-shipment cost varies materially by parcel weight, dimensions, and delivery zone (local/regional/national/remote per the `ShippingConfig` zone table in `RAPHAAA_DATABASE_STRUCTURE.md`) — the ₹55 average used here is a planning midpoint, not a quoted rate.
5. MongoDB Atlas Free (M0) is **not recommended** to remain the production database once real order/customer volume builds — plan the M10 upgrade proactively rather than reactively after a storage-cap outage.
6. This plan intentionally excludes internal engineering/labor cost — it covers **vendor/infrastructure spend only**.

---
**Document Type:** Performance Specification & Cost Plan (INR)
**Project:** Raphaaa E-Commerce Platform
**Companion Documents:** `RAPHAAA_PROJECT_BLUEPRINT.md`, `RAPHAAA_SYSTEM_DESIGN.md`, `RAPHAAA_PROJECT_PHASES.md`
