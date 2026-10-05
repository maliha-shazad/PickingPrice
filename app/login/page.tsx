'use client';
import { Suspense } from 'react';
import AuthDialog, { afterAuthPath } from '../auth-dialog';
import '../market/styles.css';

function LoginContainer() {
    return (
        <div className="pp-auth-page-container">
            <AuthDialog mode="login" onSuccess={async () => { window.location.href = afterAuthPath(); }} />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="pp-auth-page-container">Loading...</div>}>
            <LoginContainer />
        </Suspense>
    );
}
