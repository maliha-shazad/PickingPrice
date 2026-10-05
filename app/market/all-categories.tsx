import { useState, useEffect } from 'react';
import { ChevronRight, Heart, Star, ShieldCheck, MapPin, ChevronDown, X, Shirt, Monitor, Sofa, Dumbbell, BookOpen, Camera, Car, Utensils, Gem, Baby, Paintbrush, Package, Home, SlidersHorizontal, MessageCircle } from 'lucide-react';
import { Actions, useLoad, Photo, money } from './ui';
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

export function AllCategories({ actions }: { actions: Actions }) {
  const cats = actions.categories.length > 0
    ? actions.categories
    : FALLBACK_CATS.map(name => ({ id: name, name }));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = new URLSearchParams();
  params.set('size', '12');
  params.set('page', String(page));
  if (selectedCategory !== 'all') params.set('category', selectedCategory);
  if (selectedCondition !== 'all') params.set('condition', selectedCondition);
  if (minPrice) params.set('min', minPrice);
  if (maxPrice) params.set('max', maxPrice);
  if (sort === 'low') params.set('sort', 'low');
  else if (sort === 'high') params.set('sort', 'high');
  else params.set('sort', 'newest');

  const state = useLoad('listings?size=100', actions.revision);
  const realListings = state.data?.items || [];
  const hasRealData = state.data?.total > 0;
  const sourceData = hasRealData ? realListings : samples;

  let filtered = sourceData.filter((p: any) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (selectedCondition !== 'all' && p.condition !== selectedCondition) return false;
    if (minPrice && p.price < parseInt(minPrice)) return false;
    if (maxPrice && p.price > parseInt(maxPrice)) return false;
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

  useEffect(() => { setPage(1); }, [selectedCategory, selectedCondition, minPrice, maxPrice, sort]);

  const toggleWishlist = (id: string) => {
    if (!actions.user) { actions.open('login'); return; }
    const isSaved = wishlist.includes(id);
    setWishlist(prev => isSaved ? prev.filter(i => i !== id) : [...prev, id]);
    actions.perform('favorites/' + id, 'PUT', { saved: !isSaved });
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedCondition('all');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

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
              <div className="pl-filter-label">Condition</div>
              {['all', 'New', 'Like New', 'Good', 'Used'].map(cond => (
                <label className="pl-checkbox-row" key={cond} style={{cursor:'pointer'}}>
                  <input type="radio" name="condition" checked={selectedCondition === cond} onChange={() => setSelectedCondition(cond)} style={{accentColor:'#059669'}} />
                  <span className="pl-checkbox-label">{cond === 'all' ? 'All Conditions' : cond}</span>
                </label>
              ))}
            </div>

            <div className="pl-filter-section">
              <div className="pl-filter-label">Price Range (PKR)</div>
              <div className="pl-price-inputs">
                <input type="text" className="pl-price-input" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value.replace(/[^0-9]/g,''))} />
                <span className="pl-price-sep">-</span>
                <input type="text" className="pl-price-input" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value.replace(/[^0-9]/g,''))} />
              </div>
            </div>
          </aside>

          <div style={{flex:1}}>
            <div className="pl-feed-header">
              <div>
                <h2 className="pl-feed-title">{selectedCategory === 'all' ? 'All Products' : selectedCategory} {selectedCondition !== 'all' ? `- ${selectedCondition}` : ''}</h2>
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
              {selectedCategory !== 'all' && <span className="pl-chip">{selectedCategory} <button className="pl-chip-x" onClick={() => setSelectedCategory('all')}><X size={10}/></button></span>}
              {selectedCondition !== 'all' && <span className="pl-chip">{selectedCondition} <button className="pl-chip-x" onClick={() => setSelectedCondition('all')}><X size={10}/></button></span>}
              {(minPrice || maxPrice) && <span className="pl-chip">Rs. {minPrice || '0'} - {maxPrice || 'Any'} <button className="pl-chip-x" onClick={() => {setMinPrice('');setMaxPrice('');}}><X size={10}/></button></span>}
              {(selectedCategory !== 'all' || selectedCondition !== 'all' || minPrice || maxPrice) && <button className="pl-chip-clear" onClick={resetFilters}>Clear All</button>}
            </div>

            <div className="pl-grid">
              {items.map((p: any) => (
                <article className="pl-card" key={p.id} style={{cursor:'pointer'}} onClick={() => actions.open('listing', p)}>
                  <div className="pl-card-img-wrap">
                    <Photo src={Array.isArray(p.images) ? p.images[0] : p.image} alt={p.title} />
                    <span className="pl-card-cond-pill">{p.condition}</span>
                    <button className="pl-heart-btn" onClick={e => { e.stopPropagation(); toggleWishlist(p.id); }}>
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
