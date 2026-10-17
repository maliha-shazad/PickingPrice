import { useEffect, useState } from 'react';
import { Eye, EyeOff, ArrowRight, UserPlus, ShoppingBag, Store, Mail, Lock, Check, User, Key } from 'lucide-react';
import { toast } from 'sonner';

/** Where to send someone after they sign in: the page they were heading to (`?next=`), or home. Only paths on this site are accepted. */
const mustAccept = 'Please accept the Privacy Policy and Terms of Service to create an account.';

export function afterAuthPath() {
    const next = new URLSearchParams(window.location.search).get('next') || '/';
    return /^\/(?![/\\])/.test(next) ? next : '/';
}

export default function AuthDialog({ mode, onSuccess }: { mode: string, onSuccess: () => Promise<void> }) {
    const [tab, setTab] = useState(mode === 'login' ? 'login' : 'signup');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [google, setGoogle] = useState(false);
    const [error, setError] = useState('');
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [role, setRole] = useState('buyer'); // 'buyer' or 'seller'
    const [remember, setRemember] = useState(false);
    const [accepted, setAccepted] = useState(false); // sign-up needs the Privacy Policy and Terms of Service accepted
    // An email waiting for its confirmation code (after sign-up, or a log-in to an account not confirmed yet).
    const [pending, setPending] = useState<{ email: string; sent: boolean } | null>(null);
    const [code, setCode] = useState('');
    const [wait, setWait] = useState(0); // seconds until the code can be sent again
    useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

    useEffect(() => {
        fetch('/api/auth/options')
            .then(r => r.json())
            .then((d: { google?: boolean }) => setGoogle(d.google === true))
            .catch(() => setGoogle(false));
    }, []);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (tab === 'signup' && password !== confirm) { setError('The two passwords do not match.'); return; }
        if (tab === 'signup' && !accepted) { setError(mustAccept); return; }
        setBusy(true);
        try {
            const r = await fetch('/api/auth/' + tab, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tab === 'signup' ? { name, email, phone, password, role, accepted } : { email, password })
            });
            const d: { error?: string; confirm?: boolean; email?: string; sent?: boolean } = await r.json();
            if (!r.ok) throw Error(d.error || 'Please try again.');
            if (d.confirm) {
                // Not signed in yet: the code emailed to the address confirms it first.
                setPending({ email: d.email || email.trim(), sent: !!d.sent }); setCode(''); setWait(45); setPassword(''); setConfirm('');
                return;
            }
            await onSuccess();
            setPassword('');
            setConfirm('');
            toast.success(tab === 'signup' ? 'Welcome to Picking Price!' : 'Welcome back!');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'An error occurred');
        } finally {
            setBusy(false);
        }
    }

    const post = async (path: string, body: Record<string, unknown>) => {
        const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d: { error?: string } = await r.json().catch(() => ({}));
        if (!r.ok) throw Error(d.error || 'Please try again.');
    };

    async function confirmCode(e: React.FormEvent) {
        e.preventDefault();
        if (!pending) return;
        setError(''); setBusy(true);
        try {
            await post('/api/auth/confirm', { email: pending.email, code });
            await onSuccess();
            toast.success('Email confirmed. Welcome to Picking Price!');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Please try again.');
        } finally {
            setBusy(false);
        }
    }

    async function resendCode() {
        if (!pending) return;
        setError(''); setBusy(true);
        try {
            await post('/api/auth/confirm/resend', { email: pending.email });
            setPending({ ...pending, sent: true }); setCode(''); setWait(45);
            toast.success('A new code is on its way.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Please try again.');
        } finally {
            setBusy(false);
        }
    }

    // Step two of signing up: the code from the email. Shown instead of the form until the address is confirmed.
    if (pending) return (
        <div className="pp-auth-modal">
            <div className="pp-auth-header">
                <div className="pp-auth-logo-img">
                    <a href="/" aria-label="Picking Price home"><img src="/new-logo.png" alt="Picking Price" style={{ height: '56px', width: 'auto', display: 'block', margin: '0 auto 16px' }} /></a>
                </div>
                <h2 className="pp-auth-title">Confirm Your Email</h2>
            </div>
            <form className="pp-auth-form" onSubmit={confirmCode}>
                <p className="pp-auth-confirm-note">
                    {pending.sent
                        ? <>We sent a 6-digit code to <strong>{pending.email}</strong>. Enter it below to start using your account. It is valid for 15 minutes; check the spam folder too.</>
                        : <>The code could not be sent to <strong>{pending.email}</strong> just now. Press <strong>Resend code</strong> in a moment.</>}
                </p>
                <div className="pp-auth-field">
                    <label htmlFor="confirm-code">Confirmation Code <span className="req">*</span></label>
                    <div className="pp-auth-input-wrap">
                        <Key size={16} className="pp-auth-input-icon" />
                        <input id="confirm-code" required type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" />
                    </div>
                </div>
                {error && <div className="pp-auth-error" role="alert">{error}</div>}
                <button type="submit" id="confirm-submit" className="pp-auth-submit-btn" disabled={busy || code.length !== 6}>
                    {busy ? 'Please wait…' : 'Confirm Email'}
                    <ArrowRight size={18} />
                </button>
                <div className="pp-auth-confirm-links">
                    <button type="button" id="confirm-resend" disabled={wait > 0 || busy} onClick={resendCode}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</button>
                    <button type="button" onClick={() => { setPending(null); setError(''); setCode(''); }}>Use a different email</button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="pp-auth-modal">
            <div className="pp-auth-header">
                <div className="pp-auth-logo-img">
                    <a href="/" aria-label="Picking Price home"><img src="/new-logo.png" alt="Picking Price" style={{ height: '56px', width: 'auto', display: 'block', margin: '0 auto 16px' }} /></a>
                </div>
                <h2 className="pp-auth-title">{tab === 'signup' ? 'Create an Account' : 'Welcome Back'}</h2>
            </div>

                <div className="pp-auth-role-tabs">
                    <button 
                        type="button"
                        className={`pp-auth-role-tab ${role === 'buyer' ? 'active' : ''}`}
                        onClick={() => setRole('buyer')}
                    >
                        <ShoppingBag size={15} /> Buyer Account
                    </button>
                    <button 
                        type="button"
                        className={`pp-auth-role-tab ${role === 'seller' ? 'active' : ''}`}
                        onClick={() => setRole('seller')}
                    >
                        <Store size={15} /> Seller Account
                    </button>
                </div>

                <form className="pp-auth-form" onSubmit={submit}>
                    {tab === 'signup' ? (
                        <>
                            <div className="pp-auth-field">
                                <label>Full Name <span className="req">*</span></label>
                                <div className="pp-auth-input-wrap">
                                    <User size={16} className="pp-auth-input-icon" />
                                    <input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
                                </div>
                            </div>
                            <div className="pp-auth-field">
                                <label>Mobile Number <span className="req">*</span></label>
                                <div className="pp-auth-input-wrap">
                                    <div className="pp-auth-phone-prefix">
                                        <span className="pk-badge">[PK]</span> +92
                                    </div>
                                    <input required type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={phone} onChange={e => setPhone(e.target.value)} placeholder="3001234567" style={{ paddingLeft: '85px' }} />
                                </div>
                            </div>
                            <div className="pp-auth-field">
                                <label>Email Address <span className="req">*</span></label>
                                <div className="pp-auth-input-wrap">
                                    <Mail size={16} className="pp-auth-input-icon" />
                                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" />
                                </div>
                            </div>
                            <div className="pp-auth-field">
                                <label>Password <span className="req">*</span></label>
                                <div className="pp-auth-input-wrap">
                                    <Lock size={16} className="pp-auth-input-icon" />
                                    <input required type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" minLength={8} maxLength={128} />
                                    <button type="button" className="pp-auth-eye-btn" onClick={() => setShow(!show)}>
                                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="pp-auth-password-hint">
                                    <span>At least 8 characters (letters & numbers)</span>
                                    {password.length > 7 && <span className="strength-good">Good Strength</span>}
                                </div>
                            </div>
                            <div className="pp-auth-field">
                                <div className="pp-auth-label-row">
                                    <label>Confirm Password <span className="req">*</span></label>
                                    {confirm.length > 0 && confirm === password && <span className="strength-good" style={{ fontSize: '12px' }}>Passwords match</span>}
                                </div>
                                <div className="pp-auth-input-wrap">
                                    <Lock size={16} className="pp-auth-input-icon" />
                                    <input required type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" maxLength={128} />
                                </div>
                            </div>
                            <label className="pp-auth-remember pp-auth-terms">
                                <input id="signup-accept" type="checkbox" required checked={accepted} onChange={e => { setAccepted(e.target.checked); setError(''); }} className="sr-only" />
                                <div className={`pp-auth-checkbox ${accepted ? 'checked' : ''}`}>
                                    {accepted && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span>I accept the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener">Terms of Service</a></span>
                            </label>
                        </>
                    ) : (
                        <>
                            <div className="pp-auth-field">
                                <label>Email or Phone Number</label>
                                <div className="pp-auth-input-wrap">
                                    <Mail size={16} className="pp-auth-input-icon" />
                                    <input required type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email or Phone Number" />
                                </div>
                            </div>
                            <div className="pp-auth-field">
                                <label>Password</label>
                                <div className="pp-auth-input-wrap">
                                    <Lock size={16} className="pp-auth-input-icon" />
                                    <input required type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
                                    <button type="button" className="pp-auth-eye-btn" onClick={() => setShow(!show)}>
                                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="pp-auth-options">
                                <label className="pp-auth-remember">
                                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="sr-only" />
                                    <div className={`pp-auth-checkbox ${remember ? 'checked' : ''}`}>
                                        {remember && <Check size={12} strokeWidth={3} />}
                                    </div>
                                    Remember me
                                </label>
                                <a href="/forgot-password" className="pp-auth-forgot">Forgot Password?</a>
                            </div>
                        </>
                    )}

                    {error && <div className="pp-auth-error">{error}</div>}

                    <button type="submit" className="pp-auth-submit-btn" disabled={busy || (tab === 'signup' && !accepted)}>
                        {busy ? 'Please wait…' : (tab === 'signup' ? 'Create Free Account' : 'Log In to Picking Price')}
                        <ArrowRight size={18} />
                    </button>
                </form>

                <div className="pp-auth-divider">
                    <span>OR CONTINUE WITH</span>
                </div>

                <a className="pp-auth-google-btn" href={google ? "/api/auth/google" : "#"} onClick={(e) => { if (!google) e.preventDefault(); }}>
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="pp-auth-google-icon" />
                    Google
                </a>

                {tab === 'login' ? (
                    <div className="pp-auth-switch-box">
                        <div>
                            <p>New to Picking Price?</p>
                            <h3>Create an Account</h3>
                        </div>
                        <button type="button" className="pp-auth-switch-btn" onClick={() => { setTab('signup'); setError(''); setPassword(''); setConfirm(''); }}>
                            Signup
                            <UserPlus size={15} />
                        </button>
                    </div>
                ) : (
                    <div className="pp-auth-switch-text">
                        Already have an Account? <button type="button" onClick={() => { setTab('login'); setError(''); setPassword(''); setConfirm(''); }}>Log In <ArrowRight size={14}/></button>
                    </div>
                )}
        </div>
    );
}
