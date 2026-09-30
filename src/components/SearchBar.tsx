import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onClose: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-amber-50/70 dark:bg-stone-900/90 px-4 sm:px-6 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find in text pad (Enter = next, Shift+Enter = prev)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Match counter */}
          <div className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap min-w-[70px]">
            {searchQuery ? (
              matchCount > 0 ? (
                <span>
                  <strong>{currentMatchIndex + 1}</strong> of <strong>{matchCount}</strong>
                </span>
              ) : (
                <span className="text-rose-500 dark:text-rose-400">0 matches</span>
              )
            ) : (
              <span>Type to search</span>
            )}
          </div>
        </div>

        {/* Previous / Next / Close controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevMatch}
            disabled={matchCount === 0}
            className="p-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onNextMatch}
            disabled={matchCount === 0}
            className="p-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition"
            title="Next match (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
            title="Close find (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
