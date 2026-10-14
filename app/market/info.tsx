import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { legalBody, UPDATED } from '../legal-content';
import type { Actions } from './ui';

// The popups behind the footer's Support and Company links.
export type InfoTopic = 'help' | 'safety' | 'contact' | 'about' | 'careers' | 'privacy' | 'terms';
export const infoTitle: Record<InfoTopic, string> = {
    help: 'Help Center', safety: 'Safety Tips', contact: 'Contact Us', about: 'About Picking Price',
    careers: 'Careers', privacy: 'Privacy Policy', terms: 'Terms of Service',
};

// PLACEHOLDER contact details: replace these with the real ones before launch.
const CONTACT = {
    email: 'support@pickingprice.pk',
    careers: 'careers@pickingprice.pk',
    phone: '+92 300 1234567',
    hours: 'Monday to Saturday, 10:00 am to 6:00 pm (PKT)',
    address: 'Picking Price, University Road, Peshawar, Pakistan',
};

type Block = { heading: string; text?: string; points?: string[] };

const HELP: Block[] = [
    { heading: 'Buying a product', points: [
        'Browse New Products, Pre-Loved or All Categories, or use the search bar. Filters on the left narrow results by category, price, condition, area and delivery option.',
        'Open a product to see its photos, condition, seller and delivery options.',
        'Use Chat to message the seller inside Picking Price, send an offer with your price, or call the contact number if the seller has added one.',
        'Tap the heart on any product to keep it in your Wishlist.',
    ] },
    { heading: 'Posting a request', points: [
        'Cannot find what you want? Tap Post a Request and describe the item, your budget, the condition you accept and your city.',
        'Sellers who have that item send you offers with their price, a description and a photo.',
        'Compare the offers in your Buyer Dashboard, chat with the seller, and accept the one you like.',
    ] },
    { heading: 'Selling a product', points: [
        'Tap Sell Now, add clear photos, an honest description, the condition and your price, and choose how the buyer can get the item: same-day delivery, in-store pickup or nationwide delivery.',
        'Your listings, their status and your free listing allowance are in the Seller Dashboard.',
        'Need more listings or want a product promoted? Request it under Quota & Services in the Seller Dashboard.',
    ] },
    { heading: 'Sending offers on buyer requests', points: [
        'Open Requests to see what buyers are looking for.',
        'Open a request and tap Submit Offer to send your price, a description of your item and a photo. You can also chat with the buyer first.',
        'Track what you sent under My Offers in the Seller Dashboard. You can edit or withdraw an offer while it is pending.',
    ] },
    { heading: 'Your account', points: [
        'Sign up with your email address or with Google. One account can both buy and sell: use the Buying / Selling switch at the top.',
        'Edit your name, photo and details from the pencil icon in your dashboard.',
        'Forgot your password? Use "Forgot password" on the login page. Our support team gives you a one-time reset code.',
    ] },
    { heading: 'Something wrong?', text: 'Use Report on a product, request, message or profile, or "Report a Problem" at the bottom of the website. See Safety Tips before you meet or pay anyone.' },
];

const SAFETY: Block[] = [
    { heading: 'Before you pay', points: [
        'See and check the item before you hand over any money. Test electronics, check sizes and compare the item with its photos.',
        'Do not send advance payments, deposits or "booking fees" to someone you have not met. This is the most common scam.',
        'If a price looks too good to be true, it usually is.',
    ] },
    { heading: 'Meeting the other person', points: [
        'Meet in a busy public place during the day, such as a market, mall or bank branch.',
        'Take someone with you for expensive items, and tell a family member where you are going.',
        'For in-store pickup, go to the shop address shown by the seller rather than a private location.',
    ] },
    { heading: 'Delivery', points: [
        'For same-day or nationwide delivery, prefer cash on delivery and open the parcel in front of the rider where the courier allows it.',
        'Keep the courier receipt and tracking number until the buyer confirms the item has arrived.',
    ] },
    { heading: 'Keep the conversation on Picking Price', points: [
        'Use the in-app chat. It keeps a record that helps us if something goes wrong.',
        'Check the member\'s profile, how long they have been on Picking Price, and their reviews before you deal.',
    ] },
    { heading: 'Protect your account', points: [
        'Never share your password or a reset code with anyone. Picking Price staff will never ask you for them.',
        'Ignore messages that ask you to log in through a link or to "verify" your account outside this website.',
    ] },
    { heading: 'For sellers', points: [
        'Hand over the item only after the money is actually in your hand or in your account. A screenshot of a transfer is not proof.',
        'Describe faults honestly. It avoids disputes and builds your reviews.',
    ] },
    { heading: 'Report it', text: 'If someone asks for advance payment, pressures you, or a listing looks fake, use Report on that product, request, message or profile. We review reports and can remove content and suspend accounts.' },
];

