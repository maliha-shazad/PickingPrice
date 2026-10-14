# Picking Price API Reference

Developer documentation for the HTTP API served by the Express server (`server/app.ts`). The rules behind it live in `lib/market/` and are routed in `lib/market/router.ts`.

## Conventions

- Requests and responses are JSON. Errors are `{ "error": "message" }` with a matching HTTP status: 400 invalid input, 401 not signed in, 403 not allowed, 404 not found, 409 conflict (for example a full listing allowance), 413 too large, 429 too many attempts.
- Sign-in is a server-side session held in an HttpOnly cookie. There are no tokens to send in headers.
- Every request that changes something (`POST`, `PATCH`, `PUT`, `DELETE`) must carry an `Origin` header equal to the site's own origin, otherwise it is refused with 403.
- Lists are paged with `page` (from 1) and `size` (default 12, maximum 60) and return `{ items, total, page, size, pages }`.
- Roles are `buyer`, `seller` and `both`. Seller actions need `seller` or `both`; buyer actions need `buyer` or `both`. Administrator actions are only reachable through the admin API.
- All input is validated on the server (`lib/market/validation.ts`) and all database access uses bound parameters.

## Accounts: `/api/auth`

| Method and path | Purpose |
|---|---|
| `GET /api/auth/options` | Which sign-in methods are available: `{ email, google, recovery }` |
| `POST /api/auth/signup` | Register: `{ name, email, password, role }`; signs the member in |
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
| `POST /api/files` | Upload one image (JPEG, PNG or WebP, up to 5 MB; the file's real type is checked) as the request body with its `Content-Type`; returns `{ url }`. Sign-in required |
| `GET /api/files/:key` | Serve an uploaded image |

A listing, request, offer or profile may only reference images uploaded by the same member.

## Marketplace: `/api/market`

### Reading

| Method and path | Purpose | Sign-in |
|---|---|---|
| `GET /bootstrap` | Current user, categories, unread and open-request counts | No |
| `GET /listings` | Active products. Filters: `q`, `category`, `condition`, `location`, `type` (`new` or `preloved`), `min`, `max`, `sort` (`relevance`, `newest`, `low`, `high`), `mine=1`, `saved=1` | Only for `mine` and `saved` |
| `GET /listings/:id` | One product | No |
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
| `POST /listings` | Create a product (uses one listing slot) | Seller |
| `PATCH /listings/:id` | Edit your product | Seller |
| `DELETE /listings/:id` | Remove your product and free its slot | Owner |
| `POST /requests` | Create a buyer request | Buyer |
| `PATCH /requests/:id` | Edit your active request | Buyer |
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
| `POST /payments` | Ask for extra slots or a promotion: `{ purpose: slots or promotion, quantity, duration, listingId, reference }` | Seller |
| `PATCH /notifications/:id` | Mark one notification read (`all` marks every one) | Any member |

Listing fields: `title`, `description`, `category`, `subcategory`, `brand`, `price`, `quantity`, `condition` (`New`, `Like New`, `Good`, `Fair`, `Used`), `location`, `phone`, `whatsapp`, `meetup_spot`, `delivery` (list), `images` (1 to 6), `negotiable` and `exchange` (true or false; the seller's "Allow Offers" and "Open to exchange" switches).

Request fields: `title`, `description`, `category`, `price` (budget), `quantity`, `condition`, `location`, `image` (optional), `expiry` (a future date within one year).

Request statuses: `Open`, `Responses Received`, `Seller Selected`, `Closed`, `Expired`, `Cancelled`. Offers are refused once a request is no longer open.

## Admin: `/api/admin`

The administrator has a separate account and cookie; member sessions are never accepted here.

| Method and path | Purpose |
|---|---|
| `GET /api/admin/session` | Whether an administrator exists, whether setup is open, and whether you are signed in |
| `POST /api/admin/setup` | Create the administrator once: `{ code, email, password }` |
| `POST /api/admin/login`, `POST /api/admin/logout` | Sign in and out |
| `POST /api/admin/password` | Change the administrator password |
| `GET /api/admin/market/admin/stats` | Totals for the overview |
| `GET /api/admin/market/admin/:section` | `users`, `listings`, `requests`, `payments`, `reports`, `promotions`, `reviews`, `audit`, `settings`; with `page` and `q` |
| `POST /api/admin/market/admin/settings` | Save limits, prices, promotion lengths, placement and payment instructions |
| `POST /api/admin/market/admin/categories` | Add or edit a category |
| `DELETE /api/admin/market/admin/categories/:id` | Delete an unused category |
| `POST /api/admin/market/admin/moderate` | `{ type, id, action, reason }`: warn, suspend, restore, verify, unverify (user); hide, restore (listing, request, review); resolve, dismiss (report); cancel (promotion) |
| `POST /api/admin/market/admin/payments/:id` | Approve or reject a payment request: `{ status, note }` |
| `POST /api/admin/market/admin/reset-code` | Issue a one-time password reset code for a member |
| `GET /api/admin/mail` | Email status: `{ service, available, connected, email, problem, since, returnAddress }`. `service` is `gmail`, `resend` or empty |
| `POST /api/admin/mail/connect` | Start connecting the Gmail account emails are sent from; returns `{ url }`, Google's permission page |
| `GET /api/admin/mail/callback` | Google returns here; saves the connection and redirects to `/admin?mail=<result>` |
| `POST /api/admin/mail/test` | Send a test email: `{ to }`, or the administrator's address when empty |
| `POST /api/admin/mail/disconnect` | Forget the connected account and cancel the permission at Google |

Approving a payment adds the slots or starts the promotion; nothing is activated before approval. Every admin action is written to the activity log.

## Database

PostgreSQL; the schema is created by the migrations in `drizzle/` and `server/migrate.ts`. Main tables: `accounts`, `sessions`, `profiles`, `listings`, `categories`, `buyer_requests`, `seller_offers`, `favorites`, `reviews`, `promotions`, `payment_requests`, `conversations`, `chat_messages`, `reports`, `notifications`, `request_drafts`, `settings`, `uploads`, `admin_auth`, `admin_sessions`, `admin_audit`, `mail_account`, plus `conversation_reads` (when each member last opened each chat), `notification_emails` (which notifications were emailed) and `schema_migrations` (which `drizzle/` files have been applied). There are no order, auction, bid, wallet or withdrawal tables: those functions are outside the project's scope.

## Testing

See the Tests section of the [README](../README.md).
