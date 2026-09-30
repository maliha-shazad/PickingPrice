'use client';
import { Suspense } from 'react';
import AuthDialog from '../auth-dialog';
import '../market/styles.css';

function SignupContainer() {
    return (
        <div className="pp-auth-page-container">
            <AuthDialog mode="signup" onSuccess={async () => { window.location.href = '/'; }} />
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="pp-auth-page-container">Loading...</div>}>
            <SignupContainer />
        </Suspense>
    );
}
