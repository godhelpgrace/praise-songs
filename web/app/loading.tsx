export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-indigo-500">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium animate-pulse">正在加载...</p>
      </div>
    </div>
  );
}
