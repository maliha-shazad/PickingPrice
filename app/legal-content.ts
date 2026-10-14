// Plain-language Privacy Policy and Terms of Service, shown at /privacy and /terms.
// Keep these in step with what the app really does: they are what Google and our members rely on.
// No React or CSS here: the Express server also sends this as ready-made HTML, so that readers and
// crawlers that do not run JavaScript still get the full text.
export const UPDATED = '14 October 2026';

export type Section = { heading: string; body: (string | string[])[] };

export const PRIVACY: Section[] = [
    { heading: 'Who we are', body: [
        'Picking Price is an online marketplace in Pakistan where people buy and sell new and pre-loved products and post requests for things they are looking for. This policy explains what information we collect when you use the website, why we collect it and what choices you have.',
    ] },
    { heading: 'Information we collect', body: [
        'Information you give us:',
        [
            'Account details: your name, email address, mobile number and password. Your mobile number is kept in your profile, where you can change it; other members do not see it, and see a number only if you add one to a listing. Passwords are stored in hashed form; we cannot read them.',
            'Profile details you choose to add, such as a photo, city and a short description.',
            'Listings and requests you post: titles, descriptions, prices, photos, category, condition, location and delivery options.',
            'Messages and offers you exchange with other members, items you save to your wishlist, reviews, and reports you send us.',
            'Requests for paid services such as extra listing quota or promotions, including the payment reference you submit. We do not collect or store card numbers.',
        ],
        'Information from Google, if you choose "Continue with Google": your name, email address and profile picture (see the next section). We never receive your Google password.',
        'Information collected automatically:',
        [
            'A sign-in cookie that keeps you logged in. It is essential for the website to work and is not used for advertising.',
            'Your IP address during sign-in attempts, used to limit repeated attempts and protect accounts.',
            'Your approximate location, only if you allow it in your browser, to suggest your city. The coordinates are sent to Google Maps to find the city name and are not saved to your account.',
        ],
    ] },
    { heading: 'Information from your Google account', body: [
        'Signing in with Google is optional. If you use it, Picking Price asks Google only for your basic profile: your name, your email address and your profile picture.',
        [
            'We use this information only to create your Picking Price account, sign you in, and show your name and picture on your profile.',
            'We store it with your account in our database for as long as the account exists.',
            'We do not use it for advertising, we do not sell it, and we do not share it with anyone except the service providers that host the website.',
            'We do not access your Gmail, contacts, calendar, files or any other Google data, and we do not store Google access tokens.',
            'You can remove Picking Price\'s access at any time in your Google Account settings, and you can ask us to delete your account and the information that came from Google.',
        ],
    ] },
    { heading: 'How we use your information', body: [[
        'To create and secure your account and keep you signed in.',
        'To show your listings and requests to other members and let buyers and sellers contact each other.',
        'To deliver messages, offers and notifications inside the website.',
        'To review reports, prevent fraud and misuse, and enforce our Terms of Service.',
        'To process requests for paid services.',
        'To improve and maintain the website.',
    ]] },
    { heading: 'What other people can see', body: [
        'Your listings, requests, reviews, public profile name, photo and city are visible to visitors of the website. A contact phone number is shown on a listing or request only if you choose to add one to it. Messages are visible to you and the member you are talking to. Our administrators can view content and account details where needed to run the marketplace and handle reports.',
    ] },
    { heading: 'Sharing', body: [
        'We do not sell your personal information. We share it only:',
        [
            'With service providers that run the website for us, such as our hosting and database provider, and Google for sign-in and maps.',
            'When the law requires it, or to protect the rights, safety and property of our members and of Picking Price.',
        ],
    ] },
    { heading: 'How long we keep it', body: [
        'We keep your information while your account is active. If you ask us to delete your account, we delete or anonymise your personal information, except where we need to keep some of it to meet legal obligations, resolve disputes or prevent fraud.',
    ] },
    { heading: 'Your choices', body: [[
        'You can view and edit your profile, listings and requests from your dashboard at any time.',
        'You can ask us for a copy of your information, to correct it, or to delete your account.',
        'You can remove Picking Price\'s access to your Google account at any time from your Google Account settings.',
        'You can block location access in your browser; the website still works and you can choose your city yourself.',
    ]] },
    { heading: 'Security', body: [
        'We use encrypted connections (HTTPS), hashed passwords, and sign-in protections to guard your information. No online service can promise perfect security, so please use a strong password and keep it private.',
    ] },
    { heading: 'Children', body: [
        'Picking Price is not intended for anyone under 18. We do not knowingly collect information from children.',
    ] },
    { heading: 'Changes to this policy', body: [
        'We may update this policy from time to time. The date at the top shows when it was last changed. If a change is significant, we will tell you on the website.',
    ] },
    { heading: 'Contact us', body: [
        'If you have a question about this policy or want to use any of the choices above, use "Report a Problem" at the bottom of the website and we will get back to you.',
    ] },
];

