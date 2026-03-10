/**
 * @fileoverview Professional infinite canvas with zoom/pan using Konva
 * Features: Firestore persistence, editable title, auto-save
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Stage, Layer, Line, Rect, Circle, Ellipse, Star, RegularPolygon, Text, Arrow, Image as KonvaImage, Transformer, Group } from 'react-konva';
import {
    MousePointer2, Pencil, Type, Square, Circle as CircleIcon, Triangle,
    Star as StarIcon, ArrowRight, Minus, Hexagon, Pentagon, Trash2,
    ZoomIn, ZoomOut, Maximize2, Eraser, Undo, Redo, Save, Check, ArrowLeft, Image as ImageIcon,
    Copy, Clipboard, Download, AlignLeft, AlignCenter, AlignRight, AlignStartVertical,
    AlignCenterVertical, AlignEndVertical, Layers, Grid3X3, Eye, EyeOff, Lock, Unlock,
    ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Group as GroupIcon, Ungroup, RotateCw,
    Database, User, StickyNote, Diamond, Activity, Zap, PlayCircle, StopCircle, Move, GitMerge, Map
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import LayersPanel from '@/components/LayersPanel';
import LiveCursors from '@/components/LiveCursors';
import CollaborationPanel from '@/components/CollaborationPanel';
import { useShortcuts } from '@/contexts/ShortcutContext';
import useCollaboration from '@/hooks/useCollaboration';


const FLOWCHART_NODE_TYPES = new Set([
    'rectangle', 'diamond', 'circle', 'parallelogram', 'cylinder', 'actor', 'note'
]);

const FLOWCHART_SHAPE_DEFS = [
    { id: 'fc-process', label: 'Process', icon: '▭', fill: '#dbeafe', stroke: '#3b82f6', shapeType: 'rectangle', w: 160, h: 60 },
    { id: 'fc-terminal', label: 'Start / End', icon: '⬭', fill: '#dcfce7', stroke: '#22c55e', shapeType: 'rectangle', w: 160, h: 60 },
    { id: 'fc-decision', label: 'Decision', icon: '◇', fill: '#fef9c3', stroke: '#eab308', shapeType: 'diamond', w: 160, h: 80 },
    { id: 'fc-io', label: 'Input/Output', icon: '▱', fill: '#e0e7ff', stroke: '#6366f1', shapeType: 'parallelogram', w: 160, h: 60 },
    { id: 'fc-connector', label: 'Connector', icon: '○', fill: '#fee2e2', stroke: '#ef4444', shapeType: 'circle', w: 60, h: 60 },
    { id: 'fc-document', label: 'Document', icon: '⌷', fill: '#fff7ed', stroke: '#f97316', shapeType: 'note', w: 160, h: 70 },
    { id: 'fc-database', label: 'Database', icon: '⌗', fill: '#f3e8ff', stroke: '#a855f7', shapeType: 'cylinder', w: 120, h: 80 },
    { id: 'fc-predefined', label: 'Predefined', icon: '▬', fill: '#e0f2fe', stroke: '#0ea5e9', shapeType: 'rectangle', w: 160, h: 60 },
    { id: 'fc-manual', label: 'Manual Input', icon: '⌕', fill: '#fce7f3', stroke: '#ec4899', shapeType: 'parallelogram', w: 160, h: 60 },
    { id: 'fc-delay', label: 'Delay', icon: 'D', fill: '#f0fdf4', stroke: '#16a34a', shapeType: 'rectangle', w: 160, h: 60 },
    { id: 'fc-annotation', label: 'Annotation', icon: '⌐', fill: '#f8fafc', stroke: '#64748b', shapeType: 'note', w: 160, h: 80 },
    { id: 'fc-data', label: 'Data Store', icon: '⊏', fill: '#f1f5f9', stroke: '#475569', shapeType: 'cylinder', w: 160, h: 60 },
];

const getFlowchartShapeDef = (toolId) => FLOWCHART_SHAPE_DEFS.find((shape) => shape.id === toolId) || null;

const resolveToolForMode = (toolId, mode) => {
    if (mode !== 'flowchart') return toolId;
    const flowShape = getFlowchartShapeDef(toolId);
    return flowShape ? flowShape.shapeType : toolId;
};

const FLOW_ANCHOR_SNAP_DISTANCE = 160;

const getFlowNodeSize = (node) => {
    const rawWidth = Number(node?.width);
    const rawHeight = Number(node?.height);

    return {
        width: Math.max(20, Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 80),
        height: Math.max(20, Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 60),
    };
};

const getFlowNodeConnectionPoints = (node) => {
    const { width, height } = getFlowNodeSize(node);
    const x = Number(node?.x) || 0;
    const y = Number(node?.y) || 0;

    return {
        top: { x: x + width / 2, y },
        right: { x: x + width, y: y + height / 2 },
        bottom: { x: x + width / 2, y: y + height },
        left: { x, y: y + height / 2 },
    };
};

const chooseNearestFlowSide = (node, x, y) => {
    const points = getFlowNodeConnectionPoints(node);
    return Object.entries(points)
        .map(([side, pt]) => ({ side, dist: Math.hypot(pt.x - x, pt.y - y) }))
        .sort((a, b) => a.dist - b.dist)[0]?.side || 'right';
};

const chooseFacingFlowSides = (fromNode, toNode) => {
    const fromPts = getFlowNodeConnectionPoints(fromNode);
    const toPts = getFlowNodeConnectionPoints(toNode);
    const fromCenter = { x: (fromPts.left.x + fromPts.right.x) / 2, y: (fromPts.top.y + fromPts.bottom.y) / 2 };
    const toCenter = { x: (toPts.left.x + toPts.right.x) / 2, y: (toPts.top.y + toPts.bottom.y) / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0
            ? { fromSide: 'right', toSide: 'left' }
            : { fromSide: 'left', toSide: 'right' };
    }

    return dy >= 0
        ? { fromSide: 'bottom', toSide: 'top' }
        : { fromSide: 'top', toSide: 'bottom' };
};

const buildOrthogonalConnectorPath = (fromPoint, fromSide, toPoint, toSide) => {
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;

    const fromHorizontal = fromSide === 'left' || fromSide === 'right';
    const toHorizontal = toSide === 'left' || toSide === 'right';

    if (fromHorizontal && toHorizontal) {
        return [fromPoint.x, fromPoint.y, midX, fromPoint.y, midX, toPoint.y, toPoint.x, toPoint.y];
    }

    if (!fromHorizontal && !toHorizontal) {
        return [fromPoint.x, fromPoint.y, fromPoint.x, midY, toPoint.x, midY, toPoint.x, toPoint.y];
    }

    if (fromHorizontal) {
        return [fromPoint.x, fromPoint.y, toPoint.x, fromPoint.y, toPoint.x, toPoint.y];
    }

    return [fromPoint.x, fromPoint.y, fromPoint.x, toPoint.y, toPoint.x, toPoint.y];
};

const removeElementAndLinkedConnectors = (items, elementId) => items.filter((el) => {
    if (el.id === elementId) return false;
    if (el.flowConnector && (el.fromId === elementId || el.toId === elementId)) return false;
    return true;
});



const URLImage = ({ shape, ...props }) => {
    const [img, setImg] = useState(null);
    useEffect(() => {
        const i = new window.Image();
        i.crossOrigin = "Anonymous";
        i.src = shape.url;
        i.onload = () => {
            setImg(i);
        };
        i.onerror = (e) => {
            console.error("Failed to load image:", shape.url, e);
        };
    }, [shape.url]);

    return (
        <KonvaImage
            image={img}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            {...props}
        />
    );
};

/**
 * Main canvas page with infinite canvas and Firestore persistence
 */
