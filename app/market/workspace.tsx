import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Bell, ChevronDown, Plus, LogOut, Home, Tag, Grid3x3, ShoppingBag, Heart, MessageCircle, User, ArrowUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Toaster, toast } from 'sonner';
import { Actions, Item, api, useLoad, Load, successMessage } from './ui';
import { Catalogue } from './catalogue';
import { Dashboard, SellerServices } from './dashboard';
import { RequestDetail, ProfileDetail } from './details';
import { ItemForm, OfferForm, ReportForm, PaymentForm } from './forms';
import { Messages, Conversation, Notifications } from './communication';
import { InfoContent, infoTitle, type InfoTopic } from './info';
import { EnableRole } from './enable-selling';
import { Homepage } from './homepage';
import { ProductPage } from './product-page';
import { PreLoved } from './preloved';
import { BrandNew } from './brandnew';
import { PostRequest } from './post-request';
import { BuyerDashboard } from './buyer-dashboard';
import { MyRequests } from './my-requests';
import { SellNow } from './sell-now';
import { AllCategories } from './all-categories';

const protectedViews = ['Saved', 'Messages', 'Notifications', 'Dashboard', 'Services', 'PostRequest', 'SellNow'];
// Every page that has an address of its own ("/#name").
const VIEWS = ['Explore', 'Requests', 'Saved', 'Dashboard', 'Messages', 'Notifications', 'Services', 'PreLoved', 'BrandNew', 'AllCategories', 'PostRequest', 'SellNow', 'BuyerRequests'];

const LOCATIONS = ['Peshawar', 'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan', 'Abbottabad', 'Quetta'];

