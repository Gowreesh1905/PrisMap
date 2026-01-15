import React from 'react';
import { Square, Circle, Type, Image as ImageIcon } from 'lucide-react';

const SidePanel = ({ activeTab, addElement }) => {
  return (
    <div className="w-[300px] bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">{activeTab}</h2>
      
      {activeTab === 'Elements' && (
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => addElement('square')} className="aspect-square bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-purple-500 transition-all">
            <Square className="text-gray-600" />
            <span className="text-[10px] mt-2">Square</span>
          </button>
          <button onClick={() => addElement('circle')} className="aspect-square bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-purple-500 transition-all">
            <Circle className="text-gray-600" />
            <span className="text-[10px] mt-2">Circle</span>
          </button>
        </div>
      )}

      {activeTab === 'Text' && (
        <div className="space-y-3">
          <button onClick={() => addElement('text')} className="w-full py-3 bg-gray-100 rounded font-bold text-xl hover:bg-gray-200">
            Add a heading
          </button>
          <button onClick={() => addElement('text')} className="w-full py-2 bg-gray-100 rounded font-medium text-md hover:bg-gray-200">
            Add a subheading
          </button>
        </div>
      )}
    </div>
  );
};

export default SidePanel;