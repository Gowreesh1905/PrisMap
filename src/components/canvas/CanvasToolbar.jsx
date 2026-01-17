/**
 * @fileoverview Enhanced canvas toolbar with drawing tools and shape library
 */

'use client';

import React from 'react';
import {
    MousePointer2, Pencil, Type, Square, Circle, Triangle,
    Star, ArrowRight, Minus, Hexagon, Pentagon, Trash2
} from 'lucide-react';

/**
 * Canvas toolbar component with tools and shapes
 * @param {Object} props - Component props
 * @param {string} props.activeTool - Currently active tool
 * @param {Function} props.onToolChange - Callback when tool is selected
 * @param {Function} props.onClear - Callback to clear canvas
 * @returns {JSX.Element} Canvas toolbar
 */
const CanvasToolbar = ({ activeTool, onToolChange, onClear }) => {
    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select', category: 'tools' },
        { id: 'pen', icon: Pencil, label: 'Pen', category: 'tools' },
        { id: 'text', icon: Type, label: 'Text', category: 'tools' },
    ];

    const shapes = [
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'triangle', icon: Triangle, label: 'Triangle' },
        { id: 'star', icon: Star, label: 'Star' },
        { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
        { id: 'line', icon: Minus, label: 'Line' },
        { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
        { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    ];

    /**
     * Render a tool button
     * @param {Object} tool - Tool configuration
     * @returns {JSX.Element} Tool button
     */
    const renderToolButton = (tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
            <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${isActive
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                title={tool.label}
            >
                <Icon size={20} />
                <span className="text-[9px] font-medium mt-1">{tool.label}</span>
            </button>
        );
    };

    return (
        <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            {/* Tools Section */}
            <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Tools
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {tools.map(renderToolButton)}
                </div>
            </div>

            {/* Shapes Section */}
            <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Shapes
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {shapes.map(renderToolButton)}
                </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200">
                <button
                    onClick={onClear}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                >
                    <Trash2 size={16} />
                    Clear Canvas
                </button>
            </div>
        </div>
    );
};

export default CanvasToolbar;
