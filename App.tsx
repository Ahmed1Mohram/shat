import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { LoginPage } from './components/LoginPage';
import { MainLayout } from './components/MainLayout';
import { CallModal } from './components/CallModal';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoaded } = useChat();

  const shouldShowLoading = isAuthLoading;

  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden">
        {/* Lightweight ambient background — pure CSS, no external URL */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/15 blur-[60px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[60px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo circle with single CSS spin ring */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Single lightweight spin ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30 animate-spin"
              style={{ animationDuration: '2s', willChange: 'transform' }}
            />
            {/* Logo image */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-black shadow-lg">
              <img
                src="/cae1afd7f0f92784a8fb32251f4ed8f0.jpg"
                alt="شعار"
                className="w-full h-full object-cover opacity-90"
                loading="eager"
              />
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-white text-2xl font-bold tracking-widest">Bat Man</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-white/30 text-xs tracking-widest uppercase">
              {user && !isDataLoaded ? 'جارٍ التحميل...' : 'جارٍ المصادقة...'}
            </p>
          </div>
        </div>
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