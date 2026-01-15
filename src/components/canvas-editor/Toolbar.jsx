import React from 'react';
import { Bold, Italic, Type, Palette, Trash2 } from 'lucide-react';

const Toolbar = ({ selectedElement, updateElement }) => {
  if (!selectedElement) {
    return (
      <div className="h-12 bg-white border-b flex items-center px-4 text-gray-400 text-sm italic">
        Select an element to edit
      </div>
    );
  }

  return (
    <div className="h-12 bg-white border-b shadow-sm flex items-center px-4 gap-4 animate-in fade-in slide-in-from-top-1">
      {/* Color Picker for everything */}
      <div className="flex items-center gap-2">
        <Palette size={16} className="text-gray-500" />
        <input 
          type="color" 
          value={selectedElement.color || '#000000'}
          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
          className="w-6 h-6 rounded cursor-pointer border-none p-0"
        />
      </div>

      <div className="w-[1px] h-6 bg-gray-200" />

      {/* Text specific controls */}
      {selectedElement.type === 'text' && (
        <>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`p-1.5 rounded ${selectedElement.fontWeight === 'bold' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
            >
              <Bold size={18} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">Size</span>
            <input 
              type="number" 
              className="w-12 border rounded px-1 text-sm"
              value={selectedElement.fontSize}
              onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
            />
          </div>
        </>
      )}

      <div className="ml-auto">
        <button 
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;