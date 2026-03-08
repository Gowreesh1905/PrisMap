'use client';
/**
 * FlowchartBuilder — Fully functional flowchart editor built on Konva.
 *
 * Features:
 *  - 12 standard flowchart shapes dragged from a shape library
 *  - Smart connectors that auto-route and update when nodes move
 *  - Shape editing: text, fill color, stroke color, stroke width, font size
 *  - Resize handles (8-point), selection, multi-select (Ctrl+Click / drag-box)
 *  - Undo / Redo (Ctrl-Z / Ctrl-Y)
 *  - Keyboard shortcuts: Delete, Escape, Ctrl+A, Ctrl+D (duplicate), Ctrl+G (group)
 *  - Straight & curved connectors with labelled arrows
 *  - Connection points shown on hover / when connecting
 *  - Alignment guides (snap-to-neighbour)
 *  - Align & distribute toolbar
 *  - Auto layout (dagre-style simple top-down)
 *  - Mini-map
 *  - Export: JSON, PNG, SVG, PDF
 *  - Zoom in/out/reset, pan
 *  - Infinite grid with snap-to-grid
 *  - Contextual node menu (edit, duplicate, delete, color, layer order)
 *  - Decision node YES/NO labelled outgoing connectors
 */

import React, {
    useState, useRef, useCallback, useEffect, useMemo
} from 'react';
import {
    Stage, Layer, Rect, Circle, Ellipse, Line, Arrow, Text,
    RegularPolygon, Group, Transformer
} from 'react-konva';
import {
    MousePointer2, ZoomIn, ZoomOut, Maximize2, Undo, Redo,
    Trash2, Download, Settings, LogOut, ChevronLeft, ChevronRight,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Copy, Layers, GitMerge, Map, Grid, Move
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

/* ─────────────────────── constants ─────────────────────── */
const GRID = 20;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 8;
const HANDLE_SIZE = 8;
const CONN_PT_R = 6;
const CONNECT_SNAP_DISTANCE = 32;

/* ─────────────────────── shape catalogue ─────────────────────── */
const SHAPE_DEFS = [
    { type: 'fc-process',    label: 'Process',       w: 160, h: 60,  fill: '#dbeafe', stroke: '#3b82f6', icon: '▭',  desc: 'A standard process or action step' },
    { type: 'fc-terminal',   label: 'Start / End',   w: 160, h: 60,  fill: '#dcfce7', stroke: '#22c55e', icon: '⬭',  desc: 'Flow start or end point (terminator)' },
    { type: 'fc-decision',   label: 'Decision',      w: 140, h: 100, fill: '#fef9c3', stroke: '#eab308', icon: '◇',  desc: 'A decision or branching point' },
    { type: 'fc-io',         label: 'Input/Output',  w: 160, h: 60,  fill: '#e0e7ff', stroke: '#6366f1', icon: '▱',  desc: 'Data input or output operation' },
    { type: 'fc-connector',  label: 'Connector',     w: 50,  h: 50,  fill: '#fee2e2', stroke: '#ef4444', icon: '○',  desc: 'On-page connector reference' },
    { type: 'fc-document',   label: 'Document',      w: 160, h: 80,  fill: '#fff7ed', stroke: '#f97316', icon: '⌷',  desc: 'A document or report output' },
    { type: 'fc-database',   label: 'Database',      w: 120, h: 100, fill: '#f3e8ff', stroke: '#a855f7', icon: '⌗',  desc: 'Database storage' },
    { type: 'fc-predefined', label: 'Predefined',    w: 160, h: 60,  fill: '#e0f2fe', stroke: '#0ea5e9', icon: '▬',  desc: 'Predefined process / subroutine' },
    { type: 'fc-manual',     label: 'Manual Input',  w: 160, h: 70,  fill: '#fce7f3', stroke: '#ec4899', icon: '⌕',  desc: 'Manual data entry step' },
    { type: 'fc-delay',      label: 'Delay',         w: 160, h: 60,  fill: '#f0fdf4', stroke: '#16a34a', icon: 'D',  desc: 'Delay or wait period' },
    { type: 'fc-annotation', label: 'Annotation',    w: 180, h: 80,  fill: '#f8fafc', stroke: '#64748b', icon: '⌐',  desc: 'Comment or annotation' },
    { type: 'fc-data',       label: 'Data Store',    w: 160, h: 60,  fill: '#f1f5f9', stroke: '#475569', icon: '⊏',  desc: 'Stored data reference' },
];

/** Get human-readable name for a shape type */
function shapeTypeName(type) {
    const def = SHAPE_DEFS.find(d => d.type === type);
    return def ? def.label : type.replace('fc-', '');
}
/** Get description for a shape type */
function shapeTypeDesc(type) {
    const def = SHAPE_DEFS.find(d => d.type === type);
    return def ? def.desc : '';
}

/* ─────────────────────── helpers ─────────────────────── */
const snap = v => Math.round(v / GRID) * GRID;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function nodeCenter(n) {
    return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function connectionPoints(n) {
    return {
        top:    { x: n.x + n.w / 2, y: n.y },
        bottom: { x: n.x + n.w / 2, y: n.y + n.h },
        left:   { x: n.x,           y: n.y + n.h / 2 },
        right:  { x: n.x + n.w,     y: n.y + n.h / 2 },
    };
}

function nearestConnPt(node, px, py) {
    const pts = connectionPoints(node);
    let best = null, bestD = Infinity;
    for (const [side, pt] of Object.entries(pts)) {
        const d = Math.hypot(pt.x - px, pt.y - py);
        if (d < bestD) { bestD = d; best = side; }
    }
    return best;
}

/** Find the closest anchor point on any node within snap distance */
function getNearestAnchorTarget(nodes, px, py, excludeId = null) {
    let best = null, bestD = Infinity;
    for (const n of nodes) {
        if (n.id === excludeId) continue;
        const pts = connectionPoints(n);
        for (const [side, pt] of Object.entries(pts)) {
            const d = Math.hypot(pt.x - px, pt.y - py);
            if (d < CONNECT_SNAP_DISTANCE && d < bestD) {
                bestD = d;
                best = { nodeId: n.id, side, pt };
            }
        }
    }
    return best;
}

/** Determine optimal sides for a connector between two nodes */
function bestSides(fromNode, toNode) {
    const fc = nodeCenter(fromNode);
    const tc = nodeCenter(toNode);
    const dx = tc.x - fc.x;
    const dy = tc.y - fc.y;
    let fromSide, toSide;
    if (Math.abs(dx) > Math.abs(dy)) {
        fromSide = dx > 0 ? 'right' : 'left';
        toSide   = dx > 0 ? 'left'  : 'right';
    } else {
        fromSide = dy > 0 ? 'bottom' : 'top';
        toSide   = dy > 0 ? 'top'    : 'bottom';
    }
    return { fromSide, toSide };
}

/** Compute points for an orthogonal (elbow) connector */
function orthogonalPath(fn, fs, tn, ts) {
    const from = connectionPoints(fn)[fs];
    const to   = connectionPoints(tn)[ts];
    const MARGIN = 20;

    // Extend a stub from each anchor in the direction of the side
    function stub(pt, side, dist) {
        switch (side) {
            case 'right':  return { x: pt.x + dist, y: pt.y };
            case 'left':   return { x: pt.x - dist, y: pt.y };
            case 'bottom': return { x: pt.x, y: pt.y + dist };
            case 'top':    return { x: pt.x, y: pt.y - dist };
            default: return pt;
        }
    }

    const isHz = (s) => s === 'left' || s === 'right';
    const isVt = (s) => s === 'top' || s === 'bottom';

    // Same axis routing
    if (isHz(fs) && isHz(ts)) {
        const mx = (from.x + to.x) / 2;
        return [from.x, from.y, mx, from.y, mx, to.y, to.x, to.y];
    }
    if (isVt(fs) && isVt(ts)) {
        const my = (from.y + to.y) / 2;
        return [from.x, from.y, from.x, my, to.x, my, to.x, to.y];
    }
    // Cross axis — L-shape
    if (isHz(fs) && isVt(ts)) {
        return [from.x, from.y, to.x, from.y, to.x, to.y];
    }
    return [from.x, from.y, from.x, to.y, to.x, to.y];
}

/** Compute path points for a given route mode: 'straight', 'elbow', or 'curved' */
function connectorPath(fn, fs, tn, ts, mode) {
    const from = connectionPoints(fn)[fs];
    const to   = connectionPoints(tn)[ts];

    if (mode === 'straight') {
        return { points: [from.x, from.y, to.x, to.y], bezier: false };
    }

    if (mode === 'curved') {
        // Bezier control points extend outward from each side
        const dist = Math.max(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.4);
        const dirs = { right: [1,0], left: [-1,0], bottom: [0,1], top: [0,-1] };
        const fd = dirs[fs] || [0,0];
        const td = dirs[ts] || [0,0];
        return {
            points: [
                from.x, from.y,
                from.x + fd[0] * dist, from.y + fd[1] * dist,
                to.x + td[0] * dist, to.y + td[1] * dist,
                to.x, to.y
            ],
            bezier: true
        };
    }

    // Elbow (default)
    return { points: orthogonalPath(fn, fs, tn, ts), bezier: false };
}

function clampScale(s) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s));
}

