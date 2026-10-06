'use client';
import { useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { Actions, Item, Choice, Photo, money, useLoad, Load } from './ui';
import { toast } from 'sonner';
export function TextField({ label, value, onChange, type = 'text', required = true, maxLength = 120, min = 1, placeholder }: {
    label: string;
    value: string | number;
    onChange: (v: string | number) => void;
    type?: string;
    required?: boolean;
    maxLength?: number;
    min?: number;
    placeholder?: string;
}) { return <label className="field">{label}<input type={type} required={required} placeholder={placeholder} value={value ?? ''} min={type === 'number' ? min : undefined} maxLength={maxLength} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}/></label>; }
export function Photos({ values, onChange, max = 6 }: {
    values: string[];
    onChange: (a: string[]) => void;
    max?: number;
}) { const [busy, setBusy] = useState(false), [url, setUrl] = useState(''); async function upload(files: FileList | null) { if (!files)
    return; if (files.length + values.length > max) {
    toast.error(`Use up to ${max} photos.`);
    return;
} setBusy(true); try {
    const added = [];
    for (const f of Array.from(files)) {
        if (f.size > 5 * 1024 * 1024)
            throw Error('Each photo must be under 5 MB.');
        const r = await fetch('/api/files', { method: 'POST', headers: { 'Content-Type': f.type }, body: f });
        const d: {error?: string; url?: string} = await r.json();
        if (!r.ok)
            throw Error(d.error);
        added.push(d.url);
    }
    onChange([...values, ...added]);
}
catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Upload failed.');
}
finally {
    setBusy(false);
} } return <div className="photo-editor"><label className="field">Photos <small>JPEG, PNG or WebP · 5 MB each · up to {max}</small></label><div className="photo-thumbs">{values.map((src, i) => <div key={src + i}><Photo src={src} alt={'Photo ' + (i + 1)}/><button type="button" aria-label={'Remove photo ' + (i + 1)} onClick={() => onChange(values.filter((_, j) => i !== j))}><X size={15}/></button></div>)}</div><label className="upload-btn"><Upload size={17}/>{busy ? 'Uploading…' : 'Upload photos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} disabled={busy || values.length >= max} onChange={e => { upload(e.target.files); e.target.value = ''; }}/></label><div className="url-input"><input aria-label="HTTPS photo URL" type="url" placeholder="Or paste an HTTPS photo URL" value={url} onChange={e => setUrl(e.target.value)}/><button className="btn" type="button" disabled={!url || values.length >= max} onClick={() => { try {
    if (new URL(url).protocol !== 'https:')
        throw Error();
    onChange([...values, url]);
    setUrl('');
}
catch {
    toast.error('Use a valid HTTPS image URL.');
} }}>Add</button></div></div>; }
export function ItemForm({ kind, item = {}, actions, done }: {
    kind: 'listings' | 'requests';
    item?: Item;
    actions: Actions;
    done: () => void;
}) { const isListing = kind === 'listings'; const [f, setF] = useState<Item>(()=>({ ...item, title: item.title || '', description: item.description || '', category: item.category || actions.categories[0]?.name || 'Clothes', subcategory: item.subcategory || '', brand: item.brand || '', price: item.price || '', quantity: item.quantity || 1, condition: item.condition || 'Like New', location: item.location || 'Peshawar', images: item.images || [], image: item.image || '', expiry: item.expiry?.toString().slice(0, 10) || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) })); const [busy, setBusy] = useState(false); const set = (k: string, v: unknown) => setF({ ...f, [k]: v }); async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); const result = await actions.perform(kind + (item.id ? '/' + item.id : ''), item.id ? 'PATCH' : 'POST', f as Record<string, unknown>); setBusy(false); if (result)
    done(); } const sub = actions.categories.find(c => c.name === f.category)?.subcategories || []; return <form className="form" onSubmit={submit}><TextField label={isListing ? 'Product title' : 'What are you looking for?'} placeholder={isListing ? 'e.g. Samsung Galaxy A54, 128GB, black' : 'e.g. Study table with drawers'} value={f.title} onChange={v => set('title', v)}/><label className="field">Description<textarea required minLength={10} maxLength={3000} placeholder={isListing ? 'Age, what is included, any faults (at least 10 characters)' : 'Size, model, colour or anything else sellers should know (at least 10 characters)'} value={f.description} onChange={e => set('description', e.target.value)}/></label><div className="form-row"><label className="field">Category<Choice label="Category" value={f.category} onChange={v => setF({ ...f, category: v, subcategory: '' })} options={actions.categories.map(c => c.name)}/></label><label className="field">Condition<Choice label="Condition" value={f.condition} onChange={v => set('condition', v)} options={['New', 'Like New', 'Good', 'Fair', 'Used']}/></label></div>{isListing && <div className="form-row"><label className="field">Subcategory<Choice label="Subcategory" value={f.subcategory || 'none'} onChange={v => set('subcategory', v === 'none' ? '' : v)} options={[{ value: 'none', label: 'Not specified' }, ...sub]}/></label><TextField label="Brand (optional)" placeholder="e.g. Samsung" value={f.brand} required={false} onChange={v => set('brand', v)}/></div>}<div className="form-row"><TextField label={isListing ? 'Price (Rs.)' : 'Maximum budget (Rs.)'} type="number" placeholder="e.g. 4500" value={f.price} onChange={v => set('price', v)}/><TextField label="Quantity" type="number" placeholder="e.g. 1" value={f.quantity} onChange={v => set('quantity', v)}/></div><TextField label="City" placeholder="e.g. Peshawar" maxLength={80} value={f.location} onChange={v => set('location', v)}/>{!isListing && <TextField label="Expiry date (within one year)" type="date" value={f.expiry} onChange={v => set('expiry', v)}/>}<Photos values={isListing ? f.images : f.image ? [f.image] : []} max={isListing ? 6 : 1} onChange={v => set(isListing ? 'images' : 'image', isListing ? v : v[0] || '')}/><button className="btn dark" disabled={busy}>{busy ? 'Saving…' : item.id ? 'Save changes' : isListing ? 'Publish listing' : 'Post request'}</button></form>; }
