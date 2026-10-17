import { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, Heart, MapPin, ShieldCheck, Zap, Package, ChevronLeft, ArrowUpRight, Tag, ChevronDown, Crown, Flame, Eye } from 'lucide-react';
import { Actions, Item, Photo, money, useLoad, Load, Pager, inCity, NoneInCity, CityHeading, ListLoading, sellerProps, DaysLeft } from './ui';
import { samples, sampleRequests } from '../samples';
import { AdSlider } from './slider';

// Each category's picture is in public/images/categories (Fluent Emoji 3D, see vendor/fluent-emoji.LICENSE.md).
const categories = ['Clothes', 'Electronics', 'Furniture', 'Sports', 'Books', 'Cameras', 'Automobiles', 'Kitchen', 'Jewelry', 'Kids', 'Art', 'Accessories']
  .map(name => ({ name, image: '/images/categories/' + name.toLowerCase() + '.png' }));

const featuredSpotlight = {
  id: 'sample-shoes',
  title: 'Nike Air Jordan 1 Retro',
  subtitle: 'Limited edition · Like New',
  price: 14500,
  condition: 'Like New',
  location: 'Lahore',
  seller: 'Ahmed S.',
  verified: true,
  image: '/images/shoes.jpg',
  sample: true,
};



function CategoryIcon({ cat, onClick }: { cat: typeof categories[0]; onClick: () => void }) {
  return (
    <button className="hp-cat-pill" onClick={onClick}>
      <span className="hp-cat-icon-wrap"><img className="hp-cat-img" src={cat.image} alt="" loading="lazy" /></span>
      <span className="hp-cat-label">{cat.name}</span>
    </button>
  );
}

// premium: the golden card of the Premium Listings row, with the crown badge and a View Details button.
function ProductCard({ item, saved, onSave, onClick, actions, premium }: { item: Item; saved: boolean; onSave: () => void; onClick: () => void; actions: Actions; premium?: boolean }) {
  return (
    <article className={'hp-product-card' + (premium ? ' hp-premium-card' : '')}>
      <div className="hp-product-photo">
        <button className="hp-product-img-btn" onClick={onClick}>
          <Photo src={(item.images as string[] | undefined)?.[0] ?? (item.image as string | undefined)} alt={item.title as string} />
        </button>
        {premium ? <span className="hp-premium-badge"><Crown size={13} /> PREMIUM</span> : item.condition && <span className="hp-condition-badge">{item.condition as string}</span>}
        <button className={`hp-heart-btn${saved ? ' loved' : ''}`} aria-label={`Save ${item.title}`} onClick={onSave}>
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {!!item.featured && !premium && <span className="hp-featured-badge">Premium</span>}
      </div>
      <div className="hp-product-info">
        <span className="hp-product-category">{item.category as string}{premium && item.condition ? ' | ' + item.condition : ''}</span>
        <button className="hp-product-title" onClick={onClick}>{item.title as string}</button>
        <strong className="hp-product-price">{money(item.price as number)}</strong>
        <div className="hp-product-meta">
          <span><MapPin size={11} /> {item.location as string}</span>
          <span {...sellerProps(actions, item, '')}>{item.seller as string}</span>
        </div>
        {premium && <button className="hp-premium-view" onClick={onClick}>View Details <ArrowUpRight size={15} /></button>}
      </div>
    </article>
  );
}

function RequestCard({ item, onOffer }: { item: Item; onOffer: () => void }) {
  return (
    <article className="hp-request-card">
      <div className="hp-request-head">
        <div>
          <span className="hp-request-cat">{item.category as string}</span>
          <h4 className="hp-request-title">{item.title as string}</h4>
        </div>
        <button className="hp-offer-btn" onClick={onOffer}>Send Offer</button>
      </div>
      <div className="hp-request-budget">
        <span className="hp-budget-label">Budget up to</span>
        <strong className="hp-budget-amount">{money(item.price as number)}</strong>
      </div>
      <div className="hp-request-footer">
        <span><MapPin size={11} /> {item.location as string}</span>
        <span>{item.condition as string}</span>
        <DaysLeft item={item} />
      </div>
    </article>
  );
}

