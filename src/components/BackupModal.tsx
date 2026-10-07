import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  X,
  FileJson,
  CheckCircle2,
  Database
} from 'lucide-react';
import {
  TextFile,
  generateBackupData,
  restoreFromBackup,
  PadBackupJSON
} from '../services/firestoreService';

interface BackupModalProps {
  isOpen: boolean;
  padId: string;
  files: TextFile[];
  onClose: () => void;
  onRestoreComplete: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  padId,
  files,
  onClose,
  onRestoreComplete,
}) => {
  const [importedBackup, setImportedBackup] = useState<PadBackupJSON | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const backupData = generateBackupData(padId, files);
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloud-text-pad-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.files)) {
          setImportedBackup(parsed);
          setRestoreMode(null);
          setConfirmReplace(false);
        } else {
          alert('Invalid backup file. Missing "files" list.');
        }
      } catch (err) {
        alert('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async (mode: 'merge' | 'replace') => {
    if (!importedBackup) return;
    setIsProcessing(true);
    try {
      await restoreFromBackup(padId, importedBackup, mode, files);
      setIsProcessing(false);
      onRestoreComplete();
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      alert('Failed to restore backup: ' + (err?.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-white">
                Backup & Restore
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                JSON export and import for all your files
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

        {/* Section 1: Export Backup */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 mb-4">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Export Backup</span>
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
            Download all {files.length} text files and metadata as a standard <code className="bg-stone-200 dark:bg-stone-700 px-1 py-0.5 rounded text-[11px]">.json</code> file.
          </p>
          <button
            onClick={handleExportJSON}
            disabled={files.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white dark:bg-stone-700 dark:hover:bg-stone-600 hover:bg-stone-800 disabled:opacity-40 transition"
          >
            <FileJson className="w-4 h-4" />
            <span>Download cloud-text-pad-backup.json</span>
          </button>
        </div>

        {/* Section 2: Import Backup */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            <span>Import Backup</span>
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
            Restore notes from a previously exported <code className="bg-stone-200 dark:bg-stone-700 px-1 py-0.5 rounded text-[11px]">.json</code> file.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!importedBackup ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition"
            >
              <Upload className="w-4 h-4 text-stone-500" />
              <span>Choose Backup File...</span>
            </button>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold">
                  Loaded {importedBackup.files.length} files from backup
                </p>
                <p className="text-[11px] opacity-80">
                  Exported at: {new Date(importedBackup.exportedAt).toLocaleString()}
                </p>
              </div>

              {!confirmReplace ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    How would you like to restore?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecuteRestore('merge')}
                      disabled={isProcessing}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50"
                    >
                      Merge (Keep Existing)
                    </button>
                    <button
                      onClick={() => setConfirmReplace(true)}
                      disabled={isProcessing}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition"
                    >
                      Replace Existing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Confirm Replace</span>
                  </div>
                  <p className="text-rose-600 dark:text-rose-400">
                    This will delete all current {files.length} files in this pad and replace them with the backup!
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setConfirmReplace(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleExecuteRestore('replace')}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500"
                    >
                      Yes, Replace All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
