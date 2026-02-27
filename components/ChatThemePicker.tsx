import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, Palette } from 'lucide-react';

// ─── Theme Context ───────────────────────────────────────────────
export interface ChatThemeContext {
    currentTheme: ChatTheme;
    customBg: string | null;
}
export const ChatThemeCtx = createContext<ChatThemeContext>({
    currentTheme: null as any,
    customBg: null,
});
export const useChatTheme = () => useContext(ChatThemeCtx);

// ─── Preset Themes ─────────────────────────────────────────────
export interface ChatTheme {
    id: string;
    label: string;
    background: string;
    preview: string;
    bubbleOwn: string;
    bubbleReceived: string;
    bubbleColors: string;
    reactionBg: string; // bg for reaction badges
}

export const CHAT_THEMES: ChatTheme[] = [
    {
        id: 'midnight',
        label: 'Midnight',
        background: 'linear-gradient(135deg, #080810 0%, #0d0820 40%, #080808 70%, #0a0d1a 100%)',
        preview: 'linear-gradient(135deg, #080810, #0d0820)',
        bubbleOwn: 'bg-gradient-to-br from-violet-600 via-purple-500 to-blue-500',
        bubbleReceived: 'bg-[#18182b] text-white border-white/10',
        bubbleColors: '#7c3aed,#3b82f6',
        reactionBg: 'rgba(124,58,237,0.18)',
    },
    {
        id: 'ocean',
        label: 'المحيط',
        background: 'linear-gradient(135deg, #020c1b 0%, #041d3a 40%, #062b4a 70%, #020c1b 100%)',
        preview: 'linear-gradient(135deg, #020c1b, #062b4a)',
        bubbleOwn: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600',
        bubbleReceived: 'bg-[#0a1e36] text-white border-cyan-500/20',
        bubbleColors: '#06b6d4,#6366f1',
        reactionBg: 'rgba(6,182,212,0.18)',
    },
    {
        id: 'forest',
        label: 'الغابة',
        background: 'linear-gradient(135deg, #0a130a 0%, #0d2010 40%, #0f2a12 70%, #0a1a0b 100%)',
        preview: 'linear-gradient(135deg, #0a130a, #0f2a12)',
        bubbleOwn: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
        bubbleReceived: 'bg-[#112918] text-white border-emerald-500/20',
        bubbleColors: '#10b981,#14b8a6',
        reactionBg: 'rgba(16,185,129,0.18)',
    },
    {
        id: 'rose',
        label: 'الوردي',
        background: 'linear-gradient(135deg, #1a060e 0%, #2a0a18 40%, #1a060e 100%)',
        preview: 'linear-gradient(135deg, #1a060e, #2d0d1e)',
        bubbleOwn: 'bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600',
        bubbleReceived: 'bg-[#361320] text-white border-rose-500/20',
        bubbleColors: '#f43f5e,#a855f7',
        reactionBg: 'rgba(244,63,94,0.18)',
    },
    {
        id: 'sunset',
        label: 'الغروب',
        background: 'linear-gradient(135deg, #1a0c00 0%, #2a1506 40%, #1a0800 100%)',
        preview: 'linear-gradient(135deg, #1a0c00, #2a1506)',
        bubbleOwn: 'bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500',
        bubbleReceived: 'bg-[#361908] text-white border-amber-500/20',
        bubbleColors: '#f97316,#f43f5e',
        reactionBg: 'rgba(249,115,22,0.18)',
    },
    {
        id: 'cosmic',
        label: 'الكون',
        background: 'linear-gradient(135deg, #0a0014 0%, #150028 40%, #1a003a 70%, #0a0014 100%)',
        preview: 'linear-gradient(135deg, #0a0014, #1a003a)',
        bubbleOwn: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-violet-700',
        bubbleReceived: 'bg-[#2b0e45] text-white border-fuchsia-500/20',
        bubbleColors: '#c026d3,#7c3aed',
        reactionBg: 'rgba(192,38,211,0.18)',
    },
    {
        id: 'arctic',
        label: 'القطب',
        background: 'linear-gradient(135deg, #050f1a 0%, #081828 40%, #0a2030 100%)',
        preview: 'linear-gradient(135deg, #050f1a, #0a2030)',
        bubbleOwn: 'bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500',
        bubbleReceived: 'bg-[#0f2336] text-white border-sky-400/20',
        bubbleColors: '#38bdf8,#60a5fa',
        reactionBg: 'rgba(56,189,248,0.18)',
    },
    {
        id: 'gold',
        label: 'الذهب',
        background: 'linear-gradient(135deg, #0f0a00 0%, #1a1000 40%, #0f0a00 100%)',
        preview: 'linear-gradient(135deg, #0f0a00, #1a1000)',
        bubbleOwn: 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500',
        bubbleReceived: 'bg-[#33250b] text-white border-yellow-500/20',
        bubbleColors: '#facc15,#f97316',
        reactionBg: 'rgba(250,204,21,0.18)',
    },
    {
        id: 'white',
        label: 'ناصع',
        background: 'linear-gradient(135deg, #fdf4ff 0%, #f0f4ff 40%, #fff 100%)',
        preview: 'linear-gradient(135deg, #fdf4ff, #e0e7ff)',
        bubbleOwn: 'bg-gradient-to-br from-violet-600 via-purple-500 to-blue-500',
        bubbleReceived: 'bg-white/95 text-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-200/50',
        bubbleColors: '#7c3aed,#3b82f6',
        reactionBg: 'rgba(124,58,237,0.12)',
    },
    {
        id: 'steel',
        label: 'معدني',
        background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 40%, #111 100%)',
        preview: 'linear-gradient(135deg, #0d0d0d, #1a1a1a)',
        bubbleOwn: 'bg-gradient-to-br from-slate-400 via-gray-300 to-slate-500',
        bubbleReceived: 'bg-[#222] text-white border-white/5',
        bubbleColors: '#94a3b8,#64748b',
        reactionBg: 'rgba(148,163,184,0.18)',
    },
];


