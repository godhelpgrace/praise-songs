'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePresentation } from '@/context/PresentationContext';
import { X, Minus, GripVertical, Play, Trash2, List, Maximize2, Minimize2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function PresentationPanel() {
  const { items, removeItem, clearList, reorderList } = usePresentation();
  const pathname = usePathname();
  // Default to closed if no items, open if there are items (though user can toggle)
  // Requirement: "当没有选取歌谱时，请默认收缩状态" -> means !isOpen or isMinimized? 
  // Usually "收缩" means minimized or collapsed. But "显示在右下角" implies the button form.
  // Let's default to !isOpen (the button view) when items is empty initially.
  const [isOpen, setIsOpen] = useState(false); 
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();



  // Auto-open when items are added (optional but good UX)
  useEffect(() => {
    if (items.length > 0 && !isOpen) {
      setIsOpen(true);
      // Ensure it's not minimized when auto-opening
      setIsMinimized(false);
    }
  }, [items.length]);
  const isDraggingPanel = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Set initial position to bottom right
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 420,
        y: window.innerHeight - 600
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current && e.target instanceof HTMLElement && e.target.closest('.panel-header')) {
      // Don't drag if clicking buttons
      if (e.target.closest('button')) return;

      isDraggingPanel.current = true;
      const rect = panelRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingPanel.current) {
          setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
          });
        }
      };

      const handleMouseUp = () => {
        isDraggingPanel.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  // List Drag and Drop logic
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === index) return;
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(fromIndexStr, 10);

    if (!isNaN(fromIndex) && fromIndex !== index) {
      reorderList(fromIndex, index);
    }
    setDraggedItemIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setDropTargetIndex(null);
  };

  if (pathname === '/presentation' || pathname !== '/sheet') {
    return null;
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-10 right-10 z-50 w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 flex items-center justify-center transition-transform hover:scale-110 group"
        title="打开演示列表"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9c4.97 0 9 4.03 9 9Z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {items.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 w-[360px] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-200"
      style={{ 
        left: position.x, 
        top: position.y,
        height: isMinimized ? 'auto' : (isMaximized ? '80vh' : 'auto'),
        maxHeight: isMinimized ? '60px' : (isMaximized ? '90vh' : '60vh')
      }}
    >
      {/* Header */}
      <div 
        className="panel-header h-12 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 cursor-move select-none shrink-0"
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-gray-700 flex items-center gap-2">
          <List size={18} />
          演示列表 
          {items.length > 0 && (
             <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md text-gray-500"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50/50">
            {items.length === 0 ? (
              <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-gray-400 text-sm">
                <List size={48} className="mb-2 opacity-20" />
                <p>列表为空</p>
                <p className="text-xs mt-1">点击歌谱上的 "+" 添加</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      bg-white border rounded-lg p-2 flex items-center gap-2 shadow-sm transition-all duration-200
                      ${draggedItemIndex === index ? 'opacity-50 scale-95' : 'opacity-100'}
                      ${dropTargetIndex === index ? 'border-blue-500 border-2 scale-105' : 'border-gray-100 hover:shadow-md'}
                    `}
                  >
                    <span className="text-gray-400 cursor-grab active:cursor-grabbing p-1 hover:text-gray-600">
                      <GripVertical size={16} />
                    </span>
                    <span className="text-gray-500 text-xs font-mono w-6">{index + 1}.</span>
                    <span className="flex-1 text-sm text-gray-700 truncate font-medium select-none">{item.title}</span>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="移除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-white flex justify-between items-center gap-3 shrink-0">
             <button 
               onClick={clearList}
               disabled={items.length === 0}
               className="text-xs text-gray-500 hover:text-red-600 px-3 py-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
             >
               清空
             </button>
             <button 
               onClick={() => {
                  if (items.length > 0) {
                    router.push('/presentation');
                  } else {
                    alert('请先添加歌谱到演示列表');
                  }
               }}
               disabled={items.length === 0}
               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Play size={16} fill="currentColor" />
               开始演示
             </button>
          </div>
        </>
      )}
    </div>
  );
}
