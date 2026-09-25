import React, { useState } from 'react'
import { X, Settings, Volume2, VolumeX, Clock, RotateCcw, Type, Gauge, Eye, EyeOff, RefreshCw, Sparkles, CheckCircle2, DownloadCloud } from 'lucide-react'
import { useWheelStore } from '../../store/wheelStore'
import { TIER_LABELS, detectTier, resolveTier, type QualityMode } from '../../utils/perf'
import { checkForAppUpdates, type UpdateInfo } from '../../utils/updater'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdateAvailable?: (update: UpdateInfo) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onUpdateAvailable }) => {
  const title = useWheelStore((state) => state.title)
  const setTitle = useWheelStore((state) => state.setTitle)
  const spinDuration = useWheelStore((state) => state.spinDuration)
  const setSpinDuration = useWheelStore((state) => state.setSpinDuration)
  const soundMuted = useWheelStore((state) => state.soundMuted)
  const setSoundMuted = useWheelStore((state) => state.setSoundMuted)
  const resetAvailableToMaster = useWheelStore((state) => state.resetAvailableToMaster)
  const clearWinnersHistory = useWheelStore((state) => state.clearWinnersHistory)
  const theme = useWheelStore((state) => state.theme)
  const setTheme = useWheelStore((state) => state.setTheme)
  const qualityMode = useWheelStore((state) => state.qualityMode)
  const setQualityMode = useWheelStore((state) => state.setQualityMode)
  const autoTierCap = useWheelStore((state) => state.autoTierCap)
  const setShowPerfHud = useWheelStore((state) => state.setShowPerfHud)
  const showPerfHud = useWheelStore((state) => state.showPerfHud)

  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'latest' | 'found' | 'error'>('idle')
  const [foundUpdate, setFoundUpdate] = useState<UpdateInfo | null>(null)

  if (!isOpen) return null

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateStatus('idle')
    try {
      const update = await checkForAppUpdates()
      if (update && update.available) {
        setFoundUpdate(update)
        setUpdateStatus('found')
      } else {
        setUpdateStatus('latest')
      }
    } catch {
      setUpdateStatus('error')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const detectedTier = detectTier()
  const activeTier = resolveTier(qualityMode, autoTierCap)

  const qualityOptions: { value: QualityMode; label: string; hint: string }[] = [
    { value: 'auto', label: 'Tự động', hint: 'Tự nhận biết cấu hình máy' },
    { value: 'high', label: 'Cao', hint: TIER_LABELS.high },
    { value: 'medium', label: 'Trung bình', hint: TIER_LABELS.medium },
    { value: 'low', label: 'Thấp / Siêu nhẹ', hint: TIER_LABELS.low },
  ]

  const durationSeconds = Math.round(spinDuration / 1000)

  const durationPresets = [
    { label: '5s (Nhanh)', seconds: 5 },
    { label: '10s (Vừa)', seconds: 10 },
    { label: '15s (Mặc định)', seconds: 15 },
    { label: '20s (Kịch tính)', seconds: 20 },
    { label: '30s (Hồi hộp)', seconds: 30 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-850 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-amber-400 rounded-xl border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cài đặt vòng quay</h2>
              <p className="text-xs text-slate-400">Tùy chỉnh thời gian, âm thanh và hiệu năng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Title setting */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Type className="w-4 h-4 text-amber-400" />
              <span>Tiêu đề hiển thị trên màn chiếu:</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-amber-500"
              placeholder="VD: Lớp 12A1 - Vòng Quay Gọi Tên"
            />
          </div>

          {/* Duration setting */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Thời gian quay mỗi lượt:</span>
              </label>
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={durationSeconds}
                  onChange={(e) =>
                    setSpinDuration(Math.max(3, Math.min(60, Number(e.target.value) || 15)) * 1000)
                  }
                  className="w-12 bg-transparent text-sm font-bold text-center text-amber-400 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400 font-medium">giây</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={3}
              max={45}
              step={1}
              value={durationSeconds}
              onChange={(e) => setSpinDuration(Number(e.target.value) * 1000)}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />

            {/* Presets */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {durationPresets.map((opt) => (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => setSpinDuration(opt.seconds * 1000)}
                  className={`py-1.5 px-1 text-[11px] font-semibold rounded-lg border transition-all ${
                    durationSeconds === opt.seconds
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound toggle */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>Âm thanh vòng quay (Offline):</span>
            </label>
            <button
              type="button"
              onClick={() => setSoundMuted(!soundMuted)}
              className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
                soundMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : theme === 'light'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span>{soundMuted ? 'Đang tắt âm thanh' : 'Đang bật âm thanh (Tíc-tắc & Chúc mừng)'}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                {soundMuted ? 'BẬT' : 'TẮT'}
              </span>
            </button>
          </div>

          {/* Theme selector */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <span>Giao diện màu nền hiển thị:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  theme === 'light'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                ☀ Nền trắng (Mặc định)
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                🌙 Nền tối
              </button>
            </div>
          </div>

          {/* Performance / graphics quality */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Gauge className="w-4 h-4 text-violet-400" />
              <span>Chế độ đồ họa (dành cho máy cấu hình thấp):</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQualityMode(opt.value)}
                  title={opt.hint}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    qualityMode === opt.value
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div
              className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-[11px] ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <span>
                Máy này nhận diện:{' '}
                <strong className="font-bold uppercase">{detectedTier}</strong> · Đang dùng:{' '}
                <strong className="font-bold uppercase text-amber-500">{activeTier}</strong>
                {autoTierCap ? ' (đã tự hạ trong lần chạy trước)' : ''}
              </span>
              {autoTierCap ? (
                <button
                  type="button"
                  onClick={() => setQualityMode(qualityMode)}
                  className="shrink-0 inline-flex items-center gap-1 font-semibold underline decoration-dotted"
                >
                  <RefreshCw className="w-3 h-3" />
                  Thử lại
                </button>
              ) : null}
            </div>

            {/* FPS overlay */}
            <button
              type="button"
              onClick={() => setShowPerfHud(!showPerfHud)}
              className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
                showPerfHud
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                  : theme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {showPerfHud ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>Hiện chỉ số FPS (kiểm tra máy yếu)</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                  theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                }`}
              >
                {showPerfHud ? 'TẮT' : 'BẬT'}
              </span>
            </button>
          </div>

          {/* App Update section */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <DownloadCloud className="w-4 h-4 text-cyan-400" />
              <span>Cập nhật ứng dụng:</span>
            </label>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={checkingUpdate}
                onClick={handleCheckUpdate}
                className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                  checkingUpdate
                    ? 'opacity-70 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-400'
                    : theme === 'light'
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                  <span>{checkingUpdate ? 'Đang kiểm tra từ máy chủ...' : 'Kiểm tra bản cập nhật mới'}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-400">
                  v1.0.0
                </span>
              </button>

              {updateStatus === 'latest' && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Bạn đang sử dụng phiên bản mới nhất!</span>
                </div>
              )}

              {updateStatus === 'found' && foundUpdate && (
                <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>Đã có phiên bản <strong>v{foundUpdate.version}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateAvailable) {
                        onUpdateAvailable(foundUpdate)
                        onClose()
                      }
                    }}
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Xem & Cập nhật
                  </button>
                </div>
              )}

              {updateStatus === 'error' && (
                <p className="text-[11px] text-slate-400 italic">
                  Không thể kết nối máy chủ cập nhật (có thể do đang offline).
                </p>
              )}
            </div>
          </div>

          {/* Reset actions */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => {
                resetAvailableToMaster()
                onClose()
              }}
              className="w-full py-2 px-3 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục toàn bộ học sinh về vòng quay</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearWinnersHistory()
                onClose()
              }}
              className="w-full py-2 px-3 text-xs font-medium text-slate-400 hover:text-rose-300 bg-slate-900 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/40 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>Xóa lịch sử đã gọi trong buổi này</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end px-6 py-4 border-t ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-850 border-slate-800'
          }`}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
