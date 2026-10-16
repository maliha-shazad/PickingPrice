# Picking Price Analysis Models

These models describe the system as it is implemented. They correspond to Appendix B of the Software Requirements Specification: the context model (B.1), the core marketplace flows (B.2) and the entity-relationship diagram (B.3).

Image versions of every diagram are in `docs/diagrams/`.

## 1. Context model

The system has three kinds of user and two external services. Product payments between buyer and seller never pass through the system.

```mermaid
flowchart LR
  Buyer([Buyer])
  Seller([Seller])
  Admin([Administrator])
  System[["Picking Price<br/>web application"]]
  Email[/"Email service<br/>(optional)"/]
  Pay[/"External payment method<br/>(bank or mobile wallet)"/]

  Buyer -- "register, search, wishlist,<br/>post requests, chat, review, report" --> System
  System -- "listings, offers,<br/>notifications" --> Buyer
  Seller -- "listings, offers, slot and<br/>promotion requests, chat" --> System
  System -- "requests, offers received,<br/>payment decisions, notifications" --> Seller
  Admin -- "moderation, payment decisions,<br/>settings, categories" --> System
  System -- "records, reports,<br/>statistics, activity log" --> Admin
  System -- "notification emails" --> Email
  Seller -. "pays the platform charge<br/>outside the system" .-> Pay
  Pay -. "payment reference" .-> Seller
```

| Actor | Interaction with Picking Price |
|---|---|
| Buyer | Registers and signs in, searches and filters listings, keeps a wishlist, posts requests, compares offers and selects a seller, chats with sellers, writes reviews, reports content |
| Seller | Registers and signs in, creates and manages listings, answers buyer requests with offers, chats with buyers, requests extra listing slots and promotions |
| Administrator | Manages members, listings, requests, reviews and categories, reviews reports, approves or rejects platform payments, sets limits and prices |
| Email service (optional) | Delivers a copy of each in-app notification when an email key is configured |
| External payment method | Receives the platform charge outside the system; the seller enters the payment reference for the administrator to verify |

## 2. Core marketplace flows

### 2.1 Fixed-price listing

```mermaid
flowchart LR
  A[Seller fills in<br/>the listing form] --> B{Valid, and a<br/>listing slot is free?}
  B -- No --> A2[Errors shown, or seller<br/>asked to request more slots]
  B -- Yes --> C[Listing published]
  C --> D[Buyer searches<br/>or browses]
  D --> E[Buyer opens<br/>the listing]
  E --> F[Buyer chats with or<br/>calls the seller]
  F --> G[Deal agreed and paid<br/>outside the platform]
```

### 2.2 On-demand request

```mermaid
flowchart LR
  A[Buyer posts<br/>a request] --> B[Request is Open]
  B --> C[Sellers browse and<br/>filter requests]
  C --> D[Seller sends an offer]
  D --> E[Request shows<br/>Responses Received]
  E --> F[Buyer compares offers<br/>and chats with sellers]
  F --> G{Buyer decides}
  G -- Selects an offer --> H[Seller Selected:<br/>sellers notified]
  G -- No longer needed --> I[Closed or Cancelled]
  B -. expiry date passes .-> J[Expired]
  E -. expiry date passes .-> J
```

### 2.3 Promotion

```mermaid
flowchart LR
  A[Seller chooses a listing<br/>and a promotion length] --> B[Seller pays outside<br/>the platform]
  B --> C[Seller submits the<br/>payment reference]
  C --> D[Payment request:<br/>Pending]
  D --> E{Administrator<br/>checks the payment}
  E -- Approved --> F[Promotion active:<br/>Featured badge]
  E -- Rejected --> G[Seller notified<br/>with the reason]
  F --> H[Promotion ends on<br/>its expiry date]
```

### 2.4 Additional listing slots

```mermaid
flowchart LR
  A[Seller reaches the<br/>free listing limit] --> B[Seller chooses the number<br/>of extra slots]
  B --> C[Seller pays outside<br/>the platform]
  C --> D[Seller submits the<br/>payment reference]
  D --> E{Administrator<br/>checks the payment}
  E -- Approved --> F[Extra slots added:<br/>seller can list again]
  E -- Rejected --> G[Seller notified<br/>with the reason]
```

## 3. Entity-relationship diagram

The diagram covers the twelve entities listed in section 6.1 of the specification, as implemented. There are no order, auction, bid, wallet or withdrawal entities, because those functions are outside the project's scope.