export default function CanvasPage() {
    const params = useParams();
    const router = useRouter();
    const canvasId = params.id;

    const stageRef = useRef(null);
    const fileInputRef = useRef(null);

    // Touch/pointer support refs
    const isPinchingRef = useRef(false);
    const lastDistanceRef = useRef(null);
    const lastCenterRef = useRef(null);
    const isDrawingRef = useRef(false);
    const [tool, setTool] = useState('pen');
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [isDrawing, setIsDrawingState] = useState(false);
    const setIsDrawing = (val) => { isDrawingRef.current = val; setIsDrawingState(val); };
    const [currentPoints, setCurrentPoints] = useState([]);
    const [selectedId, setSelectedId] = useState(null);



    // Canvas title state
    const [canvasTitle, setCanvasTitle] = useState('Untitled');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef(null);

    // Auth and save state
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const saveTimeoutRef = useRef(null);

    // Collaboration hook — presence, cursors, sharing
    const { activeUsers, remoteCursors, updateCursorPosition, isShared, toggleShare, shareKey, generateShareKey, myColor } =
        useCollaboration(canvasId, user);

    // Drawing settings
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [fillColor, setFillColor] = useState('#8b3dff');
    const [strokeWidth, setStrokeWidth] = useState(2);

    // Zoom and pan
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    // New feature states
    const [selectedIds, setSelectedIds] = useState([]);  // Multi-selection
    const [clipboard, setClipboard] = useState(null);    // Copy/paste
    const [backgroundPattern, setBackgroundPattern] = useState('grid'); // 'grid' or 'dots'
    const [rightPanelTab, setRightPanelTab] = useState('design'); // 'design' | 'layers' | 'export'
    const [isExporting, setIsExporting] = useState(false);
    const transformerRef = useRef(null);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    // Font settings for text elements
    const [fontFamily, setFontFamily] = useState('Arial');
    const [fontSize, setFontSize] = useState(24);
    const [fontStyle, setFontStyle] = useState('normal'); // 'normal' | 'italic'
    const [fontWeight, setFontWeight] = useState('normal'); // 'normal' | 'bold'
    const [workspaceMode, setWorkspaceMode] = useState('drawing'); // 'drawing' | 'flowchart' | 'poster'
    const [isToolbarVisible, setIsToolbarVisible] = useState(true);
    const [flowConnectorStyle, setFlowConnectorStyle] = useState('solid');
    const [flowConnectorCurved, setFlowConnectorCurved] = useState(false);
    const [showFlowchartMiniMap, setShowFlowchartMiniMap] = useState(true);
    const [draggingFlowShapeId, setDraggingFlowShapeId] = useState(null);
    const [flowConnectStart, setFlowConnectStart] = useState(null);
    const [flowConnectHoverAnchor, setFlowConnectHoverAnchor] = useState(null);
    const [hoveredFlowNodeId, setHoveredFlowNodeId] = useState(null);

    // Dynamic Canvas Sizing
    const stageContainerRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

    const updateCanvasSize = useCallback(() => {
        if (stageContainerRef.current) {
            const { width, height } = stageContainerRef.current.getBoundingClientRect();
            setCanvasSize({ width, height });
        }
    }, []);

    useEffect(() => {
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [updateCanvasSize]);

    // Update size when toolbar visibility changes (after animation)
    useEffect(() => {
        const timer = setTimeout(updateCanvasSize, 310);
        return () => clearTimeout(timer);
    }, [isToolbarVisible, updateCanvasSize]);

    useEffect(() => {
        const activeTool = resolveToolForMode(tool, workspaceMode);
        if (workspaceMode !== 'flowchart' || (activeTool !== 'connect' && activeTool !== 'arrow')) {
            setFlowConnectStart(null);
            setFlowConnectHoverAnchor(null);
        }
    }, [workspaceMode, tool]);


    // Available fonts
    const fontFamilies = [
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New',
        'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Palatino Linotype'
    ];

    /**
     * Authentication listener
     */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/');
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, [router]);

    /**
     * Load canvas data from Firestore (real-time listener).
     * Uses onSnapshot instead of getDoc so remote changes appear live.
     * Skips updates from the local user (_lastModifiedBy check) to prevent echo.
     */
    const isFirstLoad = useRef(true);
    const canvasOwnerRef = useRef(null);  // tracks who the real owner is
    useEffect(() => {
        if (!user || !canvasId) return;

        const docRef = doc(db, 'canvases', canvasId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) {
                setLoading(false);
                return;
            }

            const data = docSnap.data();

            // On first load, always apply the data
            if (isFirstLoad.current) {
                isFirstLoad.current = false;

                // Access control: check if user is allowed
                const isOwner = data.ownerId === user.uid;
                const isCollaborator = (data.collaborators || []).includes(user.uid);
                const isPublicCanvas = data.isPublic === true;

                if (process.env.NODE_ENV !== 'production') {
                    console.log('[Access Control]', {
                        myUid: user.uid,
                        docOwnerId: data.ownerId,
                        isPublicField: data.isPublic,
                        collaborators: data.collaborators,
                        isOwner,
                        isCollaborator,
                        isPublicCanvas,
                        allData: data
                    });
                }

                if (!isOwner && !isCollaborator && !isPublicCanvas) {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                setCanvasTitle(data.title || 'Untitled');
                setElements(data.elements || []);
                setHistory([data.elements || []]);
                setHistoryStep(0);
                canvasOwnerRef.current = data.ownerId || null;
                setLoading(false);
                return;
            }

            // On subsequent updates, skip if WE made this change (prevents echo)
            if (data._lastModifiedBy === user.uid) return;

            // Remote change — update elements and title
            setCanvasTitle(data.title || 'Untitled');
            setElements(data.elements || []);
        }, (error) => {
            console.error('[Collaboration] Canvas listener error:', error.code, error.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, canvasId]);

    /**
     * Save canvas to Firestore
     */
    const saveCanvas = useCallback(async (elementsToSave, titleToSave) => {
        if (!user || !canvasId) return;

        setSaving(true);
        try {
            const docRef = doc(db, 'canvases', canvasId);

            // Build save data — never overwrite ownerId for collaborators
            const saveData = {
                id: canvasId,
                title: titleToSave || canvasTitle,
                elements: elementsToSave || elements,
                _lastModifiedBy: user.uid,
                updatedAt: serverTimestamp()
            };

            // Only set ownerId + createdAt if this is a brand new canvas (no owner yet)
            if (!canvasOwnerRef.current) {
                saveData.ownerId = user.uid;
                saveData.createdAt = serverTimestamp();
            }

            await setDoc(docRef, saveData, { merge: true });

            setLastSaved(new Date());
            console.log('Canvas saved successfully');
        } catch (error) {
            console.error('[Collaboration] Save error:', error.code, error.message);
        } finally {
            setSaving(false);
        }
    }, [user, canvasId, canvasTitle, elements]);

    /**
     * Auto-save with debounce (2 seconds)
     */
    const triggerAutoSave = useCallback((newElements) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveCanvas(newElements, canvasTitle);
        }, 2000);
    }, [saveCanvas, canvasTitle]);

    /**
     * Save current state to history and trigger auto-save
     */
    const saveToHistory = useCallback((newElements) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
        setElements(newElements);
        triggerAutoSave(newElements);
    }, [history, historyStep, triggerAutoSave]);

    /**
     * Handle title submit
     */
    const handleTitleSubmit = () => {
        setIsEditingTitle(false);
        if (canvasTitle.trim() === '') {
            setCanvasTitle('Untitled');
        }
        saveCanvas(elements, canvasTitle);
    };

    /**
     * Handle title key press
     */
    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingTitle(false);
        }
    };

    /**
     * Focus title input when editing
     */
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    /**
     * Undo last action
     */
    const undo = useCallback(() => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            setElements(history[newStep]);
            setSelectedId(null);
            triggerAutoSave(history[newStep]);
        }
    }, [history, historyStep, triggerAutoSave]);

    /**
     * Redo last undone action
     */
    const redo = useCallback(() => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            setElements(history[newStep]);
            setSelectedId(null);
            triggerAutoSave(history[newStep]);
        }
    }, [history, historyStep, triggerAutoSave]);

    // ===== CLIPBOARD OPERATIONS =====
    const copySelected = useCallback(() => {
        if (!selectedId) return;
        const el = elements.find(e => e.id === selectedId);
        if (el) setClipboard(JSON.parse(JSON.stringify(el)));
    }, [selectedId, elements]);

    const pasteClipboard = useCallback(() => {
        if (!clipboard) return;
        const newEl = {
            ...clipboard,
            id: Date.now(),
            x: (clipboard.x || 0) + 20,
            y: (clipboard.y || 0) + 20
        };
        saveToHistory([...elements, newEl]);
        setSelectedId(newEl.id);
    }, [clipboard, elements, saveToHistory]);

    const duplicateSelected = useCallback(() => {
        if (!selectedId) return;
        const el = elements.find(e => e.id === selectedId);
        if (!el) return;
        const newEl = {
            ...JSON.parse(JSON.stringify(el)),
            id: Date.now(),
            x: (el.x || 0) + 20,
            y: (el.y || 0) + 20
        };
        saveToHistory([...elements, newEl]);
        setSelectedId(newEl.id);
    }, [selectedId, elements, saveToHistory]);

    // ===== Z-INDEX OPERATIONS =====
    const bringToFront = useCallback(() => {
        if (!selectedId) return;
        const idx = elements.findIndex(e => e.id === selectedId);
        if (idx === -1 || idx === elements.length - 1) return;
        const newElements = [...elements];
        const [el] = newElements.splice(idx, 1);
        newElements.push(el);
        saveToHistory(newElements);
    }, [selectedId, elements, saveToHistory]);

    const sendToBack = useCallback(() => {
        if (!selectedId) return;
        const idx = elements.findIndex(e => e.id === selectedId);
        if (idx <= 0) return;
        const newElements = [...elements];
        const [el] = newElements.splice(idx, 1);
        newElements.unshift(el);
        saveToHistory(newElements);
    }, [selectedId, elements, saveToHistory]);

    const bringForward = useCallback(() => {
        if (!selectedId) return;
        const idx = elements.findIndex(e => e.id === selectedId);
        if (idx === -1 || idx === elements.length - 1) return;
        const newElements = [...elements];
        [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
        saveToHistory(newElements);
    }, [selectedId, elements, saveToHistory]);

    const sendBackward = useCallback(() => {
        if (!selectedId) return;
        const idx = elements.findIndex(e => e.id === selectedId);
        if (idx <= 0) return;
        const newElements = [...elements];
        [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
        saveToHistory(newElements);
    }, [selectedId, elements, saveToHistory]);

    // ===== ALIGNMENT FUNCTIONS =====
    const getSelectedElements = useCallback(() => {
        const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        return elements.filter(el => ids.includes(el.id));
    }, [selectedIds, selectedId, elements]);

    const getBoundingBox = useCallback((el) => {
        // Get bounding box for any element type
        if (el.type === 'circle') {
            const radius = Math.min(el.width || 50, el.height || 50) / 2;
            return { x: el.x - radius, y: el.y - radius, width: radius * 2, height: radius * 2 };
        } else if (el.type === 'text') {
            return { x: el.x, y: el.y, width: 100, height: el.fontSize || 24 };
        } else if (el.type === 'pen') {
            const points = el.points || [];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < points.length; i += 2) {
                minX = Math.min(minX, points[i]);
                maxX = Math.max(maxX, points[i]);
                minY = Math.min(minY, points[i + 1]);
                maxY = Math.max(maxY, points[i + 1]);
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        return { x: el.x, y: el.y, width: el.width || 50, height: el.height || 50 };
    }, []);

    const alignElements = useCallback((direction) => {
        const selected = getSelectedElements();
        if (selected.length < 2) return;

        const boxes = selected.map(el => ({ id: el.id, ...getBoundingBox(el) }));
        let newElements = [...elements];

        switch (direction) {
            case 'left': {
                const minX = Math.min(...boxes.map(b => b.x));
                newElements = newElements.map(el => {
                    const box = boxes.find(b => b.id === el.id);
                    if (!box) return el;
                    const offset = box.x - minX;
                    return { ...el, x: el.x - offset };
                });
                break;
            }
            case 'center': {
                const minX = Math.min(...boxes.map(b => b.x));
                const maxX = Math.max(...boxes.map(b => b.x + b.width));
                const centerX = (minX + maxX) / 2;
                newElements = newElements.map(el => {
                    const box = boxes.find(b => b.id === el.id);
                    if (!box) return el;
                    const elCenterX = box.x + box.width / 2;
                    return { ...el, x: el.x + (centerX - elCenterX) };
                });
                break;
            }
            case 'right': {
                const maxX = Math.max(...boxes.map(b => b.x + b.width));
                newElements = newElements.map(el => {
                    const box = boxes.find(b => b.id === el.id);
                    if (!box) return el;
                    const offset = maxX - (box.x + box.width);
                    return { ...el, x: el.x + offset };
                });
                break;
            }
            case 'top': {
                const minY = Math.min(...boxes.map(b => b.y));
                newElements = newElements.map(el => {
                    const box = boxes.find(b => b.id === el.id);
                    if (!box) return el;
                    const offset = box.y - minY;
                    return { ...el, y: el.y - offset };
                });
                break;
            }
            case 'middle': {
                const minY = Math.min(...boxes.map(b => b.y));
                const maxY = Math.max(...boxes.map(b => b.y + b.height));
                const centerY = (minY + maxY) / 2;
                newElements = newElements.map(el => {
                    const box = boxes.find(b => b.id === el.id);
                    if (!box) return el;
                    const elCenterY = box.y + box.height / 2;
                    return { ...el, y: el.y + (centerY - elCenterY) };
                });
                break;
            }
            case 'bottom': {
                const maxY = Math.max(...boxes.map(b => b.y + b.height));
                newElements = newElements.map(el => {
                    const box = boxes.find(b => b.id === el.id);
                    if (!box) return el;
                    const offset = maxY - (box.y + box.height);
                    return { ...el, y: el.y + offset };
                });
                break;
            }
        }
        saveToHistory(newElements);
    }, [getSelectedElements, getBoundingBox, elements, saveToHistory]);

    const distributeElements = useCallback((axis) => {
        const selected = getSelectedElements();
        if (selected.length < 3) return;

        const boxes = selected.map(el => ({ id: el.id, el, ...getBoundingBox(el) }));

        if (axis === 'horizontal') {
            boxes.sort((a, b) => a.x - b.x);
            const minX = boxes[0].x;
            const maxX = boxes[boxes.length - 1].x + boxes[boxes.length - 1].width;
            const totalWidth = boxes.reduce((sum, b) => sum + b.width, 0);
            const gap = (maxX - minX - totalWidth) / (boxes.length - 1);

            let currentX = minX;
            const newElements = elements.map(el => {
                const boxIdx = boxes.findIndex(b => b.id === el.id);
                if (boxIdx === -1) return el;
                const box = boxes[boxIdx];
                const newX = currentX;
                currentX += box.width + gap;
                return { ...el, x: el.x + (newX - box.x) };
            });
            saveToHistory(newElements);
        } else {
            boxes.sort((a, b) => a.y - b.y);
            const minY = boxes[0].y;
            const maxY = boxes[boxes.length - 1].y + boxes[boxes.length - 1].height;
            const totalHeight = boxes.reduce((sum, b) => sum + b.height, 0);
            const gap = (maxY - minY - totalHeight) / (boxes.length - 1);

            let currentY = minY;
            const newElements = elements.map(el => {
                const boxIdx = boxes.findIndex(b => b.id === el.id);
                if (boxIdx === -1) return el;
                const box = boxes[boxIdx];
                const newY = currentY;
                currentY += box.height + gap;
                return { ...el, y: el.y + (newY - box.y) };
            });
            saveToHistory(newElements);
        }
    }, [getSelectedElements, getBoundingBox, elements, saveToHistory]);

    // ===== LAYER MANAGEMENT =====
    const toggleVisibility = useCallback((id) => {
        setElements(prev => prev.map(el =>
            el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
        ));
    }, []);

    const toggleLock = useCallback((id) => {
        setElements(prev => prev.map(el =>
            el.id === id ? { ...el, locked: !el.locked } : el
        ));
    }, []);

    const updateElementOpacity = useCallback((id, opacity) => {
        setElements(prev => prev.map(el =>
            el.id === id ? { ...el, opacity: opacity } : el
        ));
    }, []);

    const updateElementShadow = useCallback((updates) => {
        if (!selectedId) return;
        setElements(prev => prev.map(el =>
            el.id === selectedId ? { ...el, ...updates } : el
        ));
    }, [selectedId]);

    const moveLayerUp = useCallback((id) => {
        const idx = elements.findIndex(e => e.id === id);
        if (idx === elements.length - 1) return;
        const newElements = [...elements];
        [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
        setElements(newElements);
    }, [elements]);

    const moveLayerDown = useCallback((id) => {
        const idx = elements.findIndex(e => e.id === id);
        if (idx <= 0) return;
        const newElements = [...elements];
        [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
        setElements(newElements);
    }, [elements]);

    const getNearestFlowAnchor = useCallback((x, y, excludeId = null) => {
        let best = null;

        elements.forEach((el) => {
            if (!FLOWCHART_NODE_TYPES.has(el.type) || el.visible === false) return;
            if (excludeId && el.id === excludeId) return;

            const side = chooseNearestFlowSide(el, x, y);
            const point = getFlowNodeConnectionPoints(el)[side];
            const dist = Math.hypot(point.x - x, point.y - y);

            if (!best || dist < best.dist) {
                best = { node: el, side, point, dist };
            }
        });

        if (!best || best.dist > FLOW_ANCHOR_SNAP_DISTANCE) return null;
        return best;
    }, [elements]);

    const getConnectorPointsForShape = useCallback((connector) => {
        if (!connector?.flowConnector || !connector.fromId || !connector.toId) {
            if (connector?.width || connector?.height) {
                return [connector.x, connector.y, connector.x + connector.width, connector.y + connector.height];
            }
            return null;
        }

        const fromNode = elements.find((el) => el.id === connector.fromId);
        const toNode = elements.find((el) => el.id === connector.toId);
        if (!fromNode || !toNode) return null;

        const inferred = chooseFacingFlowSides(fromNode, toNode);
        const fromSide = connector.dynamicSides === false
            ? (connector.fromSide || inferred.fromSide)
            : inferred.fromSide;
        const toSide = connector.dynamicSides === false
            ? (connector.toSide || inferred.toSide)
            : inferred.toSide;

        const fromPoint = getFlowNodeConnectionPoints(fromNode)[fromSide];
        const toPoint = getFlowNodeConnectionPoints(toNode)[toSide];

        if (!fromPoint || !toPoint) return null;

        if (connector.curved) {
            const midX = (fromPoint.x + toPoint.x) / 2;
            return [fromPoint.x, fromPoint.y, midX, fromPoint.y, midX, toPoint.y, toPoint.x, toPoint.y];
        }

        return buildOrthogonalConnectorPath(fromPoint, fromSide, toPoint, toSide);
    }, [elements]);

    const createFlowConnectorFromAnchors = useCallback((startInfo, endAnchor) => {
        if (!startInfo || !endAnchor?.node) return false;
        if (startInfo.nodeId === endAnchor.node.id) return false;

        const fromNode = elements.find((el) => el.id === startInfo.nodeId);
        const toNode = elements.find((el) => el.id === endAnchor.node.id);
        if (!fromNode || !toNode) return false;

        const inferredSides = chooseFacingFlowSides(fromNode, toNode);
        const stroke = '#64748b';
        const newConnector = {
            id: `${Date.now()}-${Math.random()}`,
            type: 'arrow',
            flowConnector: true,
            fromId: startInfo.nodeId,
            fromSide: startInfo.side || inferredSides.fromSide,
            toId: endAnchor.node.id,
            toSide: endAnchor.side || inferredSides.toSide,
            connectorStyle: flowConnectorStyle,
            curved: flowConnectorCurved,
            dynamicSides: true,
            stroke,
            fill: stroke,
            strokeWidth,
        };

        saveToHistory([...elements, newConnector]);
        return true;
    }, [elements, flowConnectorStyle, flowConnectorCurved, strokeWidth, saveToHistory]);

    // ===== EXPORT FUNCTIONS =====
    const exportAsPNG = useCallback(() => {
        if (!stageRef.current) return;
        setIsExporting(true);
        setTimeout(() => {
            if (!stageRef.current) return;
            const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `${canvasTitle || 'canvas'}.png`;
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExporting(false);
        }, 100);
    }, [canvasTitle]);

    const exportAsJPG = useCallback(() => {
        if (!stageRef.current) return;
        setIsExporting(true);
        setTimeout(() => {
            if (!stageRef.current) return;
            const uri = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.9 });
            const link = document.createElement('a');
            link.download = `${canvasTitle || 'canvas'}.jpg`;
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExporting(false);
        }, 100);
    }, [canvasTitle]);

    const exportFlowchartJSON = useCallback(() => {
        const flowNodes = elements.filter((el) => FLOWCHART_NODE_TYPES.has(el.type));
        if (flowNodes.length === 0) {
            window.alert('No flowchart nodes to export.');
            return;
        }

        const flowNodeIds = new Set(flowNodes.map((node) => node.id));
        const flowConnectors = elements.filter((el) =>
            el.flowConnector && flowNodeIds.has(el.fromId) && flowNodeIds.has(el.toId)
        );

        const payload = {
            nodes: flowNodes.map((node) => {
                const matchedDef = getFlowchartShapeDef(node.flowNodeType) || FLOWCHART_SHAPE_DEFS.find((def) => def.shapeType === node.type);
                return {
                    id: node.id,
                    type: node.flowNodeType || matchedDef?.id || node.type,
                    x: Number(node.x) || 0,
                    y: Number(node.y) || 0,
                    w: Number(node.width) || matchedDef?.w || 160,
                    h: Number(node.height) || matchedDef?.h || 60,
                    label: typeof node.text === 'string' ? node.text : (matchedDef?.label || ''),
                    fill: node.fill || matchedDef?.fill || '#dbeafe',
                    stroke: node.stroke || matchedDef?.stroke || '#3b82f6',
                    strokeWidth: Number(node.strokeWidth) || 2,
                    fontSize: Number(node.fontSize) || 13,
                    textColor: node.textColor || '#1e293b',
                };
            }),
            conns: flowConnectors.map((conn) => ({
                id: conn.id,
                fromId: conn.fromId,
                fromSide: conn.fromSide || 'right',
                toId: conn.toId,
                toSide: conn.toSide || 'left',
                label: conn.label || '',
                style: conn.connectorStyle || 'solid',
                curved: Boolean(conn.curved),
                stroke: conn.stroke || '#64748b',
                strokeWidth: Number(conn.strokeWidth) || 2,
            })),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${canvasTitle || 'canvas'}-flowchart.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [elements, canvasTitle]);

    const exportFlowchartSVG = useCallback(() => {
        const flowNodes = elements.filter((el) => FLOWCHART_NODE_TYPES.has(el.type));
        if (flowNodes.length === 0) {
            window.alert('No flowchart nodes to export.');
            return;
        }

        const flowNodeById = new Map(flowNodes.map((node) => [node.id, node]));
        const flowConnectors = elements.filter((el) =>
            el.flowConnector && flowNodeById.has(el.fromId) && flowNodeById.has(el.toId)
        );

        const minX = Math.min(...flowNodes.map((n) => Number(n.x) || 0)) - 80;
        const minY = Math.min(...flowNodes.map((n) => Number(n.y) || 0)) - 80;
        const maxX = Math.max(...flowNodes.map((n) => (Number(n.x) || 0) + getFlowNodeSize(n).width)) + 80;
        const maxY = Math.max(...flowNodes.map((n) => (Number(n.y) || 0) + getFlowNodeSize(n).height)) + 80;

        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);

        const escapeXml = (text) => String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        const nodeMarkup = flowNodes.map((node) => {
            const x = Number(node.x) || 0;
            const y = Number(node.y) || 0;
            const { width: w, height: h } = getFlowNodeSize(node);
            const fill = node.fill || '#dbeafe';
            const stroke = node.stroke || '#3b82f6';
            const strokeWidth = Number(node.strokeWidth) || 2;
            const text = escapeXml(node.text || getFlowchartShapeDef(node.flowNodeType)?.label || '');
            const textY = y + (h / 2) + 5;

            let shapeMarkup = '';
            switch (node.type) {
                case 'circle':
                    shapeMarkup = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                    break;
                case 'diamond':
                    shapeMarkup = `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                    break;
                case 'parallelogram':
                    shapeMarkup = `<polygon points="${x + (w * 0.25)},${y} ${x + w},${y} ${x + (w * 0.75)},${y + h} ${x},${y + h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                    break;
                case 'note':
                    shapeMarkup = `<polygon points="${x},${y} ${x + (w * 0.8)},${y} ${x + w},${y + (h * 0.2)} ${x + w},${y + h} ${x},${y + h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                    break;
                case 'cylinder':
                    shapeMarkup = [
                        `<rect x="${x}" y="${y + (h * 0.1)}" width="${w}" height="${h * 0.8}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                        `<ellipse cx="${x + w / 2}" cy="${y + (h * 0.1)}" rx="${w / 2}" ry="${h * 0.1}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                        `<ellipse cx="${x + w / 2}" cy="${y + (h * 0.9)}" rx="${w / 2}" ry="${h * 0.1}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                    ].join('');
                    break;
                case 'actor':
                    shapeMarkup = [
                        `<circle cx="${x + (w / 2)}" cy="${y + (h * 0.2)}" r="${h * 0.15}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                        `<line x1="${x + (w / 2)}" y1="${y + (h * 0.35)}" x2="${x + (w / 2)}" y2="${y + (h * 0.7)}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                        `<line x1="${x + (w * 0.2)}" y1="${y + (h * 0.5)}" x2="${x + (w * 0.8)}" y2="${y + (h * 0.5)}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                        `<line x1="${x + (w / 2)}" y1="${y + (h * 0.7)}" x2="${x + (w * 0.3)}" y2="${y + (h * 0.95)}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                        `<line x1="${x + (w / 2)}" y1="${y + (h * 0.7)}" x2="${x + (w * 0.7)}" y2="${y + (h * 0.95)}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
                    ].join('');
                    break;
                default:
                    shapeMarkup = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${node.cornerRadius || 4}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                    break;
            }

            const textMarkup = text
                ? `<text x="${x + (w / 2)}" y="${textY}" text-anchor="middle" font-family="Arial" font-size="13" fill="${node.textColor || '#1e293b'}">${text}</text>`
                : '';

            return `${shapeMarkup}${textMarkup}`;
        }).join('');

        const connectorMarkup = flowConnectors.map((conn) => {
            const points = getConnectorPointsForShape(conn);
            if (!points || points.length < 4) return '';
            const d = conn.connectorStyle === 'dashed' ? 'stroke-dasharray="10,6"' : '';
            const stroke = conn.stroke || '#64748b';
            const strokeWidth = Number(conn.strokeWidth) || 2;

            const polylinePoints = [];
            for (let i = 0; i < points.length; i += 2) {
                polylinePoints.push(`${points[i]},${points[i + 1]}`);
            }

            return `<polyline points="${polylinePoints.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" ${d} marker-end="url(#arrowhead)"/>`;
        }).join('');

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
    </marker>
  </defs>
  ${connectorMarkup}
  ${nodeMarkup}
</svg>`;

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${canvasTitle || 'canvas'}-flowchart.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [elements, canvasTitle, getConnectorPointsForShape]);

    const importFlowchartJSON = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';

        input.onchange = (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(String(ev.target?.result || '{}'));
                    const incomingNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
                    const incomingConns = Array.isArray(parsed.conns) ? parsed.conns : [];

                    if (incomingNodes.length === 0) {
                        window.alert('Invalid flowchart JSON: missing nodes.');
                        return;
                    }

                    const idSeed = Date.now();
                    const idMap = new Map();

                    const importedNodes = incomingNodes.map((node, index) => {
                        const matchedDef = getFlowchartShapeDef(node.type) || FLOWCHART_SHAPE_DEFS.find((def) => def.shapeType === node.type);
                        const shapeType = matchedDef?.shapeType || (FLOWCHART_NODE_TYPES.has(node.type) ? node.type : 'rectangle');
                        const newId = `${idSeed}-node-${index}`;
                        idMap.set(String(node.id), newId);

                        const width = Math.max(20, Number(node.w ?? node.width ?? matchedDef?.w ?? 160));
                        const height = Math.max(20, Number(node.h ?? node.height ?? matchedDef?.h ?? 60));

                        const imported = {
                            id: newId,
                            type: shapeType,
                            x: Number(node.x) || 0,
                            y: Number(node.y) || 0,
                            width,
                            height,
                            fill: node.fill || matchedDef?.fill || '#dbeafe',
                            stroke: node.stroke || matchedDef?.stroke || '#3b82f6',
                            strokeWidth: Number(node.strokeWidth) || 2,
                            flowNodeType: matchedDef?.id,
                            text: typeof node.label === 'string' ? node.label : (matchedDef?.label || ''),
                            fontSize: Number(node.fontSize) || 13,
                            textColor: node.textColor || '#1e293b',
                            textAlign: 'center',
                        };

                        if (matchedDef?.id === 'fc-terminal' || matchedDef?.id === 'fc-delay') {
                            imported.cornerRadius = Math.max(8, Math.min(width, height) / 2);
                        }

                        return imported;
                    });

                    const importedConnectors = incomingConns
                        .map((conn, index) => {
                            const fromId = idMap.get(String(conn.fromId));
                            const toId = idMap.get(String(conn.toId));
                            if (!fromId || !toId || fromId === toId) return null;

                            const fromNode = importedNodes.find((n) => n.id === fromId);
                            const toNode = importedNodes.find((n) => n.id === toId);
                            if (!fromNode || !toNode) return null;

                            const inferred = chooseFacingFlowSides(fromNode, toNode);
                            const connectorStyle = conn.style === 'dashed' || conn.connectorStyle === 'dashed' ? 'dashed' : 'solid';
                            const stroke = conn.stroke || '#64748b';

                            return {
                                id: `${idSeed}-conn-${index}`,
                                type: 'arrow',
                                flowConnector: true,
                                fromId,
                                fromSide: conn.fromSide || inferred.fromSide,
                                toId,
                                toSide: conn.toSide || inferred.toSide,
                                connectorStyle,
                                curved: Boolean(conn.curved),
                                stroke,
                                fill: stroke,
                                strokeWidth: Number(conn.strokeWidth) || 2,
                                label: conn.label || '',
                            };
                        })
                        .filter(Boolean);

                    const merged = [...elements, ...importedNodes, ...importedConnectors];
                    saveToHistory(merged);
                    setWorkspaceMode('flowchart');
                    setTool('select');
                    setSelectedId(importedNodes[0]?.id || null);
                } catch (err) {
                    console.error('Flowchart JSON import failed:', err);
                    window.alert('Invalid flowchart JSON file.');
                }
            };

            reader.readAsText(file);
        };

        input.click();
    }, [elements, saveToHistory]);
    // ===== ALIGNMENT WRAPPER =====
    const alignSelected = useCallback((alignment) => {
        // Use multi-element alignment if multiple selected
        if (selectedIds.length > 1) {
            alignElements(alignment);
            return;
        }

        // Single element: align to viewport center
        if (!selectedId) return;
        const el = elements.find(e => e.id === selectedId);
        if (!el || el.type === 'pen') return;

        const viewCenterX = (-stagePos.x + canvasSize.width / 2) / stageScale;
        const viewCenterY = (-stagePos.y + canvasSize.height / 2) / stageScale;

        let updates = {};
        const elWidth = el.width || 100;
        const elHeight = el.height || 100;

        switch (alignment) {
            case 'left': updates.x = viewCenterX - 200; break;
            case 'center': updates.x = viewCenterX - elWidth / 2; break;
            case 'right': updates.x = viewCenterX + 200 - elWidth; break;
            case 'top': updates.y = viewCenterY - 200; break;
            case 'middle': updates.y = viewCenterY - elHeight / 2; break;
            case 'bottom': updates.y = viewCenterY + 200 - elHeight; break;
        }

        const newElements = elements.map(e => e.id === selectedId ? { ...e, ...updates } : e);
        saveToHistory(newElements);
    }, [selectedId, selectedIds, elements, stagePos, stageScale, saveToHistory, alignElements]);

    const autoLayoutFlowchart = useCallback(() => {
        const flowNodes = elements.filter(el => FLOWCHART_NODE_TYPES.has(el.type));
        if (flowNodes.length === 0) return;

        const cols = Math.max(1, Math.ceil(Math.sqrt(flowNodes.length)));
        const startX = 120;
        const startY = 120;
        const gapX = 220;
        const gapY = 140;

        const sorted = [...flowNodes].sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
        const positionMap = new Map();

        sorted.forEach((node, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            positionMap.set(node.id, {
                x: startX + col * gapX,
                y: startY + row * gapY,
            });
        });

        const updated = elements.map(el =>
            positionMap.has(el.id) ? { ...el, ...positionMap.get(el.id) } : el
        );

        saveToHistory(updated);
    }, [elements, saveToHistory]);

    // ===== POSITION HELPER =====
    const snapPosition = useCallback((pos) => {
        return pos; // Free positioning (snap to grid removed)
    }, []);

    // Transformer effect - attach to selected element
    useEffect(() => {
        if (selectedId && transformerRef.current) {
            const stage = stageRef.current;
            if (!stage) return;
            const selectedNode = stage.findOne(`#shape-${selectedId}`) || stage.findOne(`#text-${selectedId}`);
            if (selectedNode) {
                transformerRef.current.nodes([selectedNode]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([]);
        }
    }, [selectedId, elements]);

    // State to trigger text editing from DOM events
    const [pendingTextEdit, setPendingTextEdit] = useState(null);

    // Direct DOM dblclick listener for text editing (workaround for Konva event issues)
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const container = stage.container();
        if (!container) return;

        const handleDblClick = (e) => {
            console.log('Canvas dblclick detected');
            if (!stageRef.current) return;

            // Get position relative to canvas
            const rect = container.getBoundingClientRect();
            const x = (e.clientX - rect.left - stagePos.x) / stageScale;
            const y = (e.clientY - rect.top - stagePos.y) / stageScale;

            console.log('Click position (canvas coords):', x, y);

            // Find if any text element is at this position (check from top to bottom in z-order)
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                if (el.type === 'text') {
                    // Estimate text bounds (rough approximation)
                    const textWidth = (el.text?.length || 10) * (el.fontSize || 24) * 0.6;
                    const textHeight = (el.fontSize || 24) * 1.2;

                    if (x >= el.x && x <= el.x + textWidth &&
                        y >= el.y && y <= el.y + textHeight) {
                        console.log('Text element double-clicked:', el.id);
                        setPendingTextEdit(el.id);
                        return;
                    }
                }
            }
        };

        container.addEventListener('dblclick', handleDblClick);
        return () => container.removeEventListener('dblclick', handleDblClick);
    }, [elements, stagePos, stageScale]);

    // Update selected element's font properties
    const updateSelectedFont = useCallback((updates) => {
        if (!selectedId) return;
        const el = elements.find(e => e.id === selectedId);
        if (!el || el.type !== 'text') return;

        const newElements = elements.map(e =>
            e.id === selectedId ? { ...e, ...updates } : e
        );
        saveToHistory(newElements);
    }, [selectedId, elements, saveToHistory]);

    /**
     * Handle Image Upload
     */
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset file input
        e.target.value = null;

        // Optional: set a local loading state if you want to show a spinner
        // setLoading(true); 

        try {
            const storageRef = ref(storage, `canvases/${canvasId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // Get image dimensions to set initial size
            const img = new window.Image();
            img.onload = () => {
                const newImage = {
                    id: Date.now(),
                    type: 'image',
                    x: (-stagePos.x + canvasSize.width / 2) / stageScale - (img.width > 500 ? 250 : img.width / 2),
                    y: (-stagePos.y + canvasSize.height / 2) / stageScale - (img.width > 500 ? (img.height * (500 / img.width)) / 2 : img.height / 2),
                    width: img.width > 500 ? 500 : img.width, // Limit max width
                    height: img.width > 500 ? (img.height * (500 / img.width)) : img.height,
                    url: url,
                };
                saveToHistory([...elements, newImage]);
                setTool('select');
            };
            img.src = url;

        } catch (error) {
            console.error("Error uploading image: ", error);
            alert("Failed to upload image. Please try again.");
        }
    };

    /**
     * Keyboard shortcuts — reads bindings from ShortcutContext so user
     * customizations on /shortcuts are reflected here in real time.
     */
    const { getComboToActionMap } = useShortcuts();

    useEffect(() => {
        const comboMap = getComboToActionMap();

        // Map action IDs to the tool name they activate
        const actionToTool = {
            selectTool: 'select',
            penTool: 'pen',
            eraserTool: 'eraser',
            textTool: 'text',
            rectangleTool: 'rectangle',
            circleTool: 'circle',
            triangleTool: 'triangle',
            starTool: 'star',
            arrowTool: 'arrow',
            lineTool: 'line',
            hexagonTool: 'hexagon',
            pentagonTool: 'pentagon',
        };

        /** Build combo string from a KeyboardEvent (matches ShortcutContext format) */
        const eventToCombo = (e) => {
            const parts = [];
            if (e.ctrlKey || e.metaKey) parts.push('ctrl');
            if (e.shiftKey) parts.push('shift');
            if (e.altKey) parts.push('alt');
            let key = e.key.toLowerCase();
            if (key === ' ') key = 'space';
            parts.push(key);
            return parts.join('+');
        };

        const handleKeyDown = (e) => {
            // Skip if editing title
            if (isEditingTitle) return;

            // Don't trigger shortcuts when typing in inputs
            const target = e.target;
            const tagName = target.tagName.toUpperCase();
            if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            let handled = false;
            const combo = eventToCombo(e);
            const action = comboMap[combo];

            // --- Customizable shortcuts (from ShortcutContext) ---
            if (action) {
                switch (action) {
                    case 'undo': undo(); handled = true; break;
                    case 'redo': redo(); handled = true; break;
                    case 'save': saveCanvas(elements, canvasTitle); handled = true; break;
                    case 'copy': copySelected(); handled = true; break;
                    case 'paste': pasteClipboard(); handled = true; break;
                    case 'duplicate': duplicateSelected(); handled = true; break;
                    case 'delete':
                        if (selectedId) {
                            const newElements = removeElementAndLinkedConnectors(elements, selectedId);
                            saveToHistory(newElements);
                            setSelectedId(null);
                            handled = true;
                        }
                        break;
                    case 'escape':
                        setSelectedId(null);
                        setIsDrawing(false);
                        setCurrentPoints([]);
                        setFlowConnectStart(null);
                        handled = true;
                        break;
                    default:
                        // Check if it's a tool-selection action
                        if (actionToTool[action]) {
                            setTool(actionToTool[action]);
                            handled = true;
                        }
                        break;
                }
            }

            // --- Non-customizable shortcuts (z-index, grid toggle) ---
            if (!handled) {
                if (e.key === ']' && !e.ctrlKey && !e.metaKey) {
                    e.shiftKey ? bringToFront() : bringForward();
                    handled = true;
                } else if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
                    e.shiftKey ? sendToBack() : sendBackward();
                    handled = true;
                } else if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
                    setBackgroundPattern(prev => prev === 'grid' ? 'dots' : 'grid');
                    handled = true;
                }
            }

            // Also handle Backspace as delete (always, in addition to the customizable delete key)
            if (!handled && e.key === 'Backspace' && selectedId) {
                const newElements = removeElementAndLinkedConnectors(elements, selectedId);
                saveToHistory(newElements);
                setSelectedId(null);
                handled = true;
            }

            if (handled) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [undo, redo, isEditingTitle, saveCanvas, elements, canvasTitle, copySelected, pasteClipboard, duplicateSelected, selectedId, saveToHistory, bringToFront, sendToBack, bringForward, sendBackward, getComboToActionMap]);

    /**
     * Handle mouse down - start drawing
     */
    const handleMouseDown = (e) => {
        if (tool === 'select') {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                setSelectedId(null);
                setSelectedIds([]);
            }
            return;
        }

        if (activeTool === 'pan') {
            return;
        }

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        if (!point) return;
        const adjustedPoint = {
            x: (point.x - stagePos.x) / stageScale,
            y: (point.y - stagePos.y) / stageScale,
        };

        if (activeTool === 'pen' || activeTool === 'eraser') {
            setIsDrawing(true);
            setCurrentPoints([adjustedPoint.x, adjustedPoint.y]);
        } else if (activeTool === 'connect' || (workspaceMode === 'flowchart' && activeTool === 'arrow')) {
            if (workspaceMode === 'flowchart') {
                const startAnchor = getNearestFlowAnchor(adjustedPoint.x, adjustedPoint.y);
                if (!startAnchor) {
                    setIsDrawing(false);
                    setCurrentPoints([]);
                    setFlowConnectStart(null);
                    setFlowConnectHoverAnchor(null);
                    return;
                }

                setIsDrawing(true);
                setFlowConnectStart({
                    nodeId: startAnchor.node.id,
                    side: startAnchor.side,
                    x: startAnchor.point.x,
                    y: startAnchor.point.y,
                });
                setFlowConnectHoverAnchor(startAnchor);
                setHoveredFlowNodeId(startAnchor.node.id);
                setCurrentPoints([startAnchor.point.x, startAnchor.point.y, startAnchor.point.x, startAnchor.point.y]);
                return;
            }

            setIsDrawing(true);
            setCurrentPoints([adjustedPoint.x, adjustedPoint.y]);
        } else if (activeTool === 'text') {
            // Only create new text if clicking on empty space (stage background)
            const clickedOnEmpty = e.target === e.target.getStage();
            if (!clickedOnEmpty) {
                // Clicked on an existing element - select it instead
                return;
            }
            const newText = {
                id: Date.now(),
                type: 'text',
                x: adjustedPoint.x,
                y: adjustedPoint.y,
                text: 'Double click to edit',
                fontSize: fontSize,
                fontFamily: fontFamily,
                fontStyle: fontStyle === 'italic' ? (fontWeight === 'bold' ? 'bold italic' : 'italic') : (fontWeight === 'bold' ? 'bold' : 'normal'),
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
        // Broadcast cursor position to other users (runs even when not drawing)
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        if (pointer) {
            const cursorPos = {
                x: (pointer.x - stagePos.x) / stageScale,
                y: (pointer.y - stagePos.y) / stageScale,
            };
            updateCursorPosition(cursorPos.x, cursorPos.y);
        }

        if (!isDrawing) return;

        const point = stage.getPointerPosition();
        const adjustedPoint = {
            x: (point.x - stagePos.x) / stageScale,
            y: (point.y - stagePos.y) / stageScale,
        };

        if ((activeTool === 'connect' || activeTool === 'arrow') && workspaceMode === 'flowchart' && flowConnectStart) {
            const endAnchor = getNearestFlowAnchor(adjustedPoint.x, adjustedPoint.y, flowConnectStart.nodeId);
            const targetPoint = endAnchor?.point || adjustedPoint;
            setFlowConnectHoverAnchor(endAnchor);
            setCurrentPoints([flowConnectStart.x, flowConnectStart.y, targetPoint.x, targetPoint.y]);
            return;
        }

        if (activeTool === 'pen' || activeTool === 'eraser') {
            setCurrentPoints([...currentPoints, adjustedPoint.x, adjustedPoint.y]);

            // For eraser, split strokes at intersection points
            if (activeTool === 'eraser' && currentPoints.length >= 2) {
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
                            id: `${Date.now()}-${segmentCounter++}-${Math.random()}`,
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

        if (activeTool === 'pen') {
            const newLine = {
                id: Date.now(),
                type: 'pen',
                points: currentPoints,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
            };
            saveToHistory([...elements, newLine]);
        } else if (activeTool === 'eraser') {
            // Save the erased state to history
            saveToHistory(elements);
        } else if ((activeTool === 'connect' || activeTool === 'arrow') && workspaceMode === 'flowchart') {
            const startInfo = flowConnectStart;
            const [, , endX, endY] = currentPoints;

            if (startInfo) {
                const endAnchor = getNearestFlowAnchor(endX, endY, startInfo.nodeId);
                if (endAnchor) createFlowConnectorFromAnchors(startInfo, endAnchor);
            }

            setFlowConnectStart(null);
            setFlowConnectHoverAnchor(null);
        } else if (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'pan') {
            const [x1, y1, x2, y2] = currentPoints;
            const shapeType = activeTool === 'connect' ? 'arrow' : activeTool;
            const newShape = {
                id: Date.now(),
                type: shapeType,
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
            };

            if (workspaceMode === 'flowchart') {
                if (activeFlowShape) {
                    newShape.fill = activeFlowShape.fill;
                    newShape.stroke = activeFlowShape.stroke;
                    newShape.flowNodeType = activeFlowShape.id;
                    newShape.text = activeFlowShape.label;
                    newShape.fontSize = 13;
                    newShape.textColor = '#1e293b';
                    newShape.textAlign = 'center';

                    if (activeFlowShape.id === 'fc-terminal' || activeFlowShape.id === 'fc-delay') {
                        newShape.cornerRadius = Math.max(8, Math.min(newShape.width, newShape.height) / 2);
                    }
                }

                if (shapeType === 'line' || shapeType === 'arrow') {
                    newShape.dash = flowConnectorStyle === 'dashed' ? [10, 6] : undefined;
                    newShape.tension = flowConnectorCurved ? 0.4 : 0;
                }
            }

            saveToHistory([...elements, newShape]);
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
        saveToHistory([]);
    };

    /**
     * Delete selected element
     */
    const deleteSelected = () => {
        if (!selectedId) return;
        const newElements = removeElementAndLinkedConnectors(elements, selectedId);
        saveToHistory(newElements);
        setSelectedId(null);
    };

    /**
     * Handle text double click
     */
    const handleTextDblClick = useCallback((id) => {
        const textNode = stageRef.current.findOne(`#text-${id}`);
        if (!textNode) return;

        // Get the stage container's position on the page
        const stageBox = stageRef.current.container().getBoundingClientRect();

        // Get the text node's absolute position relative to the stage
        const textPosition = textNode.absolutePosition();

        // Calculate the actual screen position accounting for stage position and scale
        const areaPosition = {
            x: stageBox.left + textPosition.x * stageScale + stagePos.x * stageScale,
            y: stageBox.top + textPosition.y * stageScale + stagePos.y * stageScale
        };

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        const textElement = elements.find(el => el.id === id);

        textarea.value = textNode.text();
        textarea.style.position = 'fixed';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = Math.max(textNode.width() * stageScale, 200) + 'px';
        textarea.style.minHeight = '40px';
        textarea.style.fontSize = (textNode.fontSize() * stageScale) + 'px';
        textarea.style.fontFamily = textElement?.fontFamily || 'Arial';
        textarea.style.fontStyle = (textElement?.fontStyle || '').includes('italic') ? 'italic' : 'normal';
        textarea.style.fontWeight = (textElement?.fontStyle || '').includes('bold') ? 'bold' : 'normal';
        textarea.style.border = '2px solid #8b3dff';
        textarea.style.borderRadius = '4px';
        textarea.style.padding = '8px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'white';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.transformOrigin = 'left top';
        textarea.style.zIndex = '10000';
        textarea.style.boxShadow = '0 4px 12px rgba(139, 61, 255, 0.3)';
        textarea.style.color = textElement?.fill || '#000000';

        // Hide the text node while editing
        textNode.hide();
        stageRef.current.batchDraw();

        textarea.focus();
        textarea.select();

        const removeTextarea = () => {
            textNode.show();
            stageRef.current.batchDraw();
            try {
                document.body.removeChild(textarea);
            } catch (e) {
                // Already removed
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                removeTextarea();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textarea.blur();
            }
        };

        const handleBlur = () => {
            const newText = textarea.value;
            setElements(prevElements =>
                prevElements.map(el =>
                    el.id === id ? { ...el, text: newText } : el
                )
            );
            removeTextarea();
        };

        textarea.addEventListener('keydown', handleKeyDown);
        textarea.addEventListener('blur', handleBlur);
    }, [elements, stageScale, stagePos]);

    // Effect to trigger text editing when pendingTextEdit changes
    useEffect(() => {
        if (pendingTextEdit !== null) {
            handleTextDblClick(pendingTextEdit);
            setPendingTextEdit(null);
        }
    }, [pendingTextEdit, handleTextDblClick]);

    /**
     * Render shape based on type
     */
    const renderShape = (shape) => {
        // Skip hidden elements
        if (shape.visible === false) return null;

        const isSelected = shape.id === selectedId || selectedIds.includes(shape.id);
        const isLocked = shape.locked === true;

        const editFlowNodeLabel = () => {
            if (!FLOWCHART_NODE_TYPES.has(shape.type)) return;

            const currentLabel = typeof shape.text === 'string'
                ? shape.text
                : (getFlowchartShapeDef(shape.flowNodeType)?.label || '');
            const nextLabel = window.prompt('Edit flowchart label', currentLabel);
            if (nextLabel === null) return;

            const updated = elements.map((el) =>
                el.id === shape.id
                    ? { ...el, text: nextLabel }
                    : el
            );
            saveToHistory(updated);
        };

        const commonProps = {
            id: `shape-${shape.id}`,
            opacity: shape.opacity ?? 1,
            onClick: (e) => {
                // Allow selection with select tool or text tool (for text elements)
                if ((activeCanvasTool === 'select' || activeCanvasTool === 'text') && !isLocked) {
                    const isShiftPressed = e.evt?.shiftKey;

                    if (isShiftPressed) {
                        // Multi-select: toggle selection
                        setSelectedIds(prev => {
                            if (prev.includes(shape.id)) {
                                return prev.filter(id => id !== shape.id);
                            } else {
                                return [...prev, shape.id];
                            }
                        });
                        // Also update selectedId for compatibility
                        setSelectedId(shape.id);
                    } else {
                        // Single select: replace selection
                        setSelectedId(shape.id);
                        setSelectedIds([shape.id]);
                    }

                    // Auto-switch to select tool after clicking an element
                    if (activeCanvasTool === 'text') setTool('select');
                }
            },
            onMouseEnter: () => {
                if (workspaceMode === 'flowchart' && FLOWCHART_NODE_TYPES.has(shape.type)) {
                    setHoveredFlowNodeId(shape.id);
                }
            },
            onMouseLeave: () => {
                if (hoveredFlowNodeId === shape.id) {
                    setHoveredFlowNodeId(null);
                }
            },
            draggable: activeCanvasTool === 'select' && !isLocked && !shape.flowConnector,
            onDragEnd: (e) => {
                if (isLocked) return;
                let newPos = { x: e.target.x(), y: e.target.y() };
                // For center-rendered shapes, convert center position back to top-left
                const isCenterRendered = ['circle', 'triangle', 'star', 'hexagon', 'pentagon'].includes(shape.type);
                if (isCenterRendered && shape.width && shape.height) {
                    newPos.x = newPos.x - shape.width / 2;
                    newPos.y = newPos.y - shape.height / 2;
                }
                setElements(prevElements => prevElements.map(el =>
                    el.id === shape.id
                        ? { ...el, x: newPos.x, y: newPos.y }
                        : el
                ));
            },
            onDblClick: (e) => {
                // Double-click = select the shape and show its properties panel
                e.cancelBubble = true;
                if (!FLOWCHART_NODE_TYPES.has(shape.type)) return;
                setSelectedId(shape.id);
                setActiveCanvasTool('select');
            },
            onDblTap: (e) => {
                e.cancelBubble = true;
                if (!FLOWCHART_NODE_TYPES.has(shape.type)) return;
                setSelectedId(shape.id);
                setActiveCanvasTool('select');
            },
            stroke: isSelected ? '#8b3dff' : (shape.stroke || (shape.type === 'text' ? undefined : strokeColor)),
            strokeWidth: isSelected ? (shape.strokeWidth || strokeWidth) + 2 : (shape.type === 'text' && !shape.stroke ? undefined : (shape.strokeWidth || strokeWidth)),
            dash: isSelected ? [5, 5] : (shape.dash || undefined),
            // Shadow properties
            shadowColor: shape.shadowColor || 'transparent',
            shadowBlur: shape.shadowBlur || 0,
            shadowOffsetX: shape.shadowOffsetX || 0,
            shadowOffsetY: shape.shadowOffsetY || 0,
            shadowOpacity: shape.shadowOpacity || 0.5,
            // Rotation property
            rotation: shape.rotation || 0,
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
                        cornerRadius={shape.cornerRadius || 0}
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
                if (shape.flowConnector) {
                    const connectorPoints = getConnectorPointsForShape(shape);
                    if (!connectorPoints) return null;
                    const connectorDash = shape.connectorStyle === 'dashed' ? [10, 6] : undefined;

                    return (
                        <Arrow
                            key={shape.id}
                            {...commonProps}
                            points={connectorPoints}
                            dash={isSelected ? [5, 5] : connectorDash}
                            tension={shape.curved ? 0.35 : 0}
                            fill={shape.fill || shape.stroke || '#64748b'}
                            pointerLength={20}
                            pointerWidth={20}
                        />
                    );
                }

                if (shape.width || shape.height) {
                    return (
                        <Arrow
                            key={shape.id}
                            {...commonProps}
                            points={[shape.x, shape.y, shape.x + shape.width, shape.y + shape.height]}
                            tension={shape.tension || 0}
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
                            tension={shape.tension || 0}
                        />
                    );
                }
                return null;

            case 'diamond':
                return (
                    <Line
                        key={shape.id}
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        points={[
                            shape.width / 2, 0,
                            shape.width, shape.height / 2,
                            shape.width / 2, shape.height,
                            0, shape.height / 2,
                        ]}
                        fill={shape.fill}
                        closed={true}
                    />
                );

            case 'parallelogram':
                return (
                    <Line
                        key={shape.id}
                        {...commonProps}
                        points={[
                            shape.width * 0.25, 0,
                            shape.width, 0,
                            shape.width * 0.75, shape.height,
                            0, shape.height
                        ]}
                        x={shape.x}
                        y={shape.y}
                        fill={shape.fill}
                        closed={true}
                    />
                );

            case 'cylinder':
                return (
                    <Group key={shape.id} x={shape.x} y={shape.y} {...commonProps}>
                        <Rect
                            x={0}
                            y={shape.height * 0.1}
                            width={shape.width}
                            height={shape.height * 0.8}
                            fill={shape.fill}
                            stroke={shape.stroke}
                            strokeWidth={shape.strokeWidth}
                        />
                        <Ellipse
                            x={shape.width / 2}
                            y={shape.height * 0.1}
                            radiusX={shape.width / 2}
                            radiusY={shape.height * 0.1}
                            fill={shape.fill}
                            stroke={shape.stroke}
                            strokeWidth={shape.strokeWidth}
                        />
                        <Ellipse
                            x={shape.width / 2}
                            y={shape.height * 0.9}
                            radiusX={shape.width / 2}
                            radiusY={shape.height * 0.1}
                            fill={shape.fill}
                            stroke={shape.stroke}
                            strokeWidth={shape.strokeWidth}
                        />
                    </Group>
                );

            case 'actor':
                return (
                    <Group key={shape.id} x={shape.x} y={shape.y} {...commonProps}>
                        <Circle
                            x={shape.width / 2}
                            y={shape.height * 0.2}
                            radius={shape.height * 0.15}
                            fill={shape.fill}
                        />
                        <Line
                            points={[shape.width / 2, shape.height * 0.35, shape.width / 2, shape.height * 0.7]}
                        />
                        <Line
                            points={[shape.width * 0.2, shape.height * 0.5, shape.width * 0.8, shape.height * 0.5]}
                        />
                        <Line
                            points={[shape.width / 2, shape.height * 0.7, shape.width * 0.3, shape.height * 0.95]}
                        />
                        <Line
                            points={[shape.width / 2, shape.height * 0.7, shape.width * 0.7, shape.height * 0.95]}
                        />
                    </Group>
                );

            case 'note':
                return (
                    <Group key={shape.id} x={shape.x} y={shape.y} {...commonProps}>
                        <Line
                            points={[
                                0, 0,
                                shape.width * 0.8, 0,
                                shape.width, shape.height * 0.2,
                                shape.width, shape.height,
                                0, shape.height
                            ]}
                            fill={shape.fill}
                            closed={true}
                        />
                        <Line
                            points={[
                                shape.width * 0.8, 0,
                                shape.width * 0.8, shape.height * 0.2,
                                shape.width, shape.height * 0.2
                            ]}
                        />
                    </Group>
                );

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
                        fontFamily={shape.fontFamily || 'Arial'}
                        fontStyle={shape.fontStyle || 'normal'}
                        align={shape.textAlign || 'left'}
                        fill={shape.fill}
                        onDblClick={(e) => {
                            e.cancelBubble = true;
                            console.log('Double click detected on text:', shape.id);
                            handleTextDblClick(shape.id);
                        }}
                        onDblTap={(e) => {
                            e.cancelBubble = true;
                            console.log('Double tap detected on text:', shape.id);
                            handleTextDblClick(shape.id);
                        }}
                    />
                );

            case 'image':
                return (
                    <URLImage
                        key={shape.id}
                        shape={shape}
                        {...commonProps}
                    />
                );

            default:
                return null;
        }
    };

    const drawingTools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'pen', icon: Pencil, label: 'Pen' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'image', icon: ImageIcon, label: 'Image' },
    ];

    const flowchartTools = [
        { id: 'select', icon: '↖', label: 'Select' },
        { id: 'connect', icon: '⟶', label: 'Connect' },
        { id: 'pan', icon: '✋', label: 'Pan' },
    ];

    const posterTools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'text', icon: Type, label: 'Heading' },
        { id: 'image', icon: ImageIcon, label: 'Image' },
    ];

    const drawingShapes = [
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: CircleIcon, label: 'Circle' },
        { id: 'triangle', icon: Triangle, label: 'Triangle' },
        { id: 'star', icon: StarIcon, label: 'Star' },
        { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
        { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
        { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
        { id: 'line', icon: Minus, label: 'Line' },
    ];

    const flowchartShapes = FLOWCHART_SHAPE_DEFS;

    const tools = workspaceMode === 'flowchart' ? flowchartTools : (workspaceMode === 'poster' ? posterTools : drawingTools);
    const shapes = workspaceMode === 'flowchart' ? flowchartShapes : (workspaceMode === 'poster' ? drawingShapes : drawingShapes);


    const selectedElement = elements.find(el => el.id === selectedId);
    const activeFlowShapeDef = workspaceMode === 'flowchart' ? getFlowchartShapeDef(tool) : null;
    const activeCanvasTool = resolveToolForMode(tool, workspaceMode);
    const previewFill = activeFlowShapeDef?.fill || fillColor;
    const previewStroke = activeFlowShapeDef?.stroke || strokeColor;
    const showFlowOrthogonalPreview = (
        workspaceMode === 'flowchart' &&
        (activeCanvasTool === 'connect' || activeCanvasTool === 'arrow') &&
        Boolean(flowConnectStart) &&
        isDrawing &&
        currentPoints.length === 4
    );
    const flowPreviewConnectorPoints = showFlowOrthogonalPreview
        ? (() => {
            const [sx, sy, ex, ey] = currentPoints;
            const fromPoint = { x: sx, y: sy };
            const fromSide = flowConnectStart.side || 'right';

            const anchor = flowConnectHoverAnchor;
            const toPoint = anchor?.point || { x: ex, y: ey };

            let toSide = anchor?.side;
            if (!toSide) {
                const dx = toPoint.x - fromPoint.x;
                const dy = toPoint.y - fromPoint.y;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    toSide = dx >= 0 ? 'left' : 'right';
                } else {
                    toSide = dy >= 0 ? 'top' : 'bottom';
                }
            }

            return buildOrthogonalConnectorPath(fromPoint, fromSide, toPoint, toSide);
        })()
        : null;

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <Lock size={28} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500 text-sm mb-6">
                        You don&apos;t have permission to view this canvas. Ask the owner to share it with you.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 transition-all"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg-base)]">


            <CollaborationPanel
                isOpen={showSharePanel}
                onClose={() => setShowSharePanel(false)}
                isShared={isShared}
                onToggleShare={toggleShare}
                shareKey={shareKey}
                onGenerateKey={generateShareKey}
                activeUsers={activeUsers}
                ownerUid={canvasOwnerRef.current}
                currentUserUid={user?.uid}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
                {/* Header - Zinc frosted glass */}
                <header className="h-16 bg-zinc-50/80 backdrop-blur-md border-b border-zinc-200/50 flex items-center justify-between px-8 z-40 sticky top-0 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-4">
                        {/* Back button */}
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2.5 hover:bg-gray-100/80 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <div className="h-4 w-px bg-gray-200 mx-1" />

                        <div className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
                                <span className="text-white font-black text-sm tracking-tighter">P</span>
                            </div>

                            <div className="flex flex-col">
                                {/* Editable Title */}
                                {isEditingTitle ? (
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        value={canvasTitle}
                                        onChange={(e) => setCanvasTitle(e.target.value)}
                                        onBlur={handleTitleSubmit}
                                        onKeyDown={handleTitleKeyDown}
                                        className="font-bold text-base tracking-tight text-gray-900 bg-gray-50 px-2 py-0.5 rounded-lg border border-purple-300 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                        style={{ minWidth: '150px' }}
                                    />
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <h1
                                            onClick={() => setIsEditingTitle(true)}
                                            className="font-bold text-base tracking-tight text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                                        >
                                            {canvasTitle}
                                        </h1>
                                        <button
                                            onClick={() => setIsEditingTitle(true)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-purple-600"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    </div>
                                )}

                                {/* Save status indicator */}
                                <div className="flex items-center gap-2 h-4">
                                    {saving ? (
                                        <div className="flex items-center gap-1.5 no-select">
                                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest">Synchronizing</span>
                                        </div>
                                    ) : lastSaved ? (
                                        <div className="flex items-center gap-1.5 no-select">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">All changes saved</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 no-select opacity-50">
                                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waiting for changes</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Collaborator avatars + Share button */}
                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 px-4 py-1.5 rounded-2xl shadow-inner-sm">
                            {activeUsers.length > 1 && (
                                <div className="flex -space-x-2.5">
                                    {activeUsers
                                        .filter(u => u.uid !== user?.uid)
                                        .slice(0, 4)
                                        .map(u => (
                                            <div
                                                key={u.uid}
                                                className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-md ring-1 ring-black/5"
                                                style={{ backgroundColor: u.color }}
                                                title={u.displayName}
                                            >
                                                {(u.displayName || '?')[0].toUpperCase()}
                                            </div>
                                        ))}
                                    {activeUsers.filter(u => u.uid !== user?.uid).length > 4 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-black/5">
                                            +{activeUsers.filter(u => u.uid !== user?.uid).length - 4}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Share button */}
                            <button
                                onClick={() => setShowSharePanel(true)}
                                className="flex items-center gap-2 pl-2 text-purple-600 hover:text-purple-700 transition-colors"
                            >
                                <div className="p-1 bg-[#8b3dff]/10 rounded-lg group-hover:bg-[#8b3dff]/20 transition-colors">
                                    <Zap size={14} className="fill-purple-600" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Share</span>
                            </button>
                        </div>

                        {/* Controls Group */}
                        <div className="flex items-center gap-4">
                            {/* Undo/Redo */}
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 shadow-inner-sm">
                                <button
                                    onClick={undo}
                                    disabled={historyStep === 0}
                                    className={`p-2 rounded-lg transition-all duration-200 ${historyStep === 0
                                        ? 'text-gray-200'
                                        : 'hover:bg-zinc-100/80 text-gray-600 hover:text-purple-600 hover:shadow-sm'
                                        }`}
                                    title="Undo (Ctrl+Z)"
                                >
                                    <Undo size={16} />
                                </button>
                                <button
                                    onClick={redo}
                                    disabled={historyStep >= history.length - 1}
                                    className={`p-2 rounded-lg transition-all duration-200 ${historyStep >= history.length - 1
                                        ? 'text-gray-200'
                                        : 'hover:bg-zinc-100/80 text-gray-600 hover:text-purple-600 hover:shadow-sm'
                                        }`}
                                    title="Redo (Ctrl+Y)"
                                >
                                    <Redo size={16} />
                                </button>
                            </div>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl p-1 shadow-inner-sm">
                                <button
                                    onClick={zoomOut}
                                    className="p-2 hover:bg-zinc-100/80 text-gray-500 hover:text-gray-900 rounded-lg transition-all hover:shadow-sm"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={16} />
                                </button>
                                <div className="h-4 w-px bg-gray-200 mx-1" />
                                <span className="px-2 text-[11px] font-black text-gray-400 min-w-[50px] text-center tracking-tighter">
                                    {Math.round(stageScale * 100)}%
                                </span>
                                <div className="h-4 w-px bg-gray-200 mx-1" />
                                <button
                                    onClick={zoomIn}
                                    className="p-2 hover:bg-zinc-100/80 text-gray-500 hover:text-gray-900 rounded-lg transition-all hover:shadow-sm"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={16} />
                                </button>
                                <button
                                    onClick={resetZoom}
                                    className="p-2 hover:bg-white text-gray-500 hover:text-gray-900 rounded-lg transition-all hover:shadow-sm ml-0.5"
                                    title="Reset Zoom"
                                >
                                    <Maximize2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Workspace Area */}
                <div className="flex flex-1 overflow-hidden relative">

                    {/* Toolbar toggle button */}
                    <button
                        onClick={() => setIsToolbarVisible(v => !v)}
                        className={`absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-zinc-50/95 backdrop-blur-xl border border-zinc-200/50 shadow-lg flex items-center justify-center text-gray-400 hover:text-purple-600 transition-all duration-300 rounded-r-lg hover:bg-white hover:shadow-purple-200/30 ${isToolbarVisible ? 'left-[256px]' : 'left-0 rounded-l-none'
                            }`}
                        title={isToolbarVisible ? 'Hide toolbar' : 'Show toolbar'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-transform duration-300 ${isToolbarVisible ? '' : 'rotate-180'}`}
                        >
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    {/* Toolbar - Zinc frosted glass */}
                    <div className={`h-[calc(100%-32px)] my-4 ml-4 bg-zinc-50/90 backdrop-blur-xl border border-zinc-200/50 overflow-y-auto shadow-2xl transition-all duration-300 ease-in-out flex flex-col rounded-2xl z-20 custom-scrollbar ${isToolbarVisible
                        ? 'w-60 opacity-100 p-5'
                        : 'w-0 opacity-0 p-0 border-0 overflow-hidden'
                        }`}>

                        {/* Mode Switcher */}
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Mode</p>
                            <div className="relative flex bg-white/60 backdrop-blur-sm rounded-2xl p-[3px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] border border-gray-200/40">
                                {/* Sliding indicator */}
                                <div
                                    className="absolute top-[3px] bottom-[3px] rounded-[13px] bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 shadow-md shadow-purple-500/25 transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                                    style={{
                                        width: 'calc(50% - 3px)',
                                        left: workspaceMode === 'drawing' ? '3px' : 'calc(50%)',
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (workspaceMode !== 'drawing') {
                                            setWorkspaceMode('drawing');
                                            setCurrentPoints([]);
                                            setIsDrawing(false);
                                            setSelectedId(null);
                                            setSelectedIds([]);
                                            setTool('pen');
                                        }
                                    }}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[13px] text-[11px] font-extrabold tracking-wide transition-all duration-[400ms] ${workspaceMode === 'drawing'
                                        ? 'text-white drop-shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <Pencil size={12} />
                                    Shapes
                                </button>
                                <button
                                    onClick={() => {
                                        if (workspaceMode !== 'flowchart') {
                                            setWorkspaceMode('flowchart');
                                            setCurrentPoints([]);
                                            setIsDrawing(false);
                                            setSelectedId(null);
                                            setSelectedIds([]);
                                            setTool('select');
                                        }
                                    }}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[13px] text-[11px] font-extrabold tracking-wide transition-all duration-[400ms] ${workspaceMode === 'flowchart'
                                        ? 'text-white drop-shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <GitMerge size={12} />
                                    Flowchart
                                </button>
                            </div>
                        </div>

                        {workspaceMode === 'flowchart' ? (
                            <>
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Tools</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {tools.map((t) => {
                                            const isActive = tool === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        setTool(t.id);
                                                        setCurrentPoints([]);
                                                        setIsDrawing(false);
                                                        setFlowConnectStart(null);
                                                        if (t.id === 'connect') {
                                                            setStrokeColor('#64748b');
                                                        }
                                                    }}
                                                    title={t.label}
                                                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-[10px] font-semibold gap-1 transition-all border ${isActive
                                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <span className="text-base leading-none font-bold">{t.icon}</span>
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Shapes</p>
                                <div className="space-y-1">
                                    {shapes.map((shapeDef) => {
                                        const isActive = tool === shapeDef.id;
                                        return (
                                            <button
                                                key={shapeDef.id}
                                                draggable
                                                onDragStart={() => setDraggingFlowShapeId(shapeDef.id)}
                                                onDragEnd={() => setDraggingFlowShapeId(null)}
                                                onClick={() => {
                                                    setTool(shapeDef.id);
                                                    setIsDrawing(false);
                                                    setCurrentPoints([]);
                                                    setFlowConnectStart(null);
                                                    setFillColor(shapeDef.fill);
                                                    setStrokeColor(shapeDef.stroke);
                                                }}
                                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors text-left ${isActive
                                                    ? 'bg-indigo-50 border-indigo-300'
                                                    : 'bg-gray-50 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <span
                                                    className="w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold shrink-0"
                                                    style={{ background: shapeDef.fill, color: shapeDef.stroke, border: `1.5px solid ${shapeDef.stroke}` }}
                                                >
                                                    {shapeDef.icon}
                                                </span>
                                                <span className={`text-xs font-medium ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>{shapeDef.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Connector Style</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            onClick={() => setFlowConnectorStyle('solid')}
                                            className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${flowConnectorStyle === 'solid' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            -- Solid
                                        </button>
                                        <button
                                            onClick={() => setFlowConnectorStyle('dashed')}
                                            className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${flowConnectorStyle === 'dashed' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            - - Dashed
                                        </button>
                                    </div>
                                    <div className="mt-1.5">
                                        <button
                                            onClick={() => setFlowConnectorCurved((v) => !v)}
                                            className={`w-full py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${flowConnectorCurved ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            Curved
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            onClick={exportFlowchartJSON}
                                            className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                        >
                                            <Download size={12} /> JSON
                                        </button>
                                        <button
                                            onClick={importFlowchartJSON}
                                            className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                                        >
                                            Import
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            onClick={exportAsPNG}
                                            className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                        >
                                            <Download size={12} /> PNG
                                        </button>
                                        <button
                                            onClick={exportFlowchartSVG}
                                            className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                        >
                                            <Download size={12} /> SVG
                                        </button>
                                    </div>
                                    <button
                                        onClick={autoLayoutFlowchart}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                                    >
                                        <GitMerge size={13} /> Auto Layout
                                    </button>
                                    <button
                                        onClick={() => setShowFlowchartMiniMap((v) => !v)}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                    >
                                        <Map size={13} /> {showFlowchartMiniMap ? 'Hide' : 'Show'} Mini Map
                                    </button>
                                    <button
                                        onClick={clearCanvas}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                                    >
                                        <Trash2 size={13} /> Clear Canvas
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Canvas Tools</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {tools.map((t) => {
                                            const Icon = t.icon;
                                            const isActive = tool === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        if (t.id === 'image') {
                                                            fileInputRef.current?.click();
                                                        } else {
                                                            setTool(t.id);
                                                        }
                                                    }}
                                                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/40 transform scale-105'
                                                        : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-100 hover:border-purple-200 hover:shadow-md'
                                                        }`}
                                                >
                                                    <Icon size={22} className={isActive ? '' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all'} />
                                                    <span className={`text-[10px] font-bold mt-2 uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Basic Shapes</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {shapes.map((s) => {
                                            const Icon = s.icon;
                                            const isActive = tool === s.id;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => setTool(s.id)}
                                                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/40 transform scale-105'
                                                        : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-100 hover:border-purple-200 hover:shadow-md'
                                                        }`}
                                                >
                                                    <Icon size={22} className={isActive ? '' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all'} />
                                                    <span className={`text-[10px] font-bold mt-2 uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>{s.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100">
                                    <button
                                        onClick={clearCanvas}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-xs hover:bg-red-100 transition-all duration-300 border border-red-100 hover:shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                        RESET CANVAS
                                    </button>
                                </div>
                            </>
                        )}
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
                            onDblClick={(e) => {
                                // Check if double-click was on a text node
                                const target = e.target;
                                const id = target.id ? target.id() : '';
                                console.log('Stage dblclick, target id:', id);
                                if (id && id.startsWith('text-')) {
                                    const elementId = parseInt(id.replace('text-', ''));
                                    console.log('Text element double-clicked, id:', elementId);
                                    handleTextDblClick(elementId);
                                }
                            }}
                            onDblTap={(e) => {
                                // Same for touch devices
                                const target = e.target;
                                const id = target.id ? target.id() : '';
                                if (id && id.startsWith('text-')) {
                                    const elementId = parseInt(id.replace('text-', ''));
                                    handleTextDblClick(elementId);
                                }
                            }}
                            scaleX={stageScale}
                            scaleY={stageScale}
                            x={stagePos.x}
                            y={stagePos.y}
                            draggable={tool === 'select' && !selectedId}
                        >
                            <Layer>
                                {/* Background pattern - grid or dots */}
                                {(() => {
                                    const gridSize = 50;

                                    // Calculate visible area in canvas coordinates
                                    const startX = Math.floor((-stagePos.x / stageScale) / gridSize) * gridSize;
                                    const startY = Math.floor((-stagePos.y / stageScale) / gridSize) * gridSize;
                                    const endX = startX + Math.ceil(canvasSize.width / stageScale) + gridSize;
                                    const endY = startY + Math.ceil(canvasSize.height / stageScale) + gridSize;

                                    const elements = [];

                                    if (isExporting) {
                                        elements.push(
                                            <Rect
                                                key="export-bg"
                                                x={-stagePos.x / stageScale}
                                                y={-stagePos.y / stageScale}
                                                width={canvasSize.width / stageScale}
                                                height={canvasSize.height / stageScale}
                                                fill="#ffffff"
                                                listening={false}
                                            />
                                        );
                                    } else if (backgroundPattern === 'grid') {
                                        // Grid lines pattern
                                        for (let x = startX; x <= endX; x += gridSize) {
                                            elements.push(
                                                <Line
                                                    key={`v-${x}`}
                                                    points={[x, startY - gridSize, x, endY + gridSize]}
                                                    stroke="#e2e8f0"
                                                    strokeWidth={1 / stageScale}
                                                    listening={false}
                                                />
                                            );
                                        }
                                        for (let y = startY; y <= endY; y += gridSize) {
                                            elements.push(
                                                <Line
                                                    key={`h-${y}`}
                                                    points={[startX - gridSize, y, endX + gridSize, y]}
                                                    stroke="#e2e8f0"
                                                    strokeWidth={1 / stageScale}
                                                    listening={false}
                                                />
                                            );
                                        }
                                    } else {
                                        // Dots pattern
                                        for (let x = startX; x <= endX; x += gridSize) {
                                            for (let y = startY; y <= endY; y += gridSize) {
                                                elements.push(
                                                    <Circle
                                                        key={`dot-${x}-${y}`}
                                                        x={x}
                                                        y={y}
                                                        radius={1.5 / stageScale}
                                                        fill="#cbd5e1"
                                                        listening={false}
                                                    />
                                                );
                                            }
                                        }
                                    }

                                    return elements;
                                })()}

                                {/* Render all elements */}
                                {elements.map(renderShape)}

                                {/* Flowchart node labels (kept separate to avoid pointer conflicts with node drag/select) */}
                                {elements.map((shape) => {
                                    if (shape.visible === false) return null;
                                    if (!FLOWCHART_NODE_TYPES.has(shape.type)) return null;
                                    if (typeof shape.text !== 'string' || shape.text.trim() === '') return null;

                                    const width = Number(shape.width) || 80;
                                    const height = Number(shape.height) || 60;
                                    const fontPx = Number(shape.fontSize) || 13;

                                    return (
                                        <Text
                                            key={`flow-label-${shape.id}`}
                                            x={(Number(shape.x) || 0) + 8}
                                            y={(Number(shape.y) || 0) + (height / 2) - (fontPx / 2)}
                                            width={Math.max(20, width - 16)}
                                            text={shape.text}
                                            fontSize={fontPx}
                                            fontFamily={shape.fontFamily || 'Arial'}
                                            align={shape.textAlign || 'center'}
                                            verticalAlign="middle"
                                            fill={shape.textColor || '#1e293b'}
                                            listening={false}
                                        />
                                    );
                                })}

                                {/* Flowchart connection handles (visible on hover/source/target while connecting) */}
                                {workspaceMode === 'flowchart' && (activeCanvasTool === 'connect' || activeCanvasTool === 'arrow') && elements.map((shape) => {
                                    if (shape.visible === false) return null;
                                    if (!FLOWCHART_NODE_TYPES.has(shape.type)) return null;

                                    const isHovered = hoveredFlowNodeId === shape.id;
                                    const isSource = flowConnectStart?.nodeId === shape.id;
                                    const isTarget = flowConnectHoverAnchor?.node?.id === shape.id;
                                    if (!isHovered && !isSource && !isTarget) return null;

                                    const points = getFlowNodeConnectionPoints(shape);

                                    return Object.entries(points).map(([side, point]) => {
                                        const isActiveHandle = (isSource && flowConnectStart?.side === side) || (isTarget && flowConnectHoverAnchor?.side === side);

                                        return (
                                            <Circle
                                                key={`flow-handle-${shape.id}-${side}`}
                                                x={point.x}
                                                y={point.y}
                                                radius={isActiveHandle ? (7 / stageScale) : (5.5 / stageScale)}
                                                fill={isActiveHandle ? '#4338ca' : '#6366f1'}
                                                stroke="#ffffff"
                                                strokeWidth={2 / stageScale}
                                                shadowColor="rgba(67,56,202,0.35)"
                                                shadowBlur={10 / stageScale}
                                                shadowOpacity={0.8}
                                                onMouseEnter={(e) => {
                                                    e.cancelBubble = true;
                                                    setHoveredFlowNodeId(shape.id);
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.cancelBubble = true;
                                                    if (!flowConnectStart || flowConnectStart.nodeId !== shape.id) {
                                                        setHoveredFlowNodeId((prev) => (prev === shape.id ? null : prev));
                                                    }
                                                }}
                                                onMouseDown={(e) => {
                                                    e.cancelBubble = true;

                                                    if (!flowConnectStart) {
                                                        setIsDrawing(true);
                                                        setFlowConnectStart({
                                                            nodeId: shape.id,
                                                            side,
                                                            x: point.x,
                                                            y: point.y,
                                                        });
                                                        setFlowConnectHoverAnchor({ node: shape, side, point });
                                                        setCurrentPoints([point.x, point.y, point.x, point.y]);
                                                        return;
                                                    }

                                                    if (flowConnectStart.nodeId === shape.id) {
                                                        setFlowConnectStart({
                                                            nodeId: shape.id,
                                                            side,
                                                            x: point.x,
                                                            y: point.y,
                                                        });
                                                        setFlowConnectHoverAnchor({ node: shape, side, point });
                                                        setCurrentPoints([point.x, point.y, point.x, point.y]);
                                                        return;
                                                    }

                                                    createFlowConnectorFromAnchors(flowConnectStart, { node: shape, side, point });
                                                    setIsDrawing(false);
                                                    setFlowConnectStart(null);
                                                    setFlowConnectHoverAnchor(null);
                                                    setCurrentPoints([]);
                                                }}
                                            />
                                        );
                                    });
                                })}

                                {/* Remote users' cursors */}
                                <LiveCursors cursors={remoteCursors} />

                                {/* Current drawing preview */}
                                {isDrawing && currentPoints.length >= 2 && (
                                    activeCanvasTool === 'pen' ? (
                                        <Line
                                            points={currentPoints}
                                            stroke={previewStroke}
                                            strokeWidth={strokeWidth}
                                            tension={0.5}
                                            lineCap="round"
                                            lineJoin="round"
                                        />
                                    ) : currentPoints.length === 4 && (
                                        activeCanvasTool === 'rectangle' ? (
                                            <Rect
                                                x={Math.min(currentPoints[0], currentPoints[2])}
                                                y={Math.min(currentPoints[1], currentPoints[3])}
                                                width={Math.abs(currentPoints[2] - currentPoints[0])}
                                                height={Math.abs(currentPoints[3] - currentPoints[1])}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                                cornerRadius={activeFlowShapeDef && (activeFlowShapeDef.id === 'fc-terminal' || activeFlowShapeDef.id === 'fc-delay')
                                                    ? Math.max(8, Math.min(
                                                        Math.abs(currentPoints[2] - currentPoints[0]),
                                                        Math.abs(currentPoints[3] - currentPoints[1])
                                                    ) / 2)
                                                    : 0}
                                            />
                                        ) : activeCanvasTool === 'circle' ? (
                                            <Circle
                                                x={(currentPoints[0] + currentPoints[2]) / 2}
                                                y={(currentPoints[1] + currentPoints[3]) / 2}
                                                radius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 2}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        ) : activeCanvasTool === 'triangle' ? (
                                            <RegularPolygon
                                                x={(currentPoints[0] + currentPoints[2]) / 2}
                                                y={(currentPoints[1] + currentPoints[3]) / 2}
                                                sides={3}
                                                radius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 2}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        ) : activeCanvasTool === 'star' ? (
                                            <Star
                                                x={(currentPoints[0] + currentPoints[2]) / 2}
                                                y={(currentPoints[1] + currentPoints[3]) / 2}
                                                numPoints={5}
                                                innerRadius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 4}
                                                outerRadius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 2}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        ) : activeCanvasTool === 'hexagon' ? (
                                            <RegularPolygon
                                                x={(currentPoints[0] + currentPoints[2]) / 2}
                                                y={(currentPoints[1] + currentPoints[3]) / 2}
                                                sides={6}
                                                radius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 2}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        ) : activeCanvasTool === 'pentagon' ? (
                                            <RegularPolygon
                                                x={(currentPoints[0] + currentPoints[2]) / 2}
                                                y={(currentPoints[1] + currentPoints[3]) / 2}
                                                sides={5}
                                                radius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 2}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        ) : activeCanvasTool === 'diamond' ? (
                                            <RegularPolygon
                                                x={(currentPoints[0] + currentPoints[2]) / 2}
                                                y={(currentPoints[1] + currentPoints[3]) / 2}
                                                sides={4}
                                                radius={Math.min(
                                                    Math.abs(currentPoints[2] - currentPoints[0]),
                                                    Math.abs(currentPoints[3] - currentPoints[1])
                                                ) / 2}
                                                rotation={45}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        ) : activeCanvasTool === 'parallelogram' ? (
                                            <Line
                                                x={Math.min(currentPoints[0], currentPoints[2])}
                                                y={Math.min(currentPoints[1], currentPoints[3])}
                                                points={[
                                                    Math.abs(currentPoints[2] - currentPoints[0]) * 0.25, 0,
                                                    Math.abs(currentPoints[2] - currentPoints[0]), 0,
                                                    Math.abs(currentPoints[2] - currentPoints[0]) * 0.75, Math.abs(currentPoints[3] - currentPoints[1]),
                                                    0, Math.abs(currentPoints[3] - currentPoints[1]),
                                                ]}
                                                fill={previewFill}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                                closed
                                            />
                                        ) : activeCanvasTool === 'cylinder' ? (
                                            <Group x={Math.min(currentPoints[0], currentPoints[2])} y={Math.min(currentPoints[1], currentPoints[3])}>
                                                <Rect
                                                    x={0}
                                                    y={Math.abs(currentPoints[3] - currentPoints[1]) * 0.1}
                                                    width={Math.abs(currentPoints[2] - currentPoints[0])}
                                                    height={Math.abs(currentPoints[3] - currentPoints[1]) * 0.8}
                                                    fill={previewFill}
                                                    stroke={previewStroke}
                                                    strokeWidth={strokeWidth}
                                                />
                                                <Ellipse
                                                    x={Math.abs(currentPoints[2] - currentPoints[0]) / 2}
                                                    y={Math.abs(currentPoints[3] - currentPoints[1]) * 0.1}
                                                    radiusX={Math.abs(currentPoints[2] - currentPoints[0]) / 2}
                                                    radiusY={Math.abs(currentPoints[3] - currentPoints[1]) * 0.1}
                                                    fill={previewFill}
                                                    stroke={previewStroke}
                                                    strokeWidth={strokeWidth}
                                                />
                                                <Ellipse
                                                    x={Math.abs(currentPoints[2] - currentPoints[0]) / 2}
                                                    y={Math.abs(currentPoints[3] - currentPoints[1]) * 0.9}
                                                    radiusX={Math.abs(currentPoints[2] - currentPoints[0]) / 2}
                                                    radiusY={Math.abs(currentPoints[3] - currentPoints[1]) * 0.1}
                                                    fill={previewFill}
                                                    stroke={previewStroke}
                                                    strokeWidth={strokeWidth}
                                                />
                                            </Group>
                                        ) : activeCanvasTool === 'note' ? (
                                            <Group x={Math.min(currentPoints[0], currentPoints[2])} y={Math.min(currentPoints[1], currentPoints[3])}>
                                                <Line
                                                    points={[
                                                        0, 0,
                                                        Math.abs(currentPoints[2] - currentPoints[0]) * 0.8, 0,
                                                        Math.abs(currentPoints[2] - currentPoints[0]), Math.abs(currentPoints[3] - currentPoints[1]) * 0.2,
                                                        Math.abs(currentPoints[2] - currentPoints[0]), Math.abs(currentPoints[3] - currentPoints[1]),
                                                        0, Math.abs(currentPoints[3] - currentPoints[1]),
                                                    ]}
                                                    fill={previewFill}
                                                    stroke={previewStroke}
                                                    strokeWidth={strokeWidth}
                                                    closed
                                                />
                                                <Line
                                                    points={[
                                                        Math.abs(currentPoints[2] - currentPoints[0]) * 0.8, 0,
                                                        Math.abs(currentPoints[2] - currentPoints[0]) * 0.8, Math.abs(currentPoints[3] - currentPoints[1]) * 0.2,
                                                        Math.abs(currentPoints[2] - currentPoints[0]), Math.abs(currentPoints[3] - currentPoints[1]) * 0.2,
                                                    ]}
                                                    stroke={previewStroke}
                                                    strokeWidth={strokeWidth}
                                                />
                                            </Group>
                                        ) : (activeCanvasTool === 'arrow' || activeCanvasTool === 'connect') ? (
                                            <Arrow
                                                points={flowPreviewConnectorPoints || [currentPoints[0], currentPoints[1], currentPoints[2], currentPoints[3]]}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                                dash={workspaceMode === 'flowchart' && flowConnectorStyle === 'dashed' ? [10, 6] : undefined}
                                                tension={flowPreviewConnectorPoints ? 0 : (workspaceMode === 'flowchart' && flowConnectorCurved ? 0.4 : 0)}
                                                fill={previewStroke}
                                                pointerLength={20}
                                                pointerWidth={20}
                                            />
                                        ) : activeCanvasTool === 'line' ? (
                                            <Line
                                                points={[currentPoints[0], currentPoints[1], currentPoints[2], currentPoints[3]]}
                                                stroke={previewStroke}
                                                strokeWidth={strokeWidth}
                                                dash={workspaceMode === 'flowchart' && flowConnectorStyle === 'dashed' ? [10, 6] : undefined}
                                                tension={workspaceMode === 'flowchart' && flowConnectorCurved ? 0.4 : 0}
                                                lineCap="round"
                                            />
                                        ) : null
                                    )
                                )}

                                {/* Transformer for resize/rotate handles */}
                                <Transformer
                                    ref={transformerRef}
                                    boundBoxFunc={(oldBox, newBox) => {
                                        // Limit minimum size
                                        if (newBox.width < 10 || newBox.height < 10) {
                                            return oldBox;
                                        }
                                        return newBox;
                                    }}
                                    onTransformEnd={(e) => {
                                        const node = e.target;
                                        const scaleX = node.scaleX();
                                        const scaleY = node.scaleY();

                                        // Reset scale and apply to width/height
                                        node.scaleX(1);
                                        node.scaleY(1);

                                        setElements(prev => prev.map(el => {
                                            if (el.id === selectedId) {
                                                const updates = {
                                                    x: node.x(),
                                                    y: node.y(),
                                                    rotation: node.rotation(),
                                                };
                                                if (el.type !== 'pen') {
                                                    updates.width = Math.max(10, node.width() * scaleX);
                                                    updates.height = Math.max(10, node.height() * scaleY);
                                                }
                                                if (el.type === 'text') {
                                                    updates.fontSize = Math.max(8, (el.fontSize || 24) * scaleY);
                                                }
                                                return { ...el, ...updates };
                                            }
                                            return el;
                                        }));
                                        triggerAutoSave(elements);
                                    }}
                                    rotateEnabled={true}
                                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                                    anchorSize={8}
                                    anchorCornerRadius={2}
                                    borderStroke="#8b3dff"
                                    anchorStroke="#8b3dff"
                                    anchorFill="#ffffff"
                                />
                            </Layer>
                        </Stage>

                        {workspaceMode === 'flowchart' && showFlowchartMiniMap && (() => {
                            const mmNodes = elements
                                .filter(el => el.visible !== false && FLOWCHART_NODE_TYPES.has(el.type))
                                .map(el => ({
                                    id: el.id,
                                    x: el.x || 0,
                                    y: el.y || 0,
                                    w: Math.max(20, el.width || 80),
                                    h: Math.max(20, el.height || 60),
                                    color: el.fill || '#c7d2fe',
                                }));

                            if (mmNodes.length === 0) return null;

                            const MM_W = 180;
                            const MM_H = 110;
                            const pad = 80;

                            const minX = Math.min(...mmNodes.map(n => n.x)) - pad;
                            const minY = Math.min(...mmNodes.map(n => n.y)) - pad;
                            const maxX = Math.max(...mmNodes.map(n => n.x + n.w)) + pad;
                            const maxY = Math.max(...mmNodes.map(n => n.y + n.h)) + pad;

                            const contentW = Math.max(1, maxX - minX);
                            const contentH = Math.max(1, maxY - minY);
                            const sx = MM_W / contentW;
                            const sy = MM_H / contentH;
                            const sc = Math.min(sx, sy);

                            const vpX = ((-stagePos.x / stageScale) - minX) * sc;
                            const vpY = ((-stagePos.y / stageScale) - minY) * sc;
                            const vpW = (canvasSize.width / stageScale) * sc;
                            const vpH = (canvasSize.height / stageScale) * sc;

                            return (
                                <div className="absolute bottom-4 right-4 w-[180px] h-[110px] bg-white/95 border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                                    <svg width={MM_W} height={MM_H}>
                                        {mmNodes.map(node => (
                                            <rect
                                                key={node.id}
                                                x={(node.x - minX) * sc}
                                                y={(node.y - minY) * sc}
                                                width={node.w * sc}
                                                height={node.h * sc}
                                                fill={node.color}
                                                stroke="#94a3b8"
                                                strokeWidth="0.8"
                                                rx="2"
                                            />
                                        ))}
                                        <rect
                                            x={vpX}
                                            y={vpY}
                                            width={vpW}
                                            height={vpH}
                                            fill="none"
                                            stroke="#4f46e5"
                                            strokeWidth="1.5"
                                            strokeDasharray="4,3"
                                            rx="2"
                                        />
                                    </svg>
                                    <div className="absolute top-1 left-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Mini Map</div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Enhanced Properties Panel with Tabs - Zinc frosted glass */}
                    <div className="w-80 h-[calc(100%-32px)] my-4 mr-4 bg-zinc-50/90 backdrop-blur-xl border border-zinc-200/50 overflow-y-auto shadow-2xl transition-all duration-300 ease-in-out flex flex-col rounded-2xl z-20 custom-scrollbar">
                        {/* Tab Headers */}
                        <div className="flex p-2 gap-1 bg-zinc-100/50 rounded-t-2xl border-b border-zinc-200/50">
                            {['design', 'layers', 'export'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setRightPanelTab(tab)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-xl ${rightPanelTab === tab
                                        ? 'text-purple-600 bg-white shadow-sm border border-purple-100'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto space-y-8 custom-scrollbar">
                            {/* DESIGN TAB */}
                            {rightPanelTab === 'design' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Background Pattern Toggle */}
                                    <div className="space-y-3">
                                        <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.1em] px-1 italic">Workspace Appearance</h4>
                                        <div className="flex items-center justify-between p-2 bg-zinc-100/50 rounded-2xl border border-zinc-200/50">
                                            <div className="flex items-center gap-2 pl-2">
                                                <Grid3X3 size={14} className="text-gray-500" />
                                                <span className="text-[11px] font-bold text-gray-700">Pattern</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setBackgroundPattern('grid')}
                                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all ${backgroundPattern === 'grid' ? 'bg-white shadow-sm text-purple-700 border border-purple-100' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Grid
                                                </button>
                                                <button
                                                    onClick={() => setBackgroundPattern('dots')}
                                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all ${backgroundPattern === 'dots' ? 'bg-white shadow-sm text-purple-700 border border-purple-100' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Dots
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Style Controls */}
                                    <div className="space-y-6">
                                        <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.1em] px-1 italic">Style Controls</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-600 ml-1 uppercase">Stroke</label>
                                                <div className="flex items-center gap-2 p-1.5 bg-gray-50/50 rounded-xl border border-gray-100 group hover:border-purple-200 transition-colors">
                                                    <input
                                                        type="color"
                                                        value={selectedElement?.stroke || strokeColor}
                                                        onChange={(e) => {
                                                            setStrokeColor(e.target.value);
                                                            if (selectedId) {
                                                                setElements(prev => prev.map(el =>
                                                                    el.id === selectedId ? { ...el, stroke: e.target.value } : el
                                                                ));
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                                                    />
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase truncate">
                                                        {(selectedElement?.stroke || strokeColor).slice(1)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-600 ml-1 uppercase">Fill</label>
                                                <div className="flex items-center gap-2 p-1.5 bg-gray-50/50 rounded-xl border border-gray-100 group hover:border-purple-200 transition-colors">
                                                    <input
                                                        type="color"
                                                        value={selectedElement?.fill || fillColor}
                                                        onChange={(e) => {
                                                            setFillColor(e.target.value);
                                                            if (selectedId) {
                                                                setElements(prev => prev.map(el =>
                                                                    el.id === selectedId ? { ...el, fill: e.target.value } : el
                                                                ));
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                                                    />
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase truncate">
                                                        {(selectedElement?.fill || fillColor).slice(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase">Thickness</label>
                                                <span className="text-[10px] font-black text-purple-600">{selectedElement?.strokeWidth || strokeWidth}PX</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="20"
                                                value={selectedElement?.strokeWidth || strokeWidth}
                                                onChange={(e) => {
                                                    const newWidth = parseInt(e.target.value);
                                                    setStrokeWidth(newWidth);
                                                    if (selectedId) {
                                                        setElements(prev => prev.map(el =>
                                                            el.id === selectedId ? { ...el, strokeWidth: newWidth } : el
                                                        ));
                                                    }
                                                }}
                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                            />
                                        </div>
                                    </div>

                                    {selectedElement && (
                                        <div className="space-y-6 pt-6 border-t border-gray-100 animate-in fade-in duration-500">
                                            {/* Shape header */}
                                            <div className="flex items-center gap-2 pb-1">
                                                {selectedElement.flowNodeType && (() => {
                                                    const def = getFlowchartShapeDef(selectedElement.flowNodeType);
                                                    return def ? (
                                                        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 text-sm font-bold"
                                                            style={{ background: def.fill, color: def.stroke, border: `1.5px solid ${def.stroke}` }}>
                                                            {def.icon}
                                                        </div>
                                                    ) : null;
                                                })()}
                                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.1em] italic">
                                                    {selectedElement.flowNodeType
                                                        ? (getFlowchartShapeDef(selectedElement.flowNodeType)?.label || selectedElement.flowNodeType.replace('fc-', ''))
                                                        : selectedElement.type
                                                    } Settings
                                                </h4>
                                            </div>

                                            {/* Flowchart node settings */}
                                            {selectedElement.flowNodeType && (
                                                <div className="space-y-3 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-gray-900">
                                                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">
                                                        {getFlowchartShapeDef(selectedElement.flowNodeType)?.label || 'Shape'} Properties
                                                    </label>

                                                    {/* Name — always shown */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-600 block mb-1">Name</label>
                                                        <input type="text"
                                                            value={selectedElement.text || ''}
                                                            onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, text: e.target.value } : el))}
                                                            placeholder={`Enter ${getFlowchartShapeDef(selectedElement.flowNodeType)?.label?.toLowerCase() || 'shape'} name…`}
                                                            className="w-full text-xs px-3 py-2 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-600 block mb-1">Description</label>
                                                        <textarea
                                                            value={selectedElement.description || ''}
                                                            onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, description: e.target.value } : el))}
                                                            placeholder="Optional description…"
                                                            rows={2}
                                                            className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none" />
                                                    </div>

                                                    {/* ── Process ── */}
                                                    {selectedElement.flowNodeType === 'fc-process' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Assignee</label>
                                                                <input type="text" value={selectedElement.assignee || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, assignee: e.target.value } : el))}
                                                                    placeholder="Who performs this step?"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Duration</label>
                                                                <input type="text" value={selectedElement.duration || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, duration: e.target.value } : el))}
                                                                    placeholder="e.g. 2 hours, 1 day"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Decision ── */}
                                                    {selectedElement.flowNodeType === 'fc-decision' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Condition</label>
                                                                <input type="text" value={selectedElement.condition || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, condition: e.target.value } : el))}
                                                                    placeholder="e.g. Is approved?"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-green-700 block mb-0.5">Yes Branch</label>
                                                                    <input type="text" value={selectedElement.yesBranch || 'Yes'}
                                                                        onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, yesBranch: e.target.value } : el))}
                                                                        className="w-full text-xs px-2 py-1 border border-green-200 rounded-lg bg-green-50 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-red-700 block mb-0.5">No Branch</label>
                                                                    <input type="text" value={selectedElement.noBranch || 'No'}
                                                                        onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, noBranch: e.target.value } : el))}
                                                                        className="w-full text-xs px-2 py-1 border border-red-200 rounded-lg bg-red-50 focus:outline-none" />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Terminal (Start/End) ── */}
                                                    {selectedElement.flowNodeType === 'fc-terminal' && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Terminal Type</label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button onClick={() => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, terminalType: 'start' } : el))}
                                                                    className={`py-1.5 text-[11px] font-bold rounded-xl border transition-colors ${(selectedElement.terminalType || 'start') === 'start' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                                        }`}>▶ Start</button>
                                                                <button onClick={() => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, terminalType: 'end' } : el))}
                                                                    className={`py-1.5 text-[11px] font-bold rounded-xl border transition-colors ${selectedElement.terminalType === 'end' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                                        }`}>⏹ End</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ── Input/Output ── */}
                                                    {selectedElement.flowNodeType === 'fc-io' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">I/O Type</label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <button onClick={() => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ioType: 'input' } : el))}
                                                                        className={`py-1.5 text-[11px] font-bold rounded-xl border transition-colors ${(selectedElement.ioType || 'input') === 'input' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200'
                                                                            }`}>↓ Input</button>
                                                                    <button onClick={() => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ioType: 'output' } : el))}
                                                                        className={`py-1.5 text-[11px] font-bold rounded-xl border transition-colors ${selectedElement.ioType === 'output' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200'
                                                                            }`}>↑ Output</button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Data Source</label>
                                                                <input type="text" value={selectedElement.dataSource || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, dataSource: e.target.value } : el))}
                                                                    placeholder="e.g. User form, API, File"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Database ── */}
                                                    {selectedElement.flowNodeType === 'fc-database' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Database Type</label>
                                                                <select value={selectedElement.dbType || 'sql'}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, dbType: e.target.value } : el))}
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white">
                                                                    <option value="sql">SQL Database</option>
                                                                    <option value="nosql">NoSQL Database</option>
                                                                    <option value="cache">Cache Store</option>
                                                                    <option value="file">File Storage</option>
                                                                    <option value="cloud">Cloud Storage</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Table / Collection</label>
                                                                <input type="text" value={selectedElement.tableName || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, tableName: e.target.value } : el))}
                                                                    placeholder="e.g. users, orders"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Operation</label>
                                                                <select value={selectedElement.dbOperation || 'read'}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, dbOperation: e.target.value } : el))}
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white">
                                                                    <option value="read">Read / Query</option>
                                                                    <option value="write">Write / Insert</option>
                                                                    <option value="update">Update</option>
                                                                    <option value="delete">Delete</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Document ── */}
                                                    {selectedElement.flowNodeType === 'fc-document' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Document Type</label>
                                                                <select value={selectedElement.docType || 'report'}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, docType: e.target.value } : el))}
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white">
                                                                    <option value="report">Report</option>
                                                                    <option value="form">Form</option>
                                                                    <option value="invoice">Invoice</option>
                                                                    <option value="email">Email</option>
                                                                    <option value="log">Log Entry</option>
                                                                    <option value="other">Other</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Template</label>
                                                                <input type="text" value={selectedElement.template || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, template: e.target.value } : el))}
                                                                    placeholder="Template name"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Predefined ── */}
                                                    {selectedElement.flowNodeType === 'fc-predefined' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Subroutine Name</label>
                                                                <input type="text" value={selectedElement.subroutine || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, subroutine: e.target.value } : el))}
                                                                    placeholder="Referenced process name"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Reference ID</label>
                                                                <input type="text" value={selectedElement.referenceId || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, referenceId: e.target.value } : el))}
                                                                    placeholder="e.g. SUB-001"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Manual Input ── */}
                                                    {selectedElement.flowNodeType === 'fc-manual' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Input Method</label>
                                                                <select value={selectedElement.inputMethod || 'keyboard'}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, inputMethod: e.target.value } : el))}
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white">
                                                                    <option value="keyboard">Keyboard</option>
                                                                    <option value="form">Form Entry</option>
                                                                    <option value="scan">Scan / Barcode</option>
                                                                    <option value="voice">Voice Input</option>
                                                                    <option value="other">Other</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Required Fields</label>
                                                                <input type="text" value={selectedElement.requiredFields || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, requiredFields: e.target.value } : el))}
                                                                    placeholder="e.g. Name, Email, Amount"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Delay ── */}
                                                    {selectedElement.flowNodeType === 'fc-delay' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Wait Duration</label>
                                                                <input type="text" value={selectedElement.waitDuration || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, waitDuration: e.target.value } : el))}
                                                                    placeholder="e.g. 24 hours, 3 days"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Reason</label>
                                                                <input type="text" value={selectedElement.waitReason || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, waitReason: e.target.value } : el))}
                                                                    placeholder="Why is there a wait?"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── Connector (circle) ── */}
                                                    {selectedElement.flowNodeType === 'fc-connector' && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Reference Label</label>
                                                            <input type="text" value={selectedElement.refLabel || ''}
                                                                onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, refLabel: e.target.value } : el))}
                                                                placeholder="e.g. A, B, 1, 2"
                                                                className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            <p className="text-[9px] text-gray-400 mt-1">On-page connector reference</p>
                                                        </div>
                                                    )}

                                                    {/* ── Annotation ── */}
                                                    {selectedElement.flowNodeType === 'fc-annotation' && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-600 block mb-1">Note</label>
                                                            <textarea value={selectedElement.noteText || ''}
                                                                onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, noteText: e.target.value } : el))}
                                                                placeholder="Add a detailed note…"
                                                                rows={3}
                                                                className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white resize-none" />
                                                        </div>
                                                    )}

                                                    {/* ── Data Store ── */}
                                                    {selectedElement.flowNodeType === 'fc-data' && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Storage Type</label>
                                                                <select value={selectedElement.storageType || 'internal'}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, storageType: e.target.value } : el))}
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white">
                                                                    <option value="internal">Internal Data</option>
                                                                    <option value="external">External Source</option>
                                                                    <option value="api">API Endpoint</option>
                                                                    <option value="file">File System</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-600 block mb-1">Data Format</label>
                                                                <input type="text" value={selectedElement.dataFormat || ''}
                                                                    onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, dataFormat: e.target.value } : el))}
                                                                    placeholder="e.g. JSON, CSV, XML"
                                                                    className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-xl focus:outline-none bg-white" />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {/* Opacity */}
                                                <div className="space-y-3 p-4 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-bold text-gray-700 uppercase">Transparency</label>
                                                        <span className="text-[10px] font-black text-purple-700">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.1"
                                                        value={selectedElement.opacity ?? 1}
                                                        onChange={(e) => updateElementOpacity(selectedElement.id, parseFloat(e.target.value))}
                                                        className="w-full h-1.5 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                    />
                                                </div>

                                                {/* Rotation */}
                                                <div className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-bold text-gray-700 ml-1 uppercase flex items-center gap-1.5">
                                                            <RotateCw size={12} className="text-gray-500" />
                                                            Rotation
                                                        </label>
                                                        <div className="flex items-center gap-0.5">
                                                            <input
                                                                type="number"
                                                                value={Math.round(selectedElement.rotation || 0)}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setElements(elements.map(el => el.id === selectedId ? { ...el, rotation: ((val % 360) + 360) % 360 } : el));
                                                                }}
                                                                className="w-10 bg-transparent text-[11px] font-bold text-purple-700 text-right focus:outline-none"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-500">°</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="360"
                                                        value={selectedElement.rotation || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            setElements(elements.map(el => el.id === selectedId ? { ...el, rotation: val } : el));
                                                        }}
                                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                    />
                                                </div>

                                                {/* Font Controls */}
                                                {selectedElement.type === 'text' && (
                                                    <div className="space-y-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                                                        <label className="text-[11px] font-black text-purple-800 uppercase tracking-widest block italic">Typography</label>
                                                        <div className="space-y-4">
                                                            <select
                                                                value={selectedElement.fontFamily || 'Arial'}
                                                                onChange={(e) => updateSelectedFont({ fontFamily: e.target.value })}
                                                                className="w-full px-3 py-2 text-[11px] font-bold border border-purple-100 rounded-xl bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-sans"
                                                            >
                                                                {fontFamilies.map(font => (
                                                                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                                                ))}
                                                            </select>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="range" min="8" max="120"
                                                                    value={selectedElement.fontSize || 24}
                                                                    onChange={(e) => updateSelectedFont({ fontSize: parseInt(e.target.value) })}
                                                                    className="flex-1 h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                                />
                                                                <span className="text-[11px] font-bold text-purple-700 w-10 text-right">{selectedElement.fontSize || 24}PX</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        const style = selectedElement.fontStyle || 'normal';
                                                                        const bold = style.includes('bold');
                                                                        const italic = style.includes('italic');
                                                                        updateSelectedFont({ fontStyle: bold ? (italic ? 'italic' : 'normal') : (italic ? 'bold italic' : 'bold') });
                                                                    }}
                                                                    className={`py-2 px-3 text-xs font-black rounded-xl border transition-all ${selectedElement.fontStyle?.includes('bold') ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-100 hover:border-purple-200'}`}
                                                                >
                                                                    B
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const style = selectedElement.fontStyle || 'normal';
                                                                        const bold = style.includes('bold');
                                                                        const italic = style.includes('italic');
                                                                        updateSelectedFont({ fontStyle: italic ? (bold ? 'bold' : 'normal') : (bold ? 'bold italic' : 'italic') });
                                                                    }}
                                                                    className={`py-2 px-3 text-xs italic font-black rounded-xl border transition-all ${selectedElement.fontStyle?.includes('italic') ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-100 hover:border-purple-200'}`}
                                                                >
                                                                    I
                                                                </button>
                                                            </div>
                                                            <div className="flex p-1 bg-white border border-gray-100 rounded-xl gap-1">
                                                                {['left', 'center', 'right'].map(align => (
                                                                    <button
                                                                        key={align}
                                                                        onClick={() => updateSelectedFont({ textAlign: align })}
                                                                        className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${(selectedElement.textAlign || 'left') === align ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
                                                                    >
                                                                        {align === 'left' && <AlignLeft size={14} />}
                                                                        {align === 'center' && <AlignCenter size={14} />}
                                                                        {align === 'right' && <AlignRight size={14} />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Drop Shadow Group */}
                                                <div className="space-y-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="text-[10px] font-bold text-gray-700 uppercase">Drop Shadow</label>
                                                        <button
                                                            onClick={() => updateElementShadow({ shadowColor: 'transparent', shadowBlur: 0 })}
                                                            className="text-[9px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase"
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 flex items-center gap-2 p-1.5 bg-white rounded-xl border border-gray-100">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.shadowColor || '#000000'}
                                                                onChange={(e) => updateElementShadow({ shadowColor: e.target.value })}
                                                                className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 bg-transparent"
                                                            />
                                                            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">HEX</span>
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Blur</span>
                                                                <span className="text-[9px] font-black text-purple-600">{selectedElement.shadowBlur || 0}PX</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="30"
                                                                value={selectedElement.shadowBlur || 0}
                                                                onChange={(e) => updateElementShadow({ shadowBlur: parseInt(e.target.value) })}
                                                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Corner Radius */}
                                                {selectedElement.type === 'rectangle' && (
                                                    <div className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-gray-600 uppercase">Rounding</label>
                                                            <span className="text-[10px] font-black text-purple-600">{selectedElement.cornerRadius || 0}PX</span>
                                                        </div>
                                                        <input
                                                            type="range" min="0" max="50"
                                                            value={selectedElement.cornerRadius || 0}
                                                            onChange={(e) => updateElementShadow({ cornerRadius: parseInt(e.target.value) })}
                                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                        />
                                                    </div>
                                                )}

                                                {/* Layering & Alignment */}
                                                <div className="space-y-4 pt-4">
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <button onClick={sendToBack} className="p-2.5 bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm rounded-xl text-gray-500 transition-all flex items-center justify-center"><ChevronsDown size={14} /></button>
                                                        <button onClick={sendBackward} className="p-2.5 bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm rounded-xl text-gray-500 transition-all flex items-center justify-center"><ChevronDown size={14} /></button>
                                                        <button onClick={bringForward} className="p-2.5 bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm rounded-xl text-gray-500 transition-all flex items-center justify-center"><ChevronUp size={14} /></button>
                                                        <button onClick={bringToFront} className="p-2.5 bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm rounded-xl text-gray-500 transition-all flex items-center justify-center"><ChevronsUp size={14} /></button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button onClick={copySelected} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100/50 hover:bg-gray-100 border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase transition-all"><Copy size={12} /> Copy</button>
                                                        <button onClick={duplicateSelected} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100/50 hover:bg-gray-100 border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase transition-all"><Clipboard size={12} /> Clone</button>
                                                        <button onClick={deleteSelected} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase transition-all"><Trash2 size={12} /> Del</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!selectedElement && (
                                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-700">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-inner">
                                                <MousePointer2 size={24} className="text-gray-300 transform -rotate-12" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest">No Selection</p>
                                                <p className="text-[10px] font-bold text-gray-400 max-w-[140px] leading-relaxed">Select an object on the canvas to edit its properties</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LAYERS TAB */}
                            {rightPanelTab === 'layers' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.1em] italic">Project Layers</h4>
                                        <span className="text-[10px] font-black text-purple-700 bg-purple-100/50 px-2 py-0.5 rounded-full">{elements.length}</span>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
                                        <LayersPanel
                                            elements={elements}
                                            selectedIds={selectedId ? [selectedId] : []}
                                            onSelectElement={(id) => { setSelectedId(id); setTool('select'); }}
                                            onToggleVisibility={toggleVisibility}
                                            onToggleLock={toggleLock}
                                            onDelete={(id) => {
                                                const newElements = elements.filter(el => el.id !== id);
                                                saveToHistory(newElements);
                                                if (selectedId === id) setSelectedId(null);
                                            }}
                                            onMoveUp={moveLayerUp}
                                            onMoveDown={moveLayerDown}
                                            onOpacityChange={updateElementOpacity}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* EXPORT TAB */}
                            {rightPanelTab === 'export' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Production Export</h4>
                                        <div className="grid gap-3">
                                            <button onClick={exportAsPNG} className="group relative w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:shadow-xl hover:shadow-purple-500/30 transition-all transform hover:-translate-y-0.5 overflow-hidden">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Download size={18} /></div>
                                                    <span>Export as PNG</span>
                                                </div>
                                                <span className="opacity-40 group-hover:opacity-100 transition-opacity">HIGH RES</span>
                                            </button>
                                            <button onClick={exportAsJPG} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:border-purple-200 hover:bg-purple-50/30 transition-all">
                                                <Download size={16} className="text-gray-400" /> Export as JPG
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hotkeys Reference</h4>
                                        <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                                            {[
                                                { label: 'Undo/Redo', key: '⌘Z / ⌘⇧Z' },
                                                { label: 'Duplicate', key: '⌘D' },
                                                { label: 'Layering', key: '[ / ]' },
                                                { label: 'Delete', key: 'Delete' },
                                                { label: 'Grid Snap', key: 'G' }
                                            ].map((item, i) => (
                                                <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-gray-500">{item.label}</span>
                                                    <kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-[9px] text-gray-400 font-mono shadow-sm">{item.key}</kbd>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
