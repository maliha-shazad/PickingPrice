import { Context, MarketError, pageOf } from './types';
import { bootstrap, initialize, ensureProfile, expireForUser, authenticated, one, rows, configuration, pagination } from './core';
import { migrateLegacy } from './legacy';
import { listCatalogue, detail, recordView, saveListing, deleteListing, saveRequest, deleteRequest, repostRequest, favorite, publishListing } from './catalogue';
import { requestStatus, offers, saveOffer, withdrawOffer, profile, saveProfile, review, conversation, conversationList, messageList, sendMessage, report, notificationList, readNotification, draftList, saveDraft, deleteDraft } from './workflows';
import { services, requestPayment, decidePayment } from './services';
import { adminData, saveSettings, saveCategory, deleteCategory, moderate } from './admin';
import { issueResetCode } from './password-reset';
import { publicSlides, adminSlides, saveSlide, deleteSlide } from './slides';
import { afterRequest } from './email';
export async function market(c: Context, method: string, path: string[], q: URLSearchParams, body: Record<string, unknown> = {}) {
    const result = await route(c, method, path, q, body);
    // Anything that may have created notifications (every change, and the pages that expire old items) also emails them.
    if (method !== 'GET' || ['notifications', 'services', 'me'].includes(path[0]))
        await afterRequest(c.db);
    return result;
}
async function route(c: Context, method: string, path: string[], q: URLSearchParams, body: Record<string, unknown> = {}) {
    if (body === null || typeof body !== 'object' || Array.isArray(body))
        throw new MarketError('Provide a valid form object.');
    await initialize(c.db);
    await migrateLegacy(c);
    await ensureProfile(c);
    const [area, key, sub] = path;
    if (method === 'GET') {
        if (!area || area === 'bootstrap')
            return bootstrap(c);
        if (area === 'listings' && key) {
            const item = await detail(c, area, key);
            await recordView(c, item);
            return item;
        }
        if (area === 'listings' || area === 'requests')
            return key ? detail(c, area, key) : listCatalogue(c, area, q);
        if (area === 'offers')
            return offers(c, q);
        if (area === 'profiles' && key)
            return profile(c, key, q);
        if (area === 'me') {
            const u = authenticated(c);
            await expireForUser(c);
            const p = await one(c.db, 'SELECT * FROM profiles WHERE id=?', u.userId);
            return { profile: p, settings: await configuration(c.db), counts: { listings: p?.used_slots || 0, requests: (await one(c.db, "SELECT COUNT(*) n FROM buyer_requests WHERE owner=? AND status!='Deleted'", u.userId))!.n, favorites: (await one(c.db, 'SELECT COUNT(*) n FROM favorites WHERE owner=?', u.userId))!.n } };
        }
        if (area === 'my-reviews') {
            const u = authenticated(c);
            const { page, size, offset } = pageOf(q);
            return pagination(c.db, 'SELECT r.*,p.name seller FROM reviews r JOIN profiles p ON p.id=r.seller_id WHERE r.owner=? ORDER BY r.created DESC', 'SELECT COUNT(*) n FROM reviews WHERE owner=?', [u.userId], page, size, offset);
        }
        if (area === 'favorites') {
            const u = authenticated(c);
            const { page, size, offset } = pageOf(q);
            return { items: await rows(c.db, 'SELECT listing_id FROM favorites WHERE owner=? ORDER BY created DESC LIMIT ? OFFSET ?', u.userId, size, offset), page, size, total: (await one(c.db, 'SELECT COUNT(*) n FROM favorites WHERE owner=?', u.userId))!.n };
        }
        if (area === 'conversations')
            return conversationList(c, q);
        if (area === 'drafts')
            return draftList(c);
        if (area === 'messages' && key)
            return messageList(c, key, q);
        if (area === 'notifications') {
            await expireForUser(c);
            return notificationList(c, q);
        }
        if (area === 'services') {
            await expireForUser(c);
            return services(c, q);
        }
        if (area === 'slides')
            return publicSlides(c);
        if (area === 'admin' && key === 'slides')
            return adminSlides(c);
        if (area === 'admin')
            return adminData(c, key || 'stats', q);
    }
    if (method === 'POST') {
        if (area === 'listings' && key && sub === 'publish')
            return publishListing(c, key);
        if (area === 'listings')
            return saveListing(c, body);
        if (area === 'requests' && !key)
            return saveRequest(c, body);
        if (area === 'requests' && key && sub === 'repost')
            return repostRequest(c, key);
        if (area === 'requests' && key && sub === 'status')
            return requestStatus(c, key, body);
        if (area === 'requests' && key && sub === 'offers')
            return saveOffer(c, key, body);
        if (area === 'profiles' && key && sub === 'reviews')
            return review(c, key, body);
        if (area === 'conversations')
            return conversation(c, body);
        if (area === 'drafts')
            return saveDraft(c, body);
        if (area === 'messages' && key)
            return sendMessage(c, key, body);
        if (area === 'reports')
            return report(c, body);
        if (area === 'payments')
            return requestPayment(c, body);
        if (area === 'admin' && key === 'payments' && sub)
            return decidePayment(c, sub, body);
        if (area === 'admin' && key === 'settings')
            return saveSettings(c, body);
        if (area === 'admin' && key === 'categories')
            return saveCategory(c, body);
        if (area === 'admin' && key === 'moderate')
            return moderate(c, body);
        if (area === 'admin' && key === 'reset-code')
            return issueResetCode(c, body);
        if (area === 'admin' && key === 'slides')
            return saveSlide(c, body, sub);
    }
    if (method === 'PATCH') {
        if (area === 'listings' && key)
            return saveListing(c, body, key);
        if (area === 'requests' && key)
            return saveRequest(c, body, key);
        if (area === 'offers' && key) {
            const old = await one(c.db, 'SELECT request_id FROM seller_offers WHERE id=?', key);
            if (!old)
                throw new MarketError('Offer not found.', 404);
            return saveOffer(c, old.request_id, body, key);
        }
        if (area === 'profile')
            return saveProfile(c, body);
        if (area === 'notifications' && key)
            return readNotification(c, key);
    }
    if (method === 'PUT' && area === 'favorites' && key) {
        if (typeof body.saved !== 'boolean')
            throw new MarketError('Specify saved as true or false.');
        return favorite(c, key, body.saved);
    }
    if (method === 'DELETE') {
        if (area === 'listings' && key)
            return deleteListing(c, key);
        if (area === 'requests' && key)
            return deleteRequest(c, key);
        if (area === 'offers' && key)
            return withdrawOffer(c, key);
        if (area === 'drafts' && key)
            return deleteDraft(c, key);
        if (area === 'admin' && key === 'categories' && sub)
            return deleteCategory(c, sub);
        if (area === 'admin' && key === 'slides' && sub)
            return deleteSlide(c, sub);
    }
    throw new MarketError('This action is not available.', 404);
}
