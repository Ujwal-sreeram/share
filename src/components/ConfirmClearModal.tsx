import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-white">
              Clear All Text
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <p className="text-sm text-stone-600 dark:text-stone-300 mb-6">
          Are you sure you want to clear all text? This will erase the current pad content and update Firebase.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
