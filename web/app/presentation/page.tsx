'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { usePresentation } from '@/context/PresentationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, ChevronRight, X, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, RotateCcw, ArrowUp, ArrowDown, Image as ImageIcon, Save
} from 'lucide-react';

// Storage Keys
const PARAMS_STORAGE_KEY = 'presentationParamsV1';
const BG_STORAGE_KEY = 'presentationBgSrc';

type SongParams = {
  top: { offsetVh: number; zoom: number };
  bottom: { offsetVh: number; zoom: number };
  hideBottom?: boolean;
};

function PresentationContent() {
  const { items: contextItems } = usePresentation();
  const [items, setItems] = useState(contextItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentHalf, setCurrentHalf] = useState<0 | 1>(0); // 0: Top, 1: Bottom
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Parameters State (Offsets & Zooms)
  const [paramsData, setParamsData] = useState<Record<string, SongParams>>({});
  
  // Background State
  const [bgUrl, setBgUrl] = useState<string>('/bj.jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Save Params to Server
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveParams = async () => {
    setIsSaving(true);
    try {
      const payload = {
        items: paramsData,
        bgUrl: bgUrl || undefined
      };
      
      const res = await fetch('/api/presentation/params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      // Show success feedback (optional)
      const btn = document.getElementById('save-btn-text');
      if (btn) {
         btn.textContent = '已保存';
         setTimeout(() => { if(btn) btn.textContent = '保存'; }, 1000);
      }
    } catch (e) {
      console.error('Save failed', e);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize items and params
  useEffect(() => {
    // 1. Try to load from Query Params (Priority)
    const songsParam = searchParams.get('songs');
    const imageDirParam = searchParams.get('imageDir');
    
    if (songsParam) {
      try {
        const songs = JSON.parse(songsParam);
        if (Array.isArray(songs) && songs.length > 0) {
          const newItems = songs.map((s: any) => ({
            id: s.file,
            title: s.name,
            sheetUrl: imageDirParam 
              ? `/api/file/${imageDirParam}/${s.file}`
              : `/api/file/sheets/${s.file}` 
          }));
          setItems(newItems);
        }
      } catch (e) {
        console.error('Failed to parse songs param', e);
      }
    } else if (contextItems.length > 0) {
      setItems(contextItems);
    } else {
      const stored = localStorage.getItem('presentationList');
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse presentation list', e);
        }
      }
    }

    // Load params - Prefer Server, fallback to Local
    const loadParams = async () => {
      try {
        const res = await fetch('/api/presentation/params');
        if (res.ok) {
            const data = await res.json();
            if (data.items) {
                setParamsData(prev => ({ ...prev, ...data.items }));
            }
            if (data.bgUrl) {
                setBgUrl(data.bgUrl);
            }
        }
      } catch (e) {
         console.warn('Failed to load server params, using local', e);
      }
      
      // Merge with local storage (local storage might have unsaved changes?)
      // Actually, let's just load local storage first, then overlay server params?
      // Or just use local storage as cache.
      // For now, let's keep the existing local storage load as fallback or initial state
      try {
        const storedParams = localStorage.getItem(PARAMS_STORAGE_KEY);
        if (storedParams) {
           const localData = JSON.parse(storedParams);
           setParamsData(prev => ({ ...localData, ...prev })); // Server wins if loaded later? No, usually local changes are newer if offline.
           // Let's assume server is source of truth for "Saved" params.
        }
      } catch (e) {}

      // Background
      try {
        const storedBg = localStorage.getItem(BG_STORAGE_KEY);
        if (storedBg) {
            setBgUrl(storedBg);
        }
        // Logic: Local Storage > Server > Default ('/bj.jpg')
        // We already initialize with Default.
        // If Server has BG, it is set in the block above (lines 94-96).
        // If Local Storage has BG, it overrides Server (lines 118-120).
      } catch(e) {}
    };
    
    loadParams();

  }, [contextItems, searchParams]);

  const currentItem = items[currentIndex];
  
  // Get current params
  const getParams = (itemId: string, half: 0 | 1) => {
    const itemParams = paramsData[itemId] || { 
      top: { offsetVh: 0, zoom: 1 }, 
      bottom: { offsetVh: 0, zoom: 1 } 
    };
    return half === 0 ? itemParams.top : itemParams.bottom;
  };

  const updateParams = (itemId: string, half: 0 | 1, updates: Partial<{ offsetVh: number; zoom: number }>) => {
    setParamsData(prev => {
      const itemParams = prev[itemId] || { 
        top: { offsetVh: 0, zoom: 1 }, 
        bottom: { offsetVh: 0, zoom: 1 } 
      };
      const halfKey = half === 0 ? 'top' : 'bottom';
      const newParams = {
        ...prev,
        [itemId]: {
          ...itemParams,
          [halfKey]: { ...itemParams[halfKey], ...updates }
        }
      };
      localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(newParams));
      return newParams;
    });
  };

  // Navigation
  const nextSlide = () => {
    if (currentHalf === 0) {
      // Check if bottom is hidden for current item
      const params = paramsData[items[currentIndex].id];
      if (params?.hideBottom) {
        setCurrentIndex(prev => (prev + 1) % items.length);
        setCurrentHalf(0);
      } else {
        setCurrentHalf(1);
      }
    } else {
      setCurrentIndex(prev => (prev + 1) % items.length);
      setCurrentHalf(0);
    }
  };

  const prevSlide = () => {
    if (currentHalf === 1) {
      setCurrentHalf(0);
    } else {
      const newIndex = (currentIndex - 1 + items.length) % items.length;
      const prevItem = items[newIndex];
      const params = paramsData[prevItem.id];
      
      setCurrentIndex(newIndex);
      if (params?.hideBottom) {
        setCurrentHalf(0);
      } else {
        setCurrentHalf(1);
      }
    }
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentItem) return;

      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          router.back();
        }
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        // Move Up
        const p = getParams(currentItem.id, currentHalf);
        updateParams(currentItem.id, currentHalf, { offsetVh: p.offsetVh + 0.5 });
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        // Move Down
        const p = getParams(currentItem.id, currentHalf);
        updateParams(currentItem.id, currentHalf, { offsetVh: p.offsetVh - 0.5 });
      } else if (e.key === '=' || e.key === '+') {
        const p = getParams(currentItem.id, currentHalf);
        updateParams(currentItem.id, currentHalf, { zoom: Math.min(p.zoom + 0.01, 5) });
      } else if (e.key === '-') {
        const p = getParams(currentItem.id, currentHalf);
        updateParams(currentItem.id, currentHalf, { zoom: Math.max(p.zoom - 0.01, 0.1) });
      } else if (e.key === '0' || e.key === 'r') {
        updateParams(currentItem.id, currentHalf, { offsetVh: 0, zoom: 1 });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveParams();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentHalf, items.length, paramsData, isFullscreen, currentItem, bgUrl]); // Added bgUrl to dependencies for save

  // Fullscreen
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleHideBottom = () => {
    if (!currentItem) return;
    const itemId = currentItem.id;
    
    setParamsData(prev => {
      const itemParams = prev[itemId] || { 
        top: { offsetVh: 0, zoom: 1 }, 
        bottom: { offsetVh: 0, zoom: 1 } 
      };
      
      const newHideBottom = !itemParams.hideBottom;
      
      const newParams = {
        ...prev,
        [itemId]: {
          ...itemParams,
          hideBottom: newHideBottom
        }
      };
      localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(newParams));
      return newParams;
    });

    // If we are currently on bottom and hiding it, move to top
    if (currentHalf === 1) {
        setCurrentHalf(0);
    }
  };

  const isBottomHidden = paramsData[currentItem?.id]?.hideBottom;

  // Background Handler
  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = evt.target?.result as string;
        setBgUrl(res);
        try {
          localStorage.setItem(BG_STORAGE_KEY, res);
        } catch (err) {
          console.warn('Background image too large for localStorage, it will reset on refresh');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (items.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-xl mb-4">演示列表为空</p>
        <button 
          onClick={() => router.back()}
          className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          返回歌谱库
        </button>
      </div>
    );
  }

  const { offsetVh, zoom } = getParams(currentItem.id, currentHalf);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white font-sans select-none group">
      {/* Global Background */}
      {bgUrl && (
        <img 
          src={bgUrl} 
          className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none z-0" 
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Paper Overlay */}
      <div className="absolute inset-[3vh_3vw] bg-white/50 border-[1.5px] border-white/80 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.20)] pointer-events-none z-0 backdrop-blur-[5px]" />

      {/* Sheet Music Layer */}
      <div className="absolute inset-0 overflow-hidden">
         <img 
           src={currentItem.sheetUrl} 
           alt={currentItem.title}
           className="absolute left-1/2 w-auto max-w-none transition-transform duration-200 ease-out"
           style={{
             height: '200vh', // Double height for split view
             top: currentHalf === 0 
               ? `calc(${offsetVh}vh)` 
               : `calc(-100vh * ${zoom} + ${offsetVh}vh)`,
             transform: `translateX(-50%) scale(${zoom})`,
             transformOrigin: 'top center',
             mixBlendMode: 'multiply',
             filter: 'contrast(1.12) brightness(0.98)',
             zIndex: 1
           }}
         />
      </div>

      {/* Navigation Buttons */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-4 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-50 hover:scale-110 border border-white/10"
      >
        <ChevronLeft size={32} />
      </button>

      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-4 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-50 hover:scale-110 border border-white/10"
      >
        <ChevronRight size={32} />
      </button>

      {/* Top Right Controls */}
      <div className={`absolute top-5 right-5 flex gap-3 z-50 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <button 
          onClick={() => router.back()}
          className="bg-black/50 hover:bg-red-600/80 text-white px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 text-sm font-medium transition-colors"
        >
          退出演示
        </button>
        <button 
          onClick={toggleFullscreen}
          className="bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 text-sm font-medium transition-colors"
        >
          {isFullscreen ? '退出全屏' : '全屏'}
        </button>
      </div>

      {/* Bottom Info Bar */}
      <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-2 rounded-lg text-white border border-white/10 z-50 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <span className="font-bold">{currentItem.title}</span>
        <span className="mx-2 text-gray-400">|</span>
        <span>{currentIndex + 1} / {items.length}</span>
        <span className="mx-2 text-gray-400">·</span>
        <span className="text-yellow-400">{currentHalf === 0 ? '上半' : '下半'}</span>
      </div>

      {/* Bottom Left Adjust Controls */}
      <div className={`absolute bottom-5 left-5 flex items-center gap-2 bg-black/50 backdrop-blur-md p-2 rounded-lg border border-white/10 z-50 text-white transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center gap-1 pr-2 border-r border-white/20">
          <button 
            onClick={() => updateParams(currentItem.id, currentHalf, { offsetVh: offsetVh + 0.25 })}
            className="p-1.5 hover:bg-white/20 rounded" 
            title="上移 (Up/W)"
          >
            <ArrowUp size={16} />
          </button>
          <button 
            onClick={() => updateParams(currentItem.id, currentHalf, { offsetVh: offsetVh - 0.25 })}
            className="p-1.5 hover:bg-white/20 rounded" 
            title="下移 (Down/S)"
          >
            <ArrowDown size={16} />
          </button>
          <button 
            onClick={() => updateParams(currentItem.id, currentHalf, { offsetVh: 0 })}
            className="p-1.5 hover:bg-white/20 rounded" 
            title="复位 (0/R)"
          >
            <RotateCcw size={14} />
          </button>
          <span className="text-xs font-mono w-20 text-center">偏移: {offsetVh > 0 ? '+' : ''}{offsetVh.toFixed(1)}vh</span>
        </div>

        <div className="flex items-center gap-1 pl-2 border-r border-white/20 pr-2">
          <button 
            onClick={() => updateParams(currentItem.id, currentHalf, { zoom: Math.min(zoom + 0.01, 5) })}
            className="p-1.5 hover:bg-white/20 rounded" 
            title="放大 (+)"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => updateParams(currentItem.id, currentHalf, { zoom: Math.max(zoom - 0.01, 0.1) })}
            className="p-1.5 hover:bg-white/20 rounded" 
            title="缩小 (-)"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono w-20 text-center">缩放: {zoom.toFixed(2)}x</span>
        </div>

        <div className="flex items-center gap-1 pl-2 border-r border-white/20 pr-2">
           <button 
             onClick={toggleHideBottom}
             className={`p-1.5 hover:bg-white/20 rounded flex items-center gap-1 text-xs ${isBottomHidden ? 'text-red-400' : ''}`}
             title={isBottomHidden ? "恢复下半页" : "隐藏下半页 (仅显示上半页)"}
           >
             {isBottomHidden ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
             {isBottomHidden ? "恢复下半" : "单页模式"}
           </button>
        </div>

        <div className="pl-2 flex items-center gap-1">
           <button 
             className="p-1.5 hover:bg-white/20 rounded flex items-center gap-1 text-xs"
             onClick={() => {
                // Trigger file input
                fileInputRef.current?.click();
             }}
             title="更换背景"
           >
             <ImageIcon size={16} />
             背景
           </button>
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept="image/*"
             onChange={handleBgChange}
           />
           <button 
             onClick={handleSaveParams}
             disabled={isSaving}
             className="p-1.5 hover:bg-white/20 rounded flex items-center gap-1 text-xs ml-2 disabled:opacity-50"
             title="保存当前参数到服务器"
           >
             <Save size={16} />
             <span id="save-btn-text">{isSaving ? '保存中...' : '保存'}</span>
           </button>
        </div>
      </div>
    </div>
  );
}

export default function PresentationPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <PresentationContent />
    </Suspense>
  );
}
