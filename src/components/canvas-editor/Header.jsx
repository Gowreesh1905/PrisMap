import React from 'react';
import { Undo2, Redo2, CloudCheck, Download } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
      <div className="flex items-center gap-4">
        {/* --- REMOVED THE CANVA LOGO DIV --- */}
        {/* Added PrisMap Branding instead */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-gray-900">
            Pris<span className="text-purple-600">Map</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium ml-4">
          <button className="px-3 py-1 hover:bg-gray-100 rounded">File</button>
          <button className="px-3 py-1 hover:bg-gray-100 rounded text-purple-600">Resize</button>
          <div className="w-[1px] h-4 bg-gray-300 mx-1" />
          <div className="flex gap-1">
            <button className="p-2 hover:bg-gray-100 rounded"><Undo2 size={18} /></button>
            <button className="p-2 hover:bg-gray-100 rounded"><Redo2 size={18} /></button>
          </div>
          <div className="flex items-center gap-1 text-gray-400 ml-2">
            <CloudCheck size={16} />
            <span className="text-xs">Saved</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-4 py-1.5 border border-gray-300 rounded font-semibold text-sm hover:bg-gray-50">
          Share
        </button>
        <button className="px-4 py-1.5 bg-[#8b3dff] hover:bg-[#7a2be0] text-white rounded font-semibold text-sm flex items-center gap-2 transition-colors">
          Download <Download size={16} />
        </button>
      </div>
    </header>
  );
};

export default Header;