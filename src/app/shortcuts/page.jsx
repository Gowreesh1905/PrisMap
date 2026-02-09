/**
 * @fileoverview Keyboard Shortcuts Page Component
 * 
 * This page displays all available keyboard shortcuts in PrisMap,
 * organized by category (Global, Canvas, Tools). The page features
 * a glassmorphism design style consistent with the login page.
 * 
 * @module app/shortcuts/page
 * @requires react
 * @requires next/navigation
 * @requires lucide-react
 */

"use client";

import React from "react";
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
 * Keyboard key badge component with glassmorphism styling.
 * Renders a single keyboard key in a styled badge format.
 * 
 * @function KeyBadge
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The key text to display inside the badge
 * @returns {JSX.Element} A styled kbd element representing a keyboard key
 * 
 * @example
 * <KeyBadge>Ctrl</KeyBadge>
 * <KeyBadge>K</KeyBadge>
 */
function KeyBadge({ children }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg text-xs font-mono font-semibold text-slate-700 shadow-sm">
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
 * @returns {JSX.Element} A row displaying the shortcut and its description
 * 
 * @example
 * <ShortcutRow keys={["Ctrl", "S"]} description="Save canvas" />
 */
function ShortcutRow({ keys, description }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-200/30 last:border-0">
            <span className="text-sm text-slate-600 font-medium">{description}</span>
            <div className="flex items-center gap-1.5">
                {keys.map((key, i) => (
                    <React.Fragment key={key}>
                        <KeyBadge>{key}</KeyBadge>
                        {i < keys.length - 1 && <span className="text-slate-400 text-xs font-medium">+</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/**
 * Shortcut section component with glassmorphism card styling.
 * Groups related shortcuts under a titled section with an icon.
 * 
 * @function ShortcutSection
 * @param {Object} props - Component props
 * @param {string} props.title - The section title (e.g., "Global", "Canvas")
 * @param {React.ComponentType<{size: number, className: string}>} props.icon - Lucide icon component
 * @param {ShortcutItem[]} props.items - Array of shortcut items to display
 * @param {string} props.color - Tailwind CSS gradient class for the icon background
 * @returns {JSX.Element} A section card containing grouped shortcuts
 * 
 * @example
 * <ShortcutSection
 *   title="Global"
 *   icon={Command}
 *   items={shortcuts.global}
 *   color="bg-gradient-to-br from-teal-500 to-emerald-600"
 * />
 */
function ShortcutSection({ title, icon: Icon, items, color }) {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 ${color} rounded-lg`}>
                    <Icon size={14} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-lg shadow-indigo-500/5">
                {items.map((item) => (
                    <ShortcutRow key={item.description} keys={item.keys} description={item.description} />
                ))}
            </div>
        </div>
    );
}

/**
 * Keyboard Shortcuts Page Component.
 * 
 * Main page component that displays all available keyboard shortcuts in PrisMap.
 * Features a glassmorphism design style consistent with the login page, including:
 * - Animated background blobs with blur effects
 * - Glass-effect cards with backdrop blur
 * - Organized shortcut sections (Global, Canvas, Tools)
 * - A Pro Tip section highlighting useful shortcuts
 * - Back navigation button
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

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50">
            {/* Background Blobs - Same as login page */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/30 rounded-full blur-[100px] mix-blend-multiply animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-[30%] -translate-y-[60%] w-[600px] h-[600px] bg-teal-400/30 rounded-full blur-[80px] mix-blend-multiply" />
            <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-[30%] w-[600px] h-[600px] bg-purple-400/30 rounded-full blur-[80px] mix-blend-multiply" />

            {/* Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-white/70 backdrop-blur-xl border border-white/50 rounded-xl shadow-sm hover:shadow-md hover:bg-white/90 transition-all"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                            Keyboard Shortcuts
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Quick access to all features
                        </p>
                    </div>
                </div>

                {/* Main Glass Card */}
                <div className="bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl shadow-indigo-500/10 rounded-3xl p-8">
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
                    />
                    <ShortcutSection
                        title="Canvas"
                        icon={Keyboard}
                        items={shortcuts.canvas}
                        color="bg-gradient-to-br from-indigo-500 to-blue-600"
                    />
                    <ShortcutSection
                        title="Tool Selection"
                        icon={Command}
                        items={shortcuts.tools}
                        color="bg-gradient-to-br from-purple-500 to-pink-600"
                    />

                    {/* Tip Box */}
                    <div className="mt-6 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm border border-indigo-200/50 rounded-2xl p-5">
                        <p className="text-sm text-indigo-700 font-medium">
                            <span className="font-bold">💡 Pro Tip:</span> Press{" "}
                            <KeyBadge>Ctrl</KeyBadge>
                            <span className="mx-1">+</span>
                            <KeyBadge>,</KeyBadge>
                            {" "}from anywhere to quickly access settings.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-slate-400 text-xs font-medium tracking-wide">
                    PRISMAP KEYBOARD SHORTCUTS
                </div>
            </div>
        </div>
    );
}
