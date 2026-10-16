import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Share2, MapPin, Clock, ShieldCheck, CheckCircle2, Star, MessageSquare, Phone, Send, Flag, BadgePercent, Repeat } from 'lucide-react';
import { Item, Actions, money, Photo, useLoad, Load, api, ReviewCard, ReviewSummary } from './ui';
import { toast } from 'sonner';

// "Listed 3 hours ago": how long since the seller posted it.
const since = (iso: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (!Number.isFinite(mins)) return 'recently';
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(hours / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  return 'on ' + new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function ProductPage({ item, actions }: { item: Item; actions: Actions }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  // The photo slider: the track scrolls sideways (swipe on phones); the mouse can drag it; arrows, dots and
  // thumbnails move it; the shown photo follows the scroll position.
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const showPhoto = (i: number, count: number) => {
    const next = ((i % count) + count) % count, el = trackRef.current;
    setPhotoIdx(next);
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };
  const onTrackScroll = () => { const el = trackRef.current; if (!el || drag.current) return; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); setPhotoIdx(p => (p === i ? p : i)); };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => { if (e.pointerType !== 'mouse' || e.button !== 0 || !trackRef.current) return; drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false }; trackRef.current.classList.add('dragging'); };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { const d = drag.current, el = trackRef.current; if (!d || !el) return; if (Math.abs(e.clientX - d.x) > 4) d.moved = true; el.scrollLeft = d.left - (e.clientX - d.x); };
  const endDrag = (count: number) => { const d = drag.current, el = trackRef.current; if (!d || !el) return; drag.current = null; const delta = el.scrollLeft - d.left, w = el.clientWidth; const from = Math.round(d.left / Math.max(1, w)); showPhoto(Math.max(0, Math.min(count - 1, Math.abs(delta) > w * 0.15 ? from + (delta > 0 ? 1 : -1) : from)), count); window.setTimeout(() => el.classList.remove('dragging'), 450); };

  // Fetch seller profile to get reviews and ratings
  const sellerState = useLoad(item.owner ? 'profiles/' + item.owner : null, actions.revision);
  const sellerData = sellerState.data;

  const title = String(item.title || 'Untitled product');
  const priceText = money(Number(item.price) || 0);
  const location = String(item.location || 'Pakistan');
  const category = String(item.category || 'Products');
  const description = String(item.description || 'The seller has not added a description.');

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
            <Heart size={18} fill={isSaved ? '#0d5c45' : 'none'} color={isSaved ? '#0d5c45' : 'currentColor'} />
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
              {!!item.verified && <span className="badge-verified"><ShieldCheck size={12} /> Verified Listing</span>}
            </div>

            {/* Main Image: a slider of every photo */}
            {images.length > 0 ? (
              <>
                <div className="pp-photo-track" ref={trackRef} onScroll={onTrackScroll} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => endDrag(images.length)} onPointerLeave={() => endDrag(images.length)} onDragStart={e => e.preventDefault()}
                  tabIndex={0} aria-roledescription="carousel" aria-label="Product photos" onKeyDown={e => { if (e.key === 'ArrowRight') showPhoto(photoIdx + 1, images.length); if (e.key === 'ArrowLeft') showPhoto(photoIdx - 1, images.length); }}>
                  {images.map((src, i) => (
                    <div className="pp-photo-slide" key={i} aria-hidden={i !== photoIdx}>
                      <Photo src={src} alt={title + (images.length > 1 ? ' (photo ' + (i + 1) + ')' : '')} className="pp-main-photo" />
                    </div>
                  ))}
                </div>
                {images.length > 1 && <>
                  <button type="button" className="pp-photo-arrow prev" aria-label="Previous photo" onClick={() => showPhoto(photoIdx - 1, images.length)}><ChevronLeft size={20} /></button>
                  <button type="button" className="pp-photo-arrow next" aria-label="Next photo" onClick={() => showPhoto(photoIdx + 1, images.length)}><ChevronRight size={20} /></button>
                </>}
              </>
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
                  <span key={i} className={`dot ${i === photoIdx ? 'active' : ''}`} onClick={() => showPhoto(i, images.length)}></span>
                ))}
              </div>

              <div className="pp-prod-thumbnails">
                {images.map((img, i) => (
                  <div key={i} className={`pp-thumb ${i === photoIdx ? 'active' : ''}`} onClick={() => showPhoto(i, images.length)}>
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
              <span className="badge-fixed-price">{item.negotiable ? 'ASKING' : 'FIXED'}<br/>PRICE</span>
              <span className="badge-negotiable"><span className="neg-dot" style={item.negotiable ? { background: '#0d5c45' } : undefined}></span> Negotiable: {item.negotiable ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <h2 className="pp-prod-title">{title}</h2>

          <div className="pp-prod-meta">
            <span><MapPin size={14} /> {location}</span>
            <span className="meta-dot">•</span>
            <span><Clock size={14} /> {item.created ? 'Listed ' + since(String(item.created)) : 'Listed recently'}</span>
          </div>

          {(item.negotiable || item.exchange) && item.owner ? <DealOptions item={item} actions={actions} title={title} /> : null}

          <div className="pp-safety-notice">
            <div className="safety-icon-wrap"><ShieldCheck size={20} /></div>
            <div className="safety-text">
              <strong>Picking Price Safety Notice</strong>
              <p>We connect buyers and sellers directly. Always inspect product thoroughly in a safe daylight public place before releasing cash.</p>
            </div>
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
              <strong>{String(item.category || 'Other')}{item.subcategory ? ' › ' + String(item.subcategory) : ''}</strong>
            </div>
            {item.brand ? <div className="cond-badge" id="pp-brand">
              <span>BRAND</span>
              <strong>{String(item.brand)}</strong>
            </div> : null}
            {Number(item.quantity) > 0 && <div className="cond-badge" id="pp-quantity">
              <span>QUANTITY</span>
              <strong>{Number(item.quantity)} available</strong>
            </div>}
          </div>

          {Array.isArray(item.delivery) && item.delivery.length > 0 && <div className="pp-delivery-options">
            <strong>Delivery & Pickup:</strong>
            {item.delivery.map((option: string) => <span key={option}><CheckCircle2 size={13} /> {option}</span>)}
          </div>}

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
                <Photo src={sellerData?.profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(String(sellerData?.profile?.name || item.seller || 'Seller'))} alt="Seller" />
              </div>
              <div className="seller-info">
                <strong>{sellerData?.profile?.name || item.seller || 'Seller'}</strong>
                <span>Member since {sellerData?.profile?.created ? new Date(sellerData.profile.created).toLocaleDateString() : 'recently'}</span>
              </div>
              <div className="seller-rating">
                <Star size={14} className="star-icon" fill="currentColor" /> {sellerData?.rating?.average ? Number(sellerData.rating.average).toFixed(1) : 'New'} ({sellerData?.rating?.count || 0})
              </div>
            </div>

            <div className="seller-trust-badges">
              {!!sellerData?.profile?.verified && <span><ShieldCheck size={12} /> Verified Member</span>}
              {sellerData?.activeListings > 0 && <span><CheckCircle2 size={12} /> {sellerData.activeListings} Active Listings</span>}
            </div>

            <div className="seller-footer">
              <button onClick={() => {
                if (item.owner) {
                  actions.open('profile', { id: item.owner });
                } else {
                  toast.info('Seller profiles open on real products; this one is a sample.');
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
          {item.owner && actions.user?.id !== item.owner ? <button type="button" className="pp-report-link" onClick={() => actions.open('report', { type: 'listing', id: item.id })}>
            <Flag size={13} /> Report this listing
          </button> : null}
        </div>

      {/* Reviews: under the photos on desktop, after the details on phones (see .pp-prod-grid in styles.css) */}
      <div className="pp-reviews-section">
        <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#111827' }}>Seller Reviews</h3>
        <Load state={sellerState}>
          {sellerData && sellerData.reviews && sellerData.reviews.items.length > 0 ? (
            <div className="pp-review-list">
              <ReviewSummary average={sellerData.rating?.average} count={sellerData.rating?.count} />
              {sellerData.reviews.items.map((r: Item) => (
                <ReviewCard key={r.id} review={r} mine={r.owner === actions.user?.id} onReport={actions.user && r.owner !== actions.user.id ? () => actions.open('report', { type: 'review', id: r.id }) : undefined} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
              <MessageSquare size={24} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
              No reviews yet for this seller.
            </div>
          )}
        </Load>

        {item.owner && actions.user?.id !== item.owner ? <ReviewForm item={item} actions={actions} /> : null}
        {!item.owner ? <p className="pp-sample-note" id="pp-sample-note">This is a sample product, shown until sellers list real ones. Reviews can be written on real sellers' products.</p> : null}
      </div>
      </div>
    </div>


    </>
  );
}

// What the seller switched on in Sell Now: price offers and exchange proposals. Both go to the seller
// through this product's chat, so they are answered like any other message.
function DealOptions({ item, actions, title }: { item: Item; actions: Actions; title: string }) {
  const [open, setOpen] = useState<'' | 'offer' | 'exchange'>('');
  const [amount, setAmount] = useState('');
  const [swap, setSwap] = useState('');
  const [busy, setBusy] = useState(false);
  const own = actions.user?.id === item.owner;

  const sendToSeller = async (text: string) => {
    if (!actions.user) { actions.open('login'); return; }
    setBusy(true);
    try {
      const chat = await api('conversations', 'POST', { contextType: 'listing', contextId: item.id });
      await api('messages/' + encodeURIComponent(String(chat.id)), 'POST', { body: text });
      setOpen(''); setAmount(''); setSwap('');
      toast.success('Sent to the seller', { description: 'Their reply will appear in this chat.' });
      actions.open('conversation', { id: chat.id });
    } catch (e) {
      const err = e as { status?: number; message?: string };
      if (err.status === 401) actions.open('login');
      else toast.error(err.message || 'It could not be sent. Please try again.');
    }
    setBusy(false);
  };

  const sendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < 1 || value > 100000000) { toast.error('Enter the price you want to offer.'); return; }
    sendToSeller(`Price offer: ${money(value)} for "${title}" (listed at ${money(Number(item.price) || 0)}).`);
  };
  const sendExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (swap.trim().length < 10) { toast.error('Describe what you would give in exchange (at least 10 characters).'); return; }
    sendToSeller(`Exchange proposal for "${title}": ${swap.trim()}`);
  };

  return (
    <div className="pp-deal" id="pp-deal">
      {item.negotiable ? (
        <div className="pp-deal-item">
          <div className="pp-deal-row">
            <span className="pp-deal-icon"><BadgePercent size={18} /></span>
            <div className="pp-deal-text">
              <strong>Open to offers</strong>
              <p>The seller accepts reasonable price offers.</p>
            </div>
            {!own && <button type="button" id="pp-make-offer" className="pp-deal-btn" onClick={() => setOpen(open === 'offer' ? '' : 'offer')}>Make an Offer</button>}
          </div>
          {open === 'offer' && (
            <form className="pp-deal-form" onSubmit={sendOffer}>
              <label htmlFor="pp-offer-amount">Your offer (Rs.)</label>
              <div className="pp-deal-line">
                <input id="pp-offer-amount" type="number" min={1} inputMode="numeric" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder={String(item.price || '')} />
                <button type="submit" id="pp-offer-send" disabled={busy}>{busy ? 'Sending…' : 'Send Offer'}</button>
              </div>
            </form>
          )}
        </div>
      ) : null}
      {item.exchange ? (
        <div className="pp-deal-item">
          <div className="pp-deal-row">
            <span className="pp-deal-icon"><Repeat size={18} /></span>
            <div className="pp-deal-text">
              <strong>Open to exchange</strong>
              <p>The seller will consider an item in exchange, with a cash adjustment.</p>
            </div>
            {!own && <button type="button" id="pp-propose-exchange" className="pp-deal-btn" onClick={() => setOpen(open === 'exchange' ? '' : 'exchange')}>Propose Exchange</button>}
          </div>
          {open === 'exchange' && (
            <form className="pp-deal-form" onSubmit={sendExchange}>
              <label htmlFor="pp-exchange-text">What would you give in exchange?</label>
              <textarea id="pp-exchange-text" required minLength={10} maxLength={500} autoFocus value={swap} onChange={e => setSwap(e.target.value)} placeholder="e.g. Samsung A54 in good condition plus Rs. 5,000" />
              <button type="submit" id="pp-exchange-send" disabled={busy}>{busy ? 'Sending…' : 'Send Proposal'}</button>
            </form>
          )}
        </div>
      ) : null}
      {own && <p className="pp-deal-own">Buyers see these options on your product. Change them with Edit in your Seller Dashboard.</p>}
    </div>
  );
}

// A buyer's review of the seller of this product. The server keeps one review per buyer and seller and only
// accepts it once the two have been in contact, so the form reports what the server actually said.
function ReviewForm({ item, actions }: { item: Item; actions: Actions }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!actions.user) { actions.open('login'); return; }
    if (rating === 0) { toast.error('Please select a star rating.'); return; }
    if (body.trim().length < 10) { toast.error('Please write at least 10 characters.'); return; }
    setSubmitting(true);
    const saved = await actions.perform('profiles/' + item.owner + '/reviews', 'POST', { rating, body: body.trim() });
    setSubmitting(false);
    if (saved) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div id="pp-review-thanks" style={{ marginTop: '24px', padding: '24px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', textAlign: 'center' }}>
        <CheckCircle2 size={32} style={{ color: '#0d5c45', margin: '0 auto 8px', display: 'block' }} />
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#0a5038', margin: 0 }}>Thank you for your review!</p>
        <p style={{ fontSize: '13px', color: '#0a5038', margin: '4px 0 0' }}>Your feedback helps other buyers.</p>
      </div>
    );
  }

  return (
    <div id="pp-review-form" style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
      <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={18} /> Write a Review
      </h4>
      <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#6b7280', lineHeight: 1.5 }}>You can review this seller after you have chatted with them. One review per seller; saving again updates it.</p>

      {/* Star Rating */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Your Rating</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              aria-label={star + (star === 1 ? ' star' : ' stars')}
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
          placeholder="Share your experience with this seller (at least 10 characters)..."
          maxLength={2000}
          style={{
            width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '14px', color: '#111827', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5',
            background: '#fff', boxSizing: 'border-box',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{body.length}/2000</div>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        id="pp-review-submit"
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        style={{
          width: '100%', padding: '12px', background: rating === 0 ? '#d1d5db' : '#0d5c45', color: '#fff',
          border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: rating === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s',
        }}
      >
        <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
