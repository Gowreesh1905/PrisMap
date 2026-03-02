/**
 * @fileoverview Keyboard Shortcuts Page Component
 *
 * Displays all keyboard shortcuts in PrisMap organized by category.
 * Users can edit shortcut bindings inline — the new bindings persist
 * to localStorage and are used by the canvas in real time.
 *
 * Day mode: glassmorphism style (login page).
 * Night mode: dashboard-style dark theme.
 *
 * @module app/shortcuts/page
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Keyboard, Command, Pencil, X, RotateCcw } from "lucide-react";
import { useShortcuts } from "@/contexts/ShortcutContext";

// ─── Dark mode detection ────────────────────────────────────────────

function useDarkMode() {
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
        const obs = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains("dark"))
        );
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);
    return isDark;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Convert a combo string like "ctrl+shift+k" to displayable key array ["Ctrl","Shift","K"] */
function comboToKeys(combo) {
    return combo.split("+").map((k) => {
        if (k === "ctrl") return "Ctrl";
        if (k === "shift") return "Shift";
        if (k === "alt") return "Alt";
        if (k === "delete") return "Delete";
        if (k === "backspace") return "Backspace";
        if (k === "escape") return "Escape";
        if (k === "space") return "Space";
        return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
    });
}

/** Build a combo string from a keyboard event */
function eventToCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push("ctrl");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");

    let key = e.key.toLowerCase();
    if (key === " ") key = "space";
    if (key === "control" || key === "meta" || key === "shift" || key === "alt") return null; // modifier-only
    parts.push(key);
    return parts.join("+");
}

// ─── Components ─────────────────────────────────────────────────────

function KeyBadge({ children, isDark }) {
    return (
        <kbd
            className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 backdrop-blur-sm rounded-lg text-xs font-mono font-semibold shadow-sm transition-colors ${isDark
                    ? "bg-white/10 border border-white/10 text-slate-200"
                    : "bg-white/60 border border-slate-200/60 text-slate-700"
                }`}
        >
            {children}
        </kbd>
    );
}

function ShortcutRow({ actionId, combo, description, isDark, onEdit }) {
    const displayKeys = comboToKeys(combo);
    return (
        <div
            className={`flex items-center justify-between py-3 border-b last:border-0 group ${isDark ? "border-[var(--color-border-ui)]" : "border-slate-200/30"
                }`}
        >
            <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {description}
            </span>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                    {displayKeys.map((key, i) => (
                        <React.Fragment key={`${key}-${i}`}>
                            <KeyBadge isDark={isDark}>{key}</KeyBadge>
                            {i < displayKeys.length - 1 && (
                                <span className={`text-xs font-medium ${isDark ? "text-slate-600" : "text-slate-400"}`}>+</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <button
                    onClick={() => onEdit(actionId)}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark
                            ? "hover:bg-white/10 text-slate-400 hover:text-slate-200"
                            : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        }`}
                    title="Edit shortcut"
                >
                    <Pencil size={14} />
                </button>
            </div>
        </div>
    );
}