export const TERMS: Section[] = [
    { heading: 'About these terms', body: [
        'These terms are the agreement between you and Picking Price for using this website. By creating an account or using the website you accept them. If you do not agree, please do not use Picking Price.',
    ] },
    { heading: 'Who can use Picking Price', body: [
        'You must be at least 18 years old and able to enter into a binding agreement. You must give accurate information when you register and keep it up to date.',
    ] },
    { heading: 'Your account', body: [
        'You are responsible for what happens under your account and for keeping your password private. Tell us straight away if you think someone else has used your account. One person may not pretend to be another person or business.',
    ] },
    { heading: 'What Picking Price does and does not do', body: [
        'Picking Price is a place where buyers and sellers find each other. We are not the seller or the buyer in any deal, we do not own or inspect the items listed, and we do not hold or transfer money between members. Any sale is an agreement directly between the buyer and the seller, who are responsible for the item, the price, payment, delivery and any warranty.',
    ] },
    { heading: 'Listings and requests', body: [
        'When you post a listing or a request you confirm that:',
        [
            'The information and photos are accurate and not misleading, including the condition of the item.',
            'You own the item or have the right to sell it.',
            'The item and the sale are legal in Pakistan.',
            'The content does not infringe anyone else\'s rights.',
        ],
        'The following may not be listed or requested: stolen or counterfeit goods, weapons, illegal drugs, prescription medicines, hazardous materials, adult content, live animals protected by law, and anything else that is unlawful to sell.',
    ] },
    { heading: 'Behaviour on the website', body: [
        'You agree not to:',
        [
            'Defraud, harass, threaten or abuse other members.',
            'Post spam, false reviews or duplicate listings.',
            'Collect other members\' information for purposes unrelated to a genuine deal.',
            'Interfere with the website, try to access accounts or data that are not yours, or use automated tools to copy content.',
        ],
    ] },
    { heading: 'Staying safe', body: [
        'Check an item before you pay for it, meet in a public place where you can, and be careful with requests to pay in advance. Use "Report a Problem" to tell us about anything suspicious.',
    ] },
    { heading: 'Paid services', body: [
        'Using Picking Price is free within the standard listing allowance. Optional paid services, such as extra listing quota and promotions, are described on the website with their prices before you request them. A paid service starts once your payment has been confirmed.',
    ] },
    { heading: 'Your content', body: [
        'You keep ownership of the text and photos you post. You give Picking Price permission to store, display and share them on the website and in its promotion for as long as they are posted, so that the marketplace can work.',
    ] },
    { heading: 'Removing content and accounts', body: [
        'We may edit or remove a listing, request, review or message, and suspend or close an account, if we believe these terms have been broken or that it is needed to protect members or the website. You can stop using Picking Price at any time and ask us to delete your account.',
    ] },
    { heading: 'No warranty', body: [
        'The website is provided as it is. We do not guarantee the quality, safety or legality of items, the accuracy of listings, or that a buyer or seller will complete a deal. We do not promise that the website will always be available or free of errors.',
    ] },
    { heading: 'Limits on our responsibility', body: [
        'To the extent the law allows, Picking Price is not responsible for losses that arise from deals between members, from content posted by members, or from interruptions to the website.',
    ] },
    { heading: 'Changes', body: [
        'We may update these terms. The date at the top shows when they were last changed. If you keep using the website after a change, you accept the updated terms.',
    ] },
    { heading: 'Law', body: [
        'These terms are governed by the laws of Pakistan.',
    ] },
    { heading: 'Contact us', body: [
        'For any question about these terms, use "Report a Problem" at the bottom of the website.',
    ] },
];

export type LegalKind = 'privacy' | 'terms';
export const legalTitle = (kind: LegalKind) => (kind === 'privacy' ? 'Privacy Policy' : 'Terms of Service') + ' — Picking Price';
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The numbered sections alone, for showing the same text inside a popup. */
export function legalBody(kind: LegalKind) {
    return (kind === 'privacy' ? PRIVACY : TERMS).map((s, i) => '<section><h2>' + (i + 1) + '. ' + esc(s.heading) + '</h2>' + s.body.map(b => Array.isArray(b)
        ? '<ul>' + b.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>'
        : '<p>' + esc(b) + '</p>').join('') + '</section>').join('');
}

/** The page's markup, to go inside an element with class pp-legal-page. */
export function legalHtml(kind: LegalKind) {
    const privacy = kind === 'privacy', body = legalBody(kind);
    return '<header class="pp-legal-top"><a href="/" aria-label="Picking Price home"><img src="/new-logo.png" alt="Picking Price"/></a><nav>'
        + '<a href="/privacy"' + (privacy ? ' class="active"' : '') + '>Privacy Policy</a><a href="/terms"' + (privacy ? '' : ' class="active"') + '>Terms of Service</a></nav></header>'
        + '<main class="pp-legal-card"><h1>' + (privacy ? 'Privacy Policy' : 'Terms of Service') + '</h1><p class="pp-legal-updated">Last updated: ' + UPDATED + '</p>'
        + body + '<a href="/" class="pp-legal-back">Back to Picking Price</a></main>';
}
