import { useState, useEffect, useCallback } from 'react';
import { useGoogleOneTapLogin, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from './jwt-decode';
import type { AuthUser } from '../../../shared/types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function getStoredAuth(): { token: string; user: AuthUser } | null {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);
        if (token && userJson) {
            const user = JSON.parse(userJson) as AuthUser;
            const payload = jwtDecode(token);
            if (payload.exp && payload.exp * 1000 > Date.now()) {
                return { token, user };
            }
        }
    } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
}

function storeAuth(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

type AuthGateProps = {
    children: (auth: { token: string; user: AuthUser; onSignOut: () => void }) => React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
    const [token, setToken] = useState<string | null>(() => getStoredAuth()?.token ?? null);
    const [user, setUser] = useState<AuthUser | null>(() => getStoredAuth()?.user ?? null);

    const handleCredential = useCallback((credential: string) => {
        const payload = jwtDecode(credential);
        const authUser: AuthUser = {
            email: payload.email ?? '',
            name: payload.name ?? '',
            picture: payload.picture ?? '',
            sub: payload.sub ?? '',
        };
        storeAuth(credential, authUser);
        setToken(credential);
        setUser(authUser);
    }, []);

    const handleSignOut = useCallback(() => {
        clearAuth();
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        if (!token) return;
        const interval = setInterval(() => {
            try {
                const payload = jwtDecode(token);
                if (payload.exp && payload.exp * 1000 <= Date.now()) {
                    handleSignOut();
                }
            } catch {
                handleSignOut();
            }
        }, 60_000);
        return () => clearInterval(interval);
    }, [token, handleSignOut]);

    if (token && user) {
        return <>{children({ token, user, onSignOut: handleSignOut })}</>;
    }

    return <SignInScreen onCredential={handleCredential} />;
}

function SignInScreen({
    onCredential,
}: {
    onCredential: (credential: string) => void;
}) {
    useGoogleOneTapLogin({
        onSuccess: (response) => {
            if (response.credential) {
                onCredential(response.credential);
            }
        },
        onError: () => {},
        cancel_on_tap_outside: false,
    });

    return (
        <div className="min-h-screen flex items-center justify-center relative noise-bg overflow-hidden"
            style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #dbeafe 0%, #eef2ff 30%, #f8fafc 70%)',
            }}
        >
            {/* Decorative floating shapes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute w-72 h-72 rounded-full opacity-[0.07]"
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        top: '10%',
                        right: '15%',
                        animation: 'float 8s ease-in-out infinite',
                    }}
                />
                <div
                    className="absolute w-48 h-48 rounded-full opacity-[0.05]"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        bottom: '15%',
                        left: '10%',
                        animation: 'float 10s ease-in-out infinite 2s',
                    }}
                />
                <div
                    className="absolute w-32 h-32 opacity-[0.04]"
                    style={{
                        border: '2px solid #3b82f6',
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        top: '25%',
                        left: '20%',
                        animation: 'slow-spin 20s linear infinite',
                    }}
                />
            </div>

            <div className="glow-card p-10 sm:p-12 max-w-sm w-full text-center relative z-10">
                {/* Geometric accent */}
                <div className="flex justify-center mb-6 animate-fade-in-up">
                    <div className="relative w-14 h-14">
                        <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                transform: 'rotate(12deg)',
                                opacity: 0.15,
                            }}
                        />
                        <div
                            className="absolute inset-1 rounded-lg flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
                                transform: 'rotate(12deg)',
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="-rotate-12">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" opacity="0.9" />
                            </svg>
                        </div>
                    </div>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-slate-800 animate-fade-in-up-delay-1">
                    SAP Integration
                    <span className="block text-[0.65em] font-sans font-normal tracking-widest uppercase text-slate-400 mt-1.5">
                        Hub
                    </span>
                </h1>

                <p className="text-sm text-slate-500 mt-4 mb-8 leading-relaxed animate-fade-in-up-delay-2">
                    Sign in with your company Google account to access the upload dashboard.
                </p>

                <div className="flex justify-center animate-fade-in-up-delay-3">
                    <GoogleLogin
                        onSuccess={(response) => {
                            if (response.credential) {
                                onCredential(response.credential);
                            }
                        }}
                        onError={() => console.error('Google Login failed')}
                        theme="outline"
                        size="large"
                        shape="pill"
                        width={280}
                    />
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 animate-fade-in-up-delay-3">
                    <p className="text-xs text-slate-400">
                        Restricted to authorized accounts only
                    </p>
                </div>
            </div>
        </div>
    );
}
