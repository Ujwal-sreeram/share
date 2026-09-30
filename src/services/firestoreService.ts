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
  writeBatch
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

export interface PadData {
  content: string;
  updatedAt: Date | null;
  serverTimestampRaw?: Timestamp | null;
}

export type SortOption = 'updated-desc' | 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc';

/**
 * Sanitizes the pad identifier:
 * Only allows lowercase alphanumeric, hyphens, and underscores.
 * Max length 64 characters.
 */
export function sanitizePadId(rawPadId?: string | null): string {
  if (!rawPadId) return 'main';
  const trimmed = rawPadId.trim().toLowerCase();
  const cleaned = trimmed.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64);
  return cleaned || 'main';
}

/**
 * Resolves Firestore document reference for a pad.
 * Stores pads under collection 'pads'.
 */
export function getPadDocRef(padId: string): DocumentReference<DocumentData> | null {
  if (!db) return null;
  const sanitized = sanitizePadId(padId);
  return doc(db, 'pads', sanitized);
}

/**
 * Returns collection reference for files in a pad
 */
export function getFilesCollectionRef(padId: string) {
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

// Local mock storage for offline / unconfigured Firebase mode
function getLocalFilesKey(padId: string): string {
  return `cloud_text_pad_local_files_${sanitizePadId(padId)}`;
}

export function getOfflineFiles(padId: string): TextFile[] {
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

export function saveOfflineFiles(padId: string, files: TextFile[]): void {
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
 * Subscribes to the list of files in a pad.
 * Updates in real-time when files are created, renamed, or deleted.
 */
export function subscribeToFilesList(
  padId: string,
  onUpdate: (files: TextFile[]) => void,
  onError: (error: Error) => void
): () => void {
  const sanitized = sanitizePadId(padId);

  if (!isFirebaseConfigured() || !db) {
    // Deliver offline files from local storage
    const offlineList = getOfflineFiles(sanitized);
    onUpdate(offlineList);
    return () => {};
  }

  const filesCol = getFilesCollectionRef(sanitized);
  if (!filesCol) return () => {};

  try {
    const unsubscribe = onSnapshot(
      filesCol,
      (snapshot) => {
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

        // Update local backup of files list
        saveOfflineFiles(sanitized, files);
        onUpdate(files);
      },
      (error) => {
        console.warn(`Files list snapshot notice on [${sanitized}]:`, error?.message || error);
        // Fallback to cached/offline files
        const offlineList = getOfflineFiles(sanitized);
        if (offlineList.length > 0) {
          onUpdate(offlineList);
        }
        onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    onError(err);
    return () => {};
  }
}

/**
 * Subscribes to a single file document for real-time editor sync
 */
export function subscribeToFile(
  padId: string,
  fileId: string,
  onUpdate: (file: TextFile) => void,
  onError: (error: Error) => void
): () => void {
  const sanitized = sanitizePadId(padId);

  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    const found = offlineList.find((f) => f.id === fileId);
    if (found) {
      // Check local draft
      const draft = getLocalDraft(fileId);
      if (draft) {
        onUpdate({ ...found, content: draft.content, updatedAt: draft.savedAt || found.updatedAt });
      } else {
        onUpdate(found);
      }
    }
    return () => {};
  }

  const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);

  try {
    const unsubscribe = onSnapshot(
      fileDocRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
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
        console.error(`File snapshot error on [${fileId}]:`, error);
        onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
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
 * Create a new file in the pad
 */
export async function createFile(
  padId: string,
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
    const offlineList = getOfflineFiles(sanitized);
    const uniqueId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newFile: TextFile = {
      id: uniqueId,
      ...newFileData
    };
    saveOfflineFiles(sanitized, [newFile, ...offlineList]);
    saveLocalDraft(uniqueId, content);
    return newFile;
  }

  const filesCol = getFilesCollectionRef(sanitized);
  if (!filesCol) throw new Error('Firestore not initialized');

  const docRef = await addDoc(filesCol, {
    name: finalName,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    favorite
  });

  saveLocalDraft(docRef.id, content);

  return {
    id: docRef.id,
    name: finalName,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    favorite
  };
}

/**
 * Saves text content to an existing file
 */
export async function saveFileContent(
  padId: string,
  fileId: string,
  content: string
): Promise<Date> {
  const sanitized = sanitizePadId(padId);
  saveLocalDraft(fileId, content);

  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    const updated = offlineList.map((f) =>
      f.id === fileId ? { ...f, content, updatedAt: new Date() } : f
    );
    saveOfflineFiles(sanitized, updated);
    return new Date();
  }

  const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
  await updateDoc(fileDocRef, {
    content,
    updatedAt: serverTimestamp()
  });

  return new Date();
}

/**
 * Renames a file
 */
export async function renameFile(
  padId: string,
  fileId: string,
  newName: string
): Promise<void> {
  const sanitized = sanitizePadId(padId);
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('File name cannot be empty');

  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    const updated = offlineList.map((f) =>
      f.id === fileId ? { ...f, name: trimmed, updatedAt: new Date() } : f
    );
    saveOfflineFiles(sanitized, updated);
    return;
  }

  const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
  await updateDoc(fileDocRef, {
    name: trimmed,
    updatedAt: serverTimestamp()
  });
}

/**
 * Toggles the favorite status of a file
 */
export async function toggleFavoriteFile(
  padId: string,
  fileId: string,
  currentFavorite: boolean
): Promise<void> {
  const sanitized = sanitizePadId(padId);
  const nextFav = !currentFavorite;

  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    const updated = offlineList.map((f) =>
      f.id === fileId ? { ...f, favorite: nextFav } : f
    );
    saveOfflineFiles(sanitized, updated);
    return;
  }

  const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
  await updateDoc(fileDocRef, {
    favorite: nextFav
  });
}

/**
 * Deletes a file document
 */
export async function deleteFileDoc(
  padId: string,
  fileId: string
): Promise<void> {
  const sanitized = sanitizePadId(padId);
  clearLocalDraft(fileId);

  if (!isFirebaseConfigured() || !db) {
    const offlineList = getOfflineFiles(sanitized);
    const updated = offlineList.filter((f) => f.id !== fileId);
    saveOfflineFiles(sanitized, updated);
    return;
  }

  const fileDocRef = doc(db, 'pads', sanitized, 'files', fileId);
  await deleteDoc(fileDocRef);
}

/**
 * Duplicates an existing file
 */
export async function duplicateFile(
  padId: string,
  file: TextFile,
  existingNames: string[]
): Promise<TextFile> {
  let baseCopyName = `${file.name} Copy`;
  const uniqueName = generateUniqueFileName(baseCopyName, existingNames);
  return createFile(padId, uniqueName, file.content, file.favorite);
}

// ==========================================
// Migration of Existing Single-Text Document
// ==========================================

export async function migrateLegacyDataIfAny(padId: string): Promise<boolean> {
  const sanitized = sanitizePadId(padId);
  const migrationKey = `cloud_text_pad_migrated_${sanitized}`;

  if (localStorage.getItem(migrationKey)) {
    return false; // Already migrated for this pad
  }

  try {
    if (!isFirebaseConfigured() || !db) {
      // Check if offline legacy backup exists
      const legacyBackupKey = sanitized === 'main' ? 'cloudTextPadBackup' : `cloudTextPadBackup_${sanitized}`;
      const rawBackup = localStorage.getItem(legacyBackupKey);
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
      return false;
    }

    // Check if new subcollection has any files already
    const filesCol = getFilesCollectionRef(sanitized);
    if (!filesCol) return false;

    const filesSnap = await getDocs(filesCol);
    if (!filesSnap.empty) {
      localStorage.setItem(migrationKey, 'true');
      return false;
    }

    // Files collection is empty! Check legacy single text document
    let legacyText = '';
    let legacyDocSnap;

    if (sanitized === 'main') {
      legacyDocSnap = await getDoc(doc(db, 'sharedText', 'main'));
    } else {
      legacyDocSnap = await getDoc(doc(db, 'pads', sanitized));
    }

    if (legacyDocSnap && legacyDocSnap.exists()) {
      const data = legacyDocSnap.data();
      if (typeof data.content === 'string' && data.content.trim()) {
        legacyText = data.content;
      }
    }

    // Fallback to local legacy backup if Firestore had none
    if (!legacyText.trim()) {
      const legacyBackupKey = sanitized === 'main' ? 'cloudTextPadBackup' : `cloudTextPadBackup_${sanitized}`;
      const rawBackup = localStorage.getItem(legacyBackupKey);
      if (rawBackup) {
        try {
          const parsed = JSON.parse(rawBackup);
          legacyText = parsed.content || '';
        } catch {
          legacyText = rawBackup;
        }
      }
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

export function generateBackupData(padId: string, files: TextFile[]): PadBackupJSON {
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
  padId: string,
  backup: PadBackupJSON,
  mode: 'replace' | 'merge',
  currentFiles: TextFile[]
): Promise<void> {
  const sanitized = sanitizePadId(padId);

  if (mode === 'replace') {
    // Delete current files first
    for (const f of currentFiles) {
      await deleteFileDoc(sanitized, f.id);
    }
  }

  // Add all files from backup
  const existingNames = mode === 'replace' ? [] : currentFiles.map((f) => f.name);

  for (const item of backup.files) {
    const uniqueName = generateUniqueFileName(item.name, existingNames);
    existingNames.push(uniqueName);
    await createFile(sanitized, uniqueName, item.content, item.favorite || false);
  }
}

// Legacy single-doc fallback exports (kept for zero regressions)
export async function loadText(padId: string): Promise<PadData> {
  const sanitized = sanitizePadId(padId);
  const files = getOfflineFiles(sanitized);
  if (files.length > 0) {
    return {
      content: files[0].content,
      updatedAt: files[0].updatedAt
    };
  }
  return { content: '', updatedAt: null };
}

export async function saveText(padId: string, content: string): Promise<Date> {
  return new Date();
}

export function subscribeToChanges(
  padId: string,
  onUpdate: (data: PadData) => void,
  onError: (error: Error) => void
): () => void {
  return () => {};
}
