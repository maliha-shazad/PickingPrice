import { useEffect, useState, ReactNode } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, MapPin, Clock, Star, Flag } from 'lucide-react';
export type Item = Record<string, unknown>;
export type Actions = {
    open: (type: string, item?: Item) => void;
    go: (view: string) => void;
    /** Runs a change and refreshes the page; quiet leaves the success message to the caller. */
    perform: (path: string, method?: string, body?: Record<string, unknown>, quiet?: boolean) => Promise<Item | null>;
    user: Item | null;
    /** The city chosen in the header; "all" means every city. */
    location: string;
    setLocation?: (city: string) => void;
    revision: number;
    categories: Item[];
    refresh: () => void;
    /** The search that is currently applied. Each search box keeps its own typed text and only applies it on submit. */
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    /** Applies a search from either search box and asks the home page to scroll to the results. */
    submitSearch: (q: string) => void;
    searchTick: number;
    /** True once per submitted search, so only the submit scrolls and never typing or a later visit. */
    takeSearchScroll: () => boolean;
    searchCategory: string;
    setSearchCategory: (c: string) => void;
    /** Set by the admin panel: records are shown without member actions (contact, offer, report, review). */
    readOnly?: boolean;
};
let apiBase = '/api/market/';
/** The admin panel points the shared screens at its own, separately authenticated API. */
export const setApiBase = (base: string) => { apiBase = base; };
/** Ways a seller can hand an item over; also the buyer-side filter options. Must match the server's list. */
export const DELIVERY_OPTIONS = ['Same-Day Delivery', 'In-Store Pickup', 'Nationwide Delivery'];
/** True when nothing is ticked, or the product offers at least one of the ticked delivery options. */
export const offersDelivery = (product: Item, ticked: string[]) => ticked.length === 0 || ticked.some(d => Array.isArray(product.delivery) && product.delivery.includes(d));
export const money = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK');
// A seller's review score on a product card: "4.5 (3)", or "New" before the first review.
export const sellerScore = (p: Item) => { const n = Number(p.seller_reviews) || 0; return n ? Number(p.seller_rating).toFixed(1) + ' (' + n + ')' : 'New'; };
// The header's city applies to every product list. Sellers type their location freely, so the city is
// looked for inside it ("Lahore" matches "Gulberg, Lahore"). "all" shows every city.
export const inCity = (place: unknown, city: string) => !city || city === 'all' || String(place || '').toLowerCase().includes(city.toLowerCase());
// An area pill such as "F-7/F-8" matches a location that names either part.
export const inArea = (place: unknown, area: string) => !area || area.split('/').some(part => String(place || '').toLowerCase().includes(part.trim().toLowerCase()));
export const date = (s: string) => s ? new Date(s).toLocaleDateString('en-PK') : '';
export async function api(path: string, method = 'GET', body?: Record<string, unknown>) { const r = await fetch(apiBase + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, ...(body ? { body: JSON.stringify(body) } : {}) }); const d: {error?: string} & Record<string, unknown> = await r.json(); if (!r.ok)
    throw Object.assign(new Error(d.error || 'Unable to complete this action.'), { status: r.status }); return d; }
