/**
 * @fileoverview Custom hook for real-time canvas collaboration.
 * 
 * Design decisions:
 * - Presence docs are CREATED when a user joins, DELETED when they leave.
 *   Only currently-online users have docs. No ghost data accumulates.
 * - The `collaborators` array (for restricted access) lives on the canvas
 *   document itself, NOT in the presence subcollection.
 * - `lastSeen` is only used to detect crashed browsers (heartbeat stops →
 *   ghost doc gets auto-deleted after 45s).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    doc, collection,
    onSnapshot, setDoc, updateDoc, deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Generates a consistent color for a user based on their UID.
 * The same UID always produces the same color.
 * 
 * @param {string} uid - Firebase user UID
 * @returns {string} HSL color string
 */
function generateUserColor(uid) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = ((hash % 360) + 360) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

/** How often (ms) we write cursor position to Firestore */
const CURSOR_THROTTLE_MS = 100;

/** How often (ms) we ping Firestore to say "I'm still here" (even when idle) */
const HEARTBEAT_INTERVAL_MS = 15000;

/**
 * If a user's lastSeen is older than this, their browser probably crashed.
 * Their presence doc gets auto-deleted.
 * Must be > HEARTBEAT_INTERVAL_MS so normal idle users aren't removed.
 */
const STALE_TIMEOUT_MS = 45000;

/**
 * useCollaboration — real-time collaboration hook for PrisMap canvas.
 * 
 * @param {string} canvasId - The Firestore canvas document ID
 * @param {object|null} user - Firebase Auth user object ({ uid, displayName, photoURL })
 * 
 * @returns {{
 *   activeUsers: Array<{uid, displayName, photoURL, color}>,
 *   remoteCursors: Array<{uid, name, color, x, y}>,
 *   updateCursorPosition: (x: number, y: number) => void,
 *   isShared: boolean,
 *   toggleShare: () => Promise<void>,
 *   myColor: string
 * }}
 */
export default function useCollaboration(canvasId, user) {
    const [activeUsers, setActiveUsers] = useState([]);
    const [remoteCursors, setRemoteCursors] = useState([]);
    const [isShared, setIsShared] = useState(false);

    const lastCursorUpdate = useRef(0);
    const presenceRef = useRef(null);

    const myColor = user ? generateUserColor(user.uid) : '#888888';

    // ─────────────────────────────────────────────
    // 1. JOIN ROOM — create presence doc on mount,
    //    DELETE it on leave (not just mark inactive)
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!canvasId || !user) return;

        const pRef = doc(db, 'canvases', canvasId, 'presence', user.uid);
        presenceRef.current = pRef;

        // Create presence doc — this tells everyone "I'm here"
        setDoc(pRef, {
            uid: user.uid,
            displayName: user.displayName || user.email || 'Anonymous',
            photoURL: user.photoURL || null,
            color: myColor,
            cursor: { x: 0, y: 0 },
            lastSeen: serverTimestamp()
        });

        // LEAVE: delete the doc entirely — no leftover data
        const cleanup = () => {
            deleteDoc(pRef).catch(() => { });
        };

        // Handle normal tab close
        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [canvasId, user, myColor]);

    // ─────────────────────────────────────────────
    // 2. HEARTBEAT — ping every 15s so crash detection works.
    //    If the browser crashes, this stops → lastSeen goes stale
    //    → other clients auto-delete the ghost doc.
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!presenceRef.current) return;

        const interval = setInterval(() => {
            updateDoc(presenceRef.current, {
                lastSeen: serverTimestamp()
            }).catch(() => { });
        }, HEARTBEAT_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [canvasId, user]);

    // ─────────────────────────────────────────────
    // 3. LISTEN TO ACTIVE USERS — onSnapshot on presence subcollection.
    //    Every doc that exists = an active user.
    //    Stale docs (crashed browsers) get auto-deleted.
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!canvasId || !user) return;

        // Listen to ALL docs in the presence subcollection
        // (every doc = a currently-online user)
        const presenceCol = collection(db, 'canvases', canvasId, 'presence');

        const unsubscribe = onSnapshot(presenceCol, (snapshot) => {
            const now = Date.now();
            const users = [];
            const cursors = [];

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();

                // Crash detection: if lastSeen is too old, delete the ghost doc
                const lastSeen = data.lastSeen?.toMillis?.() || 0;
                if (lastSeen !== 0 && now - lastSeen > STALE_TIMEOUT_MS) {
                    deleteDoc(docSnap.ref).catch(() => { });
                    return; // skip this ghost
                }

                users.push({
                    uid: data.uid,
                    displayName: data.displayName || 'Anonymous',
                    photoURL: data.photoURL || null,
                    color: data.color || '#888888'
                });

                // Remote cursors: exclude our own
                if (data.uid !== user.uid) {
                    cursors.push({
                        uid: data.uid,
                        name: data.displayName || 'Anonymous',
                        color: data.color || '#888888',
                        x: data.cursor?.x || 0,
                        y: data.cursor?.y || 0
                    });
                }
            });

            setActiveUsers(users);
            setRemoteCursors(cursors);
        }, (error) => {
            if (error.code !== 'permission-denied') {
                console.error('Presence listener error:', error);
            }
        });

        return () => unsubscribe();
    }, [canvasId, user]);

    // ─────────────────────────────────────────────
    // 4. SHARE STATUS — read isPublic from canvas doc
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!canvasId) return;

        const canvasRef = doc(db, 'canvases', canvasId);
        const unsubscribe = onSnapshot(canvasRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsShared(docSnap.data().isPublic || false);
            }
        }, (error) => {
            if (error.code !== 'permission-denied') {
                console.error('Share status listener error:', error);
            }
        });

        return () => unsubscribe();
    }, [canvasId]);

    // ─────────────────────────────────────────────
    // 5. BROADCAST CURSOR — throttled to 100ms
    // ─────────────────────────────────────────────
    const updateCursorPosition = useCallback((x, y) => {
        if (!presenceRef.current) return;

        const now = Date.now();
        if (now - lastCursorUpdate.current < CURSOR_THROTTLE_MS) return;
        lastCursorUpdate.current = now;

        updateDoc(presenceRef.current, {
            cursor: { x: Math.round(x), y: Math.round(y) },
            lastSeen: serverTimestamp()
        }).catch(() => { });
    }, []);

    // ─────────────────────────────────────────────
    // 6. SHARE CONTROLS — toggle public/private
    //    Collaborators list (for restricted access) is
    //    managed on the canvas doc, not here.
    // ─────────────────────────────────────────────
    const toggleShare = useCallback(async () => {
        if (!canvasId) return;

        const canvasRef = doc(db, 'canvases', canvasId);
        const newValue = !isShared;
        try {
            await updateDoc(canvasRef, { isPublic: newValue });
            setIsShared(newValue);
        } catch (error) {
            console.error('Error toggling share:', error);
        }
    }, [canvasId, isShared]);

    return {
        activeUsers,
        remoteCursors,
        updateCursorPosition,
        isShared,
        toggleShare,
        myColor
    };
}
