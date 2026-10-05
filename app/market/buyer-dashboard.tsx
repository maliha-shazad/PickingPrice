import { useState } from 'react';
import { Actions, Item, useLoad, Load, money, Status, Photo } from './ui';
import { ProfileDialog } from './profile-dialog';
import { Bell, Bookmark, MessageCircle, Eye, CheckCircle2, ShieldCheck, Edit2, MapPin, Calendar, LayoutDashboard } from 'lucide-react';

export function BuyerDashboard({ actions, setMode }: { actions: Actions, setMode: (m: 'Buying' | 'Selling') => void }) {
    const me = useLoad('me', actions.revision);
    const requests = useLoad('requests?mine=1', actions.revision);
    const favorites = useLoad('listings?saved=1', actions.revision);
    const conversations = useLoad('conversations', actions.revision);

    const [reqTab, setReqTab] = useState('active');
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    if (!me.data) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    const profile = me.data.profile || {};
    const counts = me.data.counts || {};


    return (
        <div className="bd-container">
            {/* Header Area */}
            <div className="bd-header-area">
                <div className="bd-header-title">
                    <LayoutDashboard size={24} className="bd-header-icon" />
                    <h1>Buyer Dashboard</h1>
                </div>
                <div className="bd-mode-toggle">
                    <button className="active"><ShieldCheck size={16}/> Buyer Mode</button>
                    <button onClick={() => setMode('Selling')}>Seller Hub <span className="free-badge">{(me.data?.settings?.freeListings || 10) + (profile.extra_slots || 0)} Free</span></button>
                </div>
            </div>

            <div className="bd-layout">
                {/* Left Sidebar */}
                <aside className="bd-sidebar">
                    {/* Profile Card */}
                    <div className="bd-profile-card">
                        <div className="bd-profile-cover"></div>
                        <div className="bd-profile-avatar-wrap">
                            <Photo src={profile.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Zainab"} alt="Profile" className="bd-avatar" />
                            <button className="bd-edit-icon-btn" onClick={() => setEditProfileOpen(true)} aria-label="Edit Profile">
                                <Edit2 size={14} />
                            </button>
                        </div>
                        <div className="bd-profile-info">
                            <h2>{profile.name || actions.user?.name} {profile.verified && <CheckCircle2 size={16} color="#10b981" />}</h2>
                            <div className="bd-profile-meta">
                                <span><MapPin size={12}/> {profile.location || 'Lahore, PK'}</span>
                                <span><Calendar size={12}/> Joined {new Date(profile.created || Date.now()).getFullYear()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bd-stats-vertical">
                        <div className="bd-v-stat">
                            <div className="bd-v-stat-icon orange"><Bell size={16}/></div>
                            <div className="bd-v-stat-text">
                                <strong>{counts.requests || 0} Requests</strong>
                                <span>Active & Pending</span>
                            </div>
                        </div>
                        <div className="bd-v-stat">
                            <div className="bd-v-stat-icon green"><Bookmark size={16}/></div>
                            <div className="bd-v-stat-text">
                                <strong>{counts.favorites || 0} Wishlist</strong>
                                <span>Saved Items</span>
                            </div>
                        </div>
                        <div className="bd-v-stat">
                            <div className="bd-v-stat-icon blue"><MessageCircle size={16}/></div>
                            <div className="bd-v-stat-text">
                                <strong>{counts.messages || 0} Messages</strong>
                                <span>Unread Inquiries</span>
                            </div>
                        </div>
                    </div>

                    <div className="bd-safety-tip">
                        <div className="bd-safety-icon"><ShieldCheck size={20} color="#059669" /></div>
                        <div>
                            <strong>Safe-Trade Promise</strong>
                            <p>Always inspect items thoroughly in safe, public meeting places before transferring cash.</p>
                        </div>
                    </div>
                </aside>

                {/* Right Content */}
                <main className="bd-main-content">
                    {/* Buyer Advantage Banner */}
                    <div className="bd-banner">
                        <div className="bd-banner-content">
                            <div className="bd-banner-label">★ BUYER ADVANTAGE</div>
                            <h3>Can't find what you need?</h3>
                            <p>Post a quick on-demand request. Verified local sellers compete with their lowest prices.</p>
                            <button className="bd-banner-btn" onClick={() => actions.open('request-form')}>
                                📢 Post New On-Demand Request
                            </button>
                        </div>
                        <div className="bd-banner-graphic">
                            <ShieldCheck size={120} opacity={0.1} />
                        </div>
                    </div>

                    {/* My Requests Section */}
                    <div className="bd-section bd-glass-panel">
                        <div className="bd-section-header">
                            <h3>My Active Requests <span className="bd-badge">{requests.data?.total || 0} Total</span></h3>
                            <button className="bd-view-all" onClick={() => actions.go('BuyerRequests')}>Go to Live Board</button>
                        </div>
                        
                        <Load state={requests}>
                            {requests.data?.total === 0 ? (
                                <div className="bd-empty-state">
                                    <Bell size={32} opacity={0.3} />
                                    <p>You haven't posted any requests yet.</p>
                                    <button onClick={() => actions.open('request-form')}>Post your first request</button>
                                </div>
                            ) : (
                                <div className="bd-request-grid">
                                    {(requests.data?.items || []).map((req: any) => (
                                        <div className="bd-req-card" key={req.id}>
                                            <div className="bd-req-top">
                                                <div className="bd-req-cat">{req.category || 'General'}</div>
                                                <div className="bd-req-status">{req.status || 'Open'}</div>
                                            </div>
                                            <h4 className="bd-req-title">{req.title}</h4>
                                            <div className="bd-req-price">Budget: {money(req.price)}</div>
                                            <div className="bd-req-meta">
                                                <span>Condition: {req.condition || 'Any'}</span>
                                                <span>{req.location || 'Anywhere'}</span>
                                            </div>
                                            <div className="bd-req-actions">
                                                <button className="bd-btn-primary" onClick={() => actions.open('request-form', req)}>Edit Request</button>
                                                <button className="bd-btn-secondary" onClick={() => actions.open('request', req)}>Offers</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Load>
                    </div>

                    {/* Saved Wishlist & Chats Row */}
                    <div className="bd-two-cols">
                        <div className="bd-section bd-glass-panel">
                            <div className="bd-section-header">
                                <h3>Saved Wishlist</h3>
                                <button className="bd-view-all" onClick={() => actions.go('Saved')}>View All</button>
                            </div>
                            <Load state={favorites}>
                                {favorites.data?.total === 0 ? (
                                    <div className="bd-empty-state-small">No saved items.</div>
                                ) : (
                                    <div className="bd-wishlist-scroll">
                                        {(favorites.data?.items || []).slice(0, 4).map((fav: any) => (
                                            <div className="bd-wish-card" key={fav.id}>
                                                <div className="bd-wish-img">
                                                    <Photo src={Array.isArray(fav.images) ? fav.images[0] : fav.image} alt={fav.title} />
                                                </div>
                                                <div className="bd-wish-info">
                                                    <h4>{fav.title}</h4>
                                                    <p>{fav.price ? money(Number(fav.price)) : ''}</p>
                                                    <button className="bd-wish-contact" onClick={() => actions.open('listing', fav)}><Eye size={12}/> View</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Load>
                        </div>

                        <div className="bd-section bd-glass-panel">
                            <div className="bd-section-header">
                                <h3>Recent Inquiries</h3>
                                <button className="bd-view-all" onClick={() => actions.go('Messages')}>All Chats</button>
                            </div>
                            <Load state={conversations}>
                                {conversations.data?.total === 0 ? (
                                    <div className="bd-empty-state-small">No messages yet.</div>
                                ) : (
                                    <div className="bd-chat-list">
                                        {(conversations.data?.items || []).slice(0, 4).map((chat: any) => (
                                            <div className="bd-chat-row" key={chat.id} onClick={() => actions.open('conversation', { id: chat.id })}>
                                                <div className="bd-chat-avatar">{(chat.other_name || chat.title || 'U').charAt(0)}</div>
                                                <div className="bd-chat-content">
                                                    <div className="bd-chat-head">
                                                        <strong>{chat.other_name || 'User'}</strong>
                                                    </div>
                                                    <div className="bd-chat-msg">{chat.title || 'Conversation'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Load>
                        </div>
                    </div>
                </main>
            </div>
            {editProfileOpen && <ProfileDialog profile={profile} actions={actions} onClose={() => setEditProfileOpen(false)} />}

            <style dangerouslySetInnerHTML={{__html: `
                .bd-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; font-family: 'Inter', sans-serif; }
                
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
                .bd-main-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px; }

                .bd-profile-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); position: relative; border: 1px solid #f1f5f9; }
                .bd-profile-cover { height: 80px; background: linear-gradient(135deg, #115e59, #059669); }
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
                .bd-v-stat-text strong { font-size: 16px; font-weight: 700; color: #1e293b; }
                .bd-v-stat-text span { font-size: 12px; color: #64748b; font-weight: 500; }

                .bd-safety-tip { background: linear-gradient(to right, #ecfdf5, #dcfce7); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; border: 1px solid #bbf7d0; }
                .bd-safety-icon { width: 36px; height: 36px; background: #fff; border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); }
                .bd-safety-tip strong { display: block; font-size: 14px; color: #065f46; margin-bottom: 6px; }
                .bd-safety-tip p { font-size: 12.5px; color: #047857; margin: 0; line-height: 1.5; font-weight: 500; }

                .bd-banner { background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 20px; padding: 32px; color: #fff; display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); }
                .bd-banner-content { position: relative; z-index: 2; max-width: 400px; }
                .bd-banner-label { font-size: 11px; font-weight: 800; color: #38bdf8; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase; }
                .bd-banner-content h3 { font-size: 26px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px; }
                .bd-banner-content p { font-size: 15px; color: #94a3b8; margin: 0 0 24px; line-height: 1.6; }
                .bd-banner-btn { background: #0ea5e9; color: #fff; font-size: 15px; font-weight: 600; border: 0; padding: 14px 24px; border-radius: 10px; cursor: pointer; transition: background 0.2s; }
                .bd-banner-btn:hover { background: #0284c7; }
                .bd-banner-graphic { position: absolute; right: 40px; top: 50%; transform: translateY(-50%); color: #334155; }

                .bd-glass-panel { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f8fafc; }
                .bd-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .bd-section-header h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 8px; }
                .bd-badge { background: #f1f5f9; color: #475569; font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
                .bd-view-all { background: transparent; border: 0; color: #059669; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; }
                .bd-view-all:hover { color: #047857; text-decoration: underline; }

                .bd-request-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
                .bd-req-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; transition: border-color 0.2s, box-shadow 0.2s; }
                .bd-req-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .bd-req-top { display: flex; justify-content: space-between; margin-bottom: 12px; }
                .bd-req-cat { font-size: 12px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 12px; }
                .bd-req-status { font-size: 12px; font-weight: 600; color: #ea580c; background: #ffedd5; padding: 4px 10px; border-radius: 12px; }
                .bd-req-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 8px; line-height: 1.4; }
                .bd-req-price { font-size: 15px; font-weight: 800; color: #059669; margin-bottom: 12px; }
                .bd-req-meta { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #64748b; margin-bottom: 20px; }
                
                .bd-req-actions { display: flex; gap: 12px; }
                .bd-btn-primary { flex: 1; background: #1e293b; color: #fff; border: 0; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                .bd-btn-primary:hover { background: #0f172a; }
                .bd-btn-secondary { background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                .bd-btn-secondary:hover { background: #f8fafc; }
                
                .bd-btn-primary-save { flex: 1; background: #115e59; color: #fff; border: 0; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }

                .bd-two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                
                .bd-wishlist-scroll { display: flex; flex-direction: column; gap: 12px; }
                .bd-wish-card { display: flex; gap: 16px; align-items: center; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; transition: background 0.2s; cursor: pointer; }
                .bd-wish-card:hover { background: #f8fafc; }
                .bd-wish-img { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #f1f5f9; }
                .bd-wish-img img { width: 100%; height: 100%; object-fit: cover; }
                .bd-wish-info { flex: 1; min-width: 0; }
                .bd-wish-info h4 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .bd-wish-info p { font-size: 13px; font-weight: 700; color: #059669; margin: 0; }
                .bd-wish-contact { background: #ecfdf5; color: #059669; border: 0; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-left: auto; }

                .bd-chat-list { display: flex; flex-direction: column; gap: 8px; }
                .bd-chat-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; cursor: pointer; transition: background 0.2s; border: 1px solid transparent; }
                .bd-chat-row:hover { background: #f8fafc; border-color: #f1f5f9; }
                .bd-chat-avatar { width: 40px; height: 40px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 14px; }
                .bd-chat-content { flex: 1; min-width: 0; }
                .bd-chat-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .bd-chat-head strong { font-size: 14px; font-weight: 600; color: #1e293b; }
                .bd-chat-msg { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .bd-empty-state { text-align: center; padding: 40px 20px; color: #94a3b8; border: 2px dashed #f1f5f9; border-radius: 16px; margin-top: 16px; }
                .bd-empty-state svg { margin: 0 auto 16px; display: block; }
                .bd-empty-state p { font-size: 15px; margin: 0 0 16px; }
                .bd-empty-state button { background: #f1f5f9; color: #1e293b; border: 0; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
                .bd-empty-state-small { padding: 30px; text-align: center; color: #94a3b8; font-size: 14px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0; }

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
                
                @media (max-width: 900px) {
                    .bd-layout { flex-direction: column; }
                    .bd-sidebar { width: 100%; }
                    .bd-two-cols { grid-template-columns: 1fr; }
                    .bd-request-grid { grid-template-columns: 1fr; }
                }
                @media (max-width: 600px) {
                    .bd-header-area { flex-direction: column; align-items: center; gap: 12px; }
                    .bd-header-title { justify-content: center; }
                    .bd-banner { flex-direction: column; align-items: flex-start; gap: 16px; padding: 24px; }
                    .bd-banner-graphic { display: none; }
                    .bd-req-actions { flex-direction: column; gap: 8px; }
                    .bd-section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
                    .bd-req-top { flex-direction: column; gap: 8px; align-items: flex-start; }
                    .bd-req-price { margin-bottom: 8px; }
                }
            `}} />
        </div>
    );
}
