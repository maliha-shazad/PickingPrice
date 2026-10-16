import { useState } from 'react';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { Actions, Item, useLoad, Load, Photo, Status, Pager, Choice, money, date, Empty, DaysLeft, ReviewCard, ReviewSummary } from './ui';
export function ListingDetail({ item, actions }: {
    item: Item;
    actions: Actions;
}) { const state = useLoad(item.sample ? null : 'listings/' + item.id, actions.revision), p = item.sample ? item : state.data; const [photo, setPhoto] = useState(0); const view = p && <><Photo className="detail-photo" src={p.images?.[photo] || p.image} alt={p.title}/>{p.images?.length > 1 && <div className="gallery-thumbs">{p.images.map((src: string, i: number) => <button key={src + i} aria-label={'View photo ' + (i + 1)} onClick={() => setPhoto(i)}><Photo src={src} alt=""/></button>)}</div>}<div className="detail-title"><h2>{p.title}</h2><strong>{money(p.price)}</strong></div><p className="pre-wrap">{p.description}</p><div className="detail-tags"><span>{p.condition}</span><span>{p.location}</span><span>Quantity: {p.quantity || 1}</span><span>{p.category}{p.subcategory ? ' / ' + p.subcategory : ''}</span>{p.brand && <span>{p.brand}</span>}{!!p.negotiable && <span>Open to offers</span>}{!!p.exchange && <span>Open to exchange</span>}</div><button className="seller-box" onClick={() => !p.sample && actions.open('profile', { id: p.owner })}><span className="account">{p.seller?.[0]}</span><span>{p.seller}{!!p.verified && <ShieldCheck size={15}/>}<small>{p.sample ? 'Example seller' : 'View seller profile & reviews'}</small></span></button>{p.sample ? <p className="notice">This is a sample listing, not an active sale.</p> : actions.readOnly ? null : <div className="action-wrap">{p.owner === actions.user?.id ? <><button className="btn" onClick={() => actions.open('listing-form', p)}>Edit listing</button><button className="btn dark" onClick={() => actions.open('payment', p)}>Promote listing</button></> : <button className="btn dark" onClick={async () => { const r = await actions.perform('conversations', 'POST', { contextType: 'listing', contextId: p.id }); if (r)
    actions.open('conversation', { id: r.id }); }}><MessageCircle size={16}/>Contact seller</button>}<button className="text-link" onClick={() => actions.open('report', { type: 'listing', id: p.id })}>Report listing</button></div>}</>; return item.sample ? <>{view}</> : <Load state={state}>{view}</Load>; }
