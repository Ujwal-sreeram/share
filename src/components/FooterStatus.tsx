import React from 'react';
import {
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { formatTimestamp } from '../services/firestoreService';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface FooterStatusProps {
  status: SaveStatus;
  lastUpdated: Date | null;
  text: string;
  isOnline: boolean;
  errorMessage?: string | null;
  onRetrySave?: () => void;
}

export const FooterStatus: React.FC<FooterStatusProps> = ({
  status,
  lastUpdated,
  text,
  isOnline,
  errorMessage,
  onRetrySave,
}) => {
  // Calculate character and word counts
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 px-4 sm:px-6 py-2.5 text-xs text-stone-600 dark:text-stone-400 transition-colors select-none">
      {/* Offline warning banner if disconnected */}
      {!isOnline && (
        <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>You are offline. Your text is backed up locally and will sync when connection returns.</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Save State & Timestamp */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 font-medium">
            {status === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400">Saved</span>
              </>
            )}
            {status === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span className="text-amber-700 dark:text-amber-400">Saving...</span>
              </>
            )}
            {status === 'unsaved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
              </>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">Error saving</span>
                {onRetrySave && (
                  <button
                    onClick={onRetrySave}
                    className="ml-1 underline text-rose-700 dark:text-rose-300 hover:text-rose-900"
                  >
                    Retry
                  </button>
                )}
                {errorMessage && (
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 max-w-[200px] truncate" title={errorMessage}>
                    ({errorMessage})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Last updated timestamp */}
          <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400 border-l border-stone-200 dark:border-stone-700 pl-3">
            <Clock className="w-3 h-3 text-stone-400" />
            <span>
              Last updated: <strong>{formatTimestamp(lastUpdated)}</strong>
            </span>
          </div>
        </div>

        {/* Right Side: Word & Character Count */}
        <div className="flex items-center gap-3 font-mono text-stone-500 dark:text-stone-400">
          <span>Words: <strong className="text-stone-700 dark:text-stone-300">{wordCount.toLocaleString()}</strong></span>
          <span>•</span>
          <span>Characters: <strong className="text-stone-700 dark:text-stone-300">{charCount.toLocaleString()}</strong></span>
        </div>
      </div>
    </footer>
  );
};
