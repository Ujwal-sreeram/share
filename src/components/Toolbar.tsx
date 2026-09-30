import React, { useState } from 'react';
import {
  Save,
  Copy,
  Check,
  Share2,
  RotateCw,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  Download
} from 'lucide-react';

interface ToolbarProps {
  onSave: () => void;
  onCopy: () => void;
  onShare: () => void;
  onRefresh: () => void;
  onDownload: () => void;
  onOpenClearDialog: () => void;
  autosave: boolean;
  onToggleAutosave: () => void;
  isSaving: boolean;
  isRefreshing: boolean;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  hasUnsavedChanges: boolean;
  disabled?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onCopy,
  onShare,
  onRefresh,
  onDownload,
  onOpenClearDialog,
  autosave,
  onToggleAutosave,
  isSaving,
  isRefreshing,
  isSearchOpen,
  onToggleSearch,
  hasUnsavedChanges,
  disabled = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopyClick = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareClick = () => {
    onShare();
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 px-4 sm:px-6 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={disabled || isSaving}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-500 text-white dark:bg-amber-500 dark:hover:bg-amber-400'
                : 'bg-stone-800 hover:bg-stone-700 text-white dark:bg-stone-700 dark:hover:bg-stone-600'
            } disabled:opacity-50`}
            title="Save changes to Firebase (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition disabled:opacity-50"
            title="Copy all text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={onDownload}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition disabled:opacity-50"
            title="Download as .txt"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Download</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShareClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition disabled:opacity-50"
            title="Share this note link"
          >
            {shared ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Share link copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Share</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={disabled || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition disabled:opacity-50"
            title="Reload latest text from Firestore"
          >
            <RotateCw className={`w-3.5 h-3.5 text-stone-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={onOpenClearDialog}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-stone-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-stone-200 dark:border-stone-700 hover:border-rose-300 dark:hover:border-rose-900 transition disabled:opacity-50"
            title="Clear all editor text"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Secondary Controls: Search & Autosave Toggle */}
        <div className="flex items-center gap-2">
          {/* Search Toggle Button */}
          <button
            onClick={onToggleSearch}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition ${
              isSearchOpen
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
            title="Search inside text"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Find</span>
          </button>

          {/* Autosave Switch */}
          <div className="flex items-center gap-2 pl-1 border-l border-stone-200 dark:border-stone-700">
            <button
              onClick={onToggleAutosave}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer select-none ${
                autosave
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
              }`}
              title="Toggle automatic saving ~1.5s after typing"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  autosave ? 'bg-emerald-500' : 'bg-stone-400'
                }`}
              />
              <span>Autosave: <strong>{autosave ? 'ON' : 'OFF'}</strong></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
