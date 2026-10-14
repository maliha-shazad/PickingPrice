import { useEffect, useState, ReactNode } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, MapPin } from 'lucide-react';
export type Item = Record<string, unknown>;
export type Actions = {
    open: (type: string, item?: Item) => void;
    go: (view: string) => void;
    perform: (path: string, method?: string, body?: Record<string, unknown>) => Promise<Item | null>;
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
export function Load({ state, children }: {
    state: ReturnType<typeof useLoad>;
    children: ReactNode;
}) { if (state.loading)
    return <div className="loading" role="status" aria-label="Loading"><Skeleton className="h-12 w-full"/><Skeleton className="h-36 w-full"/></div>; if (state.error)
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