export function useLoad(path: string | null, revision = 0) {
    const [retry,setRetry]=useState(0);
    const key=JSON.stringify([path,revision,retry]);
    const [result,setResult]=useState<{key:string;path:string|null;data:Item|null;error:string}>({key:'',path:null,data:null,error:''});
    useEffect(()=>{if(!path)return;let live=true;api(path).then(data=>{if(live)setResult({key,path,data,error:''})}).catch((e:unknown)=>{if(live)setResult({key,path,data:null,error:e instanceof Error?e.message:'Unable to load this section.'})});return()=>{live=false}},[path,key]);
    return {data:path&&result.path===path?result.data:null,error:result.key===key?result.error:'',loading:!!path&&result.key!==key,retry:()=>setRetry(v=>v+1)};
}
// A whole list rather than its first page. The server hands out at most 60 rows at a time, so this asks for
// page after page. For the pages that filter and sort everything in the browser.
export function useLoadAll(path: string | null, revision = 0) {
    const [retry, setRetry] = useState(0);
    const key = JSON.stringify([path, revision, retry]);
    const [result, setResult] = useState<{ key: string; path: string | null; data: Item | null; error: string }>({ key: '', path: null, data: null, error: '' });
    useEffect(() => {
        if (!path) return;
        let live = true;
        const from = (page: number) => api(path + (path.includes('?') ? '&' : '?') + 'size=60&page=' + page);
        (async () => {
            const first = await from(1);
            const seen = new Map<string, Item>();
            for (const item of (first.items as Item[]) || []) seen.set(String(item.id), item);
            const total = Number(first.total) || 0;
            for (let page = 2; live && (page - 1) * 60 < total && page <= 25; page++) {
                const more = ((await from(page)).items as Item[]) || [];
                if (!more.length) break;
                for (const item of more) seen.set(String(item.id), item);
            }
            if (live) setResult({ key, path, data: { ...first, items: [...seen.values()], total }, error: '' });
        })().catch((e: unknown) => { if (live) setResult({ key, path, data: null, error: e instanceof Error ? e.message : 'Unable to load this section.' }); });
        return () => { live = false; };
    }, [path, key]);
    return { data: path && result.path === path ? result.data : null, error: result.key === key ? result.error : '', loading: !!path && result.key !== key, retry: () => setRetry(v => v + 1) };
}
/** Placeholder while a list loads, so neither samples nor an empty message flash before the real data arrives. */
/** The message shown after a change succeeds, worded for that change; null when nothing should be shown (opening a
 * chat, marking one notification as read). The member app and the admin panel both use it. */
