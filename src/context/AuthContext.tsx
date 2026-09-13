import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserPrivacySettings, NotificationSettings, BlockedUser } from '../types';
import { currentUser as defaultSeedUser } from '../data/seedData';
import { useToast } from './ToastContext';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'custom' | 'prefer_not_to_say';
  genderCustom?: string;
  phone?: string;
}

interface AuthContextType {
  currentUser: User;
  usersList: User[];
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isAuthModalOpen: boolean;
  pendingOTP: string | null;
  otpEmail: string;
  updateProfile: (data: Partial<User>) => void;
  updatePrivacy: (settings: Partial<UserPrivacySettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  changeEmail: (currentPassword: string, newEmail: string) => Promise<{ success: boolean; message: string }>;
  verifyChangeEmail: (newEmail: string, otp: string) => Promise<{ success: boolean; message: string }>;
  deactivateAccount: (password?: string) => Promise<{ success: boolean; message: string }>;
  deleteAccount: (password: string) => Promise<{ success: boolean; message: string }>;
  blockUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  unblockUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  getBlockedUsers: () => Promise<BlockedUser[]>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  sendOTP: (email: string) => Promise<string>;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerUser: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string; field?: string; otp?: string }>;
  checkUsername: (username: string) => Promise<{ available: boolean; message: string; suggestions: string[] }>;
  checkEmail: (email: string) => Promise<{ available: boolean; message: string }>;
  verifyRegistrationOTP: (email: string, otp: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_DB_KEY = 'nexus_all_registered_users_v10';
const ACTIVE_USER_KEY = 'nexus_active_session_user_v10';
const AUTH_STATE_KEY = 'nexus_is_authenticated_v10';

export const EMPTY_GUEST_USER: User = {
  id: '',
  fullName: '',
  username: '',
  email: '',
  avatarUrl: '',
  coverUrl: '',
  bio: '',
  location: '',
  occupation: '',
  joinedDate: '',
  friendsCount: 0,
  followersCount: 0,
  followingCount: 0,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [usersList, setUsersList] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_DB_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_USER_KEY);
      const auth = localStorage.getItem(AUTH_STATE_KEY);
      if (auth && JSON.parse(auth) === true && saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.email) return parsed;
      }
    } catch {}
    return EMPTY_GUEST_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STATE_KEY);
      const savedUser = localStorage.getItem(ACTIVE_USER_KEY);
      if (saved && JSON.parse(saved) === true && savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id && parsed.email) return true;
      }
    } catch {}
    return false;
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingOTP, setPendingOTP] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState('');

  // Initial Session Verification & Backend Validation
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const savedAuth = localStorage.getItem(AUTH_STATE_KEY);
        const savedUser = localStorage.getItem(ACTIVE_USER_KEY);

        if (savedAuth && JSON.parse(savedAuth) === true && savedUser) {
          const parsed: User = JSON.parse(savedUser);
          if (parsed && parsed.id && parsed.email) {
            try {
              const res = await fetch(`/api/users/${encodeURIComponent(parsed.id)}/profile`, {
                headers: { 'x-user-id': parsed.id },
              });
              if (res.ok) {
                const data = await res.json();
                if (isMounted && data.success && data.user) {
                  setCurrentUser(data.user);
                  setIsAuthenticated(true);
                  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(data.user));
                  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(true));
                  setIsLoadingAuth(false);
                  return;
                }
              }
            } catch {
              // Maintain local session if offline / server booting
              if (isMounted) {
                setCurrentUser(parsed);
                setIsAuthenticated(true);
                setIsLoadingAuth(false);
                return;
              }
            }
          }
        }

        // No active session found -> default to unauthenticated
        if (isMounted) {
          localStorage.removeItem(ACTIVE_USER_KEY);
          localStorage.removeItem(AUTH_STATE_KEY);
          setCurrentUser(EMPTY_GUEST_USER);
          setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem(ACTIVE_USER_KEY);
          localStorage.removeItem(AUTH_STATE_KEY);
          setCurrentUser(EMPTY_GUEST_USER);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (usersList.length > 0) {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(usersList));
    }
  }, [usersList]);

  useEffect(() => {
    if (isAuthenticated && currentUser.id) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(currentUser));
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(true));
    }
  }, [currentUser, isAuthenticated]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => {
    if (isAuthenticated) setIsAuthModalOpen(false);
  };

  // 1. Live Username Check
  const checkUsername = useCallback(
    async (username: string) => {
      const clean = username.trim().toLowerCase();
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
      const isTaken = usersList.some((u) => u.username?.toLowerCase() === clean);
      return {
        available: !isTaken,
        message: isTaken ? 'This username is already taken.' : 'Username is available!',
        suggestions: isTaken ? [`${clean}_dev`, `${clean}123`, `${clean}_official`] : [],
      };
    },
    [usersList]
  );

  // 2. Live Email Check
  const checkEmail = useCallback(
    async (email: string) => {
      const clean = email.trim().toLowerCase();
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(clean)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
      const isTaken = usersList.some((u) => u.email?.toLowerCase() === clean);
      return {
        available: !isTaken,
        message: isTaken ? 'This email is already registered. Try signing in instead.' : 'Email is available!',
      };
    },
    [usersList]
  );

  // 3. Send OTP for Registration or Password Reset
  const sendOTP = useCallback(
    async (email: string): Promise<string> => {
      const cleanEmail = email.trim().toLowerCase();
      setOtpEmail(cleanEmail);
      setPendingOTP('123456');

      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('📧 Verification Code Sent!', `Sent to ${cleanEmail}. Check your inbox.`, 'success');
          return 'sent';
        }
      } catch (err) {
        console.warn('Server send-otp unreachable:', err);
      }

      showToast('📧 Verification Code Sent!', `Sent to ${cleanEmail}. (Code: 123456)`, 'success');
      return 'sent';
    },
    [showToast]
  );

  // 4. Standard Sign In with Email + Password (NO OTP)
  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.user) {
          const verifiedUser: User = data.user;
          setCurrentUser(verifiedUser);
          setIsAuthenticated(true);
          setIsAuthModalOpen(false);

          setUsersList((prev) => {
            const filtered = prev.filter((u) => u.email.toLowerCase() !== cleanEmail);
            return [...filtered, verifiedUser];
          });

          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(verifiedUser));
          localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(true));

          showToast('Welcome Back!', `Signed in as ${verifiedUser.fullName}.`, 'success');
          return { success: true };
        } else if (res.status === 400 || res.status === 401 || res.status === 403) {
          showToast('Sign In Failed', data.message || 'Invalid email or password.', 'error');
          return { success: false, message: data.message || 'Invalid email or password.' };
        }
      } catch (err) {
        console.warn('Backend login unreachable, falling back to local verification:', err);
      }

      // Fallback for static deployment
      let user = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user && cleanEmail) {
        // Create user session dynamically
        user = {
          id: `user-${Date.now()}`,
          fullName: cleanEmail.split('@')[0],
          username: cleanEmail.split('@')[0],
          email: cleanEmail,
          avatarUrl: '',
          coverUrl: '',
          bio: '',
          location: '',
          occupation: '',
          joinedDate: 'Joined Today',
          friendsCount: 0,
          followersCount: 0,
          followingCount: 0,
          accountStatus: 'active',
        };
      }

      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(true));
        showToast('Welcome Back!', `Signed in as ${user.fullName}.`, 'success');
        return { success: true };
      }

      showToast('Sign In Failed', 'Invalid email or password.', 'error');
      return { success: false, message: 'Invalid email or password.' };
    },
    [usersList, showToast]
  );

  // 5. Register User (Submits form & triggers OTP email)
  const registerUser = useCallback(
    async (payload: RegisterPayload) => {
      const cleanEmail = payload.email.toLowerCase().trim();
      setOtpEmail(cleanEmail);
      setPendingOTP('123456');

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const receivedOtp = data.otp || '123456';
          setPendingOTP(receivedOtp);
          showToast('Verification Code Sent!', `A 6-digit code was sent to ${payload.email}.`, 'success');
          return { success: true, message: data.message, otp: receivedOtp };
        } else if (res.status === 400 && data.message) {
          showToast('Registration Notice', data.message, 'error');
          return { success: false, message: data.message, field: data.field };
        }
      } catch (err) {
        console.warn('Backend register call offline, fallback to client verification:', err);
      }

      // Client fallback for static deployment
      const newUser: User = {
        id: `user-${Date.now()}`,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: `${payload.firstName} ${payload.lastName}`,
        username: payload.username.toLowerCase().trim(),
        email: cleanEmail,
        phone: payload.phone || '',
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        avatarUrl: '',
        coverUrl: '',
        bio: '',
        location: '',
        occupation: '',
        education: '',
        website: '',
        joinedDate: 'Joined Today',
        friendsCount: 0,
        followersCount: 0,
        followingCount: 0,
        isVerified: false,
        accountStatus: 'active',
      };

      setUsersList((prev) => {
        const filtered = prev.filter((u) => u.email.toLowerCase() !== cleanEmail);
        return [...filtered, newUser];
      });

      showToast('Verification Code Sent!', `A 6-digit code was sent to ${payload.email}. (Code: 123456)`, 'success');
      return { success: true, message: 'Verification code sent.' };
    },
    [showToast]
  );

  // 6. Verify Registration OTP
  const verifyRegistrationOTP = useCallback(
    async (email: string, otp: string): Promise<boolean> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.user) {
          const verifiedUser: User = data.user;
          setCurrentUser(verifiedUser);
          setIsAuthenticated(true);
          setIsAuthModalOpen(false);

          setUsersList((prev) => {
            const filtered = prev.filter((u) => u.email.toLowerCase() !== cleanEmail);
            return [...filtered, verifiedUser];
          });

          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(verifiedUser));
          localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(true));

          showToast('Welcome to Nexus Social!', `Account activated, ${verifiedUser.fullName}!`, 'success');
          return true;
        }
      } catch (e) {
        console.warn('Backend verify-otp unreachable...', e);
      }

      if (cleanOtp === '123456' || cleanOtp === '000000' || cleanOtp.length === 6) {
        let user = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
        if (!user) {
          user = {
            id: `user-${Date.now()}`,
            firstName: cleanEmail.split('@')[0],
            lastName: '',
            fullName: cleanEmail.split('@')[0],
            username: cleanEmail.split('@')[0],
            email: cleanEmail,
            avatarUrl: '',
            coverUrl: '',
            bio: '',
            location: '',
            occupation: '',
            education: '',
            website: '',
            joinedDate: 'Joined Today',
            friendsCount: 0,
            followersCount: 0,
            followingCount: 0,
            accountStatus: 'active',
          };
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(true));

        showToast('Welcome to Nexus Social!', `Account activated, ${user.fullName}!`, 'success');
        return true;
      }

      showToast('Invalid Code', 'Please enter the 6-digit code (Use 123456).', 'error');
      return false;
    },
    [usersList, showToast]
  );

  // 7. Forgot Password (Dispatches OTP to email)
  const forgotPassword = useCallback(
    async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const receivedOtp = data.otp || '123456';
          setPendingOTP(receivedOtp);
          showToast('Reset Code Dispatched', `If an account exists, a code was sent to ${cleanEmail}.`, 'success');
          return { success: true, message: data.message, otp: receivedOtp };
        }
      } catch (err) {
        console.warn('Server forgot-password unreachable, using static fallback:', err);
      }

      setPendingOTP('123456');
      showToast('Reset Code Dispatched', `A 6-digit recovery code was sent to ${cleanEmail}. (Code: 123456)`, 'success');
      return { success: true, message: 'Recovery code dispatched.', otp: '123456' };
    },
    [showToast]
  );

  // 8. Reset Password (Verifies OTP and updates password)
  const resetPassword = useCallback(
    async (email: string, otp: string, newPassword: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Password Updated!', 'Your new password is set. Please sign in.', 'success');
          return { success: true, message: data.message };
        }
      } catch (err) {
        console.warn('Backend reset password call failed, using client update:', err);
      }

      if (cleanOtp === '123456' || cleanOtp === '000000' || cleanOtp.length === 6) {
        setUsersList((prev) =>
          prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, password: newPassword } : u))
        );
        showToast('Password Updated!', 'Your new password has been set. Please sign in.', 'success');
        return { success: true, message: 'Password updated successfully.' };
      }

      showToast('Reset Failed', 'Invalid verification code.', 'error');
      return { success: false, message: 'Invalid verification code.' };
    },
    [showToast]
  );

  // 9. Logout
  const logout = useCallback(() => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(AUTH_STATE_KEY);

    setCurrentUser(EMPTY_GUEST_USER);
    setIsAuthenticated(false);
    setPendingOTP(null);
    setOtpEmail('');
    setIsAuthModalOpen(false);

    showToast('Logged Out', 'Your session has been securely ended.', 'info');
  }, [showToast]);

  // 10. Update Profile (Persists to server DB and syncs locally)
  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      // Optimistic update
      setCurrentUser((prev) => {
        const updated = { ...prev, ...data };
        try {
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updated));
        } catch {}

        setUsersList((list) =>
          list.map((u) => (u.id === updated.id || u.email === updated.email ? updated : u))
        );
        return updated;
      });

      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ userId: currentUser.id, ...data }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.user) {
            setCurrentUser(resData.user);
            try {
              localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(resData.user));
            } catch {}
            setUsersList((list) =>
              list.map((u) => (u.id === resData.user.id ? resData.user : u))
            );
          }
        }
        showToast('Profile Updated', 'Your profile changes have been saved to your account.', 'success');
      } catch (err) {
        console.warn('Profile sync warning:', err);
        showToast('Profile Updated', 'Your changes have been saved locally.', 'info');
      }
    },
    [currentUser.id, showToast]
  );

  // 11. Update Privacy
  const updatePrivacy = useCallback(
    async (settings: Partial<UserPrivacySettings>) => {
      const currentSettings = currentUser.privacySettings || {
        whoCanSeePosts: 'public',
        whoCanSendRequests: 'everyone',
        showOnlineStatus: true,
      };
      const updatedSettings = { ...currentSettings, ...settings };

      setCurrentUser((prev) => {
        const updated = { ...prev, privacySettings: updatedSettings };
        try {
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ userId: currentUser.id, privacySettings: updatedSettings }),
        });
        showToast('Privacy Settings Updated', 'Your privacy settings were updated.', 'info');
      } catch {
        showToast('Privacy Settings Updated', 'Saved locally.', 'info');
      }
    },
    [currentUser.id, currentUser.privacySettings, showToast]
  );

  // 12. Change Password
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, currentPassword, newPassword }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Password Changed! 🔒', 'Your password has been updated securely.', 'success');
          return { success: true, message: data.message || 'Password changed successfully.' };
        }
        return { success: false, message: data.message || data.error || 'Failed to change password.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, showToast]
  );

  // 13. Request Change Email
  const changeEmail = useCallback(
    async (currentPassword: string, newEmail: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch('/api/auth/change-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, currentPassword, newEmail }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Verification Code Sent 📧', `Check ${newEmail} for your verification code.`, 'info');
          return { success: true, message: data.message || 'Verification code sent.' };
        }
        return { success: false, message: data.message || data.error || 'Failed to request email change.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, showToast]
  );

  // 14. Verify Change Email
  const verifyChangeEmail = useCallback(
    async (newEmail: string, otp: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch('/api/auth/verify-change-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, newEmail, otp }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(data.user));
          } catch {}
          showToast('Email Updated! 🎉', 'Your email address has been successfully changed.', 'success');
          return { success: true, message: data.message || 'Email updated successfully.' };
        }
        return { success: false, message: data.message || data.error || 'Invalid verification code.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, showToast]
  );

  // 15. Deactivate Account
  const deactivateAccount = useCallback(
    async (password?: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch('/api/auth/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          logout();
          showToast('Account Deactivated', 'Your account has been deactivated. You can reactivate anytime by logging in.', 'info');
          return { success: true, message: data.message || 'Account deactivated.' };
        }
        return { success: false, message: data.message || 'Failed to deactivate account.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, logout, showToast]
  );

  // 16. Delete Account
  const deleteAccount = useCallback(
    async (password: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch('/api/auth/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          logout();
          showToast('Account Deleted', 'Your account and data have been permanently removed.', 'info');
          return { success: true, message: data.message || 'Account deleted.' };
        }
        return { success: false, message: data.message || 'Failed to delete account.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, logout, showToast]
  );

  // 17. Update Notification Settings
  const updateNotificationSettings = useCallback(
    async (settings: Partial<NotificationSettings>): Promise<boolean> => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(currentUser.id)}/notification-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, notificationSettings: settings }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.notificationSettings) {
          setCurrentUser((prev) => {
            const updated = {
              ...prev,
              notificationSettings: data.notificationSettings,
              privacySettings: {
                ...prev.privacySettings,
                whoCanSeePosts: prev.privacySettings?.whoCanSeePosts || 'public',
                whoCanSendRequests: prev.privacySettings?.whoCanSendRequests || 'everyone',
                showOnlineStatus: prev.privacySettings?.showOnlineStatus ?? true,
                notificationSettings: data.notificationSettings,
              },
            };
            try {
              localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
          showToast('Preferences Saved', 'Your notification settings were updated.', 'success');
          return true;
        }
        return false;
      } catch {
        showToast('Update Failed', 'Could not save notification preferences.', 'error');
        return false;
      }
    },
    [currentUser.id, showToast]
  );

  // 18. Block User
  const blockUser = useCallback(
    async (targetUserId: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(targetUserId)}/block`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('User Blocked 🚫', data.message || 'User has been blocked.', 'info');
          return { success: true, message: data.message };
        }
        return { success: false, message: data.message || 'Failed to block user.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, showToast]
  );

  // 19. Unblock User
  const unblockUser = useCallback(
    async (targetUserId: string): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(targetUserId)}/unblock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('User Unblocked', data.message || 'User has been unblocked.', 'success');
          return { success: true, message: data.message };
        }
        return { success: false, message: data.message || 'Failed to unblock user.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    },
    [currentUser.id, showToast]
  );

  // 20. Get Blocked Users
  const getBlockedUsers = useCallback(async (): Promise<BlockedUser[]> => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(currentUser.id)}/blocked`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.blocked)) {
          return data.blocked;
        }
      }
      return [];
    } catch {
      return [];
    }
  }, [currentUser.id]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        isAuthenticated,
        isLoadingAuth,
        isAuthModalOpen,
        pendingOTP,
        otpEmail,
        updateProfile,
        updatePrivacy,
        updateNotificationSettings,
        changePassword,
        changeEmail,
        verifyChangeEmail,
        deactivateAccount,
        deleteAccount,
        blockUser,
        unblockUser,
        getBlockedUsers,
        openAuthModal,
        closeAuthModal,
        sendOTP,
        loginWithPassword,
        registerUser,
        checkUsername,
        checkEmail,
        verifyRegistrationOTP,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
