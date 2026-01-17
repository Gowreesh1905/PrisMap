/**
 * @fileoverview Professional infinite canvas with zoom/pan using Konva
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Star, RegularPolygon, Text, Arrow } from 'react-konva';
import {
    MousePointer2, Pencil, Type, Square, Circle as CircleIcon, Triangle,
    Star as StarIcon, ArrowRight, Minus, Hexagon, Pentagon, Trash2,
    ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';

const CANVAS_WIDTH = typeof window !== 'undefined' ? window.innerWidth - 480 : 1200;
const CANVAS_HEIGHT = typeof window !== 'undefined' ? window.innerHeight - 56 : 800;

/**
 * Main canvas page with infinite canvas
 */
export default function CanvasPage() {
    const stageRef = useRef(null);
    const [tool, setTool] = useState('pen');
    const [elements, setElements] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    // Drawing settings
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [fillColor, setFillColor] = useState('#8b3dff');
    const [strokeWidth, setStrokeWidth] = useState(2);

    // Zoom and pan
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    /**
     * Handle mouse down - start drawing
     */
    const handleMouseDown = (e) => {
        if (tool === 'select') {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                setSelectedId(null);
            }
            return;
        }

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const adjustedPoint = {
            x: (point.x - stagePos.x) / stageScale,
            y: (point.y - stagePos.y) / stageScale,
        };

        if (tool === 'pen') {
            setIsDrawing(true);
            setCurrentPoints([adjustedPoint.x, adjustedPoint.y]);
        } else if (tool === 'text') {
            const newText = {
                id: Date.now(),
                type: 'text',
                x: adjustedPoint.x,
                y: adjustedPoint.y,
                text: 'Double click to edit',
                fontSize: 24,
                fill: strokeColor,
            };
            setElements([...elements, newText]);
            setSelectedId(newText.id);
        } else {
            setIsDrawing(true);
            setCurrentPoints([adjustedPoint.x, adjustedPoint.y]);
        }
    };

    /**
     * Handle mouse move - continue drawing
     */
    const handleMouseMove = (e) => {
        if (!isDrawing) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const adjustedPoint = {
            x: (point.x - stagePos.x) / stageScale,
            y: (point.y - stagePos.y) / stageScale,
        };

        if (tool === 'pen') {
            setCurrentPoints([...currentPoints, adjustedPoint.x, adjustedPoint.y]);
        } else {
            setCurrentPoints([currentPoints[0], currentPoints[1], adjustedPoint.x, adjustedPoint.y]);
        }
    };

    /**
     * Handle mouse up - finish drawing
     */
    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentPoints.length < 4) {
            setCurrentPoints([]);
            return;
        }

        if (tool === 'pen') {
            const newLine = {
                id: Date.now(),
                type: 'pen',
                points: currentPoints,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
            };
            setElements([...elements, newLine]);
        } else if (tool !== 'select' && tool !== 'text') {
            const [x1, y1, x2, y2] = currentPoints;
            const newShape = {
                id: Date.now(),
                type: tool,
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
            };
            setElements([...elements, newShape]);
        }

        setCurrentPoints([]);
    };

    /**
     * Handle wheel - zoom in/out
     */
    const handleWheel = (e) => {
        e.evt.preventDefault();

        const scaleBy = 1.1;
        const stage = stageRef.current;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        // Limit zoom
        const limitedScale = Math.max(0.1, Math.min(5, newScale));

        setStageScale(limitedScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * limitedScale,
            y: pointer.y - mousePointTo.y * limitedScale,
        });
    };

    /**
     * Zoom in
     */
    const zoomIn = () => {
        const newScale = Math.min(5, stageScale * 1.2);
        setStageScale(newScale);
    };

    /**
     * Zoom out
     */
    const zoomOut = () => {
        const newScale = Math.max(0.1, stageScale / 1.2);
        setStageScale(newScale);
    };

    /**
     * Reset zoom
     */
    const resetZoom = () => {
        setStageScale(1);
        setStagePos({ x: 0, y: 0 });
    };

    /**
     * Clear canvas
     */
    const clearCanvas = useCallback(() => {
        setElements(prevElements => {
            if (prevElements.length === 0) return prevElements;

            if (window.confirm('Clear the entire canvas?')) {
                setSelectedId(null);
                return [];
            }
            return prevElements;
        });
    }, []);

    /**
     * Delete selected element
     */
    const deleteSelected = () => {
        if (!selectedId) return;
        setElements(elements.filter(el => el.id !== selectedId));
        setSelectedId(null);
    };

    /**
     * Handle text double click
     */
    const handleTextDblClick = useCallback((id) => {
        const textNode = stageRef.current.findOne(`#text-${id}`);
        if (!textNode) return;

        const textPosition = textNode.absolutePosition();

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        textarea.value = textNode.text();
        textarea.style.position = 'absolute';
        textarea.style.top = textPosition.y + 'px';
        textarea.style.left = textPosition.x + 'px';
        textarea.style.width = Math.max(textNode.width(), 200) + 'px';
        textarea.style.fontSize = textNode.fontSize() + 'px';
        textarea.style.border = '2px solid #8b3dff';
        textarea.style.padding = '4px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'white';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.transformOrigin = 'left top';
        textarea.style.zIndex = '1000';
        textarea.style.fontFamily = 'Arial';

        textarea.focus();
        textarea.select();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(textarea);
            }
        };

        const handleBlur = () => {
            const newText = textarea.value;
            // Use functional update to avoid closure issues
            setElements(prevElements =>
                prevElements.map(el =>
                    el.id === id ? { ...el, text: newText } : el
                )
            );
            try {
                document.body.removeChild(textarea);
            } catch (e) {
                // Already removed
            }
        };

        textarea.addEventListener('keydown', handleKeyDown);
        textarea.addEventListener('blur', handleBlur);
    }, []);

    /**
     * Render shape based on type
     */
    const renderShape = (shape) => {
        const isSelected = shape.id === selectedId;
        const commonProps = {
            id: `shape-${shape.id}`,
            onClick: () => tool === 'select' && setSelectedId(shape.id),
            draggable: tool === 'select',
            onDragEnd: (e) => {
                setElements(prevElements => prevElements.map(el =>
                    el.id === shape.id
                        ? { ...el, x: e.target.x(), y: e.target.y() }
                        : el
                ));
            },
            stroke: isSelected ? '#8b3dff' : (shape.stroke || strokeColor),
            strokeWidth: isSelected ? strokeWidth + 2 : (shape.strokeWidth || strokeWidth),
            dash: isSelected ? [5, 5] : undefined,
        };

        switch (shape.type) {
            case 'pen':
                return (
                    <Line
                        key={shape.id}
                        {...commonProps}
                        points={shape.points}
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                        hitStrokeWidth={20}
                    />
                );

            case 'rectangle':
                return (
                    <Rect
                        key={shape.id}
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        width={shape.width}
                        height={shape.height}
                        fill={shape.fill}
                    />
                );

            case 'circle':
                return (
                    <Circle
                        key={shape.id}
                        {...commonProps}
                        x={shape.x + shape.width / 2}
                        y={shape.y + shape.height / 2}
                        radius={Math.min(shape.width, shape.height) / 2}
                        fill={shape.fill}
                    />
                );

            case 'triangle':
                return (
                    <RegularPolygon
                        key={shape.id}
                        {...commonProps}
                        x={shape.x + shape.width / 2}
                        y={shape.y + shape.height / 2}
                        sides={3}
                        radius={Math.min(shape.width, shape.height) / 2}
                        fill={shape.fill}
                    />
                );

            case 'star':
                return (
                    <Star
                        key={shape.id}
                        {...commonProps}
                        x={shape.x + shape.width / 2}
                        y={shape.y + shape.height / 2}
                        numPoints={5}
                        innerRadius={Math.min(shape.width, shape.height) / 4}
                        outerRadius={Math.min(shape.width, shape.height) / 2}
                        fill={shape.fill}
                    />
                );

            case 'hexagon':
                return (
                    <RegularPolygon
                        key={shape.id}
                        {...commonProps}
                        x={shape.x + shape.width / 2}
                        y={shape.y + shape.height / 2}
                        sides={6}
                        radius={Math.min(shape.width, shape.height) / 2}
                        fill={shape.fill}
                    />
                );

            case 'pentagon':
                return (
                    <RegularPolygon
                        key={shape.id}
                        {...commonProps}
                        x={shape.x + shape.width / 2}
                        y={shape.y + shape.height / 2}
                        sides={5}
                        radius={Math.min(shape.width, shape.height) / 2}
                        fill={shape.fill}
                    />
                );

            case 'arrow':
                if (shape.width && shape.height) {
                    return (
                        <Arrow
                            key={shape.id}
                            {...commonProps}
                            points={[shape.x, shape.y, shape.x + shape.width, shape.y + shape.height]}
                            fill={shape.fill}
                            pointerLength={20}
                            pointerWidth={20}
                        />
                    );
                }
                return null;

            case 'line':
                if (shape.width && shape.height) {
                    return (
                        <Line
                            key={shape.id}
                            {...commonProps}
                            points={[shape.x, shape.y, shape.x + shape.width, shape.y + shape.height]}
                        />
                    );
                }
                return null;

            case 'text':
                return (
                    <Text
                        key={shape.id}
                        {...commonProps}
                        id={`text-${shape.id}`}
                        x={shape.x}
                        y={shape.y}
                        text={shape.text}
                        fontSize={shape.fontSize || 24}
                        fill={shape.fill}
                        onDblClick={() => handleTextDblClick(shape.id)}
                    />
                );

            default:
                return null;
        }
    };

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'pen', icon: Pencil, label: 'Pen' },
        { id: 'text', icon: Type, label: 'Text' },
    ];

    const shapes = [
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: CircleIcon, label: 'Circle' },
        { id: 'triangle', icon: Triangle, label: 'Triangle' },
        { id: 'star', icon: StarIcon, label: 'Star' },
        { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
        { id: 'line', icon: Minus, label: 'Line' },
        { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
        { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    ];

    const selectedElement = elements.find(el => el.id === selectedId);

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">P</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight text-gray-900">
                            Pris<span className="text-purple-600">Map</span>
                        </span>
                    </div>
                    <div className="h-6 w-px bg-gray-300" />
                    <span className="text-sm text-gray-500 font-medium">Infinite Canvas</span>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={zoomOut}
                            className="p-2 hover:bg-white rounded transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} className="text-gray-700" />
                        </button>
                        <span className="px-3 text-sm font-medium text-gray-700 min-w-[60px] text-center">
                            {Math.round(stageScale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            className="p-2 hover:bg-white rounded transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} className="text-gray-700" />
                        </button>
                        <button
                            onClick={resetZoom}
                            className="p-2 hover:bg-white rounded transition-colors ml-1"
                            title="Reset Zoom"
                        >
                            <Maximize2 size={16} className="text-gray-700" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="w-[200px] bg-white border-r border-gray-200 p-4 overflow-y-auto shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Tools
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {tools.map((t) => {
                                const Icon = t.icon;
                                const isActive = tool === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTool(t.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${isActive
                                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span className="text-[9px] font-medium mt-1">{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Shapes
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {shapes.map((s) => {
                                const Icon = s.icon;
                                const isActive = tool === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setTool(s.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${isActive
                                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span className="text-[9px] font-medium mt-1">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <button
                            onClick={clearCanvas}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors border border-red-200"
                        >
                            <Trash2 size={16} />
                            Clear Canvas
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-hidden bg-gray-100">
                    <Stage
                        ref={stageRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onWheel={handleWheel}
                        scaleX={stageScale}
                        scaleY={stageScale}
                        x={stagePos.x}
                        y={stagePos.y}
                        draggable={tool === 'select' && !selectedId}
                    >
                        <Layer>
                            {/* Grid background */}
                            {Array.from({ length: 50 }).map((_, i) => (
                                <React.Fragment key={`grid-${i}`}>
                                    <Line
                                        points={[i * 50, 0, i * 50, 5000]}
                                        stroke="#e5e7eb"
                                        strokeWidth={1 / stageScale}
                                    />
                                    <Line
                                        points={[0, i * 50, 5000, i * 50]}
                                        stroke="#e5e7eb"
                                        strokeWidth={1 / stageScale}
                                    />
                                </React.Fragment>
                            ))}

                            {/* Render all elements */}
                            {elements.map(renderShape)}

                            {/* Current drawing preview */}
                            {isDrawing && currentPoints.length >= 2 && (
                                tool === 'pen' ? (
                                    <Line
                                        points={currentPoints}
                                        stroke={strokeColor}
                                        strokeWidth={strokeWidth}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                ) : currentPoints.length === 4 && (
                                    tool === 'rectangle' ? (
                                        <Rect
                                            x={Math.min(currentPoints[0], currentPoints[2])}
                                            y={Math.min(currentPoints[1], currentPoints[3])}
                                            width={Math.abs(currentPoints[2] - currentPoints[0])}
                                            height={Math.abs(currentPoints[3] - currentPoints[1])}
                                            fill={fillColor}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : tool === 'circle' ? (
                                        <Circle
                                            x={(currentPoints[0] + currentPoints[2]) / 2}
                                            y={(currentPoints[1] + currentPoints[3]) / 2}
                                            radius={Math.min(
                                                Math.abs(currentPoints[2] - currentPoints[0]),
                                                Math.abs(currentPoints[3] - currentPoints[1])
                                            ) / 2}
                                            fill={fillColor}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : null
                                )
                            )}
                        </Layer>
                    </Stage>
                </div>

                {/* Properties Panel */}
                <div className="w-[280px] bg-white border-l border-gray-200 p-6 overflow-y-auto shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Drawing Settings
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">
                                    Stroke Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={strokeColor}
                                        onChange={(e) => setStrokeColor(e.target.value)}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                                    />
                                    <input
                                        type="text"
                                        value={strokeColor}
                                        onChange={(e) => setStrokeColor(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">
                                    Fill Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={fillColor}
                                        onChange={(e) => setFillColor(e.target.value)}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                                    />
                                    <input
                                        type="text"
                                        value={fillColor}
                                        onChange={(e) => setFillColor(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">
                                    Stroke Width
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={strokeWidth}
                                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                        className="flex-1"
                                    />
                                    <input
                                        type="number"
                                        value={strokeWidth}
                                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                        className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
                                        min="1"
                                        max="20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedElement && (
                        <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                                Selected Element
                            </h3>
                            <p className="text-xs text-gray-500 capitalize mb-4">
                                {selectedElement.type}
                            </p>
                            <button
                                onClick={deleteSelected}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors border border-red-200"
                            >
                                <Trash2 size={16} />
                                Delete Element
                            </button>
                        </div>
                    )}

                    {!selectedElement && (
                        <div className="text-center text-gray-400 mt-12">
                            <div className="text-4xl mb-3">🎨</div>
                            <div className="text-sm font-medium">Infinite Canvas</div>
                            <div className="text-xs mt-2">
                                Scroll to zoom • Drag to pan
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}