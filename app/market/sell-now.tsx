import { useState, useRef, useEffect } from 'react';
import { Actions, Item, money, useLoad, Load, DELIVERY_OPTIONS } from './ui';
import { CheckCircle2, UploadCloud, Image as ImageIcon, Star, Zap, RefreshCw, X, Package, Smartphone, Watch, Shirt, Home, Gamepad, Book, Camera, Car, Coffee, Gem, Baby, Palette, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const getCatIcon = (name: string) => {
    switch (name) {
        case 'Clothes': return <Shirt size={16} />;
        case 'Electronics': return <Smartphone size={16} />;
        case 'Furniture': return <Home size={16} />;
        case 'Sports': return <Gamepad size={16} />;
        case 'Books': return <Book size={16} />;
        case 'Cameras': return <Camera size={16} />;
        case 'Automobiles': return <Car size={16} />;
        case 'Kitchen': return <Coffee size={16} />;
        case 'Jewelry': return <Gem size={16} />;
        case 'Kids': return <Baby size={16} />;
        case 'Art': return <Palette size={16} />;
        case 'Accessories': return <Watch size={16} />;
        default: return <Briefcase size={16} />;
    }
};

export function SellNow({ actions, initialItem = null }: { actions: Actions, initialItem?: Item | null }) {
    // "About this item": 1000 characters, or as long as an existing listing's description already is.
    const descriptionLimit = Math.max(1000, String(initialItem?.description || '').length);
    const me = useLoad('me', actions.revision);
    const services = useLoad('services?page=1&promotionPage=1', actions.revision);


    const [f, setF] = useState<Partial<Item>>(() => ({
        id: initialItem?.id || '',
        title: initialItem?.title || '',
        description: initialItem?.description || '',
        category: initialItem?.category || actions.categories[0]?.name || '',
        subcategory: initialItem?.subcategory || '',
        brand: initialItem?.brand || '',
        price: initialItem?.price || '',
        condition: initialItem?.condition || 'New',
        location: initialItem?.location || '',
        phone: initialItem?.phone || '',
        whatsapp: '',
        meetup_spot: initialItem?.meetup_spot || '',
        delivery: Array.isArray(initialItem?.delivery) ? initialItem.delivery : [],
        images: initialItem?.images || (initialItem?.image ? [initialItem.image] : []),
        quantity: initialItem?.quantity || 1
    }));
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    // Saved with the listing: a new one starts open to offers, an edited one keeps what the seller chose.
    const [allowOffers, setAllowOffers] = useState(initialItem?.id ? !!initialItem.negotiable : true);
    const [exchange, setExchange] = useState(!!initialItem?.exchange);
    const [profileLoaded, setProfileLoaded] = useState(false);
    // A Spotlight (featured) chosen on this page, with its payment details. It is sent together with the new listing,
    // which then waits, seen only by the seller, until the payment is verified.
    const [boost, setBoost] = useState<({ duration: number; reference: string; amount: number } & Record<string, unknown>) | null>(null);
    const [invalid, setInvalid] = useState('');
    const promo = services.data?.settings;
    const promoPrices: number[] = promo ? [promo.promotion24h, promo.promotion3d, promo.promotion7d] : [];
    const days = (d: number) => d === 1 ? '24 hours' : d + ' days';

    // A new listing starts on the first category in the list (the list arrives a moment after the page).
    const categoryPicked = useRef(false);
    useEffect(() => {
        if (initialItem?.id || categoryPicked.current || !actions.categories.length) return;
        setF(prev => ({ ...prev, category: actions.categories[0].name, subcategory: '' }));
    }, [actions.categories.length]);

    // Auto-fill contact details from profile once loaded
    if (me.data && !profileLoaded && !initialItem?.id) {
        const p = me.data.profile;
        const updates: Partial<Item> = {};
        if (!f.location && p.location) updates.location = p.location;
        if (!f.phone && p.phone) updates.phone = p.phone;
        if (!f.meetup_spot && p.meetup_spot) updates.meetup_spot = p.meetup_spot;
        if (Object.keys(updates).length > 0) setF(prev => ({ ...prev, ...updates }));
        setProfileLoaded(true);
    }

    const set = (k: string, v: any) => { setF({ ...f, [k]: v }); if (invalid === k) setInvalid(''); };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const newImages = [...(f.images || [])];
        for (let i = 0; i < e.target.files.length; i++) {
            if (newImages.length >= 6) break;
            const file = e.target.files[i];
            try {
                const r = await fetch('/api/files', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
                const d = await r.json();
                if (r.ok && d.url) newImages.push(d.url);
            } catch { }
        }
        set('images', newImages);
        setUploading(false);
    };

    const removeImage = (index: number) => {
        set('images', (f.images || []).filter((_: string, i: number) => i !== index));
    };

    // The first thing that still has to be filled in, with the field it belongs to.
    const missing = (): [string, string] | null => {
        if (!(f.images || []).length) return ['images', 'Add at least one photo of the item.'];
        if (String(f.title || '').trim().length < 3) return ['title', 'Enter an item title of at least 3 characters.'];
        if (!f.category) return ['category', 'Choose a category.'];
        if (!f.condition) return ['condition', 'Choose the condition of the item.'];
        const price = Number(f.price);
        if (!Number.isInteger(price) || price < 1) return ['price', 'Enter your asking price in rupees (whole number, at least Rs. 1).'];
        const quantity = Number(f.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return ['quantity', 'Enter how many you have (1 or more).'];
        if (String(f.description || '').trim().length < 10) return ['description', 'Describe the item in at least 10 characters.'];
        if (String(f.location || '').trim().length < 2) return ['location', 'Enter the city where the item is.'];
        if (f.phone && !/^\+?[0-9][0-9\s-]{6,18}$/.test(String(f.phone).trim())) return ['phone', 'Enter a valid phone number, or leave it empty.'];
        return null;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const problem = missing();
        if (problem) {
            setInvalid(problem[0]);
            toast.error(problem[1]);
            const el = document.querySelector('[data-field="' + problem[0] + '"]') as HTMLElement | null;
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el?.matches('input,textarea') ? el : el?.querySelector('input,textarea') as HTMLElement | null)?.focus({ preventScroll: true });
            return;
        }
        setBusy(true);

        const payload = { ...f };
        if (payload.images && payload.images.length > 0) {
            payload.image = payload.images[0];
        }

        payload.price = Number(payload.price) || 0;
        payload.quantity = Number(payload.quantity) || 1;
        payload.negotiable = allowOffers;
        payload.exchange = exchange;
        if (boost && !f.id) payload.spotlight = boost;

        const result = await actions.perform('listings' + (f.id ? '/' + f.id : ''), f.id ? 'PATCH' : 'POST', payload, true);
        setBusy(false);
        if (result) {
            if ((result as Item).status === 'Awaiting payment') toast.success('Listing saved, waiting for payment verification', { description: 'It goes live as a Premium Listing once our team confirms your payment. You will get a notification.' });
            else toast.success(f.id ? 'Listing updated successfully!' : 'Listing published successfully!');
            actions.go('Dashboard');
        }
    };

    return (
        <div className="sn-page-wrap">
            <style dangerouslySetInnerHTML={{__html: `
                .sn-page-wrap { background: #faf9f6; min-height: 100vh; padding: 40px 5%; font-family: inherit; }
                .sn-header { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
                .sn-header h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0 0 8px; }
                .sn-header p { font-size: 14px; color: #64748b; margin: 0; max-width: 600px; line-height: 1.5; }
                .sn-quota-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 16px; }
                .sn-quota-info { font-size: 12px; font-weight: 600; color: #334155; }
                .sn-quota-info strong { color: #0f172a; }
                .sn-quota-info span { display: block; font-size: 11px; color: #64748b; margin-top: 2px; }
                .sn-buy-btn { font-size: 11px; color: #e8621a; font-weight: 700; background: #fff7ed; padding: 4px 10px; border-radius: 20px; border: 0; cursor: pointer; white-space: nowrap; }
                .sn-quota-info .sn-slots-left { background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 10px; font-size: 10px; display: inline-block; margin: 0; white-space: nowrap; }
                .sn-offer-box { background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; width: 220px; }

                .sn-layout { display: grid; grid-template-columns: 1fr 380px; gap: 30px; }

                .sn-section { background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
                .sn-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .sn-section-head h2 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 8px; }
                .sn-section-head .step-num { width: 24px; height: 24px; background: #ecfdf5; color: #0d5c45; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; }

                .sn-upload-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
                .sn-upload-box { width: 120px; height: 120px; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #64748b; cursor: pointer; background: #f8fafc; transition: all 0.2s; position: relative; overflow: hidden; }
                .sn-upload-box:hover { border-color: #0d5c45; background: #ecfdf5; color: #0d5c45; }
                .sn-upload-box span { font-size: 12px; font-weight: 600; text-align: center; }
                .sn-img-preview { width: 120px; height: 120px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; }
                .sn-img-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 11px; }
                .sn-img-preview .cover-tag { position: absolute; top: 6px; left: 6px; background: #0d5c45; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; }
                .sn-remove-img { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); color: #fff; border: 0; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }

                .sn-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
                .sn-field label { font-size: 13px; font-weight: 700; color: #334155; }
                .sn-input { width: 100%; box-sizing: border-box; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #0f172a; outline: none; background: #fff; transition: border-color 0.2s; }
                .sn-input:focus { border-color: #0d5c45; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); }
                .sn-textarea { min-height: 120px; resize: vertical; padding: 16px; width: 100%; box-sizing: border-box; }
                .sn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .sn-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

                .sn-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
                .sn-cat-btn { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 13px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left; }
                .sn-cat-btn.active { background: #0d5c45; color: #fff; border-color: #0d5c45; }

                .sn-cond-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
                .sn-cond-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; cursor: pointer; position: relative; }
                .sn-cond-card.active { border-color: #0d5c45; background: #ecfdf5; }
                .sn-cond-tag { display: inline-block; font-size: 10px; font-weight: 800; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 12px; margin-bottom: 8px; }
                .sn-cond-card.active .sn-cond-tag { background: #0d5c45; color: #fff; }
                .sn-cond-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
                .sn-cond-desc { font-size: 12px; color: #64748b; line-height: 1.4; }
                .sn-cond-check { position: absolute; top: 16px; right: 16px; color: #0d5c45; }

                .sn-verify-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .sn-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; }
                .sn-checkbox input { width: 16px; height: 16px; accent-color: #0d5c45; cursor: pointer; }

                .sn-price-wrap { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
                .sn-price-input { width: 100%; min-width: 0; flex: 1; box-sizing: border-box; font-size: 24px; font-weight: 800; color: #0f172a; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
                .sn-price-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: flex-start; }
                .sn-delivery-options { display: flex; flex-wrap: wrap; gap: 8px; }
                .sn-delivery-option { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; }
                .sn-delivery-option.on { border-color: #0d5c45; background: #ecfdf5; color: #0a5038; }
                .sn-delivery-option input { accent-color: #0d5c45; width: 16px; height: 16px; }
                .sn-toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
                .sn-toggle-row:last-child { border: 0; padding-bottom: 0; }
                .sn-toggle-info strong { display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
                .sn-toggle-info span { font-size: 12px; color: #64748b; }

                .sn-contact-hint { font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic; }

                /* Right Panel */
                .sn-sidebar { display: flex; flex-direction: column; gap: 20px; position: sticky; top: 20px; }
                .sn-preview-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; padding: 16px; }
                .sn-preview-header { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 12px; display: flex; justify-content: space-between; }
                .sn-preview-img { width: 100%; height: 200px; background: #f1f5f9; border-radius: 12px; margin-bottom: 16px; object-fit: cover; }
                .sn-preview-cat { font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 10px; display: inline-block; margin-bottom: 8px; }
                .sn-preview-title { font-size: 16px; font-weight: 800; color: #1e293b; line-height: 1.4; margin-bottom: 8px; }
                .sn-preview-price { font-size: 18px; font-weight: 800; color: #0d5c45; margin-bottom: 12px; }
                .sn-preview-seller { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9; padding-top: 12px; }
                .sn-preview-seller img { width: 24px; height: 24px; border-radius: 50%; }

                .sn-boost-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
                .sn-boost-header { font-size: 12px; font-weight: 800; color: #e8621a; display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
                .sn-boost-option { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: pointer; transition: background 0.2s; }
                .sn-boost-option:hover { background: #f8fafc; }
                .sn-boost-info strong { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
                .sn-boost-info span { font-size: 11px; color: #64748b; }
                .sn-boost-price { font-size: 13px; font-weight: 700; color: #0d5c45; }

                .sn-submit-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #e2e8f0; padding: 16px 5%; display: flex; justify-content: flex-end; align-items: center; gap: 16px; z-index: 100; box-shadow: 0 -4px 20px rgba(0,0,0,0.05); }
                .sn-cancel-btn { background: transparent; border: 0; color: #64748b; font-size: 14px; font-weight: 600; cursor: pointer; }
                .sn-publish-btn { background: #e8621a; color: #fff; border: 0; padding: 12px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }
                .sn-publish-btn:hover { background: #c2410c; }

                @media(max-width: 900px) {
                    .sn-layout { grid-template-columns: 1fr; }
                    .sn-sidebar { position: static; } /* the live preview and the Standard / Premium choice come under the form */
                    .sn-submit-bar { padding: 16px; justify-content: space-between; }
                }
                @media(max-width: 600px) {
                    .sn-header { flex-direction: column; gap: 14px; margin-bottom: 20px; }
                    .sn-submit-bar { padding: 12px 14px; gap: 10px; }
                    .sn-cancel-btn { font-size: 13px; padding: 0; white-space: nowrap; flex-shrink: 0; }
                    .sn-publish-btn { flex: 1; justify-content: center; padding: 12px 14px; font-size: 14px; white-space: nowrap; }
                    .sn-header h1 { font-size: 22px; margin-bottom: 6px; }
                    .sn-header p { font-size: 13px; }
                    .sn-quota-box { width: 100%; flex-wrap: wrap; gap: 10px; }
                    .sn-price-row { grid-template-columns: 1fr; gap: 14px; }
                    .sn-offer-box { width: 100%; }
                    .sn-row, .sn-row-3 { grid-template-columns: 1fr; }
                    .sn-cat-grid { grid-template-columns: 1fr 1fr; }
                    .sn-cond-grid { grid-template-columns: 1fr; }
                    .sn-verify-box { grid-template-columns: 1fr; }
                }
            `}} />

            <form onSubmit={submit} noValidate>
                <div className="sn-header">
                    <div>
                        <h1>List an Item for Sale</h1>
                        <p>Create your fixed-price listing in under 2 minutes. Buyers in {f.location || 'your city'} and across Pakistan can discover and contact you directly via in-app chat.</p>
                    </div>
                    <Load state={me}>
                        {me.data && (
                            <div className="sn-quota-box">
                                <div className="sn-quota-info">
                                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <Package size={16} color="#0d5c45"/>
                                        Free Listing Quota
                                        <span className="sn-slots-left">
                                            {Math.max(0, me.data.settings.freeListings + me.data.profile.extra_slots - me.data.counts.listings)} SLOTS LEFT
                                        </span>
                                    </div>
                                    <span id="sn-quota-line">{me.data.counts.listings} of {me.data.settings.freeListings + me.data.profile.extra_slots} listings used ({me.data.settings.freeListings} free{me.data.profile.extra_slots > 0 ? ' + ' + me.data.profile.extra_slots + ' extra' : ''})</span>
                                </div>
                                <button type="button" className="sn-buy-btn" onClick={() => actions.open('payment')}>Buy extra listing slots: Rs. {me.data.settings.extraListingPrice}</button>
                            </div>
                        )}
                    </Load>
                </div>

                <div className="sn-layout">
                    {/* Left Form Panel */}
                    <div className="sn-form">

                        {/* Step 1: Photos */}
                        <div className="sn-section">
                            <div className="sn-section-head">
                                <h2><div className="step-num">1</div> High-Res Photos & Inspection Video</h2>
                            </div>
                            <p style={{fontSize:'13px', color:'#64748b'}}>At least 1 photo is required. Recommended: 4 photos. You can upload up to 6.</p>

                            <div className={'sn-upload-grid' + (invalid === 'images' ? ' sn-invalid-box' : '')} data-field="images">
                                {f.images?.map((url: string, i: number) => (
                                    <div className="sn-img-preview" key={i}>
                                        <img src={url} alt="Uploaded" />
                                        {i === 0 && <span className="cover-tag">Cover Photo</span>}
                                        <button type="button" className="sn-remove-img" onClick={() => removeImage(i)}><X size={12} /></button>
                                    </div>
                                ))}
                                {(f.images || []).length < 6 && (
                                    <label className="sn-upload-box">
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} style={{display:'none'}} />
                                        {uploading ? <RefreshCw size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                                        <span>+ Add Photo<br/><span style={{fontSize:'10px', fontWeight:'normal'}}>JPG, PNG up to 5MB</span></span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Step 2: Details */}
                        <div className="sn-section">
                            <div className="sn-section-head">
                                <h2><div className="step-num">2</div> Item Details</h2>
                            </div>

                            <div className="sn-field">
                                <label>Item Title <span className="sn-req">*</span></label>
                                <input className={'sn-input' + (invalid === 'title' ? ' sn-invalid' : '')} data-field="title" required minLength={3} maxLength={120} value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Sony WH-1000XM4 Wireless (Silver) - Complete Box" />
                            </div>

                            <label style={{fontSize:'13px', fontWeight:700, color:'#334155', display:'block', marginBottom:'8px'}}>Select Category <span className="sn-req">*</span></label>
                            <div className="sn-cat-grid" data-field="category">
                                {actions.categories.map(c => (
                                    <button
                                        type="button"
                                        key={c.name}
                                        className={`sn-cat-btn ${f.category === c.name ? 'active' : ''}`}
                                        onClick={() => { categoryPicked.current = true; setF({ ...f, category: c.name, subcategory: '' }); }}
                                    >
                                        {getCatIcon(c.name)} {c.name}
                                    </button>
                                ))}
                            </div>

                            <div className="sn-row">
                                <div className="sn-field">
                                    <label>Brand / Manufacturer</label>
                                    <input className="sn-input" maxLength={80} value={f.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Sony, Samsung, Nike" />
                                </div>
                                <div className="sn-field">
                                    <label>Quantity Available <span className="sn-req">*</span></label>
                                    <input id="sn-quantity" className={'sn-input' + (invalid === 'quantity' ? ' sn-invalid' : '')} data-field="quantity" type="number" min={1} max={10000} required value={f.quantity} onChange={e => set('quantity', e.target.value)} placeholder="e.g. 1" />
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Condition */}
                        <div className="sn-section">
                            <div className="sn-section-head">
                                <h2><div className="step-num">3</div> Condition & Operational Status</h2>
                            </div>
                            <p style={{fontSize:'12px', color:'#64748b', marginBottom:'16px'}}>
                                <strong>New</strong> items appear in "New Products". <strong>Like New, Good, Fair, Used</strong> items appear in "Pre-Loved".
                            </p>

                            <div className="sn-cond-grid" data-field="condition">
                                {[
                                    { v: 'New', t: 'Brand New Factory Pack', d: 'Unopened, original seal, never turned on.' },
                                    { v: 'Like New', t: 'Like New (Mint Condition)', d: 'Flawless exterior, complete original accessories.' },
                                    { v: 'Good', t: 'Good / Normal Wear', d: 'Minor superficial marks, fully functional.' },
                                    { v: 'Fair', t: 'Fair / Noticeable Wear', d: 'Visible cosmetic wear, works as it should.' },
                                    { v: 'Used', t: 'Used / Well Used', d: 'Heavy wear or dents, may need minor repair.' }
                                ].map(c => (
                                    <div key={c.v} className={`sn-cond-card ${f.condition === c.v ? 'active' : ''}`} onClick={() => set('condition', c.v)}>
                                        <span className="sn-cond-tag">{c.v.toUpperCase()}</span>
                                        <div className="sn-cond-title">{c.t}</div>
                                        <div className="sn-cond-desc">{c.d}</div>
                                        {f.condition === c.v && <CheckCircle2 className="sn-cond-check" size={20} />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step 4: Pricing */}
                        <div className="sn-section">
                            <div className="sn-section-head">
                                <h2><div className="step-num">4</div> Pricing & Negotiation Parameters</h2>
                            </div>

                            <div className="sn-price-wrap">
                                <div className="sn-price-row">
                                    <div>
                                        <label style={{display:'block', fontSize:'12px', fontWeight:700, color:'#64748b', marginBottom:'4px'}}>Your Asking Price <span className="sn-req">*</span></label>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{fontSize:'18px', fontWeight:800}}>Rs.</span>
                                            <input type="number" required min={1} data-field="price" className={'sn-price-input' + (invalid === 'price' ? ' sn-invalid' : '')} value={f.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 4500" />
                                        </div>
                                    </div>
                                    <div className="sn-offer-box">
                                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                            <strong style={{fontSize:'12px'}}>Allow Offers</strong>
                                            <input id="sn-allow-offers" type="checkbox" checked={allowOffers} onChange={e => setAllowOffers(e.target.checked)} style={{accentColor:'#0d5c45'}} />
                                        </div>
                                        <p style={{margin:0, fontSize:'10px', color:'#64748b'}}>Buyers can send you a price offer from the product page.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="sn-toggle-row">
                                <div className="sn-toggle-info">
                                    <strong>Open to Barter / Gadget Exchange</strong>
                                    <span>Buyers can propose an item in exchange from the product page.</span>
                                </div>
                                <input id="sn-exchange" type="checkbox" checked={exchange} onChange={e => setExchange(e.target.checked)} style={{width:'20px', height:'20px', accentColor:'#0d5c45'}} />
                            </div>
                        </div>

                        {/* Step 5: Description */}
                        <div className="sn-section">
                            <div className="sn-section-head">
                                <h2><div className="step-num">5</div> Detailed Description & History <span className="sn-req">*</span></h2>
                            </div>
                            <textarea
                                className={'sn-input sn-textarea' + (invalid === 'description' ? ' sn-invalid' : '')} data-field="description"
                                required minLength={10} maxLength={descriptionLimit}
                                value={f.description}
                                onChange={e => set('description', e.target.value)}
                                placeholder="E.g. Purchased original from Sony Center in early 2023. Flawless cosmetic condition with absolutely zero tears or cracking on the earcups or headband cushion..."
                            />
                            <div className="sn-char-count" aria-live="polite">{String(f.description || '').length} / {descriptionLimit}</div>
                        </div>

                        {/* Step 6: Pickup, Contact & Location */}
                        <div className="sn-section">
                            <div className="sn-section-head">
                                <h2><div className="step-num">6</div> Pickup, Safe Inspection & Contact</h2>
                            </div>
                            <p style={{fontSize:'12px', color:'#64748b', marginBottom:'16px'}}>
                                These details help buyers reach you directly. You can save defaults in your <button type="button" style={{color:'#0d5c45', fontWeight:700, background:'none', border:0, padding:0, cursor:'pointer', fontSize:'12px'}} onClick={() => actions.go('Dashboard')}>Edit Profile</button>.
                            </p>
                            <div className="sn-row">
                                <div className="sn-field">
                                    <label>City <span className="sn-req">*</span></label>
                                    <input className={'sn-input' + (invalid === 'location' ? ' sn-invalid' : '')} data-field="location" required minLength={2} maxLength={80} value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Lahore" />
                                </div>
                                <div className="sn-field">
                                    <label>Preferred Meetup Spot</label>
                                    <input className="sn-input" value={f.meetup_spot} onChange={e => set('meetup_spot', e.target.value)} placeholder="e.g. Packages Mall Food Court" />
                                </div>
                            </div>
                            <div className="sn-field">
                                <label>Delivery & Pickup</label>
                                <div className="sn-delivery-options">
                                    {DELIVERY_OPTIONS.map(option => {
                                        const on = (f.delivery || []).includes(option);
                                        return (
                                            <label key={option} className={'sn-delivery-option' + (on ? ' on' : '')}>
                                                <input type="checkbox" checked={on} onChange={() => set('delivery', on ? f.delivery.filter((d: string) => d !== option) : [...(f.delivery || []), option])} />
                                                {option}
                                            </label>
                                        );
                                    })}
                                </div>
                                <span className="sn-contact-hint">Tick every way a buyer can get this item. Buyers can filter products by these.</span>
                            </div>
                            <div className="sn-row">
                                <div className="sn-field">
                                    <label>Phone Number</label>
                                    <input className={'sn-input' + (invalid === 'phone' ? ' sn-invalid' : '')} data-field="phone" type="tel" maxLength={20} value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 03001234567" />
                                    <span className="sn-contact-hint">Shown to buyers on product page</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar */}
                    <div className="sn-sidebar">

                        <div className="sn-preview-card">
                            <div className="sn-preview-header">
                                <span>LIVE PREVIEW</span>
                                <span>Views & inquiries track here</span>
                            </div>
                            {f.images?.[0] ? <img src={f.images[0]} className="sn-preview-img" alt=""/> : <div className="sn-preview-img" style={{display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}><ImageIcon size={32}/></div>}
                            <div className="sn-preview-cat">{f.category || 'Category'}</div>
                            <div className="sn-preview-title">{f.title || 'Your Product Title Will Appear Here'}</div>
                            <div className="sn-preview-price">Rs. {f.price || '0'} <span style={{fontSize:'12px', color:'#64748b', fontWeight:600}}>{allowOffers ? 'Negotiable' : 'Fixed'}</span></div>
                            <div style={{fontSize:'11px', color:'#64748b', marginBottom:'8px'}}>
                                {f.condition === 'New' ? '📦 New Products' : '♻️ Pre-Loved'} • {f.condition}
                            </div>

                            <Load state={me}>
                                {me.data && (
                                    <div className="sn-preview-seller">
                                        <img src={me.data.profile.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + me.data.profile.name} alt="Avatar"/>
                                        {me.data.profile.name || 'Seller Name'} • {f.location || 'City'}
                                    </div>
                                )}
                            </Load>
                        </div>

                        <div className="sn-boost-card">
                            <div className="sn-boost-header">
                                <Zap size={16} /> SELL IT FASTER (OPTIONAL BOOSTERS)
                            </div>
                            <div className={'sn-boost-option' + (!boost ? ' selected' : '')} id="sn-boost-standard" onClick={() => setBoost(null)}>
                                <div className="sn-boost-info">
                                    <strong>Standard (Free) Listing</strong>
                                    <span>Uses one listing slot • Stays listed until you remove it</span>
                                </div>
                                <input type="radio" name="boost" checked={!boost} onChange={() => setBoost(null)} style={{accentColor:'#0d5c45'}} />
                            </div>
                            {/* New listing: the choice is kept here and sent for approval once the listing exists.
                                Existing listing: the usual promote form, which sends the request straight away. */}
                            <div className={'sn-boost-option' + (boost ? ' selected' : '')} id="sn-boost-spotlight"
                                onClick={() => f.id ? actions.open('payment', { id: f.id, title: f.title }) : actions.open('payment', { defer: true, title: f.title, ...(boost || {}), onPick: setBoost })}>
                                <div className="sn-boost-info">
                                    <strong><Star size={14} color="#e8621a" /> Premium Listing{boost ? ' (' + days(boost.duration) + ')' : ''}</strong>
                                    <span>{boost ? 'Goes live after payment verification • Ref: ' + boost.reference + ' • Tap to change' : 'Shown first with a Premium badge; the listing goes live once the payment is verified'}</span>
                                </div>
                                <span className="sn-boost-price">{boost ? '+ ' + money(boost.amount) : promoPrices.length ? 'from ' + money(Math.min(...promoPrices)) : ''}</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Fixed Bottom Bar */}
                <div className="sn-submit-bar">
                    <button type="button" className="sn-cancel-btn" onClick={() => window.history.back()}>Cancel & Discard</button>
                    <button type="submit" className="sn-publish-btn" disabled={busy}>
                        {busy ? 'Publishing...' : f.id ? <><Zap size={18} /> Save Changes</> : boost ? <><Zap size={18} /> Publish as Premium Listing</> : <><Zap size={18} /> Publish Listing Free</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
