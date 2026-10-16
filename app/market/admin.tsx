import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Actions, Item, useLoad, Load, Pager, Choice, money, date, Status, Empty } from './ui';
import { TextField } from './forms';
import { ShieldAlert, Users, Package, Settings, BadgeDollarSign, Activity, Settings2, ListChecks, Megaphone, Star, History, Trash2, Images, Search, CalendarDays, ChevronRight } from 'lucide-react';

// Overview cards: an icon, a colour, a plain label and the tab each count opens. Pending payments and open reports
// are the two that need the administrator, so they are flagged when not zero.
const STAT_LOOK: Record<string, { icon: ReactNode; bg: string; fg: string; label: string; attention?: boolean }> = {
    users: { icon: <Users size={18} />, bg: '#e0f2fe', fg: '#0369a1', label: 'Members' },
    listings: { icon: <Package size={18} />, bg: '#ffedd5', fg: '#c2410c', label: 'Listings' },
    requests: { icon: <ListChecks size={18} />, bg: '#dcfce7', fg: '#15803d', label: 'Open requests' },
    payments: { icon: <BadgeDollarSign size={18} />, bg: '#fef9c3', fg: '#a16207', label: 'Payments to verify', attention: true },
    reports: { icon: <ShieldAlert size={18} />, bg: '#fee2e2', fg: '#b91c1c', label: 'Open reports', attention: true },
    promotions: { icon: <Megaphone size={18} />, bg: '#ede9fe', fg: '#6d28d9', label: 'Active Premium' },
};

