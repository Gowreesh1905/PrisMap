/**
 * @fileoverview Properties panel for editing canvas elements
 */

'use client';

import React from 'react';
import { Palette, Trash2, Paintbrush } from 'lucide-react';

/**
 * Properties panel component
 * @param {Object} props - Component props
 * @param {Object|null} props.selectedElement - Currently selected element
 * @param {Function} props.onUpdateElement - Callback to update element
 * @param {Function} props.onDeleteElement - Callback to delete element
 * @param {string} props.strokeColor - Current stroke color
 * @param {string} props.fillColor - Current fill color
 * @param {number} props.strokeWidth - Current stroke width
 * @param {Function} props.onStrokeColorChange - Callback for stroke color change
 * @param {Function} props.onFillColorChange - Callback for fill color change
 * @param {Function} props.onStrokeWidthChange - Callback for stroke width change
 * @returns {JSX.Element} Properties panel
 */
const PropertiesPanel = ({
    selectedElement,
    onUpdateElement,
    onDeleteElement,
    strokeColor,
    fillColor,
    strokeWidth,
    onStrokeColorChange,
    onFillColorChange,
    onStrokeWidthChange,
}) => {
    if (!selectedElement) {
        return (
            <div className="w-[280px] bg-white border-l border-gray-200 p-6">
                {/* Drawing Settings (always visible) */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                        Drawing Settings
                    </h3>

                    {/* Stroke Color */}
                    <div className="mb-4">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                            <Paintbrush size={14} />
                            Stroke Color
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={strokeColor}
                                onChange={(e) => onStrokeColorChange(e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                            />
                            <input
                                type="text"
                                value={strokeColor}
                                onChange={(e) => onStrokeColorChange(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                            />
                        </div>
                    </div>

                    {/* Fill Color */}
                    <div className="mb-4">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                            <Palette size={14} />
                            Fill Color
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={fillColor}
                                onChange={(e) => onFillColorChange(e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                            />
                            <input
                                type="text"
                                value={fillColor}
                                onChange={(e) => onFillColorChange(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                            />
                        </div>
                    </div>

                    {/* Stroke Width */}
                    <div className="mb-4">
                        <label className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider block">
                            Stroke Width
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={strokeWidth}
                                onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <input
                                type="number"
                                value={strokeWidth}
                                onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
                                className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
                                min="1"
                                max="20"
                            />
                        </div>
                    </div>
                </div>

                <div className="text-center text-gray-400 mt-12">
                    <div className="text-4xl mb-3">👆</div>
                    <div className="text-sm font-medium">No element selected</div>
                    <div className="text-xs mt-2">
                        Use Select tool to edit elements
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[280px] bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">
                    Selected Element
                </h3>
                <p className="text-xs text-gray-500 capitalize">
                    {selectedElement.type}
                </p>
            </div>

            {/* Element-specific properties */}
            {selectedElement.type === 'text' && (
                <div className="mb-6">
                    <label className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider block">
                        Text Content
                    </label>
                    <textarea
                        value={selectedElement.content || ''}
                        onChange={(e) => onUpdateElement(selectedElement.id, { content: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                        rows="3"
                    />
                </div>
            )}

            {/* Delete button */}
            <div className="pt-4 border-t border-gray-200">
                <button
                    onClick={() => onDeleteElement(selectedElement.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                >
                    <Trash2 size={16} />
                    Delete Element
                </button>
            </div>
        </div>
    );
};

export default PropertiesPanel;