export function successMessage(path: string, method: string, body?: Record<string, unknown>): string | null {
    const [area, key, sub] = path.split('?')[0].split('/');
    const m = method.toUpperCase();
    const b = body || {};
    if (area === 'favorites') return b.saved ? 'Saved to your wishlist' : 'Removed from your wishlist';
    if (area === 'conversations') return null;
    if (area === 'notifications') return key === 'all' ? 'All notifications marked as read' : null;
    if (area === 'listings') return sub === 'publish' ? 'Published as a free listing' : m === 'DELETE' ? 'Listing deleted' : key ? 'Listing updated' : 'Listing published';
    if (area === 'requests') {
        if (sub === 'offers') return 'Offer sent to the buyer';
        if (sub === 'repost') return 'Request posted again';
        if (sub === 'status') return b.status === 'Seller Selected' ? 'Seller selected. They have been told.' : b.status === 'Closed' ? 'Request closed' : b.status === 'Cancelled' ? 'Request cancelled' : 'Request updated';
        return m === 'DELETE' ? 'Request deleted' : key ? 'Request updated' : 'Request posted';
    }
    if (area === 'offers') return m === 'DELETE' ? 'Offer withdrawn' : 'Offer updated';
    if (area === 'reports') return 'Report sent. Our team will review it.';
    if (area === 'payments') return 'Payment details sent for verification';
    if (area === 'profile') return 'Profile saved';
    if (area === 'profiles' && sub === 'reviews') return 'Review posted';
    if (area === 'drafts') return m === 'DELETE' ? 'Draft deleted' : 'Draft saved';
    if (area === 'admin') {
        if (key === 'settings') return 'Settings saved';
        if (key === 'categories') return m === 'DELETE' ? 'Category deleted' : 'Category saved';
        if (key === 'reset-code') return 'Reset code created';
        if (key === 'payments') return b.status === 'Approved' ? 'Payment approved. The seller has been told.' : 'Payment rejected. The seller has been told why.';
        if (key === 'slides') return m === 'DELETE' ? 'Slide deleted' : !sub ? 'Slide added' : Object.keys(b).length === 1 && 'active' in b ? (b.active ? 'Slide shown' : 'Slide hidden') : Object.keys(b).length === 1 && 'mobileUrl' in b ? (b.mobileUrl ? 'Phone version saved' : 'Phone version removed') : 'Slide saved';
        if (key === 'moderate') {
            const done: Record<string, string> = { warn: 'Warning sent', suspend: 'Member suspended', restore: 'Restored', verify: 'Member verified', unverify: 'Verification removed', hide: 'Hidden', delete: 'Deleted', cancel: 'Cancelled', resolve: 'Report resolved', dismiss: 'Report dismissed' };
            return (done[String(b.action)] || 'Done') + '. The member has been told.';
        }
    }
    return 'Done';
}
/** A buyer request is live for 30 days. "30 days left", "1 day left", "Ends in 5 hours" or "Ended", worked out at each render so it counts down. */
export function daysLeft(expiry: unknown) {
    const ms = Date.parse(String(expiry || '')) - Date.now();
    if (!Number.isFinite(ms)) return '';
    if (ms <= 0) return 'Ended';
    if (ms < 86400000) { const h = Math.ceil(ms / 3600000); return 'Ends in ' + h + (h === 1 ? ' hour' : ' hours'); }
    const d = Math.ceil(ms / 86400000);
    return d + (d === 1 ? ' day left' : ' days left');
}
/** The days-left chip; shown only while a request is still taking offers. */
export function DaysLeft({ item }: { item: Item }) {
    const text = daysLeft(item.expiry);
    if (!text || item.sample || (item.status && !['Open', 'Responses Received'].includes(String(item.status)))) return null;
    return <span className={'pp-days-left' + (text === 'Ended' || text.startsWith('Ends in') ? ' pp-days-last' : '')}><Clock size={12} /> {text}</span>;
}
/** Five stars, filled up to the rating. */
export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
    const n = Math.max(0, Math.min(5, Math.round(rating)));
    return <span className="pp-star-row" role="img" aria-label={n + ' out of 5 stars'}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} className={i <= n ? 'on' : ''} fill={i <= n ? 'currentColor' : 'none'} />)}</span>;
}
/** One posted review, as shown on product pages and seller profiles. */
export function ReviewCard({ review, mine, onReport }: { review: Item; mine?: boolean; onReport?: () => void }) {
    const name = String(review.reviewer || 'Member'), rating = Number(review.rating) || 0;
    return (
        <article className={'pp-review-card' + (mine ? ' mine' : '')}>
            <header className="pp-review-top">
                <span className="pp-review-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                <div className="pp-review-who">
                    <strong>{name}{mine && <em>Your review</em>}</strong>
                    <span className="pp-review-rating"><StarRow rating={rating} /><b>{rating.toFixed(1)}</b></span>
                </div>
                <time className="pp-review-date">{date(review.created)}</time>
            </header>
            <p className="pp-review-text">{String(review.body || '')}</p>
            {onReport && <button type="button" className="pp-review-report" onClick={onReport}><Flag size={12} /> Report</button>}
        </article>
    );
}
/** The seller's average rating and how many reviews it is based on. */
export function ReviewSummary({ average, count }: { average: unknown; count: unknown }) {
    const n = Number(count) || 0, avg = Number(average) || 0;
    if (!n) return null;
    return (
        <div className="pp-review-summary">
            <strong className="pp-review-average">{avg.toFixed(1)}</strong>
            <div><StarRow rating={avg} size={16} /><span>Based on {n} {n === 1 ? 'review' : 'reviews'}</span></div>
        </div>
    );
}
export function ListLoading() { return <div className="loading" role="status" aria-label="Loading"><Skeleton className="h-12 w-full"/><Skeleton className="h-36 w-full"/></div>; }
export function Load({ state, children }: {
    state: ReturnType<typeof useLoad>;
    children: ReactNode;
}) { if (state.loading)
    return <ListLoading />; if (state.error)
    return <div className="error" role="alert">{state.error} <button onClick={state.retry}>Retry</button></div>; return <>{children}</>; }
