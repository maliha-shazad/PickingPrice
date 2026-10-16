import { useEffect, useRef, useState } from 'react';
import { Actions, Item, useLoad } from './ui';

/** The 11-character id of a YouTube video address (the server stores the watch?v= form). */
const youtubeId = (url: string) => /[?&]v=([\w-]{11})/.exec(url)?.[1] || '';

/** Picking Price's own three banners, shown until the administrator adds the first slide. */
const SAMPLE_SLIDES: Item[] = [
    { id: 'sample-slide-sell', kind: 'image', url: '/images/slides/slide-sell.jpg', mobile_url: '/images/slides/slide-sell-phone.jpg', title: '', view: 'SellNow' },
    { id: 'sample-slide-request', kind: 'image', url: '/images/slides/slide-request.jpg', mobile_url: '/images/slides/slide-request-phone.jpg', title: '', view: 'PostRequest' },
    { id: 'sample-slide-premium', kind: 'image', url: '/images/slides/slide-premium.jpg', mobile_url: '/images/slides/slide-premium-phone.jpg', title: '', view: 'SellNow' },
];

/** Phones (up to 600 px wide) show a slide's phone version, when it has one. */
const PHONE = '(max-width: 600px)';
function usePhone() {
    const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);
    useEffect(() => {
        const q = window.matchMedia(PHONE), on = () => setPhone(q.matches);
        q.addEventListener('change', on);
        return () => q.removeEventListener('change', on);
    }, []);
    return phone;
}

/** The slider on the home page, above the categories, filled from the admin panel; the sample slides until the first one is added. */
export function AdSlider({ actions }: { actions: Actions }) {
    const state = useLoad('slides', actions.revision);
    const loaded = !!state.data || !!state.error;
    const real: Item[] = (state.data?.items as Item[]) || [];
    const slides: Item[] = !loaded ? [] : real.length ? real : SAMPLE_SLIDES;
    const [index, setIndex] = useState(0);
    const phone = usePhone();
    // Swipe / drag: where the pointer went down, how far it has moved (the slide follows it), and whether the
    // gesture moved enough that the click at its end must not open the slide's link.
    const drag = useRef<{ x: number; y: number } | null>(null);
    const dragged = useRef(false);
    const [dragX, setDragX] = useState(0);
    const count = slides.length;
    const current = count ? slides[index % count] : null;

    // Pictures move on after 6 seconds; videos get 15. Moving by hand restarts the wait.
    useEffect(() => {
        if (count < 2 || !current) return;
        const t = setTimeout(() => setIndex(i => (i + 1) % count), current.kind === 'image' ? 6000 : 15000);
        return () => clearTimeout(t);
    }, [index, count, current]);

    if (!current)
        return null;
    const go = (step: number) => setIndex(i => (i + step + count) % count);
    const onDown = (e: React.PointerEvent) => { if (count < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return; drag.current = { x: e.clientX, y: e.clientY }; dragged.current = false; };
    const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - d.y)) dragged.current = true; if (dragged.current) setDragX(dx); };
    const onUp = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; drag.current = null; const dx = e.clientX - d.x; setDragX(0); if (dragged.current && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); };
    const onCancel = () => { drag.current = null; setDragX(0); };
    const follow = () => {
        // The click that ends a swipe or drag is not a tap on the slide.
        if (dragged.current) { dragged.current = false; return; }
        // A sample slide opens a page of the site; the administrator's slides follow their link.
        if (current.view === 'PostRequest') return actions.open('request-form');
        if (current.view) return actions.go(String(current.view));
        const link = String(current.link || '');
        if (!link) return;
        if (link.startsWith('/')) window.location.href = link;
        else window.open(link, '_blank', 'noopener');
    };
    // One slide's picture or video. Only the shown slide plays; a YouTube slide that is not shown is its thumbnail.
    const mediaFor = (slide: Item, active: boolean) => {
        const vid = youtubeId(String(slide.url));
        if (slide.kind === 'youtube')
            return active
                ? <iframe className="pp-slide-youtube" title={String(slide.title || 'Video')} src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&rel=0&playsinline=1&modestbranding=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                : <img className="pp-slide-media" src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="" />;
        const src = String(phone && slide.mobile_url ? slide.mobile_url : slide.url);
        if (slide.kind === 'video')
            return active
                ? <video key={src} className="pp-slide-media" src={src} autoPlay muted loop playsInline preload="auto" />
                : <video key={src} className="pp-slide-media" src={src} muted playsInline preload="metadata" />;
        return <img className="pp-slide-media" src={src} alt={String(slide.title || 'Picking Price')} draggable={false} />;
    };
    const pos = index % count;

    return (
        <section className="pp-slider" aria-roledescription="carousel" aria-label="Promotions">
            <div className="pp-slider-inner">
                <div className={'pp-slide' + (current.link || current.view ? ' has-link' : '') + (dragX ? ' dragging' : '')} onClick={current.kind === 'youtube' ? undefined : follow}
                    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onPointerLeave={onCancel} onDragStart={e => e.preventDefault()}>
                    <div className="pp-slide-track" style={{ transform: `translateX(calc(${-pos * 100}% + ${dragX}px))` }}>
                        {slides.map((slide, i) => (
                            <div className="pp-slide-cell" key={String(slide.id)} aria-hidden={i !== pos}>{mediaFor(slide, i === pos)}</div>
                        ))}
                    </div>
                    {(!!current.title || (current.kind === 'youtube' && !!current.link)) && (
                        <div className="pp-slide-caption">
                            {!!current.title && <strong>{String(current.title)}</strong>}
                            {!!current.link && <button type="button" onClick={e => { e.stopPropagation(); follow(); }}>Open</button>}
                        </div>
                    )}
                </div>
                {count > 1 && <>
                    <div className="pp-slider-dots">
                        {slides.map((s, i) => <button key={String(s.id)} type="button" aria-label={'Slide ' + (i + 1)} className={i === pos ? 'active' : ''} onClick={() => setIndex(i)} />)}
                    </div>
                </>}
            </div>
        </section>
    );
}
