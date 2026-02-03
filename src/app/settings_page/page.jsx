"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Keyboard } from "lucide-react";

/**
 * Keyboard shortcuts data
 */
const shortcuts = {
    global: [
        { keys: ["Ctrl", "K"], description: "Open search" },
        { keys: ["Ctrl", ","], description: "Open settings" },
        { keys: ["Escape"], description: "Close dialogs / Cancel" },
    ],
    canvas: [
        { keys: ["Ctrl", "Z"], description: "Undo" },
        { keys: ["Ctrl", "Y"], description: "Redo" },
        { keys: ["Ctrl", "S"], description: "Save canvas" },
        { keys: ["Delete"], description: "Delete selected element" },
        { keys: ["Escape"], description: "Deselect / Cancel drawing" },
    ],
    tools: [
        { keys: ["1"], description: "Select tool" },
        { keys: ["2"], description: "Pen tool" },
        { keys: ["3"], description: "Eraser tool" },
        { keys: ["4"], description: "Text tool" },
        { keys: ["5"], description: "Rectangle" },
        { keys: ["6"], description: "Circle" },
        { keys: ["7"], description: "Triangle" },
        { keys: ["8"], description: "Star" },
        { keys: ["9"], description: "Arrow" },
    ],
};

/**
 * Keyboard shortcut key badge component
 */
function KeyBadge({ children }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono font-medium text-gray-700 dark:text-gray-200 shadow-sm">
            {children}
        </kbd>
    );
}

/**
 * Shortcut row component
 */
function ShortcutRow({ keys, description }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-sm text-gray-600 dark:text-gray-300">{description}</span>
            <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                    <React.Fragment key={key}>
                        <KeyBadge>{key}</KeyBadge>
                        {i < keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/**
 * Shortcut section component
 */
function ShortcutSection({ title, items }) {
    return (
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {title}
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                {items.map((item) => (
                    <ShortcutRow key={item.description} keys={item.keys} description={item.description} />
                ))}
            </div>
        </div>
    );
}

/**
 * Settings page with keyboard shortcuts reference
 */
export default function SettingsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* Keyboard Shortcuts Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Keyboard size={24} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Quick access to all features</p>
                        </div>
                    </div>

                    <ShortcutSection title="Global" items={shortcuts.global} />
                    <ShortcutSection title="Canvas" items={shortcuts.canvas} />
                    <ShortcutSection title="Tool Selection" items={shortcuts.tools} />
                </div>

                {/* Tip */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>💡 Tip:</strong> Press <KeyBadge>Ctrl</KeyBadge> + <KeyBadge>,</KeyBadge> from anywhere to quickly access this page.
                    </p>
                </div>
            </main>
        </div>
    );
}
