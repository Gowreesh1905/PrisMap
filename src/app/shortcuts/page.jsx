/**
 * @fileoverview Keyboard Shortcuts Page Component
 * 
 * This page displays all available keyboard shortcuts in PrisMap,
 * organized by category (Global, Canvas, Tools). The page features
 * a glassmorphism design style in day mode (consistent with the login page)
 * and a dark theme in night mode (consistent with the dashboard page).
 * 
 * @module app/shortcuts/page
 * @requires react
 * @requires next/navigation
 * @requires lucide-react
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Keyboard, Command } from "lucide-react";

/**
 * @typedef {Object} ShortcutItem
 * @property {string[]} keys - Array of key names that form the shortcut combination
 * @property {string} description - Human-readable description of what the shortcut does
 */

/**
 * @typedef {Object} ShortcutsData
 * @property {ShortcutItem[]} global - Global shortcuts available throughout the app
 * @property {ShortcutItem[]} canvas - Shortcuts specific to canvas operations
 * @property {ShortcutItem[]} tools - Shortcuts for tool selection
 */

/**
 * Keyboard shortcuts data organized by category.
 * Contains all available keyboard shortcuts in PrisMap grouped into
 * global, canvas, and tool selection categories.
 * 
 * @constant {ShortcutsData}
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
 * Custom hook to detect the current theme by observing the .dark class
 * on the document root element. Returns true when dark mode is active.
 * 
 * @function useDarkMode
 * @returns {boolean} Whether dark mode is currently active
 */
function useDarkMode() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Read the initial state
        setIsDark(document.documentElement.classList.contains("dark"));

        // Watch for changes to the class attribute on <html>
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return isDark;
}

/**
 * Keyboard key badge component with theme-aware styling.
 * Renders a single keyboard key in a styled badge format.
 * 
 * @function KeyBadge
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The key text to display inside the badge
 * @param {boolean} props.isDark - Whether dark mode is active
 * @returns {JSX.Element} A styled kbd element representing a keyboard key
 * 
 * @example
 * <KeyBadge isDark={false}>Ctrl</KeyBadge>
 * <KeyBadge isDark={true}>K</KeyBadge>
 */
