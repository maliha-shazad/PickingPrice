'use client';
import { useState } from 'react';
import { ShoppingBag, Store, ShoppingCart, Check } from 'lucide-react';
import { type Actions, type Item, useLoad, Load } from './ui';

// The choices behind "Account type". Buying-only members cannot open Sell Now, and selling-only members
// cannot post a buyer request, until they switch.
type Role = 'buyer' | 'seller' | 'both';
export const ACCOUNT_TYPES: { value: Role; label: string; text: string }[] = [
    { value: 'buyer', label: 'Buying only', text: 'Browse, buy, and post requests.' },
    { value: 'seller', label: 'Selling only', text: 'List products and send offers on buyer requests.' },
    { value: 'both', label: 'Buying and selling', text: 'Everything: buy, post requests, list products and send offers.' },
];

/**
 * Shown when a member opens something their account type does not include: Sell Now for a buying-only
 * member (need="selling"), Post a Request for a selling-only member (need="buying"). They pick an
 * account type that includes it and carry on.
 */
export function EnableRole({ need, actions, done, cancel }: { need: 'selling' | 'buying'; actions: Actions; done: () => void; cancel: () => void }) {
    const me = useLoad('me', actions.revision);
    const single: Role = need === 'selling' ? 'seller' : 'buyer';
    const [role, setRole] = useState<Role>('both');
    const [busy, setBusy] = useState(false);
    const profile = me.data?.profile as Item | undefined;
    const target = need === 'selling' ? 'Sell Now' : 'Post a Request';

    async function save() {
        if (!profile) return;
        setBusy(true);
        // The profile endpoint replaces the whole profile, so everything else is sent back unchanged.
        const saved = await actions.perform('profile', 'PATCH', {
            name: profile.name, bio: profile.bio || '', location: profile.location || '', phone: profile.phone || '',
            whatsapp: profile.whatsapp || '', meetup_spot: profile.meetup_spot || '', avatar: profile.avatar || '', role,
        });
        setBusy(false);
        if (saved) done();
    }

    return (
        <Load state={me}>
            <div className="pp-enable-selling" data-need={need}>
                {need === 'selling'
                    ? <p className="pp-info-lead">Your account is set up for <strong>buying only</strong>, so Sell Now is locked. You can still buy and post requests. To list a product, choose an account type that includes selling:</p>
                    : <p className="pp-info-lead">Your account is set up for <strong>selling only</strong>, so posting a buyer request is locked. You can still list products and send offers. To post a request, choose an account type that includes buying:</p>}
                <div className="pp-role-options" role="radiogroup" aria-label="Account type">
                    {ACCOUNT_TYPES.filter(t => t.value === 'both' || t.value === single).reverse().map(t => (
                        <button type="button" key={t.value} role="radio" aria-checked={role === t.value} className={'pp-role-option' + (role === t.value ? ' selected' : '')} onClick={() => setRole(t.value)}>
                            <span className="pp-role-icon">{t.value === 'both' ? <ShoppingBag size={18} /> : t.value === 'seller' ? <Store size={18} /> : <ShoppingCart size={18} />}</span>
                            <span className="pp-role-text"><strong>{t.label}{t.value === 'both' && <em>Recommended</em>}</strong><small>{t.text}</small></span>
                            <span className="pp-role-check">{role === t.value && <Check size={15} />}</span>
                        </button>
                    ))}
                </div>
                <p className="pp-role-note">You can change this at any time from the pencil icon on your dashboard profile.</p>
                <div className="pp-role-actions">
                    <button type="button" className="pp-role-save" disabled={busy || !profile} onClick={save}>{busy ? 'Saving…' : 'Save and continue to ' + target}</button>
                    <button type="button" className="pp-role-cancel" disabled={busy} onClick={cancel}>Not now</button>
                </div>
            </div>
        </Load>
    );
}