const SEARCH_CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];
const SEARCH_SORTS = [['relevance', 'Relevance'], ['newest', 'Newest first'], ['low', 'Price: low to high'], ['high', 'Price: high to low']];

// What a submitted search shows. The server looks through every active product (title, description, category
// and brand) and applies the filters and the order; before the first real product exists, the samples are
// searched here instead so the page still has something to show.
function SearchResults({ actions, q, category, sampleMode, saved, onSave, onClear, anchor }: {
  actions: Actions; q: string; category: string; sampleMode: boolean;
  saved: Set<string>; onSave: (id: string) => void; onClear: () => void; anchor: React.RefObject<HTMLDivElement | null>;
}) {
  const [sort, setSort] = useState(q ? 'relevance' : 'newest');
  const [condition, setCondition] = useState('all');
  const [kind, setKind] = useState('all');   // all, new or preloved
  const [place, setPlace] = useState(''), [min, setMin] = useState(''), [max, setMax] = useState('');
  const [applied, setApplied] = useState({ place: '', min: '', max: '' });
  const [page, setPage] = useState(1);
  // Typed filters are applied a moment after the typing stops.
  useEffect(() => { const t = setTimeout(() => { setApplied({ place: place.trim(), min, max }); setPage(1); }, 350); return () => clearTimeout(t); }, [place, min, max]);
  useEffect(() => { setPage(1); setSort(q ? 'relevance' : 'newest'); }, [q, category]);

  const params = new URLSearchParams({ page: String(page), size: '12', sort });
  if (q) params.set('q', q);
  if (category !== 'all') params.set('category', category);
  if (condition !== 'all') params.set('condition', condition);
  if (kind !== 'all') params.set('type', kind);
  const city = actions.location && actions.location !== 'all' ? actions.location : '';
  if (city) params.set('city', city);
  if (applied.place) params.set('location', applied.place);
  if (applied.min) params.set('min', applied.min);
  if (applied.max) params.set('max', applied.max);
  const state = useLoad(sampleMode ? null : 'listings?' + params, actions.revision);

  const term = q.toLowerCase();
  const sampleHits = !sampleMode ? [] : (samples as Item[]).filter(p =>
    inCity(p.location, actions.location) &&
    (category === 'all' || String(p.category).toLowerCase() === category.toLowerCase()) &&
    (!term || `${p.title} ${p.description} ${p.category} ${p.brand || ''}`.toLowerCase().includes(term)) &&
    (condition === 'all' || p.condition === condition) &&
    (kind === 'all' || (kind === 'new' ? p.condition === 'New' : p.condition !== 'New')) &&
    (!applied.place || String(p.location).toLowerCase().includes(applied.place.toLowerCase())) &&
    (!applied.min || Number(p.price) >= Number(applied.min)) && (!applied.max || Number(p.price) <= Number(applied.max)));
  if (sort === 'low') sampleHits.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === 'high') sampleHits.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === 'relevance' && term) sampleHits.sort((a, b) => Number(String(b.title).toLowerCase().includes(term)) - Number(String(a.title).toLowerCase().includes(term)));

  const items: Item[] = sampleMode ? sampleHits.slice((page - 1) * 12, page * 12) : ((state.data?.items as Item[]) || []);
  const total = sampleMode ? sampleHits.length : Number(state.data?.total) || 0;
  const filtered = condition !== 'all' || kind !== 'all' || !!applied.place || !!applied.min || !!applied.max;
  const resetFilters = () => { setCondition('all'); setKind('all'); setPlace(''); setMin(''); setMax(''); };

  return (
    <section ref={anchor} className="hp-section hp-search-results">
      <CityHeading actions={actions} />
      <div className="hp-section-head">
        <div className="hp-section-title-wrap">
          <Search size={18} className="hp-zap-icon" />
          <h2 className="hp-section-title">
            {q ? `Results for "${q}"` : `Category: ${category}`}
          </h2>
        </div>
        <button className="hp-see-all hp-clear-search" onClick={onClear}>
          ✕ Clear search
        </button>
      </div>

      <div className="hp-search-tools">
        <label>
          <span>Sort by</span>
          <select id="hp-search-sort" className="pp-select" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
            {SEARCH_SORTS.filter(([value]) => value !== 'relevance' || !!q).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select id="hp-search-type" className="pp-select" value={kind} onChange={e => {
            // A condition that the new type rules out goes back to "Any condition", so the two never contradict.
            const next = e.target.value;
            if ((next === 'new' && condition !== 'all' && condition !== 'New') || (next === 'preloved' && condition === 'New')) setCondition('all');
            setKind(next); setPage(1);
          }}>
            <option value="all">New and pre-loved</option>
            <option value="new">New only</option>
            <option value="preloved">Pre-loved only</option>
          </select>
        </label>
        <label>
          <span>Condition</span>
          <select id="hp-search-condition" className="pp-select" value={condition} onChange={e => { setCondition(e.target.value); setPage(1); }}>
            <option value="all">Any condition</option>
            {SEARCH_CONDITIONS.filter(c => kind === 'all' || (kind === 'new' ? c === 'New' : c !== 'New')).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <span>Location</span>
          <input id="hp-search-location" type="text" value={place} maxLength={80} placeholder={city ? 'Any area in ' + city : 'Any city'} onChange={e => setPlace(e.target.value)} />
        </label>
        <label className="hp-search-price">
          <span>Price (Rs.)</span>
          <span className="hp-search-range">
            <input id="hp-search-min" type="number" min={0} inputMode="numeric" value={min} placeholder="Min" onChange={e => setMin(e.target.value)} />
            <i>to</i>
            <input id="hp-search-max" type="number" min={0} inputMode="numeric" value={max} placeholder="Max" onChange={e => setMax(e.target.value)} />
          </span>
        </label>
      </div>

      <Load state={state}>
        <p className="hp-search-count" id="hp-search-count">{total} {total === 1 ? 'result' : 'results'}{city ? ' in ' + city : ''}{sampleMode ? ' (sample products)' : ''}</p>
        {items.length === 0 ? (
          <div className="hp-no-results">
            <Search size={32} />
            <p>No results found{q ? <> for &ldquo;{q}&rdquo;</> : null}{category !== 'all' ? ` in ${category}` : ''}{city ? ` in ${city}` : ''}{filtered ? ' with these filters' : ''}.</p>
            {city && actions.setLocation ? <button className="hp-cta-secondary" id="hp-search-all-pakistan" style={{ marginRight: '8px' }} onClick={() => actions.setLocation!('all')}>Search all Pakistan</button> : null}
            {filtered
              ? <button className="hp-cta-secondary" onClick={resetFilters}>Reset filters</button>
              : <button className="hp-cta-secondary" onClick={onClear}>Clear search</button>}
          </div>
        ) : (
          <div className="hp-arrivals-grid">
            {items.map(item => (
              <ProductCard key={String(item.id)} item={item} saved={saved.has(String(item.id))} onSave={() => onSave(String(item.id))} onClick={() => actions.open('listing', item)} actions={actions} />
            ))}
          </div>
        )}
        <Pager page={page} total={total} onChange={setPage} />
      </Load>
    </section>
  );
}

export function Homepage({ actions }: { actions: Actions }) {
  // Products follow the city chosen in the header. Pre-Loved Deals hold only used conditions and Fresh Arrivals
  // only New, like their own pages. Each kind (pre-loved, New, premium) shows samples only until a real product of
  // that kind exists anywhere on the site; small extra requests (size=1, every city) tell whether one does, so an
  // empty city is not mistaken for an empty site.
  const city = actions.location && actions.location !== 'all' ? actions.location : '';
  const cityQuery = city ? '&city=' + encodeURIComponent(city) : '';
  const reqState = useLoad('requests?size=3', actions.revision);
  const usedState = useLoad('listings?type=preloved&size=6' + cityQuery, actions.revision);
  const newState = useLoad('listings?type=new&size=8' + cityQuery, actions.revision);
  const anyState = useLoad('listings?size=1', actions.revision);
  const usedAnyState = useLoad('listings?type=preloved&size=1', actions.revision);
  const newAnyState = useLoad('listings?type=new&size=1', actions.revision);
  const premiumAnyState = useLoad('listings?premium=1&size=1', actions.revision);
  const premiumState = useLoad('listings?premium=1&size=8' + cityQuery, actions.revision);
  const popularState = useLoad('listings?sort=popular&size=12' + cityQuery, actions.revision);

  // Until the answers arrive nothing is shown, so samples never flash before real products and requests.
  const ready = (s: { data: unknown; error: string }) => !!s.data || !!s.error;
  const reqsReady = ready(reqState), listsReady = ready(usedState) && ready(newState) && ready(anyState) && ready(usedAnyState) && ready(newAnyState);
  const premiumReady = ready(premiumState) && ready(premiumAnyState);
  const realReqs = reqState.data?.items || [];
  const realUsed: Item[] = usedState.data?.items || [];
  const realNew: Item[] = newState.data?.items || [];

  const hasRealReqs = reqState.data?.total > 0;
  const hasRealLists = Number(anyState.data?.total) > 0;
  const hasRealUsed = Number(usedAnyState.data?.total) > 0, hasRealNew = Number(newAnyState.data?.total) > 0, hasRealPremium = Number(premiumAnyState.data?.total) > 0;
  const citySamples = samples.filter(p => inCity(p.location, actions.location));
  // Products with an active promotion, paid for by their sellers; sample premium products until the first real one.
  const premium: Item[] = !premiumReady ? [] : hasRealPremium ? (premiumState.data?.items || []) : citySamples.filter(p => p.featured).slice(0, 8);

  const liveRequests = !reqsReady ? [] : hasRealReqs ? realReqs : sampleRequests.slice(0, 3);
  const recentDeals: Item[] = !listsReady ? [] : hasRealUsed ? realUsed : citySamples.filter(p => p.condition !== 'New').slice(0, 6);
  const freshArrivals: Item[] = !listsReady ? [] : hasRealNew ? realNew : citySamples.filter(p => p.condition === 'New').slice(0, 8);
  // Popular Product: the most viewed product (one already in Premium Listings above is skipped, so it is not shown twice);
  // with no views yet, the newest product. The sample only before any real product exists.
  const premiumIds = new Set(premium.map(p => p.id));
  const byViews: Item[] = popularState.data?.items || [];
  const realLists = [...realNew, ...realUsed].sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const mostViewed = byViews.find(p => Number(p.views) > 0 && !premiumIds.has(p.id)) || byViews.find(p => Number(p.views) > 0) || null;
  const spotlight: any = !listsReady || !ready(popularState) ? null : hasRealLists ? (mostViewed || byViews[0] || realLists[0] || null) : (inCity(featuredSpotlight.location, actions.location) ? featuredSpotlight : null);
  const spotlightPopular = !!spotlight?.sample || Number(spotlight?.views) > 0;

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [catOpen, setCatOpen] = useState(false);

  // The applied search is shared with the header; the text typed in this box is not, and is applied only on submit.
  const searchQ = actions.searchQuery;
  const setSearchQ = actions.setSearchQuery;
  const [heroSearch, setHeroSearch] = useState('');
  useEffect(() => { if (!searchQ) setHeroSearch(''); }, [searchQ]);
  const searchCategory = actions.searchCategory;
  const setSearchCategory = actions.setSearchCategory;

  const toggleSave = (id: string) => {
    if (!actions.user) { actions.open('login'); return; }
    setSavedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    actions.perform('favorites/' + id, 'PUT', { saved: !savedIds.has(id) });
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    actions.submitSearch(heroSearch);
  };

  // Moves the premium row by about one card; the arrows show only while the row is wider than the screen.
  const scrollPremium = (dir: number) => document.getElementById('premium-scroll')?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  const [premiumScrolls, setPremiumScrolls] = useState(false);
  useEffect(() => {
    const measure = () => { const el = document.getElementById('premium-scroll'); setPremiumScrolls(!!el && el.scrollWidth > el.clientWidth + 4); };
    measure(); window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [premium.length]);

  const scrollDeals = (dir: 'left' | 'right') => {
    const el = document.getElementById('deals-scroll');
    if (el) el.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  };

  const isSearching = searchQ.trim().length > 0 || searchCategory !== 'all';
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Runs for each submitted search (from here or the header), including when that submit brought the visitor to this page.
  useEffect(() => {
    if (actions.takeSearchScroll() && searchResultsRef.current)
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [actions.searchTick]);

  // Choosing a category tile also brings the visitor to the results, the same way (the results render first,
  // then the page scrolls; scroll-margin-top keeps them clear of the sticky header).
  const [categoryScroll, setCategoryScroll] = useState(0);
  useEffect(() => {
    if (categoryScroll && searchResultsRef.current)
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [categoryScroll]);
  const pickCategory = (name: string) => { setSearchCategory(name); setCategoryScroll(t => t + 1); };

  const HERO_CATS = ['All Categories', 'Clothes', 'Electronics', 'Furniture', 'Sports', 'Books', 'Cameras', 'Automobiles', 'Kitchen', 'Jewelry', 'Kids', 'Art', 'Accessories'];

  return (
    <div className="hp-root">

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-hero-content">
          <p className="hp-hero-slogan">Buy Smart · Sell Easy · Find What You Need</p>
          <h1 className="hp-hero-title">Find what you need. Sell what you don&apos;t.</h1>
          <p className="hp-hero-sub">
            Buy new and pre-loved products or post a request and let <br />sellers come to you.
          </p>

          {/* Hero search bar — exact Figma style */}
          <form className="hp-hero-search" onSubmit={handleHeroSearch} id="hero-search-form">
            {/* Category dropdown */}
            <div className="hp-hero-cat-wrap">
              <button
                type="button"
                className="hp-hero-cat-select"
                onClick={() => setCatOpen(!catOpen)}
                aria-label="Filter by category"
              >
                {searchCategory === 'all' ? 'All Categories' : searchCategory}
                <ChevronDown size={13} className={`hp-hero-cat-caret${catOpen ? ' open' : ''}`} />
              </button>
              {catOpen && (
                <div className="pp-location-dropdown hp-cat-dropdown-menu">
                  <button
                    type="button"
                    className={`pp-loc-option${searchCategory === 'all' ? ' selected' : ''}`}
                    onClick={() => { setSearchCategory('all'); setCatOpen(false); }}
                  >
                    All Categories
                  </button>
                  {HERO_CATS.slice(1).map(c => (
                    <button
                      type="button"
                      key={c}
                      className={`pp-loc-option${searchCategory === c ? ' selected' : ''}`}
                      onClick={() => { setSearchCategory(c); setCatOpen(false); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hp-hero-divider" />
            {/* Text input */}
            <input
              id="hero-search-input"
              className="hp-hero-input"
              type="search"
              placeholder="What are you looking for?"
              value={heroSearch}
              onChange={e => setHeroSearch(e.target.value)}
              aria-label="Search products"
              autoComplete="off"
            />
            {/* Search button */}
            <button type="submit" className="hp-hero-search-btn" id="hero-search-btn">
              <Search size={16} />
              Search
            </button>
          </form>

          {/* Quick category pills */}
          <div className="hp-hero-pills">
            {['Clothes', 'Accessories', 'Sneakers', 'Books'].map(cat => (
              <button
                key={cat}
                id={`hero-pill-${cat.toLowerCase()}`}
                className={`hp-hero-pill${searchCategory === cat ? ' active' : ''}`}
                onClick={() => setSearchCategory(searchCategory === cat ? 'all' : cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BANNER CARDS */}
      <section className="hp-banners">
        <div className="hp-banner hp-banner-teal">
          <div className="hp-banner-text">
            <h3>Can&apos;t find an item?</h3>
            <p>Post a buyer request and let sellers come to you directly.</p>
            <button className="hp-banner-btn hp-banner-btn-teal" onClick={() => actions.open('request-form')}>
              Post a Request <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="hp-banner-illus hp-banner-illus-teal"><Tag size={48} /></div>
        </div>
        <div className="hp-banner hp-banner-orange">
          <div className="hp-banner-text">
            <h3>Have something to sell?</h3>
            <p>List your item in minutes and reach buyers across Pakistan.</p>
            <button className="hp-banner-btn hp-banner-btn-orange" onClick={() => actions.open('listing-form')}>
              Sell Now <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="hp-banner-illus hp-banner-illus-orange"><Package size={48} /></div>
        </div>
      </section>

      <div className="hp-body">

        {/* SEARCH RESULTS first, above the slider; everything below stays as it is */}
        {isSearching && (
          <SearchResults actions={actions} q={searchQ.trim()} category={searchCategory} sampleMode={listsReady && !hasRealLists}
            saved={savedIds} onSave={toggleSave} onClear={() => { setSearchQ(''); setSearchCategory('all'); }} anchor={searchResultsRef} />
        )}

        {/* SLIDER: announcements, just above the categories */}
        <AdSlider actions={actions} />

        {/* EXPLORE CATEGORIES */}
        {(
        <section className="hp-section">
          <div className="hp-section-head">
            <h2 className="hp-section-title">Explore Categories</h2>
            <button className="hp-see-all" onClick={() => actions.go('AllCategories')}>View More <ChevronRight size={14} /></button>
          </div>
          <div className="hp-categories-grid">
            {categories.map(cat => <CategoryIcon key={cat.name} cat={cat} onClick={() => pickCategory(cat.name)} />)}
          </div>
        </section>
        )}

        {/* PREMIUM PRODUCTS */}
        {premium.length > 0 && (
        <section className="hp-section hp-premium-section">
          <div className="hp-section-head">
            <div className="hp-section-title-wrap">
              <Crown size={20} className="hp-crown-icon" />
              <h2 className="hp-section-title">Premium Products</h2>
            </div>
            <span className="hp-premium-note">Promoted by sellers</span>
          </div>
          <div className="hp-premium-row">
            {premiumScrolls && <button className="hp-premium-arrow prev" aria-label="Previous premium products" onClick={() => scrollPremium(-1)}><ChevronLeft size={20} /></button>}
            <div className="hp-premium-scroll" id="premium-scroll">
              {premium.map(item => (
                <div key={item.id} className="hp-premium-card-wrap">
                  <ProductCard premium item={{ ...item, featured: true }} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} actions={actions} />
                </div>
              ))}
            </div>
            {premiumScrolls && <button className="hp-premium-arrow next" aria-label="Next premium products" onClick={() => scrollPremium(1)}><ChevronRight size={20} /></button>}
          </div>
        </section>
        )}

        {/* LIVE BUYER REQUESTS */}
        <section className="hp-section">
          <div className="hp-section-head">
            <div className="hp-section-title-wrap">
              <span className="hp-live-dot" />
              <h2 className="hp-section-title">Live Buyer Requests</h2>
            </div>
            <button className="hp-see-all" onClick={() => actions.go('BuyerRequests')}>View More <ChevronRight size={14} /></button>
          </div>
          <div className="hp-requests-list">
            {!reqsReady && <ListLoading />}
            {liveRequests.map(req => (
              <RequestCard key={req.id} item={req} onOffer={() => actions.open('offer-form', req)} />
            ))}
          </div>
        </section>

        {/* POPULAR PRODUCT: the most viewed */}
        {spotlight && <section className="hp-spotlight">
          <div className="hp-spotlight-badges">
            <span className="hp-spotlight-badge">{spotlightPopular ? <><Flame size={13} /> Most Viewed</> : 'Just Listed'}</span>
          </div>
          <div className="hp-spotlight-inner">
            <div className="hp-spotlight-img-wrap">
              <Photo src={spotlight.images?.[0] ?? spotlight.image} alt={String(spotlight.title)} />
            </div>
            <div className="hp-spotlight-info">
              <span className="hp-spotlight-eyebrow">{spotlightPopular ? 'Popular Product' : 'Latest Listing'}</span>
              <h2 className="hp-spotlight-title">{spotlight.title}</h2>
              <p className="hp-spotlight-sub">{spotlight.subtitle || [spotlight.category, spotlight.condition].filter(Boolean).join(' · ')}</p>
              <div className="hp-spotlight-price">{money(Number(spotlight.price) || 0)}</div>
              <div className="hp-spotlight-meta">
                <span><MapPin size={13} /> {spotlight.location}</span>
                {Number(spotlight.views) > 0 && <span><Eye size={13} /> {Number(spotlight.views).toLocaleString('en-PK')} {Number(spotlight.views) === 1 ? 'view' : 'views'}</span>}
                <span {...sellerProps(actions, spotlight as Item, '')}>{spotlight.seller} {!!spotlight.verified && <ShieldCheck size={13} />}</span>
              </div>
              <button className="hp-spotlight-buy" onClick={() => actions.open('listing', spotlight as Item)}>
                Buy Now <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>}

        {/* RECENT PRE-LOVED DEALS */}
        {(
        <section className="hp-section">
          <CityHeading actions={actions} />
          <div className="hp-section-head">
            <h2 className="hp-section-title">Recent Pre-Loved Deals</h2>
            <div className="hp-scroll-btns">
              <button className="hp-scroll-btn" onClick={() => scrollDeals('left')} aria-label="Scroll left"><ChevronLeft size={16} /></button>
              <button className="hp-scroll-btn" onClick={() => scrollDeals('right')} aria-label="Scroll right"><ChevronRight size={16} /></button>
              <button className="hp-see-all" id="preloved-see-all" onClick={() => actions.go('PreLoved')}>View More <ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="hp-horizontal-scroll" id="deals-scroll">
            {recentDeals.length > 0 ? recentDeals.map(item => (
              <div key={item.id} className="hp-deal-card-wrap">
                <ProductCard item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} actions={actions} />
              </div>
            )) : listsReady ? <NoneInCity actions={actions} what="pre-loved products" /> : <ListLoading />}
          </div>
        </section>
        )}

        {/* FRESH ARRIVALS: products in New condition only; hidden when there are none */}
        {freshArrivals.length > 0 && (
        <section className="hp-section">
          <CityHeading actions={actions} />
          <div className="hp-section-head">
            <div className="hp-section-title-wrap">
              <Zap size={18} className="hp-zap-icon" />
              <h2 className="hp-section-title">Fresh Arrivals</h2>
            </div>
            <button className="hp-see-all" id="arrivals-see-all" onClick={() => actions.go('BrandNew')}>View More <ChevronRight size={14} /></button>
          </div>
          <div className="hp-arrivals-grid">
            {freshArrivals.length > 0 ? freshArrivals.map(item => (
              <ProductCard key={item.id} item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} actions={actions} />
            )) : null}
          </div>
        </section>
        )}

        {/* CAN'T FIND SECTION */}
        <section className="hp-cant-find">
          <div className="hp-cant-find-left">
            <h2>Can&apos;t find what you&apos;re looking for?</h2>
            <p>Tell us what you need and let sellers come to you with their best offers.</p>
            <div className="hp-cant-steps">
              <div className="hp-cant-step">
                <span className="hp-step-num">1</span>
                <div><strong>Post Your Request</strong><p>Describe exactly what you need with your budget.</p></div>
              </div>
              <div className="hp-cant-step">
                <span className="hp-step-num">2</span>
                <div><strong>Sellers Discover Your Request</strong><p>Sellers browse live requests and send you offers.</p></div>
              </div>
              <div className="hp-cant-step">
                <span className="hp-step-num">3</span>
                <div><strong>Compare and Connect</strong><p>Review offers and connect directly with the best match.</p></div>
              </div>
            </div>
            <div className="hp-cant-actions">
              <button className="hp-cta-primary" onClick={() => actions.open('request-form')}>+ Post a Request</button>
              <button className="hp-cta-secondary" onClick={() => actions.go('Requests')}>Browse Requests</button>
            </div>
          </div>
          <div className="hp-cant-find-right">
            <h3>Not sure where to start?</h3>
            <p className="hp-cf-sub">Try one of these searches</p>
            <div className="hp-cf-tags">
              {['iPhone 15 Pro', 'MacBook Air', 'PS5', 'Nike Jordan', 'Canon DSLR', 'Sofa Set', 'Office Chair', 'Samsung Galaxy'].map(t => (
                <button key={t} className="hp-cf-tag" onClick={() => actions.submitSearch(t)}>{t}</button>
              ))}
            </div>
            <div className="hp-trust-stats">
              <div className="hp-trust-stat"><strong>Free</strong><span>To Join</span></div>
              <div className="hp-trust-stat"><strong>0%</strong><span>Sales Commission</span></div>
              <div className="hp-trust-stat"><strong>Direct</strong><span>Buyer–Seller Chat</span></div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
