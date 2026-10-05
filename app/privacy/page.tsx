import type { Metadata } from 'next';
import LegalPage from '../legal';

export const metadata: Metadata = { title: 'Privacy Policy — Picking Price' };

export default function PrivacyPage() { return <LegalPage kind="privacy" />; }
