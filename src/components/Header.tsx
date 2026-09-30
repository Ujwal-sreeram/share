import React from 'react';
import {
  Cloud,
  Sun,
  Moon,
  Settings,
  Wifi,
  WifiOff,
  FolderOpen,
  Menu
} from 'lucide-react';

interface HeaderProps {
  currentPad: string;
  isOnline: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenPadSwitcher: () => void;
  isFirebaseActive: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPad,
  isOnline,
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenPadSwitcher,
  isFirebaseActive,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              title="Open files sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-white">
                Cloud Text Pad
              </h1>
              {/* Pad selector pill */}
              <button
                onClick={onOpenPadSwitcher}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                title="Switch or create text pad"
              >
                <FolderOpen className="w-3 h-3 text-stone-500" />
                <span>Pad: <strong className="font-semibold text-amber-600 dark:text-amber-400">{currentPad === 'main' ? 'default' : currentPad}</strong></span>
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
              Real-time shared online notepad
            </p>
          </div>
        </div>

        {/* Status and Action Controls */}
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
            }`}
            title={
              isOnline
                ? isFirebaseActive
                  ? 'Connected to Firestore'
                  : 'Online (Demo/Local mode)'
                : 'Offline. Edits are safely stored in local backup.'
            }
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Dark Mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 transition"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>

          {/* Settings / Info */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 transition relative"
            title="Firebase Setup & Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
            {!isFirebaseActive && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" title="Setup Firebase credentials" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
