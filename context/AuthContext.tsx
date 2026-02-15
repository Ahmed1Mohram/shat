import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent login
    const storedUser = localStorage.getItem('lumina_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // Update status on background refresh
      supabaseService.sendHeartbeat(parsedUser.id);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const userData = await supabaseService.login(username, password);
      setUser(userData);
      localStorage.setItem('lumina_user', JSON.stringify(userData));
      toast.success(`Welcome back, ${userData.username}!`);
    } catch (error: any) {
        toast.error(error.message || 'Login failed');
        throw error; // Re-throw to handle in UI
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, password: string) => {
      setIsLoading(true);
      try {
        const userData = await supabaseService.signup(username, password);
        setUser(userData);
        localStorage.setItem('lumina_user', JSON.stringify(userData));
        toast.success("Account created successfully!");
      } catch (error: any) {
          toast.error(error.message || "Signup failed");
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const logout = () => {
    if (user) {
        supabaseService.logout(user.id);
    }
    setUser(null);
    localStorage.removeItem('lumina_user');
  };

  const updateProfileImage = async (file: File) => {
      if (!user) return;
      
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64 = reader.result as string;
              await supabaseService.updateUserAvatar(user.id, base64);
              
              const updatedUser = { ...user, avatar: base64 };
              setUser(updatedUser);
              localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
              toast.success("Profile picture updated!");
          };
      } catch (e) {
          toast.error("Failed to update profile picture");
      }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfileImage, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};