export function Choice({ value, onChange, options, label }: {
    value: string;
    onChange: (v: string) => void;
    options: (string | {
        value: string;
        label: string;
    })[];
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(o => { const v = typeof o === 'string' ? o : o.value, t = typeof o === 'string' ? o : o.label; return <SelectItem key={v} value={v}>{t}</SelectItem>; })}</SelectContent></Select>; }
export function Pager({ page, total, size = 12, onChange }: {
    page: number;
    total: number;
    size?: number;
    onChange: (p: number) => void;
}) { const pages = Math.ceil(total / size); if (pages <= 1)
    return null; return <Pagination className="pager"><PaginationContent><PaginationItem><button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button></PaginationItem><PaginationItem><span aria-live="polite">Page {page} of {pages}</span></PaginationItem><PaginationItem><button className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></PaginationItem></PaginationContent></Pagination>; }
/** Makes the seller part of a product card open the seller's profile (members' listings only, not the samples). */
export function sellerProps(actions: Actions, p: Item, className: string) {
    if (!p.owner || p.sample)
        return { className };
    const open = (e: React.SyntheticEvent) => { e.stopPropagation(); actions.open('profile', { id: String(p.owner) }); };
    return { className: (className + ' pp-seller-link').trim(), role: 'button', tabIndex: 0, title: 'View seller profile', onClick: open, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } } };
}
// Above every product list: whose products are shown, following the city chosen at the top of the page.
export function CityHeading({ actions }: { actions: Actions }) {
    const city = actions.location && actions.location !== 'all' ? actions.location : 'All Pakistan';
    return <p className="pp-city-heading"><MapPin size={15} aria-hidden="true" /> {city} based products</p>;
}
// Shown where a list has nothing for the chosen city, with a way to see every city.
export function NoneInCity({ actions, what = 'products' }: { actions: Actions; what?: string }) {
    const city = actions.location;
    if (!city || city === 'all') return <div className="pp-city-empty"><strong>No {what} yet</strong></div>;
    return <div className="pp-city-empty"><MapPin size={22} /><strong>No {what} in {city} yet</strong><p>Only {city} is shown because it is the city selected at the top of the page.</p>{actions.setLocation && <button type="button" onClick={() => actions.setLocation!('all')}>Show all Pakistan</button>}</div>;
}
export function Empty({ title, text, children }: {
    title: string;
    text?: string;
    children?: ReactNode;
}) { return <div className="empty"><h3>{title}</h3>{text && <p>{text}</p>}{children}</div>; }
export function Photo({ src, alt, className = '' }: {
    src?: string;
    alt: string;
    className?: string;
}) { const [failedSource, setFailedSource] = useState<string>(); return src && failedSource!==src ? <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailedSource(src)}/> : <div role="img" aria-label={alt||'No photo'} className={'photo-placeholder ' + className}><ImageIcon /><span>No photo</span></div>; }
export function Status({ children }: {
    children: ReactNode;
}) { return <span className="status">{children}</span>; }

/**
 * For a row that scrolls sideways without a visible scrollbar (the dashboard tabs): on a desktop the mouse
 * wheel and click-and-drag move it, since there is nothing else to grab. Touch screens already swipe.
 */
export function useSideScroll<T extends HTMLElement>() {
    // A callback ref, not useRef: the row is often drawn after the first render (once its data has loaded),
    // and the listeners must be attached when it actually appears.
    const [el, setEl] = useState<T | null>(null);
    useEffect(() => {
        if (!el) return;
        const wheel = (e: WheelEvent) => {
            if (e.ctrlKey || el.scrollWidth <= el.clientWidth + 1) return;
            const before = el.scrollLeft; el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (el.scrollLeft !== before) e.preventDefault();   // only swallow the wheel while the row actually moved
        };
        let down = false, dragged = false, startX = 0, startLeft = 0;
        const press = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; dragged = false; startX = e.clientX; startLeft = el.scrollLeft; };
        const move = (e: PointerEvent) => { if (!down) return; const dx = e.clientX - startX; if (Math.abs(dx) > 5) { dragged = true; el.scrollLeft = startLeft - dx; } };
        const release = () => { down = false; };
        const click = (e: MouseEvent) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } };   // a drag is not a click on a tab
        el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('pointerdown', press); el.addEventListener('click', click, true);
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', release);
        return () => { el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', press); el.removeEventListener('click', click, true); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', release); };
    }, [el]);
    return setEl;
}