const ABOUT: Block[] = [
    { heading: 'What Picking Price is', text: 'Picking Price is a marketplace in Pakistan for new and pre-loved products. It works in both directions: sellers list what they have, and buyers post what they are looking for so that sellers can come to them with offers.' },
    { heading: 'Why we built it', text: 'Finding a fair price usually means visiting many shops or scrolling through endless posts. On Picking Price a buyer describes the item and the budget once, and sellers compete with their best offer. Sellers reach people who are ready to buy, without paying for a shop front.' },
    { heading: 'What you can do here', points: [
        'Buy factory-sealed new products and inspected pre-loved items from sellers across Pakistan.',
        'Post a request and receive offers instead of searching.',
        'Sell from your phone in a few minutes, with delivery or pickup options you choose.',
        'Chat, send offers, save favourites and review the people you deal with.',
    ] },
    { heading: 'What we care about', points: [
        'Honest listings: clear photos, real condition, real prices.',
        'Safety: in-app chat, reporting on every listing and profile, and a team that reviews reports.',
        'Simplicity: one account for buying and selling.',
    ] },
];

function Blocks({ blocks }: { blocks: Block[] }) {
    return <>{blocks.map(b => (
        <section key={b.heading}>
            <h3>{b.heading}</h3>
            {b.text && <p>{b.text}</p>}
            {b.points && <ul>{b.points.map(p => <li key={p}>{p}</li>)}</ul>}
        </section>
    ))}</>;
}

export function InfoContent({ topic, actions }: { topic: InfoTopic; actions: Actions }) {
    return (
        <div className="pp-info" data-topic={topic}>
            {topic === 'help' && <><p className="pp-info-lead">Quick answers on how buying, selling, requests and offers work on Picking Price.</p><Blocks blocks={HELP} /></>}
            {topic === 'safety' && <><p className="pp-info-lead">Deals on Picking Price happen directly between a buyer and a seller. These habits keep them safe.</p><Blocks blocks={SAFETY} /></>}
            {topic === 'about' && <Blocks blocks={ABOUT} />}
            {topic === 'contact' && (
                <>
                    <p className="pp-info-lead">We are happy to help with your account, a listing, a request or a report.</p>
                    <ul className="pp-info-contact">
                        <li><Mail size={17} /><div><strong>Email</strong><a href={'mailto:' + CONTACT.email}>{CONTACT.email}</a></div></li>
                        <li><Phone size={17} /><div><strong>Phone</strong><a href={'tel:' + CONTACT.phone.replace(/\s/g, '')}>{CONTACT.phone}</a></div></li>
                        <li><Clock size={17} /><div><strong>Support hours</strong><span>{CONTACT.hours}</span></div></li>
                        <li><MapPin size={17} /><div><strong>Office</strong><span>{CONTACT.address}</span></div></li>
                    </ul>
                    <p>To report a listing, request, message or member, use the Report link on it, or send us the details here:</p>
                    <button type="button" className="pp-info-btn" onClick={() => actions.open('report')}>Report a Problem</button>
                </>
            )}
            {topic === 'careers' && (
                <>
                    <p className="pp-info-lead">Picking Price is a small team building a simpler way to buy and sell in Pakistan.</p>
                    <section><h3>Open positions</h3><p>We have no open positions listed right now.</p></section>
                    <section><h3>Work with us</h3><p>We are always glad to hear from people who care about marketplaces, customer support, and web or mobile development. Send your CV and a few lines about what you would like to do to <a href={'mailto:' + CONTACT.careers}>{CONTACT.careers}</a>. We read every message and reply if there is a fit.</p></section>
                    <section><h3>How we work</h3><ul><li>Small team, direct communication, and work you can see live on the website.</li><li>We test on real phones first, because most of our members use one.</li><li>We listen to buyers and sellers, and fix what gets in their way.</li></ul></section>
                </>
            )}
            {(topic === 'privacy' || topic === 'terms') && (
                <>
                    <p className="pp-info-lead">Last updated: {UPDATED}. <a href={'/' + topic} target="_blank" rel="noopener">Open as a full page</a></p>
                    <div className="pp-info-legal" dangerouslySetInnerHTML={{ __html: legalBody(topic) }} />
                </>
            )}
        </div>
    );
}
