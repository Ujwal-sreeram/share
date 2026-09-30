import React from 'react';
import { AlertTriangle, Download, X } from 'lucide-react';
import { formatTimestamp } from '../services/firestoreService';

interface RemoteConflictBannerProps {
  remoteUpdatedAt: Date | null;
  onLoadNewVersion: () => void;
  onKeepMyText: () => void;
}

export const RemoteConflictBanner: React.FC<RemoteConflictBannerProps> = ({
  remoteUpdatedAt,
  onLoadNewVersion,
  onKeepMyText,
}) => {
  return (
    <div className="bg-amber-500 text-stone-900 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-md bg-stone-900/10">
          <AlertTriangle className="w-4 h-4 text-stone-900 shrink-0" />
        </div>
        <div className="text-xs sm:text-sm font-medium">
          <span>Newer text is available from another device</span>
          {remoteUpdatedAt && (
            <span className="opacity-80 ml-1 text-xs">
              (saved {formatTimestamp(remoteUpdatedAt)})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLoadNewVersion}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition shadow-xs"
        >
          <Download className="w-3 h-3" />
          <span>Load New Version</span>
        </button>
        <button
          onClick={onKeepMyText}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white/80 hover:bg-white text-stone-900 transition"
        >
          <X className="w-3 h-3" />
          <span>Keep My Text</span>
        </button>
      </div>
    </div>
  );
};
