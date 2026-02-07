"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Keyboard, Command } from "lucide-react";

/**
 * Keyboard shortcuts data organized by category
 */
const shortcuts = {
    global: [
        { keys: ["Ctrl", "K"], description: "Open search" },
        { keys: ["Ctrl", ","], description: "Open settings" },
        { keys: ["Escape"], description: "Close dialogs / Cancel" },
    ],
    canvas: [
        { keys: ["Ctrl", "Z"], description: "Undo action" },
        { keys: ["Ctrl", "Y"], description: "Redo action" },
        { keys: ["Ctrl", "S"], description: "Save canvas" },
        { keys: ["Delete"], description: "Delete selected element" },
        { keys: ["Escape"], description: "Deselect / Cancel drawing" },
    ],
    tools: [
        { keys: ["1"], description: "Select tool" },
        { keys: ["2"], description: "Pen tool" },
        { keys: ["3"], description: "Eraser tool" },
        { keys: ["4"], description: "Text tool" },
        { keys: ["5"], description: "Rectangle shape" },
        { keys: ["6"], description: "Circle shape" },
        { keys: ["7"], description: "Triangle shape" },
        { keys: ["8"], description: "Star shape" },
        { keys: ["9"], description: "Arrow tool" },
    ],
};

/**
 * Keyboard key badge component - adapts to theme
 * Uses inline styles to guarantee visibility
 */
function KeyBadge({ children, isDark }) {
    const lightStyle = {
        backgroundColor: '#1e293b',
        color: '#ffffff',
        border: '2px solid #334155'
    };

    const darkStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#e2e8f0',
        border: '2px solid rgba(255, 255, 255, 0.2)'
    };

    return (
        <kbd
            className="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 rounded-lg text-sm font-mono font-bold shadow-md"
            style={isDark ? darkStyle : lightStyle}
        >
            {children}
        </kbd>
    );
}

/**
 * Shortcut row component - adapts to theme
 */
function ShortcutRow({ keys, description, isDark }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-200/30 dark:border-[var(--color-border-ui)] last:border-0">
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{description}</span>
            <div className="flex items-center gap-1.5">
                {keys.map((key, i) => (
                    <React.Fragment key={key}>
                        <KeyBadge isDark={isDark}>{key}</KeyBadge>
                        {i < keys.length - 1 && <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">+</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/**
 * Shortcut section component - adapts to theme
 */
function ShortcutSection({ title, icon: Icon, items, color, isDark }) {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 ${color} rounded-lg`}>
                    <Icon size={14} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            <div className="bg-white/60 dark:bg-[var(--color-card)] backdrop-blur-xl dark:backdrop-blur-none border border-white/50 dark:border-0 dark:ring-1 dark:ring-[var(--color-border-ui)] rounded-2xl p-5 shadow-lg shadow-indigo-500/5 dark:shadow-none">
                {items.map((item) => (
                    <ShortcutRow key={item.description} keys={item.keys} description={item.description} isDark={isDark} />
                ))}
            </div>
        </div>
    );
}

/**
 * Keyboard Shortcuts page
 * - Day Mode: Glassmorphism style matching login page
 * - Night Mode: Dashboard style with CSS variables
 */
export default function ShortcutsPage() {
    const router = useRouter();
    const [isDark, setIsDark] = useState(false);

    // Detect theme on mount and listen for changes
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();

        // Listen for class changes on the html element
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[var(--color-bg-base)]">

            {/* Light Mode: Colorful blobs like login page */}
            <div className="dark:hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/40 rounded-full blur-[80px] mix-blend-multiply animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-[30%] -translate-y-[60%] w-[600px] h-[600px] bg-teal-400/40 rounded-full blur-[60px] mix-blend-multiply" />
                <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-[30%] w-[600px] h-[600px] bg-purple-400/40 rounded-full blur-[60px] mix-blend-multiply" />
            </div>

            {/* Dark Mode: Subtle blobs like dashboard */}
            <div className="hidden dark:block pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-white/70 dark:bg-[var(--color-card)] backdrop-blur-xl dark:backdrop-blur-none border border-white/50 dark:border-0 dark:ring-1 dark:ring-[var(--color-border-ui)] rounded-xl shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-purple-500/10 transition-all"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-[var(--color-text-main)]" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-[var(--color-text-main)] tracking-tight">
                            Keyboard Shortcuts
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Quick access to all features
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white/70 dark:bg-[var(--color-card)] backdrop-blur-3xl dark:backdrop-blur-none border border-white/50 dark:border-0 dark:ring-1 dark:ring-[var(--color-border-ui)] shadow-2xl shadow-indigo-500/10 dark:shadow-none rounded-3xl p-8">
                    {/* Header Icon */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                            <Keyboard size={32} className="text-white" />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-20 h-1 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-full mx-auto mb-8" />

                    {/* Shortcuts Sections */}
                    <ShortcutSection
                        title="Global"
                        icon={Command}
                        items={shortcuts.global}
                        color="bg-gradient-to-br from-teal-500 to-emerald-600"
                        isDark={isDark}
                    />
                    <ShortcutSection
                        title="Canvas"
                        icon={Keyboard}
                        items={shortcuts.canvas}
                        color="bg-gradient-to-br from-indigo-500 to-blue-600"
                        isDark={isDark}
                    />
                    <ShortcutSection
                        title="Tool Selection"
                        icon={Command}
                        items={shortcuts.tools}
                        color="bg-gradient-to-br from-purple-500 to-pink-600"
                        isDark={isDark}
                    />

                    {/* Tip Box */}
                    <div className="mt-6 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-purple-500/10 dark:to-indigo-500/10 backdrop-blur-sm border border-indigo-200/50 dark:border-purple-500/20 rounded-2xl p-5">
                        <p className="text-sm text-indigo-700 dark:text-purple-300 font-medium">
                            <span className="font-bold">💡 Pro Tip:</span> Press{" "}
                            <KeyBadge isDark={isDark}>Ctrl</KeyBadge>
                            <span className="mx-1">+</span>
                            <KeyBadge isDark={isDark}>,</KeyBadge>
                            {" "}from anywhere to quickly access settings.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-slate-400 dark:text-slate-600 text-xs font-medium tracking-wide">
                    PRISMAP KEYBOARD SHORTCUTS
                </div>
            </div>
        </div>
    );
}
