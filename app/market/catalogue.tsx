import { useEffect, useState } from 'react';
import { Search, Heart, MapPin, Plus, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { samples, sampleRequests } from '../samples';
import { Actions, Item, useLoad, Load, Choice, Pager, Empty, Photo, money, date, Status, DaysLeft } from './ui';
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Used'];
export function Catalogue({ kind = 'listings', saved = false, actions }: {
    kind?: 'listings' | 'requests';
    saved?: boolean;
    actions: Actions;
}) {
    const [filters, setFilters] = useState({ q: '', category: 'all', condition: 'all', location: 'all', type: 'all', min: '', max: '', sort: 'relevance' }), [query, setQuery] = useState(''), [page, setPage] = useState(1);
    const [userToggledDemo, setUserToggledDemo] = useState<boolean | null>(null);
    useEffect(() => { const t = setTimeout(() => {setQuery(filters.q);setPage(1)}, 250); return () => clearTimeout(t); }, [filters.q]);
    const params = new URLSearchParams({ ...filters, q: query, page: String(page), size: '12', ...(saved ? { saved: '1' } : {}) });
    const state = useLoad(kind + '?' + params, actions.revision);
    const fav = useLoad(actions.user ? 'favorites?size=60' : null, actions.revision);
    const ids = new Set((fav.data?.items || []).map((r: Item) => r.listing_id));
    const [favoriteResult,setFavoriteResult]=useState<{owner:string;ids:string[]}>({owner:'',ids:[]});
    useEffect(() => { let live = true; if (!actions.user) {
        return;
    } async function allFavorites() { const extra: string[] = []; let p = 2; const total = fav.data?.total || 0; while ((p - 1) * 60 < total) {
        const response = await fetch('/api/market/favorites?page=' + p + '&size=60');
        const d: {items?: Item[]} = await response.json();
        if (!response.ok)
            break;
        extra.push(...d.items.map((x: Item) => x.listing_id));
        p++;
    } if (live)
        setFavoriteResult({owner:actions.user!.id,ids:extra}); } allFavorites(); return () => { live = false; }; }, [fav.data, actions.user]);
    for (const id of (favoriteResult.owner===actions.user?.id?favoriteResult.ids:[]))
        ids.add(id);
    const source = (kind === 'listings' ? samples : sampleRequests).map((p: Item) => ({ ...p, images: p.images || [p.image].filter(Boolean) }));
    const sampleItems = source.filter(p => (!saved || ids.has(p.id)) && (!query || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(query.toLowerCase())) && (filters.category === 'all' || p.category === filters.category) && (filters.condition === 'all' || p.condition === filters.condition) && (filters.location === 'all' || p.location === filters.location) && (!filters.min || p.price >= +filters.min) && (!filters.max || p.price <= +filters.max) && (filters.type === 'all' || (filters.type === 'new' ? p.condition === 'New' : p.condition !== 'New')));
    sampleItems.sort((a, b) => filters.sort === 'low' ? a.price - b.price : filters.sort === 'high' ? b.price - a.price : 0);
    const showingDemo = userToggledDemo !== null ? userToggledDemo : (!saved && state.data?.total === 0 && !query && filters.category === 'all' && filters.condition === 'all' && filters.location === 'all' && filters.type === 'all' && !filters.min && !filters.max);
    const displayed = showingDemo ? sampleItems.slice((page - 1) * 12, page * 12) : state.data?.items || [];
    const isFiltered = query !== '' || filters.category !== 'all' || filters.condition !== 'all' || filters.location !== 'all' || filters.type !== 'all' || filters.min !== '' || filters.max !== '';
    const finalDisplayed = (kind === 'requests' && !isFiltered) ? displayed.slice(0, 3) : displayed;
    const total = showingDemo ? sampleItems.length : state.data?.total || 0;
    const set = (k: string, v: string) => {setFilters({ ...filters, [k]: v });setPage(1)};
    // "New only" leaves nothing to choose in Condition, so that filter is hidden and cleared; "Pre-loved only" drops New from it.
    const setType = (v: string) => {setFilters({ ...filters, type: v, condition: v === 'new' || (v === 'preloved' && filters.condition === 'New') ? 'all' : filters.condition });setPage(1)};
    const conditionChoices = filters.type === 'preloved' ? conditions.filter(c => c !== 'New') : conditions;
    return <section className="catalogue"><div className="section-head"><div><div className="eyebrow">{saved ? 'YOUR FAVOURITES' : kind === 'requests' ? 'THE REQUEST BOARD' : 'THE MARKETPLACE'}</div><h1>{saved ? 'Saved finds' : kind === 'requests' ? 'Tell us what you need.' : 'Find your next favourite.'}</h1><p>{kind === 'requests' ? 'Discover what buyers need and send a thoughtful offer.' : 'New and pre-loved pieces, ready for a new chapter.'}</p></div><button className="btn dark" onClick={() => actions.open(kind === 'requests' ? 'request-form' : 'listing-form')}><Plus size={17}/>{kind === 'requests' ? 'Post a request' : 'Sell an item'}</button></div>
 <div className="search-box"><Search /><input aria-label="Search" placeholder={kind === 'requests' ? 'Search buyer requests' : 'Search products, brands or keywords'} value={filters.q} onChange={e => set('q', e.target.value)}/></div>
 <div className="filters-grid"><Choice label="Category" value={filters.category} onChange={v => set('category', v)} options={[{ value: 'all', label: 'All categories' }, ...actions.categories.map(c => c.name)]}/><Choice label="New or pre-loved" value={filters.type} onChange={setType} options={[{ value: 'all', label: 'New & pre-loved' }, { value: 'new', label: 'New only' }, { value: 'preloved', label: 'Pre-loved only' }]}/><Choice label="Location" value={filters.location} onChange={v => set('location', v)} options={[{ value: 'all', label: 'All Pakistan' }, 'Peshawar', 'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan', 'Abbottabad']}/>{filters.type !== 'new' && <Choice label="Condition" value={filters.condition} onChange={v => set('condition', v)} options={[{ value: 'all', label: 'Any condition' }, ...conditionChoices]}/>}<label className="price-filter">Min Rs.<input type="number" min="0" placeholder="Min" value={filters.min} onChange={e => set('min', e.target.value)}/></label><label className="price-filter">Max Rs.<input type="number" min="0" placeholder="Max" value={filters.max} onChange={e => set('max', e.target.value)}/></label><Choice label="Sort" value={filters.sort} onChange={v => set('sort', v)} options={[{ value: 'relevance', label: 'Relevance / premium' }, { value: 'newest', label: 'Newest' }, { value: 'low', label: 'Price: low to high' }, { value: 'high', label: 'Price: high to low' }]}/><button className="text-link" onClick={() => setFilters({ q: '', category: 'all', condition: 'all', location: 'all', type: 'all', min: '', max: '', sort: 'relevance' })}>Reset filters</button></div>
 {kind === 'listings' && !saved && <div className="home-highlights"><div><strong>Browse by category</strong><div className="category-pills">{actions.categories.map(c => <button key={c.id} className={filters.category === c.name ? 'selected' : ''} onClick={() => set('category', filters.category === c.name ? 'all' : c.name)}>{c.name}</button>)}</div></div><div className="home-request"><strong>Looking for something specific?</strong><span>Post a buyer request and let sellers come to you.</span><button className="text-link" onClick={() => actions.go('Requests')}>Browse buyer requests →</button></div></div>}
 <div className="results-bar"><span>{total} {showingDemo ? 'sample examples' : 'results'}</span><label className="check-line" style={{cursor: 'pointer'}}><input type="checkbox" checked={showingDemo} onChange={e => {setUserToggledDemo(e.target.checked);setPage(1)}} style={{marginRight: '8px', cursor: 'pointer', accentColor: '#0e7559'}}/> Browse sample examples</label></div>
 {showingDemo && <p className="notice">These are labelled demo examples, not active sellers. Create a real listing or request to try the complete workflow.</p>}
 {kind === 'listings' && !saved && <div className="catalogue-label"><strong>Premium & recent finds</strong><span>Use the sort control to explore premium finds, newest items or prices.</span></div>}
 <Load state={state}><div className={kind === 'listings' ? 'product-grid' : 'request-grid'}>{finalDisplayed.map((p: Item) => kind === 'listings' ? <article className="product" key={p.id}><div className="product-photo"><button className="image-button" onClick={() => actions.open('listing', p)}><Photo src={p.images?.[0]} alt={p.title}/></button><span className="condition">{p.condition}</span><button aria-label={'Save ' + p.title} className={'heart ' + (ids.has(p.id) ? 'loved' : '')} onClick={() => actions.user ? actions.perform('favorites/' + p.id, 'PUT', { saved: !ids.has(p.id) }) : actions.open('login')}><Heart size={18} fill={ids.has(p.id) ? 'currentColor' : 'none'}/></button>{p.featured && <span className="featured">Premium</span>}</div><div className="product-info"><small>{p.category}{p.sample && <span>Sample</span>}</small><button className="product-title" onClick={() => actions.open('listing', p)}>{p.title}</button><strong>{money(p.price)}</strong><div className="product-meta"><span><MapPin size={13}/>{p.location}</span><button onClick={() => p.owner && actions.open('profile', { id: p.owner })}>{p.seller}{!!p.verified && <ShieldCheck size={13}/>}</button></div></div></article> : <article className="request-card" key={p.id}><div className="request-top"><Status>{p.status || 'Open'}</Status><small>{p.sample ? 'Sample request' : date(p.created)}</small></div><h3>{p.title}</h3><p>{p.description}</p><div className="request-budget"><span>Budget up to<strong>{money(p.price)}</strong></span><span>{p.location}</span></div><div className="request-bottom"><span>{p.condition}</span><DaysLeft item={p}/><button onClick={() => actions.open('request', p)}>View request <ArrowUpRight size={17}/></button></div></article>)}</div>{!finalDisplayed.length && <Empty title="No matching items" text="Try different filters or create your own request."/>}{(kind === 'listings' || isFiltered) && <Pager page={page} total={total} onChange={setPage}/>}{kind === 'requests' && <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '20px' }}><button className="btn dark" onClick={() => actions.go('BuyerRequests')}>View All</button></div>}</Load>
 {saved && !showingDemo && sampleItems.length > 0 && <div className="info-panel"><p>You also saved {sampleItems.length} sample examples.</p><button className="btn" onClick={() => setUserToggledDemo(true)}>View saved samples</button></div>}
 </section>;
}
