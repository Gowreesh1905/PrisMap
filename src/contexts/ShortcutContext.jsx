"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * Default keyboard shortcut bindings.
 * Each entry maps an action ID to its key combo string and metadata.
 */
const DEFAULT_SHORTCUTS = {
    // Canvas actions (Ctrl + key)
    undo: { combo: "ctrl+z", description: "Undo action", category: "canvas" },
    redo: { combo: "ctrl+y", description: "Redo action", category: "canvas" },
    save: { combo: "ctrl+s", description: "Save canvas", category: "canvas" },
    copy: { combo: "ctrl+c", description: "Copy selected", category: "canvas" },
    paste: { combo: "ctrl+v", description: "Paste clipboard", category: "canvas" },
    duplicate: { combo: "ctrl+d", description: "Duplicate selected", category: "canvas" },
    delete: { combo: "delete", description: "Delete selected element", category: "canvas" },
    escape: { combo: "escape", description: "Deselect / Cancel drawing", category: "canvas" },

    // Tool selection (single keys)
    selectTool: { combo: "1", description: "Select tool", category: "tools" },
    penTool: { combo: "2", description: "Pen tool", category: "tools" },
    eraserTool: { combo: "3", description: "Eraser tool", category: "tools" },
    textTool: { combo: "4", description: "Text tool", category: "tools" },
    rectangleTool: { combo: "5", description: "Rectangle shape", category: "tools" },
    circleTool: { combo: "6", description: "Circle shape", category: "tools" },
    triangleTool: { combo: "7", description: "Triangle shape", category: "tools" },
    starTool: { combo: "8", description: "Star shape", category: "tools" },
    arrowTool: { combo: "9", description: "Arrow tool", category: "tools" },
};

const STORAGE_KEY = "prismap-shortcuts";

const ShortcutContext = createContext(null);

/**
 * Provides customizable keyboard shortcut bindings to the entire app.
 * Persists overrides in localStorage.
 */
export function ShortcutProvider({ children }) {
    const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);

    // Load saved shortcuts from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge saved combos into defaults (preserves descriptions/categories)
                const merged = { ...DEFAULT_SHORTCUTS };
                for (const key of Object.keys(merged)) {
                    if (parsed[key]) {
                        merged[key] = { ...merged[key], combo: parsed[key] };
                    }
                }
                setShortcuts(merged);
            }
        } catch {
            // Ignore corrupt localStorage
        }
    }, []);

    // Persist to localStorage whenever shortcuts change
    const persist = useCallback((updated) => {
        const toSave = {};
        for (const [key, val] of Object.entries(updated)) {
            toSave[key] = val.combo;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, []);

    /**
     * Update a single shortcut binding.
     * @param {string} actionId - e.g. "penTool"
     * @param {string} newCombo - e.g. "p" or "ctrl+shift+p"
     * @returns {{ success: boolean, conflict?: string }} result
     */
    const updateShortcut = useCallback((actionId, newCombo) => {
        // Check for conflicts
        const conflict = Object.entries(shortcuts).find(
            ([id, s]) => id !== actionId && s.combo === newCombo
        );
        if (conflict) {
            return { success: false, conflict: conflict[1].description };
        }

        const updated = {
            ...shortcuts,
            [actionId]: { ...shortcuts[actionId], combo: newCombo },
        };
        setShortcuts(updated);
        persist(updated);
        return { success: true };
    }, [shortcuts, persist]);

    /**
     * Reset all shortcuts to factory defaults.
     */
    const resetToDefaults = useCallback(() => {
        setShortcuts(DEFAULT_SHORTCUTS);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    /**
     * Build a reverse lookup: combo string → action ID.
     * Used by the canvas to map key presses to actions.
     */
    const getComboToActionMap = useCallback(() => {
        const map = {};
        for (const [actionId, { combo }] of Object.entries(shortcuts)) {
            map[combo] = actionId;
        }
        return map;
    }, [shortcuts]);

    return (
        <ShortcutContext.Provider value={{ shortcuts, updateShortcut, resetToDefaults, getComboToActionMap }}>
            {children}
        </ShortcutContext.Provider>
    );
}

/**
 * Hook to access the shortcut context.
 * @returns {{ shortcuts, updateShortcut, resetToDefaults, getComboToActionMap }}
 */
export function useShortcuts() {
    const ctx = useContext(ShortcutContext);
    if (!ctx) throw new Error("useShortcuts must be used within ShortcutProvider");
    return ctx;
}
