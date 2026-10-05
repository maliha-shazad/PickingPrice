'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, Heart, MapPin, ShieldCheck, Zap, Package, Shirt, Monitor, Sofa, Dumbbell, BookOpen, Camera, Car, Utensils, Gem, Baby, Paintbrush, ChevronLeft, ArrowUpRight, Tag, ChevronDown } from 'lucide-react';
import { Actions, Item, Photo, money, useLoad } from './ui';
import { samples, sampleRequests } from '../samples';

const categories = [
  { name: 'Clothes', icon: Shirt, color: '#e8f5e9' },
  { name: 'Electronics', icon: Monitor, color: '#e3f2fd' },
  { name: 'Furniture', icon: Sofa, color: '#fff3e0' },
  { name: 'Sports', icon: Dumbbell, color: '#fce4ec' },
  { name: 'Books', icon: BookOpen, color: '#f3e5f5' },
  { name: 'Cameras', icon: Camera, color: '#e0f7fa' },
  { name: 'Automobiles', icon: Car, color: '#fbe9e7' },
  { name: 'Kitchen', icon: Utensils, color: '#f9fbe7' },
  { name: 'Jewelry', icon: Gem, color: '#fce4ec' },
  { name: 'Kids', icon: Baby, color: '#e8f5e9' },
  { name: 'Art', icon: Paintbrush, color: '#ede7f6' },
  { name: 'Accessories', icon: Gem, color: '#e0f2f1' },
];

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
  const Icon = cat.icon;
  return (
    <button className="hp-cat-pill" style={{ '--cat-color': cat.color } as React.CSSProperties} onClick={onClick}>
      <span className="hp-cat-icon-wrap"><Icon size={22} /></span>
      <span className="hp-cat-label">{cat.name}</span>
    </button>
  );
}

function ProductCard({ item, saved, onSave, onClick }: { item: Item; saved: boolean; onSave: () => void; onClick: () => void }) {
  return (
    <article className="hp-product-card">
      <div className="hp-product-photo">
        <button className="hp-product-img-btn" onClick={onClick}>
          <Photo src={(item.images as string[] | undefined)?.[0] ?? (item.image as string | undefined)} alt={item.title as string} />
        </button>
        {item.condition && <span className="hp-condition-badge">{item.condition as string}</span>}
        <button className={`hp-heart-btn${saved ? ' loved' : ''}`} aria-label={`Save ${item.title}`} onClick={onSave}>
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {item.featured && <span className="hp-featured-badge">Featured</span>}
      </div>
      <div className="hp-product-info">
        <span className="hp-product-category">{item.category as string}</span>
        <button className="hp-product-title" onClick={onClick}>{item.title as string}</button>
        <strong className="hp-product-price">{money(item.price as number)}</strong>
        <div className="hp-product-meta">
          <span><MapPin size={11} /> {item.location as string}</span>
          <span>{item.seller as string}</span>
        </div>
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
      </div>
    </article>
  );
}

