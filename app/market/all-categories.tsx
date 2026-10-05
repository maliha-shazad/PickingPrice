import { useState, useEffect } from 'react';
import { ChevronRight, Heart, ShieldCheck, ChevronDown, X, Shirt, Monitor, Sofa, Dumbbell, BookOpen, Camera, Car, Utensils, Gem, Baby, Paintbrush, Package, Home, SlidersHorizontal, MessageCircle } from 'lucide-react';
import { Actions, useLoad, Photo, money, DELIVERY_OPTIONS, offersDelivery } from './ui';
import { samples } from '../samples';

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('cloth')) return <Shirt size={14} />;
  if (n.includes('electronic')) return <Monitor size={14} />;
  if (n.includes('furnitur')) return <Sofa size={14} />;
  if (n.includes('sport')) return <Dumbbell size={14} />;
  if (n.includes('book')) return <BookOpen size={14} />;
  if (n.includes('camera')) return <Camera size={14} />;
  if (n.includes('auto') || n.includes('car')) return <Car size={14} />;
  if (n.includes('kitchen')) return <Utensils size={14} />;
  if (n.includes('jewel') || n.includes('accessor')) return <Gem size={14} />;
  if (n.includes('kid') || n.includes('baby')) return <Baby size={14} />;
  if (n.includes('art')) return <Paintbrush size={14} />;
  return <Package size={14} />;
};

const FALLBACK_CATS = ['Clothes', 'Electronics', 'Furniture', 'Sports', 'Books', 'Cameras', 'Automobiles', 'Kitchen', 'Jewelry', 'Kids', 'Art', 'Accessories'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];
const PRICE_BRACKETS = [
  { label: 'Under 1k', min: 0, max: 1000 },
  { label: '1k - 5k', min: 1000, max: 5000 },
  { label: '5k - 25k', min: 5000, max: 25000 },
  { label: '25k+', min: 25000, max: Infinity },
];
const AREAS: Record<string, string[]> = {
  Lahore: ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Wapda Town'],
  Karachi: ['Clifton', 'DHA', 'Gulshan', 'Tariq Road', 'Nazimabad'],
  Islamabad: ['F-7/F-8', 'G-9/G-11', 'Blue Area', 'Bahria Town', 'DHA'],
  Rawalpindi: ['Saddar', 'Bahria Town', 'Satellite Town', 'Commercial Market', 'DHA'],
  Faisalabad: ['D-Ground', 'Kohinoor', 'Peoples Colony', 'Samanabad', 'Gulberg'],
  Multan: ['Gulgasht', 'Cantt', 'Bosan Road', 'Shah Rukn-e-Alam', 'Wapda Town'],
  Peshawar: ['Hayatabad', 'University Rd', 'Saddar', 'Town', 'Cantt'],
};
const toggled = (list: string[], value: string) => list.includes(value) ? list.filter(x => x !== value) : [...list, value];

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <span className="pl-chip">{label} <button className="pl-chip-x" aria-label={'Remove ' + label} onClick={onRemove}><X size={10}/></button></span>;
}

