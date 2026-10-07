import React, { useRef, useEffect, useState } from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  selectedRange?: { start: number; end: number } | null;
  placeholder?: string;
  disabled?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  isLoading,
  loadError,
  onRetry,
  selectedRange,
  placeholder = "Type or paste your notes, links, or code here... Changes are stored automatically and synced across all your devices.",
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [timedOut, setTimedOut] = useState<boolean>(false);

  // Safety timeout: Never allow loading state to spin for more than 10 seconds
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Jump to match in textarea when selectedRange changes
  useEffect(() => {
    if (selectedRange && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(selectedRange.start, selectedRange.end);

      // Scroll cursor into view
      const textBefore = value.substring(0, selectedRange.start);
      const lines = textBefore.split('\n').length;
      const lineHeight = 24;
      const targetScroll = Math.max(0, (lines - 4) * lineHeight);
      textarea.scrollTop = targetScroll;
    }
  }, [selectedRange, value]);

  // Handle Tab key to insert 2 spaces instead of changing focus
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const hasError = Boolean(loadError) || timedOut;

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-white dark:bg-stone-950 transition-colors">
      {/* Error State with Retry Button */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-stone-950/95 backdrop-blur-xs z-20 text-stone-600 dark:text-stone-300 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-stone-900 dark:text-white mb-1">
            Unable to load your files.
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mb-4">
            {loadError || "The cloud server is taking longer than usual to respond. Check your connection or retry."}
          </p>
          {onRetry && (
            <button
              onClick={() => {
                setTimedOut(false);
                onRetry();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : isLoading ? (
        /* Loading Spinner */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-stone-950/80 backdrop-blur-xs z-10 text-stone-500 dark:text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-medium">Loading text...</p>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || hasError}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full flex-1 p-4 sm:p-6 text-sm sm:text-base leading-relaxed resize-none focus:outline-none bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 border-none font-mono selection:bg-amber-200 dark:selection:bg-amber-900/60"
        aria-label="Text Pad Editor"
      />
    </div>
  );
};
