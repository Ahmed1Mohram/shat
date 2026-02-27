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
  <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-transparent">
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
      {/* Updated Logo Container: Circular with Image */}
      <div className="relative w-32 h-32 bg-white dark:bg-black rounded-full shadow-xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden">
        <img
          src="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg"
          alt="Lumina Logo"
          className="w-full h-full object-cover opacity-90"
        />
      </div>
    </div>
    <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-3 tracking-widest uppercase font-cinzel">Bat Man</h2>
    <p className="text-gray-500 dark:text-gray-300 max-w-sm text-lg leading-relaxed font-sans">
      Select a conversation to start chatting.
    </p>
  </div>
);