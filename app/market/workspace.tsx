'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Bell, ChevronDown, Plus, LogOut, Home, Tag, Grid3x3, ShoppingBag, Heart, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Toaster, toast } from 'sonner';
import AuthDialog from '../auth-dialog';
import { Actions, Item, api, useLoad, Load } from './ui';
import { Catalogue } from './catalogue';
import { Dashboard, SellerServices } from './dashboard';
import { ListingDetail, RequestDetail, ProfileDetail } from './details';
import { ItemForm, OfferForm, ReportForm, PaymentForm } from './forms';
import { Admin, CategoryForm, ModerateForm, PaymentReview } from './admin';
import { Messages, Conversation, Notifications } from './communication';
import { Homepage } from './homepage';
import { ProductPage } from './product-page';

const protectedViews = ['Saved', 'Messages', 'Notifications', 'Dashboard', 'Services', 'Admin'];

const LOCATIONS = ['Peshawar', 'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan', 'Abbottabad', 'Quetta'];
const CATEGORY_NAV = ['New Products', 'Pre-Loved', 'Clothes', 'Sneakers', 'Books', 'Accessories'];

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
    const [searchQ, setSearchQ] = useState('');
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

    const boot = useLoad('bootstrap', revision);
    const user = boot.data?.user || null;
    const refresh = () => setRevision(v => v + 1);

    const open = (type: string, item: Item = {}) => {
        if (type === 'listing') {
            setActiveProduct(item);
            setView('Product');
            setModal(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!user && ['listing-form', 'request-form', 'offer-form', 'payment', 'report', 'conversation'].includes(type)) {
            setPending({ type, item });
            setAuth('login');
            return;
        }
        setModal({ type, item });
    };

    const go = (next: string) => {
        if (!user && protectedViews.includes(next)) {
            setAuth('login');
            return;
        }
        setView(next);
        setModal(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const perform = async (path: string, method = 'POST', body?: Record<string, unknown>) => {
        try {
            const d = await api(path, method, body);
            refresh();
            toast.success('Saved successfully');
            return d;
        } catch (e: unknown) {
            const err = e as { message?: string; status?: number };
            toast.error(err.message);
            if (err.status === 401) setAuth('login');
            return null;
        }
    };

    const actions: Actions = { open, go, perform, user, revision, categories: boot.data?.categories || [], refresh, searchQuery: searchQ, setSearchQuery: setSearchQ, searchCategory, setSearchCategory };

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
            refresh();
            toast.success('Signed out');
        } catch {
            toast.error('Sign-out failed. Try again.');
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        go('Explore');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleModeToggle = () => {
        setModeToggle(v => !v);
        setMode(m => m === 'Buying' ? 'Selling' : 'Buying');
    };

    const title: Record<string, string> = {
        'listing': 'Product details', 'request': 'Buyer request', 'profile': 'Member profile',
        'listing-form': modal?.item.id ? 'Edit listing' : 'Create a listing',
        'request-form': modal?.item.id ? 'Edit request' : 'Post a request',
        'offer-form': 'Your offer', 'payment': 'Seller service request',
        'report': 'Report a concern', 'conversation': 'Conversation',
        'category-form': 'Category settings', 'moderate': 'Moderation action',
        'payment-review': 'Verify manual payment', 'inspection': 'Record details'
    };
    const item = modal?.item || {};
    const close = () => setModal(null);

    return (
        <>
            <Toaster position="bottom-right" richColors />


            {/* ── MAIN HEADER ── */}
            <header className="pp-header">
                <div className="pp-header-inner">

                    {/* Logo */}
                    <button className="pp-logo" onClick={() => go('Explore')} aria-label="Picking Price home" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                        <img src="/logo.png" alt="Picking Price" style={{ height: '36px', width: 'auto', display: 'block' }} />
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
                                value={searchQ}
                                onChange={e => { setSearchQ(e.target.value); if (view !== 'Explore') go('Explore'); }}
                                aria-label="Search products or buyer requests"
                            />
                        </div>
                        <button type="submit" className="pp-search-btn" id="header-search-btn">Search</button>
                    </form>

                    {/* Grouping right elements to push them to the far right */}
                    <div className="pp-header-right">
                        {/* Location Picker */}
                        <div className="pp-location-wrap" ref={locationRef}>
                            <button
                                className="pp-location-btn"
                                onClick={() => setLocationOpen(v => !v)}
                                aria-label="Select location"
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

                        {/* Buying / Selling tabs */}
                        <div className="pp-mode-tabs" role="group" aria-label="Marketplace mode">
                            <button
                                id="mode-buying-btn"
                                className={`pp-mode-tab${mode === 'Buying' ? ' active' : ''}`}
                                onClick={() => { setMode('Buying'); setModeToggle(false); }}
                            >
                                Buying
                            </button>
                            <button
                                id="mode-selling-btn"
                                className={`pp-mode-tab${mode === 'Selling' ? ' active' : ''}`}
                                onClick={() => { setMode('Selling'); setModeToggle(true); }}
                            >
                                Selling
                            </button>
                        </div>

                        {/* Bell notification */}
                        <button
                            id="header-notifications-btn"
                            className="pp-bell-btn"
                            aria-label="Notifications"
                            onClick={() => go('Notifications')}
                        >
                            <Bell size={18} />
                            {!!boot.data?.unread && (
                                <span className="pp-bell-badge">{boot.data.unread}</span>
                            )}
                        </button>

                        {/* Auth / Account actions */}
                        <div className="pp-header-auth">
                            {user && (
                                <button id="header-wishlist-btn" className="pp-icon-btn pp-relative" aria-label="Wishlist" onClick={() => go('Saved')}>
                                    <Heart size={20} />
                                </button>
                            )}
                            {!user ? (
                                <>
                                    <button id="header-login-btn" className="pp-login-btn" onClick={() => window.location.href = '/login'}>Login</button>
                                    <button id="header-signup-btn" className="pp-signup-btn" onClick={() => window.location.href = '/signup'}>Signup</button>
                                </>
                            ) : (
                                <>
                                    <button id="header-account-btn" className="pp-account-btn" onClick={() => go('Dashboard')}>
                                        {user.name}
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
                        {!!boot.data?.unread && <span className="pp-nav-badge">{boot.data.unread}</span>}
                    </button>

                    {/* Category quick links */}
                    {CATEGORY_NAV.map(cat => (
                        <button
                            key={cat}
                            id={`nav-cat-${cat.toLowerCase().replace(/\s+/g, '-')}-btn`}
                            className="pp-cat-nav-item"
                            onClick={() => go('Explore')}
                        >
                            {cat}
                        </button>
                    ))}

                    {/* All Categories */}
                    <button
                        id="nav-all-categories-btn"
                        className="pp-cat-nav-item pp-cat-all"
                        onClick={() => go('Explore')}
                    >
                        <Grid3x3 size={14} /> All Categories
                    </button>

                    {/* Spacer + right-side nav items (only shown when logged in) */}
                    {user && (
                        <div className="pp-nav-right">
                            <button
                                id="nav-saved-btn"
                                className={`pp-cat-nav-item${view === 'Saved' ? ' active' : ''}`}
                                onClick={() => go('Saved')}
                            >
                                <Heart size={14} /> Saved
                            </button>
                            <button
                                id="nav-messages-btn"
                                className={`pp-cat-nav-item${view === 'Messages' ? ' active' : ''}`}
                                onClick={() => go('Messages')}
                            >
                                <MessageCircle size={14} /> Messages
                            </button>
                            {user.role === 'admin' && (
                                <button
                                    id="nav-admin-btn"
                                    className={`pp-cat-nav-item${view === 'Admin' ? ' active' : ''}`}
                                    onClick={() => go('Admin')}
                                >
                                    Admin
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* ── PAGE CONTENT ── */}
            {view === 'Explore' && <Homepage actions={actions} />}
            <main className={`market-main${view === 'Explore' ? ' hidden' : ''}`}>
                <Load state={{ ...boot, loading: boot.loading && !boot.data }}>
                    {view === 'Requests' && <Catalogue kind="requests" actions={actions} />}
                    {view === 'Product' && activeProduct && <ProductPage item={activeProduct} actions={actions} />}
                    {view === 'Saved' && <Catalogue saved actions={actions} />}
                    {view === 'Dashboard' && user && <Dashboard actions={actions} />}
                    {view === 'Messages' && user && <Messages actions={actions} />}
                    {view === 'Notifications' && user && <Notifications actions={actions} />}
                    {view === 'Services' && user && <SellerServices actions={actions} />}
                    {view === 'Admin' && user?.role === 'admin' && <Admin actions={actions} />}
                </Load>
            </main>

            {/* Footer (for non-Explore views) */}
            {view !== 'Explore' && (
                <footer>
                    <span className="brand">picking<span>price</span></span>
                    <p>Product payment, delivery and refunds are agreed directly between buyer and seller.</p>
                    <button onClick={() => open('safety')}>Community &amp; safety</button>
                    {workspaceEnabled && (
                        <button onClick={async () => { await fetch('/api/auth/workspace', { method: 'POST' }); setView('Dashboard'); refresh(); }}>
                            Use workspace account
                        </button>
                    )}
                </footer>
            )}

            {/* ── MODALS ── */}
            <Dialog open={!!modal && modal.type !== 'confirm'} onOpenChange={o => !o && close()}>
                <DialogContent className={'market-modal ' + (['request', 'profile', 'inspection'].includes(modal?.type || '') ? 'wide-modal' : '')}>
                    <DialogTitle>{title[modal?.type || ''] || 'Community & safety'}</DialogTitle>
                    <DialogDescription>
                        {modal?.type === 'payment-review'
                            ? 'Verify the external transfer before activating this service.'
                            : 'Picking Price connects buyers and sellers directly.'}
                    </DialogDescription>
                    {/* Listing modal removed, now rendered as a page */}
                    {modal?.type === 'request' && <RequestDetail item={item} actions={actions} />}
                    {modal?.type === 'profile' && <ProfileDetail item={item} actions={actions} />}
                    {modal?.type === 'listing-form' && <ItemForm key={item.id || 'new'} kind="listings" item={item} actions={actions} done={close} />}
                    {modal?.type === 'request-form' && <ItemForm key={item.id || 'new'} kind="requests" item={item} actions={actions} done={close} />}
                    {modal?.type === 'offer-form' && <OfferForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'payment' && <PaymentForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'report' && <ReportForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'conversation' && <Conversation actions={actions} id={item.id} />}
                    {modal?.type === 'category-form' && <CategoryForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'moderate' && <ModerateForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'payment-review' && <PaymentReview item={item} actions={actions} done={close} />}
                    {modal?.type === 'inspection' && (
                        <div className="inspection">
                            {Object.entries(item).map(([k, v]) => (
                                <div key={k}><strong>{k.replaceAll('_', ' ')}</strong><pre>{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '')}</pre></div>
                            ))}
                        </div>
                    )}
                    {modal?.type === 'safety' && (
                        <>
                            <p>Describe items honestly and use clear, accurate photos. Keep conversations respectful. Inspect products and agree on payment and collection directly.</p>
                            <p>Use Report on a listing, request, message, review or profile to raise a concern. Never share passwords or verification codes. Meet in a safe public location.</p>
                        </>
                    )}
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
