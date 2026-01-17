/**
 * @fileoverview Professional canvas editor with pen drawing and shape tools
 * @description HTML5 Canvas-based drawing application with freehand pen tool,
 * multiple shapes, selection tool, and backend-ready data structure
 */

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import CanvasToolbar from '@/components/canvas/CanvasToolbar';
import PropertiesPanel from '@/components/canvas/PropertiesPanel';

/**
 * @typedef {Object} CanvasElement
 * @property {number} id - Unique identifier
 * @property {string} type - Element type: 'pen' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'arrow' | 'line' | 'text' | 'hexagon' | 'pentagon'
 * @property {Array<{x: number, y: number}>} [points] - Points for pen drawings
 * @property {number} [x] - X position (for shapes)
 * @property {number} [y] - Y position (for shapes)
 * @property {number} [width] - Width (for shapes)
 * @property {number} [height] - Height (for shapes)
 * @property {string} strokeColor - Stroke color
 * @property {string} fillColor - Fill color
 * @property {number} strokeWidth - Stroke width
 * @property {string} [content] - Text content (for text elements)
 * @property {number} [fontSize] - Font size (for text)
 */

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

/**
 * Canvas page component
 * @returns {JSX.Element} Canvas page
 */
export default function CanvasPage() {
    const canvasRef = useRef(null);
    const [elements, setElements] = useState([]);
    const [activeTool, setActiveTool] = useState('pen');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [startPos, setStartPos] = useState(null);
    const [selectedElement, setSelectedElement] = useState(null);

    // Drawing settings
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [fillColor, setFillColor] = useState('#8b3dff');
    const [strokeWidth, setStrokeWidth] = useState(2);

    /**
     * Get mouse position relative to canvas
     * @param {MouseEvent} e - Mouse event
     * @returns {{x: number, y: number}} Mouse position
     */
    const getMousePos = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    /**
     * Draw a star shape
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} outerRadius - Outer radius
     * @param {number} innerRadius - Inner radius
     * @param {number} points - Number of points
     */
    const drawStar = (ctx, cx, cy, outerRadius, innerRadius, points = 5) => {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    };

    /**
     * Draw a polygon
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} radius - Radius
     * @param {number} sides - Number of sides
     */
    const drawPolygon = (ctx, cx, cy, radius, sides) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    };

    /**
     * Render all elements on canvas
     */
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Render each element
        elements.forEach((element) => {
            ctx.strokeStyle = element.strokeColor;
            ctx.fillStyle = element.fillColor;
            ctx.lineWidth = element.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (element.type === 'pen' && element.points) {
                // Draw pen path
                if (element.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x, element.points[0].y);
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    ctx.stroke();
                }
            } else if (element.type === 'rectangle') {
                ctx.fillRect(element.x, element.y, element.width, element.height);
                ctx.strokeRect(element.x, element.y, element.width, element.height);
            } else if (element.type === 'circle') {
                const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2;
                const cx = element.x + element.width / 2;
                const cy = element.y + element.height / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (element.type === 'triangle') {
                const cx = element.x + element.width / 2;
                const cy = element.y + element.height / 2;
                const size = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy - size);
                ctx.lineTo(cx - size, cy + size);
                ctx.lineTo(cx + size, cy + size);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (element.type === 'star') {
                const cx = element.x + element.width / 2;
                const cy = element.y + element.height / 2;
                const outerRadius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2;
                const innerRadius = outerRadius * 0.4;
                drawStar(ctx, cx, cy, outerRadius, innerRadius);
                ctx.fill();
                ctx.stroke();
            } else if (element.type === 'arrow') {
                const headLength = 20;
                const angle = Math.atan2(element.height, element.width);
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(element.x + element.width, element.y + element.height);
                ctx.stroke();
                // Arrow head
                ctx.beginPath();
                ctx.moveTo(element.x + element.width, element.y + element.height);
                ctx.lineTo(
                    element.x + element.width - headLength * Math.cos(angle - Math.PI / 6),
                    element.y + element.height - headLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.moveTo(element.x + element.width, element.y + element.height);
                ctx.lineTo(
                    element.x + element.width - headLength * Math.cos(angle + Math.PI / 6),
                    element.y + element.height - headLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.stroke();
            } else if (element.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(element.x + element.width, element.y + element.height);
                ctx.stroke();
            } else if (element.type === 'hexagon') {
                const cx = element.x + element.width / 2;
                const cy = element.y + element.height / 2;
                const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2;
                drawPolygon(ctx, cx, cy, radius, 6);
                ctx.fill();
                ctx.stroke();
            } else if (element.type === 'pentagon') {
                const cx = element.x + element.width / 2;
                const cy = element.y + element.height / 2;
                const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2;
                drawPolygon(ctx, cx, cy, radius, 5);
                ctx.fill();
                ctx.stroke();
            } else if (element.type === 'text') {
                ctx.font = `${element.fontSize || 24}px Arial`;
                ctx.fillText(element.content || 'Text', element.x, element.y);
            }

            // Highlight selected element
            if (selectedElement && selectedElement.id === element.id) {
                ctx.strokeStyle = '#8b3dff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                if (element.type === 'pen' && element.points && element.points.length > 0) {
                    const xs = element.points.map(p => p.x);
                    const ys = element.points.map(p => p.y);
                    const minX = Math.min(...xs) - 5;
                    const minY = Math.min(...ys) - 5;
                    const maxX = Math.max(...xs) + 5;
                    const maxY = Math.max(...ys) + 5;
                    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
                } else if (element.x !== undefined) {
                    ctx.strokeRect(element.x - 5, element.y - 5, element.width + 10, element.height + 10);
                }
                ctx.setLineDash([]);
            }
        });
    }, [elements, selectedElement]);

    // Re-render canvas when elements change
    useEffect(() => {
        renderCanvas();
    }, [renderCanvas]);

    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    const handleMouseDown = (e) => {
        const pos = getMousePos(e);

        if (activeTool === 'select') {
            // Find clicked element
            const clicked = elements.find((el) => {
                if (el.type === 'pen' && el.points) {
                    const xs = el.points.map(p => p.x);
                    const ys = el.points.map(p => p.y);
                    const minX = Math.min(...xs);
                    const minY = Math.min(...ys);
                    const maxX = Math.max(...xs);
                    const maxY = Math.max(...ys);
                    return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
                }
                return (
                    pos.x >= el.x &&
                    pos.x <= el.x + el.width &&
                    pos.y >= el.y &&
                    pos.y <= el.y + el.height
                );
            });
            setSelectedElement(clicked || null);
            return;
        }

        if (activeTool === 'pen') {
            setIsDrawing(true);
            setCurrentPath([pos]);
        } else if (activeTool === 'text') {
            const newElement = {
                id: Date.now(),
                type: 'text',
                x: pos.x,
                y: pos.y,
                width: 200,
                height: 30,
                strokeColor,
                fillColor: strokeColor,
                strokeWidth,
                content: 'Double click to edit',
                fontSize: 24,
            };
            setElements([...elements, newElement]);
            setSelectedElement(newElement);
        } else {
            // Shape tools
            setIsDrawing(true);
            setStartPos(pos);
        }
    };

    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    const handleMouseMove = (e) => {
        if (!isDrawing) return;

        const pos = getMousePos(e);

        if (activeTool === 'pen') {
            setCurrentPath((prev) => [...prev, pos]);

            // Draw current path in real-time
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            renderCanvas();

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (currentPath.length > 0) {
                ctx.beginPath();
                ctx.moveTo(currentPath[0].x, currentPath[0].y);
                currentPath.forEach((point) => ctx.lineTo(point.x, point.y));
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        } else if (startPos) {
            // Preview shape while dragging
            renderCanvas();
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = strokeColor;
            ctx.fillStyle = fillColor;
            ctx.lineWidth = strokeWidth;

            const width = pos.x - startPos.x;
            const height = pos.y - startPos.y;

            if (activeTool === 'rectangle') {
                ctx.fillRect(startPos.x, startPos.y, width, height);
                ctx.strokeRect(startPos.x, startPos.y, width, height);
            } else if (activeTool === 'circle') {
                const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
                const cx = startPos.x + width / 2;
                const cy = startPos.y + height / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (activeTool === 'line') {
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            } else if (activeTool === 'arrow') {
                const headLength = 20;
                const angle = Math.atan2(height, width);
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(
                    pos.x - headLength * Math.cos(angle - Math.PI / 6),
                    pos.y - headLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(
                    pos.x - headLength * Math.cos(angle + Math.PI / 6),
                    pos.y - headLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.stroke();
            }
        }
    };

    /**
     * Handle mouse up event
     */
    const handleMouseUp = (e) => {
        if (!isDrawing) return;

        const pos = getMousePos(e);

        if (activeTool === 'pen' && currentPath.length > 1) {
            const newElement = {
                id: Date.now(),
                type: 'pen',
                points: [...currentPath, pos],
                strokeColor,
                fillColor,
                strokeWidth,
            };
            setElements([...elements, newElement]);
            setCurrentPath([]);
        } else if (startPos && activeTool !== 'pen') {
            const width = pos.x - startPos.x;
            const height = pos.y - startPos.y;

            if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                const newElement = {
                    id: Date.now(),
                    type: activeTool,
                    x: startPos.x,
                    y: startPos.y,
                    width,
                    height,
                    strokeColor,
                    fillColor,
                    strokeWidth,
                };
                setElements([...elements, newElement]);
            }
            setStartPos(null);
        }

        setIsDrawing(false);
    };

    /**
     * Clear all elements from canvas
     */
    const handleClear = () => {
        if (elements.length === 0) return;
        if (window.confirm('Clear the entire canvas?')) {
            setElements([]);
            setSelectedElement(null);
        }
    };

    /**
     * Delete selected element
     * @param {number} id - Element ID
     */
    const handleDeleteElement = (id) => {
        setElements(elements.filter((el) => el.id !== id));
        setSelectedElement(null);
    };

    /**
     * Update element properties
     * @param {number} id - Element ID
     * @param {Object} updates - Property updates
     */
    const handleUpdateElement = (id, updates) => {
        setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
        if (selectedElement && selectedElement.id === id) {
            setSelectedElement({ ...selectedElement, ...updates });
        }
    };

    // Log canvas data for backend integration
    useEffect(() => {
        if (elements.length > 0) {
            console.log('Canvas Data:', JSON.stringify(elements, null, 2));
        }
    }, [elements]);

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50">
            {/* Header */}
            <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-tight text-gray-900">
                        Pris<span className="text-purple-600">Map</span>
                    </span>
                    <span className="text-sm text-gray-400 font-medium">Canvas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Auto-saved</span>
                </div>
            </header>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar */}
                <CanvasToolbar
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    onClear={handleClear}
                />

                {/* Canvas area */}
                <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 overflow-auto">
                    <div className="relative">
                        <div className="absolute -top-6 left-0 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Canvas — {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
                        </div>
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className="bg-white shadow-2xl cursor-crosshair"
                        />
                    </div>
                </div>

                {/* Properties panel */}
                <PropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleUpdateElement}
                    onDeleteElement={handleDeleteElement}
                    strokeColor={strokeColor}
                    fillColor={fillColor}
                    strokeWidth={strokeWidth}
                    onStrokeColorChange={setStrokeColor}
                    onFillColorChange={setFillColor}
                    onStrokeWidthChange={setStrokeWidth}
                />
            </div>
        </div>
    );
}