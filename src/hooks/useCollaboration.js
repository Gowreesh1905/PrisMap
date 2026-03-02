/**
 * @fileoverview Custom hook for real-time canvas collaboration.
 * 
 * Handles:
 * - User presence (join/leave room)
 * - Live cursor position broadcasting (throttled)
 * - Active users tracking via Firestore onSnapshot
 * - Canvas sharing controls (public/private toggle)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    doc, collection, query, where,
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
    // Use hue 0-360, keep saturation and lightness fixed for vibrant readable colors
    const hue = ((hash % 360) + 360) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

/** How often (ms) we write cursor position to Firestore */
const CURSOR_THROTTLE_MS = 100;

/** After this many ms without activity, a user is considered stale */
const STALE_PRESENCE_MS = 30000;

/**
 * useCollaboration — real-time collaboration hook for PrisMap canvas.
 * 
 * @param {string} canvasId - The Firestore canvas document ID
 * @param {object|null} user - Firebase Auth user object ({ uid, displayName, photoURL })
 * 
 * @returns {{
 *   activeUsers: Array<{uid: string, displayName: string, photoURL: string|null, color: string}>,
 *   remoteCursors: Array<{uid: string, name: string, color: string, x: number, y: number}>,
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

    // Refs for throttling and cleanup
    const lastCursorUpdate = useRef(0);
    const presenceRef = useRef(null);

    // Generate a stable color for the current user
    const myColor = user ? generateUserColor(user.uid) : '#888888';

    // ─────────────────────────────────────────────
    // 1. JOIN ROOM — create presence doc on mount
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!canvasId || !user) return;

        const pRef = doc(db, 'canvases', canvasId, 'presence', user.uid);
        presenceRef.current = pRef;

        // Create/update our presence document
        setDoc(pRef, {
            uid: user.uid,
            displayName: user.displayName || user.email || 'Anonymous',
            photoURL: user.photoURL || null,
            color: myColor,
            cursor: { x: 0, y: 0 },
            lastSeen: serverTimestamp(),
            isActive: true
        }, { merge: true });

        // LEAVE ROOM — mark inactive on unmount
        const cleanup = () => {
            updateDoc(pRef, {
                isActive: false,
                lastSeen: serverTimestamp()
            }).catch(() => {
                // Ignore errors during unmount (e.g., component already gone)
            });
        };

        // Handle browser tab close / navigate away
        const handleBeforeUnload = () => {
            // updateDoc may not complete during unload, but we try
            updateDoc(pRef, { isActive: false }).catch(() => { });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            cleanup();
        };
    }, [canvasId, user, myColor]);

    // ─────────────────────────────────────────────
    // 2. LISTEN TO ACTIVE USERS — onSnapshot on presence subcollection
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!canvasId || !user) return;

        const presenceQuery = query(
            collection(db, 'canvases', canvasId, 'presence'),
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
            const now = Date.now();
            const users = [];
            const cursors = [];

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();

                // Skip stale presence docs (user closed tab without cleanup)
                const lastSeen = data.lastSeen?.toMillis?.() || 0;
                if (now - lastSeen > STALE_PRESENCE_MS && lastSeen !== 0) {
                    // Clean up stale doc silently
                    updateDoc(docSnap.ref, { isActive: false }).catch(() => { });
                    return;
                }

                users.push({
                    uid: data.uid,
                    displayName: data.displayName || 'Anonymous',
                    photoURL: data.photoURL || null,
                    color: data.color || '#888888'
                });

                // Only include remote users' cursors (not our own)
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
            // Ignore permission errors during logout
            if (error.code !== 'permission-denied') {
                console.error('Presence listener error:', error);
            }
        });

        return () => unsubscribe();
    }, [canvasId, user]);

    // ─────────────────────────────────────────────
    // 3. LISTEN TO SHARE STATUS — read isPublic from canvas doc
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
    // 4. BROADCAST CURSOR — throttled writes
    // ─────────────────────────────────────────────
    const updateCursorPosition = useCallback((x, y) => {
        if (!presenceRef.current) return;

        const now = Date.now();
        if (now - lastCursorUpdate.current < CURSOR_THROTTLE_MS) return;
        lastCursorUpdate.current = now;

        updateDoc(presenceRef.current, {
            cursor: { x: Math.round(x), y: Math.round(y) },
            lastSeen: serverTimestamp()
        }).catch(() => {
            // Ignore write errors (e.g., if doc was deleted)
        });
    }, []);

    // ─────────────────────────────────────────────
    // 5. SHARE CONTROLS — toggle public/private
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
