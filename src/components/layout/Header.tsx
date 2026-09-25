import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  FileSpreadsheet,
  Hash,
  Edit3,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2,
  Users,
  Sun,
  Moon,
} from 'lucide-react'
import { useWheelStore } from '../../store/wheelStore'

interface HeaderProps {
  onOpenExcelModal: () => void
  onOpenRangeModal: () => void
  onOpenManualModal: () => void
  onOpenSettingsModal: () => void
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExcelModal,
  onOpenRangeModal,
  onOpenManualModal,
  onOpenSettingsModal,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const title = useWheelStore((state) => state.title)
  const soundMuted = useWheelStore((state) => state.soundMuted)
  const setSoundMuted = useWheelStore((state) => state.setSoundMuted)
  const isSpinning = useWheelStore((state) => state.isSpinning)
  const theme = useWheelStore((state) => state.theme)
  const toggleTheme = useWheelStore((state) => state.toggleTheme)

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <header
      className={`h-16 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 select-none z-20 transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-white border-b border-slate-200 text-slate-850 shadow-xs'
          : 'bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white'
      }`}
    >
      {/* Left: App Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
          <div
            className={`w-full h-full rounded-[10px] flex items-center justify-center ${
              theme === 'light' ? 'bg-amber-50 text-amber-600' : 'bg-slate-950 text-amber-400'
            }`}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div>
          <h1
            className={`text-base sm:text-lg font-black tracking-tight flex items-center gap-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}
          >
            <span>{title || 'Vòng Quay May Mắn'}</span>
          </h1>
          <p className={`text-[11px] hidden sm:block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Quay ngẫu nhiên học sinh • Hoạt động 100% Offline
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Import Excel */}
        <button
          onClick={onOpenExcelModal}
          disabled={isSpinning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
            theme === 'light'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Nhập Excel</span>
        </button>

        {/* Number Range */}
        <button
          onClick={onOpenRangeModal}
          disabled={isSpinning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
            theme === 'light'
              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400'
          }`}
        >
          <Hash className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Quay Số</span>
        </button>

        {/* Manual Input */}
        <button
          onClick={onOpenManualModal}
          disabled={isSpinning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
            theme === 'light'
              ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
              : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400'
          }`}
        >
          <Edit3 className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Dán danh sách</span>
        </button>

        {/* Divider */}
        <div className={`h-5 w-px mx-0.5 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Theme Toggle (Light/Dark) */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền trắng (Mặc định)'}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 shadow-xs'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-yellow-400'
          }`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Mute toggle */}
        <button
          onClick={() => setSoundMuted(!soundMuted)}
          title={soundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            soundMuted
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              : theme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettingsModal}
          title="Cài đặt vòng quay"
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Ẩn danh sách lớp để phóng to vòng quay' : 'Hiện danh sách lớp'}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            isSidebarOpen
              ? theme === 'light'
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : theme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ (F11)' : 'Toàn màn hình máy chiếu (F11)'}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700 shadow-xs'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-amber-400 hover:text-amber-300'
          }`}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}
