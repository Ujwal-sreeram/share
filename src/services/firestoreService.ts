import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

export interface TextFile {
  id: string;
  name: string;
  content: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  favorite?: boolean;
}

export type SortOption = 'updated-desc' | 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc';

export const INTERNAL_DEFAULT_PAD = 'default';

/**
 * Sanitizes internal pad identifier to 'default'
 */
export function sanitizePadId(rawPadId?: string | null): string {
  if (!rawPadId || rawPadId === 'main') return INTERNAL_DEFAULT_PAD;
  const trimmed = rawPadId.trim().toLowerCase();
  const cleaned = trimmed.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64);
  return cleaned || INTERNAL_DEFAULT_PAD;
}

/**
 * Resolves Firestore document reference for internal pad
 */
export function getPadDocRef(padId: string = INTERNAL_DEFAULT_PAD): DocumentReference<DocumentData> | null {
  if (!db) return null;
  const sanitized = sanitizePadId(padId);
  return doc(db, 'pads', sanitized);
}

/**
 * Returns collection reference for files in a pad:
 * pads/default/files
 */
export function getFilesCollectionRef(padId: string = INTERNAL_DEFAULT_PAD) {
  if (!db) return null;
  const sanitized = sanitizePadId(padId);
  return collection(db, 'pads', sanitized, 'files');
}

/**
 * Format timestamp into: "30 Sep 2026, 2:30 PM"
 */
