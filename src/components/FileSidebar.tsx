import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  FileText,
  MoreVertical,
  Star,
  Download,
  Trash2,
  Edit3,
  Copy,
  Archive,
  Upload,
  ArrowUpDown,
  X,
  Database,
  Check
} from 'lucide-react';
import JSZip from 'jszip';
import {
  TextFile,
  SortOption,
  formatShortTimestamp
} from '../services/firestoreService';

interface FileSidebarProps {
  files: TextFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onNewFile: () => void;
  onRenameFile: (file: TextFile) => void;
  onDeleteFile: (file: TextFile) => void;
  onDuplicateFile: (file: TextFile) => void;
  onToggleFavorite: (file: TextFile) => void;
  onImportTxt: () => void;
  onOpenBackupModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onNewFile,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
  onToggleFavorite,
  onImportTxt,
  onOpenBackupModal,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
}) => {
  // Search query for files
  const [fileSearch, setFileSearch] = useState('');

  // Sort option stored in localStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    return (localStorage.getItem('cloud_text_pad_filesort') as SortOption) || 'updated-desc';
  });

  // Filter starred only
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Active three-dot menu dropdown
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuFileId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    localStorage.setItem('cloud_text_pad_filesort', newSort);
  };

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Filter by search query
    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Filter by starred if toggled
    if (showStarredOnly) {
      result = result.filter((f) => f.favorite);
    }

    // Sort files
    result.sort((a, b) => {
      // Starred files can be prioritized at top if not strictly sorting by name
      if (!showStarredOnly && a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }

      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'created-desc': {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        }
        case 'created-asc': {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return aTime - bTime;
        }
        case 'updated-desc':
        default: {
          const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
          const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
          return bTime - aTime;
        }
      }
    });

    return result;
  }, [files, fileSearch, showStarredOnly, sortOption]);

  // Export all files as ZIP
  const handleExportAllZip = async () => {
    if (files.length === 0) return;
    try {
      const zip = new JSZip();
      files.forEach((file) => {
        const safeName = file.name.replace(/[/\\?%*:|"<>]/g, '-');
        zip.file(`${safeName}.txt`, file.content || '');
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloud-text-pad-files-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
      alert('Failed to export ZIP file.');
    }
  };

  // Download individual file as .txt
  const handleDownloadSingleFile = (file: TextFile) => {
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-72 sm:w-80 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 transition-all duration-200 select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsedDesktop ? 'md:hidden' : 'md:flex'}`}
      >
        {/* Top Header: New File & Mobile Close */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
          <button
            onClick={() => {
              onNewFile();
              if (window.innerWidth < 768) onCloseMobile();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ New File</span>
          </button>

          {/* Close on mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-stone-100 dark:border-stone-800/80 space-y-2">
          {/* Search files box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {fileSearch && (
              <button
                onClick={() => setFileSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort & Star Controls */}
          <div className="flex items-center justify-between gap-1 text-[11px] text-stone-500 dark:text-stone-400">
            {/* Sort Select */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-stone-400" />
              <select
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="bg-transparent text-stone-700 dark:text-stone-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="updated-desc" className="dark:bg-stone-800">Last Updated</option>
                <option value="name-asc" className="dark:bg-stone-800">Name A-Z</option>
                <option value="name-desc" className="dark:bg-stone-800">Name Z-A</option>
                <option value="created-desc" className="dark:bg-stone-800">Newest Created</option>
                <option value="created-asc" className="dark:bg-stone-800">Oldest Created</option>
              </select>
            </div>

            {/* Favorite toggle filter */}
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`p-1 rounded-md transition ${
                showStarredOnly
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
              title={showStarredOnly ? 'Show all files' : 'Show only starred files'}
            >
              <Star className={`w-3.5 h-3.5 ${showStarredOnly ? 'fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
          {filteredAndSortedFiles.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 dark:text-stone-500">
              {fileSearch || showStarredOnly ? (
                <p>No matching files found</p>
              ) : (
                <p>No text files yet</p>
              )}
            </div>
          ) : (
            filteredAndSortedFiles.map((file) => {
              const isActive = file.id === activeFileId;
              const isMenuOpen = activeMenuFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file.id);
                    if (window.innerWidth < 768) onCloseMobile();
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-amber-500/10 text-stone-900 dark:text-white font-medium border border-amber-500/20 dark:border-amber-400/20'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                    <FileText
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold leading-snug">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-stone-500">
                        {formatShortTimestamp(file.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Star & Three-dot menu */}
                  <div
                    className="flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Favorite star */}
                    <button
                      onClick={() => onToggleFavorite(file)}
                      className={`p-1 rounded-md transition ${
                        file.favorite
                          ? 'text-amber-500 opacity-100'
                          : 'text-stone-400 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                      }`}
                      title={file.favorite ? 'Unstar file' : 'Star file'}
                    >
                      <Star className={`w-3.5 h-3.5 ${file.favorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Three-dot dropdown trigger */}
                    <button
                      onClick={() =>
                        setActiveMenuFileId(isMenuOpen ? null : file.id)
                      }
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                      title="File options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-8 z-50 w-36 py-1 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-lg text-xs"
                    >
                      <button
                        onClick={() => {
                          setActiveMenuFileId(null);
                          onRenameFile(file);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-stone-400" />
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenuFileId(null);
                          onDuplicateFile(file);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                      >
                        <Copy className="w-3.5 h-3.5 text-stone-400" />
                        <span>Duplicate</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenuFileId(null);
                          handleDownloadSingleFile(file);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                      >
                        <Download className="w-3.5 h-3.5 text-stone-400" />
                        <span>Download .txt</span>
                      </button>

                      <div className="h-px bg-stone-100 dark:bg-stone-700 my-1" />

                      <button
                        onClick={() => {
                          setActiveMenuFileId(null);
                          onDeleteFile(file);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer with File Count and Import / Export Actions */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 text-xs text-stone-500 dark:text-stone-400 space-y-2">
          <div className="flex items-center justify-between font-medium">
            <span>{files.length} {files.length === 1 ? 'file' : 'files'}</span>
            <span className="text-[11px] text-stone-400">
              {files.filter((f) => f.favorite).length} starred
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1">
            <button
              onClick={onImportTxt}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-center text-[10px] font-medium text-stone-700 dark:text-stone-300 transition flex flex-col items-center gap-1"
              title="Import .txt file"
            >
              <Upload className="w-3 h-3 text-stone-400" />
              <span>Import .txt</span>
            </button>

            <button
              onClick={handleExportAllZip}
              disabled={files.length === 0}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-center text-[10px] font-medium text-stone-700 dark:text-stone-300 disabled:opacity-40 transition flex flex-col items-center gap-1"
              title="Export all files as ZIP"
            >
              <Archive className="w-3 h-3 text-stone-400" />
              <span>Export All</span>
            </button>

            <button
              onClick={onOpenBackupModal}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-center text-[10px] font-medium text-stone-700 dark:text-stone-300 transition flex flex-col items-center gap-1"
              title="Backup and Restore JSON"
            >
              <Database className="w-3 h-3 text-stone-400" />
              <span>Backup</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
