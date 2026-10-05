import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records',{id:text('id').primaryKey(),kind:text('kind').notNull(),owner:text('owner').notNull(),target:text('target').notNull().default(''),data:text('data').notNull(),created:text('created').notNull()},t=>[index('records_kind').on(t.kind),index('records_owner').on(t.owner),index('records_target').on(t.target)]);

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  googleSub: text('google_sub').unique(),
  role: text('role').notNull().default('buyer'),
  created: text('created').notNull(),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  accountId: text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),
  expires: text('expires').notNull(),
},t=>[index('sessions_account').on(t.accountId),index('sessions_expires').on(t.expires)]);
export const authAttempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  count: text('count').notNull(),
  expires: text('expires').notNull(),
});
export const oauthStates = sqliteTable('oauth_states', {
  stateHash: text('state_hash').primaryKey(),
  verifier: text('verifier').notNull(),
  expires: text('expires').notNull(),
});

// Relational marketplace entities. Legacy records remain available for data migration.
import { integer } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
 id:text('id').primaryKey(), name:text('name').notNull(), role:text('role').notNull().default('buyer'),
 location:text('location').notNull().default(''), bio:text('bio').notNull().default(''), avatar:text('avatar').notNull().default(''),
 phone:text('phone').notNull().default(''), whatsapp:text('whatsapp').notNull().default(''), meetupSpot:text('meetup_spot').notNull().default(''),
 verified:integer('verified').notNull().default(0), suspended:integer('suspended').notNull().default(0),
 extraSlots:integer('extra_slots').notNull().default(0),usedSlots:integer('used_slots').notNull().default(0),slotToken:text('slot_token').notNull().default(''),
 created:text('created').notNull(),
});
export const categories = sqliteTable('categories',{id:text('id').primaryKey(),name:text('name').notNull().unique(),subcategories:text('subcategories').notNull().default('[]'),active:integer('active').notNull().default(1)});
export const listings = sqliteTable('listings',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),title:text('title').notNull(),description:text('description').notNull(),
 category:text('category').notNull(),subcategory:text('subcategory').notNull().default(''),brand:text('brand').notNull().default(''),
 price:integer('price').notNull(),quantity:integer('quantity').notNull(),condition:text('condition').notNull(),location:text('location').notNull(),phone:text('phone').notNull().default(''),whatsapp:text('whatsapp').notNull().default(''),meetupSpot:text('meetup_spot').notNull().default(''),images:text('images').notNull().default('[]'),status:text('status').notNull().default('Active'),deleteToken:text('delete_token').notNull().default(''),created:text('created').notNull(),updated:text('updated').notNull(),
},t=>[index('listings_public').on(t.status,t.created),index('listings_owner').on(t.owner,t.status),index('listings_category').on(t.category,t.price)]);
export const requests = sqliteTable('buyer_requests',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),title:text('title').notNull(),description:text('description').notNull(),category:text('category').notNull(),price:integer('price').notNull(),quantity:integer('quantity').notNull(),condition:text('condition').notNull(),location:text('location').notNull(),image:text('image').notNull().default(''),expiry:text('expiry').notNull(),status:text('status').notNull().default('Open'),selectedOffer:text('selected_offer'),created:text('created').notNull(),updated:text('updated').notNull(),
},t=>[index('requests_owner').on(t.owner),index('requests_discovery').on(t.status,t.category,t.price),index('requests_expiry').on(t.expiry)]);
export const offers = sqliteTable('seller_offers',{
 id:text('id').primaryKey(),requestId:text('request_id').notNull(),owner:text('owner').notNull(),price:integer('price').notNull(),description:text('description').notNull(),image:text('image').notNull().default(''),status:text('status').notNull().default('Pending'),created:text('created').notNull(),updated:text('updated').notNull(),
},t=>[index('offers_request').on(t.requestId),index('offers_owner').on(t.owner)]);
export const favorites = sqliteTable('favorites',{id:text('id').primaryKey(),owner:text('owner').notNull(),listingId:text('listing_id').notNull(),created:text('created').notNull()},t=>[index('favorites_owner').on(t.owner)]);
export const conversations = sqliteTable('conversations',{id:text('id').primaryKey(),firstUser:text('first_user').notNull(),secondUser:text('second_user').notNull(),contextType:text('context_type').notNull(),contextId:text('context_id').notNull(),title:text('title').notNull(),updated:text('updated').notNull()},t=>[index('conversations_first').on(t.firstUser,t.updated),index('conversations_second').on(t.secondUser,t.updated)]);
export const messages = sqliteTable('chat_messages',{id:text('id').primaryKey(),conversationId:text('conversation_id').notNull(),owner:text('owner').notNull(),body:text('body').notNull(),created:text('created').notNull()},t=>[index('messages_conversation').on(t.conversationId,t.created)]);
export const reviews = sqliteTable('reviews',{id:text('id').primaryKey(),owner:text('owner').notNull(),sellerId:text('seller_id').notNull(),rating:integer('rating').notNull(),body:text('body').notNull(),hidden:integer('hidden').notNull().default(0),created:text('created').notNull()},t=>[index('reviews_seller').on(t.sellerId,t.hidden)]);
export const payments = sqliteTable('payment_requests',{id:text('id').primaryKey(),owner:text('owner').notNull(),purpose:text('purpose').notNull(),quantity:integer('quantity').notNull(),duration:integer('duration').notNull().default(0),listingId:text('listing_id').notNull().default(''),amount:integer('amount').notNull(),reference:text('reference').notNull(),status:text('status').notNull().default('Pending'),note:text('note').notNull().default(''),approvalToken:text('approval_token').notNull().default(''),created:text('created').notNull(),verifiedAt:text('verified_at'),verifiedBy:text('verified_by')},t=>[index('payments_owner').on(t.owner,t.created),index('payments_status').on(t.status)]);
export const promotions = sqliteTable('promotions',{id:text('id').primaryKey(),owner:text('owner').notNull(),listingId:text('listing_id').notNull(),starts:text('starts').notNull(),expires:text('expires').notNull(),status:text('status').notNull().default('Active')},t=>[index('promotions_listing').on(t.listingId,t.status,t.expires),index('promotions_owner').on(t.owner)]);
export const reports = sqliteTable('reports',{id:text('id').primaryKey(),owner:text('owner').notNull(),targetType:text('target_type').notNull(),targetId:text('target_id').notNull(),reason:text('reason').notNull(),status:text('status').notNull().default('Open'),resolution:text('resolution').notNull().default(''),created:text('created').notNull()},t=>[index('reports_status').on(t.status)]);
export const notifications = sqliteTable('notifications',{id:text('id').primaryKey(),owner:text('owner').notNull(),title:text('title').notNull(),body:text('body').notNull(),linkType:text('link_type').notNull().default(''),linkId:text('link_id').notNull().default(''),read:integer('read').notNull().default(0),created:text('created').notNull()},t=>[index('notifications_owner').on(t.owner,t.read,t.created)]);
export const settings = sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const uploads = sqliteTable('uploads',{id:text('id').primaryKey(),owner:text('owner').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),created:text('created').notNull()},t=>[index('uploads_owner').on(t.owner)]);
export const audit = sqliteTable('admin_audit',{id:text('id').primaryKey(),owner:text('owner').notNull(),action:text('action').notNull(),target:text('target').notNull(),created:text('created').notNull()});
export const emailTokens = sqliteTable('email_tokens',{hash:text('hash').primaryKey(),accountId:text('account_id').notNull(),purpose:text('purpose').notNull(),expires:text('expires').notNull()});
