/**
 * @fileoverview Professional infinite canvas with zoom/pan using Konva
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Star, RegularPolygon, Text, Arrow, Group } from 'react-konva';
import {
    MousePointer2, Pencil, Type, Square, Circle as CircleIcon, Triangle,
    Star as StarIcon, ArrowRight, Minus, Hexagon, Pentagon, Trash2,
    ZoomIn, ZoomOut, Maximize2, Eraser, Undo, Redo, Settings, LogOut
} from 'lucide-react';
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

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
    const [user, setUser] = useState(null);
    const router = useRouter();

    // Handle Authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (curr) => {
            if (!curr) {
                router.push("/");
            } else {
                setUser(curr);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/");
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

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
     * Delete selected element
     */
    const deleteSelected = useCallback(() => {
        if (!selectedId) return;
        const newElements = elements.filter(el => el.id !== selectedId);
        saveToHistory(newElements);
        setSelectedId(null);
    }, [selectedId, elements, saveToHistory]);

    /**
     * Keyboard shortcuts - using capture phase to override browser defaults
     */
    useEffect(() => {
        const handleKeyDown = (e) => {
            // DEBUG: Log all key events
            console.log('[Shortcut Debug]', {
                key: e.key,
                code: e.code,
                ctrl: e.ctrlKey,
                meta: e.metaKey,
                alt: e.altKey,
                shift: e.shiftKey,
                target: e.target.tagName,
            });

            // Don't trigger shortcuts when typing in inputs
            const target = e.target;
            const tagName = target.tagName.toUpperCase();
            if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
                console.log('[Shortcut Debug] Skipping - in input field');
                return;
            }

            let handled = false;

            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                console.log('[Shortcut Debug] Triggering UNDO');
                undo();
                handled = true;
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                console.log('[Shortcut Debug] Triggering REDO');
                redo();
                handled = true;
            }
            // Save: Ctrl+S (show notification)
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                console.log('[Shortcut Debug] Triggering SAVE');
                const notification = document.createElement('div');
                notification.textContent = '✓ Canvas saved';
                notification.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;z-index:9999;';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
                handled = true;
            }
            // Delete: Delete or Backspace
            else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    console.log('[Shortcut Debug] Triggering DELETE');
                    deleteSelected();
                    handled = true;
                }
            }
            // Escape: Deselect or cancel current action
            else if (e.key === 'Escape') {
                console.log('[Shortcut Debug] Triggering ESCAPE');
                setSelectedId(null);
                setIsDrawing(false);
                setCurrentPoints([]);
                handled = true;
            }
            // Number keys for tool selection (1-9) - no modifiers
            else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                const toolMap = {
                    '1': 'select',
                    '2': 'pen',
                    '3': 'eraser',
                    '4': 'text',
                    '5': 'rectangle',
                    '6': 'circle',
                    '7': 'triangle',
                    '8': 'star',
                    '9': 'arrow',
                };
                if (toolMap[e.key]) {
                    console.log('[Shortcut Debug] Triggering TOOL SELECT:', toolMap[e.key]);
                    setTool(toolMap[e.key]);
                    handled = true;
                }
            }

            // If we handled the shortcut, prevent default and stop propagation
            if (handled) {
                console.log('[Shortcut Debug] Handled! Preventing default.');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };

        // Use capture phase (true) to intercept events before other handlers
        // Using document instead of window for better compatibility
        document.addEventListener('keydown', handleKeyDown, true);
        console.log('[Shortcut Debug] Keyboard listener attached');

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            console.log('[Shortcut Debug] Keyboard listener removed');
        };
    }, [undo, redo, selectedId, deleteSelected]);

    /**
     * Disable browser touch gestures and selection on the canvas container
     */
    useEffect(() => {
        let nativeTouchCleanup = null;

        const fixContainer = () => {
            if (stageRef.current) {
                const container = stageRef.current.container();
                if (container) {
                    container.style.touchAction = 'none';
                    container.style.userSelect = 'none';
                    container.style.webkitUserSelect = 'none';
                    container.style.webkitTouchCallout = 'none';

                    // Native touch event listeners with { passive: false } to
                    // reliably prevent browser scroll/zoom during drawing
                    const preventTouch = (e) => { e.preventDefault(); };
                    container.addEventListener('touchstart', preventTouch, { passive: false });
                    container.addEventListener('touchmove', preventTouch, { passive: false });

                    nativeTouchCleanup = () => {
                        container.removeEventListener('touchstart', preventTouch);
                        container.removeEventListener('touchmove', preventTouch);
                    };
                }
            }
        };

        fixContainer();
        const timeout = setTimeout(fixContainer, 500);

        return () => {
            clearTimeout(timeout);
            nativeTouchCleanup?.();
        };
    }, []);

    /**
     * Refs to hold latest state for pointer handlers (to avoid stale closures/async lag)
     */
    const isDrawingRef = useRef(isDrawing);
    const currentPointsRef = useRef(currentPoints);
    const elementsRef = useRef(elements);
    const toolRef = useRef(tool);
    const strokeColorRef = useRef(strokeColor);
    const fillColorRef = useRef(fillColor);
    const strokeWidthRef = useRef(strokeWidth);

    useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
    useEffect(() => { currentPointsRef.current = currentPoints; }, [currentPoints]);
    useEffect(() => { elementsRef.current = elements; }, [elements]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { strokeColorRef.current = strokeColor; }, [strokeColor]);
    useEffect(() => { fillColorRef.current = fillColor; }, [fillColor]);
    useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);

    /**
     * Pinch-to-zoom state
     */
    const lastDistanceRef = useRef(null);
    const lastCenterRef = useRef(null);
    const isPinchingRef = useRef(false);

    /**
     * Handle pointer down - start drawing or selection
     */
    const handlePointerDown = (e) => {
        // Prevent default browser behaviors like scrolling or text selection
        if (e.evt && e.evt.preventDefault) e.evt.preventDefault();

        // 1. Strict Primary Pointer Check: Ignore secondary touches (for pinch/zoom)
        if (e.evt && e.evt.isPrimary === false) return;

        // 2. Handle Multi-Touch: If more than 1 finger is detectable, abort drawing
        const isMultiTouch = e.evt && (
            (e.evt.touches && e.evt.touches.length > 1) ||
            (e.evt.targetTouches && e.evt.targetTouches.length > 1)
        );

        if (isMultiTouch) {
            isDrawingRef.current = false;
            setIsDrawing(false);
            setCurrentPoints([]);
            return;
        }

        // 3. Mouse Button Check: If it's a mouse, only allow left click (button 0)
        if (e.evt && e.evt.pointerType === 'mouse' && e.evt.button !== 0) return;

        const currentTool = toolRef.current;

        // Selection mode
        if (currentTool === 'select') {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                setSelectedId(null);
            }
            return;
        }

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        if (!point) return;

        const adjustedPoint = {
            x: (point.x - stagePos.x) / stageScale,
            y: (point.y - stagePos.y) / stageScale,
        };

        if (currentTool === 'text') {
            const newText = {
                id: Date.now(),
                type: 'text',
                x: adjustedPoint.x,
                y: adjustedPoint.y,
                text: 'Double click to edit',
                fontSize: 24,
                fill: strokeColorRef.current,
            };
            saveToHistory([...elementsRef.current, newText]);
            setSelectedId(newText.id);
            return;
        }

        // Initialize drawing for all other tools
        isDrawingRef.current = true;
        currentPointsRef.current = [adjustedPoint.x, adjustedPoint.y];
        setIsDrawing(true);
        setCurrentPoints([adjustedPoint.x, adjustedPoint.y]);
    };

    /**
     * Handle pointer move - continue drawing
     */
    const handlePointerMove = (e) => {
        if (!isDrawingRef.current) return;

        // 1. Ensure this is still the primary pointer
        if (e.evt && e.evt.isPrimary === false) return;

        // 2. Continuous Multi-Touch Check
        const isMultiTouch = e.evt && (
            (e.evt.touches && e.evt.touches.length > 1) ||
            (e.evt.targetTouches && e.evt.targetTouches.length > 1)
        );

        if (isMultiTouch) {
            isDrawingRef.current = false;
            setIsDrawing(false);
            setCurrentPoints([]);
            return;
        }

        if (e.evt && e.evt.preventDefault) e.evt.preventDefault();

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        if (!point) return;

        const adjustedPoint = {
            x: (point.x - stagePos.x) / stageScale,
            y: (point.y - stagePos.y) / stageScale,
        };

        const currentTool = toolRef.current;
        const pts = currentPointsRef.current;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            const newPoints = [...pts, adjustedPoint.x, adjustedPoint.y];
            currentPointsRef.current = newPoints;
            setCurrentPoints(newPoints);

            // For eraser, split strokes at intersection points
            if (currentTool === 'eraser' && newPoints.length >= 2) {
                const eraserRadius = strokeWidthRef.current * 3;
                const newElements = [];
                let segmentCounter = 0;
                let elementsChanged = false;

                elementsRef.current.forEach(el => {
                    if (el.type !== 'pen') {
                        newElements.push(el);
                        return;
                    }

                    const segments = [];
                    let currentSegment = [];
                    let elChanged = false;

                    for (let i = 0; i < el.points.length; i += 2) {
                        const dx = el.points[i] - adjustedPoint.x;
                        const dy = el.points[i + 1] - adjustedPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < eraserRadius) {
                            if (currentSegment.length >= 4) {
                                segments.push([...currentSegment]);
                            }
                            currentSegment = [];
                            elChanged = true;
                        } else {
                            currentSegment.push(el.points[i], el.points[i + 1]);
                        }
                    }

                    if (currentSegment.length >= 4) {
                        segments.push(currentSegment);
                    }

                    if (elChanged) {
                        elementsChanged = true;
                        segments.forEach(segmentPoints => {
                            newElements.push({
                                ...el,
                                id: `${Date.now()}-${segmentCounter++}-${Math.random()}`,
                                points: segmentPoints,
                            });
                        });
                    } else {
                        newElements.push(el);
                    }
                });

                if (elementsChanged) {
                    setElements(newElements);
                    elementsRef.current = newElements;
                }
            }
        } else {
            const newPoints = [pts[0], pts[1], adjustedPoint.x, adjustedPoint.y];
            currentPointsRef.current = newPoints;
            setCurrentPoints(newPoints);
        }
    };

    /**
     * Handle pointer up - finish drawing
     */
    const handlePointerUp = (e) => {
        // Prevent default browser behavior
        if (e.evt && e.evt.preventDefault) e.evt.preventDefault();

        if (!isDrawingRef.current) return;

        isDrawingRef.current = false;
        setIsDrawing(false);

        const pts = currentPointsRef.current;

        if (pts.length < 4) {
            currentPointsRef.current = [];
            setCurrentPoints([]);
            return;
        }

        const currentTool = toolRef.current;
        const curElements = elementsRef.current;

        if (currentTool === 'pen') {
            const newLine = {
                id: Date.now(),
                type: 'pen',
                points: pts,
                stroke: strokeColorRef.current,
                strokeWidth: strokeWidthRef.current,
            };
            saveToHistory([...curElements, newLine]);
        } else if (currentTool === 'eraser') {
            saveToHistory(curElements);
        } else if (currentTool !== 'select' && currentTool !== 'text') {
            const [x1, y1, x2, y2] = pts;

            if (currentTool === 'line' || currentTool === 'arrow') {
                const newShape = {
                    id: Date.now(),
                    type: currentTool,
                    points: [x1, y1, x2, y2],
                    fill: fillColorRef.current,
                    stroke: strokeColorRef.current,
                    strokeWidth: strokeWidthRef.current,
                };
                saveToHistory([...curElements, newShape]);
            } else {
                const newShape = {
                    id: Date.now(),
                    type: currentTool,
                    x: Math.min(x1, x2),
                    y: Math.min(y1, y2),
                    width: Math.abs(x2 - x1),
                    height: Math.abs(y2 - y1),
                    fill: fillColorRef.current,
                    stroke: strokeColorRef.current,
                    strokeWidth: strokeWidthRef.current,
                };
                saveToHistory([...curElements, newShape]);
            }
        }

        currentPointsRef.current = [];
        setCurrentPoints([]);
    };

    /**
     * Handle touch move for pinch-to-zoom
     */
    const handleTouchMove = (e) => {
        // Prevent default to stop browser scrolling
        if (e.evt && e.evt.preventDefault) e.evt.preventDefault();

        // Only handle multi-touch (pinch-to-zoom). Single-finger is handled by pointer events.
        if (!e.evt.touches || e.evt.touches.length < 2) return;

        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];

        // Cancel any single-finger drawing when second finger is detected
        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            setIsDrawing(false);
            setCurrentPoints([]);
        }

        isPinchingRef.current = true;

        const stage = stageRef.current;
        const container = stage.container();
        const rect = container.getBoundingClientRect();

        const dist = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        const center = {
            x: ((touch1.clientX + touch2.clientX) / 2) - rect.left,
            y: ((touch1.clientY + touch2.clientY) / 2) - rect.top,
        };

        if (lastDistanceRef.current !== null) {
            const scaleBy = dist / lastDistanceRef.current;
            const oldScale = stageScale;
            const newScale = Math.max(0.1, Math.min(5, oldScale * scaleBy));

            const mousePointTo = {
                x: (center.x - stage.x()) / oldScale,
                y: (center.y - stage.y()) / oldScale,
            };

            setStageScale(newScale);
            setStagePos({
                x: center.x - mousePointTo.x * newScale,
                y: center.y - mousePointTo.y * newScale,
            });
        }

        lastDistanceRef.current = dist;
        lastCenterRef.current = center;
    };

    const handleTouchStart = (e) => {
        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];

        if (touch1 && touch2) {
            isPinchingRef.current = true;
            // Cancel drawing if second finger touches down
            if (isDrawingRef.current) {
                isDrawingRef.current = false;
                setIsDrawing(false);
                setCurrentPoints([]);
            }
        }
    };

    const handleTouchEnd = (e) => {
        // Only reset zoom tracking if we were in a pinch gesture
        if (isPinchingRef.current) {
            lastDistanceRef.current = null;
            lastCenterRef.current = null;
            isPinchingRef.current = false;
        }
        // Do NOT cancel single-finger drawing here — let handlePointerUp finalize it
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

    // deleteSelected is now defined above useEffect (line ~101) as useCallback

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
            onTap: () => tool === 'select' && setSelectedId(shape.id),
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
                        onDblTap={() => handleTextDblClick(shape.id)}
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
                            onPointerDown={(e) => { e.preventDefault(); undo(); }}
                            disabled={historyStep === 0}
                            className={`p-2.5 rounded-lg transition-colors ${historyStep === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-white text-gray-700'
                                }`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={18} />
                        </button>
                        <button
                            onPointerDown={(e) => { e.preventDefault(); redo(); }}
                            disabled={historyStep >= history.length - 1}
                            className={`p-2.5 rounded-lg transition-colors ${historyStep >= history.length - 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-white text-gray-700'
                                }`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={18} />
                        </button>
                    </div>

                    {/* Zoom */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                            onPointerDown={(e) => { e.preventDefault(); zoomOut(); }}
                            className="p-2.5 hover:bg-white rounded-lg transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <div className="px-2 text-xs font-bold text-gray-600 min-w-[3rem] text-center">
                            {Math.round(stageScale * 100)}%
                        </div>
                        <button
                            onPointerDown={(e) => { e.preventDefault(); zoomIn(); }}
                            className="p-2.5 hover:bg-white rounded-lg transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <div className="h-4 w-px bg-gray-300 mx-1" />
                        <button
                            onPointerDown={(e) => { e.preventDefault(); resetZoom(); }}
                            className="p-2.5 hover:bg-white rounded-lg transition-colors text-gray-700"
                            title="Reset Zoom"
                        >
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* User Profile & Settings */}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                    <button
                        onClick={() => router.push("/settings_page")}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/50 shadow-sm active:scale-90 transition-transform overflow-hidden"
                        title="Log Out"
                    >
                        <img
                            src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`}
                            alt="User Profile"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                        />
                    </button>
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
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            setTool(t.id);
                                        }}
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
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            setTool(s.id);
                                        }}
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
                            onPointerDown={(e) => { e.preventDefault(); clearCanvas(); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors border border-red-200"
                        >
                            <Trash2 size={16} />
                            Clear Canvas
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-hidden bg-gray-100 touch-none">
                    <Stage
                        ref={stageRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        onContextMenu={(e) => e.evt.preventDefault()}
                        onDragEnd={(e) => {
                            setStagePos({ x: e.target.x(), y: e.target.y() });
                        }}
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