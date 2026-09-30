import React, { useState, useEffect, useRef } from 'react';
import {
  Edit3,
  Star,
  CheckCircle2,
  Loader2,
  Clock,
  Download,
  Menu,
  Check,
  X,
  Share2
} from 'lucide-react';
import { TextFile, formatTimestamp } from '../services/firestoreService';
import { SaveStatus } from './FooterStatus';

interface CurrentFileHeaderProps {
  file: TextFile | null;
  onRename: (newName: string) => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
  onToggleMobileSidebar: () => void;
  saveStatus: SaveStatus;
  lastUpdated: Date | null;
  isSidebarCollapsed: boolean;
  onToggleCollapseDesktop: () => void;
}

export const CurrentFileHeader: React.FC<CurrentFileHeaderProps> = ({
  file,
  onRename,
  onToggleFavorite,
  onDownload,
  onToggleMobileSidebar,
  saveStatus,
  lastUpdated,
  isSidebarCollapsed,
  onToggleCollapseDesktop,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      setTempName(file.name);
    }
  }, [file?.name]);

  const handleStartEditing = () => {
    if (!file) return;
    setTempName(file.name);
    setIsEditingName(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed && file && trimmed !== file.name) {
      onRename(trimmed);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      if (file) setTempName(file.name);
    }
  };

  if (!file) {
    return (
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 mr-2"
          title="Open files sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs text-stone-400">No file selected</span>
      </div>
    );
  }

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 transition-colors">
      {/* Left: Mobile Hamburger & File Name Editing */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Mobile sidebar toggle button */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 mr-1"
          title="Toggle files sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop sidebar collapse toggle */}
        <button
          onClick={onToggleCollapseDesktop}
          className="hidden md:inline-flex p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 mr-1"
          title={isSidebarCollapsed ? "Expand files sidebar" : "Collapse files sidebar"}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Star icon */}
        <button
          onClick={onToggleFavorite}
          className={`p-1 rounded-md transition ${
            file.favorite
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
          title={file.favorite ? 'Unstar file' : 'Star file'}
        >
          <Star className={`w-4 h-4 ${file.favorite ? 'fill-amber-400' : ''}`} />
        </button>

        {/* File Name Header (double-click to edit) */}
        {isEditingName ? (
          <div className="flex items-center gap-1.5 flex-1 max-w-sm">
            <input
              ref={inputRef}
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveName}
              className="px-2 py-1 text-sm sm:text-base font-bold rounded-lg border border-amber-500 bg-amber-50/50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none w-full"
            />
            <button
              onClick={handleSaveName}
              className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
              title="Save name"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditingName(false)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <h2
              onDoubleClick={handleStartEditing}
              className="text-sm sm:text-base font-bold text-stone-900 dark:text-white truncate cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition"
              title="Double-click to rename"
            >
              {file.name}
            </h2>
            <button
              onClick={handleStartEditing}
              className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 opacity-60 hover:opacity-100 transition"
              title="Rename file"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Save Status, Timestamp & Download */}
      <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 font-medium">
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-400 hidden sm:inline">Saved</span>
            </>
          )}
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="text-amber-700 dark:text-amber-400 hidden sm:inline">Saving...</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">Unsaved changes</span>
            </>
          )}
        </div>

        {/* Last updated timestamp */}
        {lastUpdated && (
          <div className="hidden lg:flex items-center gap-1 border-l border-stone-200 dark:border-stone-800 pl-3">
            <Clock className="w-3 h-3 text-stone-400" />
            <span>Updated {formatTimestamp(lastUpdated)}</span>
          </div>
        )}

        {/* Download file button */}
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title={`Download ${file.name}.txt`}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">.txt</span>
        </button>
      </div>
    </div>
  );
};
