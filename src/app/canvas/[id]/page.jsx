/**
 * @fileoverview Professional infinite canvas with zoom/pan using Konva
 * Features: Firestore persistence, editable title, auto-save
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Stage, Layer, Line, Rect, Circle, Star, RegularPolygon, Text, Arrow, Image as KonvaImage, Transformer, Group } from 'react-konva';
import {
    MousePointer2, Pencil, Type, Square, Circle as CircleIcon, Triangle,
    Star as StarIcon, ArrowRight, Minus, Hexagon, Pentagon, Trash2,
    ZoomIn, ZoomOut, Maximize2, Eraser, Undo, Redo, Save, Check, ArrowLeft, Image as ImageIcon,
    Copy, Clipboard, Download, AlignLeft, AlignCenter, AlignRight, AlignStartVertical,
    AlignCenterVertical, AlignEndVertical, Layers, Grid3X3, Eye, EyeOff, Lock, Unlock,
    ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Group as GroupIcon, Ungroup, RotateCw
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import LayersPanel from '@/components/LayersPanel';

const CANVAS_WIDTH = typeof window !== 'undefined' ? window.innerWidth - 480 : 1200;
const CANVAS_HEIGHT = typeof window !== 'undefined' ? window.innerHeight - 56 : 800;

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
    const [tool, setTool] = useState('pen');
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
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
    const [snapToGrid, setSnapToGrid] = useState(false); // Grid snapping
    const [rightPanelTab, setRightPanelTab] = useState('design'); // 'design' | 'layers' | 'export'
    const transformerRef = useRef(null);

    // Font settings for text elements
    const [fontFamily, setFontFamily] = useState('Arial');
    const [fontSize, setFontSize] = useState(24);
    const [fontStyle, setFontStyle] = useState('normal'); // 'normal' | 'italic'
    const [fontWeight, setFontWeight] = useState('normal'); // 'normal' | 'bold'

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
     * Load canvas data from Firestore
     */
    useEffect(() => {
        if (!user || !canvasId) return;

        const loadCanvas = async () => {
            try {
                const docRef = doc(db, 'canvases', canvasId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCanvasTitle(data.title || 'Untitled');
                    setElements(data.elements || []);
                    setHistory([data.elements || []]);
                    setHistoryStep(0);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error loading canvas:', error);
                setLoading(false);
            }
        };

        loadCanvas();
    }, [user, canvasId]);

    /**
     * Save canvas to Firestore
     */
    const saveCanvas = useCallback(async (elementsToSave, titleToSave) => {
        if (!user || !canvasId) return;

        setSaving(true);
        try {
            const docRef = doc(db, 'canvases', canvasId);
            await setDoc(docRef, {
                id: canvasId,
                title: titleToSave || canvasTitle,
                elements: elementsToSave || elements,
                ownerId: user.uid,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });

            setLastSaved(new Date());
            console.log('Canvas saved successfully');
        } catch (error) {
            console.error('Error saving canvas:', error);
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

    // ===== EXPORT FUNCTIONS =====
    const exportAsPNG = useCallback(() => {
        if (!stageRef.current) return;
        const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `${canvasTitle || 'canvas'}.png`;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [canvasTitle]);

    const exportAsJPG = useCallback(() => {
        if (!stageRef.current) return;
        const uri = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.9 });
        const link = document.createElement('a');
        link.download = `${canvasTitle || 'canvas'}.jpg`;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [canvasTitle]);
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

        const viewCenterX = (-stagePos.x + CANVAS_WIDTH / 2) / stageScale;
        const viewCenterY = (-stagePos.y + CANVAS_HEIGHT / 2) / stageScale;

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

    // ===== SNAP TO GRID HELPER =====
    const snapPosition = useCallback((pos) => {
        if (!snapToGrid) return pos;
        const gridSize = 50;
        return {
            x: Math.round(pos.x / gridSize) * gridSize,
            y: Math.round(pos.y / gridSize) * gridSize
        };
    }, [snapToGrid]);

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
                    x: (-stagePos.x + CANVAS_WIDTH / 2) / stageScale - (img.width > 500 ? 250 : img.width / 2),
                    y: (-stagePos.y + CANVAS_HEIGHT / 2) / stageScale - (img.width > 500 ? (img.height * (500 / img.width)) / 2 : img.height / 2),
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
     * Keyboard shortcuts
     */
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isEditingTitle) return;

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                redo();
            }
            // Save
            else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveCanvas(elements, canvasTitle);
            }
            // Copy
            else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copySelected();
            }
            // Paste
            else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                pasteClipboard();
            }
            // Duplicate
            else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                duplicateSelected();
            }
            // Delete
            else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    e.preventDefault();
                    const newElements = elements.filter(el => el.id !== selectedId);
                    saveToHistory(newElements);
                    setSelectedId(null);
                }
            }
            // Z-index: [ and ] keys
            else if (e.key === ']' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                e.shiftKey ? bringToFront() : bringForward();
            }
            else if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                e.shiftKey ? sendToBack() : sendBackward();
            }
            // Toggle snap to grid with 'g'
            else if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
                setSnapToGrid(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, isEditingTitle, saveCanvas, elements, canvasTitle, copySelected, pasteClipboard, duplicateSelected, selectedId, saveToHistory, bringToFront, sendToBack, bringForward, sendBackward]);

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

        const commonProps = {
            id: `shape-${shape.id}`,
            opacity: shape.opacity ?? 1,
            onClick: (e) => {
                // Allow selection with select tool or text tool (for text elements)
                if ((tool === 'select' || tool === 'text') && !isLocked) {
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
                    if (tool === 'text') setTool('select');
                }
            },
            draggable: tool === 'select' && !isLocked,
            onDragEnd: (e) => {
                if (isLocked) return;
                let newPos = { x: e.target.x(), y: e.target.y() };
                if (snapToGrid) {
                    newPos = snapPosition(newPos);
                    e.target.x(newPos.x);
                    e.target.y(newPos.y);
                }
                setElements(prevElements => prevElements.map(el =>
                    el.id === shape.id
                        ? { ...el, x: newPos.x, y: newPos.y }
                        : el
                ));
            },
            stroke: isSelected ? '#8b3dff' : (shape.stroke || strokeColor),
            strokeWidth: isSelected ? strokeWidth + 2 : (shape.strokeWidth || strokeWidth),
            dash: isSelected ? [5, 5] : undefined,
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

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'pen', icon: Pencil, label: 'Pen' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'image', icon: ImageIcon, label: 'Image' },
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

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                accept="image/*"
            />
            {/* Header */}
            <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    {/* Back button */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>

                    <div className="h-6 w-px bg-gray-300" />

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">P</span>
                        </div>

                        {/* Editable Title */}
                        {isEditingTitle ? (
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={canvasTitle}
                                onChange={(e) => setCanvasTitle(e.target.value)}
                                onBlur={handleTitleSubmit}
                                onKeyDown={handleTitleKeyDown}
                                className="font-bold text-lg tracking-tight text-gray-900 bg-gray-100 px-2 py-1 rounded border border-purple-300 outline-none focus:border-purple-500"
                                style={{ minWidth: '150px' }}
                            />
                        ) : (
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="font-bold text-lg tracking-tight text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                title="Click to edit title"
                            >
                                {canvasTitle}
                            </button>
                        )}
                    </div>

                    {/* Save status */}
                    <div className="flex items-center gap-2 ml-4">
                        {saving ? (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Save size={12} className="animate-pulse" />
                                Saving...
                            </span>
                        ) : lastSaved ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                                <Check size={12} />
                                Saved
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Undo/Redo and Zoom controls */}
                <div className="flex items-center gap-2">
                    {/* Manual Save */}
                    <button
                        onClick={() => saveCanvas(elements, canvasTitle)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                        title="Save (Ctrl+S)"
                    >
                        <Save size={18} className="text-gray-600" />
                    </button>

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
                                        onClick={() => {
                                            if (t.id === 'image') {
                                                fileInputRef.current?.click();
                                            } else {
                                                setTool(t.id);
                                            }
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
                                    ) : tool === 'triangle' ? (
                                        <RegularPolygon
                                            x={(currentPoints[0] + currentPoints[2]) / 2}
                                            y={(currentPoints[1] + currentPoints[3]) / 2}
                                            sides={3}
                                            radius={Math.min(
                                                Math.abs(currentPoints[2] - currentPoints[0]),
                                                Math.abs(currentPoints[3] - currentPoints[1])
                                            ) / 2}
                                            fill={fillColor}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : tool === 'star' ? (
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
                                            fill={fillColor}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : tool === 'hexagon' ? (
                                        <RegularPolygon
                                            x={(currentPoints[0] + currentPoints[2]) / 2}
                                            y={(currentPoints[1] + currentPoints[3]) / 2}
                                            sides={6}
                                            radius={Math.min(
                                                Math.abs(currentPoints[2] - currentPoints[0]),
                                                Math.abs(currentPoints[3] - currentPoints[1])
                                            ) / 2}
                                            fill={fillColor}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : tool === 'pentagon' ? (
                                        <RegularPolygon
                                            x={(currentPoints[0] + currentPoints[2]) / 2}
                                            y={(currentPoints[1] + currentPoints[3]) / 2}
                                            sides={5}
                                            radius={Math.min(
                                                Math.abs(currentPoints[2] - currentPoints[0]),
                                                Math.abs(currentPoints[3] - currentPoints[1])
                                            ) / 2}
                                            fill={fillColor}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                        />
                                    ) : tool === 'arrow' ? (
                                        <Arrow
                                            points={[currentPoints[0], currentPoints[1], currentPoints[2], currentPoints[3]]}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            fill={strokeColor}
                                            pointerLength={20}
                                            pointerWidth={20}
                                        />
                                    ) : tool === 'line' ? (
                                        <Line
                                            points={[currentPoints[0], currentPoints[1], currentPoints[2], currentPoints[3]]}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
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
                </div>

                {/* Enhanced Properties Panel with Tabs */}
                <div className="w-[280px] bg-white border-l border-gray-200 overflow-y-auto shadow-sm flex flex-col">
                    {/* Tab Headers */}
                    <div className="flex border-b border-gray-200">
                        {['design', 'layers', 'export'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setRightPanelTab(tab)}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${rightPanelTab === tab
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                        {/* DESIGN TAB */}
                        {rightPanelTab === 'design' && (
                            <div className="space-y-6">
                                {/* Snap to Grid Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <Grid3X3 size={16} className="text-gray-600" />
                                        <span className="text-xs font-semibold text-gray-700">Snap to Grid</span>
                                    </div>
                                    <button
                                        onClick={() => setSnapToGrid(!snapToGrid)}
                                        className={`w-10 h-6 rounded-full transition-colors ${snapToGrid ? 'bg-purple-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${snapToGrid ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Colors */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">Stroke Color</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200" />
                                        <input type="text" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono uppercase" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">Fill Color</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200" />
                                        <input type="text" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono uppercase" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">Stroke Width</label>
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="flex-1" />
                                        <span className="text-xs font-mono w-8 text-center">{strokeWidth}px</span>
                                    </div>
                                </div>

                                {/* Selected Element Controls */}
                                {selectedElement && (
                                    <>
                                        <div className="pt-4 border-t border-gray-200">
                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Selected: {selectedElement.type}</h4>

                                            {/* Opacity Control */}
                                            <div className="mb-4">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Opacity</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range" min="0" max="1" step="0.1"
                                                        value={selectedElement.opacity ?? 1}
                                                        onChange={(e) => updateElementOpacity(selectedElement.id, parseFloat(e.target.value))}
                                                        className="flex-1"
                                                    />
                                                    <span className="text-xs w-10">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                                                </div>
                                            </div>

                                            {/* Rotation Control */}
                                            <div className="mb-4">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                                                    <RotateCw size={12} />
                                                    Rotation
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range" min="0" max="360" step="1"
                                                        value={selectedElement.rotation || 0}
                                                        onChange={(e) => {
                                                            const newRotation = parseInt(e.target.value);
                                                            setElements(prev => prev.map(el =>
                                                                el.id === selectedId
                                                                    ? { ...el, rotation: newRotation }
                                                                    : el
                                                            ));
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={selectedElement.rotation || 0}
                                                        onChange={(e) => {
                                                            const newRotation = parseInt(e.target.value) || 0;
                                                            setElements(prev => prev.map(el =>
                                                                el.id === selectedId
                                                                    ? { ...el, rotation: ((newRotation % 360) + 360) % 360 }
                                                                    : el
                                                            ));
                                                        }}
                                                        className="w-12 px-1 py-1 text-xs border rounded text-center"
                                                    />
                                                    <span className="text-xs text-gray-400">°</span>
                                                </div>
                                            </div>

                                            {/* Shadow Controls */}
                                            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wider">Shadow</label>

                                                <div className="space-y-3">
                                                    {/* Shadow Color */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-600 w-12">Color</span>
                                                        <input
                                                            type="color"
                                                            value={selectedElement.shadowColor || '#000000'}
                                                            onChange={(e) => updateElementShadow({ shadowColor: e.target.value })}
                                                            className="w-8 h-8 rounded border cursor-pointer"
                                                        />
                                                        <button
                                                            onClick={() => updateElementShadow({ shadowColor: 'transparent', shadowBlur: 0 })}
                                                            className="text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>

                                                    {/* Shadow Blur */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-600 w-12">Blur</span>
                                                        <input
                                                            type="range" min="0" max="30" step="1"
                                                            value={selectedElement.shadowBlur || 0}
                                                            onChange={(e) => updateElementShadow({ shadowBlur: parseInt(e.target.value) })}
                                                            className="flex-1"
                                                        />
                                                        <span className="text-xs w-8">{selectedElement.shadowBlur || 0}</span>
                                                    </div>

                                                    {/* Shadow Offset X/Y */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-gray-600">X</span>
                                                            <input
                                                                type="number"
                                                                value={selectedElement.shadowOffsetX || 0}
                                                                onChange={(e) => updateElementShadow({ shadowOffsetX: parseInt(e.target.value) })}
                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-gray-600">Y</span>
                                                            <input
                                                                type="number"
                                                                value={selectedElement.shadowOffsetY || 0}
                                                                onChange={(e) => updateElementShadow({ shadowOffsetY: parseInt(e.target.value) })}
                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Corner Radius - Only for rectangles */}
                                            {selectedElement.type === 'rectangle' && (
                                                <div className="mb-4">
                                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Corner Radius</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="range" min="0" max="50" step="1"
                                                            value={selectedElement.cornerRadius || 0}
                                                            onChange={(e) => updateElementShadow({ cornerRadius: parseInt(e.target.value) })}
                                                            className="flex-1"
                                                        />
                                                        <span className="text-xs w-10">{selectedElement.cornerRadius || 0}px</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Font Controls - Only for text elements */}
                                            {selectedElement.type === 'text' && (
                                                <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                                                    <label className="text-xs font-bold text-purple-700 mb-2 block uppercase tracking-wider">Font Settings</label>

                                                    {/* Font Family */}
                                                    <div className="mb-3">
                                                        <label className="text-xs text-gray-600 mb-1 block">Font Family</label>
                                                        <select
                                                            value={selectedElement.fontFamily || 'Arial'}
                                                            onChange={(e) => updateSelectedFont({ fontFamily: e.target.value })}
                                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                                                        >
                                                            {fontFamilies.map(font => (
                                                                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Font Size */}
                                                    <div className="mb-3">
                                                        <label className="text-xs text-gray-600 mb-1 block">Font Size</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="range" min="8" max="120"
                                                                value={selectedElement.fontSize || 24}
                                                                onChange={(e) => updateSelectedFont({ fontSize: parseInt(e.target.value) })}
                                                                className="flex-1"
                                                            />
                                                            <input
                                                                type="number" min="8" max="200"
                                                                value={selectedElement.fontSize || 24}
                                                                onChange={(e) => updateSelectedFont({ fontSize: parseInt(e.target.value) })}
                                                                className="w-14 px-2 py-1 text-xs border border-gray-200 rounded text-center"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Bold / Italic Toggles */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const currentStyle = selectedElement.fontStyle || 'normal';
                                                                const isBold = currentStyle.includes('bold');
                                                                const isItalic = currentStyle.includes('italic');
                                                                let newStyle = isBold ? (isItalic ? 'italic' : 'normal') : (isItalic ? 'bold italic' : 'bold');
                                                                updateSelectedFont({ fontStyle: newStyle });
                                                            }}
                                                            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${(selectedElement.fontStyle || '').includes('bold')
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            B
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const currentStyle = selectedElement.fontStyle || 'normal';
                                                                const isBold = currentStyle.includes('bold');
                                                                const isItalic = currentStyle.includes('italic');
                                                                let newStyle = isItalic ? (isBold ? 'bold' : 'normal') : (isBold ? 'bold italic' : 'italic');
                                                                updateSelectedFont({ fontStyle: newStyle });
                                                            }}
                                                            className={`flex-1 py-2 px-3 text-xs italic rounded-lg border transition-colors ${(selectedElement.fontStyle || '').includes('italic')
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            I
                                                        </button>
                                                    </div>

                                                    {/* Text Alignment */}
                                                    <div className="mb-4">
                                                        <label className="text-xs font-semibold text-gray-600 mb-2 block">Text Align</label>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <button
                                                                onClick={() => updateSelectedFont({ textAlign: 'left' })}
                                                                className={`py-2 px-3 text-xs rounded-lg border transition-colors ${(selectedElement.textAlign || 'left') === 'left' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                                            >
                                                                <AlignLeft size={14} className="mx-auto" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateSelectedFont({ textAlign: 'center' })}
                                                                className={`py-2 px-3 text-xs rounded-lg border transition-colors ${selectedElement.textAlign === 'center' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                                            >
                                                                <AlignCenter size={14} className="mx-auto" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateSelectedFont({ textAlign: 'right' })}
                                                                className={`py-2 px-3 text-xs rounded-lg border transition-colors ${selectedElement.textAlign === 'right' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                                            >
                                                                <AlignRight size={14} className="mx-auto" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Z-Index Controls */}
                                            <div className="mb-4">
                                                <label className="text-xs font-semibold text-gray-600 mb-2 block">Layer Order</label>
                                                <div className="grid grid-cols-4 gap-1">
                                                    <button onClick={sendToBack} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Send to Back"><ChevronsDown size={14} /></button>
                                                    <button onClick={sendBackward} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Send Backward"><ChevronDown size={14} /></button>
                                                    <button onClick={bringForward} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Bring Forward"><ChevronUp size={14} /></button>
                                                    <button onClick={bringToFront} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Bring to Front"><ChevronsUp size={14} /></button>
                                                </div>
                                            </div>

                                            {/* Alignment Controls */}
                                            <div className="mb-4">
                                                <label className="text-xs font-semibold text-gray-600 mb-2 block">Align</label>
                                                <div className="grid grid-cols-3 gap-1">
                                                    <button onClick={() => alignSelected('left')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Align Left"><AlignLeft size={14} /></button>
                                                    <button onClick={() => alignSelected('center')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Align Center"><AlignCenter size={14} /></button>
                                                    <button onClick={() => alignSelected('right')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Align Right"><AlignRight size={14} /></button>
                                                    <button onClick={() => alignSelected('top')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Align Top"><AlignStartVertical size={14} /></button>
                                                    <button onClick={() => alignSelected('middle')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Align Middle"><AlignCenterVertical size={14} /></button>
                                                    <button onClick={() => alignSelected('bottom')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600" title="Align Bottom"><AlignEndVertical size={14} /></button>
                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={copySelected} className="flex items-center justify-center gap-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700">
                                                    <Copy size={12} /> Copy
                                                </button>
                                                <button onClick={duplicateSelected} className="flex items-center justify-center gap-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700">
                                                    <Clipboard size={12} /> Duplicate
                                                </button>
                                            </div>

                                            <button onClick={deleteSelected} className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors border border-red-200">
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </>
                                )}

                                {!selectedElement && (
                                    <div className="text-center text-gray-400 mt-8">
                                        <div className="text-3xl mb-2">🎨</div>
                                        <div className="text-xs">Select an element to edit</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LAYERS TAB */}
                        {rightPanelTab === 'layers' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Layers ({elements.length})</h4>
                                </div>
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
                        )}

                        {/* EXPORT TAB */}
                        {rightPanelTab === 'export' && (
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Export Canvas</h4>

                                <button onClick={exportAsPNG} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30">
                                    <Download size={16} /> Export as PNG
                                </button>

                                <button onClick={exportAsJPG} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors border border-gray-200">
                                    <Download size={16} /> Export as JPG
                                </button>

                                <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
                                    <p className="mb-2"><strong>Tips:</strong></p>
                                    <ul className="space-y-1 text-gray-400">
                                        <li>• PNG: Best for transparent backgrounds</li>
                                        <li>• JPG: Smaller file size, no transparency</li>
                                    </ul>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h5 className="text-xs font-bold text-gray-700 mb-2">Keyboard Shortcuts</h5>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div className="flex justify-between"><span>Copy</span><kbd className="bg-gray-100 px-1 rounded">⌘C</kbd></div>
                                        <div className="flex justify-between"><span>Paste</span><kbd className="bg-gray-100 px-1 rounded">⌘V</kbd></div>
                                        <div className="flex justify-between"><span>Duplicate</span><kbd className="bg-gray-100 px-1 rounded">⌘D</kbd></div>
                                        <div className="flex justify-between"><span>Undo</span><kbd className="bg-gray-100 px-1 rounded">⌘Z</kbd></div>
                                        <div className="flex justify-between"><span>Redo</span><kbd className="bg-gray-100 px-1 rounded">⌘⇧Z</kbd></div>
                                        <div className="flex justify-between"><span>Bring Forward</span><kbd className="bg-gray-100 px-1 rounded">]</kbd></div>
                                        <div className="flex justify-between"><span>Send Backward</span><kbd className="bg-gray-100 px-1 rounded">[</kbd></div>
                                        <div className="flex justify-between"><span>Snap to Grid</span><kbd className="bg-gray-100 px-1 rounded">G</kbd></div>
                                        <div className="flex justify-between"><span>Delete</span><kbd className="bg-gray-100 px-1 rounded">Del</kbd></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
