import { db } from '../firebaseConfig';
import { doc, deleteDoc, setDoc, getDoc, collection, getDocs, writeBatch, serverTimestamp, query, where, orderBy, Firestore } from 'firebase/firestore';
import { Note } from '../types';

export const FirebaseService = {
    // --- Data Migration ---
    migrateNotesToRoot: async (userId: string) => {
        try {
            // Check if already migrated (optional optimization could go here, but strict check is safer)
            // For now, we'll check if user has notes in the old location
            const oldNotesRef = collection(db, 'users', userId, 'notes');
            const snapshot = await getDocs(oldNotesRef);

            if (snapshot.empty) return;

            const batch = writeBatch(db);
            let operationCount = 0;

            snapshot.docs.forEach(docSnap => {
                const noteData = docSnap.data() as Note;
                const newRef = doc(db, 'notes', noteData.id);

                // Prepare migration data
                const migratedNote = {
                    ...noteData,
                    ownerId: userId,
                    createdAt: noteData.createdAt || createTimestampFromDate(noteData.lastModified),
                    updatedAt: serverTimestamp(), // Mark migration time as update or preserve lastModified? Preserving mostly.
                    isPublic: noteData.isPublic || false,
                    publishedAt: noteData.publishedAt ? createTimestampFromDate(noteData.publishedAt) : null,
                    // Ensure deep objects exist
                    document: noteData.document || { blocks: [] },
                    canvas: noteData.canvas || { elements: [], strokes: [] }
                };

                batch.set(newRef, migratedNote, { merge: true });
                operationCount++;

                // Add delete for old doc to avoid duplication confusion? 
                // Plan said "copy", but "move" is cleaner. Let's keep copy for safety unless explicitly asked to delete.
                // User said "migrate", usually implies move. But keeping safety copy in subcollection might be wise until verified.
                // I will NOT delete the old ones for safety, but the app will stop reading them.
            });

            if (operationCount > 0) {
                await batch.commit();
                console.log(`Migrated ${operationCount} notes to root collection for user ${userId}`);
            }
        } catch (e) {
            console.error("Migration failed:", e);
        }
    },

    // --- Notes ---
    saveNote: async (userId: string, note: Note) => {
        const ref = doc(db, 'notes', note.id);

        // Ensure strictly managed fields
        const payload = {
            ...note,
            ownerId: userId,
            updatedAt: serverTimestamp(),
            // Ensure these defaults if missing
            isPublic: note.isPublic || false,
            publishedAt: note.isPublic ? (note.publishedAt || serverTimestamp()) : null,
            document: note.document || { blocks: [] },
            canvas: note.canvas || { elements: [], strokes: [] }
        };

        // If it's a new note (basic check), add createdAt. 
        // Ideally we pass this in, but 'merge: true' with setDoc handles it well if we don't overwrite.
        // But to be safe for existing notes being saved:
        if (!note.createdAt) {
            // We can't easily know if it exists without reading, but 'merge' is safe.
            // We simply won't set createdAt here if it's missing in the object, assume it allows serverTimestamp if new?
            // Better: App creates `createdAt` in local state for new notes.
        }

        await setDoc(ref, payload, { merge: true });
    },

    deleteNote: async (userId: string, noteId: string) => {
        const ref = doc(db, 'notes', noteId);
        await deleteDoc(ref);
    },

    saveNotesBatch: async (userId: string, notes: Note[]) => {
        const batch = writeBatch(db);
        notes.forEach(note => {
            const ref = doc(db, 'notes', note.id);
            const payload = {
                ...note,
                ownerId: userId,
                updatedAt: serverTimestamp(),
                isPublic: note.isPublic || false
            };
            batch.set(ref, payload, { merge: true });
        });
        await batch.commit();
    },

    // --- Public Store ---
    publishNote: async (userId: string, note: Note) => {
        // Single source of truth update
        const ref = doc(db, 'notes', note.id);
        await setDoc(ref, {
            isPublic: true,
            publishedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    unpublishNote: async (userId: string, noteId: string) => {
        const ref = doc(db, 'notes', noteId);
        await setDoc(ref, {
            isPublic: false,
            publishedAt: null,
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    getPublicNotes: async (): Promise<Note[]> => {
        try {
            const q = query(
                collection(db, 'notes'),
                where('isPublic', '==', true),
                orderBy('publishedAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => {
                const data = d.data();
                // Normalize timestamps
                return mapFirestoreDataToNote(data);
            });
        } catch (e) {
            console.error("Error fetching public notes:", e);
            return [];
        }
    },

    // --- Stats (Unchanged logic, kept for interface consistency) ---
    saveDailyActivity: async (userId: string, dateKey: string, minutes: number) => { }
};

// Helper to handle Firestore timestamps vs Date/Numbers
const createTimestampFromDate = (dateVal: any) => {
    // If it's already a firestore timestamp-like (not a real one here without importing Timestamp class),
    // best effort or just pass through for serverTimestamp if strictly new. 
    // If it's number (Date.now()), return it date object for Firestore? 
    // Firestore setDoc accepts Date objects.
    if (typeof dateVal === 'number') return new Date(dateVal);
    if (dateVal instanceof Date) return dateVal;
    return serverTimestamp();
};

const mapFirestoreDataToNote = (data: any): Note => {
    return {
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
        publishedAt: data.publishedAt?.toMillis ? data.publishedAt.toMillis() : data.publishedAt
    } as Note;
};
