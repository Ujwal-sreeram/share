import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  ArrowRight,
  X,
  History,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { sanitizePadId } from '../services/firestoreService';

interface PadSwitcherModalProps {
  isOpen: boolean;
  currentPad: string;
  onSelectPad: (padId: string) => void;
  onClose: () => void;
  recentPads: string[];
}

export const PadSwitcherModal: React.FC<PadSwitcherModalProps> = ({
  isOpen,
  currentPad,
  onSelectPad,
  onClose,
  recentPads,
}) => {
  const [targetPad, setTargetPad] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPad.trim()) return;
    const sanitized = sanitizePadId(targetPad);
    onSelectPad(sanitized);
    setTargetPad('');
    onClose();
  };

  const handleGenerateRandom = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const generated = `pad-${randomSuffix}`;
    setTargetPad(generated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-white">
                Switch or Create Pad
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Current pad: <strong className="text-amber-600 dark:text-amber-400">{currentPad === 'main' ? 'default' : currentPad}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form to enter a pad ID */}
        <form onSubmit={handleSubmit} className="mb-5">
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Enter Pad Name / Identifier
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetPad}
              onChange={(e) => setTargetPad(e.target.value)}
              placeholder="e.g. college123, project456, notes"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              autoFocus
            />
            <button
              type="submit"
              disabled={!targetPad.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-400 disabled:opacity-40 transition"
            >
              <span>Go</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>Letters, numbers, hyphens only</span>
            <button
              type="button"
              onClick={handleGenerateRandom}
              className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              <span>Random secret pad</span>
            </button>
          </div>
        </form>

        {/* Default Pad button */}
        <div className="mb-4">
          <button
            onClick={() => {
              onSelectPad('main');
              onClose();
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between transition ${
              currentPad === 'main'
                ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">Main / Default Pad</span>
              <span className="text-[11px] text-stone-400">(sharedText/main)</span>
            </div>
            {currentPad === 'main' && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Active</span>
            )}
          </button>
        </div>

        {/* Recent Pads List */}
        {recentPads.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
              <History className="w-3.5 h-3.5" />
              <span>Recently Visited Pads</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {recentPads.map((pad) => (
                <button
                  key={pad}
                  onClick={() => {
                    onSelectPad(pad);
                    onClose();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    pad === currentPad
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {pad === 'main' ? 'default' : pad}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
          Tip: Anyone with the exact URL <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">?pad=your-pad</code> can read and edit the same pad text in real time.
        </div>
      </div>
    </div>
  );
};
