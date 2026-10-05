import type { Metadata } from 'next';
import AdminApp from '../market/admin-app';

export const metadata: Metadata = {
    title: 'Picking Price — Admin',
    robots: { index: false, follow: false },
};

export default function AdminPage() { return <AdminApp />; }