/* ─────────────────────── shape path builders ─────────────────────── */
function shapePoints(type, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    switch (type) {
        case 'fc-process':
            // Rectangle with small corner radius — standard process box
            return { kind: 'rect', x, y, w, h, cornerRadius: 6 };
        case 'fc-terminal':
            // Stadium / pill shape — fully rounded ends
            return { kind: 'rect', x, y, w, h, cornerRadius: h / 2 };
        case 'fc-decision':
            // Perfect diamond centered in bounding box
            return {
                kind: 'poly',
                points: [cx, y, x + w, cy, cx, y + h, x, cy],
            };
        case 'fc-io':
            // Parallelogram — skewed 20% on each side
            {
                const skew = w * 0.18;
                return {
                    kind: 'poly',
                    points: [x + skew, y, x + w, y, x + w - skew, y + h, x, y + h],
                };
            }
        case 'fc-connector':
            // Small circle
            return { kind: 'circle', cx, cy, r: Math.min(w, h) / 2 };
        case 'fc-document':
            // Rectangle with wavy (sinusoidal) bottom edge — more points for smooth curve
            return {
                kind: 'custom',
                buildPath: () => {
                    const wave = h * 0.12;
                    const pts = [x, y, x + w, y, x + w, y + h - wave];
                    // Generate smooth wave across bottom using 8 segments
                    const segs = 8;
                    for (let i = segs; i >= 0; i--) {
                        const t = i / segs;
                        const px = x + w * t;
                        const py = y + h - wave + Math.sin(t * Math.PI * 2) * wave;
                        pts.push(px, py);
                    }
                    return pts;
                },
            };
        case 'fc-database':
            // Cylinder with elliptical top and bottom caps
            return { kind: 'database', x, y, w, h };
        case 'fc-predefined':
            // Rectangle with vertical bars 10% from each edge
            return {
                kind: 'predefined',
                x, y, w, h,
                barPct: 0.1,
            };
        case 'fc-manual':
            // Trapezoid wider at bottom — slanted top edges for manual input
            return {
                kind: 'poly',
                points: [
                    x + w * 0.12, y,
                    x + w * 0.88, y,
                    x + w, y + h,
                    x, y + h,
                ],
            };
        case 'fc-delay':
            // D-shape: flat left, semicircular right
            {
                const pts = [x, y];
                // Straight top to arc start
                pts.push(x + w * 0.6, y);
                // Right semicircle arc — approximate with 12 points
                const arcSegs = 12;
                const arcR = h / 2;
                const arcCx = x + w * 0.6;
                for (let i = 0; i <= arcSegs; i++) {
                    const angle = -Math.PI / 2 + (Math.PI * i) / arcSegs;
                    pts.push(arcCx + Math.cos(angle) * (w * 0.4), cy + Math.sin(angle) * arcR);
                }
                pts.push(x + w * 0.6, y + h);
                pts.push(x, y + h);
                return { kind: 'poly', points: pts };
            }
        case 'fc-annotation':
            // Open bracket on left side with text area
            return { kind: 'annotation', x, y, w, h };
        case 'fc-data':
            // Data store — open-ended rectangle with curved left side
            {
                const curve = w * 0.08;
                return {
                    kind: 'poly',
                    points: [
                        x + curve, y,
                        x + w, y,
                        x + w - curve, y + h,
                        x, y + h,
                    ],
                };
            }
        default:
            return { kind: 'rect', x, y, w, h, cornerRadius: 0 };
    }
}

/* ─────────────────────── ShapeRenderer ─────────────────────── */
function ShapeRenderer({ node, isSelected, onSelect, onDragEnd, stageScale, connHighlight, onConnHover, onConnClick, drawingConn, connHoverTarget, onDblClick }) {
    const { type, x, y, w, h, id } = node;
    const sp = shapePoints(type, x, y, w, h);
    const isHoverTarget = connHoverTarget && connHoverTarget.nodeId === id;
    const stroke = isHoverTarget ? '#22c55e' : isSelected ? '#6366f1' : (node.stroke || '#374151');
    const strokeWidth = ((isHoverTarget ? 3 : isSelected ? 2.5 : (node.strokeWidth || 2))) / stageScale;
    const fill = node.fill || '#ffffff';
    const selDash = isSelected && !isHoverTarget ? [6 / stageScale, 3 / stageScale] : undefined;
    const connPts = connectionPoints(node);

    // Compute text position — centered within the visual shape area
    const fontSize = (node.fontSize || 14) / stageScale;
    const isDecision = type === 'fc-decision';
    const isIO = type === 'fc-io';
    const isManual = type === 'fc-manual';
    const isDatabase = type === 'fc-database';
    const textPadX = isIO || isManual ? w * 0.2 : isDecision ? w * 0.2 : 12;
    const textPadY = isDatabase ? h * 0.3 : 0;
    const textProps = {
        x: x + textPadX,
        y: y + textPadY,
        width: w - textPadX * 2,
        height: h - textPadY,
        text: node.label || '',
        fontSize,
        fontFamily: 'Inter, Arial, sans-serif',
        fill: node.textColor || '#1e293b',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
        wrap: 'word',
        ellipsis: true,
    };

    const dragProps = {
        draggable: !drawingConn,
        onDragEnd: (e) => {
            onDragEnd(id, snap(e.target.x()), snap(e.target.y()));
            e.target.position({ x: snap(e.target.x()), y: snap(e.target.y()) });
        },
        onClick: (e) => {
            e.cancelBubble = true;
            if (drawingConn) {
                // In connect mode, clicking anywhere on a node picks the optimal anchor
                const stage = e.target.getStage();
                const ptr = stage.getPointerPosition();
                const canvasX = (ptr.x - stage.x()) / stage.scaleX();
                const canvasY = (ptr.y - stage.y()) / stage.scaleY();
                const best = nearestConnPt(node, canvasX, canvasY);
                const pt = connPts[best];
                onConnClick(id, best, pt);
            } else {
                onSelect(id, e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey);
            }
        },
        onDblClick: (e) => {
            e.cancelBubble = true;
            if (onDblClick) onDblClick(id);
        },
        onMouseEnter: () => { if (onConnHover) onConnHover(id); },
        onMouseLeave: () => { if (onConnHover) onConnHover(null); },
    };

    const showConn = connHighlight === id || drawingConn || isHoverTarget;

    function renderConnPoints() {
        if (!showConn) return null;
        return Object.entries(connPts).map(([side, pt]) => {
            const isTargetAnchor = isHoverTarget && connHoverTarget.side === side;
            const baseColor = isTargetAnchor ? '#22c55e' : connHighlight === id ? '#6366f1' : '#94a3b8';
            const r = (isTargetAnchor ? CONN_PT_R * 1.6 : CONN_PT_R) / stageScale;
            return (
                <React.Fragment key={side}>
                    {/* Invisible larger hit area for easier clicking */}
                    <Circle
                        x={pt.x}
                        y={pt.y}
                        radius={CONNECT_SNAP_DISTANCE / 2 / stageScale}
                        fill="transparent"
                        listening={true}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onConnClick(id, side, pt);
                        }}
                        onMouseEnter={() => { if (onConnHover) onConnHover(id); }}
                    />
                    {/* Glow ring for target anchor */}
                    {isTargetAnchor && (
                        <Circle
                            x={pt.x} y={pt.y}
                            radius={r * 1.8}
                            fill="rgba(34,197,94,0.15)"
                            stroke="#22c55e"
                            strokeWidth={1 / stageScale}
                            listening={false}
                        />
                    )}
                    {/* Visible connection point dot */}
                    <Circle
                        x={pt.x}
                        y={pt.y}
                        radius={r}
                        fill={baseColor}
                        stroke="#fff"
                        strokeWidth={1.5 / stageScale}
                        listening={true}
                        onMouseEnter={(e) => { e.target.fill('#4f46e5'); e.target.getLayer().batchDraw(); }}
                        onMouseLeave={(e) => { e.target.fill(baseColor); e.target.getLayer().batchDraw(); }}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onConnClick(id, side, pt);
                        }}
                    />
                </React.Fragment>
            );
        });
    }

    if (sp.kind === 'rect') {
        return (
            <Group key={id} {...dragProps}>
                <Rect
                    x={x} y={y} width={w} height={h}
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                    cornerRadius={sp.cornerRadius}
                    shadowBlur={isSelected ? 10 : 0}
                    shadowColor="#6366f155"
                    dash={selDash}
                />
                <Text {...textProps} />
                {renderConnPoints()}
            </Group>
        );
    }

    if (sp.kind === 'circle') {
        return (
            <Group key={id} {...dragProps}>
                <Circle
                    x={sp.cx} y={sp.cy} radius={sp.r}
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                    shadowBlur={isSelected ? 8 : 0} shadowColor="#6366f155"
                    dash={selDash}
                />
                <Text {...textProps} />
                {renderConnPoints()}
            </Group>
        );
    }

    if (sp.kind === 'poly') {
        const flatPts = sp.points;
        return (
            <Group key={id} {...dragProps}>
                <Line
                    points={flatPts}
                    closed
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                    shadowBlur={isSelected ? 8 : 0} shadowColor="#6366f155"
                    dash={selDash}
                />
                <Text {...textProps} />
                {renderConnPoints()}
            </Group>
        );
    }

    if (sp.kind === 'custom') {
        return (
            <Group key={id} {...dragProps}>
                <Line
                    points={sp.buildPath()}
                    closed
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                    dash={selDash}
                />
                <Text {...textProps} />
                {renderConnPoints()}
            </Group>
        );
    }

    if (sp.kind === 'database') {
        const rx = w / 2, ry = h * 0.15;
        return (
            <Group key={id} {...dragProps}>
                {/* Body rectangle between ellipses */}
                <Rect
                    x={x} y={y + ry} width={w} height={h - ry * 2}
                    fill={fill} stroke="transparent" strokeWidth={0}
                />
                {/* Left side line */}
                <Line points={[x, y + ry, x, y + h - ry]} stroke={stroke} strokeWidth={strokeWidth} />
                {/* Right side line */}
                <Line points={[x + w, y + ry, x + w, y + h - ry]} stroke={stroke} strokeWidth={strokeWidth} />
                {/* Top ellipse (full, on top) */}
                <Ellipse
                    x={x + rx} y={y + ry}
                    radiusX={rx} radiusY={ry}
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                />
                {/* Bottom half-ellipse (just the visible bottom arc) */}
                <Ellipse
                    x={x + rx} y={y + h - ry}
                    radiusX={rx} radiusY={ry}
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                />
                <Text {...textProps} />
                {renderConnPoints()}
            </Group>
        );
    }

    if (sp.kind === 'predefined') {
        const barX = w * sp.barPct;
        return (
            <Group key={id} {...dragProps}>
                <Rect x={x} y={y} width={w} height={h}
                    fill={fill} stroke={stroke} strokeWidth={strokeWidth} dash={selDash} />
                <Line points={[x + barX, y, x + barX, y + h]} stroke={stroke} strokeWidth={strokeWidth} />
                <Line points={[x + w - barX, y, x + w - barX, y + h]} stroke={stroke} strokeWidth={strokeWidth} />
                <Text {...textProps} />
                {renderConnPoints()}
            </Group>
        );
    }

    if (sp.kind === 'annotation') {
        return (
            <Group key={id} {...dragProps}>
                {/* Background for hit detection */}
                <Rect x={x} y={y} width={w} height={h}
                    fill={fill} stroke="transparent" strokeWidth={0} />
                {/* Left bracket — open square bracket shape */}
                <Line
                    points={[x + 18, y + 2, x + 2, y + 2, x + 2, y + h - 2, x + 18, y + h - 2]}
                    stroke={stroke} strokeWidth={strokeWidth * 1.2}
                    lineCap="round" lineJoin="round"
                />
                {/* Dashed line extending right from bracket */}
                <Line
                    points={[x + 2, y + h / 2, x + w, y + h / 2]}
                    stroke={stroke} strokeWidth={strokeWidth * 0.6}
                    dash={[4 / stageScale, 3 / stageScale]}
                />
                <Text {...textProps} x={x + 24} width={w - 32} />
                {renderConnPoints()}
            </Group>
        );
    }

    // fallback
    return (
        <Group key={id} {...dragProps}>
            <Rect x={x} y={y} width={w} height={h}
                fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <Text {...textProps} />
            {renderConnPoints()}
        </Group>
    );
}

