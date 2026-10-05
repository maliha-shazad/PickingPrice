import { useState, useRef } from 'react';
import { ChevronRight, Heart, Share2, MapPin, Clock, ShieldCheck, CheckCircle2, Star, MessageSquare, Phone, Camera, X, Send } from 'lucide-react';
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
  const [isSaved, setIsSaved] = useState(false);
  const handleSave = () => {
    if (!actions.user) return actions.open('login');
    actions.perform('favorites/' + item.id, 'PUT', { saved: !isSaved });
    setIsSaved(!isSaved);
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

  const handleContact = () => {
    const phone = item.phone || sellerData?.profile?.phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error('Seller has not provided contact details.');
    }
  };

  return (
    <>
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
              <span className="badge-like-new">{item.condition || 'Like New'}</span>
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
              <span>CONDITION</span>
              <strong>{item.condition || 'Like New'}</strong>
            </div>
            <div className="cond-badge">
              <span>CATEGORY</span>
              <strong>{item.condition === 'New' ? 'Brand New' : 'Pre-Loved'}</strong>
            </div>
          </div>

          {(item.meetup_spot || sellerData?.profile?.meetup_spot) && <div className="pp-meetup-spot">
            <div className="meetup-icon-wrap"><MapPin size={16} /></div>
            <div className="meetup-text">
              <strong>Preferred In-Person Meetup Spot</strong>
              <p>Seller is open to trade at: <strong>{item.meetup_spot || sellerData?.profile?.meetup_spot}</strong></p>
              <div className="cctv-notice"><ShieldCheck size={12} /> Public CCTV protected environment recommended</div>
            </div>
          </div>}

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
              <button onClick={() => {
                if (item.owner) {
                  actions.open('profile', { id: item.owner });
                } else {
                  alert('Seller profile is not available for sample items.');
                }
              }}>View Seller Profile ➔</button>
            </div>
          </div>

          <div className="pp-action-buttons">
            <button className="btn-chat" onClick={async () => {
              const r = await actions.perform('conversations', 'POST', { contextType: 'listing', contextId: item.id });
              if (r) actions.open('conversation', { id: r.id });
            }}>
              <MessageSquare size={18} /> Chat
            </button>
            <button className="btn-call" onClick={handleContact}>
              <Phone size={18} /> Contact
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section — full width below both columns */}
      <div className="pp-reviews-section" style={{ marginTop: '40px' }}>
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
            <div style={{ padding: '32px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
              <MessageSquare size={24} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
              No reviews yet for this seller.
            </div>
          )}
        </Load>

        <ReviewForm item={item} actions={actions} />
      </div>
    </div>


    </>
  );
}

function ReviewForm({ item, actions }: { item: Item; actions: Actions }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 3 - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setImages(prev => [...prev.slice(0, 2), reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!actions.user) { actions.open('login'); return; }
    if (rating === 0) { toast.error('Please select a star rating.'); return; }
    if (!body.trim()) { toast.error('Please write a review.'); return; }
    setSubmitting(true);
    try {
      await actions.perform('reviews/' + item.owner, 'POST', {
        rating,
        body: body.trim(),
        images,
        listingId: item.id,
      });
      toast.success('Review submitted!');
      setSubmitted(true);
    } catch {
      toast.error('Failed to submit review.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div style={{ marginTop: '24px', padding: '24px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', textAlign: 'center' }}>
        <CheckCircle2 size={32} style={{ color: '#059669', margin: '0 auto 8px', display: 'block' }} />
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#065f46', margin: 0 }}>Thank you for your review!</p>
        <p style={{ fontSize: '13px', color: '#047857', margin: '4px 0 0' }}>Your feedback helps other buyers.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
      <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={18} /> Write a Review
      </h4>

      {/* Star Rating */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Your Rating</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', transition: 'transform 0.15s', transform: (hover || rating) >= star ? 'scale(1.15)' : 'scale(1)' }}
            >
              <Star size={28} fill={(hover || rating) >= star ? '#f59e0b' : 'none'} color={(hover || rating) >= star ? '#f59e0b' : '#d1d5db'} />
            </button>
          ))}
          {rating > 0 && <span style={{ marginLeft: '8px', fontSize: '14px', color: '#6b7280', alignSelf: 'center' }}>{rating}/5</span>}
        </div>
      </div>

      {/* Review Text */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Your Review</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share your experience with this product..."
          maxLength={1000}
          style={{
            width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '14px', color: '#111827', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5',
            background: '#fff',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{body.length}/1000</div>
      </div>

      {/* Image Upload */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Add Photos (optional, max 3)</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {images.map((img, i) => (
            <div key={i} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                width: '72px', height: '72px', borderRadius: '8px', border: '2px dashed #d1d5db', background: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: '#9ca3af', fontSize: '11px', gap: '2px',
              }}
            >
              <Camera size={18} />
              Add
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImage} />
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        style={{
          width: '100%', padding: '12px', background: rating === 0 ? '#d1d5db' : '#059669', color: '#fff',
          border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: rating === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s',
        }}
      >
        <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
