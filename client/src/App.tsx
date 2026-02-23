import { UploadDashboard } from './components/UploadDashboard';
import { AuthGate } from './components/AuthGate';
import { LogOut } from 'lucide-react';

export default function App() {
    return (
        <AuthGate>
            {({ token, user, onSignOut }) => (
                <main
                    className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative noise-bg"
                    style={{
                        background: 'radial-gradient(ellipse 90% 50% at 50% 0%, #dbeafe 0%, #eef2ff 25%, #f8fafc 60%)',
                    }}
                >
                    <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
                    <div className="relative">
                        <div className="max-w-4xl mx-auto flex items-center justify-end gap-2 mb-6">
                            <div className="user-pill">
                                {user.picture && (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-7 h-7 rounded-full ring-2 ring-white"
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                                <span className="text-sm font-medium text-slate-600 hidden sm:inline">
                                    {user.name}
                                </span>
                            </div>
                            <button
                                onClick={onSignOut}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50/80 transition-all duration-200 cursor-pointer"
                            >
                                <LogOut size={13} />
                                <span className="hidden sm:inline">Sign out</span>
                            </button>
                        </div>
                        <UploadDashboard token={token} />
                    </div>
                </main>
            )}
        </AuthGate>
    );
}