/* ─────────────────────── ConnectorRenderer ─────────────────────── */
function ConnectorRenderer({ conn, nodes, isSelected, onSelect, stageScale, onDblClick }) {
    const fromNode = nodes.find(n => n.id === conn.fromId);
    const toNode   = nodes.find(n => n.id === conn.toId);
    if (!fromNode || !toNode) return null;

    const mode = conn.curved ? 'curved' : 'elbow';
    const { points: pts, bezier } = connectorPath(fromNode, conn.fromSide, toNode, conn.toSide, mode);

    // Compute label position at the midpoint of the path
    const fromPt = connectionPoints(fromNode)[conn.fromSide];
    const toPt = connectionPoints(toNode)[conn.toSide];
    const labelX = (fromPt.x + toPt.x) / 2;
    const labelY = (fromPt.y + toPt.y) / 2;

    const strokeColor = isSelected ? '#6366f1' : (conn.stroke || '#64748b');
    const sw = (conn.strokeWidth || 2) / stageScale;
    const dash = conn.style === 'dashed' ? [8 / stageScale, 4 / stageScale] : undefined;

    return (
        <Group
            onClick={(e) => { e.cancelBubble = true; onSelect(conn.id); }}
            onDblClick={(e) => { e.cancelBubble = true; if (onDblClick) onDblClick(conn.id); }}
        >
            {/* Wide invisible hit area */}
            <Line
                points={pts}
                stroke="transparent"
                strokeWidth={18 / stageScale}
                lineCap="round"
                bezier={bezier}
            />
            <Arrow
                points={pts}
                stroke={strokeColor}
                strokeWidth={sw}
                fill={strokeColor}
                dash={dash}
                pointerLength={10 / stageScale}
                pointerWidth={8 / stageScale}
                bezier={bezier}
                lineCap="round"
                lineJoin="round"
                listening={false}
            />
            {/* Endpoint dots */}
            {isSelected && (
                <>
                    <Circle x={fromPt.x} y={fromPt.y} radius={4 / stageScale} fill="#6366f1" stroke="#fff" strokeWidth={1.5 / stageScale} listening={false} />
                    <Circle x={toPt.x} y={toPt.y} radius={4 / stageScale} fill="#6366f1" stroke="#fff" strokeWidth={1.5 / stageScale} listening={false} />
                </>
            )}
            {conn.label && (
                <Group>
                    {/* Label background */}
                    <Rect
                        x={labelX - 30} y={labelY - 10}
                        width={60} height={20}
                        fill="white" cornerRadius={4}
                        stroke={strokeColor} strokeWidth={0.5 / stageScale}
                        opacity={0.9}
                        listening={false}
                    />
                    <Text
                        x={labelX - 30}
                        y={labelY - 8}
                        width={60}
                        text={conn.label}
                        fontSize={11 / stageScale}
                        fill={strokeColor}
                        fontStyle="bold"
                        align="center"
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
}

/* ─────────────────────── ResizeHandles ─────────────────────── */
function ResizeHandles({ node, stageScale, onResize }) {
    const { x, y, w, h, id } = node;
    const r = HANDLE_SIZE / stageScale / 2;
    const handles = [
        { name: 'nw', cx: x,       cy: y,       cursor: 'nw-resize' },
        { name: 'n',  cx: x + w/2, cy: y,       cursor: 'n-resize'  },
        { name: 'ne', cx: x + w,   cy: y,       cursor: 'ne-resize' },
        { name: 'e',  cx: x + w,   cy: y + h/2, cursor: 'e-resize'  },
        { name: 'se', cx: x + w,   cy: y + h,   cursor: 'se-resize' },
        { name: 's',  cx: x + w/2, cy: y + h,   cursor: 's-resize'  },
        { name: 'sw', cx: x,       cy: y + h,   cursor: 'sw-resize' },
        { name: 'w',  cx: x,       cy: y + h/2, cursor: 'w-resize'  },
    ];

    return (
        <>
            {handles.map(h => (
                <Rect
                    key={h.name}
                    x={h.cx - r} y={h.cy - r}
                    width={r * 2} height={r * 2}
                    fill="#6366f1" stroke="#fff"
                    strokeWidth={1.5 / stageScale}
                    cornerRadius={2 / stageScale}
                    draggable
                    onMouseEnter={e => e.target.getStage().container().style.cursor = h.cursor}
                    onMouseLeave={e => e.target.getStage().container().style.cursor = 'default'}
                    onDragMove={(e) => {
                        e.cancelBubble = true;
                        const dx = e.target.x() - (h.cx - r);
                        const dy = e.target.y() - (h.cy - r);
                        onResize(id, h.name, dx, dy);
                        e.target.position({ x: h.cx - r, y: h.cy - r });
                    }}
                />
            ))}
        </>
    );
}

/* ─────────────────────── AlignmentGuides ─────────────────────── */
function AlignmentGuides({ guides, stageScale }) {
    return (
        <>
            {guides.map((g, i) => (
                <Line
                    key={i}
                    points={g.points}
                    stroke="#6366f1"
                    strokeWidth={1 / stageScale}
                    dash={[4 / stageScale, 4 / stageScale]}
                    listening={false}
                />
            ))}
        </>
    );
}

/* ─────────────────────── MiniMap ─────────────────────── */
function MiniMap({ nodes, stagePos, stageScale, canvasW, canvasH }) {
    const MM_W = 180, MM_H = 110;
    const padding = 40;

    const allX = nodes.flatMap(n => [n.x, n.x + n.w]);
    const allY = nodes.flatMap(n => [n.y, n.y + n.h]);
    const minX = Math.min(...allX, 0) - padding;
    const minY = Math.min(...allY, 0) - padding;
    const maxX = Math.max(...allX, canvasW) + padding;
    const maxY = Math.max(...allY, canvasH) + padding;
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const sx = MM_W / contentW;
    const sy = MM_H / contentH;
    const sc = Math.min(sx, sy);

    const vpX = (-stagePos.x / stageScale - minX) * sc;
    const vpY = (-stagePos.y / stageScale - minY) * sc;
    const vpW = (canvasW / stageScale) * sc;
    const vpH = (canvasH / stageScale) * sc;

    return (
        <div
            style={{
                position: 'absolute', bottom: 16, right: 16,
                width: MM_W, height: MM_H,
                background: 'rgba(255,255,255,0.93)',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                overflow: 'hidden',
                zIndex: 10,
            }}
        >
            <svg width={MM_W} height={MM_H}>
                {nodes.map(n => (
                    <rect
                        key={n.id}
                        x={(n.x - minX) * sc}
                        y={(n.y - minY) * sc}
                        width={n.w * sc}
                        height={n.h * sc}
                        fill={n.fill || '#dbeafe'}
                        stroke={n.stroke || '#3b82f6'}
                        strokeWidth={0.8}
                        rx={1}
                    />
                ))}
                {/* Viewport indicator */}
                <rect
                    x={vpX} y={vpY} width={vpW} height={vpH}
                    fill="none" stroke="#6366f1" strokeWidth={1.5}
                    strokeDasharray="4,3"
                    rx={2}
                />
            </svg>
            <div style={{
                position: 'absolute', top: 3, left: 6,
                fontSize: 9, color: '#94a3b8', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
                Mini Map
            </div>
        </div>
    );
}

/* ─────────────────────── ContextMenu ─────────────────────── */
function ContextMenu({ pos, node, onClose, onEdit, onDuplicate, onDelete, onBringForward, onSendBack }) {
    if (!pos || !node) return null;
    const btn = 'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2';
    return (
        <div
            style={{ position: 'fixed', top: pos.y, left: pos.x, zIndex: 1000 }}
            className="bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]"
        >
            <button className={btn} onClick={onEdit}><span>✏️</span> Edit Text</button>
            <button className={btn} onClick={onDuplicate}><span>⧉</span> Duplicate</button>
            <hr className="my-1 border-gray-100" />
            <button className={btn} onClick={onBringForward}><span>⬆</span> Bring Forward</button>
            <button className={btn} onClick={onSendBack}><span>⬇</span> Send Back</button>
            <hr className="my-1 border-gray-100" />
            <button className={`${btn} text-red-600`} onClick={onDelete}><span>🗑</span> Delete</button>
        </div>
    );
}

/* ─────────────────────── TextEditOverlay ─────────────────────── */
function TextEditOverlay({ node, stagePos, stageScale, onDone }) {
    const [text, setText] = useState(node.label || '');
    const ref = useRef(null);

    useEffect(() => {
        ref.current?.focus();
        ref.current?.select();
    }, []);

    const screenX = node.x * stageScale + stagePos.x;
    const screenY = node.y * stageScale + stagePos.y;

    return (
        <div
            style={{
                position: 'fixed',
                top: screenY + 8,
                left: screenX + 8,
                width: Math.max(node.w * stageScale - 16, 120),
                zIndex: 1001,
            }}
        >
            <input
                ref={ref}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === 'Escape') onDone(text);
                }}
                onBlur={() => onDone(text)}
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '2px solid #6366f1',
                    borderRadius: 6,
                    fontSize: (node.fontSize || 13) * stageScale,
                    fontFamily: 'Inter, Arial, sans-serif',
                    outline: 'none',
                    background: 'white',
                    color: '#1e293b',
                    boxShadow: '0 2px 12px rgba(99,102,241,0.25)',
                }}
            />
        </div>
    );
}

/* ─────────────────────── ConnectorLabelOverlay ─────────────────────── */
function ConnLabelOverlay({ conn, nodes, stagePos, stageScale, onDone }) {
    const [text, setText] = useState(conn.label || '');
    const ref = useRef(null);

    const fromNode = nodes.find(n => n.id === conn.fromId);
    const toNode   = nodes.find(n => n.id === conn.toId);
    if (!fromNode || !toNode) return null;

    const fromPt = connectionPoints(fromNode)[conn.fromSide];
    const toPt = connectionPoints(toNode)[conn.toSide];
    const rawX = (fromPt.x + toPt.x) / 2;
    const rawY = (fromPt.y + toPt.y) / 2;
    const screenX = rawX * stageScale + stagePos.x;
    const screenY = rawY * stageScale + stagePos.y;

    useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

    return (
        <div style={{ position: 'fixed', top: screenY - 14, left: screenX - 50, zIndex: 1001 }}>
            <input
                ref={ref}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onDone(text); }}
                onBlur={() => onDone(text)}
                style={{
                    width: 100, textAlign: 'center', padding: '2px 6px',
                    border: '1.5px solid #6366f1', borderRadius: 4,
                    fontSize: 12, outline: 'none', background: 'white',
                    boxShadow: '0 1px 6px rgba(99,102,241,0.2)'
                }}
            />
        </div>
    );
}

