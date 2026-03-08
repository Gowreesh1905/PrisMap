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
        <aside className="w-20 h-full flex flex-col items-center py-6 bg-[#0f111a] border-r border-[#1e2235] shrink-0 z-50">
            {/* Logo Area */}
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-10 flex items-center justify-center shadow-lg shadow-purple-900/40 transform hover:scale-105 transition-transform duration-300">
                <span className="text-white font-black text-xl leading-none tracking-tighter">P</span>
            </div>

            {/* Navigation Icons */}
            <nav className="flex flex-col gap-6 w-full px-3">
                {navItems.map((item) => {
                    const active = currentMode === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onModeChange(item.id)}
                            className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group relative
                                ${active
                                    ? "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_-5px_rgba(139,61,255,0.3)]"
                                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/40"
                                }
                            `}
                        >
                            <Icon size={24} className={`${active ? "drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "opacity-80 group-hover:opacity-100 transition-opacity"}`} />

                            {/* Active Indicator Dot */}
                            {active && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-l-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                            )}

                            {/* Tooltip */}
                            <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-[#1e2235]/90 backdrop-blur-xl text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-2xl border border-white/5 pointer-events-none tracking-wide z-[100]">
                                {item.label.toUpperCase()}
                                <div className="absolute top-1/2 -left-1 w-2 h-2 bg-[#1e2235]/90 border-l border-b border-white/5 -translate-y-1/2 rotate-45"></div>
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
