"use client";
import React from 'react';
import { Rnd } from 'react-rnd';

const CanvasArea = ({ elements, selectedId, setSelectedElement, updateElement }) => {
  return (
    <div className="relative">
      <div 
        id="canvas-runtime"
        className="w-[800px] h-[600px] bg-white shadow-2xl relative overflow-hidden"
        onClick={() => setSelectedElement(null)} 
      >
        {elements.map((el) => (
          <Rnd
            key={el.id}
            size={{ width: el.width || 150, height: el.height || 150 }}
            position={{ x: el.x, y: el.y }}
            onDragStop={(e, d) => {
              updateElement(el.id, { x: d.x, y: d.y });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              updateElement(el.id, {
                width: ref.offsetWidth,
                height: ref.offsetHeight,
                ...position,
              });
            }}
            // Fix 1: Stop propagation so clicking element doesn't trigger background click
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedElement(el);
            }}
            bounds="parent"
            // Fix 2: Prevent the textarea from capturing drag events unless intended
            dragHandleClassName="drag-handle"
            className={`flex items-center justify-center border-2 transition-colors drag-handle ${
              selectedId === el.id ? "border-purple-600 z-50" : "border-transparent hover:border-purple-300 z-10"
            }`}
          >
            {el.type === 'text' ? (
              <textarea
                className="bg-transparent w-full h-full resize-none outline-none text-center p-2 cursor-text"
                value={el.content}
                onChange={(e) => updateElement(el.id, { content: e.target.value })}
                onFocus={() => setSelectedElement(el)}
                style={{ 
                  fontSize: `${el.fontSize || 24}px`, 
                  color: el.color,
                  fontWeight: el.fontWeight || 'normal' 
                }}
              />
            ) : (
              <div 
                className="w-full h-full" 
                style={{ 
                  backgroundColor: el.color, 
                  borderRadius: el.type === 'circle' ? '50%' : '0px' 
                }} 
              />
            )}

            {/* Visual Selection Handles */}
            {selectedId === el.id && (
              <div className="pointer-events-none">
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-purple-600 rounded-full" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-purple-600 rounded-full" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-purple-600 rounded-full" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-purple-600 rounded-full" />
              </div>
            )}
          </Rnd>
        ))}
      </div>
      
      <div className="absolute -top-8 left-0 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Page 1 — 800 x 600
      </div>
    </div>
  );
};

export default CanvasArea;