export function RequestDetail({ item, actions }: {
    item: Item;
    actions: Actions;
}) { 
    const state = useLoad(item.sample ? null : 'requests/' + item.id, actions.revision);
    const p = item.sample ? item : state.data; 
    
    if (!p) {
        return item.sample ? null : <Load state={state}>{null}</Load>;
    }
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#0f172a' }}>Request Details</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: p.status === 'Cancelled' || p.status === 'Closed' ? '#f1f5f9' : '#dcfce7', color: p.status === 'Cancelled' || p.status === 'Closed' ? '#64748b' : '#166534', padding: '6px 12px', borderRadius: '24px', fontSize: '13px', fontWeight: 600 }}>
                        <div style={{ width: '8px', height: '8px', background: p.status === 'Cancelled' || p.status === 'Closed' ? '#94a3b8' : '#22c55e', borderRadius: '50%' }}></div> {p.status || 'Open'}
                    </div>
                    {p.sample && (
                        <span style={{ fontSize: '12px', color: '#6366f1', background: '#e0e7ff', padding: '6px 16px', borderRadius: '24px', fontWeight: 700, letterSpacing: '0.05em' }}>
                            SAMPLE REQUEST
                        </span>
                    )}
                </div>
            </div>
            
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a', lineHeight: 1.3 }}>{p.title}</h2>
                <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.5, margin: '0' }}>{p.description}</p>
            </div>
            
            {p.image && (
                <div style={{ width: '100%', maxHeight: '400px', borderRadius: '12px', overflow: 'hidden', marginTop: '8px', display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
                    <img src={p.image} alt={p.title} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Budget up to</div>
                    <div style={{ fontSize: '28px', color: '#0f172a', fontWeight: 800, marginTop: '8px', fontFamily: 'monospace' }}>{money(p.price)}</div>
                </div>
                <div style={{ flex: '1 1 180px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Condition & Qty</div>
                    <div style={{ fontSize: '16px', color: '#334155', fontWeight: 600, marginTop: '16px' }}>{p.condition || 'Any'} <span style={{color:'#94a3b8', margin:'0 8px'}}>•</span> Qty: {p.quantity || 1}</div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#334155', fontWeight: 500, padding: '0 8px' }}>
                <span style={{ fontSize: '18px' }}>📍</span> Location: {p.location || 'Not specified'}
                {p.category && <span className="rd-category" style={{ fontSize: '12px', fontWeight: 700, color: '#0d5c45', background: '#ccfbf1', borderRadius: '20px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{p.category}</span>}
                {p.expiry && !p.sample && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}><DaysLeft item={p} />Ends {date(p.expiry)}</span>}
            </div>
            
            {p.sample ? (
                <>
                    <div style={{ marginTop: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', padding: '16px', color: '#92400e', borderRadius: '8px', fontSize: '14px', lineHeight: 1.5, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <div>
                            <strong>Note:</strong> This is a sample request, shown as an example, so offers cannot be sent to it. On a real buyer request these two buttons are active: Submit Offer takes your price, a description of your item and a photo, and Chat with Buyer opens a conversation.
                        </div>
                    </div>
                    {/* A preview of what a seller gets on a real request. */}
                    <div className="rd-sample-actions" aria-hidden="true">
                        <button type="button" disabled>Submit Offer</button>
                        <button type="button" disabled><MessageCircle size={18} /> Chat with Buyer</button>
                    </div>
                    <button 
                        onClick={() => actions.open('request-form')}
                        style={{ width: '100%', marginTop: '8px', padding: '16px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)', transition: 'transform 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Post your own request
                    </button>
                </>
            ) : actions.readOnly ? null : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    {p.owner === actions.user?.id ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['Open', 'Responses Received'].includes(p.status) && (
                                <>
                                    <button style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, color: '#334155', cursor: 'pointer' }} onClick={() => actions.open('request-form', p)}>Edit request</button>
                                    <button style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => actions.open('confirm', { title: 'Cancel this request?', text: 'Sellers will no longer be able to send offers.', path: 'requests/' + p.id + '/status', method: 'POST', body: { status: 'Cancelled' } })}>Cancel request</button>
                                </>
                            )}
                            {['Open', 'Responses Received', 'Seller Selected'].includes(p.status) && (
                                <button style={{ width: '100%', padding: '12px', background: '#0d5c45', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => actions.open('confirm', { title: 'Close this request?', text: 'This will stop further offers.', path: 'requests/' + p.id + '/status', method: 'POST', body: { status: 'Closed' } })}>Close request</button>
                            )}
                        </div>
                    ) : (
                        ['Open', 'Responses Received'].includes(p.status) && (
                            <div className="rd-actions" style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #0d5c45 0%, #0d5c45 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                                    onClick={() => actions.open('offer-form', { request_id: p.id })}
                                >
                                    Submit Offer
                                </button>
                                <button 
                                    style={{ flex: 1, padding: '14px', background: 'white', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={async () => { 
                                        const r = await actions.perform('conversations', 'POST', { contextType: 'request', contextId: p.id }); 
                                        if (r) actions.open('conversation', { id: r.id }); 
                                    }}
                                >
                                    <MessageCircle size={18} /> Chat with Buyer
                                </button>
                            </div>
                        )
                    )}
                    <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', alignSelf: 'center', marginTop: '8px' }} onClick={() => actions.open('report', { type: 'request', id: p.id })}>Report request</button>
                </div>
            )}
            {!p.sample && actions.user && <Offers actions={actions} request={p}/>}
        </div>
    ); 
}
export function Offers({ actions, request, received = false }: {
    actions: Actions;
    request?: Item;
    received?: boolean;
}) { const [page, setPage] = useState(1), [sort, setSort] = useState('newest'); const state = useLoad('offers?' + new URLSearchParams({ page: String(page), size: '12', sort, ...(request ? { request: request.id } : received ? { received: '1' } : {}) }), actions.revision); return <section className="offers-section"><div className="section-head offers-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>{request?.owner === actions.user?.id || received ? 'Compare seller offers' : 'My offers'}</h3><select className="pp-select" aria-label="Sort offers" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest</option><option value="low">Lowest price</option></select></div><Load state={state}>{state.data?.items.map((o: Item) => <article className="offer-card" key={o.id}><div><strong>{money(o.price)}</strong><Status>{o.status}</Status></div><h4>{o.request_title}</h4>{!request && <button className="text-link" onClick={() => actions.open('request', { id: o.request_id })}>View request and select seller</button>}<button onClick={() => actions.open('profile', { id: o.owner })}>{o.seller} · View profile</button><p>{o.description}</p>{o.image && <Photo className="offer-photo" src={o.image} alt="Offered item"/>}{!actions.readOnly && <div className="action-wrap">{o.buyer === actions.user?.id && o.status === 'Pending' && request && ['Open', 'Responses Received'].includes(request.status) && <button className="btn dark" onClick={() => actions.open('confirm', { title: 'Select this seller?', text: `Select ${o.seller}'s offer of ${money(o.price)}. Arrange product payment and delivery directly with the seller.`, path: 'requests/' + request.id + '/status', method: 'POST', body: { status: 'Seller Selected', offerId: o.id } })}>Select seller</button>}<button className="btn" onClick={async () => { const r = await actions.perform('conversations', 'POST', { contextType: 'offer', contextId: o.id }); if (r)
    actions.open('conversation', { id: r.id }); }}>Contact {o.buyer === actions.user?.id ? 'seller' : 'buyer'}</button>{o.owner === actions.user?.id && o.status === 'Pending' && <><button className="btn" onClick={() => actions.open('offer-form', { ...o, edit: true })}>Edit</button><button className="text-link" onClick={() => actions.open('confirm', { title: 'Withdraw offer?', text: 'The buyer will no longer be able to select this offer.', path: 'offers/' + o.id, method: 'DELETE' })}>Withdraw</button></>}</div>}</article>)}{state.data?.items.length === 0 && <Empty title="No offers yet"/>}<Pager page={page} total={state.data?.total || 0} onChange={setPage}/></Load></section>; }
export function ProfileDetail({ item, actions }: {
    item: Item;
    actions: Actions;
}) {
    const [page, setPage] = useState(1), [listingPage, setListingPage] = useState(1), [rating, setRating] = useState('5'), [body, setBody] = useState('');
    const state = useLoad('profiles/' + item.id + '?page=' + page + '&listingPage=' + listingPage, actions.revision), data = state.data, p = data?.profile;
    const stars = (n: number) => <span className="pf-stars" aria-label={n + ' out of 5 stars'}>{[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= Math.round(n) ? 'on' : ''}>★</span>)}</span>;
    const roleLabel: Record<string, string> = { buyer: 'Buyer', seller: 'Seller', both: 'Buyer & seller', admin: 'Administrator' };
    return <Load state={state}>{data && p && (() => {
        const average = data.rating.average ? Number(data.rating.average) : 0, count = Number(data.rating.count) || 0, active = Number(data.activeListings) || 0;
        const canReview = !actions.readOnly && actions.user && actions.user.id !== p.id && ['seller', 'both'].includes(p.role);
        return (
            <div className="pf">
                <div className="pf-head">
                    <div className="pf-cover" />
                    <div className="pf-id">
                        <Photo src={p.avatar} alt={p.name} className="pf-avatar" />
                        <div className="pf-name">
                            <h2>{p.name}{!!p.verified && <span className="pf-verified"><ShieldCheck size={14} /> Verified</span>}</h2>
                            <p>{p.location || 'Location not specified'} · Member since {date(p.created)}</p>
                            <div className="pf-chips">
                                <span className="pf-chip">{roleLabel[p.role] || 'Member'}</span>
                                {!!p.suspended && <span className="pf-chip warn">Suspended</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pf-stats">
                    <div><strong>{count ? average.toFixed(1) : 'New'}</strong>{count ? stars(average) : <span className="pf-stat-note">No ratings yet</span>}<small>Rating</small></div>
                    <div><strong>{count}</strong><small>{count === 1 ? 'Review' : 'Reviews'}</small></div>
                    <div><strong>{active}</strong><small>{active === 1 ? 'Active listing' : 'Active listings'}</small></div>
                </div>

                <section className="pf-section">
                    <h3>About</h3>
                    <p className={'pre-wrap pf-bio' + (p.bio ? '' : ' empty')}>{p.bio || 'This member has not added a description.'}</p>
                </section>

                <section className="pf-section">
                    <h3>Active listings <span>{active}</span></h3>
                    {data.listings.length === 0
                        ? <div className="pf-empty">No active listings right now.</div>
                        : <div className="pf-listings">{data.listings.map((l: Item) => (
                            <button type="button" key={l.id} className="pf-listing" onClick={() => actions.open('listing', l)}>
                                <Photo src={l.images[0]} alt={l.title} />
                                <span className="pf-listing-title">{l.title}</span>
                                <strong>{money(l.price)}</strong>
                            </button>
                        ))}</div>}
                    <Pager page={listingPage} total={data.activeListings} onChange={setListingPage} />
                </section>

                <section className="pf-section">
                    <h3>Reviews <span>{data.reviews.total}</span></h3>
                    {data.reviews.items.length === 0
                        ? <div className="pf-empty">No reviews yet.</div>
                        : <div className="pf-reviews pp-review-list"><ReviewSummary average={data.rating?.average} count={data.rating?.count} />{data.reviews.items.map((r: Item) => (
                            <ReviewCard key={r.id} review={r} mine={r.owner === actions.user?.id} onReport={!actions.readOnly && r.owner !== actions.user?.id ? () => actions.open('report', { type: 'review', id: r.id }) : undefined} />
                        ))}</div>}
                    <Pager page={page} total={data.reviews.total} onChange={setPage} />
                </section>

                {canReview && (
                    <form className="pf-review-form" onSubmit={async (e) => { e.preventDefault(); if (await actions.perform('profiles/' + p.id + '/reviews', 'POST', { rating: Number(rating), body })) setBody(''); }}>
                        <h3>Review your interaction</h3>
                        <p>You must have contacted this seller. Reviews are not proof of a completed purchase.</p>
                        <Choice label="Star rating" value={rating} onChange={setRating} options={[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: n + (n === 1 ? ' star' : ' stars') }))} />
                        <textarea aria-label="Review" placeholder="How did it go? At least 10 characters." minLength={10} maxLength={2000} required value={body} onChange={e => setBody(e.target.value)} />
                        <button className="pf-btn">Save review</button>
                    </form>
                )}
                {!actions.readOnly && actions.user && actions.user.id !== p.id && <button type="button" className="pf-link pf-report" onClick={() => actions.open('report', { type: 'user', id: p.id })}>Report this member</button>}
            </div>
        );
    })()}</Load>;
}