export function OfferForm({ item, actions, done }: {
    item: Item;
    actions: Actions;
    done: () => void;
}) { const [f, setF] = useState({ price: item.price || '', description: item.description || '', image: item.image || '' }), [busy, setBusy] = useState(false); return <form className="form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await actions.perform(item.edit ? 'offers/' + item.id : 'requests/' + item.request_id + '/offers', item.edit ? 'PATCH' : 'POST', f); setBusy(false); if (r)
    done(); }}><TextField label="Offer price (Rs.)" type="number" placeholder="e.g. 4000" value={f.price} onChange={v => setF({ ...f, price: v })}/><label className="field">Describe the item and its condition<textarea required minLength={10} maxLength={2000} placeholder="What you are offering, its condition and what is included (at least 10 characters)" value={f.description} onChange={e => setF({ ...f, description: e.target.value })}/></label><Photos values={f.image ? [f.image] : []} max={1} onChange={v => setF({ ...f, image: v[0] || '' })}/><button className="btn dark" disabled={busy}>{busy ? 'Saving…' : item.edit ? 'Update offer' : 'Send offer'}</button></form>; }
export function ReportForm({ item, actions, done }: {
    item: Item;
    actions: Actions;
    done: () => void;
}) { const [reason, setReason] = useState(''); return <form className="form" onSubmit={async (e) => { e.preventDefault(); if (await actions.perform('reports', 'POST', item.type ? { targetType: item.type, targetId: item.id, reason } : { targetType: 'general', reason }))
    done(); }}>{!item.type && <p className="report-hint">Tell us what went wrong on Picking Price. To report a product, request, message, review or member, use the Report link shown on it.</p>}<label className="field">What happened?<textarea required minLength={10} maxLength={2000} placeholder="Describe the problem in at least 10 characters" value={reason} onChange={e => setReason(e.target.value)}/></label><button className="btn dark">Submit report</button></form>; }
