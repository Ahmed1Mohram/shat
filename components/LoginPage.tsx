import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { login, signup } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;
        setIsSubmitting(true);
        try {
            if (isLogin) {
                await login(username, password);
            } else {
                await signup(username, password);
            }
        } catch (e) {
            // Error handled in context via toast
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
            {/* Lightweight ambient blobs — pure CSS, no external URLs */}
            <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/20 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/15 blur-[80px] pointer-events-none" />

            {/* Card */}
            <div
                className="relative z-10 w-full max-w-[380px] mx-4 animate-fade-in"
                style={{ animation: 'fadeInUp 0.5s ease-out both' }}
            >
                <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes logoPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.2); }
            50%       { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
          }
        `}</style>

                <div className="bg-white/[0.05] border border-white/10 rounded-3xl p-7 sm:p-9 shadow-2xl flex flex-col items-center gap-6">

                    {/* Logo */}
                    <div
                        className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-black"
                        style={{ animation: 'logoPulse 3s ease-in-out infinite' }}
                    >
                        <img
                            src="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg"
                            alt="شعار"
                            className="w-full h-full object-cover opacity-90"
                            loading="eager"
                        />
                    </div>

                    {/* Heading */}
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-semibold text-white">
                            {isLogin ? 'أهلاً بعودتك 👋' : 'إنشاء حساب جديد'}
                        </h1>
                        <p className="text-white/40 text-sm font-light">
                            {isLogin ? 'سجّل دخولك للمتابعة' : 'أنشئ حسابك وانضم الآن'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="w-full space-y-3">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/25 text-[15px] outline-none focus:bg-white/8 focus:border-white/15 transition-all"
                            placeholder="اسم المستخدم"
                            disabled={isSubmitting}
                            autoComplete="username"
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/25 text-[15px] outline-none focus:bg-white/8 focus:border-white/15 transition-all pr-12"
                                placeholder="كلمة المرور"
                                disabled={isSubmitting}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors p-1.5"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !username.trim() || !password.trim()}
                            className="w-full bg-white text-black font-semibold text-[15px] py-3.5 rounded-2xl transition-all hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-1"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    جارٍ التحميل...
                                </span>
                            ) : (
                                isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-white/30 text-sm">{isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}</span>
                        <button
                            onClick={() => { setIsLogin(!isLogin); setUsername(''); setPassword(''); }}
                            className="text-white/80 hover:text-white text-sm font-medium transition-colors underline underline-offset-2"
                        >
                            {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};