```mermaid
erDiagram
  CATEGORY ||--o{ LISTING : "classifies"
  CATEGORY ||--o{ BUYER_REQUEST : "classifies"
  USER ||--o{ LISTING : "sells"
  USER ||--o{ BUYER_REQUEST : "posts"
  USER ||--o{ SELLER_OFFER : "sends"
  USER ||--o{ WISHLIST : "saves"
  USER ||--o{ REVIEW : "writes / receives"
  USER ||--o{ PROMOTION : "owns"
  USER ||--o{ PAYMENT_REQUEST : "submits"
  USER ||--o{ CONVERSATION : "takes part in"
  USER ||--o{ REPORT : "files"
  USER ||--o{ NOTIFICATION : "receives"
  LISTING ||--o{ WISHLIST : "saved in"
  LISTING ||--o{ PROMOTION : "featured by"
  LISTING ||--o{ PAYMENT_REQUEST : "promotion for"
  BUYER_REQUEST ||--o{ SELLER_OFFER : "receives"
  CONVERSATION ||--o{ MESSAGE : "contains"

  USER {
    text id PK
    text email
    text name
    text password_hash
    text role "buyer, seller or both"
    text location
    int verified
    int suspended
    int used_slots
    int extra_slots
  }
  CATEGORY {
    text id PK
    text name
    text subcategories
    int active
  }
  LISTING {
    text id PK
    text owner FK
    text category FK
    text title
    int price
    int quantity
    text condition
    text location
    text images
    int negotiable
    int exchange
    text status
  }
  BUYER_REQUEST {
    text id PK
    text owner FK
    text category FK
    text title
    int price "maximum budget"
    int quantity
    text condition
    text location
    text expiry
    text status
    text selected_offer FK
  }
  SELLER_OFFER {
    text id PK
    text request_id FK
    text owner FK
    int price
    text description
    text status
  }
  WISHLIST {
    text id PK
    text owner FK
    text listing_id FK
  }
  REVIEW {
    text id PK
    text owner FK "the buyer"
    text seller_id FK
    int rating
    text body
    int hidden
  }
  PROMOTION {
    text id PK
    text owner FK
    text listing_id FK
    text starts
    text expires
    text status
  }
  PAYMENT_REQUEST {
    text id PK
    text owner FK
    text purpose "slots or promotion"
    int quantity
    int duration
    text listing_id FK
    int amount
    text reference
    text status
    text verified_at
  }
  CONVERSATION {
    text id PK
    text first_user FK
    text second_user FK
    text context_type "listing, request or offer"
    text context_id
  }
  MESSAGE {
    text id PK
    text conversation_id FK
    text owner FK "the sender"
    text body
    text created
  }
  REPORT {
    text id PK
    text owner FK
    text target_type
    text target_id
    text reason
    text status
    text resolution
  }
  NOTIFICATION {
    text id PK
    text owner FK
    text title
    text body
    text link_type
    int read
  }
```

### Notes on the implementation

| Entity in the specification | Table or tables |
|---|---|
| Users | `accounts` (sign-in details) and `profiles` (public details, role, listing slots) |
| Product Listings | `listings` |
| Categories | `categories` |
| On-Demand Requests | `buyer_requests` (unfinished ones in `request_drafts`) |
| Seller Responses | `seller_offers` |
| Wishlist | `favorites` |
| Reviews | `reviews` |
| Promotions | `promotions` |
| Payment Records | `payment_requests` |
| Messages | `conversations` and `chat_messages` |
| Reports | `reports` |
| Notifications | `notifications` |

Supporting tables that are not marketplace entities: `sessions`, `auth_attempts`, `oauth_states`, `uploads`, `settings`, `conversation_reads`, `admin_auth`, `admin_sessions`, `admin_audit`, `mail_account`, `notification_emails` and `schema_migrations`.

A listing or request stores its category by name; renaming a category in the admin panel updates the items that use it. A report points at its target (listing, request, message, review or member) through `target_type` and `target_id`.

## 4. System architecture

```mermaid
flowchart LR
  B["Browser<br/>React 19.2.6, built with Vite 8.0.13"] -- "HTTPS, JSON API" --> S["Server<br/>Node.js 24, Express 5.2.1"]
  S -- "node-postgres 8.23.0" --> D[("PostgreSQL<br/>18 live, 17.11 local")]
  S -- "photos" --> V["Disk folder<br/>(Railway volume)"]
  S -- "sign-in" --> G["Google OAuth 2.0"]
  S -- "emails" --> M["Gmail API"]
```

| Layer | Technology |
|---|---|
| Browser app | React 19.2.6, Vite 8.0.13, Tailwind CSS 4.2.1, Radix UI 1.6.7 |
| Server | Node.js 24, Express 5.2.1, Zod 3.25.76 |
| Data | PostgreSQL (18 on Railway, 17.11 locally), node-postgres 8.23.0 |
| Hosting | Railway (Docker image `node:24-slim`), source on GitHub |
| Outside services | Google OAuth 2.0 for sign-in, Gmail API for email |

Versions checked on 16 October 2026 against the installed packages and the live services.
