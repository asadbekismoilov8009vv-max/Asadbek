
import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AuthScreen from './components/Auth/AuthScreen';

export type LanguageProfile = {
  id: string;
  native: string;
  target: string;
  proficiency: string;
  currentLevel: number;
};

export type UserData = {
  profile: {
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
    password?: string;
    avatar?: string;
  };
  activeProfileId: string;
  profiles: LanguageProfile[];
  energy: number;
  hearts: number;
  isPremium: boolean;
  isFamilyPremium?: boolean;
  twoFactorEnabled: boolean;
  familyMembers?: string[];
  subscriptionPlan?: string;
  unlockedRoadmaps: number;
  uiTranslations: Record<string, string>; 
};

const PROFICIENCY_START_LEVELS: Record<string, number> = {
  'BEGINNER': 1,
  'INTERMEDIATE': 1,
  'ADVANCED': 1,
  'FLUENT': 1,
};

export const DEFAULT_UI_STRINGS = {
  leaderboard: 'Rankings',
  roadmap: 'Neural Path',
  profile: 'Profile',
  shop: 'Shop',
  dictionary: 'Dictionary',
  logout: 'Disconnect',
  back: 'Back',
  hearts: 'Hearts',
  energy: 'Energy',
  level: 'Nodes',
  xp: 'XP Pulse',
  continue: 'Continue',
  later: 'Later',
  verify: 'Verify Pulse',
  confirm: 'Confirm',
  cancel: 'Cancel',
  buy: 'Buy',
  define: 'Define',
  search: 'Search word...',
  capture_btn: 'Capture',
  replay_audio: 'Replay Audio',
  change_photo: 'Update Neural Avatar',
  authorizing: 'Authorizing...',
  syncing: 'Syncing...',
  syncing_neural: 'Searching Neural Paths...',
  congratulations: 'Congratulations!',
  excellent: 'Excellent Work!',
  incorrect_title: 'Incorrect Answer',
  reason_label: 'Reason',
  gameover: 'Neural Exhaustion! Game Over.',
  empty_dict: 'Your neural dictionary is empty.',
  listening_status: 'Listening...',
  leave_task_title: 'Are you sure?',
  leave_task_body: "if you leave you just be wasted your one energy",
  yes_btn: 'YES',
  no_btn: 'NO',
  checkout_title: 'Neural Payment',
  card_number: 'Card Number',
  expiry: 'MM/YY',
  cvv: 'CVV',
  pay_now: 'Authorize Transaction',
  payment_success: 'Transaction Verified! Your neural assets have been credited.',
  identity_registration: 'Identity Registration',
  first_name: 'First Name',
  last_name: 'Last Name',
  nickname: 'Nickname',
  email: 'Gmail Address',
  password: 'Password',
  neural_sync: 'Neural Sync',
  native_tongue: 'Native Tongue',
  learning_goal: 'Learning Goal',
  rank: 'Rank',
  get_started: 'Get Started',
  already_have_account: 'I already have an account',
  missing_credentials: 'Missing credentials',
  invalid_credentials: 'Invalid credentials. Use @gmail.com',
  abort: 'Abort',
  unlock_sector: 'Expand Roadmap',
  cost_label: 'Cost',
  insufficient_energy: 'Not enough energy! You need 250.',
  sector_synced: 'Sector Synced!',
  examples_label: 'Examples',
  assemble: 'Assemble Message',
  disconnect_btn: 'Disconnect Session',
  family_premium: 'Family Sync (Premium)'
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<'splash' | 'auth' | 'onboarding' | 'home'>(() => {
    const session = localStorage.getItem('quicklearner_session');
    if (session) return 'home';
    return 'splash';
  });
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('quicklearner_session');
    if (savedSession) {
      const savedAccounts = JSON.parse(localStorage.getItem('quicklearner_accounts') || '[]');
      const activeUser = savedAccounts.find((u: UserData) => u.profile.email === savedSession);
      if (activeUser) {
        setUserData(activeUser);
      } else {
        localStorage.removeItem('quicklearner_session');
        setAppState('splash');
      }
    }
  }, []);

  const handleSplashComplete = () => {
    if (userData && userData.profile.email) setAppState('home');
    else setAppState('auth');
  };

  const handleLoginComplete = (user: UserData) => {
    if (!user.profile.email) return;
    setUserData(user);
    localStorage.setItem('quicklearner_session', user.profile.email);
    setAppState('home');
  };

  const handleStartOnboarding = () => setAppState('onboarding');

  const handleCancelOnboarding = () => {
    if (userData && userData.profile.email) setAppState('home');
    else setAppState('auth');
  };

  const handleOnboardingComplete = (data: any) => {
    if (!data.profile.email) return;
    const initialProfile: LanguageProfile = {
      id: crypto.randomUUID(),
      native: data.languages.native,
      target: data.languages.target,
      proficiency: data.proficiency,
      currentLevel: PROFICIENCY_START_LEVELS[data.proficiency] || 1
    };
    const finalData: UserData = {
      profile: data.profile,
      activeProfileId: initialProfile.id,
      profiles: [initialProfile],
      energy: 50, 
      hearts: 10,
      isPremium: false,
      isFamilyPremium: false,
      twoFactorEnabled: data.twoFactorEnabled,
      familyMembers: [],
      unlockedRoadmaps: 1,
      uiTranslations: data.uiTranslations || DEFAULT_UI_STRINGS
    };
    const savedAccounts = JSON.parse(localStorage.getItem('quicklearner_accounts') || '[]');
    const filtered = savedAccounts.filter((a: UserData) => a.profile.email !== finalData.profile.email);
    filtered.push(finalData);
    localStorage.setItem('quicklearner_accounts', JSON.stringify(filtered));
    localStorage.setItem('quicklearner_session', finalData.profile.email);
    setUserData(finalData);
    setAppState('home');
  };

  const updateUserData = (updates: Partial<UserData>) => {
    if (userData) {
      const oldEmail = userData.profile.email;
      const updated = { ...userData, ...updates };
      const newEmail = updated.profile.email;
      setUserData(updated);
      const savedAccounts = JSON.parse(localStorage.getItem('quicklearner_accounts') || '[]');
      const index = savedAccounts.findIndex((a: UserData) => a.profile.email === oldEmail);
      if (index > -1) {
        savedAccounts[index] = updated;
        localStorage.setItem('quicklearner_accounts', JSON.stringify(savedAccounts));
        if (oldEmail !== newEmail) localStorage.setItem('quicklearner_session', newEmail);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('quicklearner_session');
    setUserData(null);
    setAppState('auth');
  };

  return (
    <div className={`w-full h-full min-h-[100dvh] bg-[#0F172A] text-white overflow-hidden`}>
      {appState === 'splash' && <SplashScreen onComplete={handleSplashComplete} />}
      {appState === 'auth' && <AuthScreen onLogin={handleLoginComplete} onStartSignUp={handleStartOnboarding} uiTranslations={userData?.uiTranslations || DEFAULT_UI_STRINGS} />}
      {appState === 'onboarding' && <OnboardingFlow onComplete={handleOnboardingComplete} onCancel={handleCancelOnboarding} showHomeButton={!!userData} />}
      {appState === 'home' && userData && (
        <HomeScreen 
          userData={userData} 
          onUpdateUser={updateUserData}
          theme='dark'
          onToggleTheme={() => {}}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
