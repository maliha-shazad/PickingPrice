import { useState, useEffect } from 'react';
import { ChevronRight, Heart, Star, CheckCircle2, ShieldCheck, MessageCircle, MapPin, Search, ChevronDown, X, Shirt, Monitor, Sofa, Dumbbell, BookOpen, Camera, Car, Utensils, Gem, Baby, Paintbrush, Package, ArrowRight, Timer, CheckCheck, FileCheck, Plus, SlidersHorizontal } from 'lucide-react';
import { Actions, Photo, useLoadAll, DELIVERY_OPTIONS, offersDelivery, sellerScore } from './ui';
import { samples } from '../samples';


export function PreLoved({ actions }: { actions: Actions }) {
  const formatMoney = (n: number) => new Intl.NumberFormat('en-PK').format(n);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<string>('Best Condition First');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string[]>([]);
  const toggleDelivery = (d: string) => setSelectedDelivery(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const toggleWishlist = (id: string) => {
    if (!actions.user) {
      actions.open('login');
      return;
    }
    const isSaved = wishlist.includes(id);
    setWishlist(prev => isSaved ? prev.filter(i => i !== id) : [...prev, id]);
    actions.perform('favorites/' + id, 'PUT', { saved: !isSaved });
  };

  const resetFilters = () => {
    setSelectedArea('');
    setSelectedConditions([]);
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setSort('Best Condition First');
    setSelectedDelivery([]);
  };

  const toggleCondition = (cond: string) => {
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const currentCity = actions.location && actions.location !== 'all' ? actions.location : 'Lahore';
  
  const getAreasForCity = (city: string) => {
    switch (city) {
      case 'Lahore': return ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Wapda Town'];
      case 'Karachi': return ['Clifton', 'DHA', 'Gulshan', 'Tariq Road', 'Nazimabad'];
      case 'Islamabad': return ['F-7/F-8', 'G-9/G-11', 'Blue Area', 'Bahria Town', 'DHA'];
      case 'Rawalpindi': return ['Saddar', 'Bahria Town', 'Satellite Town', 'Commercial Market', 'DHA'];
      case 'Faisalabad': return ['D-Ground', 'Kohinoor', 'Peoples Colony', 'Samanabad', 'Gulberg'];
      case 'Multan': return ['Gulgasht', 'Cantt', 'Bosan Road', 'Shah Rukn-e-Alam', 'Wapda Town'];
      case 'Peshawar': return ['Hayatabad', 'University Rd', 'Saddar', 'Town', 'Cantt'];
      default: return ['Center', 'North', 'South', 'East', 'West'];
    }
  };

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cloth') || n.includes('apparel') || n.includes('fashion') || n.includes('shoe')) return <Shirt size={14} />;
    if (n.includes('electronic') || n.includes('tech') || n.includes('computer') || n.includes('laptop') || n.includes('phone') || n.includes('audio')) return <Monitor size={14} />;
    if (n.includes('furnitur') || n.includes('home')) return <Sofa size={14} />;
    if (n.includes('sport') || n.includes('gym')) return <Dumbbell size={14} />;
    if (n.includes('book') || n.includes('stationery')) return <BookOpen size={14} />;
    if (n.includes('camera') || n.includes('photo')) return <Camera size={14} />;
    if (n.includes('car') || n.includes('auto') || n.includes('vehicle')) return <Car size={14} />;
    if (n.includes('kitchen') || n.includes('appliance')) return <Utensils size={14} />;
    if (n.includes('jewel') || n.includes('watch') || n.includes('accessor')) return <Gem size={14} />;
    if (n.includes('kid') || n.includes('toy') || n.includes('baby')) return <Baby size={14} />;
    if (n.includes('art') || n.includes('craft')) return <Paintbrush size={14} />;
    return <Package size={14} />;
  };
  
  const areas = getAreasForCity(currentCity);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const state = useLoadAll('listings', actions.revision);
  const realListings = state.data?.items || [];
  const hasRealData = state.data?.total > 0;
  const sourceData = hasRealData ? realListings : samples;

  let filtered = sourceData.filter((p: any) => p.condition !== 'New').filter((p: any) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
    if (minPrice && p.price < parseInt(minPrice)) return false;
    if (maxPrice && p.price > parseInt(maxPrice)) return false;
    if (selectedArea && p.location !== currentCity) return false;
    if (!offersDelivery(p, selectedDelivery)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === 'Price: Low to High') return a.price - b.price;
    if (sort === 'Price: High to Low') return b.price - a.price;
    if (sort === 'Newest') return new Date(b.created).getTime() - new Date(a.created).getTime();
    if (sort === 'Best Condition First') {
      const order = { 'New': 1, 'Like New': 2, 'Good': 3, 'Fair': 4, 'Used': 5 };
      return (order[a.condition as keyof typeof order] || 9) - (order[b.condition as keyof typeof order] || 9);
    }
    return 0;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedConditions, minPrice, maxPrice, selectedArea, selectedDelivery, sort]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="pl-root">
      {/* Breadcrumb bar */}
      <div className="pl-breadbar">
        <div className="pl-breadbar-inner">
          <div className="pl-breadcrumb">
            <button onClick={() => actions.go('Explore')}>Home</button> <ChevronRight size={13} /> 
            <button onClick={() => actions.go('Explore')}>Marketplace</button> <ChevronRight size={13} /> 
            <span className="pl-bread-active">Pre-Loved Deals</span>
          </div>
          <div className="pl-brand-switch">
            ✨ Looking for Brand New? <button className="pl-switch-btn" onClick={() => actions.go('BrandNew')}>Switch to Brand New Catalog &rarr;</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="pl-hero-wrap">
        <div className="pl-hero">
          <div>
            <h1 className="pl-hero-title">Discover Pre-Loved Deals Near You</h1>
            <p className="pl-hero-sub">Explore pre-loved products with clear condition details, and inspect them in person before you pay.</p>
          </div>
          <div className="pl-hero-right">
            <div className="pl-trust-pills">
              <span className="pl-trust-pill"><ShieldCheck size={14}/> Physical Check Before Pay</span>
              <span className="pl-trust-pill"><CheckCircle2 size={14}/> Zero Platform Fee</span>
            </div>
            <div className="pl-trust-pills">
              <span className="pl-trust-pill"><Search size={14}/> Condition on Every Item</span>
              <span className="pl-trust-pill"><MapPin size={14}/> Meet in Public Places</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pl-body-wrap">
        <div className="pl-body">
          {/* Sidebar */}
          <button className={`pl-sidebar-toggle${filtersOpen ? ' open' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}>
            <span style={{display:'flex',alignItems:'center',gap:'8px'}}><SlidersHorizontal size={16}/> Filters</span>
            <ChevronDown size={16}/>
          </button>
          <aside className={`pl-sidebar${filtersOpen ? '' : ' collapsed'}`}>
            <div className="pl-sidebar-header">
              <div className="pl-sidebar-title"><SlidersHorizontal size={16} /> Filter Products</div>
              <button className="pl-reset-btn" onClick={resetFilters}>Reset All</button>
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Categories</div>
              <button 
                className={`pl-cat-row ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <span className="pl-cat-icon"><Package size={14} /></span>
                <span className="pl-cat-name">All Categories</span>
                <span className="pl-count"></span>
              </button>
              {actions.categories.map(cat => (
                <button 
                  key={cat.id || cat.name}
                  className={`pl-cat-row ${selectedCategory === cat.name ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <span className="pl-cat-icon">{getCategoryIcon(cat.name)}</span>
                  <span className="pl-cat-name">{cat.name}</span>
                  <span className="pl-count"></span>
                </button>
              ))}
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">{currentCity} Radius {selectedArea && <span className="pl-active-badge">Active</span>}</div>
              <div className="pl-area-pills">
                {areas.map(area => (
                  <button 
                    key={area}
                    className={`pl-area-pill ${selectedArea === area ? 'active' : ''}`}
                    onClick={() => setSelectedArea(selectedArea === area ? '' : area)}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Condition Grade</div>
              {['Like New', 'Good', 'Fair', 'Used'].map(cond => (
                <label className="pl-checkbox-row" key={cond}>
                  <input 
                    type="checkbox" 
                    checked={selectedConditions.includes(cond)}
                    onChange={() => toggleCondition(cond)} 
                  />
                  <span className="pl-checkbox-label">{cond}</span>
                </label>
              ))}
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Price Range (PKR)</div>
              <div className="pl-price-inputs">
                <input type="text" className="pl-price-input" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <span className="pl-price-sep">-</span>
                <input type="text" className="pl-price-input" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Delivery & Pickup</div>
              {DELIVERY_OPTIONS.map(d => (
                <label className="pl-checkbox-row" key={d}>
                  <input type="checkbox" checked={selectedDelivery.includes(d)} onChange={() => toggleDelivery(d)} />
                  <span className="pl-checkbox-label">{d}</span>
                </label>
              ))}
            </div>

          </aside>

          {/* Main List */}
          <div>
            <div className="pl-feed-header pl-feed-inline">
              <div>
                <h2 className="pl-feed-title">Explore Pre-Loved Deals</h2>
                <p className="pl-feed-sub">Check the product before you buy.</p>
              </div>
              <div className="pl-sort-wrap">
                <span className="pl-sort-label">Sort by:</span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select 
                    className="pl-sort-btn" 
                    style={{ cursor: 'pointer', appearance: 'none', paddingRight: '24px' }}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="Best Condition First">Best Condition First</option>
                    <option value="Newest">Newest</option>
                    <option value="Price: Low to High">Price: Low to High</option>
                    <option value="Price: High to Low">Price: High to Low</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#2d6a4f' }} />
                </div>
              </div>
            </div>

            <div className="pl-active-chips">
              {selectedConditions.length > 0 && <span className="pl-chip">Condition: {selectedConditions.join(', ')} <button className="pl-chip-x" onClick={() => setSelectedConditions([])}><X size={10}/></button></span>}
              {selectedArea && <span className="pl-chip">Area: {selectedArea} <button className="pl-chip-x" onClick={() => setSelectedArea('')}><X size={10}/></button></span>}
              {selectedCategory !== 'all' && <span className="pl-chip">Category: {selectedCategory} <button className="pl-chip-x" onClick={() => setSelectedCategory('all')}><X size={10}/></button></span>}
              {minPrice && maxPrice && <span className="pl-chip">Rs. {minPrice} - {maxPrice} <button className="pl-chip-x" onClick={() => {setMinPrice(''); setMaxPrice('');}}><X size={10}/></button></span>}
              {selectedDelivery.map(d => <span className="pl-chip" key={d}>{d} <button className="pl-chip-x" onClick={() => toggleDelivery(d)}><X size={10}/></button></span>)}
              {(selectedConditions.length > 0 || selectedArea || selectedCategory !== 'all' || minPrice || maxPrice || selectedDelivery.length > 0) && <button className="pl-chip-clear" onClick={resetFilters}>Clear All</button>}
            </div>

            <div className="pl-grid">
              {paginatedProducts.map(p => (
                <article className="pl-card" key={p.id} style={{ cursor: 'pointer' }} onClick={() => actions.open('listing', p)}>
                  <div className="pl-card-img-wrap">
                    <Photo src={Array.isArray((p as any).images) && (p as any).images.length ? (p as any).images[0] : (p as any).image} alt={p.title} />
                    <span className="pl-card-cond-pill">{p.condition}</span>
                    {!!(p as any).verified && <span className="pl-card-detail-pill"><ShieldCheck size={10} style={{display:'inline', marginRight: 2}}/> Verified Seller</span>}
                    <button className="pl-heart-btn" onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}>
                      <Heart size={16} fill={wishlist.includes(p.id) ? '#ef4444' : 'none'} color={wishlist.includes(p.id) ? '#ef4444' : 'currentColor'} />
                    </button>
                  </div>
                  <div className="pl-card-body">
                    <div className="pl-card-catrow">
                      <span className="pl-card-cat">{p.category}</span>
                      {p.featured ? (
                         <span className="pl-card-badge" style={{color: '#0d9488', background: '#ccfbf1'}}>Featured</span>
                      ) : p.condition === 'New' ? (
                         <span className="pl-card-badge" style={{color: '#2563eb', background: '#dbeafe'}}>New Arrival</span>
                      ) : (
                         <span className="pl-card-badge" style={{color: '#0d9488', background: '#ccfbf1'}}>Pre-Loved</span>
                      )}
                    </div>
                    <h3 className="pl-card-title">{p.title}</h3>
                    <div className="pl-card-price-row">
                      <span className="pl-card-price">Rs. {formatMoney(p.price)}</span>
                    </div>
                    <div className="pl-card-ref">{(p as any).brand ? 'Brand: ' + (p as any).brand : 'Condition: ' + p.condition}</div>
                    
                    <div className="pl-card-seller">
                      <div className="pl-seller-avatar">{p.seller.charAt(0)}</div>
                      <div className="pl-seller-info">
                        <span className="pl-seller-name">{p.seller}</span>
                        <span className="pl-seller-loc">{p.location}</span>
                      </div>
                      <div className="pl-seller-rating">
                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                        <span>{sellerScore(p as any)}</span>
                      </div>
                    </div>
                    
                    <div className="pl-card-actions">
                      <button className="pl-btn-inspect" onClick={(e) => { e.stopPropagation(); actions.open('listing', p); }}>Inspect Specs</button>
                      <button className="pl-btn-chat" onClick={async (e) => { 
                        e.stopPropagation(); 
                        const r = await actions.perform('conversations', 'POST', { contextType: 'listing', contextId: p.id });
                        if (r) actions.open('conversation', { id: r.id });
                      }}><MessageCircle size={14}/> Chat / Offer</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pl-pagination">
                <button className="pl-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>&larr; Previous</button>
                <div className="pl-page-nums">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i} 
                      className={`pl-page-num ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button className="pl-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>Next &rarr;</button>
              </div>
            )}

            {/* Request Banner */}
            <div className="pl-cta-banner" style={{ marginTop: '40px' }}>
              <div className="pl-cta-left">
                <div className="pl-cta-badge" style={{ background: '#ffedd5', padding: '4px 10px', borderRadius: '12px' }}>
                  <div className="pl-cta-dot"></div> Buyer Requests
                </div>
                <h2 className="pl-cta-title">Can't Find Your Exact Pre-Loved Item?</h2>
                <p className="pl-cta-desc">Post an On-Demand Buyer Request — Tell us what you need, your preferred condition, and your budget.<br/>Let sellers respond with suitable pre-loved products.</p>
                <div className="pl-cta-stats">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Timer size={14} color="#0d5c45" /> Free to post</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCheck size={14} color="#0d5c45" /> Sellers send their offers to you</span>
                </div>
              </div>
              <div className="pl-cta-right">
                <button className="pl-cta-btn" onClick={() => actions.open('request-form')}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', marginRight: '4px' }}>
                    <CheckCircle2 size={22} />
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-4px', background: '#ea580c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={14} strokeWidth={4} />
                    </div>
                  </div>
                  Post Pre-Loved Request
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// force refresh
