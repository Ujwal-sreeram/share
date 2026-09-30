/**
 * Cloud Text Pad
 * Real-time shared online notepad with multiple files support,
 * powered by Firebase Cloud Firestore.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { FileSidebar } from './components/FileSidebar';
import { CurrentFileHeader } from './components/CurrentFileHeader';
import { Toolbar } from './components/Toolbar';
import { SearchBar } from './components/SearchBar';
import { Editor } from './components/Editor';
import { FooterStatus, SaveStatus } from './components/FooterStatus';
import { RemoteConflictBanner } from './components/RemoteConflictBanner';
import { ConfirmClearModal } from './components/ConfirmClearModal';
import { PadSwitcherModal } from './components/PadSwitcherModal';
import { SettingsModal } from './components/SettingsModal';
import { NewFileModal } from './components/NewFileModal';
import { RenameModal } from './components/RenameModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BackupModal } from './components/BackupModal';
import { EmptyState } from './components/EmptyState';
import {
  TextFile,
  subscribeToFilesList,
  subscribeToFile,
  createFile,
  saveFileContent,
  renameFile,
  toggleFavoriteFile,
  deleteFileDoc,
  duplicateFile,
  migrateLegacyDataIfAny,
  getLocalDraft,
  saveLocalDraft,
  clearLocalDraft,
  sanitizePadId
} from './services/firestoreService';
import { isFirebaseConfigured } from './firebase';

export default function App() {
  // Pad identifier from URL query param ?pad=xyz
  const [currentPad, setCurrentPad] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const rawPad = params.get('pad');
    return sanitizePadId(rawPad);
  });

  // Recent pads stored in localStorage
  const [recentPads, setRecentPads] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cloud_text_pad_recent');
      return saved ? JSON.parse(saved) : ['main'];
    } catch {
      return ['main'];
    }
  });

  // Dark / Light Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cloud_text_pad_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Multi-file state
  const [files, setFiles] = useState<TextFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get('file');
    if (fileParam) return fileParam;
    return localStorage.getItem(`cloud_text_pad_active_file_${currentPad}`) || null;
  });

  // Text editor state for currently opened file
  const [text, setText] = useState<string>('');
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [isLoadingActiveFile, setIsLoadingActiveFile] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Autosave toggle (Default: ON)
  const [autosave, setAutosave] = useState<boolean>(() => {
    const saved = localStorage.getItem('cloud_text_pad_autosave');
    return saved !== null ? saved === 'true' : true;
  });

  // Online / Offline tracking
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Mobile / Desktop sidebar layout
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState<boolean>(false);

  // Modals
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState<boolean>(false);
  const [renamingFile, setRenamingFile] = useState<TextFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<TextFile | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isPadSwitcherOpen, setIsPadSwitcherOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // In-editor text search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  // Remote conflict state for currently opened file
  const [remoteConflict, setRemoteConflict] = useState<{
    remoteContent: string;
    remoteUpdatedAt: Date | null;
  } | null>(null);

  // Hidden file input ref for importing .txt files
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if Firebase has live credentials
  const isFirebaseActive = useMemo(() => isFirebaseConfigured(), []);

  // Refs for tracking active values inside async timers and callbacks
  const activeFileIdRef = useRef<string | null>(activeFileId);
  activeFileIdRef.current = activeFileId;

  const textRef = useRef<string>(text);
  textRef.current = text;

  const hasUnsavedRef = useRef<boolean>(hasUnsavedChanges);
  hasUnsavedRef.current = hasUnsavedChanges;

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Currently opened file object
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || null;
  }, [files, activeFileId]);

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cloud_text_pad_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cloud_text_pad_theme', 'light');
    }
  }, [isDarkMode]);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (hasUnsavedRef.current && activeFileIdRef.current) {
        performSave(activeFileIdRef.current, textRef.current);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save current pad to recents list
  const addToRecentPads = useCallback((padId: string) => {
    setRecentPads((prev) => {
      const filtered = prev.filter((p) => p !== padId);
      const updated = [padId, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('cloud_text_pad_recent', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to store recent pads:', e);
      }
      return updated;
    });
  }, []);

  // Perform Save for a given file
  const performSave = useCallback(async (fileId: string, contentToSave: string) => {
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const timestamp = await saveFileContent(currentPad, fileId, contentToSave);
      setLastUpdated(timestamp);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      clearLocalDraft(fileId);
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Check Firestore connection');
    }
  }, [currentPad]);

  // Manual save handler
  const handleManualSave = useCallback(() => {
    if (!activeFileId) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    performSave(activeFileId, text);
  }, [activeFileId, text, performSave]);

  // Text change handler with debounced autosave
  const handleTextChange = useCallback((newValue: string) => {
    setText(newValue);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');

    if (activeFileId) {
      saveLocalDraft(activeFileId, newValue);
    }

    if (autosave && activeFileId) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      const targetFileId = activeFileId;
      autosaveTimerRef.current = setTimeout(() => {
        performSave(targetFileId, newValue);
      }, 1500);
    }
  }, [autosave, activeFileId, performSave]);

  // Switching active file safely (saves current file before opening new file)
  const handleSelectFile = useCallback(async (newFileId: string) => {
    if (newFileId === activeFileId) return;

    // If current file has unsaved changes, save immediately before switching
    if (hasUnsavedRef.current && activeFileIdRef.current) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      try {
        await saveFileContent(currentPad, activeFileIdRef.current, textRef.current);
        clearLocalDraft(activeFileIdRef.current);
      } catch (err) {
        console.warn('Auto-save prior to file switch warning:', err);
      }
    }

    // Update URL query & storage
    const url = new URL(window.location.href);
    url.searchParams.set('file', newFileId);
    window.history.pushState({}, '', url.toString());

    localStorage.setItem(`cloud_text_pad_active_file_${currentPad}`, newFileId);
    setActiveFileId(newFileId);
    setRemoteConflict(null);
    setHasUnsavedChanges(false);
  }, [activeFileId, currentPad]);

  // Subscribe to Pad's Files List and check migration on load
  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingFiles(true);
    addToRecentPads(currentPad);

    // Run legacy migration check (copies single sharedText/main if files collection is empty)
    migrateLegacyDataIfAny(currentPad)
      .then((migrated) => {
        if (migrated) console.log('Legacy data migrated to files subcollection');
      })
      .catch((e) => console.warn('Migration check notice:', e));

    const unsubscribe = subscribeToFilesList(
      currentPad,
      (fetchedFiles) => {
        if (!isSubscribed) return;
        setFiles(fetchedFiles);
        setIsLoadingFiles(false);

        // Auto select a file if none is selected or selected file was deleted
        if (fetchedFiles.length > 0) {
          const currentValid = fetchedFiles.some((f) => f.id === activeFileIdRef.current);
          if (!activeFileIdRef.current || !currentValid) {
            const firstId = fetchedFiles[0].id;
            setActiveFileId(firstId);
            localStorage.setItem(`cloud_text_pad_active_file_${currentPad}`, firstId);
          }
        } else {
          setActiveFileId(null);
          setText('');
        }
      },
      (error) => {
        console.warn('Files list subscription error:', error);
        setIsLoadingFiles(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [currentPad, addToRecentPads]);

  // Subscribe to currently active file document for real-time editor content
  useEffect(() => {
    if (!activeFileId) {
      setText('');
      setLastUpdated(null);
      return;
    }

    let isSubscribed = true;
    setIsLoadingActiveFile(true);

    // Check local draft first
    const draft = getLocalDraft(activeFileId);
    if (draft) {
      setText(draft.content);
      if (draft.savedAt) setLastUpdated(draft.savedAt);
    } else {
      const existing = files.find((f) => f.id === activeFileId);
      if (existing) {
        setText(existing.content);
        setLastUpdated(existing.updatedAt);
      }
    }

    const unsubscribe = subscribeToFile(
      currentPad,
      activeFileId,
      (updatedFile) => {
        if (!isSubscribed) return;
        setIsLoadingActiveFile(false);

        // If remote content matches local editor text, just sync timestamp
        if (updatedFile.content === textRef.current) {
          setLastUpdated(updatedFile.updatedAt);
          setSaveStatus('saved');
          setHasUnsavedChanges(false);
          setRemoteConflict(null);
          return;
        }

        // If user has unsaved local changes, do NOT overwrite text!
        if (hasUnsavedRef.current) {
          setRemoteConflict({
            remoteContent: updatedFile.content,
            remoteUpdatedAt: updatedFile.updatedAt
          });
        } else {
          // Otherwise, update editor seamlessly
          setText(updatedFile.content);
          setLastUpdated(updatedFile.updatedAt);
          setSaveStatus('saved');
          setHasUnsavedChanges(false);
          setRemoteConflict(null);
        }
      },
      (error) => {
        console.warn('Active file snapshot error:', error);
        setIsLoadingActiveFile(false);
      }
    );

    return () => {
      isSubscribed = false;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      unsubscribe();
    };
  }, [currentPad, activeFileId]);

  // Keyboard Shortcuts:
  // Ctrl/Cmd + S = Save current file
  // Ctrl/Cmd + N = New File
  // Ctrl/Cmd + F = Search in text
  // Ctrl/Cmd + Shift + F = Focus sidebar search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewFileModalOpen(true);
      } else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsMobileSidebarOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Handle Switch Pad
  const handleSelectPad = useCallback((newPad: string) => {
    const sanitized = sanitizePadId(newPad);
    if (sanitized === currentPad) return;

    const url = new URL(window.location.href);
    if (sanitized === 'main') {
      url.searchParams.delete('pad');
    } else {
      url.searchParams.set('pad', sanitized);
    }
    url.searchParams.delete('file');
    window.history.pushState({}, '', url.toString());

    setCurrentPad(sanitized);
    setActiveFileId(null);
    setText('');
    setRemoteConflict(null);
    setHasUnsavedChanges(false);
  }, [currentPad]);

  // Create New File
  const handleCreateFile = async (name: string) => {
    try {
      const created = await createFile(currentPad, name, '');
      setActiveFileId(created.id);
      setText('');
      setLastUpdated(new Date());
      setSaveStatus('saved');
      setHasUnsavedChanges(false);

      const url = new URL(window.location.href);
      url.searchParams.set('file', created.id);
      window.history.pushState({}, '', url.toString());
    } catch (err: any) {
      alert('Failed to create file: ' + (err?.message || err));
    }
  };

  // Rename File
  const handleRenameFile = async (newName: string) => {
    const targetFile = renamingFile || activeFile;
    if (!targetFile) return;

    try {
      await renameFile(currentPad, targetFile.id, newName);
      setRenamingFile(null);
    } catch (err: any) {
      alert('Failed to rename file: ' + (err?.message || err));
    }
  };

  // Duplicate File
  const handleDuplicateFile = async (fileToDuplicate: TextFile) => {
    try {
      const existingNames = files.map((f) => f.name);
      const duplicated = await duplicateFile(currentPad, fileToDuplicate, existingNames);
      setActiveFileId(duplicated.id);
      setText(duplicated.content);
      setLastUpdated(new Date());
    } catch (err: any) {
      alert('Failed to duplicate file: ' + (err?.message || err));
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (file: TextFile) => {
    try {
      await toggleFavoriteFile(currentPad, file.id, Boolean(file.favorite));
    } catch (err) {
      console.warn('Failed to toggle favorite:', err);
    }
  };

  // Delete File
  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    const fileIdToDelete = deletingFile.id;

    try {
      await deleteFileDoc(currentPad, fileIdToDelete);

      // If active file was deleted, switch to another available file
      if (activeFileId === fileIdToDelete) {
        const remaining = files.filter((f) => f.id !== fileIdToDelete);
        if (remaining.length > 0) {
          handleSelectFile(remaining[0].id);
        } else {
          setActiveFileId(null);
          setText('');
        }
      }
      setDeletingFile(null);
    } catch (err: any) {
      alert('Failed to delete file: ' + (err?.message || err));
    }
  };

  // Download Current File (.txt)
  const handleDownloadCurrentFile = () => {
    if (!activeFile) return;
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.name.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import .txt file
  const handleImportTxtClick = () => {
    fileInputRef.current?.click();
  };

  const handleTxtFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be chosen again
    e.target.value = '';

    // Check size limit: 1 MB max
    if (file.size > 1024 * 1024) {
      alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Please select a file under 1 MB.`);
      return;
    }

    // Check file type
    if (!file.name.endsWith('.txt') && file.type && !file.type.includes('text')) {
      alert('Only .txt text files are supported for import.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = (event.target?.result as string) || '';
        const cleanName = file.name.replace(/\.txt$/i, '');
        const existingNames = files.map((f) => f.name);
        const newFile = await createFile(currentPad, cleanName, fileContent);
        setActiveFileId(newFile.id);
        setText(fileContent);
        setLastUpdated(new Date());
      } catch (err: any) {
        alert('Failed to import file: ' + (err?.message || err));
      }
    };
    reader.onerror = () => {
      alert('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  // Clear text inside currently opened file
  const handleConfirmClear = () => {
    setIsClearModalOpen(false);
    setText('');
    setHasUnsavedChanges(false);
    if (activeFileId) {
      performSave(activeFileId, '');
    }
  };

  // Copy all text of current file
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  // Share note link
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `Cloud Text Pad - ${activeFile?.name || 'Note'}`,
      text: 'Access this shared text pad note:',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(shareUrl);
  };

  // Refresh current file from Firestore
  const handleRefresh = async () => {
    if (!activeFileId) return;
    setIsRefreshing(true);
    try {
      const draft = getLocalDraft(activeFileId);
      if (draft) {
        setText(draft.content);
        setLastUpdated(draft.savedAt);
      }
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setRemoteConflict(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Search matches within editor
  const matches = useMemo(() => {
    if (!searchQuery.trim() || !text) return [];
    const query = searchQuery.toLowerCase();
    const haystack = text.toLowerCase();
    const result: { start: number; end: number }[] = [];
    let pos = 0;
    while ((pos = haystack.indexOf(query, pos)) !== -1) {
      result.push({ start: pos, end: pos + query.length });
      pos += query.length;
    }
    return result;
  }, [searchQuery, text]);

  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(0);
    }
  }, [matches, currentMatchIndex]);

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const currentMatchRange = matches.length > 0 ? matches[currentMatchIndex] : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans">
      {/* Hidden file input for TXT import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        onChange={handleTxtFileSelected}
        className="hidden"
      />

      {/* Top Header */}
      <Header
        currentPad={currentPad}
        isOnline={isOnline}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPadSwitcher={() => setIsPadSwitcherOpen(true)}
        isFirebaseActive={isFirebaseActive}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Workspace Layout (Sidebar + Editor) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Files Sidebar */}
        <FileSidebar
          files={files}
          activeFileId={activeFileId}
          onSelectFile={handleSelectFile}
          onNewFile={() => setIsNewFileModalOpen(true)}
          onRenameFile={(file) => setRenamingFile(file)}
          onDeleteFile={(file) => setDeletingFile(file)}
          onDuplicateFile={handleDuplicateFile}
          onToggleFavorite={handleToggleFavorite}
          onImportTxt={handleImportTxtClick}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsedDesktop={isCollapsedDesktop}
          onToggleCollapseDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
        />

        {/* Right Area: Header, Toolbar, Search, Editor & Footer */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-stone-950">
          {files.length === 0 && !isLoadingFiles ? (
            <EmptyState
              onCreateFile={() => setIsNewFileModalOpen(true)}
              onImportTxt={handleImportTxtClick}
            />
          ) : (
            <>
              {/* Current File Name & Header */}
              <CurrentFileHeader
                file={activeFile}
                onRename={(newName) => handleRenameFile(newName)}
                onToggleFavorite={() => activeFile && handleToggleFavorite(activeFile)}
                onDownload={handleDownloadCurrentFile}
                onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                saveStatus={saveStatus}
                lastUpdated={lastUpdated}
                isSidebarCollapsed={isCollapsedDesktop}
                onToggleCollapseDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
              />

              {/* Toolbar */}
              <Toolbar
                onSave={handleManualSave}
                onCopy={handleCopy}
                onDownload={handleDownloadCurrentFile}
                onShare={handleShare}
                onRefresh={handleRefresh}
                onOpenClearDialog={() => setIsClearModalOpen(true)}
                autosave={autosave}
                onToggleAutosave={() => {
                  setAutosave((prev) => {
                    const next = !prev;
                    localStorage.setItem('cloud_text_pad_autosave', String(next));
                    return next;
                  });
                }}
                isSaving={saveStatus === 'saving'}
                isRefreshing={isRefreshing}
                isSearchOpen={isSearchOpen}
                onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
                hasUnsavedChanges={hasUnsavedChanges}
                disabled={!activeFile}
              />

              {/* In-Editor Search Bar */}
              {isSearchOpen && (
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  matchCount={matches.length}
                  currentMatchIndex={currentMatchIndex}
                  onNextMatch={handleNextMatch}
                  onPrevMatch={handlePrevMatch}
                  onClose={() => setIsSearchOpen(false)}
                />
              )}

              {/* Remote Conflict Notification Banner */}
              {remoteConflict && (
                <RemoteConflictBanner
                  remoteUpdatedAt={remoteConflict.remoteUpdatedAt}
                  onLoadNewVersion={() => {
                    setText(remoteConflict.remoteContent);
                    setLastUpdated(remoteConflict.remoteUpdatedAt);
                    setHasUnsavedChanges(false);
                    setSaveStatus('saved');
                    setRemoteConflict(null);
                  }}
                  onKeepMyText={() => {
                    setRemoteConflict(null);
                  }}
                />
              )}

              {/* Large Textarea Editor */}
              <main className="flex-1 flex flex-col min-h-0 relative">
                <Editor
                  value={text}
                  onChange={handleTextChange}
                  isLoading={isLoadingActiveFile}
                  selectedRange={isSearchOpen ? currentMatchRange : null}
                  placeholder="Type or paste your notes, code, or shared text here... Changes save automatically."
                  disabled={!activeFile}
                />
              </main>

              {/* Footer / Status */}
              <FooterStatus
                status={saveStatus}
                lastUpdated={lastUpdated}
                text={text}
                isOnline={isOnline}
                errorMessage={errorMessage}
                onRetrySave={handleManualSave}
              />
            </>
          )}
        </div>
      </div>

      {/* New File Modal */}
      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        onCreate={handleCreateFile}
        existingNames={files.map((f) => f.name)}
      />

      {/* Rename File Modal */}
      <RenameModal
        isOpen={Boolean(renamingFile)}
        currentName={renamingFile?.name || ''}
        onClose={() => setRenamingFile(null)}
        onRename={handleRenameFile}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingFile)}
        fileName={deletingFile?.name || ''}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleDeleteFile}
      />

      {/* Confirmation Modal for Clearing Text */}
      <ConfirmClearModal
        isOpen={isClearModalOpen}
        onCancel={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
      />

      {/* Pad Switcher Modal */}
      <PadSwitcherModal
        isOpen={isPadSwitcherOpen}
        currentPad={currentPad}
        onSelectPad={handleSelectPad}
        onClose={() => setIsPadSwitcherOpen(false)}
        recentPads={recentPads}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isFirebaseActive={isFirebaseActive}
      />

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        padId={currentPad}
        files={files}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreComplete={() => {
          // files are automatically updated via onSnapshot
        }}
      />
    </div>
  );
}
