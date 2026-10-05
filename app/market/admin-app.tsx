'use client';
import { useEffect, useId, useState, ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Lock, LogOut, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Actions, Item, api, setApiBase } from './ui';
import { Admin, CategoryForm, ModerateForm, PaymentReview, ResetCode } from './admin';
import { ListingDetail, RequestDetail, ProfileDetail } from './details';

type Session = { configured: boolean; setupAvailable: boolean; signedIn: boolean; email: string };
type Failure = { message?: string; status?: number };

async function adminCall(path: string, body?: Record<string, unknown>) {
    const r = await fetch('/api/admin/' + path, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { cache: 'no-store' });
    const d = await r.json().catch(() => ({})) as { error?: string } & Record<string, unknown>;
    if (!r.ok)
        throw Object.assign(new Error(d.error || 'Unable to complete this action.'), { status: r.status });
    return d;
}

function Field({ label, icon, value, onChange, type = 'text', autoComplete, placeholder, minLength }: {
    label: string; icon: ReactNode; value: string; onChange: (v: string) => void;
    type?: string; autoComplete?: string; placeholder?: string; minLength?: number;
}) {
    const id = useId();
    const [show, setShow] = useState(false);
    const secret = type === 'password';
    return (
        <div className="pp-auth-field">
            <label htmlFor={id}>{label}</label>
            <div className="pp-auth-input-wrap">
                {icon}
                <input id={id} required type={secret && show ? 'text' : type} value={value} onChange={e => onChange(e.target.value)}
                    autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} maxLength={secret ? 128 : 254} />
                {secret && (
                    <button type="button" className="pp-auth-eye-btn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
}

function Gate({ session, onDone }: { session: Session; onDone: () => void }) {
    const setup = !session.configured;
    const [code, setCode] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (setup && password !== confirm) { setError('The two passwords do not match.'); return; }
        setBusy(true);
        try {
            await adminCall(setup ? 'setup' : 'login', setup ? { code, email, password } : { email, password });
            onDone();
        } catch (e: unknown) {
            setError((e as Failure).message || 'Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="pp-auth-page-container">
            <div className="pp-auth-modal">
                <div className="pp-auth-header">
                    <img src="/new-logo.png" alt="Picking Price" style={{ height: '56px', width: 'auto', display: 'block', margin: '0 auto 16px' }} />
                    <h1 className="pp-auth-title">{setup ? 'Create the Admin Account' : 'Admin Sign In'}</h1>
                </div>
                {setup && !session.setupAvailable ? (
                    <p role="alert" style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                        The administrator account has not been created yet, and setup is switched off on this server.
                        Set <strong>ADMIN_SETUP_CODE</strong> (16 characters or more) in the server configuration, restart, then reload this page.
                    </p>
                ) : (
                    <form className="pp-auth-form" onSubmit={submit}>
                        {setup && <Field label="Setup code" icon={<KeyRound size={16} className="pp-auth-input-icon" />} type="password" autoComplete="off" value={code} onChange={setCode} placeholder="From the server configuration" />}
                        <Field label="Admin email" icon={<Mail size={16} className="pp-auth-input-icon" />} type="email" autoComplete="username" value={email} onChange={setEmail} placeholder="admin@example.com" />
                        <Field label="Password" icon={<Lock size={16} className="pp-auth-input-icon" />} type="password" autoComplete={setup ? 'new-password' : 'current-password'} value={password} onChange={setPassword} placeholder={setup ? 'At least 12 characters' : 'Your password'} minLength={setup ? 12 : undefined} />
                        {setup && <Field label="Confirm password" icon={<Lock size={16} className="pp-auth-input-icon" />} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} placeholder="Repeat the password" minLength={12} />}
                        {error && <div className="pp-auth-error" role="alert">{error}</div>}
                        <button type="submit" className="pp-auth-submit-btn" disabled={busy}>
                            {busy ? 'Please wait…' : setup ? 'Create admin account' : 'Sign in'}
                            <ArrowRight size={18} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function PasswordForm({ done, expired }: { done: () => void; expired: () => void }) {
    const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (next !== confirm) { setError('The two new passwords do not match.'); return; }
        setBusy(true);
        try {
            await adminCall('password', { current, next });
            toast.success('Password changed. Other signed-in devices were signed out.');
            done();
        } catch (e: unknown) {
            const err = e as Failure;
            if (err.status === 401) expired();
            else setError(err.message || 'Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="pp-auth-form" onSubmit={submit}>
            <Field label="Current password" icon={<Lock size={16} className="pp-auth-input-icon" />} type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
            <Field label="New password" icon={<KeyRound size={16} className="pp-auth-input-icon" />} type="password" autoComplete="new-password" value={next} onChange={setNext} placeholder="At least 12 characters" minLength={12} />
            <Field label="Confirm new password" icon={<KeyRound size={16} className="pp-auth-input-icon" />} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} minLength={12} />
            {error && <div className="pp-auth-error" role="alert">{error}</div>}
            <button type="submit" className="pp-auth-submit-btn" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>
    );
}

const barButton = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, borderRadius: '50px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: '#fff', cursor: 'pointer' } as const;
const titles: Record<string, string> = {
    listing: 'Listing details', request: 'Request details', profile: 'Member profile', inspection: 'Record details',
    'category-form': 'Category settings', moderate: 'Moderation action', 'payment-review': 'Verify manual payment', 'reset-code': 'Member password reset', password: 'Change admin password',
};

export default function AdminApp() {
    const [session, setSession] = useState<Session | null>(null);
    const [failed, setFailed] = useState('');
    const [revision, setRevision] = useState(0);
    const [modal, setModal] = useState<{ type: string; item: Item } | null>(null);

    const load = () => adminCall('session')
        .then(s => { setFailed(''); setSession(s as unknown as Session); })
        .catch((e: Failure) => setFailed(e.message || 'Unable to reach the server.'));

    useEffect(() => {
        // Must run before the panel mounts: the panel only renders once the session below has loaded.
        setApiBase('/api/admin/market/');
        load();
        window.addEventListener('focus', load);
        return () => window.removeEventListener('focus', load);
    }, []);

    const close = () => setModal(null);
    const expired = () => { close(); toast.error('Your session has ended. Sign in again.'); load(); };

    if (!session)
        return (
            <div className="pp-auth-page-container">
                {failed
                    ? <div className="error" role="alert">{failed} <button onClick={load}>Retry</button></div>
                    : <span role="status">Loading…</span>}
            </div>
        );
    if (!session.signedIn)
        return <Gate session={session} onDone={load} />;

    const perform = async (path: string, method = 'POST', body?: Record<string, unknown>) => {
        try {
            const d = await api(path, method, body);
            setRevision(v => v + 1);
            toast.success('Saved successfully');
            return d;
        } catch (e: unknown) {
            const err = e as Failure;
            if (err.status === 401) expired();
            else toast.error(err.message || 'Unable to complete this action.');
            return null;
        }
    };
    const actions: Actions = {
        open: (type, item = {}) => { if (titles[type] && type !== 'password') setModal({ type, item }); },
        go: () => { },
        perform,
        user: { id: 'admin', name: 'Administrator', role: 'admin' },
        location: '', revision, categories: [], refresh: () => setRevision(v => v + 1),
        searchQuery: '', setSearchQuery: () => { }, submitSearch: () => { }, searchTick: 0, takeSearchScroll: () => false, searchCategory: 'all', setSearchCategory: () => { },
        readOnly: true,
    };
    const signOut = async () => {
        try { await adminCall('logout', {}); } catch { toast.error('Sign-out failed. Try again.'); }
        close();
        load();
    };
    const item = modal?.item || {};

    return (
        <>
            <Toaster position="bottom-right" richColors />
            <header className="adm-bar" style={{ background: '#0f172a', color: '#fff', padding: '12px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div className="adm-bar-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '16px' }}>
                    <ShieldCheck size={20} color="#34d399" /> Picking Price Admin
                </div>
                <div className="adm-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="adm-bar-email" style={{ fontSize: '13px', color: '#cbd5e1', overflowWrap: 'anywhere' }}>{session.email}</span>
                    <button style={barButton} onClick={() => setModal({ type: 'password', item: {} })}><KeyRound size={14} /> Change password</button>
                    <button style={barButton} onClick={signOut}><LogOut size={14} /> Sign out</button>
                </div>
            </header>

            <Admin actions={actions} />

            <Dialog open={!!modal} onOpenChange={o => !o && close()}>
                <DialogContent className={'market-modal ' + (['listing', 'request', 'profile', 'inspection'].includes(modal?.type || '') ? 'wide-modal' : '')}>
                    <DialogTitle className={modal?.type === 'request' ? 'sr-only' : ''}>{titles[modal?.type || ''] || 'Details'}</DialogTitle>
                    <DialogDescription>
                        {modal?.type === 'payment-review' ? 'Verify the external transfer before activating this service.'
                            : modal?.type === 'password' ? 'You will stay signed in here. Every other admin session is signed out.'
                                : ''}
                    </DialogDescription>
                    {modal?.type === 'listing' && <ListingDetail item={item} actions={actions} />}
                    {modal?.type === 'request' && <RequestDetail item={item} actions={actions} />}
                    {modal?.type === 'profile' && <ProfileDetail item={item} actions={actions} />}
                    {modal?.type === 'category-form' && <CategoryForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'moderate' && <ModerateForm item={item} actions={actions} done={close} />}
                    {modal?.type === 'payment-review' && <PaymentReview item={item} actions={actions} done={close} />}
                    {modal?.type === 'reset-code' && <ResetCode key={String(item.id)} item={item} actions={actions} />}
                    {modal?.type === 'password' && <PasswordForm done={close} expired={expired} />}
                    {modal?.type === 'inspection' && (
                        <div className="inspection">
                            {Object.entries(item).map(([k, v]) => (
                                <div key={k}><strong>{k.replaceAll('_', ' ')}</strong><pre>{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '')}</pre></div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
