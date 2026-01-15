import React, { useState } from 'react';
import { LayoutDashboard, Shapes, Type, UploadCloud, Image as ImageIcon, Sparkles } from 'lucide-react';

const Sidebar = () => {
  const [active, setActive] = useState('Elements');

  const navItems = [
    { label: 'Design', icon: <LayoutDashboard size={22} /> },
    { label: 'Elements', icon: <Shapes size={22} /> },
    { label: 'Text', icon: <Type size={22} /> },
    { label: 'Uploads', icon: <UploadCloud size={22} /> },
    { label: 'Photos', icon: <ImageIcon size={22} /> },
    { label: 'Magic AI', icon: <Sparkles size={22} />, special: true },
  ];

  return (
    <aside className="w-[72px] bg-[#0E1318] flex flex-col items-center py-4 z-20">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => setActive(item.label)}
          className={`w-full flex flex-col items-center justify-center py-4 gap-1 transition-all
            ${active === item.label ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}
            ${item.special ? 'text-purple-400' : ''}`}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </aside>
  );
};

export default Sidebar;