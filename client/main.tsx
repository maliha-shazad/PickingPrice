import React from 'react';
import {createRoot} from 'react-dom/client';
import Workspace from '../app/market/workspace';
import AdminApp from '../app/market/admin-app';
import LoginPage from '../app/login/page';
import SignupPage from '../app/signup/page';
import ForgotPasswordPage from '../app/forgot-password/page';
import LegalPage from '../app/legal';
import '../app/globals.css';

// The hosted edition has a real page per URL; this single-page build picks the same screen from the path.
const path = location.pathname.replace(/\/+$/, '') || '/';
const product = path.match(/^\/product\/([^/]+)$/);
if (product) location.replace('/?product=' + encodeURIComponent(decodeURIComponent(product[1])));
const screens: Record<string, React.ReactNode> = {
    '/admin': <AdminApp/>,
    '/login': <LoginPage/>,
    '/signup': <SignupPage/>,
    '/forgot-password': <ForgotPasswordPage/>,
    '/privacy': <LegalPage kind="privacy"/>,
    '/terms': <LegalPage kind="terms"/>,
};
const titles: Record<string, string> = { '/privacy': 'Privacy Policy — Picking Price', '/terms': 'Terms of Service — Picking Price' };
if (titles[path]) document.title = titles[path];
if (!product) createRoot(document.getElementById('root')!).render(screens[path] ?? <Workspace/>);
