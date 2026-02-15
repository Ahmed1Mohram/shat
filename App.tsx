import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { LoginPage } from './components/LoginPage';
import { MainLayout } from './components/MainLayout';
import { CallModal } from './components/CallModal'; // Import
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoaded } = useChat();

  const shouldShowLoading = isAuthLoading || (user && !isDataLoaded);

  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden">
        {/* Ambient Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/10 blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/5 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
            <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full"></div>
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-t-white/20 border-r-white/5 border-b-transparent border-l-transparent"
                ></motion.div>
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 rounded-full border border-b-white/10 border-l-white/5 border-t-transparent border-r-transparent"
                ></motion.div>
                <div className="relative w-36 h-36 rounded-full overflow-hidden border border-white/5 shadow-[0_0_60px_rgba(255,255,255,0.05)] bg-black">
                     <img 
                        src="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg" 
                        alt="Lumina Loading" 
                        className="w-full h-full object-cover opacity-90 scale-105"
                    />
                </div>
            </div>
            <div className="flex flex-col items-center gap-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-4xl font-black tracking-[0.3em] uppercase font-cinzel pl-2"
                >
                  Bat Man
                </motion.h1>
                <motion.div 
                   className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                   animate={{ width: ["0px", "64px", "0px"], opacity: [0, 1, 0] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase mt-2 font-medium">
                  {user && !isDataLoaded ? "Loading Chats..." : "Authenticating"}
                </p>
            </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
        {user ? <MainLayout /> : <LoginPage />}
        <CallModal /> 
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'dark:bg-dark-surface dark:text-white backdrop-blur-md border border-white/10',
              style: {
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#333',
              }
            }}
          />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;