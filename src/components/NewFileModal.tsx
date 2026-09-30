import React, { useState, useEffect, useRef } from 'react';
import { FilePlus, X } from 'lucide-react';
import { generateUniqueFileName } from '../services/firestoreService';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  existingNames: string[];
}

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingNames,
}) => {
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultName = generateUniqueFileName('Untitled', existingNames);
      setFileName(defaultName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, existingNames]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = generateUniqueFileName(fileName.trim() || 'Untitled', existingNames);
    onCreate(finalName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-white">
                Create New File
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Add a new note to this text pad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            File name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g. DBMS Notes, Java Code, Shopping List"
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-5"
          />

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
