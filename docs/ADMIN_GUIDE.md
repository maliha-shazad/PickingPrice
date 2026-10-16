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

The left side of the panel (a grid of cards on tablets and phones) shows live totals: Members, Listings, Open requests, Payments to verify, Open reports and Active Premium. Pressing a card opens its tab. Payments to verify and Open reports are the two that need you: when they are not zero the card is marked **Needs attention** and the tab shows the number.

The sections are tabs across the top. Each has a search box that searches that section, and long lists are split into pages.

| Tab | What it lists | What you can do |
|---|---|---|
| Members | Every account | View profile, manage, issue a reset code |
| Listings | Every product | View, hide, restore or delete |
| Requests | Every buyer request, with the date it was posted and the date it expires (requests run 30 days) | View, hide, restore, cancel or delete |
| Payments | Slot and promotion payment requests | Approve or reject |
| Reports | Reports sent by members | Inspect, resolve or dismiss |
| Promotions | Premium Listings (promotions) | Cancel an active one |
| Reviews | Seller reviews | Hide, restore or delete |
| Activity log | Every admin action, with time and target | Read only |
| Settings | Limits, prices, promotions, payment instructions, email, categories | Edit |

## 3. Members

- **Profile** opens the member's public profile: listings, rating and reviews.
- **Manage** applies one action. A reason is required; the member gets a notification and an email that name the action and include your reason (for example "Your account was suspended … Reason: …"). The form says what the chosen action will do before you apply it, and **Cancel** closes it without doing anything.

  | Action | Effect |
  |---|---|
  | warn | Sends the member your message; nothing else changes |
  | suspend | Blocks the account, signs the member out everywhere and hides their content from others |
  | restore | Lifts a suspension |
  | verify | Shows the Verified badge on the member's profile and products |
  | unverify | Removes the badge |

- **Reset password** issues a one-time code for a member who cannot reset their password by email (an account registered with a phone number, or an email that did not arrive). Members normally do this themselves: the Forgot Password page emails them a code. Confirm who they are first, then give them your code. They enter it through "Already have a code from support?" on the Forgot Password page. The code works once, lasts 60 minutes, and issuing a new one cancels the old one.

## 4. Listings and requests

**View** shows the item as members see it. **Moderate** offers these actions; each needs a reason, and the owner gets a notification and an email naming the item, what was done and your reason:

| Action | Listings | Requests | Effect |
|---|---|---|---|
| Hide | Yes | Yes | It disappears from the site; only its owner still sees it. Nothing is deleted |
| Restore | Yes | Yes | Shows a hidden item again |
| Cancel | | Yes | Closes the request; sellers with an open offer are told and their offers are closed |
| Delete | Yes | Yes | Removes it for good. A deleted listing frees the seller's slot and ends any Premium Listing; for a request, sellers with an open offer are told |

**Delete** (and **Suspend** for members) asks you to press a second time before it is applied. **Cancel** at the bottom of the form closes it without doing anything.

## 5. Payments

Sellers pay outside the site and then submit a request with their payment details, either for extra listing slots or to promote a product (also as a Premium Listing chosen on the Sell Now page).

1. Open **Payments**. Each row shows the price and what was paid; a payment below the price is marked *short*. Pending requests have a **Verify** button.
2. **Verify** shows the price due next to what the seller entered: amount paid (green when it matches, orange when it is more, red when it is less), how they paid, the sender's name and account or wallet number, the date, the transaction ID and the receipt screenshot (press it to open it full size).
3. Find the transfer in your bank or wallet account and check that the amount, sender and transaction ID match the receipt.
4. Choose **Approved** or **Rejected** and save. A rejection needs a reason.

On approval the extra slots are added to the seller's allowance, or the promotion starts, and the seller is notified. A listing that was waiting for its Premium Listing payment goes live at the same moment. On rejection nothing changes and the seller is told why; a waiting Premium Listing stays unpublished until the seller pays again or publishes it without the Spotlight. Never approve before you have seen the money.

Requests sent before payment details were asked for show only the reference.

## 6. Slider

**Slider** controls the banner on the home page (Discover), just above Explore Categories. Until you add the first slide, the site shows its own three sample banners (about selling, buyer requests and Premium Listings); your first slide replaces them all.

1. Choose **Image upload** (JPEG, PNG or WebP up to 10 MB), **Video upload** (MP4 or WebM up to 50 MB; it plays muted) or **YouTube link**.

   **Sizes, so nothing is cut off.** The slide has the shape 16 : 5 on computers and tablets (about 1140 × 356 on a laptop screen) and 2 : 1 on phones (about 360 × 180).

   | File | Size | Shown on |
   |---|---|---|
   | Image or video | **1920 × 600** (or 1600 × 500) | Computers and tablets, whole |
   | Phone version (optional, same kind) | **1080 × 540** | Phones (up to 600 px wide), whole |

   Add the phone version under **Phone version** in the same form. Without one, phones show the wide file with its left and right sides trimmed (only the middle 1200 × 600 of a 1920 × 600 file shows), so then keep text and buttons in the middle. Short videos (up to about 15 seconds) loop best. A YouTube video is shown 16 : 9 inside the slide, so its top and bottom are trimmed on computers; YouTube slides have no phone version.
