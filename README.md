# Cloud Text Pad

A minimalist, mobile-friendly, real-time shared online notepad powered by **Firebase Cloud Firestore**, now featuring **Multiple Text Files / Notes per Pad**!

Type or paste text from any device and access your collection of notes instantly using the website URL without accounts or passwords. Supports secret URL pads (e.g. `?pad=college123`), real-time synchronization, debounced autosave, dark mode, offline local drafts, search, import/export, and file organization.

---

## 📁 Multi-File Firestore Data Structure

Cloud Text Pad organizes files under a specific pad document:

```text
pads (collection)
 └── {padId} (e.g. "college123" or "main")
      └── files (subcollection)
           ├── {fileId_1}
           │    ├── name: "DBMS Notes"
           │    ├── content: "..."
           │    ├── favorite: true
           │    ├── createdAt: timestamp
           │    └── updatedAt: timestamp
           │
           └── {fileId_2}
                ├── name: "Java Code"
                ├── content: "..."
                ├── favorite: false
                ├── createdAt: timestamp
                └── updatedAt: timestamp
```

---

## 🔒 Recommended Firestore Security Rules

Update your rules in **Firebase Console > Firestore Database > Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function isValidFileData(data) {
      return data.name is string &&
             data.name.size() > 0 &&
             data.name.size() <= 200 &&
             data.content is string &&
             data.content.size() <= 2000000 &&
             (!('favorite' in data) || data.favorite is bool);
    }

    // Default catch-all deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Legacy single-document support
    match /sharedText/{docId} {
      allow get: if isValidId(docId);
      allow list, delete: if false;
      allow create, update: if isValidId(docId);
    }

    // Pads and files subcollection
    match /pads/{padId} {
      allow get: if isValidId(padId);
      allow list, delete: if false;
      allow create, update: if isValidId(padId);

      // Multiple files per pad
      match /files/{fileId} {
        allow get, list: if isValidId(padId) && isValidId(fileId);
        allow create, update: if isValidId(padId) && isValidId(fileId) && isValidFileData(request.resource.data);
        allow delete: if isValidId(padId) && isValidId(fileId);
      }
    }
  }
}
```

---

## 🚀 How to Test the Multiple Text File Feature

1. **Create Files**:
   - Click the **`+ New File`** button at the top of the left sidebar (or press `Ctrl+N` / `Cmd+N`).
   - Enter a name such as `DBMS Notes` or `Java Code`. If left blank, it automatically generates `Untitled 1`, `Untitled 2`, etc.
   - Click **Create**. The file will automatically open with the cursor in the editor.

2. **Edit and Autosave**:
   - Type or paste text in the editor.
   - Notice the status changing from **Unsaved changes** to **Saving...** and **Saved** ~1.5s after you pause.
   - Press **`Ctrl+S` / `Cmd+S`** to manually save at any time.

3. **Switch Files**:
   - Click any file in the sidebar to open it. Notice that if you had unsaved changes in the previous file, they are automatically saved before switching.
   - Notice the selected file is highlighted.
   - Notice the URL changes to `?file=...` so refreshing or bookmarking retains the exact opened note.

4. **Multi-Device Real-Time Sync**:
   - Open the web application in a second browser window or private tab.
   - Add a new file in Window 1: it immediately appears in Window 2's sidebar.
   - Edit the content in Window 1: Window 2 updates live.
   - If Window 2 is actively editing with local unsaved changes when Window 1 saves, a conflict notification banner appears giving Window 2 the choice to *Load New Version* or *Keep My Text*.

5. **Rename, Duplicate, and Delete**:
   - Click the three dots (**⋮**) next to any file in the sidebar:
     - **Rename**: Change file display name (or double-click the title in the header).
     - **Duplicate**: Clones the file with " Copy" appended.
     - **Delete**: Shows a confirmation dialog `Delete "DBMS Notes"?` before removing. If the open file is deleted, another available file is automatically opened.

6. **Favorites & Sorting**:
   - Click the **Star icon** on any file to mark it as a favorite.
   - Use the sort dropdown in the sidebar to sort by *Last Updated*, *Name A-Z*, *Name Z-A*, *Newest Created*, or *Oldest Created*.
   - Click the star icon at the top of the sidebar to filter to starred notes only.

7. **File Search vs Editor Search**:
   - Use the **Search files...** box in the sidebar to filter files by filename (e.g. type `java`).
   - Click **Find** in the toolbar (or `Ctrl+F` / `Cmd+F`) to search text *inside* the current file with match counts and next/previous navigation.

8. **Import & Export**:
   - **Download .txt**: Download the current file as `<name>.txt`.
   - **Import .txt**: Click `Import .txt` in the sidebar or empty state to select any local `.txt` file (up to 1 MB).
   - **Export All**: Click `Export All` to download a `.zip` file containing all notes as individual `.txt` files.
   - **Backup & Restore**: Click `Backup` to export a comprehensive `.json` file, or restore with *Merge* or *Replace* options.

9. **Secret Pads**:
   - Click the **Pad: default** button in the header to switch to a custom pad (e.g. `?pad=college123`). Each pad maintains its own completely independent collection of files.

10. **Offline Resilience**:
    - Disconnect your internet connection or toggle offline in browser DevTools.
    - Cloud Text Pad alerts you with an **Offline** badge. Every keystroke is safely kept in `localStorage` drafts (`cloudTextPadDraft_<fileId>`). Reconnecting synchronizes your changes automatically with Firestore.
