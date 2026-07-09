# SYSTEM DESIGN & ARCHITECTURE DOCUMENT

## Raphaaa – Role-Based Full-Stack E-Commerce and Business Operations Platform

**Document Version:** 1.0
**Prepared From:** Current codebase snapshot (`/backend`, `/frontend`, `/ml`)
**Companion Documents:** `RAPHAAA_SRS.md`, `RAPHAAA_FRS.md`, `RAPHAAA_PROJECT_SYNOPSIS.md`

> **Rendering note:** Diagrams marked `mermaid` render natively in GitHub, GitLab, and VS Code (Markdown Preview Mermaid Support extension). Diagrams marked `plantuml` need a PlantUML renderer (VS Code "PlantUML" extension, or https://www.plantuml.com/plantuml — paste the code block content).

---

## 1. Architecture Style

Raphaaa is a **monolithic, layered, three-tier web application** (not microservices) with one asynchronous background worker split out of the request/response cycle:

- **Client tier:** React SPA (storefront + role-gated admin portal), calling a single REST API.
- **Application tier:** Express.js server exposing ~40 route modules, each following Route → Middleware (auth/role) → Controller → Service/Model.
- **Data tier:** MongoDB via Mongoose.
- **Asynchronous tier:** an in-process job worker (`workers/jobWorker.js`) plus `node-cron` scheduled tasks, decoupling slow/unreliable operations (emails, webhooks, Shiprocket sync, wallet expiry, alert scanning) from the HTTP request path.

This style was chosen (per the codebase) for simplicity of deployment (single Node process + single React build) while still isolating slow/retryable work via a lightweight internal job queue rather than a full message broker.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Tier"]
        A1["Storefront SPA (React + Redux Toolkit)"]
        A2["Admin Portal SPA (Role-gated routes)"]
    end

    subgraph Edge["Edge / Hosting"]
        B1["Vercel (Frontend static hosting + CDN)"]
    end

    subgraph App["Application Tier — Node.js / Express (Render/Vercel)"]
        C1["CORS + JSON body parser + Request Tracing middleware"]
        C2["Auth Middleware (protect / admin / adminOrMerchantise / roleCheck)"]
        C3["~40 Route Modules (user, product, cart, checkout, order,\npayment, offer, campaign, task, complaint, wallet, referral,\nreturns, analytics, CMS, upload, sitemap...)"]
        C4["Controllers (order, payment, review, task, complaint,\nrevenue, hero, website, userAddress, campaign)"]
        C5["Service Layer (pricingService, walletService,\nalertService, jobQueue)"]
        C6["Background Job Worker (workers/jobWorker.js)"]
        C7["Node-Cron Schedulers (task escalation, offer email,\nwallet expiry, alert scan)"]
    end

    subgraph Data["Data Tier"]
        D1[("MongoDB\n(Users, Products, Orders, Payments,\nOffers, Campaigns, Tasks, Wallet, ...)")]
    end

    subgraph External["External Services"]
        E1["Razorpay / PayPal (Payments)"]
        E2["Cloudinary (Media storage/CDN)"]
        E3["Shiprocket (Shipping & tracking)"]
        E4["Email provider (transactional + marketing)"]
        E5["SMS/OTP provider"]
        E6["Google OAuth"]
    end

    A1 -->|HTTPS/JSON| B1
    A2 -->|HTTPS/JSON| B1
    B1 -->|REST API calls| C1
    C1 --> C2 --> C3 --> C4 --> C5
    C4 --> D1
    C5 --> D1
    C6 --> D1
    C7 --> D1
    C4 -.->|enqueue| C6
    C4 --> E1
    C4 --> E2
    C6 --> E3
    C6 --> E4
    C4 --> E5
    C2 --> E6
    E1 -.->|Webhook events| C3
```

---

## 3. Component Diagram (Backend Internal Layering)

```mermaid
flowchart LR
    subgraph RouteLayer["Route Layer"]
        R1[userRoutes]
        R2[productRoutes]
        R3[cartRoutes / checkoutRoutes]
        R4[orderRoutes / adminOrderRoutes]
        R5[paymentRoutes / paymentWebhook]
        R6["offerRoutes / campaignRoutes"]
        R7["taskRoutes / complaintRoutes / returnRequestRoutes"]
        R8["walletRoutes / referralRoutes / alertRoutes"]
        R9["analyticsRoutes / salesRoutes / inventoryRoutes"]
        R10["CMS routes: heroRoutes, aboutRoutes,\ncontactSettingRoutes, policyRoutes, collabRoutes"]
    end

    subgraph MiddlewareLayer["Middleware Layer"]
        M1["authMiddleware\n(protect, admin, adminOrMerchantise, roleCheck)"]
        M2[uploadMiddleware]
        M3[requestTracing]
    end

    subgraph ControllerLayer["Controller Layer"]
        CT1[orderController]
        CT2[paymentController]
        CT3[reviewController]
        CT4[taskController]
        CT5[complaintController]
        CT6[revenueController]
        CT7["heroController / websiteController"]
        CT8[campaignController]
        CT9[userAddressController]
    end

    subgraph ServiceLayer["Service Layer"]
        S1[pricingService]
        S2[walletService]
        S3[alertService]
        S4[jobQueue]
    end

    subgraph ModelLayer["Model Layer (Mongoose Schemas)"]
        MD1["User / Product / Order / Payment"]
        MD2["Offer / Campaign / Task / Complaint"]
        MD3["ReturnRequest / WalletLedger / Job"]
        MD4["Hero / About / Policy / Collab / SizeChart / MetaOption"]
    end

    subgraph ConfigLayer["Config Layer"]
        CFG1[db.js]
        CFG2[cloudinary.js]
        CFG3[razorpay.js]
        CFG4[multer.js]
        CFG5[shippingZones.js]
    end

    RouteLayer --> MiddlewareLayer --> ControllerLayer
    ControllerLayer --> ServiceLayer
    ControllerLayer --> ModelLayer
    ServiceLayer --> ModelLayer
    ControllerLayer --> ConfigLayer
    ServiceLayer --> ConfigLayer
```

---

## 4. Deployment Diagram

```mermaid
flowchart TB
    subgraph UserDevice["User Device"]
        Browser["Web Browser"]
    end

    subgraph VercelFE["Vercel — Frontend Hosting"]
        FE["React SPA build (Vite output)\n+ CDN edge caching"]
    end

    subgraph BackendHost["Render / Vercel — Backend Hosting"]
        API["Node.js/Express server\n(server.js)"]
        Worker["In-process job worker\n+ node-cron schedulers"]
    end

    subgraph AtlasCluster["MongoDB Atlas"]
        DB[("MongoDB database")]
    end

    subgraph ThirdParty["Third-Party Services"]
        RZP["Razorpay"]
        PP["PayPal"]
        CLD["Cloudinary"]
        SR["Shiprocket"]
        MAIL["Email service"]
        SMS["SMS/OTP service"]
    end

    Browser -->|HTTPS| FE
    FE -->|REST API / HTTPS| API
    API --> DB
    Worker --> DB
    API --> RZP
    API --> PP
    API --> CLD
    Worker --> SR
    Worker --> MAIL
    API --> SMS
    RZP -.->|Webhook callback| API
```

---

## 5. Database Design — Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER ||--o| CART : owns
    USER ||--o{ WISHLIST : maintains
    USER ||--o{ REVIEW : writes
    USER ||--o{ COMPLAINT : files
    USER ||--o{ RETURNREQUEST : requests
    USER ||--o{ WALLETLEDGER : "has entries"
    USER ||--o{ TASK : "assigned to"
    USER ||--o{ USER : refers

    PRODUCT ||--o{ ORDERITEM : "line item of"
    PRODUCT ||--o{ REVIEW : receives
    PRODUCT ||--o{ PRODUCTQA : has
    PRODUCT }o--o| OFFER : "discounted by"
    PRODUCT ||--o{ PRODUCTALERT : monitored_by

    ORDER ||--|{ ORDERITEM : contains
    ORDER ||--o| PAYMENT : "paid via"
    ORDER ||--o{ RETURNREQUEST : "may generate"

    CAMPAIGN ||--o{ CLICK_CONVERSION_EVENT : tracks

    OFFER {
        string code
        number discountPercent
        date validFrom
        date validTo
    }
    USER {
        string name
        string email
        string password_hash
        string role
        array addresses
        string referralCode
    }
    PRODUCT {
        string name
        number price
        number countInStock
        string category
        array colorVariants
        boolean isPublished
    }
    ORDER {
        string orderId
        string status
        boolean isPaid
        boolean isDelivered
        number totalPrice
        object shiprocket
    }
    PAYMENT {
        string gateway
        string status
        string transactionId
    }
    WALLETLEDGER {
        number amount
        string type
        date expiresAt
    }
    RETURNREQUEST {
        string reason
        string status
    }
    TASK {
        string title
        string status
        string assignedToEmail
    }
    COMPLAINT {
        string category
        string description
        string status
    }
```

---

## 6. UML Class Diagram (Core Domain Model)

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String name
        +String email
        -String password
        +String role
        +Address[] addresses
        +String mobile
        +Boolean mobileVerified
        +String referralCode
        +ObjectId referredBy
        +matchPassword(entered) Boolean
    }

    class Address {
        +String firstName
        +String lastName
        +String address
        +String city
        +String state
        +String postalCode
        +String phone
        +Boolean isDefault
    }

    class Product {
        +ObjectId _id
        +String name
        +Number price
        +Number discountPrice
        +Number countInStock
        +String sku
        +String category
        +ColorVariant[] colorVariants
        +Boolean isPublished
        +Number rating
        +Number numReviews
    }

    class ColorVariant {
        +String color
        +Image[] images
        +VariantSize[] sizes
    }

    class Cart {
        +ObjectId user
        +CartItem[] items
        +Number totalPrice
    }

    class Order {
        +String orderId
        +ObjectId user
        +OrderItem[] orderItems
        +Address shippingAddress
        +String paymentMethod
        +Number totalPrice
        +Boolean isPaid
        +Boolean isDelivered
        +String status
        +ShiprocketInfo shiprocket
        +String idempotencyKey
    }

    class OrderItem {
        +ObjectId productId
        +String name
        +Number price
        +String size
        +String color
        +Number quantity
        +String sku
    }

    class Payment {
        +ObjectId order
        +String gateway
        +String transactionId
        +String status
        +Number amount
    }

    class Review {
        +ObjectId product
        +ObjectId user
        +Number rating
        +String comment
        +String[] images
    }

    class Wishlist {
        +ObjectId user
        +ObjectId[] products
    }

    class Offer {
        +String code
        +Number discountPercent
        +Date validFrom
        +Date validTo
        +Boolean isActive
    }

    class Campaign {
        +String name
        +String status
        +Number clicks
        +Number impressions
        +Number conversions
    }

    class Task {
        +String title
        +String description
        +String assignedToEmail
        +String status
        +Date dueDate
    }

    class Complaint {
        +ObjectId user
        +String category
        +String description
        +String status
    }

    class ReturnRequest {
        +ObjectId order
        +ObjectId user
        +String reason
        +String status
    }

    class WalletLedger {
        +ObjectId user
        +Number amount
        +String type
        +Date expiresAt
    }

    class Job {
        +String type
        +Object payload
        +String status
        +Number attempts
    }

    User "1" --> "0..*" Order : places
    User "1" --> "0..1" Cart : owns
    User "1" --> "0..*" Wishlist : maintains
    User "1" --> "0..*" Review : writes
    User "1" --> "0..*" Complaint : files
    User "1" --> "0..*" ReturnRequest : requests
    User "1" --> "0..*" WalletLedger : "has"
    User "1" *-- "0..*" Address : embeds
    Order "1" *-- "1..*" OrderItem : contains
    Order "1" --> "0..1" Payment : "paid via"
    Order "1" --> "0..*" ReturnRequest : "may generate"
    Product "1" --> "0..*" OrderItem : "referenced by"
    Product "1" --> "0..*" Review : receives
    Product "1" *-- "0..*" ColorVariant : has
    Product "0..*" --> "0..1" Offer : "discounted by"
