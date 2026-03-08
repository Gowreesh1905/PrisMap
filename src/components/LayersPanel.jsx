'use client';

import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * LayersPanel - Shows all elements with visibility, lock, and reorder controls
 */
export default function LayersPanel({
    elements,
    selectedIds,
    onSelectElement,
    onToggleVisibility,
    onToggleLock,
    onDelete,
    onMoveUp,
    onMoveDown,
    onOpacityChange
}) {
    const FLOW_LABELS = {
        'fc-process':    { label: 'Process',      color: '#3b82f6', bg: '#dbeafe', abbr: 'P'  },
        'fc-terminal':   { label: 'Start / End',  color: '#22c55e', bg: '#dcfce7', abbr: 'T'  },
        'fc-decision':   { label: 'Decision',     color: '#ca8a04', bg: '#fef9c3', abbr: '\u25c7' },
        'fc-io':         { label: 'Input/Output', color: '#6366f1', bg: '#e0e7ff', abbr: 'I'  },
        'fc-connector':  { label: 'Connector',    color: '#ef4444', bg: '#fee2e2', abbr: '\u25cb' },
        'fc-document':   { label: 'Document',     color: '#ea580c', bg: '#fff7ed', abbr: 'D'  },
        'fc-database':   { label: 'Database',     color: '#9333ea', bg: '#f3e8ff', abbr: 'DB' },
        'fc-predefined': { label: 'Predefined',   color: '#0284c7', bg: '#e0f2fe', abbr: 'Sub'},
        'fc-manual':     { label: 'Manual Input', color: '#db2777', bg: '#fce7f3', abbr: 'M'  },
        'fc-delay':      { label: 'Delay',        color: '#16a34a', bg: '#dcfce7', abbr: '\u29d6' },
        'fc-annotation': { label: 'Annotation',   color: '#475569', bg: '#f1f5f9', abbr: '\u2060A' },
        'fc-data':       { label: 'Data Store',   color: '#64748b', bg: '#f8fafc', abbr: 'DS' },
    };

    const getElementLabel = (el) => {
        if (el.flowNodeType && FLOW_LABELS[el.flowNodeType]) {
            const base = FLOW_LABELS[el.flowNodeType].label;
            return el.text ? `${base}: ${el.text.substring(0, 14)}` : base;
        }
        if (el.type === 'text') return el.text?.substring(0, 15) || 'Text';
        if (el.type === 'pen') return 'Stroke';
        if (el.type === 'image') return 'Image';
        if (el.type === 'arrow' && el.flowConnector) return 'Arrow';
        return el.type.charAt(0).toUpperCase() + el.type.slice(1);
    };

    const SHAPE_EMOJI = {
        rectangle: '\u2b1c', circle: '\u2b55', triangle: '\ud83d\udd3a', star: '\u2b50',
        pentagon: '\u2b20', hexagon: '\u2b21', text: '\ud83d\udcdd', pen: '\u270f\ufe0f',
        arrow: '\u27a1\ufe0f', line: '\u2796', image: '\ud83d\uddbc\ufe0f',
        diamond: '\u25c7', parallelogram: '\u25b1', cylinder: '\u26b4', note: '\ud83d\udccb',
    };

    const renderIcon = (el) => {
        const flow = el.flowNodeType && FLOW_LABELS[el.flowNodeType];
        if (flow) {
            return (
                <span
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black leading-none"
                    style={{ background: flow.bg, color: flow.color, border: `1.5px solid ${flow.color}40` }}
                >
                    {flow.abbr}
                </span>
            );
        }
        return (
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm leading-none">
                {SHAPE_EMOJI[el.type] || '\ud83d\udce6'}
            </span>
        );
    };

    return (
        <div className="space-y-1 p-1">
            {elements.slice().reverse().map((el, idx) => {
                const isSelected = selectedIds.includes(el.id);
                const isVisible = el.visible !== false;
                const isLocked = el.locked === true;

                return (
                    <div
                        key={el.id}
                        onClick={() => onSelectElement(el.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group ${isSelected
                            ? 'bg-purple-100/80 border border-purple-200 shadow-sm'
                            : 'bg-transparent border border-transparent hover:bg-gray-50/80 hover:border-gray-100'
                            } ${!isVisible ? 'opacity-40' : ''}`}
                    >
                        {renderIcon(el)}

                        <span className={`flex-1 text-[11px] font-bold truncate transition-colors ${isSelected ? 'text-purple-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                            {getElementLabel(el)}
                        </span>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
                                className={`p-1.5 rounded-lg transition-colors ${!isVisible ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-purple-600 hover:bg-white'}`}
                                title={isVisible ? 'Hide' : 'Show'}
                            >
                                {isVisible ? <Eye size={12} /> : <EyeOff size={11} />}
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }}
                                className={`p-1.5 rounded-lg transition-colors ${isLocked ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-purple-600 hover:bg-white'}`}
                                title={isLocked ? 'Unlock' : 'Lock'}
                            >
                                {isLocked ? <Lock size={12} /> : <Unlock size={11} />}
                            </button>

                            <div className="w-px h-3 bg-gray-200 mx-0.5" />

                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveUp(el.id); }}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-white rounded-lg transition-colors"
                                title="Move Up"
                            >
                                <ChevronUp size={12} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveDown(el.id); }}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-white rounded-lg transition-colors"
                                title="Move Down"
                            >
                                <ChevronDown size={12} />
                            </button>
                        </div>
                    </div>
                );
            })}

            {elements.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                    <Trash2 size={24} className="text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empty Layers</span>
                </div>
            )}
        </div>
    );
}