/* ═══════════════════════════ MAIN COMPONENT ═══════════════════════════ */
export default function FlowchartBuilder({ embedded = false, user: embeddedUser = null }) {
    const router = useRouter();
    const stageRef   = useRef(null);
    const containerRef = useRef(null);

    /* ── auth ── */
    const [user, setUser] = useState(embeddedUser);
    useEffect(() => {
        if (embedded) {
            setUser(embeddedUser || null);
            return;
        }
        const unsub = onAuthStateChanged(auth, u => { if (!u) router.push('/'); else setUser(u); });
        return () => unsub();
    }, [embedded, embeddedUser, router]);

    /* ── canvas size ── */
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setCanvasSize({ width, height });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    /* ── diagram state ── */
    const [nodes, setNodes] = useState([]);
    const [conns, setConns] = useState([]);

    /* ── history ── */
    const [history, setHistory] = useState([{ nodes: [], conns: [] }]);
    const [histStep, setHistStep] = useState(0);

    const commit = useCallback((nextNodes, nextConns) => {
        setNodes(nextNodes);
        setConns(nextConns);
        setHistory(h => {
            const trimmed = h.slice(0, histStep + 1);
            return [...trimmed, { nodes: nextNodes, conns: nextConns }];
        });
        setHistStep(s => s + 1);
    }, [histStep]);

    const undo = useCallback(() => {
        if (histStep <= 0) return;
        const step = histStep - 1;
        setNodes(history[step].nodes);
        setConns(history[step].conns);
        setHistStep(step);
        setSelectedIds([]);
    }, [history, histStep]);

    const redo = useCallback(() => {
        if (histStep >= history.length - 1) return;
        const step = histStep + 1;
        setNodes(history[step].nodes);
        setConns(history[step].conns);
        setHistStep(step);
        setSelectedIds([]);
    }, [history, histStep]);

    /* ── selection ── */
    const [selectedIds,   setSelectedIds]   = useState([]);
    const [selectedConnId, setSelectedConnId] = useState(null);

    const selectNode = useCallback((id, multi) => {
        setSelectedConnId(null);
        if (multi) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelectedIds([id]);
        }
    }, []);

    /* ── zoom / pan ── */
    const [scale, setScale] = useState(1);
    const [pos,   setPos]   = useState({ x: 0, y: 0 });

    const handleWheel = useCallback(e => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        const ptr = stage.getPointerPosition();
        const oldScale = stage.scaleX();
        const mousePointTo = {
            x: (ptr.x - stage.x()) / oldScale,
            y: (ptr.y - stage.y()) / oldScale,
        };
        const newScale = clampScale(e.evt.deltaY < 0 ? oldScale * 1.12 : oldScale / 1.12);
        setScale(newScale);
        setPos({ x: ptr.x - mousePointTo.x * newScale, y: ptr.y - mousePointTo.y * newScale });
    }, []);

    const zoomIn  = () => setScale(s => clampScale(s * 1.2));
    const zoomOut = () => setScale(s => clampScale(s / 1.2));
    const resetZoom = () => { setScale(1); setPos({ x: 0, y: 0 }); };

    /* ── sidebar ── */
    const [sidebarOpen, setSidebarOpen] = useState(true);

    /* ── tool ── */
    const [tool, setTool] = useState('select'); // select | connect | pan

    /* ── drag-from-toolbox ── */
    const [draggingDef, setDraggingDef] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleToolboxDragStart = (def) => {
        setDraggingDef(def);
    };

    const getCanvasPoint = useCallback((clientX, clientY) => {
        const stage = stageRef.current;
        if (!stage) return { x: 0, y: 0 };
        const container = stage.container().getBoundingClientRect();
        const rawX = clientX - container.left;
        const rawY = clientY - container.top;
        return {
            x: snap((rawX - pos.x) / scale),
            y: snap((rawY - pos.y) / scale),
        };
    }, [pos, scale]);

    const handleCanvasDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        if (!draggingDef) return;
        const { x, y } = getCanvasPoint(e.clientX, e.clientY);
        const def = draggingDef;
        setDraggingDef(null);
        const newNode = {
            id: uid(),
            type: def.type,
            x: x - def.w / 2,
            y: y - def.h / 2,
            w: def.w,
            h: def.h,
            label: def.label,
            fill: def.fill,
            stroke: def.stroke,
            strokeWidth: 2,
            fontSize: 13,
            textColor: '#1e293b',
        };
        commit([...nodes, newNode], conns);
    }, [draggingDef, getCanvasPoint, nodes, conns, commit]);

    /* ── connector drawing ── */
    const [connStart, setConnStart] = useState(null); // { nodeId, side, pt }
    const [connPreview, setConnPreview] = useState(null); // { x, y }
    const [connHoverTarget, setConnHoverTarget] = useState(null); // { nodeId, side, pt }
    const [connStyle, setConnStyle] = useState('solid');
    const [connCurved, setConnCurved] = useState(false);

    /** Commit a connector with duplicate prevention and decision auto-labeling */
    const commitConnector = useCallback((fromId, fromSide, toId, toSide) => {
        // Prevent self-connections
        if (fromId === toId) return;
        // Prevent duplicate connectors between same pair of nodes
        const dup = conns.some(c =>
            (c.fromId === fromId && c.toId === toId && c.fromSide === fromSide && c.toSide === toSide) ||
            (c.fromId === toId && c.toId === fromId && c.fromSide === toSide && c.toSide === fromSide)
        );
        if (dup) return;

        // Decision auto-labeling (Yes/No)
        const fromNode = nodes.find(n => n.id === fromId);
        let label = '';
        if (fromNode && fromNode.type === 'fc-decision') {
            const existing = conns.filter(c => c.fromId === fromId);
            if (existing.length === 0) label = 'Yes';
            else if (existing.length === 1) label = 'No';
        }

        const newConn = {
            id: uid(),
            fromId,
            fromSide,
            toId,
            toSide,
            label,
            style: connStyle,
            curved: connCurved,
            stroke: '#64748b',
            strokeWidth: 2,
        };
        commit(nodes, [...conns, newConn]);
    }, [nodes, conns, commit, connStyle, connCurved]);

    const handleConnPointClick = useCallback((nodeId, side, pt) => {
        if (!connStart) {
            setConnStart({ nodeId, side, pt });
            setConnHoverTarget(null);
        } else {
            if (connStart.nodeId === nodeId) { setConnStart(null); setConnHoverTarget(null); return; }
            commitConnector(connStart.nodeId, connStart.side, nodeId, side);
            setConnStart(null);
            setConnPreview(null);
            setConnHoverTarget(null);
        }
    }, [connStart, commitConnector]);

    /* ── drag node → update connectors ── */
    const handleNodeDragEnd = useCallback((id, nx, ny) => {
        const updated = nodes.map(n => n.id === id ? { ...n, x: nx, y: ny } : n);
        // Smart recalculation: each side picks the nearest anchor relative to the other node's center
        const updConns = conns.map(c => {
            if (c.fromId !== id && c.toId !== id) return c;
            const fn = updated.find(n => n.id === c.fromId);
            const tn = updated.find(n => n.id === c.toId);
            if (!fn || !tn) return c;
            const { fromSide, toSide } = bestSides(fn, tn);
            return { ...c, fromSide, toSide };
        });
        commit(updated, updConns);
        setAlignGuides([]);
    }, [nodes, conns, commit]);

    /* ── resize handles ── */
    const handleResize = useCallback((id, handle, dx, dy) => {
        setNodes(prev => prev.map(n => {
            if (n.id !== id) return n;
            let { x, y, w, h } = n;
            const minW = 40, minH = 30;
            if (handle.includes('e')) w = Math.max(minW, w + dx);
            if (handle.includes('s')) h = Math.max(minH, h + dy);
            if (handle.includes('w')) { w = Math.max(minW, w - dx); x = x + dx; }
            if (handle.includes('n')) { h = Math.max(minH, h - dy); y = y + dy; }
            return { ...n, x: snap(x), y: snap(y), w: snap(w), h: snap(h) };
        }));
    }, []);

    /* ── alignment guides ── */
    const [alignGuides, setAlignGuides] = useState([]);

    /* ── context menu ── */
    const [ctxMenu, setCtxMenu] = useState(null); // { x, y, nodeId }

    const handleStageContextMenu = (e) => {
        e.evt.preventDefault();
        const clickedShape = e.target !== e.target.getStage();
        if (!clickedShape) return;
    };

    /* ── text editing ── */
    const [editingNodeId, setEditingNodeId] = useState(null);
    const [editingConnId, setEditingConnId] = useState(null);

    /* ── connection highlight ── */
    const [connHighlight, setConnHighlight] = useState(null);

    /* ── right panel state ── */
    const [showMiniMap, setShowMiniMap] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);

    /* ── selection drag box ── */
    const [selBox, setSelBox] = useState(null);
    const selBoxStart = useRef(null);

    /* ── stage mouse events ── */
    const handleStageMouseDown = (e) => {
        const isStage = e.target === e.target.getStage();
        if (!isStage) return;

        // In connect mode, clicking empty canvas cancels current connector
        if (tool === 'connect' && connStart) {
            setConnStart(null);
            setConnPreview(null);
            setConnHoverTarget(null);
            return;
        }

        setSelectedIds([]);
        setSelectedConnId(null);
        setCtxMenu(null);

        if (tool === 'select') {
            const stage = stageRef.current;
            const pt = stage.getPointerPosition();
            const canvasPt = {
                x: (pt.x - pos.x) / scale,
                y: (pt.y - pos.y) / scale,
            };
            selBoxStart.current = canvasPt;
            setSelBox({ x: canvasPt.x, y: canvasPt.y, w: 0, h: 0 });
        }
    };

    const handleStageMouseMove = (e) => {
        if (!selBoxStart.current) return;
        const stage = stageRef.current;
        const pt = stage.getPointerPosition();
        const canvasPt = {
            x: (pt.x - pos.x) / scale,
            y: (pt.y - pos.y) / scale,
        };
        const sx = selBoxStart.current.x;
        const sy = selBoxStart.current.y;
        setSelBox({
            x: Math.min(sx, canvasPt.x),
            y: Math.min(sy, canvasPt.y),
            w: Math.abs(canvasPt.x - sx),
            h: Math.abs(canvasPt.y - sy),
        });

        // Alignment guides while dragging
        if (selectedIds.length > 0) {
            const guides = [];
            const moving = nodes.filter(n => selectedIds.includes(n.id));
            const others = nodes.filter(n => !selectedIds.includes(n.id));
            for (const m of moving) {
                for (const o of others) {
                    if (Math.abs(m.x - o.x) < 6) guides.push({ points: [o.x, -10000, o.x, 10000] });
                    if (Math.abs(m.x + m.w - o.x - o.w) < 6) guides.push({ points: [o.x + o.w, -10000, o.x + o.w, 10000] });
                    if (Math.abs(m.y - o.y) < 6) guides.push({ points: [-10000, o.y, 10000, o.y] });
                    if (Math.abs(m.y + m.h - o.y - o.h) < 6) guides.push({ points: [-10000, o.y + o.h, 10000, o.y + o.h] });
                }
            }
            setAlignGuides(guides);
        }
    };

    const handleStageMouseUp = (e) => {
        // If drawing a connector, check if we should commit
        if (connStart && connHoverTarget) {
            commitConnector(connStart.nodeId, connStart.side, connHoverTarget.nodeId, connHoverTarget.side);
            setConnStart(null);
            setConnPreview(null);
            setConnHoverTarget(null);
            return;
        }

        if (selBox && (selBox.w > 4 || selBox.h > 4)) {
            const inBox = nodes.filter(n =>
                n.x < selBox.x + selBox.w &&
                n.x + n.w > selBox.x &&
                n.y < selBox.y + selBox.h &&
                n.y + n.h > selBox.y
            );
            setSelectedIds(inBox.map(n => n.id));
        }
        setSelBox(null);
        selBoxStart.current = null;
        setAlignGuides([]);
    };

    /* ── connector cursor tracking with snap-to-anchor ── */
    const handleStagePtrMove = (e) => {
        handleStageMouseMove(e);
        if (connStart) {
            const stage = stageRef.current;
            const pt = stage.getPointerPosition();
            const cx = (pt.x - pos.x) / scale;
            const cy = (pt.y - pos.y) / scale;

            // Find nearest anchor on any node (excluding source)
            const target = getNearestAnchorTarget(nodes, cx, cy, connStart.nodeId);
            setConnHoverTarget(target);

            // Snap preview to target anchor, or follow cursor
            if (target) {
                setConnPreview({ x: target.pt.x, y: target.pt.y });
            } else {
                setConnPreview({ x: cx, y: cy });
            }
        } else {
            setConnHoverTarget(null);
        }
    };

    /* ── keyboard shortcuts ── */
    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelectedIds(nodes.map(n => n.id)); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
            else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
            else if (e.key === 'Escape') { setSelectedIds([]); setSelectedConnId(null); setConnStart(null); setConnPreview(null); setConnHoverTarget(null); setCtxMenu(null); }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [undo, redo, nodes, selectedIds, selectedConnId]);

    /* ── node operations ── */
    const deleteSelected = useCallback(() => {
        if (selectedIds.length > 0) {
            const remaining = nodes.filter(n => !selectedIds.includes(n.id));
            const remainIds = new Set(remaining.map(n => n.id));
            const remainConns = conns.filter(c => remainIds.has(c.fromId) && remainIds.has(c.toId));
            commit(remaining, remainConns);
            setSelectedIds([]);
        } else if (selectedConnId) {
            commit(nodes, conns.filter(c => c.id !== selectedConnId));
            setSelectedConnId(null);
        }
    }, [selectedIds, selectedConnId, nodes, conns, commit]);

    const duplicateSelected = useCallback(() => {
        if (selectedIds.length === 0) return;
        const copies = nodes
            .filter(n => selectedIds.includes(n.id))
            .map(n => ({ ...n, id: uid(), x: n.x + 24, y: n.y + 24 }));
        commit([...nodes, ...copies], conns);
        setSelectedIds(copies.map(c => c.id));
    }, [selectedIds, nodes, conns, commit]);

    const clearCanvas = () => {
        if (!window.confirm('Clear the entire canvas?')) return;
        commit([], []);
        setSelectedIds([]);
        setSelectedConnId(null);
    };

    /* ── alignment ── */
    const alignNodes = (type) => {
        if (selectedIds.length < 2) return;
        const sel = nodes.filter(n => selectedIds.includes(n.id));
        let updated;
        switch (type) {
            case 'left':   { const lx = Math.min(...sel.map(n => n.x));         updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, x: lx } : n); break; }
            case 'right':  { const rx = Math.max(...sel.map(n => n.x + n.w));   updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, x: rx - n.w } : n); break; }
            case 'center': { const cx = (Math.min(...sel.map(n => n.x)) + Math.max(...sel.map(n => n.x + n.w))) / 2; updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, x: cx - n.w / 2 } : n); break; }
            case 'top':    { const ty = Math.min(...sel.map(n => n.y));          updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, y: ty } : n); break; }
            case 'bottom': { const by = Math.max(...sel.map(n => n.y + n.h));   updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, y: by - n.h } : n); break; }
            case 'middle': { const my = (Math.min(...sel.map(n => n.y)) + Math.max(...sel.map(n => n.y + n.h))) / 2; updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, y: my - n.h / 2 } : n); break; }
            case 'distH': {
                const sorted = [...sel].sort((a, b) => a.x - b.x);
                const totalW = sorted.reduce((s, n) => s + n.w, 0);
                const spanW = sorted[sorted.length - 1].x + sorted[sorted.length - 1].w - sorted[0].x;
                const gap = (spanW - totalW) / (sorted.length - 1);
                let curX = sorted[0].x;
                const posMap = {};
                for (const n of sorted) { posMap[n.id] = curX; curX += n.w + gap; }
                updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, x: posMap[n.id] } : n);
                break;
            }
            case 'distV': {
                const sorted = [...sel].sort((a, b) => a.y - b.y);
                const totalH = sorted.reduce((s, n) => s + n.h, 0);
                const spanH = sorted[sorted.length - 1].y + sorted[sorted.length - 1].h - sorted[0].y;
                const gap = (spanH - totalH) / (sorted.length - 1);
                let curY = sorted[0].y;
                const posMap = {};
                for (const n of sorted) { posMap[n.id] = curY; curY += n.h + gap; }
                updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, y: posMap[n.id] } : n);
                break;
            }
            default: updated = nodes;
        }
        commit(updated, conns);
    };

    /* ── auto layout (simple top-down BFS) ── */
    const autoLayout = () => {
        if (nodes.length === 0) return;
        const HGAP = 60, VGAP = 40;
        const adjOut = {};
        const inDeg = {};
        for (const n of nodes) { adjOut[n.id] = []; inDeg[n.id] = 0; }
        for (const c of conns) {
            if (adjOut[c.fromId]) adjOut[c.fromId].push(c.toId);
            if (inDeg[c.toId] !== undefined) inDeg[c.toId]++;
        }
        const queue = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
        const levels = {};
        let level = 0;
        const visited = new Set();
        let curr = [...queue];
        while (curr.length > 0) {
            for (const id of curr) { levels[id] = level; visited.add(id); }
            const next = [];
            for (const id of curr) {
                for (const nid of (adjOut[id] || [])) {
                    if (!visited.has(nid)) next.push(nid);
                }
            }
            curr = next;
            level++;
        }
        // Nodes not reached (disconnected)
        for (const n of nodes) {
            if (levels[n.id] === undefined) { levels[n.id] = level++; }
        }
        const perLevel = {};
        for (const [id, lv] of Object.entries(levels)) {
            if (!perLevel[lv]) perLevel[lv] = [];
            perLevel[lv].push(id);
        }
        const maxLevels = Math.max(...Object.keys(perLevel).map(Number));
        let y = 60;
        const posMap = {};
        for (let lv = 0; lv <= maxLevels; lv++) {
            const ids = perLevel[lv] || [];
            const rowNodes = ids.map(id => nodes.find(n => n.id === id)).filter(Boolean);
            const totalW = rowNodes.reduce((s, n) => s + n.w, 0) + (rowNodes.length - 1) * HGAP;
            let x = -totalW / 2 + 600;
            for (const n of rowNodes) {
                posMap[n.id] = { x, y };
                x += n.w + HGAP;
            }
            const maxH = Math.max(...rowNodes.map(n => n.h), 0);
            y += maxH + VGAP;
        }
        const updated = nodes.map(n => posMap[n.id] ? { ...n, ...posMap[n.id] } : n);
        commit(updated, conns);
    };

    /* ── layer order ── */
    const bringForward = (id) => {
        const idx = nodes.findIndex(n => n.id === id);
        if (idx < nodes.length - 1) {
            const arr = [...nodes];
            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            commit(arr, conns);
        }
    };
    const sendBack = (id) => {
        const idx = nodes.findIndex(n => n.id === id);
        if (idx > 0) {
            const arr = [...nodes];
            [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
            commit(arr, conns);
        }
    };

    /* ── properties update ── */
    const updateNodeProp = (prop, value) => {
        if (selectedIds.length === 0) return;
        const updated = nodes.map(n => selectedIds.includes(n.id) ? { ...n, [prop]: value } : n);
        commit(updated, conns);
    };
    const updateConnProp = (prop, value) => {
        if (!selectedConnId) return;
        const updated = conns.map(c => c.id === selectedConnId ? { ...c, [prop]: value } : c);
        commit(nodes, updated);
    };

    /* ── export ── */
    const exportJSON = () => {
        const data = JSON.stringify({ nodes, conns }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'flowchart.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPNG = () => {
        const stage = stageRef.current;
        if (!stage) return;
        // Temporarily hide selection dashes
        const uri = stage.toDataURL({ pixelRatio: 2 });
        const a = document.createElement('a'); a.href = uri; a.download = 'flowchart.png'; a.click();
    };

    const exportSVG = () => {
        // Build SVG from nodes
        const svgNS = 'http://www.w3.org/2000/svg';
        const padding = 40;
        const allX = nodes.flatMap(n => [n.x, n.x + n.w]);
        const allY = nodes.flatMap(n => [n.y, n.y + n.h]);
        const minX = Math.min(...allX, 0) - padding;
        const minY = Math.min(...allY, 0) - padding;
        const maxX = Math.max(...allX, 400) + padding;
        const maxY = Math.max(...allY, 300) + padding;
        let svg = `<svg xmlns="${svgNS}" width="${maxX - minX}" height="${maxY - minY}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}">`;
        for (const n of nodes) {
            svg += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="${n.fill || '#dbeafe'}" stroke="${n.stroke || '#3b82f6'}" stroke-width="2" rx="4"/>`;
            svg += `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 5}" text-anchor="middle" font-size="${n.fontSize || 13}" font-family="Arial" fill="${n.textColor || '#1e293b'}">${n.label || ''}</text>`;
        }
        svg += '</svg>';
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'flowchart.svg'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = () => {
        const stage = stageRef.current;
        if (!stage) return;
        const uri = stage.toDataURL({ pixelRatio: 2 });
        // Open in new window for print-as-PDF
        const win = window.open('');
        win.document.write(`<html><body style="margin:0"><img src="${uri}" style="max-width:100%"/></body></html>`);
        win.document.close();
        win.onload = () => { win.print(); };
    };

    /* ── import JSON ── */
    const importJSON = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.nodes && data.conns) {
                        commit(data.nodes, data.conns);
                        setSelectedIds([]);
                    }
                } catch { alert('Invalid JSON file'); }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    /* ── selected node(s) ── */
    const selectedNodes = nodes.filter(n => selectedIds.includes(n.id));
    const firstSel = selectedNodes[0] || null;
    const selectedConn = conns.find(c => c.id === selectedConnId) || null;

    /* ── grid ── */
    const gridLines = useMemo(() => {
        const lines = [];
        const invScale = 1 / scale;
        const startX = Math.floor((-pos.x * invScale) / GRID) * GRID - GRID;
        const startY = Math.floor((-pos.y * invScale) / GRID) * GRID - GRID;
        const endX = startX + (canvasSize.width * invScale) + GRID * 2;
        const endY = startY + (canvasSize.height * invScale) + GRID * 2;
        for (let x = startX; x <= endX; x += GRID) {
            lines.push(<Line key={`v${x}`} points={[x, startY, x, endY]} stroke="#e2e8f0" strokeWidth={1 / scale} listening={false} />);
        }
        for (let y = startY; y <= endY; y += GRID) {
            lines.push(<Line key={`h${y}`} points={[startX, y, endX, y]} stroke="#e2e8f0" strokeWidth={1 / scale} listening={false} />);
        }
        return lines;
    }, [pos, scale, canvasSize]);

    /* ── logout ── */
    const handleLogout = async () => {
        try { await signOut(auth); router.push('/'); } catch {}
    };

    /* ── render ── */
    return (
        <div className={`flex flex-col ${embedded ? 'h-full' : 'h-screen'} w-full overflow-hidden bg-gray-50`} style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* ── HEADER ── */}
            <header className={`${embedded ? 'hidden' : 'h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm flex-shrink-0 z-20'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span className="font-bold text-lg text-gray-900">
                        Pris<span className="text-purple-600">Map</span>
                    </span>
                    <span className="text-gray-400 text-sm">/ Flowchart Builder</span>
                </div>

                {/* Centre — Undo Redo + Zoom */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button onClick={undo} disabled={histStep <= 0} title="Undo (Ctrl+Z)"
                            className={`p-1.5 rounded ${histStep <= 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-white text-gray-600'}`}>
                            <Undo size={15} />
                        </button>
                        <button onClick={redo} disabled={histStep >= history.length - 1} title="Redo (Ctrl+Y)"
                            className={`p-1.5 rounded ${histStep >= history.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-white text-gray-600'}`}>
                            <Redo size={15} />
                        </button>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button onClick={zoomOut} title="Zoom Out" className="p-1.5 hover:bg-white rounded text-gray-600"><ZoomOut size={15} /></button>
                        <span className="px-2 text-sm font-medium text-gray-700 min-w-[52px] text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={zoomIn} title="Zoom In" className="p-1.5 hover:bg-white rounded text-gray-600"><ZoomIn size={15} /></button>
                        <button onClick={resetZoom} title="Reset Zoom" className="p-1.5 hover:bg-white rounded text-gray-600 ml-0.5"><Maximize2 size={15} /></button>
                    </div>
                    {/* Align toolbar (visible when 2+ selected) */}
                    {selectedIds.length >= 2 && (
                        <div className="flex items-center gap-0.5 bg-indigo-50 border border-indigo-200 rounded-lg p-1 ml-1">
                            <button onClick={() => alignNodes('left')} title="Align Left" className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600"><AlignLeft size={14} /></button>
                            <button onClick={() => alignNodes('center')} title="Align Center" className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600"><AlignCenter size={14} /></button>
                            <button onClick={() => alignNodes('right')} title="Align Right" className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600"><AlignRight size={14} /></button>
                            <div className="w-px h-4 bg-indigo-200 mx-0.5" />
                            <button onClick={() => alignNodes('distH')} title="Distribute Horizontally" className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600"><AlignJustify size={14} /></button>
                            <button onClick={() => alignNodes('distV')} title="Distribute Vertically" className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600 rotate-90"><AlignJustify size={14} /></button>
                        </div>
                    )}
                </div>

                {/* Right — export + user */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <button onClick={exportJSON} title="Export JSON" className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1">
                            <Download size={12} /> JSON
                        </button>
                        <button onClick={exportPNG} title="Export PNG" className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1">
                            <Download size={12} /> PNG
                        </button>
                        <button onClick={exportSVG} title="Export SVG" className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1">
                            <Download size={12} /> SVG
                        </button>
                        <button onClick={exportPDF} title="Export PDF" className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1">
                            <Download size={12} /> PDF
                        </button>
                        <button onClick={importJSON} title="Import JSON" className="px-2.5 py-1.5 text-xs font-medium bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg">
                            Import
                        </button>
                    </div>
                    <button onClick={() => router.push('/settings_page')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Settings size={18} /></button>
                    <button onClick={handleLogout} className="h-8 w-8 rounded-full border-2 border-white shadow overflow-hidden" title="Log out">
                        <img src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} alt="User" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* ── LEFT SIDEBAR ── */}
                <div className={`${sidebarOpen ? 'w-56' : 'w-0'} flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto transition-all duration-200 overflow-x-hidden`}>
                    <div className="w-56 p-3">
                        {/* Tools */}
                        <div className="mb-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Tools</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'select', icon: '↖', label: 'Select' },
                                    { id: 'connect', icon: '⟶', label: 'Connect' },
                                    { id: 'pan', icon: '✋', label: 'Pan' },
                                ].map(t => (
                                    <button key={t.id} onClick={() => { setTool(t.id); setConnStart(null); setConnPreview(null); setConnHoverTarget(null); }}
                                        title={t.label}
                                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-[10px] font-semibold gap-1 transition-all border ${
                                            tool === t.id
                                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}>
                                        <span className="text-base leading-none">{t.icon}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Shapes */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Shapes</p>
                        <div className="space-y-1">
                            {SHAPE_DEFS.map(def => (
                                <div
                                    key={def.type}
                                    draggable
                                    onDragStart={() => handleToolboxDragStart(def)}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-grab active:cursor-grabbing transition-colors select-none group"
                                >
                                    <span
                                        className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold shrink-0"
                                        style={{ background: def.fill, color: def.stroke, border: `1.5px solid ${def.stroke}` }}
                                    >
                                        {def.icon}
                                    </span>
                                    <span className="text-xs text-gray-700 group-hover:text-indigo-700 font-medium">{def.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Connector style */}
                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Connector Style</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                <button onClick={() => setConnStyle('solid')}
                                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${connStyle === 'solid' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                    ── Solid
                                </button>
                                <button onClick={() => setConnStyle('dashed')}
                                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${connStyle === 'dashed' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                    - - Dashed
                                </button>
                            </div>
                            <div className="mt-1.5">
                                <button onClick={() => setConnCurved(v => !v)}
                                    className={`w-full py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${connCurved ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                    ⌒ Curved
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                            <button onClick={autoLayout}
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
                                <GitMerge size={13}/> Auto Layout
                            </button>
                            <button onClick={() => setShowMiniMap(v => !v)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                                <Map size={13}/> {showMiniMap ? 'Hide' : 'Show'} Mini Map
                            </button>
                            <button onClick={clearCanvas}
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                                <Trash2 size={13}/> Clear Canvas
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar toggle */}
                <div className="flex-shrink-0 flex items-center">
                    <button
                        onClick={() => setSidebarOpen(v => !v)}
                        className="h-16 w-5 flex items-center justify-center bg-white hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 border border-l-0 border-gray-200 rounded-r-lg shadow-sm transition-colors"
                    >
                        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>

                {/* ── CANVAS ── */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden relative bg-gray-100"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleCanvasDrop}
                >
                    {/* Connector mode indicator */}
                    {connStart && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium pointer-events-none">
                            Click a connection point on another shape to connect
                        </div>
                    )}

                    <Stage
                        ref={stageRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        scaleX={scale}
                        scaleY={scale}
                        x={pos.x}
                        y={pos.y}
                        draggable={tool === 'pan'}
                        onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
                        onWheel={handleWheel}
                        onMouseDown={handleStageMouseDown}
                        onMouseMove={handleStagePtrMove}
                        onMouseUp={handleStageMouseUp}
                        onContextMenu={handleStageContextMenu}
                        onClick={(e) => { if (e.target === e.target.getStage()) { setCtxMenu(null); } }}
                        style={{ cursor: tool === 'pan' ? 'grab' : tool === 'connect' ? 'crosshair' : 'default' }}
                    >
                        <Layer>
                            {/* Grid */}
                            {gridLines}

                            {/* Connectors (drawn behind nodes) */}
                            {conns.map(c => (
                                <ConnectorRenderer
                                    key={c.id}
                                    conn={c}
                                    nodes={nodes}
                                    isSelected={selectedConnId === c.id}
                                    onSelect={(id) => { setSelectedConnId(id); setSelectedIds([]); }}
                                    stageScale={scale}
                                    onDblClick={(id) => setEditingConnId(id)}
                                />
                            ))}

                            {/* Nodes */}
                            {nodes.map(n => (
                                <ShapeRenderer
                                    key={n.id}
                                    node={n}
                                    isSelected={selectedIds.includes(n.id)}
                                    onSelect={selectNode}
                                    onDragEnd={handleNodeDragEnd}
                                    stageScale={scale}
                                    connHighlight={connHighlight}
                                    onConnHover={setConnHighlight}
                                    onConnClick={handleConnPointClick}
                                    drawingConn={tool === 'connect'}
                                    connHoverTarget={connHoverTarget}
                                    onDblClick={(id) => { setSelectedIds([id]); setSelectedConnId(null); }}
                                />
                            ))}

                            {/* Connector drawing preview — route-aware */}
                            {connStart && connPreview && (() => {
                                const fromNode = nodes.find(n => n.id === connStart.nodeId);
                                if (!fromNode) return null;
                                const fromPt = connectionPoints(fromNode)[connStart.side];
                                // If snapped to a target anchor, use proper route preview
                                if (connHoverTarget) {
                                    const toNode = nodes.find(n => n.id === connHoverTarget.nodeId);
                                    if (toNode) {
                                        const mode = connCurved ? 'curved' : 'elbow';
                                        const { points, bezier } = connectorPath(fromNode, connStart.side, toNode, connHoverTarget.side, mode);
                                        return (
                                            <Arrow
                                                points={points}
                                                stroke="#22c55e" strokeWidth={2.5 / scale}
                                                fill="#22c55e" dash={[6 / scale, 3 / scale]}
                                                pointerLength={10 / scale} pointerWidth={8 / scale}
                                                bezier={bezier}
                                                lineCap="round" lineJoin="round"
                                                listening={false}
                                            />
                                        );
                                    }
                                }
                                // Freeform straight preview to cursor
                                return (
                                    <Arrow
                                        points={[fromPt.x, fromPt.y, connPreview.x, connPreview.y]}
                                        stroke="#6366f1" strokeWidth={2 / scale}
                                        fill="#6366f1" dash={[6 / scale, 3 / scale]}
                                        pointerLength={10 / scale} pointerWidth={8 / scale}
                                        lineCap="round"
                                        listening={false}
                                    />
                                );
                            })()}

                            {/* Resize handles for selected node (only when single selection) */}
                            {selectedIds.length === 1 && (() => {
                                const n = nodes.find(nd => nd.id === selectedIds[0]);
                                return n ? <ResizeHandles key={n.id + '-rh'} node={n} stageScale={scale} onResize={handleResize} /> : null;
                            })()}

                            {/* Selection box */}
                            {selBox && selBox.w > 2 && selBox.h > 2 && (
                                <Rect
                                    x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h}
                                    fill="rgba(99,102,241,0.08)" stroke="#6366f1"
                                    strokeWidth={1.5 / scale} dash={[4 / scale, 3 / scale]}
                                    listening={false}
                                />
                            )}

                            {/* Alignment guides */}
                            <AlignmentGuides guides={alignGuides} stageScale={scale} />
                        </Layer>
                    </Stage>

                    {/* Mini map */}
                    {showMiniMap && (
                        <MiniMap
                            nodes={nodes}
                            stagePos={pos}
                            stageScale={scale}
                            canvasW={canvasSize.width}
                            canvasH={canvasSize.height}
                        />
                    )}

                    {/* Text editing overlay */}
                    {editingNodeId && (() => {
                        const n = nodes.find(nd => nd.id === editingNodeId);
                        return n ? (
                            <TextEditOverlay
                                node={n}
                                stagePos={pos}
                                stageScale={scale}
                                onDone={(text) => {
                                    const updated = nodes.map(nd => nd.id === editingNodeId ? { ...nd, label: text } : nd);
                                    commit(updated, conns);
                                    setEditingNodeId(null);
                                }}
                            />
                        ) : null;
                    })()}

                    {/* Connector label editing */}
                    {editingConnId && (() => {
                        const c = conns.find(x => x.id === editingConnId);
                        return c ? (
                            <ConnLabelOverlay
                                conn={c}
                                nodes={nodes}
                                stagePos={pos}
                                stageScale={scale}
                                onDone={(text) => {
                                    const updated = conns.map(x => x.id === editingConnId ? { ...x, label: text } : x);
                                    commit(nodes, updated);
                                    setEditingConnId(null);
                                }}
                            />
                        ) : null;
                    })()}
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Properties</p>

                        {/* Nothing selected */}
                        {!firstSel && !selectedConn && (
                            <div className="text-center text-gray-400 mt-8">
                                <div className="text-3xl mb-2">⬡</div>
                                <p className="text-sm font-medium text-gray-500">Flowchart Builder</p>
                                <p className="text-xs mt-1">Drag shapes from the panel<br />or click Connect to link them</p>
                                <div className="mt-6 text-left space-y-1.5 text-xs text-gray-400">
                                    <p>⌨ <kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> Undo</p>
                                    <p>⌨ <kbd className="bg-gray-100 px-1 rounded">Ctrl+D</kbd> Duplicate</p>
                                    <p>⌨ <kbd className="bg-gray-100 px-1 rounded">Del</kbd> Delete</p>
                                    <p>⌨ <kbd className="bg-gray-100 px-1 rounded">Ctrl+A</kbd> Select all</p>
                                    <p>🖱 Double-click to select &amp; edit</p>
                                    <p>🖱 Scroll to zoom</p>
                                </div>
                            </div>
                        )}

                        {/* Node properties */}
                        {firstSel && (
                            <div className="space-y-3">
                                {/* Shape header with icon */}
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shrink-0"
                                        style={{ background: firstSel.fill || '#dbeafe', color: firstSel.stroke || '#3b82f6', border: `1.5px solid ${firstSel.stroke || '#3b82f6'}` }}>
                                        {SHAPE_DEFS.find(d => d.type === firstSel.type)?.icon || '▭'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800">
                                            {selectedIds.length > 1 ? `${selectedIds.length} Shapes Selected` : shapeTypeName(firstSel.type)}
                                        </p>
                                        {selectedIds.length === 1 && (
                                            <p className="text-[10px] text-gray-400 truncate">{shapeTypeDesc(firstSel.type)}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Quick actions */}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setEditingNodeId(firstSel.id)} title="Edit text" className="flex-1 py-1.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1">✏️ Edit</button>
                                    <button onClick={duplicateSelected} title="Duplicate" className="flex-1 py-1.5 text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-1"><Copy size={12} /> Copy</button>
                                    <button onClick={deleteSelected} title="Delete" className="flex-1 py-1.5 text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"><Trash2 size={12} /> Del</button>
                                </div>

                                {/* ── Shape-specific settings section ── */}
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
                                        {selectedIds.length > 1 ? 'Multi-Shape' : shapeTypeName(firstSel.type)} Settings
                                    </p>

                                    {/* Name / Label — always shown */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={firstSel.label || ''}
                                            onChange={e => updateNodeProp('label', e.target.value)}
                                            placeholder={`Enter ${shapeTypeName(firstSel.type).toLowerCase()} name…`}
                                            className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Description — optional per-node field */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Description</label>
                                        <textarea
                                            value={firstSel.description || ''}
                                            onChange={e => updateNodeProp('description', e.target.value)}
                                            placeholder={`Describe this ${shapeTypeName(firstSel.type).toLowerCase()}…`}
                                            rows={2}
                                            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                        />
                                    </div>

                                    {/* ── Process-specific ── */}
                                    {firstSel.type === 'fc-process' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Assignee</label>
                                                <input type="text" value={firstSel.assignee || ''}
                                                    onChange={e => updateNodeProp('assignee', e.target.value)}
                                                    placeholder="Who performs this step?"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Duration</label>
                                                <input type="text" value={firstSel.duration || ''}
                                                    onChange={e => updateNodeProp('duration', e.target.value)}
                                                    placeholder="e.g. 2 hours, 1 day"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Decision-specific ── */}
                                    {firstSel.type === 'fc-decision' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Condition</label>
                                                <input type="text" value={firstSel.condition || ''}
                                                    onChange={e => updateNodeProp('condition', e.target.value)}
                                                    placeholder="e.g. Is approved?"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div>
                                                    <label className="text-[10px] font-semibold text-green-600 block mb-0.5">Yes Branch</label>
                                                    <input type="text" value={firstSel.yesBranch || 'Yes'}
                                                        onChange={e => updateNodeProp('yesBranch', e.target.value)}
                                                        className="w-full text-xs px-2 py-1 border border-green-200 rounded bg-green-50 focus:outline-none focus:ring-1 focus:ring-green-400" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold text-red-600 block mb-0.5">No Branch</label>
                                                    <input type="text" value={firstSel.noBranch || 'No'}
                                                        onChange={e => updateNodeProp('noBranch', e.target.value)}
                                                        className="w-full text-xs px-2 py-1 border border-red-200 rounded bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Terminal-specific ── */}
                                    {firstSel.type === 'fc-terminal' && (
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Terminal Type</label>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button onClick={() => updateNodeProp('terminalType', 'start')}
                                                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${(firstSel.terminalType || 'start') === 'start' ? 'bg-green-600 text-white border-green-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                                    ▶ Start
                                                </button>
                                                <button onClick={() => updateNodeProp('terminalType', 'end')}
                                                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${firstSel.terminalType === 'end' ? 'bg-red-600 text-white border-red-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                                    ⏹ End
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── IO-specific ── */}
                                    {firstSel.type === 'fc-io' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">I/O Type</label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button onClick={() => updateNodeProp('ioType', 'input')}
                                                        className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${(firstSel.ioType || 'input') === 'input' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                                        ↓ Input
                                                    </button>
                                                    <button onClick={() => updateNodeProp('ioType', 'output')}
                                                        className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${firstSel.ioType === 'output' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                                        ↑ Output
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Data Source</label>
                                                <input type="text" value={firstSel.dataSource || ''}
                                                    onChange={e => updateNodeProp('dataSource', e.target.value)}
                                                    placeholder="e.g. User form, API, File"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Database-specific ── */}
                                    {firstSel.type === 'fc-database' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Database Type</label>
                                                <select value={firstSel.dbType || 'sql'}
                                                    onChange={e => updateNodeProp('dbType', e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                                                    <option value="sql">SQL Database</option>
                                                    <option value="nosql">NoSQL Database</option>
                                                    <option value="cache">Cache Store</option>
                                                    <option value="file">File Storage</option>
                                                    <option value="cloud">Cloud Storage</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Table / Collection</label>
                                                <input type="text" value={firstSel.tableName || ''}
                                                    onChange={e => updateNodeProp('tableName', e.target.value)}
                                                    placeholder="e.g. users, orders"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Operation</label>
                                                <select value={firstSel.dbOperation || 'read'}
                                                    onChange={e => updateNodeProp('dbOperation', e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                                                    <option value="read">Read / Query</option>
                                                    <option value="write">Write / Insert</option>
                                                    <option value="update">Update</option>
                                                    <option value="delete">Delete</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Document-specific ── */}
                                    {firstSel.type === 'fc-document' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Document Type</label>
                                                <select value={firstSel.docType || 'report'}
                                                    onChange={e => updateNodeProp('docType', e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                                                    <option value="report">Report</option>
                                                    <option value="form">Form</option>
                                                    <option value="invoice">Invoice</option>
                                                    <option value="email">Email</option>
                                                    <option value="log">Log Entry</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Template</label>
                                                <input type="text" value={firstSel.template || ''}
                                                    onChange={e => updateNodeProp('template', e.target.value)}
                                                    placeholder="Template name"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Predefined process-specific ── */}
                                    {firstSel.type === 'fc-predefined' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Subroutine Name</label>
                                                <input type="text" value={firstSel.subroutine || ''}
                                                    onChange={e => updateNodeProp('subroutine', e.target.value)}
                                                    placeholder="Referenced process name"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Reference ID</label>
                                                <input type="text" value={firstSel.referenceId || ''}
                                                    onChange={e => updateNodeProp('referenceId', e.target.value)}
                                                    placeholder="e.g. SUB-001"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Manual-specific ── */}
                                    {firstSel.type === 'fc-manual' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Input Method</label>
                                                <select value={firstSel.inputMethod || 'keyboard'}
                                                    onChange={e => updateNodeProp('inputMethod', e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                                                    <option value="keyboard">Keyboard</option>
                                                    <option value="form">Form Entry</option>
                                                    <option value="scan">Scan / Barcode</option>
                                                    <option value="voice">Voice Input</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Required Fields</label>
                                                <input type="text" value={firstSel.requiredFields || ''}
                                                    onChange={e => updateNodeProp('requiredFields', e.target.value)}
                                                    placeholder="e.g. Name, Email, Amount"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Delay-specific ── */}
                                    {firstSel.type === 'fc-delay' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Wait Duration</label>
                                                <input type="text" value={firstSel.waitDuration || ''}
                                                    onChange={e => updateNodeProp('waitDuration', e.target.value)}
                                                    placeholder="e.g. 24 hours, 3 days"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Reason</label>
                                                <input type="text" value={firstSel.waitReason || ''}
                                                    onChange={e => updateNodeProp('waitReason', e.target.value)}
                                                    placeholder="Why is there a wait?"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Connector (circle) specific ── */}
                                    {firstSel.type === 'fc-connector' && (
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Reference Label</label>
                                            <input type="text" value={firstSel.refLabel || ''}
                                                onChange={e => updateNodeProp('refLabel', e.target.value)}
                                                placeholder="e.g. A, B, 1, 2"
                                                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            <p className="text-[10px] text-gray-400 mt-1">Used for on-page connector references</p>
                                        </div>
                                    )}

                                    {/* ── Annotation-specific ── */}
                                    {firstSel.type === 'fc-annotation' && (
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Note Text</label>
                                            <textarea value={firstSel.noteText || ''}
                                                onChange={e => updateNodeProp('noteText', e.target.value)}
                                                placeholder="Add a detailed note or comment…"
                                                rows={3}
                                                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
                                        </div>
                                    )}

                                    {/* ── Data Store specific ── */}
                                    {firstSel.type === 'fc-data' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Storage Type</label>
                                                <select value={firstSel.storageType || 'internal'}
                                                    onChange={e => updateNodeProp('storageType', e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                                                    <option value="internal">Internal Data</option>
                                                    <option value="external">External Source</option>
                                                    <option value="api">API Endpoint</option>
                                                    <option value="file">File System</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Data Format</label>
                                                <input type="text" value={firstSel.dataFormat || ''}
                                                    onChange={e => updateNodeProp('dataFormat', e.target.value)}
                                                    placeholder="e.g. JSON, CSV, XML"
                                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Style Settings ── */}
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Style</p>

                                    {/* Fill color */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Fill Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={firstSel.fill || '#dbeafe'}
                                                onChange={e => updateNodeProp('fill', e.target.value)}
                                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200" />
                                            <input type="text" value={firstSel.fill || '#dbeafe'}
                                                onChange={e => updateNodeProp('fill', e.target.value)}
                                                className="flex-1 text-xs font-mono px-2 py-1.5 border border-gray-200 rounded-lg uppercase" />
                                        </div>
                                        {/* Quick color palette */}
                                        <div className="flex gap-1 mt-1.5">
                                            {['#dbeafe','#dcfce7','#fef9c3','#fee2e2','#f3e8ff','#e0e7ff','#fff7ed','#fce7f3','#f1f5f9','#ffffff'].map(c => (
                                                <button key={c} onClick={() => updateNodeProp('fill', c)}
                                                    className={`w-5 h-5 rounded border ${firstSel.fill === c ? 'ring-2 ring-indigo-400 ring-offset-1' : 'border-gray-200'}`}
                                                    style={{ background: c }} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Stroke color */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Border Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={firstSel.stroke || '#3b82f6'}
                                                onChange={e => updateNodeProp('stroke', e.target.value)}
                                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200" />
                                            <input type="text" value={firstSel.stroke || '#3b82f6'}
                                                onChange={e => updateNodeProp('stroke', e.target.value)}
                                                className="flex-1 text-xs font-mono px-2 py-1.5 border border-gray-200 rounded-lg uppercase" />
                                        </div>
                                    </div>

                                    {/* Stroke width */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Border Width</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="range" min={1} max={8} value={firstSel.strokeWidth || 2}
                                                onChange={e => updateNodeProp('strokeWidth', +e.target.value)}
                                                className="flex-1 accent-indigo-500" />
                                            <span className="text-xs font-mono w-5 text-gray-600">{firstSel.strokeWidth || 2}</span>
                                        </div>
                                    </div>

                                    {/* Text color */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Text Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={firstSel.textColor || '#1e293b'}
                                                onChange={e => updateNodeProp('textColor', e.target.value)}
                                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200" />
                                            <input type="text" value={firstSel.textColor || '#1e293b'}
                                                onChange={e => updateNodeProp('textColor', e.target.value)}
                                                className="flex-1 text-xs font-mono px-2 py-1.5 border border-gray-200 rounded-lg uppercase" />
                                        </div>
                                    </div>

                                    {/* Font size */}
                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Font Size</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="range" min={9} max={32} value={firstSel.fontSize || 14}
                                                onChange={e => updateNodeProp('fontSize', +e.target.value)}
                                                className="flex-1 accent-indigo-500" />
                                            <span className="text-xs font-mono w-6 text-gray-600">{firstSel.fontSize || 14}px</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Position & Size ── */}
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Position &amp; Size</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <div>
                                            <label className="text-[10px] text-gray-400">X</label>
                                            <input type="number" value={Math.round(firstSel.x)}
                                                onChange={e => updateNodeProp('x', +e.target.value)}
                                                className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400">Y</label>
                                            <input type="number" value={Math.round(firstSel.y)}
                                                onChange={e => updateNodeProp('y', +e.target.value)}
                                                className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400">Width</label>
                                            <input type="number" value={Math.round(firstSel.w)} min={40}
                                                onChange={e => updateNodeProp('w', Math.max(40, +e.target.value))}
                                                className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400">Height</label>
                                            <input type="number" value={Math.round(firstSel.h)} min={30}
                                                onChange={e => updateNodeProp('h', Math.max(30, +e.target.value))}
                                                className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Layer Order ── */}
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Layer</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button onClick={() => bringForward(firstSel.id)}
                                            className="py-1.5 text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-1">
                                            <Layers size={12} /> Forward
                                        </button>
                                        <button onClick={() => sendBack(firstSel.id)}
                                            className="py-1.5 text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-1">
                                            <Layers size={12} className="rotate-180" /> Back
                                        </button>
                                    </div>
                                </div>

                                {/* Align buttons (multi) */}
                                {selectedIds.length >= 2 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Align</p>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[['left','⬅ Left'],['center','↔ Center'],['right','➡ Right'],['top','⬆ Top'],['middle','↕ Middle'],['bottom','⬇ Bottom']].map(([t,l]) => (
                                                <button key={t} onClick={() => alignNodes(t)} className="text-[10px] py-1 px-1 rounded border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 text-gray-600 hover:text-indigo-700">{l}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Connections list */}
                                {selectedIds.length === 1 && (() => {
                                    const nodeConns = conns.filter(c => c.fromId === firstSel.id || c.toId === firstSel.id);
                                    if (nodeConns.length === 0) return null;
                                    return (
                                        <div className="pt-2 border-t border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Connections ({nodeConns.length})</p>
                                            <div className="space-y-1">
                                                {nodeConns.map(c => {
                                                    const isFrom = c.fromId === firstSel.id;
                                                    const otherId = isFrom ? c.toId : c.fromId;
                                                    const otherNode = nodes.find(n => n.id === otherId);
                                                    return (
                                                        <div key={c.id}
                                                            onClick={() => { setSelectedConnId(c.id); setSelectedIds([]); }}
                                                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 hover:bg-indigo-50 cursor-pointer text-[11px] text-gray-600 transition-colors">
                                                            <span className="text-gray-400">{isFrom ? '→' : '←'}</span>
                                                            <span className="truncate flex-1">{otherNode?.label || 'Unnamed'}</span>
                                                            {c.label && <span className="text-[10px] text-indigo-500 font-medium">{c.label}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Connector properties */}
                        {selectedConn && !firstSel && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 text-sm">⟶</div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Connector</p>
                                        <p className="text-[10px] text-gray-400">
                                            {nodes.find(n => n.id === selectedConn.fromId)?.label || 'Source'} → {nodes.find(n => n.id === selectedConn.toId)?.label || 'Target'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button onClick={() => setEditingConnId(selectedConn.id)} className="flex-1 py-1.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1">✏️ Label</button>
                                    <button onClick={deleteSelected} className="flex-1 py-1.5 text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"><Trash2 size={12} /> Delete</button>
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Label</label>
                                    <input type="text" value={selectedConn.label || ''}
                                        onChange={e => updateConnProp('label', e.target.value)}
                                        placeholder="e.g. Yes / No"
                                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Style</p>

                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={selectedConn.stroke || '#64748b'}
                                                onChange={e => updateConnProp('stroke', e.target.value)}
                                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200" />
                                            <input type="text" value={selectedConn.stroke || '#64748b'}
                                                onChange={e => updateConnProp('stroke', e.target.value)}
                                                className="flex-1 text-xs font-mono px-2 py-1.5 border border-gray-200 rounded-lg uppercase" />
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Width</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="range" min={1} max={6} value={selectedConn.strokeWidth || 2}
                                                onChange={e => updateConnProp('strokeWidth', +e.target.value)} className="flex-1 accent-indigo-500" />
                                            <span className="text-xs font-mono w-5 text-gray-600">{selectedConn.strokeWidth || 2}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                                        <button onClick={() => updateConnProp('style', 'solid')}
                                            className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${selectedConn.style !== 'dashed' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>── Solid</button>
                                        <button onClick={() => updateConnProp('style', 'dashed')}
                                            className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${selectedConn.style === 'dashed' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>- - Dashed</button>
                                    </div>

                                    <button onClick={() => updateConnProp('curved', !selectedConn.curved)}
                                        className={`w-full py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${selectedConn.curved ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>⌒ Curved</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context menu */}
            {ctxMenu && (
                <ContextMenu
                    pos={ctxMenu}
                    node={nodes.find(n => n.id === ctxMenu.nodeId)}
                    onClose={() => setCtxMenu(null)}
                    onEdit={() => { setEditingNodeId(ctxMenu.nodeId); setCtxMenu(null); }}
                    onDuplicate={() => { setSelectedIds([ctxMenu.nodeId]); duplicateSelected(); setCtxMenu(null); }}
                    onDelete={() => { setSelectedIds([ctxMenu.nodeId]); deleteSelected(); setCtxMenu(null); }}
                    onBringForward={() => { bringForward(ctxMenu.nodeId); setCtxMenu(null); }}
                    onSendBack={() => { sendBack(ctxMenu.nodeId); setCtxMenu(null); }}
                />
            )}
        </div>
    );
}
