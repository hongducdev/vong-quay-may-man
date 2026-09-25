import React, { useState } from 'react'
import { X, Sparkles, Download, AlertCircle, RefreshCw } from 'lucide-react'
import { installAppUpdate, type UpdateInfo } from '../../utils/updater'
import { useWheelStore } from '../../store/wheelStore'

interface UpdateModalProps {
  isOpen: boolean
  updateInfo: UpdateInfo | null
  onClose: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, updateInfo, onClose }) => {
  const theme = useWheelStore((state) => state.theme)
  const [isUpdating, setIsUpdating] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !updateInfo) return null

  const handleStartUpdate = async () => {
    setIsUpdating(true)
    setError(null)
    setProgressPercent(0)
    setStatusText('Đang kết nối...')

    try {
      await installAppUpdate((percent, status) => {
        setProgressPercent(percent)
        setStatusText(status)
      })
    } catch (err: unknown) {
      setIsUpdating(false)
      const message = err instanceof Error ? err.message : String(err)
      setError(`Không thể cập nhật: ${message}. Vui lòng thử lại sau.`)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border ${
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
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Đã có bản cập nhật mới!</h2>
              <p className="text-xs text-slate-400">
                Phiên bản: <strong className="text-emerald-500 font-bold">v{updateInfo.version}</strong> (Hiện tại: v{updateInfo.currentVersion})
              </p>
            </div>
          </div>
          {!isUpdating && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {updateInfo.body ? (
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Nội dung cập nhật:</span>
              <div
                className={`text-xs p-3 rounded-xl border max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                {updateInfo.body}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Bản cập nhật bao gồm các cải tiến về độ mượt, tối ưu hiệu năng và sửa lỗi ổn định.
            </p>
          )}

          {/* Progress bar when downloading */}
          {isUpdating && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{statusText}</span>
                <span className="font-mono font-bold text-emerald-500">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-850 border-slate-800'
          }`}
        >
          {!isUpdating ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleStartUpdate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Cập nhật ngay</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Vui lòng không tắt ứng dụng khi đang cài đặt...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
