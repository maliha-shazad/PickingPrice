'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Bell, ChevronDown, Plus, LogOut, Home, Tag, Grid3x3, ShoppingBag, Heart, MessageCircle, User } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Toaster, toast } from 'sonner';
import AuthDialog from '../auth-dialog';
import { Actions, Item, api, useLoad, Load } from './ui';
import { Catalogue } from './catalogue';
import { Dashboard, SellerServices } from './dashboard';
import { ListingDetail, RequestDetail, ProfileDetail } from './details';
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

const LOCATIONS = ['Peshawar', 'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan', 'Abbottabad', 'Quetta'];
const CATEGORY_NAV = ['Clothes', 'Electronics', 'Furniture', 'Sports', 'Books', 'Cameras', 'Automobiles', 'Kitchen', 'Jewelry', 'Kids', 'Art', 'Accessories'];

export default function Workspace() {
    const [view, setView] = useState('Explore');
    const [revision, setRevision] = useState(0);
    const [modal, setModal] = useState<{ type: string; item: Item } | null>(null);
    const [auth, setAuth] = useState('');
    const [activeProduct, setActiveProduct] = useState<Item | null>(null);
    const [pending, setPending] = useState<{ type: string; item: Item } | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [workspaceEnabled, setWorkspaceEnabled] = useState(false);

    // Header state
    const [searchQ, setSearchQ] = useState('');          // the applied search
    const [headerSearch, setHeaderSearch] = useState(''); // text typed in the header box, applied only on submit
    const [searchTick, setSearchTick] = useState(0);
    const searchScroll = useRef(false);
    const [searchCategory, setSearchCategory] = useState('all');
    const [location, setLocation] = useState('Peshawar');
    const [locationOpen, setLocationOpen] = useState(false);
    const [mode, setMode] = useState<'Buying' | 'Selling'>('Buying');
    const [modeToggle, setModeToggle] = useState(false); // toggle switch
    const locationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/auth/options')
            .then(r => r.json() as Promise<{ workspace?: boolean }>)
            .then(d => setWorkspaceEnabled(d.workspace === true))
            .catch(() => { });
    }, []);

    // Auto-detect live location once
    useEffect(() => {
        const detected = localStorage.getItem('pp_location_detected');
        if (!detected && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`);
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
                        
                        if (city) {
                            setLocation(city);
                        }
                        localStorage.setItem('pp_location_detected', 'true');
                    } catch (e) {
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

    // Handle shared product links and view hash
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('product');
        if (productId) {
            api('listings/' + productId)
                .then((d: any) => {
                    if (d && !d.error) {
                        setActiveProduct(d);
                        setView('Product');
                        setModal(null);
                        window.history.replaceState({}, '', '/product/' + productId);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                })
                .catch(() => {});
        } else if (window.location.pathname === '/request-form') {
            setView('PostRequest');
        } else if (window.location.hash) {
            const hash = window.location.hash.replace('#', '');
            const mappedView = [ 'Explore', 'Requests', 'Saved', 'Dashboard', 'Messages', 'Notifications', 'Services', 'PreLoved', 'BrandNew', 'AllCategories', 'PostRequest', 'SellNow', 'BuyerRequests' ]
                .find(v => v.toLowerCase() === hash.toLowerCase());
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
        if (buyingOnly && view === 'SellNow') { setView('Explore'); window.history.replaceState({}, '', '/'); askToEnableSelling(); }
        if (sellingOnly && view === 'PostRequest') { setView('Explore'); window.history.replaceState({}, '', '/'); askToEnableBuying(); }
    }, [buyingOnly, sellingOnly, view]);
    // A draft being continued on the Post a Request page (null for a new request).
    const [requestDraft, setRequestDraft] = useState<Item | null>(null);
    const [requestKey, setRequestKey] = useState(0);
    const switchMode = (next: 'Buying' | 'Selling') => {
        if (next === 'Selling' && buyingOnly) return askToEnableSelling();
        setMode(next); setModeToggle(next === 'Selling');
    };

    // The Buying/Selling toggle starts on the side the member registered for; it is theirs to switch afterwards.
    useEffect(() => {
        setMode(user?.role === 'seller' ? 'Selling' : 'Buying');
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
            window.history.pushState({}, '', '/product/' + item.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (type === 'drafts') {
            // The Draft Requests section of the buyer dashboard.
            setMode('Buying'); setModeToggle(false); setView('Dashboard'); setModal(null);
            window.history.pushState({}, '', '#dashboard');
            let tries = 0; const find = () => { const el = document.getElementById('bd-drafts'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' }); else if (++tries < 25) setTimeout(find, 120); }; setTimeout(find, 120);
            return;
        }

        if (type === 'request-form' && !item?.id) {
            if (signedOut) return requireLogin(viewPath('PostRequest'));
            if (sellingOnly) return askToEnableBuying();
            setRequestDraft((item.draft as Item) || null); setRequestKey(k => k + 1);
            setView('PostRequest');
            setModal(null);
            window.history.pushState({}, '', '/request-form');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (type === 'listing-form') {
            if (signedOut) return requireLogin(viewPath('SellNow'));
            if (buyingOnly) return askToEnableSelling();
            setActiveProduct(item);
            setView('SellNow');
            setModal(null);
            window.history.pushState({}, '', viewPath('SellNow'));
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
        setView(next);
        setModal(null);
        window.history.pushState({}, '', next === 'Explore' ? '/' : '#' + next.toLowerCase());
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const perform = async (path: string, method = 'POST', body?: Record<string, unknown>) => {
        try {
            const d = await api(path, method, body);
            refresh();
            const isFav = path.startsWith('favorites/');
            const msg = isFav ? (body?.saved ? 'Saved successfully' : 'Removed successfully') : method === 'DELETE' ? 'Removed successfully' : 'Saved successfully';
            toast.success(msg);
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

    const actions: Actions = { open, go, perform, user, location, revision, categories: boot.data?.categories || [], refresh, searchQuery: searchQ, setSearchQuery: setSearchQ, submitSearch, searchTick, takeSearchScroll, searchCategory, setSearchCategory };

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        if (q.has('auth_error')) {
            toast.error(q.get('auth_error') === 'google_not_configured'
                ? 'Google sign-in is not configured yet.'
                : 'Google sign-in could not be completed. Try email sign-in.');
            setTimeout(() => setAuth('login'), 0);
            history.replaceState({}, '', location.pathname);
        }
        if (q.has('welcome')) {
            toast.success('Welcome to Picking Price');
            history.replaceState({}, '', location.pathname);
        }
    }, []);

    useEffect(() => {
        const context = (document as { modelContext?: { registerTool?: (tool: unknown, opts: unknown) => unknown } }).modelContext;
        if (!context?.registerTool) return;
        const controller = new AbortController();
        Promise.resolve(context.registerTool({
            name: 'open_marketplace_section',
            description: 'Navigate to an existing marketplace section.',
            inputSchema: { type: 'object', properties: { section: { type: 'string', enum: ['Explore', 'Requests', 'Saved', 'Messages', 'Notifications', 'Dashboard'] } }, required: ['section'], additionalProperties: false },
            annotations: { readOnlyHint: true },
            execute: (v: { section: string }) => {
                if (!['Explore', 'Requests', 'Saved', 'Messages', 'Notifications', 'Dashboard'].includes(v.section)) throw Error('Invalid section');
                if (protectedViews.includes(v.section) && !user) throw Error('Sign in first');
                setView(v.section); setModal(null); return { section: v.section };
            }
        }, { signal: controller.signal })).catch(() => { });
        return () => controller.abort();
    }, [user]);

    async function logout() {
        try {
            const r = await fetch('/api/auth/logout', { method: 'POST' });
            if (!r.ok) throw Error();
            setView('Explore');
            window.history.pushState({}, '', '/');
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

    const handleModeToggle = () => switchMode(mode === 'Buying' ? 'Selling' : 'Buying');

    const title: Record<string, string> = {
        'listing': 'Product details', 'request': 'Buyer request', 'profile': 'Member profile',
        'listing-form': modal?.item.id ? 'Edit listing' : 'Create a listing',
        'request-form': modal?.item.id ? 'Edit request' : 'Post a request',
        'offer-form': 'Your offer', 'payment': modal?.item.id ? 'Promote your listing' : 'Request extra listings', 'enable-selling': 'Selling is not switched on', 'enable-buying': 'Buying is not switched on',
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
    // Counts arrive as text from PostgreSQL, so "0" must not be treated as something to show.
    const unread = Number(boot.data?.unread) || 0, openRequests = Number(boot.data?.openRequests) || 0;
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
                                aria-label={'Location: ' + location}
                                title={location}
                                id="header-location-btn"
                            >
                                <MapPin size={14} className="pp-loc-icon" />
                                <span className="pp-loc-text">{location}</span>
                                <ChevronDown size={13} className={`pp-loc-caret${locationOpen ? ' open' : ''}`} />
                            </button>
                            {locationOpen && (
                                <div className="pp-location-dropdown" role="listbox" aria-label="Select city">
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc}
                                            className={`pp-loc-option${location === loc ? ' selected' : ''}`}
                                            role="option"
                                            aria-selected={location === loc}
                                            onClick={() => { setLocation(loc); setLocationOpen(false); }}
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

                        {/* Bell notification */}
                        <button
                            id="header-notifications-btn"
                            className="pp-bell-btn"
                            aria-label="Notifications"
                            onClick={() => go('Notifications')}
                        >
                            <Bell size={18} />
                            {unread > 0 && (
                                <span className="pp-bell-badge" aria-label={unread + ' unread notifications'}>{unread > 99 ? '99+' : unread}</span>
                            )}
                        </button>

                        {/* Auth / Account actions */}
                        <div className="pp-header-auth">
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
                            <button id="header-sell-btn" className="pp-sell-btn" onClick={() => open('listing-form')}>
                                <Plus size={15} /> Sell Now
                            </button>
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
                                <MessageCircle size={15} /> <span>Messages</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ── CATEGORY NAV BAR ── */}
            <nav className="pp-category-nav" aria-label="Category navigation">
                <div className="pp-category-nav-inner">
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
                        {openRequests > 0 && <span className="pp-nav-badge" aria-label={openRequests + ' open requests'}>{openRequests > 99 ? '99+' : openRequests}</span>}
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

                    {/* All Categories */}
                    <button
                        id="nav-all-categories-btn"
                        className="pp-cat-nav-item pp-cat-all"
                        onClick={() => go('AllCategories')}
                    >
                        <Grid3x3 size={14} /> All Categories
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
                                <MessageCircle size={14} /> Messages
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── PAGE CONTENT ── */}
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
                        <img src="/footer-logo.png" alt="Picking Price" style={{ width: '200px', height: 'auto', display: 'block', mixBlendMode: 'screen', marginBottom: '12px' }} />
                        <p>Pakistan's trusted marketplace for new and pre-loved products. Buy smart, sell easy, or post a request and let sellers find you.</p>
                        <div className="hp-footer-social">
                            <button aria-label="Facebook" onClick={() => window.open('https://www.facebook.com/', '_blank', 'noopener,noreferrer')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                            </button>
                            <button aria-label="Instagram" onClick={() => window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            </button>
                            <button aria-label="Twitter" onClick={() => window.open('https://x.com/', '_blank', 'noopener,noreferrer')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                            </button>
                            <button aria-label="YouTube" onClick={() => window.open('https://www.youtube.com/', '_blank', 'noopener,noreferrer')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
                            </button>
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

            {/* ── MODALS ── */}
            <Dialog open={!!modal && modal.type !== 'confirm'} onOpenChange={o => !o && close()}>
                <DialogContent className={'market-modal ' + (['request', 'profile', 'info', 'safety'].includes(modal?.type || '') ? 'wide-modal' : '')}>
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
