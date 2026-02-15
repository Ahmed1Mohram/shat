import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

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
        // Error is handled in context toast
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
      {/* Deep, Soothing Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-900/20 blur-[120px] mix-blend-screen animate-pulse duration-[10000ms]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-900/10 blur-[100px] mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-30 w-full max-w-[400px] p-6"
      >
        <div className="relative group">
            {/* Elegant Glow */}
            <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-20 transition duration-1000"></div>

            {/* Main Card */}
            <div className="relative bg-[#111111]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-2xl flex flex-col items-center">
                
                {/* Bat Icon Area - Circular Design */}
                <motion.div 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-8 relative"
                >
                    <a 
                      href="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg" 
                      download="batman-logo.jpg"
                      className="relative w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] shadow-2xl shadow-black/50 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                         {/* User Provided Image in components folder */}
                        <img 
                          src="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg" 
                          alt="Batman Logo" 
                          className="w-full h-full object-cover opacity-90"
                        />
                    </a>
                </motion.div>

                <div className="text-center mb-8 space-y-2">
                    <h1 className="text-3xl font-medium text-white tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Get Started'}
                    </h1>
                    <p className="text-white/40 text-sm font-light tracking-wide leading-relaxed">
                        {isLogin ? 'Sign in to continue your journey' : 'Create an account to join the network'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-5 py-4 text-white placeholder:text-white/20 text-base font-light outline-none focus:bg-white/10 focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all"
                                placeholder="Username"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="relative group">
                             <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-5 py-4 text-white placeholder:text-white/20 text-base font-light outline-none focus:bg-white/10 focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all"
                                placeholder="Password"
                                disabled={isSubmitting}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors p-2"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !username.trim() || !password.trim()}
                        className="w-full group relative overflow-hidden bg-white text-black font-medium text-base py-4 rounded-xl transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                         <span className="relative z-10 flex items-center justify-center gap-2">
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} className="text-black/60 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <div className="mt-6 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-white/30 text-xs font-light">{isLogin ? "No account yet?" : "Have an account?"}</span>
                        <button 
                            onClick={() => { setIsLogin(!isLogin); setUsername(''); setPassword(''); }} 
                            className="text-white/80 hover:text-white text-xs font-medium transition-colors border-b border-transparent hover:border-white/50 pb-0.5"
                        >
                            {isLogin ? "Create one" : "Log in"}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 text-center">
                 <p className="text-[10px] text-white/10 font-medium tracking-[0.2em] uppercase hover:text-white/20 transition-colors cursor-default select-none">
                    Secured by Bat Man
                </p>
            </div>
        </div>
      </motion.div>
    </div>
  );
};