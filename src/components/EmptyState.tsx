import React from 'react';
import { FileText, Plus, Upload } from 'lucide-react';

interface EmptyStateProps {
  onCreateFile: () => void;
  onImportTxt: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onCreateFile,
  onImportTxt,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-stone-950 transition-colors select-none">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
        Your text space is empty
      </h2>

      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mb-6">
        Create your first text file or import an existing .txt file to start writing notes, code, or shared ideas.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onCreateFile}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create File</span>
        </button>

        <button
          onClick={onImportTxt}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition"
        >
          <Upload className="w-4 h-4 text-stone-500" />
          <span>Import .txt</span>
        </button>
      </div>
    </div>
  );
};