function KeyBadge({ children, isDark }) {
    return (
        <kbd
            className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 backdrop-blur-sm rounded-lg text-xs font-mono font-semibold shadow-sm ${isDark
                    ? "bg-white/10 border border-white/10 text-slate-200"
                    : "bg-white/60 border border-slate-200/60 text-slate-700"
                }`}
        >
            {children}
        </kbd>
    );
}

/**
 * Shortcut row component that displays a single keyboard shortcut.
 * Shows the description on the left and the key combination on the right.
 * 
 * @function ShortcutRow
 * @param {Object} props - Component props
 * @param {string[]} props.keys - Array of key names in the shortcut combination
 * @param {string} props.description - Description of what the shortcut does
 * @param {boolean} props.isDark - Whether dark mode is active
 * @returns {JSX.Element} A row displaying the shortcut and its description
 * 
 * @example
 * <ShortcutRow keys={["Ctrl", "S"]} description="Save canvas" isDark={false} />
 */
function ShortcutRow({ keys, description, isDark }) {
    return (
        <div
            className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? "border-[var(--color-border-ui)]" : "border-slate-200/30"
                }`}
        >
            <span
                className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-600"
                    }`}
            >
                {description}
            </span>
            <div className="flex items-center gap-1.5">
                {keys.map((key, i) => (
                    <React.Fragment key={key}>
                        <KeyBadge isDark={isDark}>{key}</KeyBadge>
                        {i < keys.length - 1 && (
                            <span
                                className={`text-xs font-medium ${isDark ? "text-slate-600" : "text-slate-400"
                                    }`}
                            >
                                +
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/**
 * Shortcut section component with theme-aware card styling.
 * Groups related shortcuts under a titled section with an icon.
 * 
 * @function ShortcutSection
 * @param {Object} props - Component props
 * @param {string} props.title - The section title (e.g., "Global", "Canvas")
 * @param {React.ComponentType<{size: number, className: string}>} props.icon - Lucide icon component
 * @param {ShortcutItem[]} props.items - Array of shortcut items to display
 * @param {string} props.color - Tailwind CSS gradient class for the icon background
 * @param {boolean} props.isDark - Whether dark mode is active
 * @returns {JSX.Element} A section card containing grouped shortcuts
 * 
 * @example
 * <ShortcutSection
 *   title="Global"
 *   icon={Command}
 *   items={shortcuts.global}
 *   color="bg-gradient-to-br from-teal-500 to-emerald-600"
 *   isDark={false}
 * />
 */
function ShortcutSection({ title, icon: Icon, items, color, isDark }) {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 ${color} rounded-lg`}>
                    <Icon size={14} className="text-white" />
                </div>
                <h3
                    className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                >
                    {title}
                </h3>
            </div>
            <div
                className={`rounded-2xl p-5 shadow-lg ${isDark
                        ? "bg-[var(--color-bg-base)]/50 border border-[var(--color-border-ui)] shadow-purple-500/5"
                        : "bg-white/60 backdrop-blur-xl border border-white/50 shadow-indigo-500/5"
                    }`}
            >
                {items.map((item) => (
                    <ShortcutRow
                        key={item.description}
                        keys={item.keys}
                        description={item.description}
                        isDark={isDark}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Keyboard Shortcuts Page Component.
 * 
 * Main page component that displays all available keyboard shortcuts in PrisMap.
 * Features two visual modes:
 * - Day mode: Glassmorphism design style consistent with the login page
 * - Night mode: Dashboard-style dark theme with CSS custom properties
 * 
 * @function ShortcutsPage
 * @returns {JSX.Element} The complete keyboard shortcuts page
 * 
 * @example
 * // This is a Next.js page component, accessed via /shortcuts route
 * // No direct usage required - automatically rendered by Next.js routing
 */
export default function ShortcutsPage() {
    const router = useRouter();
    const isDark = useDarkMode();

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-[var(--color-bg-base)]" : "bg-slate-50"
                }`}
        >
            {/* Light Mode: Glassmorphism Background Blobs (login-page style) */}
            {!isDark && (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/30 rounded-full blur-[100px] mix-blend-multiply animate-pulse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-[30%] -translate-y-[60%] w-[600px] h-[600px] bg-teal-400/30 rounded-full blur-[80px] mix-blend-multiply" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-[30%] w-[600px] h-[600px] bg-purple-400/30 rounded-full blur-[80px] mix-blend-multiply" />
                </>
            )}

            {/* Dark Mode: Dashboard-style decorative gradient blurs */}
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
                        <ArrowLeft
                            size={20}
                            className={isDark ? "text-slate-300" : "text-slate-600"}
                        />
                    </button>
                    <div>
                        <h1
                            className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-[var(--color-text-main)]" : "text-slate-800"
                                }`}
                        >
                            Keyboard Shortcuts
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Quick access to all features
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
                    <div
                        className={`mt-6 rounded-2xl p-5 ${isDark
                                ? "bg-purple-500/10 border border-purple-500/30"
                                : "bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm border border-indigo-200/50"
                            }`}
                    >
                        <p
                            className={`text-sm font-medium ${isDark ? "text-purple-300" : "text-indigo-700"
                                }`}
                        >
                            <span className="font-bold">💡 Pro Tip:</span> Press{" "}
                            <KeyBadge isDark={isDark}>Ctrl</KeyBadge>
                            <span className="mx-1">+</span>
                            <KeyBadge isDark={isDark}>,</KeyBadge>
                            {" "}from anywhere to quickly access settings.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className={`text-center mt-8 text-xs font-medium tracking-wide ${isDark ? "text-slate-600" : "text-slate-400"
                        }`}
                >
                    PRISMAP KEYBOARD SHORTCUTS
                </div>
            </div>
        </div>
    );
}
