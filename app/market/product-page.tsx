import { useState } from 'react';
import { ChevronRight, Heart, Share2, MapPin, Clock, ShieldCheck, CheckCircle2, Star, MessageSquare, Phone } from 'lucide-react';
import { Item, Actions, money, Photo, useLoad, Load } from './ui';
import { toast } from 'sonner';

export function ProductPage({ item, actions }: { item: Item; actions: Actions }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  // Fetch seller profile to get reviews and ratings
  const sellerState = useLoad(item.owner ? 'profiles/' + item.owner : null, actions.revision);
  const sellerData = sellerState.data;

  // Use real data if available, otherwise mock data for the visual fidelity of Figma
  const title = String(item.title || 'Sony WH-1000XM4 Noise Canceling Headphones — Silver');
  const priceText = item.price ? money(Number(item.price)) : 'Rs. 24,500';
  const location = String(item.location || 'DHA Phase 6, Karachi');
  const category = String(item.category || 'ELECTRONICS > Over-Ear Audio');
  const description = String(item.description || 'Gently used for 4 months. Complete box, original AUX cable, airplane adapter, and carrying case included. Zero scratches on headband or ear cups. Battery comfortably holds full 30 hours charge with ANC on. Selling because upgraded to studio monitoring gear.');
  
  // Extract images
  let images: string[] = [];
  if (Array.isArray(item.images) && item.images.length > 0) {
    images = item.images;
  } else if (item.image) {
    images = [String(item.image)];
  }

  // Wishlist logic
  const isSaved = actions.user?.saved?.some((i: any) => i.id === item.id);
  const handleSave = () => {
    if (!actions.user) return actions.open('login');
    actions.perform('favorites/' + item.id, 'PUT');
  };

  // Share logic
  const handleShare = () => {
    const url = window.location.origin + '/product/' + item.id;
    if (navigator.share) {
      navigator.share({ title: 'Picking Price - ' + title, url }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  // Call logic
  const handleCall = () => {
    const phone = sellerData?.profile?.phone || item.phone;
    if (!phone) {
      toast.error('Seller has not provided a phone number.');
      return;
    }
    // Attempt to open tel/whatsapp
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="product-page-container">
      {/* Breadcrumbs & Header Actions */}
      <div className="pp-prod-topbar">
        <div className="pp-prod-breadcrumbs">
          {category.split(' > ').map((part, i, arr) => (
            <span key={i}>
              {part.toUpperCase()}
              {i < arr.length - 1 && <ChevronRight size={14} className="bc-separator" />}
            </span>
          ))}
        </div>
        <div className="pp-prod-top-actions">
          <button className="pp-icon-btn" onClick={handleShare}><Share2 size={18} /></button>
          <button className={`pp-icon-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave}>
            <Heart size={18} fill={isSaved ? '#10b981' : 'none'} color={isSaved ? '#10b981' : 'currentColor'} />
          </button>
        </div>
      </div>

      <div className="pp-prod-grid">
        {/* LEFT COLUMN: IMAGES */}
        <div className="pp-prod-left">
          <div className="pp-prod-main-img">
            {/* Badges */}
            <div className="pp-prod-img-badges-top">
              <span className="badge-like-new">Like New</span>
              {item.verified && <span className="badge-verified"><ShieldCheck size={12} /> Verified Listing</span>}
            </div>
            
            {/* Main Image */}
            {images.length > 0 ? (
              <Photo src={images[photoIdx]} alt={title} className="pp-main-photo" />
            ) : (
              <div className="mock-thumb-bg" style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#999'}}>No Photo</div>
            )}
            
            {images.length > 0 && (
              <div className="badge-photos-count">{photoIdx + 1}/{images.length} Photos</div>
            )}
          </div>
          
          {images.length > 1 && (
            <>
              <div className="pp-prod-dots">
                {images.map((_, i) => (
                  <span key={i} className={`dot ${i === photoIdx ? 'active' : ''}`} onClick={() => setPhotoIdx(i)}></span>
                ))}
              </div>
              
              <div className="pp-prod-thumbnails">
                {images.map((img, i) => (
                  <div key={i} className={`pp-thumb ${i === photoIdx ? 'active' : ''}`} onClick={() => setPhotoIdx(i)}>
                    <Photo src={img} alt={`Thumb ${i + 1}`} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Reviews Section on the left under images */}
          <div className="pp-seller-reviews" style={{ marginTop: '40px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#111827' }}>Seller Reviews</h3>
            <Load state={sellerState}>
              {sellerData && sellerData.reviews && sellerData.reviews.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sellerData.reviews.items.map((r: Item) => (
                    <div key={r.id} style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <strong style={{ color: '#111827', fontSize: '14px' }}>{r.reviewer}</strong>
                        <span style={{ color: '#f59e0b', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                          <Star size={12} fill="currentColor" /> {r.rating}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>{r.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', background: '#f9fafb', borderRadius: '12px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                  No reviews yet for this seller.
                </div>
              )}
            </Load>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILS */}
        <div className="pp-prod-right">
          <div className="pp-prod-price-row">
            <h1 className="pp-prod-price">{priceText}</h1>
            <div className="pp-prod-price-badges">
              <span className="badge-fixed-price">FIXED<br/>PRICE</span>
              <span className="badge-negotiable"><span className="neg-dot"></span> Negotiable: No</span>
            </div>
          </div>

          <h2 className="pp-prod-title">{title}</h2>

          <div className="pp-prod-meta">
            <span><MapPin size={14} /> {location}</span>
            <span className="meta-dot">•</span>
            <span><Clock size={14} /> Listed 3 hours ago</span>
          </div>

          <div className="pp-safety-notice">
            <div className="safety-icon-wrap"><ShieldCheck size={20} /></div>
            <div className="safety-text">
              <strong>Picking Price Safety Notice</strong>
              <p>We connect buyers and sellers directly. Always inspect product thoroughly in a safe daylight public place before releasing cash.</p>
            </div>
          </div>

          <div className="pp-verification-box">
            <div className="verification-head">
              <strong><ShieldCheck size={16} /> Item Verification Checklist</strong>
              <span className="badge-pass">PASS 100%</span>
            </div>
            <ul className="verification-list">
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <div>
                  <strong>Original Box & Accessories</strong>
                  <p>Includes AUX cable, airplane pin & hard-case</p>
                </div>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <div>
                  <strong>Functionality Tested 100%</strong>
                  <p>Active Noise Canceling & dual touch panels pristine</p>
                </div>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <div>
                  <strong>Original Bill / Purchase Receipt</strong>
                  <p>Verified invoice from authorized distributor</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="pp-about-item">
            <h3>About this item</h3>
            <p>{description}</p>
          </div>

          <div className="pp-condition-badges">
            <div className="cond-badge">
              <span>WEAR STATE</span>
              <strong>Pre-Loved (9.5/10)</strong>
            </div>
            <div className="cond-badge">
              <span>BATTERY CYCLE</span>
              <strong>~24 Charges</strong>
            </div>
          </div>

          <div className="pp-meetup-spot">
            <div className="meetup-icon-wrap"><MapPin size={16} /></div>
            <div className="meetup-text">
              <strong>Preferred In-Person Meetup Spot</strong>
              <p>Seller is open to trade at: <strong>Packages Mall</strong> (Food Court) or <strong>Dolmen Mall Karachi</strong>.</p>
              <div className="cctv-notice"><ShieldCheck size={12} /> Public CCTV protected environment recommended</div>
            </div>
          </div>

          <div className="pp-seller-box">
            <div className="seller-head">
              <div className="seller-avatar">
                <Photo src={sellerData?.profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Hamza"} alt="Seller" />
              </div>
              <div className="seller-info">
                <strong>{sellerData?.profile?.name || item.seller || 'Seller Name'}</strong>
                <span>Member since {sellerData?.profile?.created ? new Date(sellerData.profile.created).toLocaleDateString() : 'recently'}</span>
              </div>
              <div className="seller-rating">
                <Star size={14} className="star-icon" fill="currentColor" /> {sellerData?.rating?.average ? Number(sellerData.rating.average).toFixed(1) : 'New'} ({sellerData?.rating?.count || 0})
              </div>
            </div>
            
            <div className="seller-trust-badges">
              {sellerData?.profile?.verified && <span><ShieldCheck size={12} /> Verified Member</span>}
              <span><Clock size={12} /> Fast Replier</span>
              {sellerData?.activeListings > 0 && <span><CheckCircle2 size={12} /> {sellerData.activeListings} Active Listings</span>}
            </div>

            <div className="seller-footer">
              <button onClick={() => actions.open('profile', { id: item.owner })}>View Seller Profile ➔</button>
            </div>
          </div>

          <div className="pp-action-buttons">
            <button className="btn-chat" onClick={async () => {
              const r = await actions.perform('conversations', 'POST', { contextType: 'listing', contextId: item.id });
              if (r) actions.open('conversation', { id: r.id });
            }}>
              <MessageSquare size={18} /> Chat
            </button>
            <button className="btn-call" onClick={handleCall}>
              <Phone size={18} /> Call / WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
