"use client";

import React from "react";
import { Pencil, FileJson, LayoutTemplate } from "lucide-react";

export default function Sidebar({ currentMode, onModeChange }) {
    const navItems = [
        { id: "drawing", label: "Drawing", icon: Pencil },
        { id: "flowchart", label: "Flowchart", icon: FileJson },
        { id: "poster", label: "Poster", icon: LayoutTemplate },
    ];

    return (
        <aside className="w-16 h-full flex flex-col items-center py-6 bg-slate-900 border-r border-slate-800 shrink-0 z-50">
            {/* Logo Area */}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl mb-8 flex items-center justify-center shadow-lg shadow-purple-900/50">
                <span className="text-white font-bold text-lg leading-none">P</span>
            </div>

            {/* Navigation Icons */}
            <nav className="flex flex-col gap-4 w-full px-2">
                {navItems.map((item) => {
                    const active = currentMode === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onModeChange(item.id)}
                            className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative
                                ${active
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                                }
                            `}
                        >
                            <Icon size={22} className={active ? "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : ""} />

                            {/* Tooltip */}
                            <div className="absolute left-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none">
                                {item.label}
                                <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 -translate-y-1/2 rotate-45"></div>
                            </div>
                        </button>
                    );
                })}
            </nav>

            {/* Spacer */}
            <div className="mt-auto" />
        </aside>
    );
}
