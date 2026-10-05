import type { Metadata } from 'next';
import LegalPage from '../legal';

export const metadata: Metadata = { title: 'Terms of Service — Picking Price' };

export default function TermsPage() { return <LegalPage kind="terms" />; }
