import { Actions, money, date, Item, useLoadAll, Status, Load } from './ui';
import { MapPin, Clock, ArrowUpRight, Plus } from 'lucide-react';
import { sampleRequests } from '../samples';

export function MyRequests({ actions }: { actions: Actions }) {
    const state = useLoadAll('requests', actions.revision);
    const realRequests = state.data?.items || [];
    
    // Global rule: if real data exists, hide dummies
    const hasRealData = state.data?.total > 0;
    const displayed = hasRealData ? realRequests : sampleRequests.slice(0, 9);

    return (
        <div className="br-container">
            <div className="br-header-wrap">
                <div>
                    <h1 className="br-title">Live Buyer Requests</h1>
                    <p className="br-subtitle">See what the community is looking for and make an offer.</p>
                </div>
                <button className="br-post-btn" onClick={() => actions.open('request-form')}>
                    <Plus size={18} /> Post a Request
                </button>
            </div>

            <Load state={state}>
                {displayed.length === 0 ? (
                    <div className="br-empty">No buyer requests found yet. Be the first to post!</div>
                ) : (
                    <div className="br-grid">
                        {displayed.map((p: Item) => (
                            <article className="br-card" key={p.id}>
                                <div className="br-card-top">
                                    <Status>{p.status || 'Open'}</Status>
                                    <span className="br-time"><Clock size={12}/> {p.sample ? 'Sample' : date(p.created)}</span>
                                </div>
                                <h3 className="br-card-title">{p.title}</h3>
                                <p className="br-card-desc">{p.description}</p>
                                
                                <div className="br-card-budget">
                                    <span>Target Budget</span>
                                    <strong>{money(p.price)}</strong>
                                </div>
                                
                                <div className="br-card-meta">
                                    <span className="br-pill"><MapPin size={12}/> {p.location}</span>
                                    <span className="br-pill">{p.condition}</span>
                                </div>
                                
                                <button className="br-card-btn" onClick={() => actions.open('request', p)}>
                                    Make an Offer <ArrowUpRight size={16} />
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </Load>

            {!!state.data && !hasRealData && (
                <div className="br-notice">
                    Showing sample data. Once a real request is posted, these samples will automatically disappear.
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .br-container { max-width: 1200px; margin: 0 auto; padding: 40px 5%; font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh; }
                
                .br-header-wrap { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; gap: 20px; flex-wrap: wrap; }
                .br-title { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px; letter-spacing: -0.5px; }
                .br-subtitle { font-size: 15px; color: #64748b; margin: 0; }
                .br-post-btn { background: #0f766e; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; white-space: nowrap; }
                .br-post-btn:hover { background: #0d9488; }
                
                /* Grid: 3 columns */
                .br-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
                
                /* Refined Card Design */
                .br-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
                .br-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06); border-color: #cbd5e1; }
                
                .br-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .br-time { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px; font-weight: 500; }
                
                .br-card-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .br-card-desc { font-size: 14px; color: #64748b; margin: 0 0 20px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1; }
                
                .br-card-budget { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
                .br-card-budget span { font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
                .br-card-budget strong { font-size: 18px; font-weight: 800; color: #14532d; }
                
                .br-card-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
                .br-pill { background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 100px; display: flex; align-items: center; gap: 4px; }
                
                .br-card-btn { width: 100%; background: white; border: 1px solid #cbd5e1; color: #0f172a; font-size: 14px; font-weight: 600; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
                .br-card-btn:hover { background: #f8fafc; border-color: #94a3b8; }
                
                .br-empty { grid-column: 1 / -1; background: white; border: 1px dashed #cbd5e1; padding: 60px 20px; text-align: center; border-radius: 16px; color: #64748b; font-size: 15px; }
                .br-notice { margin-top: 32px; background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; color: #92400e; font-size: 14px; text-align: center; }
                
                @media (max-width: 900px) {
                    .br-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
                @media (max-width: 600px) {
                    .br-grid { grid-template-columns: 1fr; }
                    .br-header-wrap { flex-direction: column; align-items: flex-start; }
                    .br-post-btn { width: 100%; justify-content: center; }
                }
            `}} />
        </div>
    );
}