// ─── Storage Key ────────────────────────────────────────────────
const STORAGE_KEY = 'chat_theme_v1';
const CUSTOM_BG_KEY = 'chat_custom_bg_v1';

// ─── Hook ───────────────────────────────────────────────────────
export function useChatBackground() {
    const [themeId, setThemeId] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || 'midnight';
    });
    const [customBg, setCustomBg] = useState<string | null>(() => {
        return localStorage.getItem(CUSTOM_BG_KEY) || null;
    });

    const currentTheme = CHAT_THEMES.find(t => t.id === themeId) || CHAT_THEMES[0];

    const background = customBg
        ? `url('${customBg}') center/cover no-repeat`
        : currentTheme.background;

    const selectTheme = useCallback((id: string) => {
        setThemeId(id);
        setCustomBg(null);
        localStorage.setItem(STORAGE_KEY, id);
        localStorage.removeItem(CUSTOM_BG_KEY);
    }, []);

    const setCustomBackground = useCallback((dataUrl: string) => {
        setCustomBg(dataUrl);
        localStorage.setItem(CUSTOM_BG_KEY, dataUrl);
    }, []);

    return { themeId, customBg, currentTheme, background, selectTheme, setCustomBackground };
}

// ─── Picker UI ──────────────────────────────────────────────────
interface ChatThemePickerProps {
    isOpen: boolean;
    onClose: () => void;
    themeId: string;
    customBg: string | null;
    onSelectTheme: (id: string) => void;
    onSetCustomBg: (dataUrl: string) => void;
}

export const ChatThemePicker: React.FC<ChatThemePickerProps> = ({
    isOpen, onClose, themeId, customBg, onSelectTheme, onSetCustomBg
}) => {
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            onSetCustomBg(result);
            onClose();
        };
        reader.readAsDataURL(file);
    };

    // Close on backdrop click
    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex flex-col justify-end"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={handleBackdrop}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="bg-[#111]/95 backdrop-blur-2xl rounded-t-3xl px-4 pt-4 pb-8 border-t border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Palette size={18} className="text-violet-400" />
                                <span className="text-white font-semibold text-[15px]">خلفية الشات</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Upload custom */}
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="w-full mb-5 py-3 rounded-2xl border-2 border-dashed border-white/20 hover:border-violet-500/60 flex items-center justify-center gap-2 text-white/60 hover:text-violet-400 transition-all active:scale-[0.98]"
                        >
                            <Upload size={18} />
                            <span className="text-sm font-medium">رفع صورة مخصصة</span>
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

                        {/* Preset grid */}
                        <div className="grid grid-cols-5 gap-3">
                            {CHAT_THEMES.map((theme) => {
                                const isActive = !customBg && themeId === theme.id;
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => { onSelectTheme(theme.id); onClose(); }}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        {/* Swatch */}
                                        <div
                                            className={`w-full aspect-square rounded-2xl relative overflow-hidden transition-all ${isActive
                                                ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-[#111] scale-105'
                                                : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
                                                }`}
                                            style={{ background: theme.preview }}
                                        >
                                            {/* Mini bubble preview */}
                                            <div
                                                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-2 rounded-full opacity-90"
                                                style={{
                                                    background: `linear-gradient(to right, ${theme.bubbleColors.split(',')[0]}, ${theme.bubbleColors.split(',')[1]})`
                                                }}
                                            />
                                            {isActive && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                                                        <Check size={10} className="text-white" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors leading-tight text-center">
                                            {theme.label}
                                        </span>
                                    </button>
                                );
                            })}

                            {/* Custom image swatch (if set) */}
                            {customBg && (
                                <button
                                    className="flex flex-col items-center gap-1.5"
                                    onClick={() => { onClose(); }}
                                >
                                    <div
                                        className="w-full aspect-square rounded-2xl relative overflow-hidden ring-2 ring-violet-400 ring-offset-2 ring-offset-[#111] scale-105"
                                        style={{ backgroundImage: `url('${customBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={10} className="text-white" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/50 leading-tight">مخصصة</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
