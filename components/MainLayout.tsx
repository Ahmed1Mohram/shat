import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';

export const MainLayout: React.FC = () => {
  const { currentConversationId } = useChat();
  const { theme } = useTheme();
  const appBgUrl = '/cae1afd7f0f92784a8fb32251f4ed8f0.jpg';

  const lightModeBg = { backgroundColor: '#ffffff', backgroundImage: 'none' };
  const darkModeBg = (opacity1: number, opacity2: number) => ({
    backgroundImage: `linear-gradient(rgba(0,0,0,${opacity1}), rgba(0,0,0,${opacity2})), url('${appBgUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  });

  return (
    <div className={`flex h-[100dvh] overflow-hidden p-0 md:p-4 lg:p-6 gap-4 transition-colors duration-300 ${theme === 'light' ? 'bg-white' : 'bg-transparent'}`}>
      {/* 
        DESKTOP LAYOUT (md and up):
        Side-by-side, static layout. No sliding between panels, just internal content animations.
      */}
      <div
        className="hidden md:flex w-80 lg:w-96 flex-col md:rounded-3xl overflow-hidden shadow-2xl z-10"
        style={theme === 'light' ? lightModeBg : {
          backgroundImage: `linear-gradient(rgba(255,255,255,0.25), rgba(255,255,255,0.35)), url('${appBgUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Sidebar />
      </div>

      <div
        className="hidden md:flex flex-1 flex-col md:rounded-3xl overflow-hidden shadow-2xl z-10 relative"
        style={theme === 'light' ? lightModeBg : {
          backgroundImage: `linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.28)), url('${appBgUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <AnimatePresence mode="wait">
          {currentConversationId ? (
            <motion.div
              key="chat"
              className="h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChatWindow />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* 
        MOBILE LAYOUT (sm and down):
        Slide transitions between Sidebar (List) and ChatWindow (Detail).
      */}
      <div
        className={`md:hidden w-full h-full relative overflow-hidden ${theme === 'light' ? 'bg-white' : 'bg-transparent'}`}
        style={theme === 'light' ? lightModeBg : {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.18)), url('${appBgUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {currentConversationId ? (
            <motion.div
              key="mobile-chat"
              className="absolute inset-0 z-20 bg-transparent"
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <ChatWindow />
            </motion.div>
          ) : (
            <motion.div
              key="mobile-sidebar"
              className="absolute inset-0 z-10 bg-transparent"
              initial={{ x: "-20%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-20%", opacity: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'linear-gradient(135deg, #080810 0%, #0d0820 40%, #080808 100%)' }}>
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-violet-500 blur-3xl opacity-20 rounded-full animate-pulse" />
      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-violet-500/30 shadow-[0_0_40px_rgba(124,58,237,0.3)]">
        <img src="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg" alt="شعار" className="w-full h-full object-cover opacity-90" />
      </div>
    </div>
    <h2 className="text-3xl font-black text-white mb-3 tracking-widest">Bat Man</h2>
    <p className="text-white/40 max-w-xs text-base leading-relaxed">اختر محادثة للبدء ✨</p>
  </div>
);