function ShortcutSection({ title, icon: Icon, items, color, isDark, onEdit }) {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 ${color} rounded-lg`}>
                    <Icon size={14} className="text-white" />
                </div>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {title}
                </h3>
            </div>
            <div
                className={`rounded-2xl p-5 shadow-lg ${isDark
                        ? "bg-[var(--color-bg-base)]/50 border border-[var(--color-border-ui)] shadow-purple-500/5"
                        : "bg-white/60 backdrop-blur-xl border border-white/50 shadow-indigo-500/5"
                    }`}
            >
                {items.map(([actionId, s]) => (
                    <ShortcutRow
                        key={actionId}
                        actionId={actionId}
                        combo={s.combo}
                        description={s.description}
                        isDark={isDark}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Key Recorder Modal ─────────────────────────────────────────────

function KeyRecorderModal({ actionId, description, isDark, onSave, onCancel, currentCombo }) {
    const [captured, setCaptured] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const combo = eventToCombo(e);
            if (combo) {
                setCaptured(combo);
                setError(null);
            }
        };
        window.addEventListener("keydown", handler, true);
        return () => window.removeEventListener("keydown", handler, true);
    }, []);

    const handleSave = () => {
        if (!captured) return;
        const result = onSave(actionId, captured);
        if (!result.success) {
            setError(`Conflict: already used by "${result.conflict}"`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${isDark
                        ? "bg-[var(--color-card)] border-[var(--color-border-ui)]"
                        : "bg-white border-slate-200"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold ${isDark ? "text-[var(--color-text-main)]" : "text-slate-800"}`}>
                        Edit Shortcut
                    </h3>
                    <button
                        onClick={onCancel}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                            }`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Action label */}
                <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Recording new key for: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{description}</strong>
                </p>

                {/* Recorder area */}
                <div
                    className={`flex items-center justify-center h-20 rounded-xl border-2 border-dashed mb-4 ${isDark
                            ? "border-purple-500/40 bg-purple-500/5"
                            : "border-indigo-300 bg-indigo-50/50"
                        }`}
                >
                    {captured ? (
                        <div className="flex items-center gap-1.5">
                            {comboToKeys(captured).map((k, i) => (
                                <React.Fragment key={`${k}-${i}`}>
                                    <KeyBadge isDark={isDark}>{k}</KeyBadge>
                                    {i < comboToKeys(captured).length - 1 && (
                                        <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>+</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    ) : (
                        <span className={`text-sm font-medium animate-pulse ${isDark ? "text-purple-400" : "text-indigo-500"}`}>
                            Press any key combination…
                        </span>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <p className="text-xs text-red-500 font-medium mb-3">{error}</p>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark
                                ? "bg-white/5 text-slate-400 hover:bg-white/10"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!captured}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${captured
                                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5"
                                : isDark
                                    ? "bg-white/5 text-slate-600 cursor-not-allowed"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function ShortcutsPage() {
    const router = useRouter();
    const isDark = useDarkMode();
    const { shortcuts, updateShortcut, resetToDefaults } = useShortcuts();
    const [editingAction, setEditingAction] = useState(null);

    // Group shortcuts by category
    const canvasShortcuts = Object.entries(shortcuts).filter(([, s]) => s.category === "canvas");
    const toolShortcuts = Object.entries(shortcuts).filter(([, s]) => s.category === "tools");

    const handleSave = useCallback(
        (actionId, newCombo) => {
            const result = updateShortcut(actionId, newCombo);
            if (result.success) {
                setEditingAction(null);
            }
            return result;
        },
        [updateShortcut]
    );

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-[var(--color-bg-base)]" : "bg-slate-50"
                }`}
        >
            {/* Light mode: glassmorphism blobs */}
            {!isDark && (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/30 rounded-full blur-[100px] mix-blend-multiply animate-pulse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-[30%] -translate-y-[60%] w-[600px] h-[600px] bg-teal-400/30 rounded-full blur-[80px] mix-blend-multiply" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-[30%] w-[600px] h-[600px] bg-purple-400/30 rounded-full blur-[80px] mix-blend-multiply" />
                </>
            )}

            {/* Dark mode: subtle gradient blurs */}
            {isDark && (
                <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className={`p-2.5 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-md transition-all ${isDark
                                ? "bg-[var(--color-card)] border border-[var(--color-border-ui)] hover:bg-white/10"
                                : "bg-white/70 border border-white/50 hover:bg-white/90"
                            }`}
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} className={isDark ? "text-slate-300" : "text-slate-600"} />
                    </button>
                    <div>
                        <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-[var(--color-text-main)]" : "text-slate-800"}`}>
                            Keyboard Shortcuts
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Click the pencil icon to customize any shortcut
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div
                    className={`rounded-3xl p-8 shadow-2xl transition-colors duration-300 ${isDark
                            ? "bg-[var(--color-card)] border border-[var(--color-border-ui)] shadow-purple-500/10"
                            : "bg-white/70 backdrop-blur-3xl border border-white/50 shadow-indigo-500/10"
                        }`}
                >
                    {/* Header Icon */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                            <Keyboard size={32} className="text-white" />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-20 h-1 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-full mx-auto mb-8" />

                    {/* Sections */}
                    <ShortcutSection
                        title="Canvas"
                        icon={Keyboard}
                        items={canvasShortcuts}
                        color="bg-gradient-to-br from-indigo-500 to-blue-600"
                        isDark={isDark}
                        onEdit={setEditingAction}
                    />
                    <ShortcutSection
                        title="Tool Selection"
                        icon={Command}
                        items={toolShortcuts}
                        color="bg-gradient-to-br from-purple-500 to-pink-600"
                        isDark={isDark}
                        onEdit={setEditingAction}
                    />

                    {/* Tip Box */}
                    <div
                        className={`mt-6 rounded-2xl p-5 ${isDark
                                ? "bg-purple-500/10 border border-purple-500/30"
                                : "bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm border border-indigo-200/50"
                            }`}
                    >
                        <p className={`text-sm font-medium ${isDark ? "text-purple-300" : "text-indigo-700"}`}>
                            <span className="font-bold">💡 Tip:</span> Hover over any shortcut and click the{" "}
                            <Pencil size={12} className="inline -mt-0.5" /> icon to rebind it.
                        </p>
                    </div>

                    {/* Reset to defaults */}
                    <button
                        onClick={resetToDefaults}
                        className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${isDark
                                ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                    >
                        <RotateCcw size={14} />
                        Reset All to Defaults
                    </button>
                </div>

                {/* Footer */}
                <div className={`text-center mt-8 text-xs font-medium tracking-wide ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                    PRISMAP KEYBOARD SHORTCUTS
                </div>
            </div>

            {/* Key Recorder Modal */}
            {editingAction && (
                <KeyRecorderModal
                    actionId={editingAction}
                    description={shortcuts[editingAction]?.description}
                    currentCombo={shortcuts[editingAction]?.combo}
                    isDark={isDark}
                    onSave={handleSave}
                    onCancel={() => setEditingAction(null)}
                />
            )}
        </div>
    );
}
