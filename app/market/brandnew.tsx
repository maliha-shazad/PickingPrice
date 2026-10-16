import { useState, useEffect } from 'react';
import { ChevronRight, Heart, Star, ShieldCheck, ChevronDown, X, Shirt, Monitor, Camera, Package, FileCheck, MessageSquare, Home, Sofa, Dumbbell, BookOpen, Car, Utensils, Gem, Baby, Paintbrush, FilePlus, BadgeDollarSign, SlidersHorizontal } from 'lucide-react';
import { Actions, Photo, useLoadAll, offersDelivery, sellerScore, inCity, inArea, NoneInCity, CityHeading, ListLoading, sellerProps } from './ui';
import { samples } from '../samples';

export function BrandNew({ actions }: { actions: Actions }) {
  const formatMoney = (n: number) => new Intl.NumberFormat('en-PK').format(n);
  
  const [selectedWarranty, setSelectedWarranty] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<string>('Featured First');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');

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
    setSelectedWarranty([]);
    setSelectedBrands([]);
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setSort('Featured First');
    setSelectedDelivery([]);
    setSelectedArea('');
  };

  // The city chosen in the header ('' when every city is shown).
  const currentCity = actions.location && actions.location !== 'all' ? actions.location : '';

  const getAreasForCity = (city: string) => {
    switch (city) {
      case 'Lahore': return ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Wapda Town'];
      case 'Karachi': return ['Clifton', 'DHA', 'Gulshan', 'Tariq Road', 'Nazimabad'];
      case 'Islamabad': return ['F-7/F-8', 'G-9/G-11', 'Blue Area', 'Bahria Town', 'DHA'];
      case 'Rawalpindi': return ['Saddar', 'Bahria Town', 'Satellite Town', 'Commercial Market', 'DHA'];
      case 'Faisalabad': return ['D-Ground', 'Kohinoor', 'Peoples Colony', 'Samanabad', 'Gulberg'];
      case 'Multan': return ['Gulgasht', 'Cantt', 'Bosan Road', 'Shah Rukn-e-Alam', 'Wapda Town'];
      case 'Peshawar': return ['Hayatabad', 'University Rd', 'Saddar', 'Town', 'Cantt'];
      default: return [];
    }
  };

  const areas = getAreasForCity(currentCity);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleWarranty = (w: string) => setSelectedWarranty(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  const toggleBrand = (b: string) => setSelectedBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  const toggleDelivery = (d: string) => setSelectedDelivery(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const state = useLoadAll('listings', actions.revision);
  const realListings = state.data?.items || [];
  const loaded = !!state.data || !!state.error;
  // Samples only once the site is known to have no real listing; nothing (a placeholder) while that is still loading.
  // Only the chosen city's products, whether they are members' listings or the samples.
  // New products only: samples until a real New product exists (real pre-loved products do not hide them).
  const realNewOnly = realListings.filter((p: any) => p.condition === 'New');
  const sourceData = (!loaded ? [] : realNewOnly.length ? realNewOnly : samples.filter(p => p.condition === 'New')).filter((p: any) => inCity(p.location, actions.location));
  useEffect(() => { setSelectedArea(''); }, [actions.location]);

  const filtered = sourceData.filter((p: any) => p.condition === 'New').filter((p: any) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (minPrice && p.price < parseInt(minPrice)) return false;
    if (maxPrice && p.price > parseInt(maxPrice)) return false;
    if (selectedBrands.length > 0 && !selectedBrands.includes((p as any).brand || '')) return false;
    if (selectedWarranty.length > 0 && !selectedWarranty.includes((p as any).warranty || '')) return false;
    if (!inArea(p.location, selectedArea)) return false;
    if (!offersDelivery(p, selectedDelivery)) return false;
    return true;
  });

  // Brand, warranty and price options come from the products actually on this page.
  const newProducts = sourceData.filter((p: any) => p.condition === 'New');
  
  const dynamicBrackets = [
    { label: 'Under 1k', min: 0, max: 1000 },
    { label: '1k - 5k', min: 1000, max: 5000 },
    { label: '5k - 25k', min: 5000, max: 25000 },
    { label: '25k+', min: 25000, max: Infinity }
  ].filter(b => newProducts.some(p => p.price >= b.min && p.price < b.max));

  const availableBrands = Array.from(new Set(
    newProducts.filter(p => (p as any).brand).map(p => (p as any).brand as string)
  )).map(name => ({
    name,
    count: newProducts.filter(p => (p as any).brand === name).length
  }));

  const availableWarranties = Array.from(new Set(
    newProducts.filter(p => (p as any).warranty).map(p => (p as any).warranty as string)
  )).map(name => ({
    name,
    count: newProducts.filter(p => (p as any).warranty === name).length
  }));

  filtered.sort((a, b) => {
    if (sort === 'Price: Low to High') return a.price - b.price;
    if (sort === 'Price: High to Low') return b.price - a.price;
    if (sort !== 'Newest' && !!(b as any).featured !== !!(a as any).featured) return (b as any).featured ? 1 : -1;
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedWarranty, selectedBrands, minPrice, maxPrice, sort, selectedDelivery, selectedArea]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const setPriceRange = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  return (
    <div className="pl-root">
      {/* Breadcrumb bar */}
      <div className="pl-breadbar">
        <div className="pl-breadbar-inner">
          <div className="pl-breadcrumb">
            <button onClick={() => actions.go('Explore')}><Home size={13} style={{marginRight: 4, display: 'inline', verticalAlign: 'text-bottom'}}/> Home</button> <ChevronRight size={13} /> 
            <button onClick={() => actions.go('Explore')}>Marketplace</button> <ChevronRight size={13} /> 
            <span className="pl-bread-active">Brand New Products</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bn-hero-wrap">
        <div className="bn-hero">
          <div className="bn-hero-left">
            <div className="bn-hero-badge">BRAND NEW PRODUCTS</div>
            <h1 className="bn-hero-title">Brand New Products<br/>from Sellers<br/>Across Pakistan</h1>
            <p className="bn-hero-sub">Browse unused items listed by sellers. Check the product, its packing and any warranty with the seller before you pay.</p>
          </div>
          <div className="bn-hero-right">
            <div className="bn-hero-card">
              <div className="bn-hero-card-icon"><Package size={16} color="#6ee7b7" /> UNUSED</div>
              <h4>New Condition Only</h4>
              <p>Every item here is listed as New</p>
            </div>
            <div className="bn-hero-card">
              <div className="bn-hero-card-icon"><FileCheck size={16} color="#6ee7b7" /> DIRECT</div>
              <h4>Chat with the Seller</h4>
              <p>Ask your questions before you buy</p>
            </div>
            <div className="bn-hero-card">
              <div className="bn-hero-card-icon"><ShieldCheck size={16} color="#6ee7b7" /> SAFE</div>
              <h4>Inspect First</h4>
              <p>Meet in a public place</p>
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

            <div className="bn-filter-section">
              <div className="bn-filter-label">CATEGORIES</div>
              <button 
                className={`bn-cat-row ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center' }}
              >
                <span className="bn-cat-icon"><Package size={14} /></span>
                <span className="bn-cat-name">All Categories</span>
                <span className="bn-cat-count"></span>
              </button>
              {actions.categories.map(cat => {
                const getIcon = (name: string) => {
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
                return (
                  <button 
                    key={cat.id || cat.name}
                    className={`bn-cat-row ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                    style={{ textAlign: 'left', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="bn-cat-icon">{getIcon(cat.name)}</span>
                    <span className="bn-cat-name">{cat.name}</span>
                    <span className="bn-cat-count"></span>
                  </button>
                );
              })}
            </div>

            {areas.length > 0 && <div className="bn-filter-section">
              <div className="bn-filter-label">{currentCity} Radius {selectedArea && <span className="pl-active-badge">Active</span>}</div>
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
            </div>}

            {availableWarranties.length > 0 && <div className="bn-filter-section">
              <div className="bn-filter-label">SEAL & WARRANTY</div>
              {availableWarranties.map(w => (
                <label className="bn-checkbox-row" key={w.name}>
                  <input type="checkbox" checked={selectedWarranty.includes(w.name)} onChange={() => toggleWarranty(w.name)} />
                  <span className="bn-checkbox-label">{w.name} ({w.count})</span>
                </label>
              ))}
            </div>}



            <div className="bn-filter-section">
              <div className="bn-filter-label">PRICE RANGE (PKR)</div>
              <div className="bn-price-inputs" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div className="bn-price-input-inner" style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', flex: 1 }}>
                  <input type="text" className="bn-price-input" style={{ width: '100%', border: 'none', outline: 'none', background: 'none', padding: '8px 0', fontSize: '13px', fontWeight: 'normal', color: '#64748b' }} value={minPrice} placeholder="Min" onChange={e => setMinPrice(e.target.value.replace(/,/g, ''))} />
                </div>
                <span style={{ color: '#94a3b8' }}>-</span>
                <div className="bn-price-input-inner" style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', flex: 1 }}>
                  <input type="text" className="bn-price-input" style={{ width: '100%', border: 'none', outline: 'none', background: 'none', padding: '8px 0', fontSize: '13px', fontWeight: 'normal', color: '#64748b' }} value={maxPrice} placeholder="Max" onChange={e => setMaxPrice(e.target.value.replace(/,/g, ''))} />
                </div>
              </div>
              <div className="bn-price-pills">
                {dynamicBrackets.map(b => (
                  <button key={b.label} className={minPrice === b.min.toString() && maxPrice === (b.max === Infinity ? '' : b.max.toString()) ? 'active' : ''} onClick={() => setPriceRange(b.min.toString(), b.max === Infinity ? '' : b.max.toString())}>{b.label}</button>
                ))}
              </div>
            </div>

            {availableBrands.length > 0 && <div className="bn-filter-section">
              <div className="bn-filter-label">BRAND</div>
              <div className="bn-brand-grid">
                {availableBrands.map(brand => (
                  <label className="bn-checkbox-row" key={brand.name}>
                    <input type="checkbox" checked={selectedBrands.includes(brand.name)} onChange={() => toggleBrand(brand.name)} />
                    <span className="bn-checkbox-label">{brand.name} ({brand.count})</span>
                  </label>
                ))}
              </div>
            </div>}

            <div className="bn-filter-section">
              <div className="bn-filter-label">DELIVERY & PICKUP</div>
              <label className="bn-checkbox-row" style={{alignItems: 'center'}}>
                <input type="checkbox" checked={selectedDelivery.includes('Same-Day Delivery')} onChange={() => toggleDelivery('Same-Day Delivery')} />
                <span className="bn-checkbox-label">Same-Day Delivery</span>
              </label>
              <label className="bn-checkbox-row" style={{alignItems: 'center'}}>
                <input type="checkbox" checked={selectedDelivery.includes('In-Store Pickup')} onChange={() => toggleDelivery('In-Store Pickup')} />
                <span className="bn-checkbox-label">In-Store Pickup</span>
              </label>
              <label className="bn-checkbox-row" style={{alignItems: 'center'}}>
                <input type="checkbox" checked={selectedDelivery.includes('Nationwide Delivery')} onChange={() => toggleDelivery('Nationwide Delivery')} />
                <span className="bn-checkbox-label">Nationwide Delivery</span>
              </label>
            </div>
            
            <div className="bn-sidebar-footer">
              <ShieldCheck size={16} color="#0d5c45" /> All listed merchants have signed a legal declaration to supply original unopened stock only.
            </div>

          </aside>

          {/* Main List */}
          <div style={{flex: 1}}>
            <CityHeading actions={actions} />
            <div className="pl-feed-header">
              <div style={{display:'flex', alignItems: 'center', gap: '8px'}}>
                <h2 className="pl-feed-title" style={{fontSize: '18px', margin: 0}}>Showing {filtered.length} Brand New items in {currentCity || 'Pakistan'}</h2>
              </div>
              <div className="pl-sort-wrap">
                <span className="pl-sort-label">Sort by:</span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select 
                    className="pl-sort-btn" 
                    style={{ cursor: 'pointer', appearance: 'none', paddingRight: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="Featured First">Premium First</option>
                    <option value="Newest">Newest First</option>
                    <option value="Price: Low to High">Price: Low to High</option>
                    <option value="Price: High to Low">Price: High to Low</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                </div>
              </div>
            </div>

            <div className="bn-active-filters-row">
              <div className="bn-active-chips">
                {selectedArea && (
                  <span className="bn-chip">Area: {selectedArea} <button className="bn-chip-x" onClick={() => setSelectedArea('')}><X size={10}/></button></span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="bn-chip">{selectedCategory} <button className="bn-chip-x" onClick={() => setSelectedCategory('all')}><X size={10}/></button></span>
                )}
                {selectedWarranty.map(w => (
                  <span className="bn-chip" key={w}>{w} <button className="bn-chip-x" onClick={() => toggleWarranty(w)}><X size={10}/></button></span>
                ))}
                {selectedBrands.map(b => (
                  <span className="bn-chip" key={b}>{b} <button className="bn-chip-x" onClick={() => toggleBrand(b)}><X size={10}/></button></span>
                ))}
                {selectedDelivery.map(d => (
                  <span className="bn-chip" key={d}>{d} <button className="bn-chip-x" onClick={() => toggleDelivery(d)}><X size={10}/></button></span>
                ))}
                {(minPrice || maxPrice) && (
                  <span className="bn-chip">Rs. {minPrice || '0'} - {maxPrice || 'Any'} <button className="bn-chip-x" onClick={() => setPriceRange('', '')}><X size={10}/></button></span>
                )}
                {(selectedArea || selectedCategory !== 'all' || selectedWarranty.length > 0 || selectedBrands.length > 0 || selectedDelivery.length > 0 || minPrice || maxPrice) && (
                  <button className="bn-chip-clear" onClick={resetFilters}>Clear all</button>
                )}
              </div>
            </div>

            <div className="bn-grid">
              {paginatedProducts.map((p, i) => (
                <article className="pl-card" key={p.id} style={{ cursor: 'pointer' }} onClick={() => actions.open('listing', p)}>
                  <div className="bn-card-img-wrap">
                    {/* Members' own listings carry a list of photos; the sample products carry a single image. */}
                    <Photo src={Array.isArray((p as any).images) && (p as any).images.length ? (p as any).images[0] : (p as any).image} alt={p.title} />
                    <div className="bn-card-badges-top">
                      <span className="bn-badge-dark"><ShieldCheck size={10} /> Brand New</span>
                      {/* Only a warranty the product really states. */}
                      {!!(p as any).warranty && <span className="bn-badge-light" style={{color: i % 2 === 0 ? '#0d5c45' : '#ea580c', background: i % 2 === 0 ? '#d1fae5' : '#ffedd5'}}>{String((p as any).warranty)}</span>}
                    </div>
                    <button className="bn-heart-btn" onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}>
                      <Heart size={16} fill={wishlist.includes(p.id) ? '#ef4444' : 'none'} color={wishlist.includes(p.id) ? '#ef4444' : '#9ca3af'} />
                    </button>
                  </div>
                  <div className="pl-card-body">
                    <div className="pl-card-catrow">
                      <span className="pl-card-cat">{p.category.toUpperCase()} • NEW</span>
                    </div>
                    <h3 className="pl-card-title">{p.title}</h3>
                    <div className="pl-card-price-row">
                      <span className="pl-card-price">Rs. {formatMoney(p.price)}</span>
                    </div>
                    <div className="pl-card-ref">{(p as any).brand ? 'Brand: ' + (p as any).brand : 'Brand new, unused'}</div>
                    
                    <div {...sellerProps(actions, p as any, 'pl-card-seller')}>
                      <div className="pl-seller-avatar" style={{ background: '#0d5c45', color: '#fff' }}>{p.seller.charAt(0)}</div>
                      <div className="pl-seller-info">
                        <span className="pl-seller-name">{!!(p as any).verified && <ShieldCheck size={12} color="#0d5c45" style={{display:'inline', marginRight: 2}}/>} {p.seller}</span>
                        <span className="pl-seller-loc">{p.location}</span>
                      </div>
                      <div className="pl-seller-rating">
                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                        <span>{sellerScore(p as any)}</span>
                      </div>
                    </div>
                    
                    <div className="pl-card-actions">
                      <button className="pl-btn-inspect" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}} onClick={async (e) => { e.stopPropagation(); const r = await actions.perform('conversations', 'POST', { contextType: 'listing', contextId: p.id }); if (r) actions.open('conversation', { id: r.id }); }}><MessageSquare size={14}/> Chat</button>
                      <button className="pl-btn-chat" onClick={(e) => { e.stopPropagation(); actions.open('listing', p); }}>Buy Now</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!loaded ? <ListLoading /> : filtered.length === 0 && (newProducts.length === 0
              ? <NoneInCity actions={actions} what="new products" />
              : <div className="pp-city-empty"><strong>No new products match these filters</strong><button type="button" onClick={resetFilters}>Reset filters</button></div>)}

            {totalPages > 1 && (
              <div className="pl-pagination" style={{justifyContent: 'space-between', borderTop: 'none', paddingTop: '24px', marginTop: '32px'}}>
                <div style={{color: '#6b7280', fontSize: '13px'}}>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} products</div>
                <div style={{display: 'flex', gap: '4px'}}>
                  <button className="pl-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} style={{color: '#cbd5e1'}}>&larr; Previous</button>
                  <div className="pl-page-nums">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button key={i} className={`pl-page-num ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                    ))}
                  </div>
                  <button className="pl-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} style={{color: '#0f172a', background: '#f1f5f9'}}>Next &rarr;</button>
                </div>
              </div>
            )}

            {/* Request Banner */}
            <div className="bn-cta-banner">
              <div className="bn-cta-left">
                <div className="bn-cta-badge">
                  <BadgeDollarSign size={12} /> BUYER REQUESTS
                </div>
                <h2 className="bn-cta-title" style={{ maxWidth: '420px', lineHeight: 1.2 }}>Can't Find the New Product You Want?</h2>
                <p className="bn-cta-desc" style={{ maxWidth: '500px' }}>Post a request with the product and the price you have in mind. Sellers who have it can send you their offers.</p>
              </div>
              <div className="bn-cta-right">
                <button className="bn-cta-btn-primary" onClick={() => actions.open('request-form')}>
                  <FilePlus size={16} /> Post a Request
                </button>
                <button className="bn-cta-btn-secondary" onClick={() => actions.open('info', { topic: 'help' })}>
                  How Requests Work
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
