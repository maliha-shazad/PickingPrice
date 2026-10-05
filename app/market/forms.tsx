'use client';
import { useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { Actions, Item, Choice, Photo, money, useLoad, Load } from './ui';
import { toast } from 'sonner';
export function TextField({ label, value, onChange, type = 'text', required = true, maxLength = 120, min = 1 }: {
    label: string;
    value: string | number;
    onChange: (v: string | number) => void;
    type?: string;
    required?: boolean;
    maxLength?: number;
    min?: number;
}) { return <label className="field">{label}<input type={type} required={required} value={value ?? ''} min={type === 'number' ? min : undefined} maxLength={maxLength} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}/></label>; }
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
    done(); } const sub = actions.categories.find(c => c.name === f.category)?.subcategories || []; return <form className="form" onSubmit={submit}><TextField label={isListing ? 'Product title' : 'What are you looking for?'} value={f.title} onChange={v => set('title', v)}/><label className="field">Description<textarea required minLength={10} maxLength={3000} value={f.description} onChange={e => set('description', e.target.value)}/></label><div className="form-row"><label className="field">Category<Choice label="Category" value={f.category} onChange={v => setF({ ...f, category: v, subcategory: '' })} options={actions.categories.map(c => c.name)}/></label><label className="field">Condition<Choice label="Condition" value={f.condition} onChange={v => set('condition', v)} options={['New', 'Like New', 'Good', 'Fair', 'Used']}/></label></div>{isListing && <div className="form-row"><label className="field">Subcategory<Choice label="Subcategory" value={f.subcategory || 'none'} onChange={v => set('subcategory', v === 'none' ? '' : v)} options={[{ value: 'none', label: 'Not specified' }, ...sub]}/></label><TextField label="Brand (optional)" value={f.brand} required={false} onChange={v => set('brand', v)}/></div>}<div className="form-row"><TextField label={isListing ? 'Price (Rs.)' : 'Maximum budget (Rs.)'} type="number" value={f.price} onChange={v => set('price', v)}/><TextField label="Quantity" type="number" value={f.quantity} onChange={v => set('quantity', v)}/></div><TextField label="City" value={f.location} onChange={v => set('location', v)}/>{!isListing && <TextField label="Expiry date (within one year)" type="date" value={f.expiry} onChange={v => set('expiry', v)}/>}<Photos values={isListing ? f.images : f.image ? [f.image] : []} max={isListing ? 6 : 1} onChange={v => set(isListing ? 'images' : 'image', isListing ? v : v[0] || '')}/><button className="btn dark" disabled={busy}>{busy ? 'Saving…' : item.id ? 'Save changes' : isListing ? 'Publish listing' : 'Post request'}</button></form>; }
export function OfferForm({ item, actions, done }: {
    item: Item;
    actions: Actions;
    done: () => void;
}) { const [f, setF] = useState({ price: item.price || '', description: item.description || '', image: item.image || '' }), [busy, setBusy] = useState(false); return <form className="form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await actions.perform(item.edit ? 'offers/' + item.id : 'requests/' + item.request_id + '/offers', item.edit ? 'PATCH' : 'POST', f); setBusy(false); if (r)
    done(); }}><TextField label="Offer price (Rs.)" type="number" value={f.price} onChange={v => setF({ ...f, price: v })}/><label className="field">Describe the item and its condition<textarea required minLength={10} maxLength={2000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })}/></label><Photos values={f.image ? [f.image] : []} max={1} onChange={v => setF({ ...f, image: v[0] || '' })}/><button className="btn dark" disabled={busy}>{busy ? 'Saving…' : item.edit ? 'Update offer' : 'Send offer'}</button></form>; }
export function ReportForm({ item, actions, done }: {
    item: Item;
    actions: Actions;
    done: () => void;
}) { const [reason, setReason] = useState(''); return <form className="form" onSubmit={async (e) => { e.preventDefault(); if (await actions.perform('reports', 'POST', { targetType: item.type, targetId: item.id, reason }))
    done(); }}><label className="field">What happened?<textarea required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/></label><button className="btn dark">Submit report</button></form>; }
export function PaymentForm({ item, actions, done }: {
    item: Item;
    actions: Actions;
    done: () => void;
}) { const state = useLoad('services', actions.revision); const [purpose, setPurpose] = useState(item.id ? 'promotion' : 'slots'), [quantity, setQuantity] = useState(1), [duration, setDuration] = useState('1'), [reference, setReference] = useState(''); const conf = state.data?.settings; const amount = conf ? (purpose === 'slots' ? quantity * conf.extraListingPrice : [conf.promotion24h, conf.promotion3d, conf.promotion7d][conf.promotionDurations.indexOf(Number(duration))] || 0) : 0; return <Load state={state}>{conf && <form className="form" onSubmit={async (e) => { e.preventDefault(); if (await actions.perform('payments', 'POST', { purpose, quantity, duration: Number(duration), listingId: item.id || '', reference }))
    done(); }}><label className="field">Service<Choice label="Service" value={purpose} onChange={setPurpose} options={[{ value: 'slots', label: 'Additional listing slots' }, ...(item.id ? [{ value: 'promotion', label: 'Feature this listing' }] : [])]}/></label>{purpose === 'slots' ? <TextField label="Number of extra slots" type="number" value={quantity} onChange={setQuantity}/> : <><p>{item.title}</p><Choice label="Promotion duration" value={duration} onChange={setDuration} options={conf.promotionDurations.map((days: number) => ({ value: String(days), label: days === 1 ? '24 hours' : days + ' days' }))}/></>}<div className="payment-amount">Amount to pay <strong>{money(amount)}</strong></div><div className="notice whitespace-pre-wrap">{conf.paymentInstructions || 'Payment instructions are not yet configured. Please contact the administrator before paying.'}</div><p>Pay outside Picking Price, then submit your reference below. The administrator will verify the transfer before activating your service.</p><TextField label="Transaction/reference number" value={reference} onChange={setReference}/><button className="btn dark" disabled={!conf.paymentInstructions || (purpose === 'promotion' && !conf.promotionDurations.includes(Number(duration)))}>Submit for verification</button></form>}</Load>; }
