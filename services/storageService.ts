import { UserStats, UserPreferences, Note, Summary, QueueItem, RoutineTask, Quiz } from '../types';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, query, where, serverTimestamp } from 'firebase/firestore';
import { FirebaseService } from './firebaseService';


const LOCAL_KEYS = {
    USER_SESSION: 'procastify_session',
    USERS_DB: 'procastify_users_db',
    STATS: 'procastify_stats',
    NOTES: 'procastify_notes',
    SUMMARIES: 'procastify_summaries',
    QUEUE: 'procastify_queue',
    TASKS: 'procastify_tasks',
    QUIZZES: 'procastify_quizzes'
};


const getLocalDB = <T>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const saveLocalDB = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};


const getLocalUserItems = <T extends { userId: string }>(key: string, userId: string): T[] => {
    return getLocalDB<T>(key).filter(item => item.userId === userId);
};


const saveLocalUserItems = <T extends { userId: string }>(key: string, userId: string, items: T[]) => {
    const all = getLocalDB<T>(key);
    const others = all.filter(i => i.userId !== userId);
    saveLocalDB(key, [...others, ...items]);
};



let currentUserId: string | null = null;
let isGuestMode: boolean = true;

export const StorageService = {



    setSession: (user: UserPreferences) => {
        currentUserId = user.id;
        isGuestMode = user.isGuest;
        if (user.isGuest) {
            localStorage.setItem(LOCAL_KEYS.USER_SESSION, user.id);

            const users = JSON.parse(localStorage.getItem(LOCAL_KEYS.USERS_DB) || '{}');
            users[user.id] = user;
            localStorage.setItem(LOCAL_KEYS.USERS_DB, JSON.stringify(users));
        } else {
            localStorage.removeItem(LOCAL_KEYS.USER_SESSION);
        }
    },

    getGuestSession: (): UserPreferences | null => {
        const sessionId = localStorage.getItem(LOCAL_KEYS.USER_SESSION);
        if (sessionId) {
            const users = JSON.parse(localStorage.getItem(LOCAL_KEYS.USERS_DB) || '{}');
            return users[sessionId] || null;
        }
        return null;
    },

    createGuestUser: (): UserPreferences => {
        const timestamp = Date.now();
        const shortId = timestamp.toString().slice(-4);
        const guestId = `guest_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

        return {
            id: guestId,
            isGuest: true,
            name: `Guest #${shortId}`,
            freeTimeHours: 2,
            energyPeak: 'morning',
            goal: 'Productivity',
            distractionLevel: 'medium'
        };
    },



    getUserProfile: async (userId: string): Promise<UserPreferences | null> => {

        try {
            const docRef = doc(db, 'users', userId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as UserPreferences;
            }
            return null;
        } catch (e) {
            console.error("Error fetching profile", e);
            return null;
        }
    },

    saveUserProfile: async (user: UserPreferences) => {
        if (user.isGuest) {
            const users = JSON.parse(localStorage.getItem(LOCAL_KEYS.USERS_DB) || '{}');
            users[user.id] = user;
            localStorage.setItem(LOCAL_KEYS.USERS_DB, JSON.stringify(users));
        } else {
            await setDoc(doc(db, 'users', user.id), user);
        }
    },



    getStats: async (): Promise<UserStats> => {
        if (!currentUserId) return createEmptyStats('unknown');

        if (isGuestMode) {
            const all = getLocalDB<UserStats>(LOCAL_KEYS.STATS);
            let stats = all.find(s => s.userId === currentUserId);
            if (!stats) {
                stats = createEmptyStats(currentUserId);
                all.push(stats);
                saveLocalDB(LOCAL_KEYS.STATS, all);
            }
            return stats;
        } else {

            const docRef = doc(db, 'users', currentUserId, 'data', 'stats');
            const snap = await getDoc(docRef);
            if (snap.exists()) return snap.data() as UserStats;


            const newStats = createEmptyStats(currentUserId);
            await setDoc(docRef, newStats);
            return newStats;
        }
    },

    updateStats: async (updater: (prev: UserStats) => UserStats) => {
        if (!currentUserId) return;

        const current = await StorageService.getStats();
        const updated = updater(current);

        if (isGuestMode) {
            const all = getLocalDB<UserStats>(LOCAL_KEYS.STATS);
            const idx = all.findIndex(s => s.userId === currentUserId);
            if (idx >= 0) all[idx] = updated;
            else all.push(updated);
            saveLocalDB(LOCAL_KEYS.STATS, all);
        } else {
            await setDoc(doc(db, 'users', currentUserId, 'data', 'stats'), updated);
        }
        return updated;
    },

    checkLoginStreak: async () => {
        if (!currentUserId) return;
        const stats = await StorageService.getStats();
        const lastDate = new Date(stats.lastLoginDate).toDateString();
        const today = new Date().toDateString();

        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            let newStreak = stats.loginStreak;
            if (lastDate === yesterday.toDateString()) newStreak += 1;
            else newStreak = 1;

            await StorageService.updateStats(s => ({
                ...s,
                loginStreak: newStreak,
                lastLoginDate: new Date().toISOString()
            }));
        }
    },

    logStudyTime: async (minutes: number) => {
        if (!currentUserId) return;
        const todayKey = new Date().toISOString().split('T')[0];
        await StorageService.updateStats(s => {
            const currentDaily = s.dailyActivity[todayKey] || 0;
            return {
                ...s,
                totalTimeStudiedMinutes: s.totalTimeStudiedMinutes + minutes,
                dailyActivity: { ...s.dailyActivity, [todayKey]: currentDaily + minutes }
            };
        });
    },



    migrateData: async (guestId: string, authId: string) => {

        const notes = getLocalUserItems<Note>(LOCAL_KEYS.NOTES, guestId);
        const summaries = getLocalUserItems<Summary>(LOCAL_KEYS.SUMMARIES, guestId);
        const queue = getLocalUserItems<QueueItem>(LOCAL_KEYS.QUEUE, guestId);
        const tasks = getLocalUserItems<RoutineTask>(LOCAL_KEYS.TASKS, guestId);
        const allStats = getLocalDB<UserStats>(LOCAL_KEYS.STATS);
        const guestStats = allStats.find(s => s.userId === guestId);


        const batch = writeBatch(db);


        notes.forEach(item => {
            const ref = doc(db, 'notes', item.id);
            // Ensure schema compliance
            batch.set(ref, {
                ...item,
                userId: authId,
                ownerId: authId,
                updatedAt: serverTimestamp(),
                createdAt: item.createdAt || createTimestampFromDate(item.lastModified)
            }, { merge: true });
        });


        summaries.forEach(item => {
            const ref = doc(db, 'users', authId, 'summaries', item.id);
            batch.set(ref, { ...item, userId: authId });
        });


        queue.forEach(item => {
            const ref = doc(db, 'users', authId, 'queue', item.id);
            batch.set(ref, { ...item, userId: authId });
        });


        tasks.forEach(item => {
            const ref = doc(db, 'users', authId, 'tasks', item.id);
            batch.set(ref, { ...item, userId: authId });
        });


        const quizzes = getLocalUserItems<Quiz>(LOCAL_KEYS.QUIZZES, guestId);
        quizzes.forEach(item => {
            const ref = doc(db, 'users', authId, 'quizzes', item.id);
            batch.set(ref, { ...item, userId: authId });
        });


        if (guestStats) {
            const statsRef = doc(db, 'users', authId, 'data', 'stats');
            // We just overwrite or set for simplicity, real app might merge
            batch.set(statsRef, { ...guestStats, userId: authId, id: `stats_${authId}` });
        }

        await batch.commit();
    },



    // --- Notes ---

    deleteNote: async (noteId: string) => {
        if (!currentUserId) return;
        if (isGuestMode) {
            const notes = getLocalUserItems<Note>(LOCAL_KEYS.NOTES, currentUserId);
            const filtered = notes.filter(n => n.id !== noteId);
            saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, filtered);
        } else {
            // Use FirebaseService
            await FirebaseService.deleteNote(currentUserId, noteId);
        }
    },

    saveNote: async (note: Note) => {
        if (!currentUserId) return;
        if (isGuestMode) {
            const notes = getLocalUserItems<Note>(LOCAL_KEYS.NOTES, currentUserId);
            const idx = notes.findIndex(n => n.id === note.id);
            if (idx >= 0) {
                notes[idx] = note;
            } else {
                notes.unshift(note);
            }
            saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, notes);
        } else {
            // Updated to ensure backend fields are handled by FirebaseService if needed
            // But we pass the whole note object. 
            await FirebaseService.saveNote(currentUserId, note);
        }
    },

    getNotes: async (): Promise<Note[]> => {
        if (!currentUserId) return [];
        if (isGuestMode) {
            return getLocalUserItems<Note>(LOCAL_KEYS.NOTES, currentUserId);
        } else {
            // Use "Single Source of Truth": Direct Firestore query on root collection
            try {
                // Also trigger migration opportunistically here if empty? 
                // Or explicitly call migration on session init.
                // Let's assume on-load migration is best called in setSession or distinct step.

                const q = query(
                    collection(db, 'notes'),
                    where('ownerId', '==', currentUserId)
                );
                // We might want an index on ownerId + updatedAt desc, but basic query first.
                // Adding orderBy might require index creation. Safe with client-side sort for now if small dataset.
                const snap = await getDocs(q);
                return snap.docs.map(doc => {
                    const data = doc.data() as any;
                    // Fix timestamps back to number/string if needed for app consistency
                    return {
                        ...data,
                        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
                        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
                        publishedAt: data.publishedAt?.toMillis ? data.publishedAt.toMillis() : data.publishedAt,
                        // Ensure arrays are arrays
                        tags: data.tags || []
                    } as Note;
                });
            } catch (e) {
                console.error("Error fetching notes:", e);
                return [];
            }
        }
    },

    saveNotes: async (notes: Note[]) => {
        // Fallback for bulk save if needed, but prefer saveNote
        if (!currentUserId) return;
        if (isGuestMode) {
            saveLocalUserItems(LOCAL_KEYS.NOTES, currentUserId, notes);
        } else {
            await FirebaseService.saveNotesBatch(currentUserId, notes);
        }
    },


    // --- Summaries ---

    getSummaries: async (): Promise<Summary[]> => {
        return StorageService.loadCollection<Summary>('summaries');
    },

    saveSummaries: async (summaries: Summary[]) => {
        if (!currentUserId) return;
        if (isGuestMode) {
            saveLocalUserItems(LOCAL_KEYS.SUMMARIES, currentUserId, summaries);
        } else {
            const batch = writeBatch(db);
            summaries.forEach(summary => {
                const ref = doc(db, 'users', currentUserId, 'summaries', summary.id);
                batch.set(ref, summary);
            });
            await batch.commit();
        }
    },

    publishNote: async (note: Note) => {
        if (!currentUserId || isGuestMode) return;
        await FirebaseService.publishNote(currentUserId, note);
    },

    unpublishNote: async (noteId: string) => {
        if (!currentUserId || isGuestMode) return;
        await FirebaseService.unpublishNote(currentUserId, noteId);
    },


    // --- Queue & Tasks (Unchanged) ---

    getQueue: async (): Promise<QueueItem[]> => {
        return StorageService.loadCollection<QueueItem>('queue');
    },

    saveQueue: async (queue: QueueItem[]) => {
        if (!currentUserId) return;
        if (isGuestMode) {
            saveLocalUserItems(LOCAL_KEYS.QUEUE, currentUserId, queue);
        } else {
            const batch = writeBatch(db);
            queue.forEach(item => {
                const ref = doc(db, 'users', currentUserId, 'queue', item.id);
                batch.set(ref, item);
            });
            await batch.commit();
        }
    },



    getTasks: async (): Promise<RoutineTask[]> => {
        return StorageService.loadCollection<RoutineTask>('tasks');
    },

    saveTasks: async (tasks: RoutineTask[]) => {
        if (!currentUserId) return;
        if (isGuestMode) {
            saveLocalUserItems(LOCAL_KEYS.TASKS, currentUserId, tasks);
        } else {
            const batch = writeBatch(db);
            tasks.forEach(task => {
                const ref = doc(db, 'users', currentUserId, 'tasks', task.id);
                batch.set(ref, task);
            });
            await batch.commit();
        }
    },


    // --- Quizzes ---

    getQuizzes: async (): Promise<Quiz[]> => {
        return StorageService.loadCollection<Quiz>('quizzes');
    },

    saveQuiz: async (quiz: Quiz) => {
        if (!currentUserId) return;
        if (isGuestMode) {
            const quizzes = getLocalUserItems<Quiz>(LOCAL_KEYS.QUIZZES, currentUserId);
            const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
            if (existingIndex >= 0) {
                quizzes[existingIndex] = quiz;
            } else {
                quizzes.push(quiz);
            }
            saveLocalUserItems(LOCAL_KEYS.QUIZZES, currentUserId, quizzes);
        } else {
            const ref = doc(db, 'users', currentUserId, 'quizzes', quiz.id);
            await setDoc(ref, quiz);
        }
    },


    // --- Helpers ---

    loadCollection: async <T extends { userId: string }>(collectionName: string): Promise<T[]> => {
        if (!currentUserId) return [];
        if (isGuestMode) {

            const map: Record<string, string> = {
                'notes': LOCAL_KEYS.NOTES, // Should not be called via loadCollection anymore for notes ideally
                'summaries': LOCAL_KEYS.SUMMARIES,
                'queue': LOCAL_KEYS.QUEUE,
                'tasks': LOCAL_KEYS.TASKS,
                'quizzes': LOCAL_KEYS.QUIZZES
            };
            const key = map[collectionName];
            if (!key) return [];
            return getLocalUserItems<T>(key, currentUserId);
        } else {
            const colRef = collection(db, 'users', currentUserId, collectionName);
            const snap = await getDocs(colRef);
            return snap.docs.map(d => d.data() as T);
        }
    },

    // Added migration call helper
    runCalculatedMigration: async () => {
        if (currentUserId && !isGuestMode) {
            await FirebaseService.migrateNotesToRoot(currentUserId);
        }
    }
};



const createEmptyStats = (userId: string): UserStats => ({
    id: `stats_${userId}`,
    userId,
    totalTimeStudiedMinutes: 0,
    notesCreated: 0,
    quizzesTaken: 0,
    loginStreak: 0,
    lastLoginDate: new Date().toISOString(),
    dailyActivity: {},
    highScore: 0
});



export const saveQuiz = async (quiz: Quiz) => {
    return StorageService.saveQuiz(quiz);
};

export const getQuizzes = async (userId: string): Promise<Quiz[]> => {
    return StorageService.getQuizzes();
};

const createTimestampFromDate = (dateVal: any) => {
    if (typeof dateVal === 'number') return new Date(dateVal);
    if (dateVal instanceof Date) return dateVal;
    return serverTimestamp();
};
