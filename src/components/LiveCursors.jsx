/**
 * @fileoverview Renders remote users' cursors on the Konva canvas.
 * 
 * Each cursor is a colored pointer arrow with the user's name label.
 * Receives the `remoteCursors` array from the useCollaboration hook.
 * 
 * This component renders inside a Konva <Layer>, so it uses
 * Konva primitives (Group, Line, Rect, Text) — not HTML elements.
 */

import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';

/**
 * Renders a single remote user's cursor with name label.
 * 
 * Visual structure:
 *   ↗         ← colored pointer (triangle via Line)
 *  ┌──────┐
 *  │ Alice │   ← name tag with colored background
 *  └──────┘
 */
function CursorPointer({ name, color, x, y }) {
    // The pointer triangle points (relative to cursor position)
    // Forms a small arrow pointing top-left
    const pointerPoints = [
        0, 0,       // tip (actual cursor position)
        4, 16,      // bottom-left of pointer
        12, 12      // bottom-right of pointer
    ];

    // Estimate label width based on character count
    const labelPadding = 8;
    const charWidth = 7;
    const labelWidth = name.length * charWidth + labelPadding * 2;
    const labelHeight = 22;

    return (
        <Group x={x} y={y} listening={false}>
            {/* Pointer arrow */}
            <Line
                points={pointerPoints}
                fill={color}
                closed={true}
                stroke={color}
                strokeWidth={1}
            />

            {/* Name label background */}
            <Rect
                x={14}
                y={12}
                width={labelWidth}
                height={labelHeight}
                fill={color}
                cornerRadius={4}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={4}
                shadowOffsetY={2}
            />

            {/* Name text */}
            <Text
                x={14 + labelPadding}
                y={16}
                text={name}
                fontSize={12}
                fill="white"
                fontStyle="bold"
                fontFamily="Arial"
            />
        </Group>
    );
}

/**
 * LiveCursors — renders all remote users' cursors on the canvas.
 * 
 * @param {Object} props
 * @param {Array<{uid: string, name: string, color: string, x: number, y: number}>} props.cursors
 *   Array of remote cursor positions from useCollaboration hook.
 * 
 * Usage inside a Konva Layer:
 *   <Layer>
 *     {elements.map(renderShape)}
 *     <LiveCursors cursors={remoteCursors} />
 *   </Layer>
 */
export default function LiveCursors({ cursors }) {
    if (!cursors || cursors.length === 0) return null;

    return (
        <>
            {cursors.map((cursor) => (
                <CursorPointer
                    key={cursor.uid}
                    name={cursor.name}
                    color={cursor.color}
                    x={cursor.x}
                    y={cursor.y}
                />
            ))}
        </>
    );
}
