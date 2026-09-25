import React from 'react'
import { Trophy, UserMinus, RotateCcw, Sparkles } from 'lucide-react'
import { useWheelStore } from '../../store/wheelStore'

export const WinnerModal: React.FC = () => {
  const latestWinner = useWheelStore((state) => state.latestWinner)
  const showWinnerModal = useWheelStore((state) => state.showWinnerModal)
  const setShowWinnerModal = useWheelStore((state) => state.setShowWinnerModal)
  const removeWinnerFromAvailable = useWheelStore((state) => state.removeWinnerFromAvailable)
  const availableItems = useWheelStore((state) => state.availableItems)
  const theme = useWheelStore((state) => state.theme)

  if (!showWinnerModal || !latestWinner) return null

  const handleRemove = () => {
    removeWinnerFromAvailable(latestWinner.id)
    setShowWinnerModal(false)
  }

  const handleKeep = () => {
    setShowWinnerModal(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6 pt-16 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`relative border-2 w-full max-w-xl rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center gap-5 sm:gap-6 animate-in zoom-in-90 duration-300 ${
          theme === 'light'
            ? 'bg-gradient-to-b from-white to-amber-50/70 border-amber-400 text-slate-850 shadow-[0_0_60px_rgba(245,158,11,0.25)]'
            : 'bg-gradient-to-b from-slate-850 to-slate-900 border-amber-500/50 text-slate-100 shadow-[0_0_60px_rgba(245,158,11,0.3)]'
        }`}
      >
        {/* Trophy cup decoration - perfectly visible without overflow clipping */}
        <div className="-mt-14 sm:-mt-16 p-3.5 sm:p-4 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 rounded-2xl shadow-2xl shadow-amber-500/50 text-slate-950 border-2 border-amber-300">
          <Trophy className="w-10 sm:w-12 h-10 sm:h-12 animate-bounce" />
        </div>

        <div className="pt-6 space-y-1">
          <div
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
              theme === 'light'
                ? 'bg-amber-100/90 border border-amber-300 text-amber-800'
                : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Chúc Mừng Bạn Đã Được Gọi</span>
          </div>
        </div>

        {/* Large Winner Name */}
        <div
          className={`w-full rounded-2xl py-8 px-4 shadow-inner border ${
            theme === 'light'
              ? 'bg-white border-amber-300/80 shadow-amber-100/50'
              : 'bg-slate-950/80 border-amber-500/40'
          }`}
        >
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-wide break-words drop-shadow-md text-transparent bg-clip-text ${
              theme === 'light'
                ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600'
                : 'bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-200'
            }`}
          >
            {latestWinner.name}
          </h1>
        </div>

        <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
          Vòng quay hiện còn{' '}
          <strong className={`font-bold ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>
            {availableItems.length}
          </strong>{' '}
          học sinh. Bạn có muốn loại bạn này khỏi các lượt quay tiếp theo trong buổi học?
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-2">
          <button
            onClick={handleRemove}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm border transition-all cursor-pointer shadow-md active:scale-95 ${
              theme === 'light'
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700 hover:text-rose-800'
                : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-white'
            }`}
          >
            <UserMinus className="w-4 h-4" />
            <span>Loại khỏi vòng quay</span>
          </button>

          <button
            onClick={handleKeep}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Giữ lại quay tiếp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