export function formatTimestamp(date: Date | Timestamp | null | undefined): string {
  if (!date) return 'Never';
  const jsDate = date instanceof Timestamp ? date.toDate() : new Date(date);
  if (isNaN(jsDate.getTime())) return 'Never';

  const day = jsDate.getDate();
  const month = jsDate.toLocaleString('en-US', { month: 'short' });
  const year = jsDate.getFullYear();
  const time = jsDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Format relative or short timestamp for file sidebar
 */
export function formatShortTimestamp(date: Date | Timestamp | null | undefined): string {
  if (!date) return '';
  const jsDate = date instanceof Timestamp ? date.toDate() : new Date(date);
  if (isNaN(jsDate.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - jsDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return jsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ==========================================
// Local Storage Drafts & Resilient Backup
// ==========================================

export function getDraftKey(fileId: string): string {
  return `cloudTextPadDraft_${fileId}`;
}

export function saveLocalDraft(fileId: string, content: string): void {
  try {
    const key = getDraftKey(fileId);
    localStorage.setItem(key, JSON.stringify({
      content,
      savedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Failed to save local draft:', err);
  }
}

export function getLocalDraft(fileId: string): { content: string; savedAt: Date | null } | null {
  try {
    const key = getDraftKey(fileId);
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (parsed && typeof parsed.content === 'string') {
      return {
        content: parsed.content,
        savedAt: parsed.savedAt ? new Date(parsed.savedAt) : null
      };
    }
  } catch (err) {
    console.warn('Failed to read local draft:', err);
  }
  return null;
}

export function clearLocalDraft(fileId: string): void {
  try {
    localStorage.removeItem(getDraftKey(fileId));
  } catch (err) {
    console.warn('Failed to clear local draft:', err);
  }
}

function getLocalFilesKey(padId: string = INTERNAL_DEFAULT_PAD): string {
  return `cloud_text_pad_local_files_${sanitizePadId(padId)}`;
}

export function getOfflineFiles(padId: string = INTERNAL_DEFAULT_PAD): TextFile[] {
  try {
    const data = localStorage.getItem(getLocalFilesKey(padId));
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.map((f: any) => ({
        ...f,
        createdAt: f.createdAt ? new Date(f.createdAt) : null,
        updatedAt: f.updatedAt ? new Date(f.updatedAt) : null,
      }));
    }
  } catch (e) {
    console.warn('Failed to get offline files:', e);
  }
  return [];
}

export function saveOfflineFiles(padId: string = INTERNAL_DEFAULT_PAD, files: TextFile[]): void {
  try {
    localStorage.setItem(getLocalFilesKey(padId), JSON.stringify(files));
  } catch (e) {
    console.warn('Failed to save offline files:', e);
  }
}

// ==========================================
// Firestore Real-Time Operations for Multiple Files
// ==========================================

/**
 * Subscribes to the list of files in pads/default/files.
 * Includes automatic 10s fallback so it never stays stuck loading.
 */
export function subscribeToFilesList(
  padId: string = INTERNAL_DEFAULT_PAD,
  onUpdate: (files: TextFile[]) => void,
  onError: (error: Error) => void
): () => void {
  const sanitized = sanitizePadId(padId);

  // If Firebase is not configured or offline, return cached local files immediately
  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    onUpdate(offlineList);
    return () => {};
  }

  const filesCol = getFilesCollectionRef(sanitized);
  if (!filesCol) {
    const offlineList = getOfflineFiles(sanitized);
    onUpdate(offlineList);
    return () => {};
  }

  let hasResponded = false;

  // 10-second safety timeout: If Firestore takes > 10 seconds to respond, deliver offline/fallback
  const safetyTimeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true;
      const offlineList = getOfflineFiles(sanitized);
      onUpdate(offlineList);
      onError(new Error('Connection timed out. Operating in offline/cached mode.'));
    }
  }, 10000);

  try {
    const unsubscribe = onSnapshot(
      filesCol,
      (snapshot) => {
        hasResponded = true;
        clearTimeout(safetyTimeout);

        const files: TextFile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
          const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;

          files.push({
            id: docSnap.id,
            name: data.name || 'Untitled',
            content: typeof data.content === 'string' ? data.content : '',
            createdAt,
            updatedAt,
            favorite: Boolean(data.favorite)
          });
        });

        saveOfflineFiles(sanitized, files);
        onUpdate(files);
      },
      (error) => {
        hasResponded = true;
        clearTimeout(safetyTimeout);
        console.warn('Firestore files snapshot error:', error);
        const offlineList = getOfflineFiles(sanitized);
        onUpdate(offlineList);
        onError(error);
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  } catch (err: any) {
    clearTimeout(safetyTimeout);
    const offlineList = getOfflineFiles(sanitized);
    onUpdate(offlineList);
    onError(err);
    return () => {};
  }
}

/**
 * Subscribes to a single file document for real-time editor sync.
 * Guarantees onUpdate or onError is triggered and never hangs.
 */
export function subscribeToFile(
  padId: string = INTERNAL_DEFAULT_PAD,
  fileId: string,
  onUpdate: (file: TextFile) => void,
  onError: (error: Error) => void
): () => void {
  const sanitized = sanitizePadId(padId);

  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    const found = offlineList.find((f) => f.id === fileId);
    if (found) {
      const draft = getLocalDraft(fileId);
      if (draft) {
        onUpdate({ ...found, content: draft.content, updatedAt: draft.savedAt || found.updatedAt });
      } else {
        onUpdate(found);
      }
    } else {
      onError(new Error('File not found in local cache.'));
    }
    return () => {};
  }

  const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);

  let hasResponded = false;
  const safetyTimeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true;
      const offlineList = getOfflineFiles(sanitized);
      const found = offlineList.find((f) => f.id === fileId);
      if (found) {
        onUpdate(found);
      } else {
        onError(new Error('Timed out waiting for file response.'));
      }
    }
  }, 10000);

  try {
    const unsubscribe = onSnapshot(
      fileDocRef,
      (docSnap) => {
        hasResponded = true;
        clearTimeout(safetyTimeout);

        if (!docSnap.exists()) {
          // Document does not exist in Firestore: check local cache or report error
          const offlineList = getOfflineFiles(sanitized);
          const found = offlineList.find((f) => f.id === fileId);
          if (found) {
            onUpdate(found);
          } else {
            onError(new Error('Document does not exist.'));
          }
          return;
        }

        const data = docSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;

        onUpdate({
          id: docSnap.id,
          name: data.name || 'Untitled',
          content: typeof data.content === 'string' ? data.content : '',
          createdAt,
          updatedAt,
          favorite: Boolean(data.favorite)
        });
      },
      (error) => {
        hasResponded = true;
        clearTimeout(safetyTimeout);
        console.warn(`File snapshot error for [${fileId}]:`, error);
        const offlineList = getOfflineFiles(sanitized);
        const found = offlineList.find((f) => f.id === fileId);
        if (found) {
          onUpdate(found);
        }
        onError(error);
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  } catch (err: any) {
    clearTimeout(safetyTimeout);
    const offlineList = getOfflineFiles(sanitized);
    const found = offlineList.find((f) => f.id === fileId);
    if (found) {
      onUpdate(found);
    }
    onError(err);
    return () => {};
  }
}

/**
 * Helper to generate a unique filename given existing file names
 */
export function generateUniqueFileName(baseName: string, existingNames: string[]): string {
  const trimmed = baseName.trim() || 'Untitled';
  const lowerNames = existingNames.map((n) => n.toLowerCase());

  if (!lowerNames.includes(trimmed.toLowerCase())) {
    return trimmed;
  }

  let counter = 2;
  while (lowerNames.includes(`${trimmed} (${counter})`.toLowerCase()) ||
         lowerNames.includes(`${trimmed} ${counter}`.toLowerCase())) {
    counter++;
  }
  return `${trimmed} (${counter})`;
}

/**
 * Create a new file in pads/default/files
 */
export async function createFile(
  padId: string = INTERNAL_DEFAULT_PAD,
  name: string,
  content: string = '',
  favorite: boolean = false
): Promise<TextFile> {
  const sanitized = sanitizePadId(padId);
  const finalName = name.trim() || 'Untitled';

  const newFileData: Omit<TextFile, 'id'> = {
    name: finalName,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    favorite
  };

  if (!isFirebaseConfigured() || !db) {
    const offlineFiles = getOfflineFiles(sanitized);
    const newFile: TextFile = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...newFileData
    };
    saveOfflineFiles(sanitized, [newFile, ...offlineFiles]);
    return newFile;
  }

  try {
    const filesCol = getFilesCollectionRef(sanitized);
    if (!filesCol) throw new Error('Files collection ref unavailable');

    const docRef = await addDoc(filesCol, {
      name: finalName,
      content,
      favorite,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const created: TextFile = {
      id: docRef.id,
      ...newFileData
    };

    // Update local cache
    const offlineFiles = getOfflineFiles(sanitized);
    saveOfflineFiles(sanitized, [created, ...offlineFiles]);
    return created;
  } catch (err: any) {
    console.warn('Firestore file create error, saving locally:', err);
    const offlineFiles = getOfflineFiles(sanitized);
    const newFile: TextFile = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...newFileData
    };
    saveOfflineFiles(sanitized, [newFile, ...offlineFiles]);
    return newFile;
  }
}

/**
 * Save / update file content in pads/default/files
 */
export async function saveFileContent(
  padId: string = INTERNAL_DEFAULT_PAD,
  fileId: string,
  content: string
): Promise<Date> {
  const sanitized = sanitizePadId(padId);
  const now = new Date();

  // Always update local storage first
  const offlineFiles = getOfflineFiles(sanitized);
  const updatedOffline = offlineFiles.map((f) =>
    f.id === fileId ? { ...f, content, updatedAt: now } : f
  );
  saveOfflineFiles(sanitized, updatedOffline);

  if (!isFirebaseConfigured() || !db || fileId.startsWith('local_')) {
    return now;
  }

  try {
    const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
    await updateDoc(fileDocRef, {
      content,
      updatedAt: serverTimestamp()
    });
    return now;
  } catch (err: any) {
    console.warn('Firestore updateDoc warning, saved locally:', err);
    return now;
  }
}

/**
 * Rename a file
 */
export async function renameFile(
  padId: string = INTERNAL_DEFAULT_PAD,
  fileId: string,
  newName: string
): Promise<void> {
  const sanitized = sanitizePadId(padId);
  const trimmed = newName.trim();
  if (!trimmed) return;

  const offlineFiles = getOfflineFiles(sanitized);
  const updatedOffline = offlineFiles.map((f) =>
    f.id === fileId ? { ...f, name: trimmed, updatedAt: new Date() } : f
  );
  saveOfflineFiles(sanitized, updatedOffline);

  if (!isFirebaseConfigured() || !db || fileId.startsWith('local_')) {
    return;
  }

  try {
    const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
    await updateDoc(fileDocRef, {
      name: trimmed,
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    console.warn('Firestore rename warning, saved locally:', err);
  }
}

/**
 * Toggle favorite flag on a file
 */
export async function toggleFavoriteFile(
  padId: string = INTERNAL_DEFAULT_PAD,
  fileId: string,
  currentFavorite: boolean
): Promise<boolean> {
  const sanitized = sanitizePadId(padId);
  const nextFavorite = !currentFavorite;

  const offlineFiles = getOfflineFiles(sanitized);
  const updatedOffline = offlineFiles.map((f) =>
    f.id === fileId ? { ...f, favorite: nextFavorite } : f
  );
  saveOfflineFiles(sanitized, updatedOffline);

  if (!isFirebaseConfigured() || !db || fileId.startsWith('local_')) {
    return nextFavorite;
  }

  try {
    const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
    await updateDoc(fileDocRef, {
      favorite: nextFavorite
    });
  } catch (err: any) {
    console.warn('Firestore favorite toggle warning:', err);
  }

  return nextFavorite;
}

/**
 * Delete a file
 */
export async function deleteFileDoc(
  padId: string = INTERNAL_DEFAULT_PAD,
  fileId: string
): Promise<void> {
  const sanitized = sanitizePadId(padId);

  const offlineFiles = getOfflineFiles(sanitized);
  saveOfflineFiles(sanitized, offlineFiles.filter((f) => f.id !== fileId));
  clearLocalDraft(fileId);

  if (!isFirebaseConfigured() || !db || fileId.startsWith('local_')) {
    return;
  }

  try {
    const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
    await deleteDoc(fileDocRef);
  } catch (err: any) {
    console.warn('Firestore deleteDoc warning:', err);
  }
}

/**
 * Duplicate an existing file
 */
export async function duplicateFile(
  padId: string = INTERNAL_DEFAULT_PAD,
  sourceFile: TextFile,
  existingNames: string[]
): Promise<TextFile> {
  const newName = generateUniqueFileName(`${sourceFile.name} (Copy)`, existingNames);
  return createFile(padId, newName, sourceFile.content, sourceFile.favorite || false);
}

// ==========================================
// Migration of Existing Single-Text Document
// ==========================================

export async function migrateLegacyDataIfAny(padId: string = INTERNAL_DEFAULT_PAD): Promise<boolean> {
  const sanitized = sanitizePadId(padId);
  const migrationKey = `cloud_text_pad_migrated_${sanitized}`;

  if (localStorage.getItem(migrationKey)) {
    return false;
  }

  try {
    if (!isFirebaseConfigured() || !db) {
      const rawBackup = localStorage.getItem('cloudTextPadBackup');
      const existingOfflineFiles = getOfflineFiles(sanitized);

      if (rawBackup && existingOfflineFiles.length === 0) {
        let legacyContent = '';
        try {
          const parsed = JSON.parse(rawBackup);
          legacyContent = parsed.content || '';
        } catch {
          legacyContent = rawBackup;
        }

        if (legacyContent.trim()) {
          await createFile(sanitized, 'My First Note', legacyContent);
          localStorage.setItem(migrationKey, 'true');
          return true;
        }
      }
      localStorage.setItem(migrationKey, 'true');
      return false;
    }

    const filesCol = getFilesCollectionRef(sanitized);
    if (!filesCol) return false;

    // Use a fast query with timeout so migration check never blocks
    const filesSnapPromise = getDocs(filesCol);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const filesSnap = await Promise.race([filesSnapPromise, timeoutPromise]);

    if (!filesSnap || !filesSnap.empty) {
      localStorage.setItem(migrationKey, 'true');
      return false;
    }

    // Check legacy single text document if empty
    let legacyText = '';
    try {
      const legacyDocSnap = await getDoc(doc(db, 'sharedText', 'main'));
      if (legacyDocSnap && legacyDocSnap.exists()) {
        const data = legacyDocSnap.data();
        if (typeof data.content === 'string' && data.content.trim()) {
          legacyText = data.content;
        }
      }
    } catch {
      // Ignore if document doesn't exist
    }

    if (legacyText.trim()) {
      await createFile(sanitized, 'My First Note', legacyText);
      localStorage.setItem(migrationKey, 'true');
      return true;
    }

    localStorage.setItem(migrationKey, 'true');
    return false;
  } catch (error) {
    console.warn('Legacy migration check notice:', error);
    localStorage.setItem(migrationKey, 'true');
    return false;
  }
}

// ==========================================
// Backup & Restore (JSON Export / Import)
// ==========================================

export interface PadBackupJSON {
  version: number;
  exportedAt: string;
  padId: string;
  files: {
    name: string;
    content: string;
    createdAt?: string;
    updatedAt?: string;
    favorite?: boolean;
  }[];
}

export function generateBackupData(padId: string = INTERNAL_DEFAULT_PAD, files: TextFile[]): PadBackupJSON {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    padId: sanitizePadId(padId),
    files: files.map((f) => ({
      name: f.name,
      content: f.content,
      createdAt: f.createdAt ? f.createdAt.toISOString() : undefined,
      updatedAt: f.updatedAt ? f.updatedAt.toISOString() : undefined,
      favorite: f.favorite
    }))
  };
}

export async function restoreFromBackup(
  padId: string = INTERNAL_DEFAULT_PAD,
  backup: PadBackupJSON,
  mode: 'replace' | 'merge',
  currentFiles: TextFile[]
): Promise<void> {
  const sanitized = sanitizePadId(padId);

  if (mode === 'replace') {
    for (const f of currentFiles) {
      await deleteFileDoc(sanitized, f.id);
    }
  }

  const existingNames = mode === 'replace' ? [] : currentFiles.map((f) => f.name);

  for (const item of backup.files) {
    const uniqueName = generateUniqueFileName(item.name, existingNames);
    existingNames.push(uniqueName);
    await createFile(sanitized, uniqueName, item.content, item.favorite || false);
  }
}