export function Homepage({ actions }: { actions: Actions }) {
  const reqState = useLoad('requests?size=3', actions.revision);
  const listState = useLoad('listings?size=14', actions.revision);

  const realReqs = reqState.data?.items || [];
  const realLists = listState.data?.items || [];
  
  const hasRealReqs = reqState.data?.total > 0;
  const hasRealLists = listState.data?.total > 0;

  const liveRequests = hasRealReqs ? realReqs : sampleRequests.slice(0, 3);
  const recentDeals = hasRealLists ? realLists.slice(0, 6) : samples.slice(0, 6);
  const freshArrivals = hasRealLists ? realLists.slice(6, 14) : samples.slice(6, 14);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [catOpen, setCatOpen] = useState(false);

  // Use shared search state from actions (synced with header search)
  const searchQ = actions.searchQuery;
  const setSearchQ = actions.setSearchQuery;
  const searchCategory = actions.searchCategory;
  const setSearchCategory = actions.setSearchCategory;

  const toggleSave = (id: string) => {
    if (!actions.user) { actions.open('listing-form'); return; }
    setSavedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    actions.perform('favorites/' + id, 'PUT', { saved: !savedIds.has(id) });
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setScrollToResults(true);
  };

  const scrollDeals = (dir: 'left' | 'right') => {
    const el = document.getElementById('deals-scroll');
    if (el) el.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  };

  // Live filter sample data by search query + category
  const filterItems = (items: typeof samples) =>
    items.filter(p =>
      (searchCategory === 'all' || p.category.toLowerCase() === searchCategory.toLowerCase()) &&
      (!searchQ || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(searchQ.toLowerCase()))
    );

  const filteredRecentDeals = filterItems(recentDeals);
  const filteredArrivals = filterItems(freshArrivals);
  const isSearching = searchQ.trim().length > 0 || searchCategory !== 'all';
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const [scrollToResults, setScrollToResults] = useState(false);

  useEffect(() => {
    if (scrollToResults && isSearching && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollToResults(false);
    }
  }, [scrollToResults, isSearching]);

  const HERO_CATS = ['All Categories', 'Clothes', 'Electronics', 'Furniture', 'Sports', 'Books', 'Cameras', 'Automobiles', 'Kitchen', 'Jewelry', 'Kids', 'Art', 'Accessories'];

  return (
    <div className="hp-root">

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-hero-content">
          <h1 className="hp-hero-title">Find what you need. Sell what you don&apos;t.</h1>
          <p className="hp-hero-sub">
            Buy new and pre-loved products or post a request and let<br />sellers come to you.
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
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
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
            <p>List your item in minutes and reach thousands of buyers.</p>
            <button className="hp-banner-btn hp-banner-btn-orange" onClick={() => actions.open('listing-form')}>
              Sell Now <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="hp-banner-illus hp-banner-illus-orange"><Package size={48} /></div>
        </div>
      </section>

      <div className="hp-body">

        {/* ── LIVE SEARCH RESULTS (shown when searching) ── */}
        {isSearching && (
          <section ref={searchResultsRef} className="hp-section hp-search-results">
            <div className="hp-section-head">
              <div className="hp-section-title-wrap">
                <Search size={18} className="hp-zap-icon" />
                <h2 className="hp-section-title">
                  {searchQ ? `Results for "${searchQ}"` : `Category: ${searchCategory}`}
                </h2>
              </div>
              <button className="hp-see-all hp-clear-search" onClick={() => { setSearchQ(''); setSearchCategory('all'); }}>
                ✕ Clear search
              </button>
            </div>
            {[...filteredRecentDeals, ...filteredArrivals].length === 0 ? (
              <div className="hp-no-results">
                <Search size={32} />
                <p>No results found for &ldquo;{searchQ}&rdquo;{searchCategory !== 'all' ? ` in ${searchCategory}` : ''}.</p>
                <button className="hp-cta-secondary" onClick={() => { setSearchQ(''); setSearchCategory('all'); }}>Clear filters</button>
              </div>
            ) : (
              <div className="hp-arrivals-grid">
                {[...new Map([...filteredRecentDeals, ...filteredArrivals].map(i => [i.id, i])).values()].map(item => (
                  <ProductCard key={item.id} item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* EXPLORE CATEGORIES */}
        {!isSearching && (
        <section className="hp-section">
          <div className="hp-section-head">
            <h2 className="hp-section-title">Explore Categories</h2>
            <button className="hp-see-all" onClick={() => actions.go('Explore')}>See All <ChevronRight size={14} /></button>
          </div>
          <div className="hp-categories-grid">
            {categories.map(cat => <CategoryIcon key={cat.name} cat={cat} onClick={() => setSearchCategory(cat.name)} />)}
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
            <button className="hp-see-all" onClick={() => actions.go('BuyerRequests')}>View All <ChevronRight size={14} /></button>
          </div>
          <div className="hp-requests-list">
            {liveRequests.map(req => (
              <RequestCard key={req.id} item={req} onOffer={() => actions.open('offer-form', req)} />
            ))}
          </div>
        </section>

        {/* FEATURED SPOTLIGHT */}
        <section className="hp-spotlight">
          <div className="hp-spotlight-badges">
            <span className="hp-spotlight-badge">Featured</span>
            <span className="hp-spotlight-badge hp-badge-hot">🔥 Hot Pick</span>
          </div>
          <div className="hp-spotlight-inner">
            <div className="hp-spotlight-img-wrap">
              <Photo src={featuredSpotlight.image} alt={featuredSpotlight.title} />
            </div>
            <div className="hp-spotlight-info">
              <span className="hp-spotlight-eyebrow">Featured Spotlight</span>
              <h2 className="hp-spotlight-title">{featuredSpotlight.title}</h2>
              <p className="hp-spotlight-sub">{featuredSpotlight.subtitle}</p>
              <div className="hp-spotlight-price">{money(featuredSpotlight.price)}</div>
              <div className="hp-spotlight-meta">
                <span><MapPin size={13} /> {featuredSpotlight.location}</span>
                <span>{featuredSpotlight.seller} {featuredSpotlight.verified && <ShieldCheck size={13} />}</span>
              </div>
              <button className="hp-spotlight-buy" onClick={() => actions.open('listing', featuredSpotlight as unknown as Item)}>
                Buy Now <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* RECENT PRE-LOVED DEALS */}
        {!isSearching && (
        <section className="hp-section">
          <div className="hp-section-head">
            <h2 className="hp-section-title">Recent Pre-Loved Deals</h2>
            <div className="hp-scroll-btns">
              <button className="hp-scroll-btn" onClick={() => scrollDeals('left')} aria-label="Scroll left"><ChevronLeft size={16} /></button>
              <button className="hp-scroll-btn" onClick={() => scrollDeals('right')} aria-label="Scroll right"><ChevronRight size={16} /></button>
              <button className="hp-see-all" onClick={() => actions.go('Explore')}>See All <ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="hp-horizontal-scroll" id="deals-scroll">
            {filteredRecentDeals.length > 0 ? filteredRecentDeals.map(item => (
              <div key={item.id} className="hp-deal-card-wrap">
                <ProductCard item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} />
              </div>
            )) : recentDeals.map(item => (
              <div key={item.id} className="hp-deal-card-wrap">
                <ProductCard item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} />
              </div>
            ))}
          </div>
        </section>
        )}

        {/* FRESH ARRIVALS */}
        {!isSearching && (
        <section className="hp-section">
          <div className="hp-section-head">
            <div className="hp-section-title-wrap">
              <Zap size={18} className="hp-zap-icon" />
              <h2 className="hp-section-title">Fresh Arrivals</h2>
            </div>
            <button className="hp-see-all" onClick={() => actions.go('Explore')}>See All <ChevronRight size={14} /></button>
          </div>
          <div className="hp-arrivals-grid">
            {filteredArrivals.length > 0 ? filteredArrivals.map(item => (
              <ProductCard key={item.id} item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} />
            )) : freshArrivals.map(item => (
              <ProductCard key={item.id} item={item} saved={savedIds.has(item.id)} onSave={() => toggleSave(item.id)} onClick={() => actions.open('listing', item)} />
            ))}
          </div>
        </section>
        )}

        {/* CAN'T FIND SECTION */}
        <section className="hp-cant-find">
          <div className="hp-cant-find-left">
            <h2>Can&apos;t find what you&apos;re looking for?</h2>
            <p>Tell us what you need and let thousands of verified sellers come to you with the best offers.</p>
            <div className="hp-cant-steps">
              <div className="hp-cant-step">
                <span className="hp-step-num">1</span>
                <div><strong>Post Your Request</strong><p>Describe exactly what you need with your budget.</p></div>
              </div>
              <div className="hp-cant-step">
                <span className="hp-step-num">2</span>
                <div><strong>Sellers Discover Your Request</strong><p>Verified sellers browse live requests and match them.</p></div>
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
            <h3>Looking for iPhone 15 Pro?</h3>
            <p className="hp-cf-sub">Popular searches right now</p>
            <div className="hp-cf-tags">
              {['iPhone 15 Pro', 'MacBook Air', 'PS5', 'Nike Jordan', 'Canon DSLR', 'Sofa Set', 'Office Chair', 'Samsung Galaxy'].map(t => (
                <button key={t} className="hp-cf-tag" onClick={() => actions.go('Explore')}>{t}</button>
              ))}
            </div>
            <div className="hp-trust-stats">
              <div className="hp-trust-stat"><strong>10K+</strong><span>Active Listings</span></div>
              <div className="hp-trust-stat"><strong>5K+</strong><span>Verified Sellers</span></div>
              <div className="hp-trust-stat"><strong>50+</strong><span>Cities</span></div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