export function Admin({ actions }: { actions: Actions; }) {
    // Coming back from connecting Gmail lands on Settings, where the result is shown.
    const [tab, setTab] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mail') ? 'settings' : 'users');
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');

    const stats = useLoad('admin/stats', actions.revision);
    const state = useLoad('admin/' + tab + '?page=' + page + '&q=' + encodeURIComponent(q), actions.revision);

    return (
        <div className="bd-container adm-panel">
            <style dangerouslySetInnerHTML={{__html: `
                .bd-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; font-family: 'Inter', sans-serif; }
                .bd-header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                .bd-header-title { display: flex; align-items: center; gap: 12px; }
                .bd-header-icon { color: #0d5c45; }
                .bd-header-title h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
                .bd-mode-toggle { background: #f1f5f9; border-radius: 50px; padding: 4px 16px; display: inline-flex; align-items: center; }
                .bd-layout { display: flex; gap: 32px; align-items: flex-start; }
                .bd-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }
                .bd-main-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0; }
                .bd-profile-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
                .bd-profile-cover { height: 80px; }
                .bd-profile-info { padding: 16px 20px 24px; text-align: center; }
                .bd-profile-info h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px; display: flex; align-items: center; justify-content: center; gap: 6px; }
                .bd-profile-meta { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #64748b; font-weight: 500; }
                .bd-profile-meta span { display: flex; align-items: center; justify-content: center; gap: 6px; }
                .bd-stats-vertical { display: flex; flex-direction: column; gap: 12px; }
                .bd-v-stat { background: #fff; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid #f8fafc; transition: transform 0.2s; }
                .bd-v-stat:hover { transform: translateY(-2px); }
                .bd-v-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .bd-v-stat-text { display: flex; flex-direction: column; gap: 2px; }
                .bd-v-stat-text strong { font-size: 14px; font-weight: 700; color: #1e293b; text-transform: capitalize; }
                .bd-v-stat-text span { font-size: 16px; color: #0f172a; font-weight: 800; }
                .bd-glass-panel { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f8fafc; }
                .bd-section { margin-bottom: 0; }
                .bd-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .bd-section-header h3 { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin: 0; }
                .bd-tabs-nav { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
                .bd-tabs-nav { flex-wrap: wrap; }
                .bd-tabs-nav button { flex-shrink: 0; }
                @media (max-width: 1024px) {
                    .bd-layout { flex-direction: column; align-items: stretch; }
                    .bd-sidebar { width: 100%; }
                }
                @media (max-width: 600px) {
                    .bd-container { padding: 20px 14px; }
                    .bd-header-area { flex-direction: column; gap: 12px; margin-bottom: 20px; }
                    .bd-glass-panel { padding: 16px !important; }
                    .bd-settings-grid { grid-template-columns: 1fr !important; }
                    .bd-tabs-nav { flex-wrap: nowrap; scrollbar-width: none; }
                    .bd-tabs-nav::-webkit-scrollbar { display: none; }
                }
            `}} />
            <div className="bd-header-area">
                <div className="bd-header-title">
                    <span className="adm-head-icon"><Settings2 size={22} /></span>
                    <div><h1>Control Center</h1><p className="adm-head-sub">Members, products, payments and the site, in one place</p></div>
                </div>
                <div className="bd-mode-toggle adm-date">
                    <CalendarDays size={14} /> {new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
            </div>

            <div className="bd-layout">
                {/* Left Sidebar */}
                <aside className="bd-sidebar">
                    <div className="bd-profile-card">
                        <div className="bd-profile-cover adm-logo-cover"><a href="/" aria-label="Picking Price home"><img src="/new-logo.png" alt="Picking Price" /></a></div>
                        <div className="bd-profile-info" style={{ marginTop: '0' }}>
                            <h2 style={{ fontSize: '18px' }}>Super Admin</h2>
                            <div className="bd-profile-meta">
                                <span><ShieldAlert size={12}/> Root Privileges</span>
                            </div>
                        </div>
                    </div>

                    <div className="bd-stats-vertical" style={{ marginTop: '24px' }}>
                        <div className="bd-section-header" style={{ marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#94a3b8' }}>Overview</h3>
                        </div>
                        <Load state={stats}>
                            <div className="adm-stats">
                            {stats.data && Object.entries(stats.data).map(([k, v]) => {
                                const look = STAT_LOOK[k], urgent = !!look?.attention && Number(v) > 0;
                                return (
                                <button type="button" className={'bd-v-stat adm-stat' + (urgent ? ' urgent' : '') + (tab === k ? ' current' : '')} key={k} onClick={() => { setTab(k); setPage(1); setQ(''); }} aria-label={'Open ' + (look?.label || k)}>
                                    <div className="bd-v-stat-icon" style={{ background: look?.bg || '#f1f5f9', color: look?.fg || '#475569' }}>{look?.icon || <Activity size={18}/>}</div>
                                    <div className="bd-v-stat-text">
                                        <strong>{look?.label || k}</strong>
                                        <span>{String(v)}</span>
                                    </div>
                                    {urgent ? <em className="adm-stat-flag">Needs attention</em> : <ChevronRight size={16} className="adm-stat-go" />}
                                </button>
                                );
                            })}
                            </div>
                        </Load>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="bd-main-content">
                    <div className="bd-tabs-nav" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        {[
                            ['users', 'Members', <Users size={14}/>],
                            ['listings', 'Listings', <Package size={14}/>],
                            ['requests', 'Requests', <ListChecks size={14}/>],
                            ['payments', 'Payments', <BadgeDollarSign size={14}/>],
                            ['reports', 'Reports', <ShieldAlert size={14}/>],
                            ['promotions', 'Promotions', <Megaphone size={14}/>],
                            ['reviews', 'Reviews', <Star size={14}/>],
                            ['audit', 'Activity log', <History size={14}/>],
                            ['slides', 'Slider', <Images size={14}/>],
                            ['settings', 'Settings', <Settings size={14}/>]
                        ].map(([v, l, icon]) => (
                            <button
                                key={v as string}
                                onClick={() => { setTab(v as string); setPage(1); setQ(''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, background: tab === v ? 'linear-gradient(135deg, #0d5c45, #13805f)' : '#f1f5f9', color: tab === v ? 'white' : '#475569', boxShadow: tab === v ? '0 4px 12px rgba(13,92,69,.25)' : 'none', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
                            >
                                {icon} {l}{(v === 'payments' || v === 'reports') && Number(stats.data?.[v as string]) > 0 && <span className="adm-tab-count">{String(stats.data?.[v as string])}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="bd-section bd-glass-panel" style={{ padding: '24px', minHeight: '500px' }}>
                        {['users', 'listings', 'requests', 'payments'].includes(tab) && (
                            <div className="adm-search">
                                <Search size={16} />
                                <input
                                    style={{ width: '100%', padding: '12px 16px 12px 40px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', boxSizing: 'border-box' }}
                                    aria-label="Search admin records"
                                    placeholder="Search this section..."
                                    value={q}
                                    onChange={e => { setQ(e.target.value); setPage(1); }}
                                />
                            </div>
                        )}

                        <Load state={state}>
                            {tab === 'settings' ? state.data && <SettingsEditor key={actions.revision} data={state.data} actions={actions}/> : tab === 'slides' ? state.data && <SliderEditor data={state.data} actions={actions}/> :
                            <>
                                <div style={{ overflowX: 'auto' }}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Record</TableHead>
                                                <TableHead>Details</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {state.data?.items.map((r: Item) => (
                                                <TableRow key={r.id}>
                                                    <TableCell>
                                                        <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{r.name || r.title || r.reference || r.action || r.target_type || r.kind || r.id}</strong>
                                                        <small style={{ color: '#64748b', fontSize: '11px' }}>ID: {r.id}</small>
                                                    </TableCell>
                                                    <TableCell style={{ fontSize: '13px', color: '#475569' }}>
                                                        {tab === 'payments' ? <>{money(r.amount)} · {r.purpose === 'slots' ? r.quantity + ' slots' : r.duration + '-day Premium Listing'}<br />{r.paid_amount ? <>Paid {money(r.paid_amount)} by {r.method}{r.paid_amount < r.amount ? <strong style={{ color: '#b91c1c' }}> · short</strong> : null}<br /></> : null}{date(r.created)}</> :
                                                         tab === 'reports' ? <><span style={{ color: '#ef4444' }}>{r.reason}</span><br />Target: {r.target_type}</> :
                                                         tab === 'promotions' ? <>{date(r.starts)} – {date(r.expires)}</> :
                                                         tab === 'reviews' ? <>{r.rating} stars · {r.body}</> :
                                                         tab === 'audit' ? <>Target: {r.target}<br />{new Date(r.created).toLocaleString('en-PK')}</> :
                                                         tab === 'requests' ? <>{r.location}<br />Posted {date(r.created)} · Expires {date(r.expiry)}</> :
                                                         r.role || r.location || date(r.created)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Status>{tab === 'users' ? r.suspended ? 'Suspended' : r.verified ? 'Verified' : 'Active' : tab === 'reviews' ? r.hidden ? 'Hidden' : 'Visible' : r.status || 'Recorded'}</Status>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {tab === 'users' && <>
                                                                <button style={actionBtnStyle} onClick={() => actions.open('profile', { id: r.id })}>Profile</button>
                                                                <button style={actionBtnStyleDark} onClick={() => actions.open('moderate', { ...r, type: 'user' })}>Manage</button>
                                                                <button style={actionBtnStyle} onClick={() => actions.open('reset-code', r)}>Reset password</button>
                                                            </>}
                                                            {['listings', 'requests'].includes(tab) && <>
                                                                <button style={actionBtnStyle} onClick={() => actions.open(tab === 'listings' ? 'listing' : 'request', r)}>View</button>
                                                                <button style={actionBtnStyleDark} onClick={() => actions.open('moderate', { ...r, type: tab === 'listings' ? 'listing' : 'request' })}>Moderate</button>
                                                            </>}
                                                            {tab === 'payments' && r.status === 'Pending' && <button style={actionBtnStyleDark} onClick={() => actions.open('payment-review', r)}>Verify</button>}
                                                            {tab === 'reports' && <>
                                                                <button style={actionBtnStyle} onClick={() => actions.open('inspection', r)}>Inspect</button>
                                                                <button style={actionBtnStyleDark} onClick={() => actions.open('moderate', { ...r, type: 'report' })}>Resolve</button>
                                                            </>}
                                                            {tab === 'promotions' && r.status === 'Active' && <button style={actionBtnStyleDark} onClick={() => actions.open('moderate', { ...r, type: 'promotion' })}>Cancel</button>}
                                                            {tab === 'reviews' && <button style={actionBtnStyleDark} onClick={() => actions.open('moderate', { ...r, type: 'review' })}>Moderate</button>}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {state.data?.items.length === 0 && <Empty title="No records found" text="There is nothing to display here." />}
                                <Pager page={page} total={state.data?.total || 0} onChange={setPage}/>
                            </>}
                        </Load>
                    </div>
                </main>
            </div>
        </div>
    );
}

const actionBtnStyle = { padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#334155' };
const actionBtnStyleDark = { padding: '6px 12px', background: '#0d5c45', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#fff' };
const actionBtnStyleDanger = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#fff', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#b91c1c', whiteSpace: 'nowrap' as const };

type MailStatus = { service: string; available: boolean; connected: boolean; email: string; problem: string; since: string; returnAddress: string };
const MAIL_OUTCOME: Record<string, string> = {
    invalid_state: 'The connection was started in another browser or took too long. Press Connect Gmail again.',
    cancelled: 'Google did not give permission. Press Connect Gmail again and allow it.',
    no_permission: 'The permission to send email was not ticked on the Google page. Press Connect Gmail again and tick it.',
    failed: 'Google could not complete the connection. Check the client ID, the client secret and the return address, then try again.',
};
async function mailCall(action = '', body?: Record<string, unknown>) {
    const r = await fetch('/api/admin/mail' + (action ? '/' + action : ''), body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const d = await r.json().catch(() => ({})) as { error?: string } & Record<string, unknown>;
    if (!r.ok)
        throw new Error(d.error || 'Unable to complete this action.');
    return d;
}

/** Settings > Email: the Gmail account that password reset codes and notification emails are sent from. */
function MailSettings() {
    const [status, setStatus] = useState<MailStatus | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(''), [to, setTo] = useState('');
    const load = () => mailCall().then(d => { setStatus(d as unknown as MailStatus); setError(''); }).catch((e: Error) => setError(e.message));
    useEffect(() => {
        // Back from Google: say how it went, and take the answer out of the address bar.
        const outcome = new URLSearchParams(window.location.search).get('mail');
        if (outcome) {
            window.history.replaceState(window.history.state, '', window.location.pathname);
            if (outcome === 'connected')
                toast.success('Gmail connected. Send a test email to check it.');
            else
                toast.error(MAIL_OUTCOME[outcome] || MAIL_OUTCOME.failed);
        }
        load();
    }, []);
    const act = async (name: string, work: () => Promise<void>) => {
        setBusy(name);
        try { await work(); } catch (e: unknown) { toast.error((e as Error).message || 'Unable to complete this action.'); } finally { setBusy(''); }
    };
    const connect = () => act('connect', async () => { const d = await mailCall('connect', {}); window.location.href = String(d.url); });
    const disconnect = () => act('disconnect', async () => { await mailCall('disconnect', {}); toast.success('Gmail disconnected. No email is sent until an account is connected.'); await load(); });
    const test = () => act('test', async () => { const d = await mailCall('test', { to }); toast.success('Test email sent to ' + d.to + '. Check the inbox and the spam folder.'); });
    const note = { margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 };
    const primary = { padding: '10px 18px', background: '#0d5c45', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' };
    const ok = !!status && status.connected && !status.problem;
    return (
        <div id="adm-mail" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Email</h2>
            <p style={note}>Password reset codes and copies of notifications are emailed to members from the Gmail account connected here.</p>
            {error && <p role="alert" style={{ ...note, color: '#b91c1c' }}>{error} <button type="button" style={actionBtnStyle} onClick={load}>Retry</button></p>}
            {status && !status.available && (
                <p id="adm-mail-status" style={{ ...note, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    {status.service === 'resend' ? 'Emails are being sent through Resend. ' : 'Email is switched off: nothing is sent yet. '}
                    To send from a Gmail address, set <strong>GMAIL_CLIENT_ID</strong> and <strong>GMAIL_CLIENT_SECRET</strong> on the server, then reload this page. The steps are in AUTH_SETUP.md.
                </p>
            )}
            {status && status.available && !status.connected && (
                <>
                    <p id="adm-mail-status" style={{ ...note, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#92400e' }}>
                        No Gmail account is connected{status.service === 'resend' ? '; emails are going through Resend for now.' : ', so no email is sent yet.'}
                    </p>
                    <p style={note}>Press the button and sign in with the Gmail address the emails should come from. Google will ask for permission to send email; the site cannot read the mailbox.</p>
                    <p style={{ ...note, fontSize: '13px' }}>The Google OAuth client must list this authorised redirect URI: <code style={{ overflowWrap: 'anywhere' }}>{status.returnAddress}</code></p>
                    <div><button id="adm-mail-connect" type="button" style={primary} disabled={!!busy} onClick={connect}>{busy === 'connect' ? 'Opening Google…' : 'Connect Gmail'}</button></div>
                </>
            )}
            {status && status.available && status.connected && (
                <>
                    <p id="adm-mail-status" style={{ ...note, padding: '14px 16px', borderRadius: '10px', overflowWrap: 'anywhere', ...(ok ? { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#0a5038' } : { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }) }}>
                        {ok
                            ? <>Sending from <strong>{status.email}</strong>, connected on {date(status.since)}.</>
                            : <>Google no longer accepts the connection to <strong>{status.email}</strong> (the permission was removed or has expired), so no email is being sent. Connect it again.</>}
                    </p>
                    {ok && (
                        <form style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); test(); }}>
                            <label style={{ flex: '1 1 240px', fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
                                Send a test email to
                                <input id="adm-mail-to" type="email" maxLength={254} value={to} onChange={e => setTo(e.target.value)} placeholder="Leave empty to use the admin email" style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }} />
                            </label>
                            <button id="adm-mail-test" style={primary} disabled={!!busy}>{busy === 'test' ? 'Sending…' : 'Send test email'}</button>
                        </form>
                    )}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button id="adm-mail-connect" type="button" style={ok ? actionBtnStyle : primary} disabled={!!busy} onClick={connect}>{busy === 'connect' ? 'Opening Google…' : ok ? 'Connect a different account' : 'Connect again'}</button>
                        <button id="adm-mail-disconnect" type="button" style={actionBtnStyleDanger} disabled={!!busy} onClick={disconnect}>Disconnect</button>
                    </div>
                </>
            )}
        </div>
    );
}

function SettingsEditor({ data, actions }: { data: Item; actions: Actions; }) {
    const [f, setF] = useState({ ...data.settings });
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={async (e) => { e.preventDefault(); await actions.perform('admin/settings', 'POST', f); }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Platform Configuration</h2>

                <div className="bd-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[['freeListings', 'Free slots per user'], ['extraListingPrice', 'Price per extra slot (Rs.)']].map(([k, l]) => (
                        <TextField key={k} label={l} type="number" placeholder={k === 'freeListings' ? 'e.g. 10' : 'e.g. 50'} min={k === 'freeListings' ? 0 : 1} value={f[k]} onChange={v => setF({ ...f, [k]: v })}/>
                    ))}
                </div>

                <div className="bd-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {(['promotion24h', 'promotion3d', 'promotion7d'] as const).map((k, i) => (
                        <TextField key={k} label={'Promotion ' + (i + 1) + ' price (Rs.)'} type="number" placeholder="e.g. 150" min={1} value={f[k]} onChange={v => setF({ ...f, [k]: v })}/>
                    ))}
                </div>

                {/* How long each of the three promotions runs. 1 day is shown to sellers as "24 hours". */}
                <div className="bd-settings-grid" id="adm-promo-lengths" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {[0, 1, 2].map(i => (
                        <TextField key={i} label={'Promotion ' + (i + 1) + ' length (days)'} type="number" placeholder="e.g. 3" min={1} value={(f.promotionDurations || [1, 3, 7])[i]} onChange={v => { const next = [...(f.promotionDurations || [1, 3, 7])]; next[i] = v; setF({ ...f, promotionDurations: next }); }}/>
                    ))}
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
                    Where promoted products appear
                    <select id="adm-promo-placement" className="pp-select" style={{ padding: '10px 36px 10px 12px', borderRadius: '8px', fontSize: '14px' }} value={f.promotionPlacement || 'featured-first'} onChange={e => setF({ ...f, promotionPlacement: e.target.value })}>
                        <option value="featured-first">First in the lists, with a Premium badge</option>
                        <option value="badge-only">In normal order, with a Premium badge only</option>
                    </select>
                </label>

                <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px', color: '#334155' }}>
                    Payment Instructions (Bank / Wallets)
                    <textarea style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '100px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} maxLength={3000} value={f.paymentInstructions} onChange={e => setF({ ...f, paymentInstructions: e.target.value })} placeholder="Enter payment instructions for sellers..."/>
                </label>

                <div>
                    <button style={{ padding: '12px 24px', background: '#0d5c45', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Save Configurations</button>
                </div>
            </form>

            <MailSettings />

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Categories</h2>
                    <button style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }} onClick={() => actions.open('category-form', {})}>+ Add Category</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.categories.map((c: Item) => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            <div>
                                <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>{c.name}</strong>
                                <small style={{ color: '#64748b', fontSize: '13px' }}>{c.subcategories.join(', ')}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Status>{c.active ? 'Active' : 'Disabled'}</Status>
                                <button style={actionBtnStyle} onClick={() => actions.open('category-form', c)}>Edit</button>
                                <button style={actionBtnStyleDanger} aria-label={'Delete ' + c.name} onClick={() => actions.open('category-delete', c)}><Trash2 size={13} /> Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function CategoryForm({ item, actions, done }: { item: Item; actions: Actions; done: () => void; }) {
    const [name, setName] = useState(item.name || ''), [subs, setSubs] = useState((item.subcategories || []).join(', ')), [active, setActive] = useState(item.active !== 0);
    return (
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={async (e) => { e.preventDefault(); if (await actions.perform('admin/categories', 'POST', { id: item.id, name, subcategories: subs.split(',').map((s: string) => s.trim()).filter(Boolean), active })) done(); }}>
            <TextField label="Category Name" placeholder="e.g. Mobile Phones" maxLength={80} value={name} onChange={setName}/>
            <TextField label="Subcategories (comma-separated)" placeholder="e.g. Android, iPhone, Accessories" value={subs} required={false} maxLength={1000} onChange={setSubs}/>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
                <Switch checked={active} onCheckedChange={setActive}/> Active Status
            </label>
            <button style={{ padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>Save Category</button>
        </form>
    );
}

/** Confirms and deletes a category. One that products or requests still use cannot be deleted, only switched off. */
export function CategoryDelete({ item, actions, done }: { item: Item; actions: Actions; done: () => void; }) {
    const [busy, setBusy] = useState(false);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: 1.6 }}>Delete the category <strong style={{ color: '#0f172a' }}>{item.name}</strong>? It disappears from the member app and from this list. This cannot be undone.</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>A category that products or requests still use cannot be deleted. Switch it off with Edit instead: it stays on those items but can no longer be chosen.</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" disabled={busy} style={{ flex: '1 1 160px', padding: '12px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={async () => { setBusy(true); const r = await actions.perform('admin/categories/' + encodeURIComponent(String(item.id)), 'DELETE'); setBusy(false); if (r) done(); }}>{busy ? 'Deleting…' : 'Delete category'}</button>
                <button type="button" disabled={busy} style={{ flex: '1 1 120px', padding: '12px 20px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={done}>Keep it</button>
            </div>
        </div>
    );
}

export function ModerateForm({ item, actions, done }: { item: Item; actions: Actions; done: () => void; }) {
    const options: Record<string, string[]> = { user: ['warn', 'suspend', 'restore', 'verify', 'unverify'], listing: ['hide', 'restore', 'delete'], request: ['hide', 'restore', 'cancel', 'delete'], review: ['hide', 'restore', 'delete'], report: ['resolve', 'dismiss'], promotion: ['cancel'] };
    // What each action does, shown under the choice so the administrator knows before applying it.
    const effects: Record<string, string> = { warn: 'Sends the member a warning; nothing else changes.', suspend: 'Signs the member out and blocks sign-in until restored.', restore: item.type === 'user' ? 'Lets the member sign in and use the site again.' : 'Shows it on the site again.', verify: 'Adds the Verified badge to the member.', unverify: 'Removes the Verified badge.', hide: 'Hides it from everyone except its owner; it can be restored later.', delete: item.type === 'review' ? 'Removes the review for good.' : item.type === 'listing' ? 'Removes the listing for good, frees the seller\'s slot and ends any Premium Listing.' : 'Removes the request for good; sellers with an open offer are told.', cancel: item.type === 'promotion' ? 'Ends the Premium Listing now; the product stays listed.' : 'Closes the request; sellers with an open offer are told.', resolve: 'Marks the report as handled; the reporter is told action was taken.', dismiss: 'Closes the report; the reporter is told no action was needed.' };
    const labels: Record<string, string> = { warn: 'Warn', suspend: 'Suspend', restore: 'Restore', verify: 'Verify', unverify: 'Remove verification', hide: 'Hide', delete: 'Delete', cancel: 'Cancel', resolve: 'Resolve', dismiss: 'Dismiss' };
    const [action, setAction] = useState(options[item.type][0]), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [sure, setSure] = useState(false);
    const harsh = ['delete', 'suspend'].includes(action);
    useEffect(() => setSure(false), [action]);
    return (
        <form className="adm-moderate" onSubmit={async (e) => { e.preventDefault(); if (harsh && !sure) { setSure(true); return; } setBusy(true); const ok = await actions.perform('admin/moderate', 'POST', { type: item.type, id: item.id, action, reason }); setBusy(false); if (ok) done(); }}>
            <p className="adm-moderate-target"><span>{item.type === 'user' ? 'Member' : item.type === 'promotion' ? 'Premium Listing' : String(item.type).charAt(0).toUpperCase() + String(item.type).slice(1)}</span>{String(item.name || item.title || item.reason || item.id)}</p>
            <div className="adm-moderate-field"><span>Action to take</span><Choice label="Action to take" value={action} onChange={setAction} options={options[item.type].map(v => ({ value: v, label: labels[v] }))}/></div>
            <p className={'adm-moderate-effect' + (harsh ? ' harsh' : '')}>{effects[action]}</p>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                Reason / Note (Sent to member)
                <textarea style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '100px', width: '100%', boxSizing: 'border-box' }} required minLength={5} maxLength={1000} placeholder="Explain the reason; the member will read this" value={reason} onChange={e => setReason(e.target.value)}/>
            </label>
            <p className="adm-moderate-note">The member gets a notification and an email saying what was done and why.</p>
            {harsh && sure && <p className="adm-moderate-effect harsh" role="alert">Press again to confirm. {action === 'delete' ? 'This cannot be undone.' : 'The member stays signed out until you restore the account.'}</p>}
            <div className="adm-moderate-actions">
                <button type="button" className="adm-moderate-cancel" onClick={done} disabled={busy}>Cancel</button>
                <button type="submit" className={'adm-moderate-apply' + (harsh ? ' harsh' : '')} disabled={busy}>{busy ? 'Applying…' : harsh && sure ? 'Yes, ' + labels[action].toLowerCase() : labels[action]}</button>
            </div>
        </form>
    );
}

export function ResetCode({ item, actions }: { item: Item; actions: Actions; }) {
    const [issued, setIssued] = useState<Item | null>(null), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
    const note = { margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Member: {item.name || item.id}</p>
            {!issued ? <>
                <p style={note}>This creates a one-time code that lets the member choose a new password on the “Forgot Password” page. Confirm who you are talking to first, for example by calling their registered phone number: anyone holding the code and the member’s email can take over the account.</p>
                <button style={{ padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} disabled={busy} onClick={async () => { setBusy(true); const r = await actions.perform('admin/reset-code', 'POST', { id: item.id }); setBusy(false); if (r) setIssued(r); }}>{busy ? 'Generating…' : 'Generate reset code'}</button>
            </> : <>
                <div style={{ padding: '18px', background: '#f1f5f9', borderRadius: '12px', textAlign: 'center' }}>
                    <div data-reset-code style={{ fontFamily: 'monospace', fontSize: '26px', fontWeight: 700, letterSpacing: '2px', color: '#0f172a', overflowWrap: 'anywhere' }}>{issued.code}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', overflowWrap: 'anywhere' }}>for {issued.email}</div>
                </div>
                <button style={actionBtnStyle} onClick={async () => { try { await navigator.clipboard.writeText(issued.code); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy code'}</button>
                <p style={note}>Valid for {issued.minutes} minutes and for one use. It is not shown again, and generating a new code cancels this one. Using it signs the member out everywhere else.</p>
            </>}
        </div>
    );
}

export function PaymentReview({ item, actions, done }: { item: Item; actions: Actions; done: () => void; }) {
    const [status, setStatus] = useState('Approved'), [note, setNote] = useState(''), [confirmed, setConfirmed] = useState(false);
    return (
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={async (e) => { e.preventDefault(); if (status === 'Approved' && !confirmed) return; if (await actions.perform('admin/payments/' + item.id, 'POST', { status, note })) done(); }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>{money(item.amount)} · {item.purpose === 'slots' ? item.quantity + ' extra listing slots' : item.duration + '-day Premium Listing'}</h3>
            <PaymentCheck item={item} />
            <div style={{ padding: '12px', background: '#fffbeb', color: '#b45309', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>Find this transfer in your bank or wallet account and check that the amount, sender and reference match before approving.</div>
            <Choice label="Decision" value={status} onChange={setStatus} options={['Approved', 'Rejected']}/>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                Review Note (Optional unless rejected)
                <textarea style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px', width: '100%', boxSizing: 'border-box' }} required={status === 'Rejected'} minLength={status === 'Rejected' ? 5 : 0} maxLength={1000} placeholder={status === 'Rejected' ? 'Why the payment is rejected (the seller will read this)' : 'Optional note for the seller'} value={note} onChange={e => setNote(e.target.value)}/>
            </label>
            {status === 'Approved' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
                    <Switch checked={confirmed} onCheckedChange={setConfirmed}/> Externally Verified
                </label>
            )}
            <button style={{ padding: '12px 24px', background: status === 'Approved' ? '#0d5c45' : '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} disabled={status === 'Approved' && !confirmed}>Confirm Decision</button>
        </form>
    );
}

/** Uploads a slider image or video; returns its address, or '' after showing what went wrong. */
async function uploadSlideFile(kind: string, file: File) {
    const max = kind === 'video' ? 50 : 10;
    if (file.size > max * 1024 * 1024) { toast.error(`${kind === 'video' ? 'Videos' : 'Images'} can be up to ${max} MB.`); return ''; }
    try {
        const r = await fetch('/api/admin/files', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
        const d: { url?: string; mime?: string; error?: string } = await r.json();
        if (!r.ok || !d.url) throw Error(d.error || 'Upload failed.');
        if (!String(d.mime).startsWith(kind + '/')) throw Error(kind === 'video' ? 'That file is not a video.' : 'That file is not an image.');
        return d.url;
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed.'); return ''; }
}
const WIDE_HINT = 'Best size 1920 × 600 (16 : 5). Computers and tablets show it whole; phones trim the sides unless you add a phone version.';
const PHONE_HINT = 'Best size 1080 × 540 (2 : 1). Phones show it instead of the wide one, so nothing is cut off.';

/** Admin panel > Slider: the slides shown on the home page (image, video or YouTube link), each image or video
 * with an optional phone version. */
function SliderEditor({ data, actions }: { data: Item; actions: Actions; }) {
    const slides: Item[] = (data.items as Item[]) || [];
    const [kind, setKind] = useState('image');
    const [url, setUrl] = useState('');
    const [mobileUrl, setMobileUrl] = useState('');
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [busy, setBusy] = useState(false);
    const full = slides.length >= Number(data.max || 10);

    async function upload(e: React.ChangeEvent<HTMLInputElement>, phone = false) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        const address = await uploadSlideFile(kind, file);
        setBusy(false);
        if (!address) return;
        if (phone) { setMobileUrl(address); toast.success('Phone version uploaded.'); }
        else { setUrl(address); toast.success('Uploaded. Add a phone version, a title or a link if you like, then press Add slide.'); }
    }
    async function add(e: React.FormEvent) {
        e.preventDefault();
        if (!url.trim()) { toast.error(kind === 'youtube' ? 'Paste the YouTube link.' : 'Upload the file first.'); return; }
        setBusy(true);
        const ok = await actions.perform('admin/slides', 'POST', { kind, url: url.trim(), mobileUrl: kind === 'youtube' ? '' : mobileUrl, title, link, order: slides.length });
        setBusy(false);
        if (ok) { setUrl(''); setMobileUrl(''); setTitle(''); setLink(''); }
    }

    return (
        <div className="adm-slider">
            <div>
                <h2 className="adm-slider-h">Slider</h2>
                <p className="adm-slider-note">Slides appear on the home page (Discover), above the categories, in the order below. Images change every 6 seconds and videos every 15. Until you add a slide the site shows its own three sample banners. Up to {String(data.max || 10)} slides. Wide files: 1920 × 600; phone versions: 1080 × 540.</p>
            </div>

            <form className="adm-slider-form" onSubmit={add}>
                <h3>Add a slide</h3>
                <div className="adm-slider-kinds" role="radiogroup" aria-label="Slide type">
                    {[['image', 'Image upload'], ['video', 'Video upload'], ['youtube', 'YouTube link']].map(([v, l]) => (
                        <button type="button" key={v} role="radio" aria-checked={kind === v} className={kind === v ? 'active' : ''} onClick={() => { setKind(v); setUrl(''); setMobileUrl(''); }}>{l}</button>
                    ))}
                </div>
                {kind === 'youtube'
                    ? <label>YouTube link<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
                    : <div className="adm-slider-files">
                        <label>{kind === 'video' ? 'Video for computers and tablets (MP4 or WebM, up to 50 MB; plays muted)' : 'Image for computers and tablets (JPEG, PNG or WebP, up to 10 MB)'}
                            <small className="adm-slider-hint">{WIDE_HINT}</small>
                            <input type="file" accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={e => upload(e)} disabled={busy} />
                            {!!url && <span className="adm-slider-ok">Uploaded ✓</span>}
                        </label>
                        <label>{kind === 'video' ? 'Phone version (optional video)' : 'Phone version (optional image)'}
                            <small className="adm-slider-hint">{PHONE_HINT}</small>
                            <input type="file" accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={e => upload(e, true)} disabled={busy} />
                            {!!mobileUrl && <span className="adm-slider-ok">Phone version uploaded ✓ <button type="button" className="adm-slide-keep" onClick={() => setMobileUrl('')}>Remove</button></span>}
                        </label>
                    </div>}
                <div className="adm-slider-row">
                    <label>Title (optional)<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} placeholder="e.g. Eid sale on electronics" /></label>
                    <label>Link when pressed (optional)<input value={link} maxLength={500} onChange={e => setLink(e.target.value)} placeholder="/#brandnew or https://..." /></label>
                </div>
                <button type="submit" className="adm-slider-add" disabled={busy || full}>{full ? 'Slider is full' : busy ? 'Please wait…' : 'Add slide'}</button>
            </form>

            <div className="adm-slider-list">
                {slides.length === 0 && <Empty title="No slides yet" text="Add an image, a video or a YouTube link above." />}
                {slides.map((s, i) => <SlideRow key={String(s.id) + ':' + String(s.sort_order) + ':' + String(s.active)} slide={s} position={i + 1} actions={actions} />)}
            </div>
        </div>
    );
}

function SlideRow({ slide, position, actions }: { slide: Item; position: number; actions: Actions; }) {
    const [title, setTitle] = useState(String(slide.title || ''));
    const [link, setLink] = useState(String(slide.link || ''));
    const [order, setOrder] = useState(String(slide.sort_order ?? 0));
    const [confirming, setConfirming] = useState(false);
    const [uploading, setUploading] = useState(false);
    const video = /[?&]v=([\w-]{11})/.exec(String(slide.url))?.[1];
    const phoneFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setUploading(true);
        const address = await uploadSlideFile(String(slide.kind), file);
        if (address) await actions.perform('admin/slides/' + slide.id, 'POST', { mobileUrl: address });
        setUploading(false);
    };
    const phonePreview = slide.kind === 'video' ? <video src={String(slide.mobile_url)} muted preload="metadata" /> : <img src={String(slide.mobile_url)} alt="" />;
    const preview = slide.kind === 'youtube'
        ? <img src={`https://i.ytimg.com/vi/${video}/mqdefault.jpg`} alt="" />
        : slide.kind === 'video' ? <video src={String(slide.url)} muted preload="metadata" /> : <img src={String(slide.url)} alt="" />;
    return (
        <div className={'adm-slide' + (slide.active ? '' : ' off')}>
            <div className="adm-slide-preview">{preview}<span>{position}</span></div>
            <div className="adm-slide-fields">
                <div className="adm-slide-top">
                    <strong>{slide.kind === 'youtube' ? 'YouTube video' : slide.kind === 'video' ? 'Video' : 'Image'}</strong>
                    <label className="adm-slide-active"><Switch checked={!!slide.active} onCheckedChange={v => actions.perform('admin/slides/' + slide.id, 'POST', { active: v })} /> {slide.active ? 'Shown' : 'Hidden'}</label>
                </div>
                <div className="adm-slider-row">
                    <label>Title<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label>
                    <label>Link<input value={link} maxLength={500} onChange={e => setLink(e.target.value)} placeholder="/#brandnew or https://..." /></label>
                    <label className="adm-slide-order">Position<input type="number" min={0} max={1000} value={order} onChange={e => setOrder(e.target.value)} /></label>
                </div>
                {slide.kind !== 'youtube' && (
                    <div className="adm-slide-phone">
                        <div className="adm-slide-phone-preview">{slide.mobile_url ? phonePreview : <span>No phone version</span>}</div>
                        <div className="adm-slide-phone-text">
                            <strong>Phone version</strong>
                            <small>{slide.mobile_url ? 'Phones show this one. ' : 'Phones show the wide one with its sides trimmed. '}{PHONE_HINT}</small>
                            <div className="adm-slide-phone-actions">
                                <label className="adm-slide-upload">{uploading ? 'Uploading…' : slide.mobile_url ? 'Replace' : 'Upload phone version'}
                                    <input type="file" hidden accept={slide.kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={phoneFile} disabled={uploading} />
                                </label>
                                {!!slide.mobile_url && <button type="button" className="adm-slide-keep" onClick={() => actions.perform('admin/slides/' + slide.id, 'POST', { mobileUrl: '' })}>Remove</button>}
                            </div>
                        </div>
                    </div>
                )}
                <div className="adm-slide-actions">
                    <button type="button" className="adm-slide-save" onClick={() => actions.perform('admin/slides/' + slide.id, 'POST', { title, link, order: Number(order) })}>Save</button>
                    {confirming
                        ? <span className="adm-slide-confirm">Delete it? <button type="button" className="adm-slide-delete" onClick={() => actions.perform('admin/slides/' + slide.id, 'DELETE')}>Yes, delete</button> <button type="button" className="adm-slide-keep" onClick={() => setConfirming(false)}>No</button></span>
                        : <button type="button" className="adm-slide-delete" onClick={() => setConfirming(true)}><Trash2 size={14} /> Delete</button>}
                </div>
            </div>
        </div>
    );
}

/** The seller's payment details beside what was due, for cross-checking against the bank or wallet account. */
function PaymentCheck({ item }: { item: Item }) {
    if (!item.paid_amount)
        return <p className="adm-pay-legacy">Reference: <strong>{item.reference}</strong> · Submitted {date(item.created)}<br />No payment details were given with this request (it was sent before they were asked for).</p>;
    const short = item.paid_amount < item.amount, over = item.paid_amount > item.amount;
    const rows: [string, ReactNode][] = [
        ['Price due', money(item.amount)],
        ['Amount paid', <span className={short ? 'adm-pay-bad' : over ? 'adm-pay-warn' : 'adm-pay-ok'}>{money(item.paid_amount)}{short ? ' (less than the price)' : over ? ' (more than the price)' : ' (matches)'}</span>],
        ['Paid with', item.method],
        ['Sender name', item.sender_name],
        ['Sender account / wallet', item.sender_account],
        ['Date paid', item.paid_on],
        ['Transaction ID', item.reference],
        ['Submitted', date(item.created)],
    ];
    return (
        <div className="adm-pay-check">
            <table><tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
            {!!item.receipt && <a className="adm-pay-receipt" href={String(item.receipt)} target="_blank" rel="noopener"><img src={String(item.receipt)} alt="Payment receipt" /><span>Open the receipt</span></a>}
        </div>
    );
}
