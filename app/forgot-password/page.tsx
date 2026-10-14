import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Key, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, ArrowRight, Mail } from 'lucide-react';
import '../market/styles.css';

// Forgot password in three steps: the account's email, the code that was emailed to it, the new password.
// A code from support (for accounts without email, or when email is not set up) is entered on the same step.
export default function ForgotPasswordPage() {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);        // whether a code was emailed (false: the member brought one from support)
    const [wait, setWait] = useState(0);            // seconds until "Resend code" is offered again
    useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

    const hasUpper = /[A-Z]/.test(password);
    const hasNumOrSym = /[0-9!@#$%^&*]/.test(password);
    const hasLength = password.length >= 8;
    const strengthText = hasLength && hasUpper && hasNumOrSym ? 'Strong' : 'Weak';
    const strengthColor = strengthText === 'Strong' ? '#16a34a' : '#8fa395';

    const post = async (path: string, body: Record<string, unknown>) => {
        const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d: { error?: string } = await r.json().catch(() => ({}));
        if (!r.ok) throw Error(d.error || 'Please try again.');
        return d;
    };

    const sendCode = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!email.trim()) { setError('Please enter the email address of your account.'); return; }
        setError(''); setBusy(true);
        try {
            await post('/api/auth/forgot', { email: email.trim() });
            setSent(true); setCode(''); setWait(45); setStep(2);
        } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
        setBusy(false);
    };

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter the email address of your account.'); return; }
        setError(''); setBusy(true);
        try {
            await post('/api/auth/reset/verify', { email: email.trim(), code });
            setStep(3);
        } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
        setBusy(false);
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (!hasLength || !hasUpper || !hasNumOrSym) { setError('Please meet all password requirements.'); return; }
        setBusy(true);
        try {
            await post('/api/auth/reset', { email: email.trim(), code, password });
            setStep(4);
        } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
        setBusy(false);
    };

    const titles = { 1: 'Find Your Account', 2: 'Enter Your Code', 3: 'Reset Your Password', 4: 'Password Updated' };
    const note = { fontSize: '13px', color: '#4a6352', lineHeight: 1.6, margin: 0 };
    const link = { background: 'none', border: 0, padding: 0, color: '#1c694a', fontWeight: 700, fontSize: '13px', cursor: 'pointer' } as const;

    return (
        <div className="pp-forgot-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e6f7f4 0%, #fef5f5 100%)', minHeight: '100vh', padding: '20px' }}>
            <div className="pp-forgot-card" style={{ background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '440px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', position: 'relative' }}>

                <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4a6352', textDecoration: 'none', marginBottom: '24px' }}>
                    <ArrowLeft size={16} /> Back to Log In
                </a>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', background: step === 4 ? '#dcfce7' : '#eef2f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step === 4 ? '#16a34a' : '#1a5c42' }}>
                        {step === 4 ? <CheckCircle2 size={26} strokeWidth={2.5} /> : <RotateCcw size={24} strokeWidth={2.5} />}
                        {step !== 4 && <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#d97706', borderRadius: '50%', padding: '3px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                            <Key size={10} />
                        </div>}
                    </div>
                </div>

                <h2 id="forgot-title" style={{ fontSize: '24px', fontWeight: 700, color: '#172a20', textAlign: 'center', margin: '0 0 8px' }}>{titles[step]}</h2>
                {step < 4 && <p style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#8fa395', margin: '0 0 24px' }}>Step {step} of 3</p>}

                {step === 1 && (
                    <form className="pp-auth-form" onSubmit={sendCode}>
                        <div className="pp-auth-field">
                            <label htmlFor="forgot-email">Email Address <span className="req">*</span></label>
                            <div className="pp-auth-input-wrap">
                                <Mail size={16} className="pp-auth-input-icon" />
                                <input id="forgot-email" required type="text" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="The email you registered with" />
                            </div>
                        </div>
                        <p style={note}>We will email a 6-digit code to this address. Enter the code on the next step to choose a new password.</p>
                        {error && <div className="pp-auth-error" role="alert">{error}</div>}
                        <button type="submit" id="forgot-send" className="pp-auth-submit-btn" disabled={busy} style={{ borderRadius: '24px' }}>
                            {busy ? 'Sending…' : 'Send Code'} <ArrowRight size={18} />
                        </button>
                        <div style={{ textAlign: 'center', fontSize: '13px', color: '#6b8272' }}>
                            Already have a code from support? <button type="button" id="forgot-have-code" style={link} onClick={() => { if (!email.trim()) { setError('Enter your email first, then continue.'); return; } setError(''); setSent(false); setStep(2); }}>Enter it</button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form className="pp-auth-form" onSubmit={verifyCode}>
                        <p style={note} id="forgot-sent-note">{sent
                            ? <>If <strong>{email.trim()}</strong> has an account, a 6-digit code is on its way. It is valid for 15 minutes. Check the spam folder too.</>
                            : <>Enter the reset code you received from Picking Price support for <strong>{email.trim()}</strong>.</>}</p>
                        <div className="pp-auth-field">
                            <label htmlFor="reset-code">Reset Code <span className="req">*</span></label>
                            <div className="pp-auth-input-wrap">
                                <Key size={16} className="pp-auth-input-icon" />
                                <input id="reset-code" required type="text" inputMode={sent ? 'numeric' : 'text'} autoComplete="one-time-code" autoFocus value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder={sent ? '6-digit code' : 'XXXXX-XXXXX'} maxLength={16} style={{ letterSpacing: '2px' }} />
                            </div>
                        </div>
                        {error && <div className="pp-auth-error" role="alert">{error}</div>}
                        <button type="submit" id="forgot-verify" className="pp-auth-submit-btn" disabled={busy || !code.trim()} style={{ borderRadius: '24px' }}>
                            {busy ? 'Checking…' : 'Verify Code'} <ArrowRight size={18} />
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: '#6b8272' }}>
                            <button type="button" id="forgot-resend" style={{ ...link, opacity: wait > 0 || busy ? 0.5 : 1, cursor: wait > 0 || busy ? 'default' : 'pointer' }} disabled={wait > 0 || busy} onClick={() => sendCode()}>{wait > 0 ? `Resend code in ${wait}s` : sent ? 'Resend code' : 'Email me a code'}</button>
                            <button type="button" style={link} onClick={() => { setError(''); setCode(''); setStep(1); }}>Use a different email</button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form className="pp-auth-form" onSubmit={savePassword}>
                        <div className="pp-auth-field">
                            <div className="pp-auth-label-row">
                                <label htmlFor="reset-password">New Password <span className="req">*</span></label>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: strengthColor }}>
                                    <ShieldCheck size={14} /> {strengthText}
                                </span>
                            </div>
                            <div className="pp-auth-input-wrap">
                                <Lock size={16} className="pp-auth-input-icon" />
                                <input id="reset-password" required autoFocus type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a new password" />
                                <button type="button" className="pp-auth-eye-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasLength ? '#16a34a' : '#e0e8d8' }}></div>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasUpper ? '#16a34a' : '#e0e8d8' }}></div>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasNumOrSym ? '#16a34a' : '#e0e8d8' }}></div>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasLength && hasUpper && hasNumOrSym ? '#16a34a' : '#e0e8d8' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '8px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasLength ? '#16a34a' : '#8fa395' }}><CheckCircle2 size={12} /> At least 8 characters</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasUpper ? '#16a34a' : '#8fa395' }}><CheckCircle2 size={12} /> One uppercase letter</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasNumOrSym ? '#16a34a' : '#8fa395' }}><CheckCircle2 size={12} /> One number or symbol</span>
                            </div>
                        </div>

                        <div className="pp-auth-field" style={{ marginTop: '16px' }}>
                            <div className="pp-auth-label-row">
                                <label htmlFor="reset-confirm">Confirm New Password <span className="req">*</span></label>
                                {confirm.length > 0 && confirm === password && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                                        <CheckCircle2 size={14} /> Passwords match
                                    </span>
                                )}
                            </div>
                            <div className="pp-auth-input-wrap">
                                <Lock size={16} className="pp-auth-input-icon" />
                                <input id="reset-confirm" required type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type it again" />
                                <button type="button" className="pp-auth-eye-btn" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && <div className="pp-auth-error" role="alert">{error}</div>}

                        <button type="submit" id="forgot-save" className="pp-auth-submit-btn" disabled={busy} style={{ borderRadius: '24px', marginTop: '12px' }}>
                            {busy ? 'Please wait…' : 'Update Password'} <ArrowRight size={18} />
                        </button>
                    </form>
                )}

                {step === 4 && (
                    <div className="pp-auth-form" id="forgot-done">
                        <p style={{ ...note, textAlign: 'center', marginTop: '16px' }}>Your password has been changed and you have been signed out on your other devices. Log in with your new password.</p>
                        <a href="/login" id="forgot-login" className="pp-auth-submit-btn" style={{ borderRadius: '24px', textDecoration: 'none', justifyContent: 'center' }}>
                            Log In <ArrowRight size={18} />
                        </a>
                    </div>
                )}

                {step < 4 && step !== 1 && (
                    <div style={{ textAlign: 'center', fontSize: '13px', color: '#6b8272', marginTop: '24px' }}>
                        Remembered your password? <a href="/login" style={{ color: '#1c694a', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Back to Log In &gt;</a>
                    </div>
                )}
            </div>
        </div>
    );
}
