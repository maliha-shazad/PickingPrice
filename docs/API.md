# Picking Price API Reference

Developer documentation for the HTTP API served by the Express server (`server/app.ts`). The rules behind it live in `lib/market/` and are routed in `lib/market/router.ts`.

## Technology

The API runs on Node.js 24 with Express 5.2.1. Data is stored in PostgreSQL (18 on the live site, 17.11 locally) through node-postgres 8.23.0, and every input is validated with Zod 3.25.76. The browser app that calls it is React 19.2.6 built with Vite 8.0.13. The full list is in the README.

## Conventions

- Requests and responses are JSON. Errors are `{ "error": "message" }` with a matching HTTP status: 400 invalid input, 401 not signed in, 403 not allowed, 404 not found, 409 conflict (for example a full listing allowance), 413 too large, 429 too many attempts.
- Sign-in is a server-side session held in an HttpOnly cookie. There are no tokens to send in headers.
- Every request that changes something (`POST`, `PATCH`, `PUT`, `DELETE`) must carry an `Origin` header equal to the site's own origin, otherwise it is refused with 403.
- Every answer carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` with `Content-Security-Policy: frame-ancestors 'none'` (no other site may show the pages in a frame) and a referrer policy; over HTTPS also `Strict-Transport-Security`. API answers are `Cache-Control: no-store`.
- Lists are paged with `page` (from 1) and `size` (default 12, maximum 60) and return `{ items, total, page, size, pages }`.
- Roles are `buyer`, `seller` and `both`. Seller actions need `seller` or `both`; buyer actions need `buyer` or `both`. Administrator actions are only reachable through the admin API.
- All input is validated on the server (`lib/market/validation.ts`) and all database access uses bound parameters.

## Accounts: `/api/auth`

| Method and path | Purpose |
|---|---|
| `GET /api/auth/options` | Which sign-in methods are available: `{ email, google, recovery }` |
| `POST /api/auth/signup` | Register: `{ name, email, phone, password, role, accepted }`; `accepted` must be `true` (the Privacy Policy and Terms of Service were accepted); `phone` is a required Pakistani mobile number (`3001234567`, `03001234567` or `+923001234567`), saved to the profile as `+923001234567`. Signs the member in |
| `POST /api/auth/login` | Sign in: `{ email, password }` |
| `POST /api/auth/logout` | End the current session |
| `POST /api/auth/forgot` | Email a 6-digit reset code to the account: `{ email }`. Same answer whether or not the address has an account; 503 when no email account is connected |
| `POST /api/auth/reset/verify` | Check a reset code without using it: `{ email, code }` |
| `POST /api/auth/reset` | Set the new password with the code: `{ email, code, password }`. Signs out every session; the member then logs in |
| `GET /api/auth/google` | Start Google sign-in (redirect) |
| `GET /api/auth/google/callback` | Google returns here |

`email` may also be a phone number. Passwords are 8 to 128 characters. Attempts are limited per email and per IP address.

## Files: `/api/files`

| Method and path | Purpose |
|---|---|
| `POST /api/admin/files` | Administrator only (admin cookie): upload a slider image (JPEG, PNG or WebP, up to 10 MB) or video (MP4 or WebM, up to 50 MB); returns `{ url, mime }` |
| `POST /api/files` | Upload one image (JPEG, PNG or WebP, up to 5 MB; the file's real type is checked) as the request body with its `Content-Type`; returns `{ url }`. Sign-in required |
| `GET /api/files/:key` | Serve an uploaded image or video (answers `Range` requests, so videos can be played and skipped through) |

A listing, request, offer or profile may only reference images uploaded by the same member.

## Marketplace: `/api/market`

### Reading

| Method and path | Purpose | Sign-in |
|---|---|---|
| `GET /bootstrap` | Current user, categories, unread and open-request counts | No |
| `GET /listings` | Active products. Filters: `q`, `category`, `condition`, `location`, `type` (`new` or `preloved`), `min`, `max`, `sort` (`relevance`, `newest`, `low`, `high`, `popular` = most viewed first), `premium=1` (only products with an active promotion, for the Premium Listings strip), `mine=1`, `saved=1` | Only for `mine` and `saved` |
| `GET /listings/:id` | One product. Counts a view (one per visitor per product per day; the seller's own visits and the administrator's are not counted); each product carries `views` | No |
| `GET /slides` | The active slides of the slider: `{ items: [{ id, kind (image, video or youtube), url, mobile_url (the phone version, or empty), title, link }] }`. Phones (up to 600 px wide) show `mobile_url` when it is set | No |
| `GET /requests` | Open buyer requests, same filters as listings; `mine=1` for your own | Only for `mine` |
| `GET /requests/:id` | One request | No |
| `GET /offers` | Offers: on a request you own (`request=<id>`), or the ones you sent | Yes |
| `GET /profiles/:id` | Public profile with rating, reviews and active listings | No |
| `GET /me` | Your profile, settings and counts | Yes |
| `GET /my-reviews` | Reviews you wrote | Yes |
| `GET /favorites` | Ids of products you saved | Yes |
| `GET /conversations` | Your chats, each with the item it is about | Yes |
| `GET /messages/:conversationId` | Messages of one chat (participants only). Reading it marks the chat as seen and marks its "New message" notifications read (`cleared` is how many were cleared); each of your own messages carries `read: true` once the other member has seen it | Yes |
| `GET /drafts` | Your saved request drafts | Yes |
| `GET /notifications` | Your notifications | Yes |
| `GET /services` | Slot usage, prices, payment instructions, your payment requests and promotions | Yes |

Search (`q`) matches title, description, category and, for products, brand. `location` matches inside the stored location text. Each product in a list carries `seller`, `verified`, `featured`, `seller_rating` and `seller_reviews`.

### Changing

| Method and path | Purpose | Role |
|---|---|---|
| `POST /listings` | Create a product (uses one listing slot). `description` ("About this item") is at most 1000 characters. With `spotlight: { duration, method, reference, senderName, senderAccount, paidAmount, paidOn, receipt }` the payment details are checked first and the product is saved as `Awaiting payment`: hidden from everyone but its seller until the administrator approves the payment (then it goes live as a Premium Listing). Returns `{ id, status }`. When the slots are full and a slot payment is still pending, the answer (409) says so | Seller |
| `POST /listings/:id/publish` | Publish a product that is `Awaiting payment` as a free listing (without the Premium Listing) | Seller (owner) |
| `PATCH /listings/:id` | Edit your product | Seller |
| `DELETE /listings/:id` | Remove your product and free its slot | Owner |
| `POST /requests` | Create a buyer request; it is live for 30 days (the server sets `expiry`) | Buyer |
| `POST /requests/:id/repost` | Post an ended (expired, closed or cancelled) request again as a new one, live for 30 days. Returns `{ id }` | Owner |
| `DELETE /requests/:id` | Delete a request; sellers with a pending offer are notified and the offers closed | Owner |
| `PATCH /requests/:id` | Edit your active request (the end date does not change) | Buyer |
| `POST /requests/:id/status` | `{ status }` = `Closed`, `Cancelled`, or `Seller Selected` with `offerId` | Owner |
| `POST /requests/:id/offers` | Send an offer on an active request | Seller |
| `PATCH /offers/:id` | Edit your offer | Seller |
| `DELETE /offers/:id` | Withdraw your offer | Seller |
| `PUT /favorites/:listingId` | `{ saved: true or false }` | Any member |
| `POST /conversations` | Open (or reuse) a chat: `{ contextType: listing, request or offer, contextId }` | Any member |
| `POST /messages/:conversationId` | Send a message: `{ body }` | Participant |
| `POST /profiles/:id/reviews` | Rate a seller you have been in contact with: `{ rating 1-5, body }` | Buyer |
| `PATCH /profile` | Update your profile and account type | Any member |
| `POST /reports` | `{ targetType: listing, request, message, review, user or general, targetId, reason }` | Any member |
| `POST /drafts`, `DELETE /drafts/:id` | Save or delete a request draft | Buyer |
| `POST /payments` | Ask for extra slots or a promotion: `{ purpose: slots or promotion, quantity, duration, listingId, method, reference, senderName, senderAccount, paidAmount, paidOn, receipt }`. `method` is JazzCash, Easypaisa, Bank transfer or Other; `paidAmount` may not be below the price; `paidOn` is a `YYYY-MM-DD` date within the last 90 days; `receipt` is an image uploaded to your own account; each `reference` can be used once | Seller |
| `PATCH /notifications/:id` | Mark one notification read (`all` marks every one) | Any member |

Listing fields: `title`, `description`, `category`, `subcategory`, `brand`, `price`, `quantity`, `condition` (`New`, `Like New`, `Good`, `Fair`, `Used`), `location`, `phone`, `whatsapp`, `meetup_spot`, `delivery` (list), `images` (1 to 6), `negotiable` and `exchange` (true or false; the seller's "Allow Offers" and "Open to exchange" switches).

Request fields: `title`, `description`, `category`, `price` (budget), `quantity`, `condition`, `location`, `image` (optional). `expiry` is set by the server to 30 days after posting; a value sent by the browser is ignored.

Request statuses: `Open`, `Responses Received`, `Seller Selected`, `Closed`, `Expired`, `Cancelled`. Offers are refused once a request is no longer open. Requests still open when their 30 days are over become `Expired`, with a "Request taken down" notification to the owner; this is checked on page loads and every 10 minutes by the server.

## Admin: `/api/admin`

The administrator has a separate account and cookie; member sessions are never accepted here.

| Method and path | Purpose |
|---|---|
| `GET /api/admin/session` | Whether an administrator exists, whether setup is open, and whether you are signed in |
| `POST /api/admin/setup` | Create the administrator once: `{ code, email, password }` |
| `POST /api/admin/login`, `POST /api/admin/logout` | Sign in and out |
| `POST /api/admin/password` | Change the administrator password |
| `GET /api/admin/market/admin/stats` | Totals for the overview |
| `GET /api/admin/market/admin/:section` | `users`, `listings`, `requests`, `payments`, `reports`, `promotions`, `reviews`, `audit`, `settings`, `slides`; with `page` and `q` |
| `POST /api/admin/market/admin/settings` | Save limits, prices, promotion lengths, placement and payment instructions |
| `POST /api/admin/market/admin/categories` | Add or edit a category |
| `DELETE /api/admin/market/admin/categories/:id` | Delete an unused category |
| `POST /api/admin/market/admin/moderate` | `{ type, id, action, reason }`. Actions: user `warn`, `suspend`, `restore`, `verify`, `unverify`; listing `hide`, `restore`, `delete`; request `hide`, `restore`, `cancel`, `delete`; review `hide`, `restore`, `delete`; report `resolve`, `dismiss`; promotion `cancel`. The owner gets a notification (and its email) naming the item, the action and the reason |
| `POST /api/admin/market/admin/payments/:id` | Approve or reject a payment request: `{ status, note }`. Approving a Premium Listing payment also publishes its waiting listing |
| `POST /api/admin/market/admin/slides` | Add a slide: `{ kind (image, video or youtube), url (an uploaded file, or a YouTube link), mobileUrl (optional phone version: an uploaded file of the same kind; not for YouTube), title, link, order, active }`; up to 10 |
| `POST /api/admin/market/admin/slides/:id` | Change a slide: any of `{ title, link, order, active, mobileUrl }`; `mobileUrl: ''` removes the phone version |
| `DELETE /api/admin/market/admin/slides/:id` | Delete a slide |
| `POST /api/admin/market/admin/reset-code` | Issue a one-time password reset code for a member |
| `GET /api/admin/mail` | Email status: `{ service, available, connected, email, problem, since, returnAddress }`. `service` is `gmail`, `resend` or empty |
| `POST /api/admin/mail/connect` | Start connecting the Gmail account emails are sent from; returns `{ url }`, Google's permission page |
| `GET /api/admin/mail/callback` | Google returns here; saves the connection and redirects to `/admin?mail=<result>` |
| `POST /api/admin/mail/test` | Send a test email: `{ to }`, or the administrator's address when empty |
| `POST /api/admin/mail/disconnect` | Forget the connected account and cancel the permission at Google |

Approving a payment adds the slots or starts the promotion; nothing is activated before approval. Every admin action is written to the activity log.

## Database

PostgreSQL; the schema is created by the migrations in `drizzle/` and `server/migrate.ts`. Main tables: `accounts`, `sessions`, `profiles`, `listings`, `categories`, `buyer_requests`, `seller_offers`, `favorites`, `reviews`, `promotions`, `payment_requests`, `conversations`, `chat_messages`, `reports`, `notifications`, `request_drafts`, `settings`, `uploads`, `admin_auth`, `admin_sessions`, `admin_audit`, `mail_account`, `slides` (the slider), `listing_views` (recent product views, to count each visitor once a day), plus `conversation_reads` (when each member last opened each chat), `notification_emails` (which notifications were emailed) and `schema_migrations` (which `drizzle/` files have been applied). There are no order, auction, bid, wallet or withdrawal tables: those functions are outside the project's scope.

## Testing

See the Tests section of the [README](../README.md).
