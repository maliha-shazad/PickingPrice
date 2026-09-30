'use client';
import { useState } from 'react';
import { ArrowLeft, RotateCcw, Key, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import '../market/styles.css';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const hasUpper = /[A-Z]/.test(password);
    const hasNumOrSym = /[0-9!@#$%^&*]/.test(password);
    const hasLength = password.length >= 8;

    const strengthText = hasLength && hasUpper && hasNumOrSym ? 'Strong' : 'Weak';
    const strengthColor = strengthText === 'Strong' ? '#16a34a' : '#8fa395';

    const submitStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email or phone number.');
            return;
        }
        setError('');
        setStep(2);
    };

    const submitStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        if (!hasLength || !hasUpper || !hasNumOrSym) {
            setError('Please meet all password requirements.');
            return;
        }

        setBusy(true);
        try {
            const r = await fetch('/api/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const d: { error?: string } = await r.json();
            if (!r.ok) throw Error(d.error || 'Please try again.');
            window.location.href = '/';
        } catch (e: any) {
            setError(e.message);
            setBusy(false);
        }
    };

    return (
        <div className="hp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e6f7f4 0%, #fef5f5 100%)', minHeight: '100vh', padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '440px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', position: 'relative' }}>
                
                <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#4a6352', textDecoration: 'none', marginBottom: '24px' }}>
                    <ArrowLeft size={16} /> Back to Log In
                </a>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', background: '#eef2f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a5c42' }}>
                        <RotateCcw size={24} strokeWidth={2.5} />
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#d97706', borderRadius: '50%', padding: '3px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                            <Key size={10} />
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#172a20', textAlign: 'center', margin: '0 0 32px' }}>
                    {step === 1 ? 'Find Your Account' : 'Reset Your Password'}
                </h2>

                {step === 1 ? (
                    <form className="pp-auth-form" onSubmit={submitStep1}>
                        <div className="pp-auth-field">
                            <label>Email or Phone Number <span className="req">*</span></label>
                            <div className="pp-auth-input-wrap">
                                <input required type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email or phone" />
                            </div>
                        </div>
                        {error && <div className="pp-auth-error">{error}</div>}
                        <button type="submit" className="pp-auth-submit-btn" style={{ borderRadius: '24px' }}>
                            Continue
                        </button>
                    </form>
                ) : (
                    <form className="pp-auth-form" onSubmit={submitStep2}>
                        <div className="pp-auth-field">
                            <div className="pp-auth-label-row">
                                <label>New Password <span className="req">*</span></label>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: strengthColor }}>
                                    <ShieldCheck size={14} /> {strengthText}
                                </span>
                            </div>
                            <div className="pp-auth-input-wrap">
                                <Lock size={16} className="pp-auth-input-icon" />
                                <input required type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
                                <button type="button" className="pp-auth-eye-btn" onClick={() => setShow(!show)}>
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {/* Strength bars */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasLength ? '#16a34a' : '#e0e8d8' }}></div>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasUpper ? '#16a34a' : '#e0e8d8' }}></div>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasNumOrSym ? '#16a34a' : '#e0e8d8' }}></div>
                                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: hasLength && hasUpper && hasNumOrSym ? '#16a34a' : '#e0e8d8' }}></div>
                            </div>
                            {/* Strength checklist */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '8px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasLength ? '#16a34a' : '#8fa395' }}>
                                    <CheckCircle2 size={12} /> At least 8 characters
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasUpper ? '#16a34a' : '#8fa395' }}>
                                    <CheckCircle2 size={12} /> One uppercase letter
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasNumOrSym ? '#16a34a' : '#8fa395' }}>
                                    <CheckCircle2 size={12} /> One number or symbol
                                </span>
                            </div>
                        </div>

                        <div className="pp-auth-field" style={{ marginTop: '16px' }}>
                            <div className="pp-auth-label-row">
                                <label>Confirm New Password <span className="req">*</span></label>
                                {confirm.length > 0 && confirm === password && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                                        <CheckCircle2 size={14} /> Passwords match
                                    </span>
                                )}
                            </div>
                            <div className="pp-auth-input-wrap">
                                <Lock size={16} className="pp-auth-input-icon" />
                                <input required type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••••••" />
                                <button type="button" className="pp-auth-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && <div className="pp-auth-error">{error}</div>}

                        <button type="submit" className="pp-auth-submit-btn" disabled={busy} style={{ borderRadius: '24px', marginTop: '12px' }}>
                            {busy ? 'Please wait…' : 'Save New Password & Log In'}
                            <ArrowRight size={18} />
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '13px', color: '#6b8272', marginTop: '24px' }}>
                            Remembered your password? <a href="/login" style={{ color: '#1c694a', fontWeight: 700, textDecoration: 'none' }}>Back to Log In &gt;</a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