```

---

## 7. UML Use Case Diagram

```plantuml
@startuml
left to right direction
actor Guest
actor Customer
actor Admin
actor Merchandise
actor "Delivery Boy" as Delivery
actor Marketing
actor "Payment Gateway" as Gateway
actor Scheduler <<system>>

Guest <|-- Customer

rectangle Raphaaa {
  usecase "Browse Catalog" as UC1
  usecase "Register / Login" as UC2
  usecase "Manage Cart & Wishlist" as UC3
  usecase "Checkout" as UC4
  usecase "Make Payment" as UC5
  usecase "Track Order" as UC6
  usecase "Submit Review / Q&A" as UC7
  usecase "Submit Return Request" as UC8
  usecase "Submit Complaint" as UC9
  usecase "Manage Products" as UC10
  usecase "Manage Orders" as UC11
  usecase "Manage Inventory" as UC12
  usecase "View Sales & Revenue Analytics" as UC13
  usecase "Manage Website CMS" as UC14
  usecase "Manage Users & Roles" as UC15
  usecase "Update Delivery Status" as UC16
  usecase "Manage Offers" as UC17
  usecase "Manage Campaigns" as UC18
  usecase "Manage Subscribers/Contacts" as UC19
  usecase "Create & Assign Tasks" as UC20
  usecase "Confirm Payment (Webhook)" as UC21
  usecase "Auto-Escalate Overdue Tasks" as UC22
  usecase "Sync Shipment Status" as UC23

  Guest --> UC1
  Guest --> UC2

  Customer --> UC3
  Customer --> UC4
  Customer --> UC5
  Customer --> UC6
  Customer --> UC7
  Customer --> UC8
  Customer --> UC9

  Admin --> UC10
  Admin --> UC11
  Admin --> UC12
  Admin --> UC13
  Admin --> UC14
  Admin --> UC15
  Admin --> UC17
  Admin --> UC20

  Merchandise --> UC10
  Merchandise --> UC11
  Merchandise --> UC12
  Merchandise --> UC13
  Merchandise --> UC20

  Delivery --> UC16

  Marketing --> UC17
  Marketing --> UC18
  Marketing --> UC19

  Gateway --> UC21
  Scheduler --> UC22
  Scheduler --> UC23

  UC4 ..> UC5 : <<include>>
  UC5 ..> UC21 : <<include>>
}
@enduml
```

---

## 8. UML Sequence Diagrams — Key Flows

### 8.1 Authentication (Login)

```mermaid
sequenceDiagram
    actor U as User (Browser)
    participant FE as React SPA
    participant API as Express API
    participant MW as authMiddleware
    participant DB as MongoDB

    U->>FE: Enter email + password
    FE->>API: POST /api/users/login
    API->>DB: findOne(User by email)
    DB-->>API: User document (hashed password)
    API->>API: bcrypt.compare(password, hash)
    alt credentials valid
        API->>API: sign JWT {id, role}
        API-->>FE: 200 {token, user}
        FE->>FE: store token, set auth state
    else invalid
        API-->>FE: 401 Invalid credentials
    end
