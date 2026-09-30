import React, { useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  RotateCcw,
  ExternalLink,
  Code2
} from 'lucide-react';
import {
  getActiveFirebaseConfig,
  isFirebaseConfigured,
  reinitializeFirebase,
  resetFirebaseConfig,
  FirebaseCustomConfig
} from '../firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirebaseActive: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isFirebaseActive,
}) => {
  const currentConfig = getActiveFirebaseConfig();
  const [config, setConfig] = useState<FirebaseCustomConfig>({ ...currentConfig });
  const [showConfigForm, setShowConfigForm] = useState(false);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    reinitializeFirebase(config);
  };

  const handleReset = () => {
    if (confirm('Reset to default file configuration in src/firebase.ts?')) {
      resetFirebaseConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-lg my-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-white">
                Cloud Text Pad Settings
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Configuration & Privacy Notice
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

        <div className="py-4 space-y-5">
          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-stone-700 dark:text-stone-300 space-y-1">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  Shared Notepad Notice
                </p>
                <p>
                  "Anyone who has access to this website and Firebase database permissions may be able to read or modify the shared text."
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  For privacy, avoid saving sensitive passwords or banking details. You can use custom URL pads (e.g. <code>?pad=random123</code>) to keep text organized.
                </p>
              </div>
            </div>
          </div>

          {/* Firebase Connection Status */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Firebase Connection Status
                </span>
              </div>
              {isFirebaseActive ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Placeholder / Demo
                </span>
              )}
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
              {isFirebaseActive
                ? `Connected to Firestore project "${config.projectId}". Multi-device sync is operational.`
                : `Currently running in local backup mode with placeholder config. To enable cross-device cloud sync, replace the credentials in src/firebase.ts or paste them below.`}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showConfigForm ? 'Hide Firebase Credentials' : 'View / Edit Credentials in UI'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to File Config</span>
              </button>
            </div>
          </div>

          {/* Form to paste Firebase credentials directly into UI if desired */}
          {showConfigForm && (
            <form onSubmit={handleSaveConfig} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5 bg-stone-50/50 dark:bg-stone-950/40">
              <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Paste Firebase Web App Credentials
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Obtain these from Firebase Console &gt; Project Settings &gt; General &gt; Your Apps (Web App).
              </p>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-0.5">apiKey</label>
                <input
                  type="text"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-0.5">projectId</label>
                  <input
                    type="text"
                    value={config.projectId}
                    onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                    placeholder="my-project-id"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-0.5">authDomain</label>
                  <input
                    type="text"
                    value={config.authDomain}
                    onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                    placeholder="my-project-id.firebaseapp.com"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-0.5">storageBucket</label>
                  <input
                    type="text"
                    value={config.storageBucket}
                    onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                    placeholder="my-project-id.firebasestorage.app"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-0.5">messagingSenderId</label>
                  <input
                    type="text"
                    value={config.messagingSenderId}
                    onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                    placeholder="123456789012"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-0.5">appId</label>
                <input
                  type="text"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  placeholder="1:123456789012:web:abcdef..."
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Connect Firebase</span>
                </button>
              </div>
            </form>
          )}

          {/* Firebase Hosting Quick Deploy */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                  Deploy to Firebase Hosting (share-7cffb.web.app)
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                1st Release
              </span>
            </div>
            <p className="text-xs text-blue-900/80 dark:text-blue-300/80">
              To publish your website to your custom Firebase domain (<code>share-7cffb.web.app</code>), run this single command in your terminal:
            </p>
            <div className="p-2.5 rounded-lg bg-stone-900 text-stone-100 font-mono text-[11px] select-all overflow-x-auto">
              npx firebase-tools deploy --only hosting --project share-7cffb
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Or use Google Cloud Shell (browser terminal) with your Google account.
            </p>
          </div>

          {/* Quick Setup Guide */}
          <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
            <h4 className="font-semibold text-stone-900 dark:text-stone-200">
              Where to paste credentials permanently:
            </h4>
            <p>
              Open <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-[11px]">src/firebase.ts</code> and update the <code className="font-mono text-[11px]">defaultFirebaseConfig</code> object. See <code className="font-mono text-[11px]">README.md</code> for the full step-by-step tutorial.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 text-white dark:bg-stone-700 hover:bg-stone-800 dark:hover:bg-stone-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
