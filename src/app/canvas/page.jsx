/**
 * @fileoverview Professional infinite canvas with zoom/pan using Konva
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Star, RegularPolygon, Text, Arrow, Group } from 'react-konva';
import {
    MousePointer2, Pencil, Type, Square, Circle as CircleIcon, Triangle,
    Star as StarIcon, ArrowRight, Minus, Hexagon, Pentagon, Trash2,
    ZoomIn, ZoomOut, Maximize2, Eraser, Undo, Redo
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
    const [history, setHistory] = useState([[]]);
    const [historyStep, setHistoryStep] = useState(0);
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
     * Save current state to history
     */
    const saveToHistory = useCallback((newElements) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
        setElements(newElements);
    }, [history, historyStep]);

    /**
     * Undo last action
     */
    const undo = useCallback(() => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            setElements(history[newStep]);
            setSelectedId(null);
        }
    }, [history, historyStep]);

    /**
     * Redo last undone action
     */
    const redo = useCallback(() => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            setElements(history[newStep]);
            setSelectedId(null);
        }
    }, [history, historyStep]);

    /**
     * Keyboard shortcuts
     */
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

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

        if (tool === 'pen' || tool === 'eraser') {
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
            saveToHistory([...elements, newText]);
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

        if (tool === 'pen' || tool === 'eraser') {
            setCurrentPoints([...currentPoints, adjustedPoint.x, adjustedPoint.y]);

            // For eraser, split strokes at intersection points
            if (tool === 'eraser' && currentPoints.length >= 2) {
                const eraserRadius = strokeWidth * 3;
                const newElements = [];
                let segmentCounter = 0;

                elements.forEach(el => {
                    if (el.type !== 'pen') {
                        newElements.push(el);
                        return;
                    }

                    // Split the stroke into segments, removing points within eraser radius
                    const segments = [];
                    let currentSegment = [];

                    for (let i = 0; i < el.points.length; i += 2) {
                        const dx = el.points[i] - adjustedPoint.x;
                        const dy = el.points[i + 1] - adjustedPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < eraserRadius) {
                            // Point is being erased
                            if (currentSegment.length >= 4) {
                                // Save current segment if it has at least 2 points
                                segments.push([...currentSegment]);
                            }
                            currentSegment = [];
                        } else {
                            // Point survives
                            currentSegment.push(el.points[i], el.points[i + 1]);
                        }
                    }

                    // Don't forget the last segment
                    if (currentSegment.length >= 4) {
                        segments.push(currentSegment);
                    }

                    // Create new stroke elements for each segment
                    segments.forEach(segmentPoints => {
                        newElements.push({
                            ...el,
                            id: `${Date.now()}-${segmentCounter++}-${Math.random()}`, // Truly unique ID
                            points: segmentPoints,
                        });
                    });
                });

                if (newElements.length !== elements.length ||
                    newElements.some((el, i) => el.id !== elements[i]?.id)) {
                    setElements(newElements);
                }
            }
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
            saveToHistory([...elements, newLine]);
        } else if (tool === 'eraser') {
            // Save the erased state to history
            saveToHistory(elements);
        } else if (tool !== 'select' && tool !== 'text') {
            const [x1, y1, x2, y2] = currentPoints;

            // Lines and arrows store actual points for better hit detection
            if (tool === 'line' || tool === 'arrow') {
                const newShape = {
                    id: Date.now(),
                    type: tool,
                    points: [x1, y1, x2, y2],
                    fill: fillColor,
                    stroke: strokeColor,
                    strokeWidth: strokeWidth,
                };
                saveToHistory([...elements, newShape]);
            } else {
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
                saveToHistory([...elements, newShape]);
            }
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
     * Clear canvas - simple direct approach
     */
    const clearCanvas = () => {
        if (!window.confirm('Clear the entire canvas?')) return;

        setSelectedId(null);
        saveToHistory([]);  // This will call setElements([]) internally
    };

    /**
     * Delete selected element
     */
    const deleteSelected = () => {
        if (!selectedId) return;
        const newElements = elements.filter(el => el.id !== selectedId);
        saveToHistory(newElements);
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
    const renderShape = (shape, index, allElements) => {
        const isSelected = shape.id === selectedId;

        // Check if any line/arrow above this shape is selected (to disable click-through)
        const lineOrArrowSelectedAbove = allElements.slice(index + 1).some(
            el => (el.type === 'line' || el.type === 'arrow') && el.id === selectedId
        );

        const commonProps = {
            id: `shape-${shape.id}`,
            onClick: () => tool === 'select' && setSelectedId(shape.id),
            draggable: tool === 'select' && !lineOrArrowSelectedAbove,
            listening: !lineOrArrowSelectedAbove || shape.id === selectedId,
            onDragEnd: (e) => {
                if (shape.type === 'line' || shape.type === 'arrow') {
                    // For lines/arrows, update points based on drag delta
                    const dx = e.target.x();
                    const dy = e.target.y();
                    setElements(prevElements => prevElements.map(el =>
                        el.id === shape.id
                            ? {
                                ...el,
                                points: [
                                    el.points[0] + dx,
                                    el.points[1] + dy,
                                    el.points[2] + dx,
                                    el.points[3] + dy
                                ]
                            }
                            : el
                    ));
                    e.target.position({ x: 0, y: 0 }); // Reset position since we updated points
                } else {
                    setElements(prevElements => prevElements.map(el =>
                        el.id === shape.id
                            ? { ...el, x: e.target.x(), y: e.target.y() }
                            : el
                    ));
                }
            },
            stroke: isSelected ? '#8b3dff' : (shape.stroke || strokeColor),
            strokeWidth: isSelected ? (shape.strokeWidth || strokeWidth) + 2 : (shape.strokeWidth || strokeWidth),
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

            case 'arrow': {
                const pts = shape.points || [shape.x, shape.y, shape.x + (shape.width || 0), shape.y + (shape.height || 0)];
                return (
                    <Group
                        key={shape.id}
                        draggable={commonProps.draggable}
                        onClick={commonProps.onClick}
                        onDragEnd={commonProps.onDragEnd}
                    >
                        {/* Invisible thick line for hit detection */}
                        <Line
                            points={pts}
                            stroke="transparent"
                            strokeWidth={40}
                            lineCap="round"
                        />
                        {/* Visible arrow */}
                        <Arrow
                            points={pts}
                            stroke={commonProps.stroke}
                            strokeWidth={commonProps.strokeWidth}
                            dash={commonProps.dash}
                            fill={shape.fill || commonProps.stroke}
                            pointerLength={20}
                            pointerWidth={20}
                            listening={false}
                        />
                    </Group>
                );
            }

            case 'line': {
                const pts = shape.points || [shape.x, shape.y, shape.x + (shape.width || 0), shape.y + (shape.height || 0)];
                return (
                    <Group
                        key={shape.id}
                        draggable={commonProps.draggable}
                        onClick={commonProps.onClick}
                        onDragEnd={commonProps.onDragEnd}
                    >
                        {/* Invisible thick line for hit detection */}
                        <Line
                            points={pts}
                            stroke="transparent"
                            strokeWidth={40}
                            lineCap="round"
                        />
                        {/* Visible line */}
                        <Line
                            points={pts}
                            stroke={commonProps.stroke}
                            strokeWidth={commonProps.strokeWidth}
                            dash={commonProps.dash}
                            lineCap="round"
                            listening={false}
                        />
                    </Group>
                );
            }

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
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
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

                {/* Undo/Redo and Zoom controls */}
                <div className="flex items-center gap-2">
                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-2">
                        <button
                            onClick={undo}
                            disabled={historyStep === 0}
                            className={`p-2 rounded transition-colors ${historyStep === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-white text-gray-700'
                                }`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={16} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyStep >= history.length - 1}
                            className={`p-2 rounded transition-colors ${historyStep >= history.length - 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-white text-gray-700'
                                }`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={16} />
                        </button>
                    </div>

                    {/* Zoom */}
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
                            {/* Truly infinite grid background */}
                            {(() => {
                                const gridSize = 50;
                                const scaledGridSize = gridSize * stageScale;

                                // Calculate visible area in canvas coordinates
                                const startX = Math.floor((-stagePos.x / stageScale) / gridSize) * gridSize;
                                const startY = Math.floor((-stagePos.y / stageScale) / gridSize) * gridSize;
                                const endX = startX + Math.ceil(CANVAS_WIDTH / stageScale) + gridSize;
                                const endY = startY + Math.ceil(CANVAS_HEIGHT / stageScale) + gridSize;

                                const lines = [];

                                // Vertical lines
                                for (let x = startX; x <= endX; x += gridSize) {
                                    lines.push(
                                        <Line
                                            key={`v-${x}`}
                                            points={[x, startY - gridSize, x, endY + gridSize]}
                                            stroke="#e5e7eb"
                                            strokeWidth={1 / stageScale}
                                            listening={false}
                                        />
                                    );
                                }

                                // Horizontal lines
                                for (let y = startY; y <= endY; y += gridSize) {
                                    lines.push(
                                        <Line
                                            key={`h-${y}`}
                                            points={[startX - gridSize, y, endX + gridSize, y]}
                                            stroke="#e5e7eb"
                                            strokeWidth={1 / stageScale}
                                            listening={false}
                                        />
                                    );
                                }

                                return lines;
                            })()}

                            {/* Render all elements */}
                            {elements.map((shape, index, arr) => renderShape(shape, index, arr))}

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