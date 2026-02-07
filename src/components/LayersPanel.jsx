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
    const getElementLabel = (el) => {
        if (el.type === 'text') return el.text?.substring(0, 15) || 'Text';
        if (el.type === 'pen') return 'Stroke';
        if (el.type === 'image') return 'Image';
        return el.type.charAt(0).toUpperCase() + el.type.slice(1);
    };

    const getElementIcon = (type) => {
        const icons = {
            rectangle: '⬜', circle: '⭕', triangle: '🔺', star: '⭐',
            pentagon: '⬠', hexagon: '⬡', text: '📝', pen: '✏️',
            arrow: '➡️', line: '➖', image: '🖼️'
        };
        return icons[type] || '📦';
    };

    return (
        <div className="space-y-2">
            {elements.slice().reverse().map((el, idx) => {
                const isSelected = selectedIds.includes(el.id);
                const isVisible = el.visible !== false;
                const isLocked = el.locked === true;

                return (
                    <div
                        key={el.id}
                        onClick={() => onSelectElement(el.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${isSelected
                                ? 'bg-purple-100 border border-purple-300'
                                : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                            } ${!isVisible ? 'opacity-50' : ''}`}
                    >
                        <span className="text-lg">{getElementIcon(el.type)}</span>

                        <span className="flex-1 text-xs font-medium truncate">
                            {getElementLabel(el)}
                        </span>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title={isVisible ? 'Hide' : 'Show'}
                            >
                                {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title={isLocked ? 'Unlock' : 'Lock'}
                            >
                                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveUp(el.id); }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Move Up"
                            >
                                <ChevronUp size={12} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveDown(el.id); }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Move Down"
                            >
                                <ChevronDown size={12} />
                            </button>
                        </div>
                    </div>
                );
            })}

            {elements.length === 0 && (
                <div className="text-center text-gray-400 py-4 text-xs">
                    No layers yet
                </div>
            )}
        </div>
    );
}
