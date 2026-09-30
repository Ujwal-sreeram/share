import React, { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  selectedRange?: { start: number; end: number } | null;
  placeholder?: string;
  disabled?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  isLoading,
  selectedRange,
  placeholder = "Type or paste your notes, links, or code here... Changes are stored automatically and synced across all your devices.",
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Jump to match in textarea when selectedRange changes
  useEffect(() => {
    if (selectedRange && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(selectedRange.start, selectedRange.end);

      // Scroll cursor into view
      const textBefore = value.substring(0, selectedRange.start);
      const lines = textBefore.split('\n').length;
      const lineHeight = 24; // approximate px per line
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

      // Restore cursor position
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  return (
    <div className="relative flex-1 flex flex-col w-full h-full bg-white dark:bg-stone-950 transition-colors">
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-stone-950/80 backdrop-blur-xs z-10 text-stone-500 dark:text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-medium">Loading text from Cloud Text Pad...</p>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full flex-1 p-4 sm:p-6 text-sm sm:text-base leading-relaxed resize-none focus:outline-none bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 border-none font-mono selection:bg-amber-200 dark:selection:bg-amber-900/60"
        aria-label="Text Pad Editor"
      />
    </div>
  );
};