export default function Workspace() {
    const [view, setView] = useState('Explore');
    const [revision, setRevision] = useState(0);
    const [modal, setModal] = useState<{ type: string; item: Item } | null>(null);
    const [activeProduct, setActiveProduct] = useState<Item | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);

    // Header state
    const [searchQ, setSearchQ] = useState('');          // the applied search
    const [headerSearch, setHeaderSearch] = useState(''); // text typed in the header box, applied only on submit
    const [searchTick, setSearchTick] = useState(0);
    const searchScroll = useRef(false);
    const [searchCategory, setSearchCategory] = useState('all');
    const [location, setLocation] = useState('all'); // All Pakistan until the visitor picks a city
    const [locationOpen, setLocationOpen] = useState(false);
    const [mode, setMode] = useState<'Buying' | 'Selling'>('Buying');
    const locationRef = useRef<HTMLDivElement>(null);

    // The city the visitor chose stays chosen on this device.
    const chooseLocation = (city: string) => { setLocation(city); try { localStorage.setItem('pp_location', city); } catch { } };
    useEffect(() => { try { const saved = localStorage.getItem('pp_location'); if (saved) setLocation(saved); } catch { } }, []);

    // Detect the visitor's city once, only when a Google Maps key is built in (without one the lookup cannot work).
    useEffect(() => {
        const detected = localStorage.getItem('pp_location_detected');
        if (process.env.GOOGLE_MAPS_KEY && !detected && !localStorage.getItem('pp_location') && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_KEY || ''}`);
                        const data = await res.json();

                        let city = null;
                        if (data.results && data.results.length > 0) {
                            const components = data.results[0].address_components;
                            const cityObj = components.find((c: any) => c.types.includes('locality')) ||
                                            components.find((c: any) => c.types.includes('administrative_area_level_2'));
                            if (cityObj) {
                                city = cityObj.long_name;
                            }
                        }

                        if (city && !localStorage.getItem('pp_location')) {
                            setLocation(city);
                        }
                        localStorage.setItem('pp_location_detected', 'true');
                    } catch {
                        // ignore
                    }
                },
                () => {
                    localStorage.setItem('pp_location_detected', 'true');
                },
                { timeout: 10000 }
            );
        }
    }, []);

    // Close location dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
                setLocationOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ---- Browser history ----
    // Each page the visitor goes to is one history entry holding what is needed to show it again (the page,
    // its product or draft, and how far it was scrolled). A popup adds one entry of its own, so Back closes
    // the popup first and then returns to the previous page.
    type Place = { id?: string; view: string; product?: Item | null; draft?: Item | null; scroll?: number; modal?: boolean; stale?: boolean };
    const placeRef = useRef<Place>({ view: 'Explore' });
    const modalOpen = useRef(false);
    const onUsedPopupEntry = useRef(false);
    const newId = () => Math.random().toString(36).slice(2, 10);
    const placeFromUrl = (): Place => {
        const path = window.location.pathname, hash = window.location.hash.replace('#', '').toLowerCase();
        if (path.startsWith('/product/')) return { view: 'Product' };
        if (path === '/request-form') return { view: 'PostRequest' };
        return { view: VIEWS.find(v => v.toLowerCase() === hash) || 'Explore' };
    };
    const writeHistory = (method: 'pushState' | 'replaceState', place: Place, url?: string) => {
        // A product or draft that cannot be stored is simply fetched again when the visitor comes back.
        try { window.history[method](place, '', url); } catch { window.history[method]({ ...place, product: null, draft: null }, '', url); }
    };
    const rememberScroll = () => { if (window.history.state?.view) writeHistory('replaceState', { ...window.history.state, scroll: window.scrollY }); };
    const pushPlace = (place: Place, url: string) => {
        const next = { ...place, id: newId() };
        // Leaving a popup for another page replaces the popup's entry, so Back goes to the page underneath.
        if (window.history.state?.modal) writeHistory('replaceState', next, url);
        else { rememberScroll(); writeHistory('pushState', next, url); }
        placeRef.current = next; onUsedPopupEntry.current = false;
    };
    const restoreScroll = (y: number) => {
        let tries = 0;
        const step = () => { window.scrollTo(0, y); if (Math.abs(window.scrollY - y) > 2 && ++tries < 40) setTimeout(step, 50); };
        requestAnimationFrame(step);
    };
    const showPlace = (place: Place) => {
        placeRef.current = place; onUsedPopupEntry.current = !!place.modal;
        if (place.view === 'Product') {
            if (place.product) setActiveProduct(place.product);
            else { const id = window.location.pathname.match(/^\/product\/(.+)$/)?.[1]; if (id) api('listings/' + id).then((d: any) => { if (d && !d.error) setActiveProduct(d); }).catch(() => { }); }
        }
        else if (place.view === 'SellNow') setActiveProduct(place.product || {});
        else if (place.view === 'PostRequest') { setRequestDraft(place.draft || null); setRequestKey(k => k + 1); }
        setView(place.view); setModal(null);
        restoreScroll(Number(place.scroll) || 0);
    };
    useEffect(() => {
        try { window.history.scrollRestoration = 'manual'; } catch { }
        const onPop = (e: PopStateEvent) => {
            const place: Place = e.state?.view ? e.state : placeFromUrl();
            if (modalOpen.current) {
                // Back with a popup open: close it, and stay on the page it was opened from.
                modalOpen.current = false; setModal(null);
                if (place.id && place.id === placeRef.current.id) return;
            }
            else if (onUsedPopupEntry.current && place.id && place.id === placeRef.current.id && !place.modal) {
                // The entry just left belonged to a popup that was already closed on the page, so this
                // press changed nothing on screen: go one step further back.
                onUsedPopupEntry.current = false; window.history.back(); return;
            }
            showPlace(place);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);
    useEffect(() => {
        const st = window.history.state || {};
        if (modal) {
            if (!st.modal) { rememberScroll(); writeHistory('pushState', { ...placeRef.current, modal: true }); }
            else if (st.stale) writeHistory('replaceState', { ...st, stale: false });
            onUsedPopupEntry.current = false;
        }
        else if (st.modal && !st.stale) { writeHistory('replaceState', { ...st, stale: true }); onUsedPopupEntry.current = true; }
        modalOpen.current = !!modal;
    }, [modal]);

    // Handle shared product links and view hash
    useEffect(() => {
        // A reload keeps the entry's own record; a first visit gets one from the address.
        const known = window.history.state?.view ? window.history.state as Place : null;
        placeRef.current = known ? { ...known, modal: false, stale: false } : { ...placeFromUrl(), id: newId() };
        if (!known) writeHistory('replaceState', placeRef.current);
        else if (known.view === 'Product' && known.product) {
            // Keep the product's own address even when the page was reached through "/?product=...".
            setActiveProduct(known.product); setView('Product');
            if (!window.location.pathname.startsWith('/product/')) writeHistory('replaceState', placeRef.current, '/product/' + known.product.id);
            return;
        }
        else if (known.view === 'SellNow' && known.product) setActiveProduct(known.product);
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('product');
        if (productId) {
            api('listings/' + productId)
                .then((d: any) => {
                    if (d && !d.error) {
                        setActiveProduct(d);
                        setView('Product');
                        setModal(null);
                        placeRef.current = { id: placeRef.current.id || newId(), view: 'Product', product: d };
                        writeHistory('replaceState', placeRef.current, '/product/' + productId);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                })
                .catch(() => {});
        } else if (window.location.pathname === '/request-form') {
            setView('PostRequest');
        } else if (window.location.hash) {
            const hash = window.location.hash.replace('#', '');
            const mappedView = VIEWS.find(v => v.toLowerCase() === hash.toLowerCase());
            if (mappedView) setView(mappedView);
        }
    }, []);

    const boot = useLoad('bootstrap', revision);
    const user = boot.data?.user || null;
    const refresh = () => setRevision(v => v + 1);

    // One rule for every page that needs an account: a signed-out visitor goes to the login page
    // and is brought back to the page they asked for. `boot.data` is null until we know who they are.
    const signedOut = !!boot.data && !user;
    const viewPath = (v: string) => v === 'Explore' ? '/' : v === 'PostRequest' ? '/request-form' : '/#' + v.toLowerCase();
    const here = () => window.location.pathname + window.location.search + window.location.hash;
    const requireLogin = (next: string) => { window.location.href = '/login?next=' + encodeURIComponent(next); };
    useEffect(() => {
        if (signedOut && protectedViews.includes(view)) requireLogin(viewPath(view));
    }, [signedOut, view]);

    // Members registered for buying only can buy and post requests. Sell Now and the selling side of the
    // dashboard stay closed until they choose an account type that includes selling. In the same way,
    // members registered for selling only cannot post a buyer request until their account includes buying.
    const buyingOnly = user?.role === 'buyer', sellingOnly = user?.role === 'seller';
    const [afterSwitch, setAfterSwitch] = useState<'' | 'sell' | 'request'>('');
    const askToEnableSelling = () => setModal({ type: 'enable-selling', item: {} });
    const askToEnableBuying = () => setModal({ type: 'enable-buying', item: {} });
    useEffect(() => {
        const home = () => { setView('Explore'); placeRef.current = { id: placeRef.current.id || newId(), view: 'Explore' }; writeHistory('replaceState', placeRef.current, '/'); };
        if (buyingOnly && view === 'SellNow') { home(); askToEnableSelling(); }
        if (sellingOnly && view === 'PostRequest') { home(); askToEnableBuying(); }
    }, [buyingOnly, sellingOnly, view]);
    // A draft being continued on the Post a Request page (null for a new request).
    const [requestDraft, setRequestDraft] = useState<Item | null>(null);
    const [requestKey, setRequestKey] = useState(0);
    const switchMode = (next: 'Buying' | 'Selling') => {
        if (next === 'Selling' && buyingOnly) return askToEnableSelling();
        setMode(next);
        // Remembered for this member on this device, so a reload keeps the side they chose.
        try { if (user?.id) window.localStorage.setItem('pp-mode:' + user.id, next); } catch { }
    };

    // The Buying/Selling toggle starts on the side the member registered for; it is theirs to switch afterwards.
    // A member who both buys and sells comes back to the side they last switched to.
    useEffect(() => {
        let saved = '';
        try { saved = (user?.id && window.localStorage.getItem('pp-mode:' + user.id)) || ''; } catch { }
        const next = user?.role === 'both' && (saved === 'Selling' || saved === 'Buying') ? saved : user?.role === 'seller' ? 'Selling' : 'Buying';
        setMode(next);
    }, [user?.id, user?.role]);

    const open = (type: string, item: Item = {}) => {
        if (type === 'listing') {
            // Opened with only an id (from a chat or a notification): fetch the product first, so the page
            // shows that product and not its placeholder text.
            if (item.id && !item.title && !item.sample) {
                api('listings/' + item.id).then((d: any) => { if (d && !d.error) open('listing', d); else toast.error('This product is no longer available.'); }).catch(() => toast.error('This product is no longer available.'));
                return;
            }
            setActiveProduct(item);
            setView('Product');
            setModal(null);
            pushPlace({ view: 'Product', product: item }, '/product/' + item.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (type === 'drafts') {
            // The Draft Requests section of the buyer dashboard.
            setMode('Buying'); setView('Dashboard'); setModal(null);
            pushPlace({ view: 'Dashboard' }, viewPath('Dashboard'));
            let tries = 0; const find = () => { const el = document.getElementById('bd-drafts'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' }); else if (++tries < 25) setTimeout(find, 120); }; setTimeout(find, 120);
            return;
        }

        if (type === 'request-form' && !item?.id) {
            if (signedOut) return requireLogin(viewPath('PostRequest'));
            if (sellingOnly) return askToEnableBuying();
            setRequestDraft((item.draft as Item) || null); setRequestKey(k => k + 1);
            setView('PostRequest');
            setModal(null);
            pushPlace({ view: 'PostRequest', draft: (item.draft as Item) || null }, '/request-form');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (type === 'listing-form') {
            if (signedOut) return requireLogin(viewPath('SellNow'));
            if (buyingOnly) return askToEnableSelling();
            setActiveProduct(item);
            setView('SellNow');
            setModal(null);
            pushPlace({ view: 'SellNow', product: item }, viewPath('SellNow'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (type === 'login' || (!user && ['offer-form', 'payment', 'report', 'conversation'].includes(type))) {
            requireLogin(here());
            return;
        }
        setModal({ type, item });
    };

    const go = (next: string) => {
        if (signedOut && protectedViews.includes(next)) {
            requireLogin(viewPath(next));
            return;
        }
        if (next === 'SellNow' && buyingOnly) return askToEnableSelling();
        if (next === 'PostRequest' && sellingOnly) return askToEnableBuying();
        // Choosing the page that is already open only goes back to its top; it adds nothing to Back.
        if (next === placeRef.current.view && next === view && !window.history.state?.modal) { setModal(null); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        setView(next);
        setModal(null);
        pushPlace({ view: next }, viewPath(next));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const perform = async (path: string, method = 'POST', body?: Record<string, unknown>, quiet = false) => {
        try {
            const d = await api(path, method, body);
            refresh();
            const msg = successMessage(path, method, body);
            if (!quiet && msg) toast.success(msg);
            return d;
        } catch (e: unknown) {
            const err = e as { message?: string; status?: number };
            if (err.status === 401) requireLogin(here());
            else toast.error(err.message);
            return null;
        }
    };

    // Only a submitted search is applied and scrolled to; typing in either search box changes nothing else.
    const submitSearch = (q: string) => {
        setSearchQ(q.trim());
        searchScroll.current = true;
        setSearchTick(t => t + 1);
        if (view !== 'Explore') go('Explore');
    };
    const takeSearchScroll = () => { const pendingScroll = searchScroll.current; searchScroll.current = false; return pendingScroll; };
    useEffect(() => { if (!searchQ) setHeaderSearch(''); }, [searchQ]);

    const actions: Actions = { open, go, perform, user, location, setLocation: chooseLocation, revision, categories: boot.data?.categories || [], refresh, searchQuery: searchQ, setSearchQuery: setSearchQ, submitSearch, searchTick, takeSearchScroll, searchCategory, setSearchCategory };

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        if (q.has('auth_error')) {
            // Each reason the server gives (server/app.ts, Google callback) gets its own explanation.
            const reasons: Record<string, string> = {
                google_not_configured: 'Google sign-in is not configured yet.',
                existing_email: 'This email already has a Picking Price account made with a password. Log in with your email and password instead.',
                cancelled: 'Google sign-in was cancelled or took too long. Please try again.',
                invalid_state: 'Google sign-in took too long or was opened in another tab. Please try again.',
                unverified: 'Your Google account email is not verified, so it cannot be used to sign in.',
                google_failed: 'Google did not accept the sign-in. Please try again in a moment.',
                unavailable: 'Google could not be reached just now. Please try again in a moment.',
            };
            toast.error(reasons[q.get('auth_error') || ''] || 'Google sign-in could not be completed. Try email sign-in.');
            history.replaceState({}, '', window.location.pathname);
        }
        if (q.has('welcome')) {
            toast.success('Welcome to Picking Price');
            history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    async function logout() {
        try {
            const r = await fetch('/api/auth/logout', { method: 'POST' });
            if (!r.ok) throw Error();
            setView('Explore');
            pushPlace({ view: 'Explore' }, '/');
            refresh();
            toast.success('Signed out');
        } catch {
            toast.error('Sign-out failed. Try again.');
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        submitSearch(headerSearch);
    };


    const title: Record<string, string> = {
        'listing': 'Product details', 'request': 'Buyer request', 'profile': 'Member profile',
        'listing-form': modal?.item.id ? 'Edit listing' : 'Create a listing',
        'request-form': modal?.item.id ? 'Edit request' : 'Post a request',
        'offer-form': 'Your offer', 'payment': modal?.item.defer ? 'Premium Listing' : modal?.item.id ? 'Promote your listing' : 'Request extra listings', 'enable-selling': 'Selling is not switched on', 'enable-buying': 'Buying is not switched on',
        'report': 'Report a concern', 'conversation': 'Conversation',
        'safety': infoTitle.safety, 'info': infoTitle[modal?.item.topic as InfoTopic] || 'Picking Price'
    };
    const item = modal?.item || {};
    const close = () => setModal(null);
    // Once the new account type is saved and the account has reloaded, carry on to where the member was going.
    useEffect(() => {
        if (!afterSwitch || !user) return;
        if (afterSwitch === 'sell' && user.role !== 'buyer') { setAfterSwitch(''); open('listing-form'); }
        if (afterSwitch === 'request' && user.role !== 'seller') { setAfterSwitch(''); open('request-form'); }
    }, [afterSwitch, user?.role]);
    // The bell's count (unread notifications) and the Messages tab's count (unread chat messages). They come
    // with the page and are then asked for every 15 seconds, and when the member comes back to the tab, so a
    // new notification or message shows without a reload. A fresh page load (after any change) starts over.
    const [liveCounts, setLiveCounts] = useState<{ notifications: number; messages: number } | null>(null);
    useEffect(() => { setLiveCounts(null); }, [boot.data]);
    useEffect(() => {
        if (!user?.id) return;
        let live = true;
        const check = () => {
            if (document.visibilityState !== 'visible') return;
            api('counts').then(d => { if (live) setLiveCounts({ notifications: Number(d.notifications) || 0, messages: Number(d.messages) || 0 }); }).catch(() => { });
        };
        const timer = setInterval(check, 15000);
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', check);
        return () => { live = false; clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
    }, [user?.id]);
    // Counts arrive as text from PostgreSQL, so "0" must not be treated as something to show.
    const unread = liveCounts ? liveCounts.notifications : Number(boot.data?.unread) || 0;
    const unreadMessages = liveCounts ? liveCounts.messages : Number(boot.data?.messages) || 0;
    const messageBadge = unreadMessages > 0 && (
        <span className="pp-msg-badge" aria-label={unreadMessages + (unreadMessages === 1 ? ' unread message' : ' unread messages')}>{unreadMessages > 99 ? '99+' : unreadMessages}</span>
    );
    // Back to top: shown at the bottom right once the page has been scrolled down a screen or so.
    const [showTop, setShowTop] = useState(false);
    useEffect(() => {
        const onScroll = () => setShowTop(window.scrollY > 600);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    const mobileSell = (
        <button id="mobile-sell-btn" className="pp-mobile-pill sell" onClick={() => open('listing-form')}>
            <Plus size={14} /> Sell Now
        </button>
    );
    const mobileRequest = (
        <button id="mobile-request-btn" className="pp-mobile-pill request" onClick={() => open('request-form')}>
            <Plus size={14} /> Post a Request
        </button>
    );

    return (
        <>
            <Toaster position="bottom-right" richColors />


            {/* ── MAIN HEADER ── */}
            <header className="pp-header">
                <div className="pp-header-inner">

                    {/* Logo */}
                    <button className="pp-logo" onClick={() => go('Explore')} aria-label="Picking Price home" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                        <img src="/new-logo.png" alt="Picking Price" style={{ height: '36px', width: 'auto', display: 'block' }} />
                    </button>

                    {/* Search Bar */}
                    <form className="pp-search-form" onSubmit={handleSearch} role="search">
                        <div className="pp-search-inner">
                            <Search size={16} className="pp-search-icon" />
                            <input
                                id="header-search"
                                className="pp-search-input"
                                type="search"
                                placeholder="Search products or active buyer requests..."
                                value={headerSearch}
                                onChange={e => setHeaderSearch(e.target.value)}
                                aria-label="Search products or buyer requests"
                            />
                        </div>
                        <button type="submit" className="pp-search-btn" id="header-search-btn">Search</button>
                    </form>

                    {/* Grouping right elements to push them to the far right */}
                    <div className="pp-header-right">
                        {/* Location Picker */}
                        <div className={`pp-location-wrap${signedOut ? ' signed-out' : ''}`} ref={locationRef}>
                            <button
                                className="pp-location-btn"
                                onClick={() => setLocationOpen(v => !v)}
                                aria-label={'Location: ' + (location === 'all' ? 'All Pakistan' : location)}
                                title={location === 'all' ? 'All Pakistan' : location}
                                id="header-location-btn"
                            >
                                <MapPin size={14} className="pp-loc-icon" />
                                <span className="pp-loc-text">{location === 'all' ? 'All Pakistan' : location}</span>
                                <ChevronDown size={13} className={`pp-loc-caret${locationOpen ? ' open' : ''}`} />
                            </button>
                            {locationOpen && (
                                <div className="pp-location-dropdown" role="listbox" aria-label="Select city">
                                    <button className={`pp-loc-option${location === 'all' ? ' selected' : ''}`} role="option" aria-selected={location === 'all'} onClick={() => { chooseLocation('all'); setLocationOpen(false); }}>
                                        <MapPin size={12} /> All Pakistan
                                    </button>
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc}
                                            className={`pp-loc-option${location === loc ? ' selected' : ''}`}
                                            role="option"
                                            aria-selected={location === loc}
                                            onClick={() => { chooseLocation(loc); setLocationOpen(false); }}
                                        >
                                            <MapPin size={12} /> {loc}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Buying / Selling tabs: members only */}
                        {user && <div className="pp-mode-tabs" role="group" aria-label="Marketplace mode">
                            <button
                                id="mode-buying-btn"
                                className={`pp-mode-tab${mode === 'Buying' ? ' active' : ''}`}
                                onClick={() => switchMode('Buying')}
                            >
                                Buying
                            </button>
                            <button
                                id="mode-selling-btn"
                                className={`pp-mode-tab${mode === 'Selling' ? ' active' : ''}`}
                                onClick={() => switchMode('Selling')}
                            >
                                Selling
                            </button>
                        </div>}

                        {/* Bell notification: members only */}
                        {user && <button
                            id="header-notifications-btn"
                            className="pp-bell-btn"
                            aria-label="Notifications"
                            onClick={() => go('Notifications')}
                        >
                            <Bell size={18} />
                            {unread > 0 && (
                                <span className="pp-bell-badge" aria-label={unread + ' unread notifications'}>{unread > 99 ? '99+' : unread}</span>
                            )}
                        </button>}

                        {/* Auth / Account actions */}
                        <div className="pp-header-auth">
                            {/* Desktop only (hidden on phones in styles.css): Sell Now comes before the account buttons. */}
                            <button id="header-sell-btn" className="pp-sell-btn" onClick={() => open('listing-form')}>
                                <Plus size={15} /> Sell Now
                            </button>
                            {!user ? (
                                <>
                                    <button id="header-login-btn" className="pp-login-btn" onClick={() => window.location.href = '/login'}>Login</button>
                                    <button id="header-signup-btn" className="pp-signup-btn" onClick={() => window.location.href = '/signup'}>Signup</button>
                                </>
                            ) : (
                                <>
                                    <button id="header-account-btn" className="pp-account-btn" onClick={() => go('Dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                <User size={16} />
                                            </div>
                                        )}
                                        <span className="pp-account-name">{user.name}</span>
                                    </button>
                                    <button id="header-logout-btn" className="pp-icon-btn" aria-label="Sign out" onClick={logout}>
                                        <LogOut size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Phones only (see styles.css). Signed out: tagline on the left, then Post a Request and Sell Now
                    at the far right. Signed in: Sell Now and Post a Request on the left, Wishlist and Messages on the
                    right. Hidden until we know which, so nothing jumps sideways after the page loads. */}
                <div className="pp-mobile-row" style={boot.data ? undefined : { visibility: 'hidden' }}>
                    {signedOut && <div className="pp-mobile-tagline">Buy Smart. Sell Easy. Find What You Need.</div>}
                    <div className="pp-mobile-group">
                        {user && mobileSell}
                        {mobileRequest}
                        {!user && mobileSell}
                    </div>
                    {user && (
                        <div className="pp-mobile-group">
                            <button id="mobile-saved-btn" className={`pp-mobile-link${view === 'Saved' ? ' active' : ''}`} aria-label="Wishlist" onClick={() => go('Saved')}>
                                <Heart size={15} /> <span>Wishlist</span>
                            </button>
                            <button id="mobile-messages-btn" className={`pp-mobile-link${view === 'Messages' ? ' active' : ''}`} aria-label="Messages" onClick={() => go('Messages')}>
                                <MessageCircle size={15} /> <span>Messages</span>{messageBadge}
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ── CATEGORY NAV BAR ── */}
            <nav className="pp-category-nav" aria-label="Category navigation">
                <div className="pp-category-nav-inner">
                    {/* All Categories comes first */}
                    <button
                        id="nav-all-categories-btn"
                        className="pp-cat-nav-item pp-cat-all"
                        onClick={() => go('AllCategories')}
                    >
                        <Grid3x3 size={14} /> All Categories
                    </button>

                    {/* Discover (home) */}
                    <button
                        id="nav-discover-btn"
                        className={`pp-cat-nav-item pp-cat-discover${view === 'Explore' ? ' active' : ''}`}
                        onClick={() => go('Explore')}
                    >
                        <Home size={14} /> Discover
                    </button>

                    {/* Requests */}
                    <button
                        id="nav-requests-btn"
                        className={`pp-cat-nav-item${view === 'Requests' ? ' active' : ''}`}
                        onClick={() => go('Requests')}
                    >
                        <ShoppingBag size={14} /> Requests
                    </button>

                    {/* Brand New */}
                    <button
                        id="nav-brandnew-btn"
                        className={`pp-cat-nav-item${view === 'BrandNew' ? ' active' : ''}`}
                        onClick={() => go('BrandNew')}
                    >
                        <Tag size={14} /> New Products
                    </button>

                    {/* Pre-Loved */}
                    <button
                        id="nav-preloved-btn"
                        className={`pp-cat-nav-item${view === 'PreLoved' ? ' active' : ''}`}
                        onClick={() => go('PreLoved')}
                    >
                        <Heart size={14} /> Pre-Loved
                    </button>

                    {/* Right-side nav items (only shown when logged in) */}
                    {user && (
                        <div className="pp-nav-right">
                            <button
                                id="nav-saved-btn"
                                className={`pp-cat-nav-item${view === 'Saved' ? ' active' : ''}`}
                                onClick={() => go('Saved')}
                            >
                                <Heart size={14} /> Wishlist
                            </button>
                            <button
                                id="nav-messages-btn"
                                className={`pp-cat-nav-item${view === 'Messages' ? ' active' : ''}`}
                                onClick={() => go('Messages')}
                            >
                                <MessageCircle size={14} /> Messages{messageBadge}
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── PAGE CONTENT ── */}
            {/* Top of the product pages: the admin's slider, then promoted products (each shown only when it has something) */}
            {view === 'Explore' && <Homepage actions={actions} />}
            {view === 'PreLoved' && <PreLoved actions={actions} />}
            {view === 'BrandNew' && <BrandNew actions={actions} />}
            {view === 'PostRequest' && <PostRequest key={requestKey} actions={actions} draft={requestDraft} />}
            {view === 'BuyerRequests' && <MyRequests actions={actions} />}
            {view === 'AllCategories' && <AllCategories actions={actions} />}
            <main className={`market-main${(view === 'Explore' || view === 'PreLoved' || view === 'BrandNew' || view === 'PostRequest' || view === 'BuyerRequests' || view === 'SellNow' || view === 'AllCategories') ? ' hidden' : ''}${view === 'Dashboard' ? ' is-dashboard' : ''}`}>
                <Load state={{ ...boot, loading: boot.loading && !boot.data }}>
                    {view === 'Requests' && <Catalogue kind="requests" actions={actions} />}
                    {view === 'Product' && activeProduct && <ProductPage item={activeProduct} actions={actions} />}
                    {view === 'Saved' && <Catalogue saved actions={actions} />}
                    {view === 'Dashboard' && user && (mode === 'Buying' ? <BuyerDashboard actions={actions} setMode={switchMode} /> : <Dashboard actions={actions} setMode={switchMode} />)}
                    {view === 'Messages' && user && <Messages actions={actions} />}
                    {view === 'Notifications' && user && <Notifications actions={actions} />}
                    {view === 'Services' && user && <SellerServices actions={actions} />}
                </Load>
            </main>
            {view === 'SellNow' && <SellNow actions={actions} initialItem={activeProduct} />}

            {/* Global Footer */}
            <footer className="hp-footer">
                <div className="hp-footer-inner">
                    <div className="hp-footer-brand">
                        <a href="/" aria-label="Picking Price home" onClick={e => { e.preventDefault(); go('Explore'); }}><img src="/footer-logo.png" alt="Picking Price" style={{ width: '200px', height: 'auto', display: 'block', mixBlendMode: 'screen', marginBottom: '12px' }} /></a>
                        <p>Pakistan's trusted marketplace for new and pre-loved products. Buy smart, sell easy, or post a request and let sellers find you.</p>
                        <div className="hp-footer-social">
                            <a aria-label="Facebook" title="Facebook" href="https://www.facebook.com/profile.php?id=61594982798852" target="_blank" rel="noopener noreferrer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                            </a>
                            <a aria-label="Instagram" title="Instagram" href="https://www.instagram.com/picking_price" target="_blank" rel="noopener noreferrer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            </a>
                            <a aria-label="X" title="X" href="https://x.com/Pickingprice" target="_blank" rel="noopener noreferrer">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </a>
                            <a aria-label="Email us on Gmail" title="pickingprice@gmail.com" href="mailto:pickingprice@gmail.com">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                            </a>
                        </div>
                    </div>
                    <div className="hp-footer-col">
                        <h4>Marketplace</h4>
                        <button onClick={() => go('Explore')}>Browse Products</button>
                        <button onClick={() => go('AllCategories')}>All Categories</button>
                        <button onClick={() => go('Requests')}>Buyer Requests</button>
                        <button onClick={() => open('listing-form')}>Sell a Product</button>
                        <button onClick={() => open('request-form')}>Post a Request</button>
                    </div>
                    <div className="hp-footer-col">
                        <h4>My Account</h4>
                        <button onClick={() => go('Dashboard')}>Dashboard</button>
                        <button onClick={() => go('Saved')}>Wishlist</button>
                        <button onClick={() => go('Messages')}>Messages</button>
                        <button onClick={() => window.location.href = '/login'}>Login</button>
                        <button onClick={() => window.location.href = '/signup'}>Register</button>
                    </div>
                    <div className="hp-footer-col">
                        <h4>Support</h4>
                        <button onClick={() => open('info', { topic: 'help' })}>Help Center</button>
                        <button onClick={() => open('info', { topic: 'safety' })}>Safety Tips</button>
                        <button onClick={() => open('info', { topic: 'contact' })}>Contact Us</button>
                        <button onClick={() => open('report')}>Report a Problem</button>
                    </div>
                    <div className="hp-footer-col">
                        <h4>Company</h4>
                        <button onClick={() => open('info', { topic: 'about' })}>About Us</button>
                        <button onClick={() => open('info', { topic: 'careers' })}>Careers</button>
                        <button onClick={() => open('info', { topic: 'privacy' })}>Privacy Policy</button>
                        <button onClick={() => open('info', { topic: 'terms' })}>Terms of Service</button>
                    </div>
                </div>
                <div className="hp-footer-bottom">
                    <span>© 2026 PickingPrice. All rights reserved.</span>
                    <span>Buy Smart. Sell Easy. Find What You Need.</span>
                </div>
            </footer>

            {showTop && (
                <button id="back-to-top" className="pp-back-top" aria-label="Back to top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <ArrowUp size={20} />
                </button>
            )}

            {/* ── MODALS ── */}
            <Dialog open={!!modal && modal.type !== 'confirm'} onOpenChange={o => !o && close()}>
                <DialogContent className={'market-modal ' + (['request', 'profile', 'info', 'safety'].includes(modal?.type || '') ? 'wide-modal' : modal?.type === 'conversation' ? 'chat-modal' : '')}>
                    <DialogTitle className={modal?.type === 'request' ? 'sr-only' : ''}>
                        {modal?.type === 'request' ? 'Request Details' : title[modal?.type || ''] || 'Community & safety'}
                    </DialogTitle>
                    <DialogDescription>
                        {['request', 'info', 'safety', 'payment', 'enable-selling', 'enable-buying', 'conversation', 'profile'].includes(modal?.type || '') ? '' : 'Picking Price connects buyers and sellers directly.'}
                    </DialogDescription>
                    {/* Listing modal removed, now rendered as a page */}
                    {modal?.type === 'request' && <RequestDetail item={item} actions={actions} />}
                    {modal?.type === 'profile' && <ProfileDetail item={item} actions={actions} />}
                    {modal?.type === 'listing-form' && <ItemForm key={item.id || 'new'} kind="listings" item={item} actions={actions} done={close} />}
                    {modal?.type === 'request-form' && <ItemForm key={item.id || 'new'} kind="requests" item={item} actions={actions} done={close} />}
                    {modal?.type === 'offer-form' && <OfferForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'payment' && <PaymentForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'enable-selling' && <EnableRole need="selling" actions={actions} cancel={close} done={() => { close(); setAfterSwitch('sell'); }} />}
                    {modal?.type === 'enable-buying' && <EnableRole need="buying" actions={actions} cancel={close} done={() => { close(); setAfterSwitch('request'); }} />}
                    {modal?.type === 'report' && <ReportForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'conversation' && <Conversation actions={actions} id={item.id} />}
                    {(modal?.type === 'info' || modal?.type === 'safety') && <InfoContent topic={modal.type === 'safety' ? 'safety' : (item.topic as InfoTopic)} actions={actions} />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={modal?.type === 'confirm'} onOpenChange={o => !o && !confirmBusy && close()}>
                <AlertDialogContent>
                    <AlertDialogTitle>{item.title}</AlertDialogTitle>
                    <AlertDialogDescription>{item.text}</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={confirmBusy}>Keep as is</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={confirmBusy}
                            onClick={async (e) => {
                                e.preventDefault();
                                setConfirmBusy(true);
                                const r = await perform(item.path, item.method || 'POST', item.body);
                                setConfirmBusy(false);
                                if (r) close();
                            }}
                        >
                            {confirmBusy ? 'Saving…' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
