import { useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Actions, Item, Photo } from './ui';
import { ACCOUNT_TYPES } from './enable-selling';

/** Quick profile edit opened from the pencil on either dashboard. Styled by the dashboard's own .bd-* rules. */
export function ProfileDialog({ profile, actions, onClose }: { profile: Item; actions: Actions; onClose: () => void }) {
    const [name, setName] = useState(String(profile.name || actions.user?.name || ''));
    const [location, setLocation] = useState(String(profile.location || ''));
    const [phone, setPhone] = useState(String(profile.phone || ''));
    const [role, setRole] = useState(String(profile.role || actions.user?.role || 'buyer'));
    const [avatar, setAvatar] = useState(String(profile.avatar || ''));
    const [uploading, setUploading] = useState(false);
    const [busy, setBusy] = useState(false);
    const file = useRef<HTMLInputElement>(null);

    async function upload(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setUploading(true);
        try {
            const r = await fetch('/api/files', { method: 'POST', headers: { 'Content-Type': f.type }, body: f });
            const d: { url?: string; error?: string } = await r.json();
            if (!r.ok || !d.url) throw Error(d.error || 'Upload failed.');
            setAvatar(d.url);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Upload failed.');
        }
        setUploading(false);
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        // The profile endpoint replaces the whole profile, so the fields not shown here are sent back unchanged.
        const saved = await actions.perform('profile', 'PATCH', {
            name: name.trim(), location: location.trim(), avatar,
            bio: profile.bio || '', phone: phone.trim(), whatsapp: profile.whatsapp || '',
            meetup_spot: profile.meetup_spot || '', role,
        });
        setBusy(false);
        if (saved) onClose();
    }

    return (
        <div className="bd-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
            <div className="bd-modal" role="dialog" aria-modal="true" aria-label="Edit profile">
                <div className="bd-modal-header">
                    <h3>Edit Profile</h3>
                    <button type="button" className="bd-modal-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
                </div>
                <form className="bd-modal-body" onSubmit={save}>
                    <div className="bd-form-group">
                        <label>Profile Picture</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {avatar ? <Photo src={avatar} alt="Profile picture" className="bd-dialog-avatar" /> : <div className="bd-dialog-avatar" aria-hidden="true" />}
                            <div className="bd-upload-area" style={{ flex: 1, padding: '16px' }} onClick={() => !uploading && file.current?.click()}>
                                <UploadCloud size={22} color="#0d5c45" />
                                <span>{uploading ? 'Uploading…' : avatar ? 'Click to change picture' : 'Click to upload a picture'}</span>
                            </div>
                        </div>
                        <input type="file" ref={file} hidden accept="image/png,image/jpeg,image/webp" onChange={upload} />
                    </div>
                    <div className="bd-form-group">
                        <label htmlFor="bd-profile-name">Name</label>
                        <input id="bd-profile-name" type="text" className="bd-input" required minLength={2} maxLength={80} placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="bd-form-group">
                        <label htmlFor="bd-profile-phone">Mobile Number</label>
                        <input id="bd-profile-phone" type="tel" className="bd-input" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +923001234567" />
                        <small className="bd-field-hint">Other members do not see this number.</small>
                    </div>
                    <div className="bd-form-group">
                        <label htmlFor="bd-profile-location">Location</label>
                        <input id="bd-profile-location" type="text" className="bd-input" maxLength={80} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lahore, Gulberg" />
                    </div>
                    <div className="bd-form-group">
                        <label htmlFor="bd-profile-role">Account type</label>
                        <select id="bd-profile-role" className="bd-input pp-select" value={role} onChange={e => setRole(e.target.value)}>
                            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <small className="bd-field-hint">{ACCOUNT_TYPES.find(t => t.value === role)?.text}{role === 'buyer' ? ' Sell Now stays locked.' : ''}</small>
                    </div>
                    {!!actions.user?.email && (
                        <div className="bd-form-group">
                            <label htmlFor="bd-profile-email">Email (Read-only)</label>
                            <input id="bd-profile-email" type="text" className="bd-input" disabled value={String(actions.user.email)} style={{ backgroundColor: '#f8fafc', color: '#94a3b8' }} />
                        </div>
                    )}
                    <button type="submit" className="bd-btn-primary-save" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save Changes'}</button>
                </form>
            </div>
        </div>
    );
}
