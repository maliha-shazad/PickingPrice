'use client';
import { useState } from 'react';
import { Actions, Item, useLoad, Load, money, Status, Photo, Empty, Pager, Choice } from './ui';
import { ProfileDialog } from './profile-dialog';
import { TextField, Photos } from './forms';
import { Offers } from './details';
import { Package, MessageSquare, CheckSquare, Star, MapPin, Edit2, ShieldCheck, Zap, LayoutDashboard, BadgeCheck, Trash2 } from 'lucide-react';

export function Dashboard({ actions, initial = 'listings', setMode }: {
    actions: Actions;
    initial?: string;
    setMode?: (m: 'Buying' | 'Selling') => void;
}) {
    const [tab, setTab] = useState(actions.user?.role === 'buyer' ? 'requests' : initial);
    const [page, setPage] = useState(1);
    const [invTab, setInvTab] = useState('Active');
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    
    const me = useLoad('me', actions.revision);
    const list = useLoad(['listings', 'requests'].includes(tab) ? tab + '?mine=1&page=' + page : null, actions.revision);


    if (!me.data) return <div className="p-8 text-center text-gray-500">Loading Seller Dashboard...</div>;

    const profile = me.data.profile || {};
    const counts = me.data.counts || {};
    const settings = me.data.settings || { freeListings: 10, extraListingPrice: 50 };
    const quotaCap = settings.freeListings + (profile.extra_slots || 0);

    return (
        <div className="bd-container">
            <style dangerouslySetInnerHTML={{__html: `
                .bd-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; font-family: 'Inter', sans-serif; overflow: hidden; }

                .bd-header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                .bd-header-title { display: flex; align-items: center; gap: 12px; }
                .bd-header-icon { color: #059669; }
                .bd-header-title h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }

                .bd-mode-toggle { background: #f1f5f9; border-radius: 50px; padding: 4px; display: inline-flex; }
                .bd-mode-toggle button { background: transparent; border: 0; padding: 8px 20px; font-size: 14px; font-weight: 600; color: #64748b; border-radius: 50px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .bd-mode-toggle button.active { background: #fff; color: #059669; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .free-badge { background: #f59e0b; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px; }

                .bd-layout { display: flex; gap: 32px; align-items: flex-start; }
                .bd-sidebar { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }
                .bd-main-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0; overflow: hidden; }

                .bd-profile-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); position: relative; border: 1px solid #f1f5f9; }
                .bd-profile-cover { height: 80px; background: linear-gradient(135deg, #0f172a, #334155); }
                .bd-profile-avatar-wrap { position: relative; width: 80px; height: 80px; margin: -40px auto 12px; }
                .bd-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid #fff; background: #fff; }
                .bd-edit-icon-btn { position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; background: #1e293b; color: #fff; border: 2px solid #fff; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: background 0.2s; }
                .bd-edit-icon-btn:hover { background: #0f172a; }
                .bd-profile-info { padding: 0 20px 24px; text-align: center; }
                .bd-profile-info h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px; display: flex; align-items: center; justify-content: center; gap: 6px; }
                .bd-profile-meta { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #64748b; font-weight: 500; }
                .bd-profile-meta span { display: flex; align-items: center; justify-content: center; gap: 6px; }

                .bd-stats-vertical { display: flex; flex-direction: column; gap: 12px; }
                .bd-v-stat { background: #fff; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid #f8fafc; transition: transform 0.2s; }
                .bd-v-stat:hover { transform: translateY(-2px); }
                .bd-v-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .bd-v-stat-icon.orange { background: #ffedd5; color: #ea580c; }
                .bd-v-stat-icon.green { background: #dcfce7; color: #059669; }
                .bd-v-stat-icon.blue { background: #e0f2fe; color: #0284c7; }
                .bd-v-stat-text { display: flex; flex-direction: column; gap: 2px; }
                .bd-v-stat-text strong { font-size: 15px; font-weight: 700; color: #1e293b; }
                .bd-v-stat-text span { font-size: 12px; color: #64748b; font-weight: 500; }

                .bd-glass-panel { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f8fafc; }
                .bd-section { margin-bottom: 0; }
                .bd-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .bd-section-header h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }

                .bd-tabs-nav { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
                .bd-tabs-nav::-webkit-scrollbar { display: none; }
                .bd-tabs-nav button { padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; transition: all 0.2s; flex-shrink: 0; }

                .sd-main { display: flex; flex-direction: column; gap: 24px; }

                @media (max-width: 900px) {
                    .bd-layout { flex-direction: column; }
                    .bd-sidebar { width: 100%; }
                }
                @media (max-width: 600px) {
                    .bd-container { padding: 16px 12px; overflow: hidden; }
                    .bd-layout { gap: 20px; }
                    .bd-header-area { flex-direction: column; align-items: center; gap: 12px; }
                    .bd-header-title { justify-content: center; }
                    .bd-main-content { overflow: visible; overflow-x: hidden; }
                    .bd-tabs-nav { padding-bottom: 12px; }
                    .bd-tabs-nav button { padding: 7px 12px; font-size: 13px; }
                    .bd-glass-panel { padding: 14px !important; border-radius: 14px; overflow: hidden; box-sizing: border-box; max-width: 100%; }
                    .sd-quota-header { flex-direction: column !important; gap: 8px !important; }
                    .sd-quota-header h2 { font-size: 16px !important; }
                    .sd-quota-bar-labels { font-size: 12px !important; }
                    .sd-quota-note { font-size: 11px !important; }
                    .sd-item-card { flex-direction: column !important; align-items: flex-start !important; }
                    .sd-item-info { flex-wrap: wrap; }
                    .sd-item-actions { width: 100% !important; flex-wrap: wrap !important; }
                    .sd-item-actions button { flex: 1 !important; min-width: 0 !important; font-size: 12px !important; padding: 8px 6px !important; }
                    .bd-section-header { flex-direction: column; align-items: flex-start; gap: 8px; }
                    .bd-section-header h3 { font-size: 16px !important; }
                    .bd-v-stat { padding: 12px; gap: 12px; }
                    .bd-v-stat-icon { width: 36px; height: 36px; }
                    .bd-v-stat-text strong { font-size: 14px; }
                    .bd-profile-card { border-radius: 14px; }
                }

                .bd-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
                .bd-modal { background: #fff; width: 440px; max-width: 90%; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
                .bd-modal { max-height: 92vh; overflow-y: auto; }
                .bd-dialog-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #f1f5f9; border: 1px solid #e2e8f0; }
                .bd-btn-primary-save:disabled { opacity: .6; cursor: default; }
                .bd-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
                .bd-modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
                .bd-modal-close { background: #e2e8f0; border: 0; width: 32px; height: 32px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #475569; transition: background 0.2s; }
                .bd-modal-close:hover { background: #cbd5e1; }
                .bd-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                .bd-form-group { display: flex; flex-direction: column; gap: 8px; }
                .bd-form-group label { font-size: 13px; font-weight: 600; color: #334155; }
                .bd-input { padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; outline: none; transition: border-color 0.2s; }
                .bd-input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
                .bd-upload-area { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .bd-upload-area:hover { border-color: #059669; background: #ecfdf5; }
                .bd-upload-area span { font-size: 13px; font-weight: 600; color: #475569; }
                .bd-btn-primary-save { background: #059669; color: #fff; border: 0; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                .bd-btn-primary-save:hover { background: #047857; }
            `}} />
            {/* Header Area */}
            <div className="bd-header-area">
                <div className="bd-header-title">
                    <LayoutDashboard size={24} className="bd-header-icon" />
                    <h1>Seller Dashboard</h1>
                </div>
                <div className="bd-mode-toggle">
                    <button onClick={() => setMode?.('Buying')}><ShieldCheck size={16}/> Buyer Mode</button>
                    <button className="active">Seller Hub <span className="free-badge">{quotaCap} Slots</span></button>
                </div>
            </div>

            <div className="bd-layout">
                {/* Left Sidebar */}
                <aside className="bd-sidebar">
                    {/* Profile Card */}
                    <div className="bd-profile-card">
                        <div className="bd-profile-cover" style={{ background: 'linear-gradient(to right, #0f172a, #334155)' }}></div>
                        <div className="bd-profile-avatar-wrap">
                            <Photo src={profile.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + profile.name} alt="Profile" className="bd-avatar" />
                            <button className="bd-edit-icon-btn" onClick={() => setEditProfileOpen(true)} aria-label="Edit Profile">
                                <Edit2 size={14} />
                            </button>
                        </div>
                        <div className="bd-profile-info">
                            <h2>{profile.name || actions.user?.name} {!!profile.verified && <BadgeCheck size={16} color="#10b981" />}</h2>
                            <div className="bd-profile-meta">
                                <span><MapPin size={12}/> {profile.location || 'Lahore, PK'}</span>
                                <span><Star size={12} color="#f59e0b"/> 4.9 Rating</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Vertical */}
                    <div className="bd-stats-vertical">
                        <div className="bd-v-stat">
                            <div className="bd-v-stat-icon orange"><Package size={16}/></div>
                            <div className="bd-v-stat-text">
                                <strong>{counts.listings || 0} Active Listings</strong>
                                <span>Cap {quotaCap}</span>
                            </div>
                        </div>
                        <div className="bd-v-stat">
                            <div className="bd-v-stat-icon blue"><MessageSquare size={16}/></div>
                            <div className="bd-v-stat-text">
                                <strong>Messages</strong>
                                <span onClick={() => actions.go('Messages')} style={{cursor:'pointer',color:'#059669',fontWeight:600}}>{actions.user ? 'Open Inbox →' : 'Sign in'}</span>
                            </div>
                        </div>
                        <div className="bd-v-stat">
                            <div className="bd-v-stat-icon green"><CheckSquare size={16}/></div>
                            <div className="bd-v-stat-text">
                                <strong>Accepted Offers</strong>
                                <span>This Month</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Right Content */}
                <main className="bd-main-content">
                    {/* Horizontal Tabs inside main */}
                    <div className="bd-tabs-nav">
                        {[
                            ['listings', 'Active Listings'],
                            ['services', 'Quota & Services'],
                            ['offers', 'My Offers'],
                            ['received', 'Received Offers'],
                            ['requests', 'My Requests'],
                            ['profile', 'Edit Profile']
                        ].map(([v, l]) => (
                            <button 
                                key={v} 
                                onClick={() => { setTab(v); setPage(1); }}
                                style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, background: tab === v ? '#0f172a' : '#f1f5f9', color: tab === v ? 'white' : '#64748b', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    {tab === 'listings' && (
                        <div className="sd-main">
                            {/* Quota Usage Banner (Glass Panel) */}
                            <div className="bd-section bd-glass-panel" style={{ padding: '24px' }}>
                                <div className="sd-quota-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div>
                                        <div className="sd-quota-title" style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>QUOTA USAGE</div>
                                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>Listing Limits & Allocation</h2>
                                    </div>
                                    <div className="sd-quota-badge" style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>Standard Free</div>
                                </div>
                                <div className="sd-quota-bar-wrap" style={{ marginBottom: '8px' }}>
                                    <div className="sd-quota-bar-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                        <span>{(counts.listings || 0)} / {quotaCap} Listings Used</span>
                                        <span>{Math.max(0, quotaCap - (counts.listings || 0))} Slots Free</span>
                                    </div>
                                    <div className="sd-quota-bar" style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div className="sd-quota-bar-inner" style={{ width: `${100 * (counts.listings || 0) / Math.max(1, quotaCap)}%`, height: '100%', background: '#059669', transition: 'width 0.3s ease' }}></div>
                                    </div>
                                </div>
                                <div className="sd-quota-note" style={{ fontSize: '12px', color: '#64748b' }}>Free tier includes {quotaCap} simultaneous active items. Need more? Request from Quota & Services tab.</div>
                            </div>

                            {/* Inventory Section */}
                            <div className="bd-section bd-glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
                                <div className="bd-section-header" style={{ marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Your Inventory</h3>
                                </div>
                                
                                <Load state={list}>
                                    <div className="sd-inventory-tabs" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                        <button style={{ paddingBottom: '8px', borderBottom: invTab === 'Active' ? '2px solid #059669' : '2px solid transparent', color: invTab === 'Active' ? '#059669' : '#64748b', fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }} onClick={() => setInvTab('Active')}>Active</button>
                                        <button style={{ paddingBottom: '8px', borderBottom: invTab === 'Closed' ? '2px solid #059669' : '2px solid transparent', color: invTab === 'Closed' ? '#059669' : '#64748b', fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }} onClick={() => setInvTab('Closed')}>Sold / Closed</button>
                                    </div>
                                    
                                    <div className="sd-inventory-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {list.data?.items.filter((r: Item) => invTab === 'Active' ? r.status !== 'Closed' : r.status === 'Closed').map((r: Item) => (
                                            <div className="sd-item-card" key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: '16px' }}>
                                                <div className="sd-item-info" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                    {r.images?.[0] ? <img style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} src={r.images[0]} alt="" /> : <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#f1f5f9' }}></div>}
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{r.category || 'Category'}</span>
                                                        <h4 style={{ margin: '4px 0', fontSize: '15px', color: '#0f172a' }}>{r.title}</h4>
                                                        <strong style={{ color: '#059669' }}>{money(r.price)}</strong>
                                                    </div>
                                                </div>
                                                <div className="sd-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => actions.open('listing-form', r)}><Edit2 size={14} /> Edit</button>
                                                    <button style={{ padding: '8px 12px', background: '#fff', border: '1px solid #eab308', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#ca8a04', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => actions.open('payment', r)}><Zap size={14} /> Promote</button>
                                                    <button style={{ padding: '8px 12px', background: '#fff', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#dc2626', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => actions.open('confirm', { title: 'Delete this listing?', text: `"${r.title}" will be removed from the marketplace. This cannot be undone.`, path: 'listings/' + r.id, method: 'DELETE' })}><Trash2 size={14} /> Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                        {list.data?.items.length === 0 && <Empty title="No listings yet" text="Create your first one to get started."/>}
                                    </div>
                                    <Pager page={page} total={list.data?.total || 0} onChange={setPage}/>
                                </Load>
                            </div>
                        </div>
                    )}

                    {/* OTHER TABS */}
                    {tab === 'requests' && (
                        <Load state={list}>
                            <div className="record-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {list.data?.items.map((r: Item) => (
                                    <article key={r.id} style={{ background: '#fff', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                        <div>
                                            <button className="record-title" onClick={() => actions.open('request', r)} style={{ background: 'none', border: 'none', fontSize: '16px', fontWeight: 700, color: '#0f172a', padding: 0, cursor: 'pointer', textAlign: 'left' }}>{r.title}</button>
                                            <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0' }}>
                                                {money(r.price)} · {r.location} · <Status>{r.status}</Status>
                                            </p>
                                        </div>
                                        <div className="action-wrap" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                            <button style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => actions.open('request', r)}>View details</button>
                                            {['Open', 'Responses Received'].includes(r.status) && (
                                                <button style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => actions.open('request-form', r)}>Edit request</button>
                                            )}
                                        </div>
                                    </article>
                                ))}
                                {list.data?.items.length === 0 && <Empty title="No requests yet" text="Create your first one to get started." />}
                            </div>
                            <Pager page={page} total={list.data?.total || 0} onChange={setPage} />
                        </Load>
                    )}
                    {tab === 'offers' && <div className="bd-section bd-glass-panel" style={{ padding: '24px' }}><Offers actions={actions}/></div>} 
                    {tab === 'received' && <div className="bd-section bd-glass-panel" style={{ padding: '24px' }}><Offers actions={actions} received/></div>}
                    {tab === 'services' && <SellerServices actions={actions}/>}
                    {tab === 'profile' && <Load state={me}>{me.data && <ProfileEditor key={me.data.profile.id} item={me.data.profile} actions={actions}/>}</Load>}
                </main>
            </div>

            {editProfileOpen && <ProfileDialog profile={profile} actions={actions} onClose={() => setEditProfileOpen(false)} />}
        </div>
    );
}

function ProfileEditor({ item, actions }: { item: Item; actions: Actions; }) { const [f, setF] = useState({ ...item }), [busy, setBusy] = useState(false); return <form className="bd-section bd-glass-panel" style={{ padding: '24px' }} onSubmit={async (e) => { e.preventDefault(); setBusy(true); await actions.perform('profile', 'PATCH', f); setBusy(false); }}><h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', margin: 0 }}>Edit Your Profile</h2><div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}><TextField label="Display name" value={f.name} onChange={v => setF({ ...f, name: v })}/><TextField label="City" value={f.location} required={false} onChange={v => setF({ ...f, location: v })}/><label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>About you<textarea style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '100px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px' }} maxLength={1500} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })}/></label><div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}><h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#334155' }}>Contact & Meetup Details</h4><p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>These are pre-filled into your listings so buyers can reach you directly.</p><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}><TextField label="Phone Number" value={f.phone || ''} required={false} onChange={v => setF({ ...f, phone: v })}/></div><div style={{ marginTop: '12px' }}><TextField label="Preferred Meetup Spot" value={f.meetup_spot || ''} required={false} onChange={v => setF({ ...f, meetup_spot: v })}/></div></div><label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>Account capabilities<Choice label="Account capabilities" value={f.role} onChange={v => setF({ ...f, role: v })} options={[{ value: 'buyer', label: 'Buyer: requests and reviews' }, { value: 'seller', label: 'Seller: listings and offers' }, { value: 'both', label: 'Buyer and seller' }]}/></label><Photos max={1} values={f.avatar ? [f.avatar] : []} onChange={v => setF({ ...f, avatar: v[0] || '' })}/></div><div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}><button style={{ padding: '12px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} disabled={busy}>Save Profile</button><button type="button" style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => actions.open('profile', { id: actions.user!.id })}>View Public Profile</button></div></form>; }

export function SellerServices({ actions }: { actions: Actions; }) { const [page, setPage] = useState(1), [promotionPage, setPromotionPage] = useState(1), [pack, setPack] = useState(5); const state = useLoad('services?page=' + page + '&promotionPage=' + promotionPage, actions.revision), data = state.data; return <Load state={state}>{data && <><div className="bd-section bd-glass-panel" style={{ padding: '24px', marginBottom: '24px' }}><h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', marginTop: 0 }}>Listing Quota & Services</h2><div className="sd-add-quota" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}><div className="sd-add-header" style={{ marginBottom: '16px' }}><h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>Add Listing Quota</h4><p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Rs. {data.settings.extraListingPrice} / slot flat rate</p></div><div className="sd-quota-options" role="radiogroup" aria-label="Extra listings">{[5, 10].map(n => <button type="button" key={n} role="radio" aria-checked={pack === n} className={'sd-quota-option' + (pack === n ? ' selected' : '')} onClick={() => setPack(n)}><strong>+{n} Listings</strong><span>Rs. {data.settings.extraListingPrice * n}</span></button>)}</div><button type="button" className="sd-quota-request" onClick={() => actions.open('payment', { quantity: pack })}>Request +{pack} Listings</button></div></div><div className="bd-section bd-glass-panel" style={{ padding: '24px' }}><h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Payment Requests</h3>{data.payments.items.map((p: Item) => <div className="service-row" key={p.id} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span><strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{p.purpose === 'slots' ? p.quantity + ' additional slots' : p.duration + '-day promotion'}</strong><small style={{ color: '#64748b', fontSize: '12px' }}>{p.reference} · {p.created?.slice(0,10)}</small></span><span style={{ textAlign: 'right' }}><strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>{money(p.amount)}</strong><Status>{p.status}</Status></span></div>)}{data.payments.total === 0 && <Empty title="No service requests yet"/>}<Pager page={page} total={data.payments.total} onChange={setPage}/></div></>}</Load>; }