```

### 8.2 Checkout → Payment → Webhook Reconciliation

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as React SPA
    participant API as Express API (checkout/order/payment routes)
    participant RZP as Razorpay
    participant DB as MongoDB
    participant WH as paymentWebhook route

    C->>FE: Confirm checkout
    FE->>API: POST /api/checkout (address, items)
    API->>DB: Create Order (status=Processing, isPaid=false)
    API-->>FE: order draft + checkout id

    FE->>API: POST /api/paymentRoutes/create-order
    API->>RZP: Create Razorpay order
    RZP-->>API: razorpay_order_id
    API-->>FE: payment params

    FE->>RZP: Open Razorpay checkout widget
    RZP-->>FE: payment_id, order_id, signature

    FE->>API: POST /api/paymentRoutes/verify
    API->>API: verify HMAC signature
    API->>DB: update Order isPaid=true, paymentStatus=confirmed
    API-->>FE: 200 payment confirmed

    RZP-)WH: Webhook: payment.captured event
    WH->>WH: verify webhook signature
    WH->>DB: idempotent update Order/Payment + decrement stock
    WH-->>RZP: 200 OK
```

### 8.3 Scheduled Task Auto-Escalation (node-cron)

```mermaid
sequenceDiagram
    participant Cron as node-cron (0 19 * * * IST)
    participant Server as server.js
    participant DB as MongoDB (Task collection)

    Cron->>Server: trigger daily job at 19:00 IST
    Server->>DB: find Task where status="working" and createdAt in today
    DB-->>Server: matching tasks
    Server->>DB: updateMany(status -> "not completed")
    Server->>Server: log modified count
```

