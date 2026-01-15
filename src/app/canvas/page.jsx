"use client";
import React, { useState, useCallback } from 'react';
import Header from '@/components/canvas-editor/Header';
import Sidebar from '@/components/canvas-editor/Sidebar';
import Toolbar from '@/components/canvas-editor/Toolbar';
import CanvasArea from '@/components/canvas-editor/CanvasArea';
import SidePanel from '@/components/canvas-editor/SidePanel';

export default function CanvasPage() {
    // 1. Define the state for your design elements
    const [activeTab, setActiveTab] = useState('Elements');
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasElements, setCanvasElements] = useState([
        { 
            id: 1, 
            type: 'text', 
            content: 'Welcome to PrisMap', 
            x: 250, 
            y: 200, 
            width: 300, 
            height: 60, 
            fontSize: 32, 
            color: '#000000' 
        },
    ]);

    // 2. Logic to add new elements (Square, Circle, Text)
    const addElement = (type) => {
        const newEl = {
            id: Date.now(),
            type: type,
            content: type === 'text' ? 'New Text' : '',
            x: 200, y: 200,
            width: 150, height: 150,
            color: type === 'text' ? '#000000' : '#8b3dff',
            fontSize: type === 'text' ? 24 : undefined,
        };
        setCanvasElements([...canvasElements, newEl]);
        setSelectedElement(newEl);
    };

    // 3. Logic to update elements (Drag, Resize, Color change)
    const updateElement = useCallback((id, newValues) => {
        setCanvasElements((prev) =>
            prev.map((el) => (el.id === id ? { ...el, ...newValues } : el))
        );
        setSelectedElement((prev) => 
            prev?.id === id ? { ...prev, ...newValues } : prev
        );
    }, []);

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#F1F2F6]">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Side Navigation */}
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                
                {/* Side Panel (The drawer with shapes/text to click) */}
                <SidePanel activeTab={activeTab} addElement={addElement} />

                <div className="flex flex-col flex-1 relative overflow-hidden">
                    {/* Toolbar handles the styling of the selected element */}
                    <Toolbar 
                        selectedElement={selectedElement} 
                        updateElement={updateElement} 
                    />
                    
                    <div className="flex-1 overflow-auto flex items-center justify-center p-12">
                        {/* CRITICAL: Passing 'elements' prop so CanvasArea doesn't crash */}
                        <CanvasArea 
                            elements={canvasElements} 
                            selectedId={selectedElement?.id}
                            setSelectedElement={setSelectedElement}
                            updateElement={updateElement}
                        />
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-6 right-6 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 text-sm font-medium flex gap-4 items-center">
                        <button className="hover:text-purple-600">-</button>
                        <span>85%</span>
                        <button className="hover:text-purple-600">+</button>
                    </div>
                </div>
            </div>
        </div>
    );
}