2. Optionally add a title (shown on the slide) and a link: a page of the site starting with `/` (for example `/#brandnew`) or an `https://` address.
3. Press **Add slide**. Up to 10 slides in total, images and videos mixed in any order. On a slide already added, **Upload phone version**, **Replace** or **Remove** changes its phone version.

Each slide can be switched between **Shown** and **Hidden**, given a new title, link or position (lower numbers come first) with **Save**, or deleted (it asks once more). Images change every 6 seconds and videos every 15; visitors can also press the dots, swipe with a finger on phones, or drag with the mouse. Adding, changing and deleting slides appears in the Activity log.

## 7. Reports

Members can report a listing, a request, a chat message, a review, another member, or a general problem with the site.

1. Open **Reports**. Each row shows the reason and what was reported.
2. **Inspect** shows the full report and the reported item.
3. Act on the item if needed (hide the listing, hide the review, warn or suspend the member) from its own tab.
4. **Resolve** the report, or **dismiss** it if no action was needed, with a short note. The member who reported is notified.

## 8. Promotions and reviews

- **Promotions** lists every promotion with its start and end dates. **Cancel** stops an active one early. Promotions end on their own at the end date.
- **Reviews** lists every review with its rating and text. **Moderate** hides a review that breaks the rules, restores it, or deletes it for good. A hidden or deleted review no longer counts in the seller's rating, and the reviewer is told why.

## 9. Settings

Open **Settings**, change what you need and press **Save Configurations**.

| Setting | Meaning | Default |
|---|---|---|
| Free slots per user | Listings every seller can have without paying | 10 |
| Price per extra slot | Rupees for each additional slot | 50 |
| Promotion 1, 2, 3 price | Rupees for each of the three promotions | 150, 350, 700 |
| Promotion 1, 2, 3 length | Days each promotion runs. The three must be different. 1 day is shown to sellers as "24 hours" | 1, 3, 7 |
| Where promoted products appear | First in the lists with a Premium badge, or in normal order with the badge only | First in the lists |
| Payment Instructions | The bank or mobile wallet details sellers must pay to | Empty |

**Payment Instructions must be filled in before sellers can request slots or promotions.** Until then the request form tells sellers that payment details have not been added.

Changes apply immediately. Slots and promotions already granted are not changed.

### Categories

Below the settings is the category list.

- **Add** a category with its name and a comma-separated list of sub-categories.
- **Edit** renames it, changes its sub-categories or switches it off. Renaming also updates the products and requests that use it. A switched-off category can no longer be chosen for new items.
- **Delete** removes a category that nothing uses. If products or requests still use it, the panel tells you how many and asks you to switch it off instead.
- Two categories cannot have the same name.

## 10. Activity log

Every administrator action is recorded with what was done, what it was done to, and when: settings changes, category changes, moderation, payment decisions, reset codes, password changes, and connecting or disconnecting the email account. Use it to check what happened and when.

## 11. Email

Members are emailed from a Gmail account that you connect once: a welcome email when they sign up, password reset codes, a notice when their password is changed, and copies of their notifications. Members always receive notifications inside the site whether or not email is working.

### Connect the Gmail account

1. Open **Settings** and scroll to **Email**.
2. Press **Connect Gmail** and sign in with the Gmail address the emails should come from.
3. Google shows a warning that the app is not verified, because it is your own. Choose **Advanced**, continue, tick **Send email on your behalf** and confirm. The site can send from that account; it cannot read the mailbox.
4. Back in the panel, press **Send test email**. It goes to your admin email unless you type another address. Check that it arrives (look in the spam folder too).

### What the Email section shows

| Message | Meaning | What to do |
|---|---|---|
| Green: "Sending from ..." | Email is working | Nothing |
| Yellow: "No Gmail account is connected" | Nothing is emailed | Press **Connect Gmail** |
| Red: "Google no longer accepts the connection" | The permission was removed, has expired, or the Gmail password was changed. Nothing is emailed | Press **Connect again** |
| Grey: "Email is switched off" | The server has no `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` | Follow [AUTH_SETUP.md](../AUTH_SETUP.md) |

**Connect a different account** replaces the sending address. **Disconnect** removes it and cancels the permission at Google; no email is sent afterwards. While email is not working, members who forget their password are told to contact support, and you issue them a code from the Members tab.

A Gmail account can send about 500 emails a day. The one-time server setup in Google Cloud is described in [AUTH_SETUP.md](../AUTH_SETUP.md).

## 12. Routine

- **Daily**: check Payments and Reports until both show nothing pending.
- **Weekly**: skim new Listings and Reviews for anything that breaks the rules; read the Activity log.
- **After installing or moving the site**: enter the payment instructions, connect the Gmail account and send a test email, check the categories, and confirm sign-up, listing a product with a photo, and a test payment request all work.
- **Backups**: back up the PostgreSQL database and the uploads folder together; one without the other is incomplete.

## 13. About the technology

Picking Price is a web application. The pages are built with React 19.2.6 (Vite 8.0.13), the server runs on Node.js 24 with Express 5.2.1, and all data is kept in a PostgreSQL 18 database on Railway. "Continue with Google" uses Google OAuth 2.0, and emails are sent through the Gmail API. The full list of components and versions is in the project's README.