### 8.4 Background Job Worker + Shiprocket Sync

```mermaid
sequenceDiagram
    participant Timer as setInterval (15 min)
    participant Server as server.js
    participant SR as Shiprocket API
    participant DB as MongoDB (Order collection)
    participant Worker as jobWorker.js
    participant Queue as jobQueue (service)

    Timer->>Server: syncShiprocketStatusesForOpenOrders()
    Server->>DB: find open/shipped orders
    Server->>SR: GET tracking status per AWB
    SR-->>Server: tracking payload
    Server->>DB: update order.shiprocket + status

    Note over Worker,Queue: Independent loop, polls every JOB_WORKER_INTERVAL_MS
    Worker->>Queue: fetch next pending Job
    Queue->>DB: findOneAndUpdate(status=pending -> processing)
    DB-->>Queue: Job document
    Worker->>Worker: execute job by type (email/webhook retry/etc.)
    Worker->>DB: mark Job completed/failed (with attempts++)
```

---

## 9. Design Patterns & Architectural Notes

| Pattern / Technique | Where Used | Purpose |
|---|---|---|
| **Layered architecture** (Route → Middleware → Controller → Service → Model) | Entire backend | Separation of concerns; each route module stays thin. |
| **Middleware chain** | `authMiddleware`, `requestTracing`, `uploadMiddleware`, CORS | Cross-cutting concerns (auth, logging, file handling) applied declaratively per route. |
| **Stateless authentication (JWT)** | `authMiddleware`, all protected routes | Enables horizontal scaling without server-side session storage. |
| **Producer/Consumer job queue** | `services/jobQueue.js` + `workers/jobWorker.js` | Decouples slow/retryable operations (emails, webhook side-effects) from the request/response cycle; supports retry via `attempts` counter. |
| **Scheduler (cron) pattern** | `node-cron` jobs in `server.js` (task escalation, wallet expiry, alert scan, offer email) | Time-based automation independent of user requests. |
| **Idempotency key** | `Order.idempotencyKey`, webhook signature verification | Prevents duplicate order creation/payment processing on retries. |
| **Active Record via Mongoose** | All `models/*.js` | Schema validation and instance methods (e.g., `User.matchPassword`) co-located with the data model. |
| **Facade/Config isolation** | `config/db.js`, `config/cloudinary.js`, `config/razorpay.js`, `config/shippingZones.js` | Isolates third-party SDK setup from business logic, easing credential/env management. |
| **Role-Based Access Control (RBAC)** | `authMiddleware.roleCheck(...)`, frontend protected routes | Enforced server-side as the source of truth; frontend guarding is UX-only. |

---

## 10. How to Regenerate These Diagrams

- **Mermaid** blocks: render directly on GitHub/GitLab, or in VS Code with the "Markdown Preview Mermaid Support" extension, or paste into https://mermaid.live.
- **PlantUML** block (Section 7): render via the VS Code "PlantUML" extension, or paste into https://www.plantuml.com/plantuml/uml/.
- Diagrams are derived from the current schema/route snapshot; regenerate after any model or route-level change.

---
**Document Type:** System Design & Architecture Document (with UML)
**Project:** Raphaaa E-Commerce Platform
**Companion Documents:** `RAPHAAA_SRS.md`, `RAPHAAA_FRS.md`, `RAPHAAA_PROJECT_SYNOPSIS.md`, `RAPHAAA_FUNCTIONAL_DOCUMENTATION.md`