// Every filter offered on the New Products and Pre-Loved pages, over all products.
export function AllCategories({ actions }: { actions: Actions }) {
  const cats = actions.categories.length > 0
    ? actions.categories
    : FALLBACK_CATS.map(name => ({ id: name, name }));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string[]>([]);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const currentCity = actions.location && actions.location !== 'all' ? actions.location : 'Lahore';
  const areas = AREAS[currentCity] || ['Center', 'North', 'South', 'East', 'West'];

  const state = useLoad('listings?size=100', actions.revision);
  const realListings = (state.data?.items || []) as any[];
  const hasRealData = Number(state.data?.total) > 0;
  const sourceData: any[] = hasRealData ? realListings : samples;

  const options = (field: string) => Array.from(new Set(sourceData.map(p => p[field]).filter(Boolean) as string[]))
    .map(name => ({ name, count: sourceData.filter(p => p[field] === name).length }));
  const availableBrands = options('brand');
  const availableWarranties = options('warranty');
  const brackets = PRICE_BRACKETS.filter(b => sourceData.some(p => p.price >= b.min && p.price < b.max));

  const filtered = sourceData.filter((p: any) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
    if (minPrice && p.price < parseInt(minPrice)) return false;
    if (maxPrice && p.price > parseInt(maxPrice)) return false;
    if (selectedArea && p.location !== currentCity) return false;
    if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand || '')) return false;
    if (selectedWarranty.length > 0 && !selectedWarranty.includes(p.warranty || '')) return false;
    if (!offersDelivery(p, selectedDelivery)) return false;
    return true;
  });

  filtered.sort((a: any, b: any) => {
    if (sort === 'low') return a.price - b.price;
    if (sort === 'high') return b.price - a.price;
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });

  const itemsPerPage = 12;
  const total = filtered.length;
  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const items = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => { setPage(1); }, [selectedCategory, selectedArea, selectedConditions, minPrice, maxPrice, selectedWarranty, selectedBrands, selectedDelivery, sort]);

  const toggleWishlist = (id: string) => {
    if (!actions.user) { actions.open('login'); return; }
    const isSaved = wishlist.includes(id);
    setWishlist(prev => isSaved ? prev.filter(i => i !== id) : [...prev, id]);
    actions.perform('favorites/' + id, 'PUT', { saved: !isSaved });
  };

  const setPriceRange = (min: string, max: string) => { setMinPrice(min); setMaxPrice(max); };
  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedArea('');
    setSelectedConditions([]);
    setPriceRange('', '');
    setSelectedWarranty([]);
    setSelectedBrands([]);
    setSelectedDelivery([]);
    setSort('newest');
  };
  const anyFilter = selectedCategory !== 'all' || !!selectedArea || selectedConditions.length > 0 || !!minPrice || !!maxPrice || selectedWarranty.length > 0 || selectedBrands.length > 0 || selectedDelivery.length > 0;

  return (
    <div className="pl-root">
      <div className="pl-breadbar">
        <div className="pl-breadbar-inner">
          <div className="pl-breadcrumb">
            <button onClick={() => actions.go('Explore')}><Home size={13} style={{marginRight:4,display:'inline',verticalAlign:'text-bottom'}}/> Home</button>
            <ChevronRight size={13} />
            <span className="pl-bread-active">All Categories</span>
          </div>
        </div>
      </div>

      <div className="pl-hero-wrap">
        <div className="pl-hero">
          <div>
            <h1 className="pl-hero-title">Browse All Products</h1>
            <p className="pl-hero-sub">New and pre-loved products across all categories. Filter by condition, price, and more.</p>
          </div>
          <div className="pl-hero-right">
            <div className="pl-trust-pills">
              <span className="pl-trust-pill"><ShieldCheck size={14}/> Verified Sellers</span>
              <span className="pl-trust-pill"><Package size={14}/> {total} Products</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pl-body-wrap">
        <div className="pl-body">
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
              <button className={`pl-cat-row ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
                <span className="pl-cat-icon"><Package size={14} /></span>
                <span className="pl-cat-name">All Categories</span>
              </button>
              {cats.map((cat: any) => (
                <button key={cat.id || cat.name} className={`pl-cat-row ${selectedCategory === cat.name ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.name)}>
                  <span className="pl-cat-icon">{getCategoryIcon(cat.name)}</span>
                  <span className="pl-cat-name">{cat.name}</span>
                </button>
              ))}
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">{currentCity} Radius {selectedArea && <span className="pl-active-badge">Active</span>}</div>
              <div className="pl-area-pills">
                {areas.map(area => (
                  <button key={area} className={`pl-area-pill ${selectedArea === area ? 'active' : ''}`} onClick={() => setSelectedArea(selectedArea === area ? '' : area)}>{area}</button>
                ))}
              </div>
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Condition Grade</div>
              {CONDITIONS.map(cond => (
                <label className="pl-checkbox-row" key={cond}>
                  <input type="checkbox" checked={selectedConditions.includes(cond)} onChange={() => setSelectedConditions(toggled(selectedConditions, cond))} />
                  <span className="pl-checkbox-label">{cond}</span>
                </label>
              ))}
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Price Range (PKR)</div>
              <div className="pl-price-inputs">
                <input type="text" inputMode="numeric" className="pl-price-input" placeholder="Min" aria-label="Minimum price" value={minPrice} onChange={e => setMinPrice(e.target.value.replace(/[^0-9]/g,''))} />
                <span className="pl-price-sep">-</span>
                <input type="text" inputMode="numeric" className="pl-price-input" placeholder="Max" aria-label="Maximum price" value={maxPrice} onChange={e => setMaxPrice(e.target.value.replace(/[^0-9]/g,''))} />
              </div>
              {brackets.length > 0 && (
                <div className="pl-area-pills" style={{marginTop:'8px',marginBottom:0}}>
                  {brackets.map(b => {
                    const min = String(b.min), max = b.max === Infinity ? '' : String(b.max);
                    return <button key={b.label} className={`pl-area-pill ${minPrice === min && maxPrice === max ? 'active' : ''}`} onClick={() => setPriceRange(min, max)}>{b.label}</button>;
                  })}
                </div>
              )}
            </div>

            {availableWarranties.length > 0 && (
              <div className="pl-filter-section">
                <div className="pl-filter-label">Seal & Warranty</div>
                {availableWarranties.map(w => (
                  <label className="pl-checkbox-row" key={w.name}>
                    <input type="checkbox" checked={selectedWarranty.includes(w.name)} onChange={() => setSelectedWarranty(toggled(selectedWarranty, w.name))} />
                    <span className="pl-checkbox-label">{w.name}</span>
                    <span className="pl-count">{w.count}</span>
                  </label>
                ))}
              </div>
            )}

            {availableBrands.length > 0 && (
              <div className="pl-filter-section">
                <div className="pl-filter-label">Brand</div>
                {availableBrands.map(brand => (
                  <label className="pl-checkbox-row" key={brand.name}>
                    <input type="checkbox" checked={selectedBrands.includes(brand.name)} onChange={() => setSelectedBrands(toggled(selectedBrands, brand.name))} />
                    <span className="pl-checkbox-label">{brand.name}</span>
                    <span className="pl-count">{brand.count}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="pl-filter-section">
              <div className="pl-filter-label">Delivery & Pickup</div>
              {DELIVERY_OPTIONS.map(d => (
                <label className="pl-checkbox-row" key={d}>
                  <input type="checkbox" checked={selectedDelivery.includes(d)} onChange={() => setSelectedDelivery(toggled(selectedDelivery, d))} />
                  <span className="pl-checkbox-label">{d}</span>
                </label>
              ))}
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Trust Perks</div>
              <label className="pl-checkbox-row"><input type="checkbox" defaultChecked /><span className="pl-checkbox-label">SECP Verified Sellers</span></label>
              <label className="pl-checkbox-row"><input type="checkbox" /><span className="pl-checkbox-label">Rating 4.8 & Above</span></label>
              <label className="pl-checkbox-row"><input type="checkbox" defaultChecked /><span className="pl-checkbox-label">Safe Handover Hubs</span></label>
              <label className="pl-checkbox-row"><input type="checkbox" /><span className="pl-checkbox-label">Original Box & Bill</span></label>
            </div>
          </aside>

          <div style={{flex:1}}>
            <div className="pl-feed-header">
              <div>
                <h2 className="pl-feed-title">{selectedCategory === 'all' ? 'All Products' : selectedCategory}{selectedConditions.length === 1 ? ` - ${selectedConditions[0]}` : ''}</h2>
                <p className="pl-feed-sub">{total} products found</p>
              </div>
              <div className="pl-sort-wrap">
                <span className="pl-sort-label">Sort by:</span>
                <div style={{position:'relative',display:'inline-block'}}>
                  <select className="pl-sort-btn" style={{cursor:'pointer',appearance:'none',paddingRight:'24px'}} value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                  <ChevronDown size={14} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#64748b'}} />
                </div>
              </div>
            </div>

            <div className="pl-active-chips">
              {selectedCategory !== 'all' && <Chip label={selectedCategory} onRemove={() => setSelectedCategory('all')} />}
              {selectedArea && <Chip label={'Area: ' + selectedArea} onRemove={() => setSelectedArea('')} />}
              {selectedConditions.map(c => <Chip key={c} label={c} onRemove={() => setSelectedConditions(toggled(selectedConditions, c))} />)}
              {(minPrice || maxPrice) && <Chip label={`Rs. ${minPrice || '0'} - ${maxPrice || 'Any'}`} onRemove={() => setPriceRange('', '')} />}
              {selectedWarranty.map(w => <Chip key={w} label={w} onRemove={() => setSelectedWarranty(toggled(selectedWarranty, w))} />)}
              {selectedBrands.map(b => <Chip key={b} label={b} onRemove={() => setSelectedBrands(toggled(selectedBrands, b))} />)}
              {selectedDelivery.map(d => <Chip key={d} label={d} onRemove={() => setSelectedDelivery(toggled(selectedDelivery, d))} />)}
              {anyFilter && <button className="pl-chip-clear" onClick={resetFilters}>Clear All</button>}
            </div>

            <div className="pl-grid">
              {items.map((p: any) => (
                <article className="pl-card" key={p.id} style={{cursor:'pointer'}} onClick={() => actions.open('listing', p)}>
                  <div className="pl-card-img-wrap">
                    <Photo src={Array.isArray(p.images) ? p.images[0] : p.image} alt={p.title} />
                    <span className="pl-card-cond-pill">{p.condition}</span>
                    <button className="pl-heart-btn" aria-label={'Save ' + p.title} onClick={e => { e.stopPropagation(); toggleWishlist(p.id); }}>
                      <Heart size={16} fill={wishlist.includes(p.id) ? '#ef4444' : 'none'} color={wishlist.includes(p.id) ? '#ef4444' : 'currentColor'} />
                    </button>
                  </div>
                  <div className="pl-card-body">
                    <div className="pl-card-catrow">
                      <span className="pl-card-cat">{p.category}</span>
                      <span className="pl-card-badge" style={{color: p.condition === 'New' ? '#2563eb' : '#0d9488', background: p.condition === 'New' ? '#dbeafe' : '#ccfbf1'}}>
                        {p.condition === 'New' ? 'Brand New' : 'Pre-Loved'}
                      </span>
                    </div>
                    <h3 className="pl-card-title">{p.title}</h3>
                    <div className="pl-card-price-row">
                      <span className="pl-card-price">{money(p.price)}</span>
                    </div>
                    <div className="pl-card-seller">
                      <div className="pl-seller-avatar">{(p.seller || 'S').charAt(0)}</div>
                      <div className="pl-seller-info">
                        <span className="pl-seller-name">{p.seller || 'Seller'}</span>
                        <span className="pl-seller-loc">{p.location}</span>
                      </div>
                    </div>
                    <div className="pl-card-actions">
                      <button className="pl-btn-inspect" onClick={e => { e.stopPropagation(); actions.open('listing', p); }}>View Details</button>
                      <button className="pl-btn-chat" onClick={async e => {
                        e.stopPropagation();
                        const r = await actions.perform('conversations', 'POST', { contextType: 'listing', contextId: p.id });
                        if (r) actions.open('conversation', { id: r.id });
                      }}><MessageCircle size={14}/> Chat</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {items.length === 0 && (
              <div style={{textAlign:'center',padding:'60px 20px',color:'#94a3b8'}}>
                <Package size={48} style={{opacity:0.3,marginBottom:'16px'}} />
                <p style={{fontSize:'16px',fontWeight:600}}>No products found</p>
                <p style={{fontSize:'14px'}}>Try adjusting your filters or browse all categories.</p>
                <button style={{marginTop:'12px',padding:'10px 20px',background:'#059669',color:'#fff',border:0,borderRadius:'8px',fontWeight:600,cursor:'pointer'}} onClick={resetFilters}>Reset Filters</button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pl-pagination">
                <button className="pl-page-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&larr; Previous</button>
                <div className="pl-page-nums">
                  {Array.from({length: Math.min(totalPages, 5)}).map((_, i) => (
                    <button key={i} className={`pl-page-num ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                  ))}
                  {totalPages > 5 && <span style={{color:'#9ca3af'}}>...</span>}
                </div>
                <button className="pl-page-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next &rarr;</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