export function PaymentForm({ item, actions, done }: {
    item: Item;
    actions: Actions;
    done: () => void;
}) {
    const state = useLoad('services', actions.revision);
    // Opened from a listing: promote it. Opened from Quota & Services: extra listings, with the chosen pack filled in.
    // item.defer: opened from Sell Now for a product that is not published yet. The choice is handed back
    // (item.onPick) and the request is sent right after the listing is created.
    const defer = !!item.defer;
    const [purpose, setPurpose] = useState(item.id || defer ? 'promotion' : 'slots');
    const [quantity, setQuantity] = useState(Math.min(100, Math.max(1, Math.round(Number(item.quantity)) || 1)));
    const [picked, setDuration] = useState(item.duration ? String(item.duration) : '');
    const [reference, setReference] = useState(String(item.reference || ''));
    const [busy, setBusy] = useState(false);
    const conf = state.data?.settings;
    const prices = conf ? [conf.promotion24h, conf.promotion3d, conf.promotion7d] : [];
    const durations: number[] = conf?.promotionDurations || [];
    // The admin can change the three lengths, so begin on the first one on offer.
    const duration = durations.includes(Number(picked)) ? picked : String(durations[0] ?? 1);
    const amount = conf ? (purpose === 'slots' ? quantity * conf.extraListingPrice : prices[durations.indexOf(Number(duration))] || 0) : 0;
    const days = (d: number) => d === 1 ? '24 hours' : d + ' days';
    const setSlots = (n: number) => setQuantity(Math.min(100, Math.max(1, Math.round(n) || 1)));
    const ready = !!conf?.paymentInstructions && (purpose === 'slots' || durations.includes(Number(duration)));
    return <Load state={state}>{conf && (
        <form className="pay-form" onSubmit={async e => {
            e.preventDefault();
            if (defer) { (item.onPick as (choice: { duration: number; reference: string; amount: number }) => void)({ duration: Number(duration), reference: reference.trim(), amount }); done(); return; }
            setBusy(true);
            const saved = await actions.perform('payments', 'POST', { purpose, quantity, duration: Number(duration), listingId: item.id || '', reference });
            setBusy(false); if (saved) done();
        }}>
            {!!item.id && !defer && (
                <div className="pay-tabs" role="tablist" aria-label="Service">
                    <button type="button" role="tab" aria-selected={purpose === 'promotion'} className={purpose === 'promotion' ? 'active' : ''} onClick={() => setPurpose('promotion')}>Feature this listing</button>
                    <button type="button" role="tab" aria-selected={purpose === 'slots'} className={purpose === 'slots' ? 'active' : ''} onClick={() => setPurpose('slots')}>Extra listing slots</button>
                </div>
            )}

            <section className="pay-card">
                <div className="pay-card-head"><span className="pay-step">1</span><div>
                    <h3>{purpose === 'slots' ? 'How many extra listings?' : 'How long should it be featured?'}</h3>
                    <p>{purpose === 'slots' ? money(conf.extraListingPrice) + ' per listing. They are added to your allowance once the payment is verified.' : defer ? 'Your product is published straight away as a normal listing. It moves ahead of other products, with a Featured badge, once our team has confirmed this payment.' : String(item.title || 'Your listing') + ' is shown ahead of other products for the time you choose.'}</p>
                </div></div>
                {purpose === 'slots' ? (
                    <div className="pay-qty">
                        <div className="pay-stepper">
                            <button type="button" aria-label="One fewer" disabled={quantity <= 1} onClick={() => setSlots(quantity - 1)}>−</button>
                            <input type="number" inputMode="numeric" aria-label="Number of extra listings" min={1} max={100} required placeholder="1" value={quantity} onChange={e => setSlots(Number(e.target.value))} />
                            <button type="button" aria-label="One more" disabled={quantity >= 100} onClick={() => setSlots(quantity + 1)}>+</button>
                        </div>
                        <div className="pay-quick" role="group" aria-label="Quick choices">
                            {[5, 10, 20].map(n => <button type="button" key={n} className={quantity === n ? 'selected' : ''} onClick={() => setSlots(n)}>+{n}</button>)}
                        </div>
                    </div>
                ) : (
                    <div className="pay-durations" role="radiogroup" aria-label="Promotion duration">
                        {durations.map((d, i) => (
                            <button type="button" key={d} role="radio" aria-checked={String(d) === duration} className={String(d) === duration ? 'selected' : ''} onClick={() => setDuration(String(d))}>
                                <strong>{days(d)}</strong><span>{money(prices[i] || 0)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <div className="pay-amount">
                <div><span>Amount to pay</span><small>{purpose === 'slots' ? quantity + (quantity === 1 ? ' listing' : ' listings') + ' × ' + money(conf.extraListingPrice) : 'Featured for ' + days(Number(duration))}</small></div>
                <strong>{money(amount)}</strong>
            </div>

            <section className="pay-card">
                <div className="pay-card-head"><span className="pay-step">2</span><div>
                    <h3>Pay, then send us the reference</h3>
                    <p>Payment is made outside Picking Price. Our team checks the transfer before your service starts.</p>
                </div></div>
                <div className={'pay-instructions' + (conf.paymentInstructions ? '' : ' missing')}>
                    <span className="pay-instructions-label">{conf.paymentInstructions ? 'Where to pay' : 'Payment details not added yet'}</span>
                    {conf.paymentInstructions || 'The payment details have not been set up yet, so requests cannot be submitted right now. Please contact support.'}
                </div>
                <label className="pay-field">Transaction / reference number
                    <input id="pay-reference" type="text" required minLength={4} maxLength={120} placeholder="e.g. the TID from your transfer receipt" value={reference} onChange={e => setReference(e.target.value)} />
                </label>
            </section>

            <button className="pay-submit" id="pay-submit" disabled={!ready || busy}>{busy ? 'Submitting…' : defer ? 'Add Spotlight to this listing' : 'Submit for verification'}</button>
        </form>
    )}</Load>;
}
