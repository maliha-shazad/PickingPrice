# Picking Price Administrator Guide

This guide is for the person who runs a Picking Price site. Installing the software is covered in [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) and account security in [AUTH_SETUP.md](../AUTH_SETUP.md).

## 1. The admin panel

The admin panel is a separate page at `/admin` (for example `https://your-site/admin`). It has its own sign-in and nothing in the marketplace links to it. There is exactly one administrator, and it is not a member account: signing in to the marketplace never gives administrator rights.

### Create the administrator (once)

1. Set the secret `ADMIN_SETUP_CODE` on the server (16 characters or more).
2. Open `/admin`. The panel shows the setup form.
3. Enter the setup code, the email address and a password of 12 to 128 characters.

After that the code stops working and can be removed from the server settings.

### Sign in, password and sign out

- Sign in at `/admin` with the administrator email and password. A session lasts 12 hours.
- **Change password** (top of the panel) sets a new password and signs out every other admin session.
- **Sign out** ends the session on this device.
- There is no forgotten-password option for the administrator. If the password is lost, someone with database access must delete the row in the `admin_auth` table and run setup again.

## 2. Overview

The left side of the panel shows live totals: Users, Listings, open Requests, pending Payments, open Reports and active Promotions. Pending payments and open reports are the two numbers that need action.

The sections are tabs across the top. Each has a search box that searches that section, and long lists are split into pages.

| Tab | What it lists | What you can do |
|---|---|---|
| Members | Every account | View profile, manage, issue a reset code |
| Listings | Every product | View, hide or restore |
| Requests | Every buyer request | View, hide or restore |
| Payments | Slot and promotion payment requests | Approve or reject |
| Reports | Reports sent by members | Inspect, resolve or dismiss |
| Promotions | Featured promotions | Cancel an active one |
| Reviews | Seller reviews | Hide or restore |
| Activity log | Every admin action, with time and target | Read only |
| Settings | Limits, prices, promotions, payment instructions, categories | Edit |

## 3. Members

- **Profile** opens the member's public profile: listings, rating and reviews.
- **Manage** applies one action. A reason is required and is sent to the member as a notification.

  | Action | Effect |
  |---|---|
  | warn | Sends the member your message; nothing else changes |
  | suspend | Blocks the account, signs the member out everywhere and hides their content from others |
  | restore | Lifts a suspension |
  | verify | Shows the Verified badge on the member's profile and products |
  | unverify | Removes the badge |

- **Reset password** issues a one-time code for a member who forgot their password. Confirm who they are first, then give them the code. They enter it with their email and a new password on the Forgot Password page. The code works once, lasts 60 minutes, and issuing a new one cancels the old one.

## 4. Listings and requests

**View** shows the item as members see it. **Moderate** lets you **hide** it (it disappears from the site; the owner is told why) or **restore** it. Hiding does not delete anything.

## 5. Payments

Sellers pay outside the site and then submit a request with their payment reference, either for extra listing slots or to promote a product.

1. Open **Payments**. Pending requests have a **Verify** button.
2. Check in your bank or wallet account that the amount shown really arrived with that reference.
3. Choose **Approved** or **Rejected** and save. A rejection needs a reason.

On approval the extra slots are added to the seller's allowance, or the promotion starts, and the seller is notified. On rejection nothing changes and the seller is told why. Never approve before you have seen the money.

## 6. Reports

Members can report a listing, a request, a chat message, a review, another member, or a general problem with the site.

1. Open **Reports**. Each row shows the reason and what was reported.
2. **Inspect** shows the full report and the reported item.
3. Act on the item if needed (hide the listing, hide the review, warn or suspend the member) from its own tab.
4. **Resolve** the report, or **dismiss** it if no action was needed, with a short note. The member who reported is notified.

## 7. Promotions and reviews

- **Promotions** lists every promotion with its start and end dates. **Cancel** stops an active one early. Promotions end on their own at the end date.
- **Reviews** lists every review with its rating and text. **Moderate** hides a review that breaks the rules, or restores it. A hidden review no longer counts in the seller's rating.

## 8. Settings

Open **Settings**, change what you need and press **Save Configurations**.

| Setting | Meaning | Default |
|---|---|---|
| Free slots per user | Listings every seller can have without paying | 10 |
| Price per extra slot | Rupees for each additional slot | 50 |
| Promotion 1, 2, 3 price | Rupees for each of the three promotions | 150, 350, 700 |
| Promotion 1, 2, 3 length | Days each promotion runs. The three must be different. 1 day is shown to sellers as "24 hours" | 1, 3, 7 |
| Where promoted products appear | First in the lists with a Featured badge, or in normal order with the badge only | First in the lists |
| Payment Instructions | The bank or mobile wallet details sellers must pay to | Empty |

**Payment Instructions must be filled in before sellers can request slots or promotions.** Until then the request form tells sellers that payment details have not been added.

Changes apply immediately. Slots and promotions already granted are not changed.

### Categories

Below the settings is the category list.

- **Add** a category with its name and a comma-separated list of sub-categories.
- **Edit** renames it, changes its sub-categories or switches it off. Renaming also updates the products and requests that use it. A switched-off category can no longer be chosen for new items.
- **Delete** removes a category that nothing uses. If products or requests still use it, the panel tells you how many and asks you to switch it off instead.
- Two categories cannot have the same name.

## 9. Activity log

Every administrator action is recorded with what was done, what it was done to, and when: settings changes, category changes, moderation, payment decisions, reset codes and password changes. Use it to check what happened and when.

## 10. Notification emails (optional)

Members always receive notifications inside the site. To also send them by email, set `RESEND_API_KEY` on the server, and `EMAIL_FROM` with a sender on a domain verified in Resend. Details are in [AUTH_SETUP.md](../AUTH_SETUP.md).

## 11. Routine

- **Daily**: check Payments and Reports until both show nothing pending.
- **Weekly**: skim new Listings and Reviews for anything that breaks the rules; read the Activity log.
- **After installing or moving the site**: enter the payment instructions, check the categories, and confirm sign-up, listing a product with a photo, and a test payment request all work.
- **Backups**: back up the PostgreSQL database and the uploads folder together; one without the other is incomplete.
