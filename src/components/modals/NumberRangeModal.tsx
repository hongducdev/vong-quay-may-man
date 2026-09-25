import React, { useState, useMemo } from 'react'
import { X, Hash, Check } from 'lucide-react'
import { useWheelStore } from '../../store/wheelStore'

interface NumberRangeModalProps {
  isOpen: boolean
  onClose: () => void
}

export const NumberRangeModal: React.FC<NumberRangeModalProps> = ({ isOpen, onClose }) => {
  const setItems = useWheelStore((state) => state.setItems)
  const theme = useWheelStore((state) => state.theme)

  const [fromNum, setFromNum] = useState(1)
  const [toNum, setToNum] = useState(40)
  const [prefix, setPrefix] = useState('Số ')
  const [padZero, setPadZero] = useState(false)

  const generatedNumbers = useMemo(() => {
    const list: string[] = []
    const start = Math.min(fromNum, toNum)
    const end = Math.max(fromNum, toNum)

    // Limit to 200 numbers max to avoid freezing canvas
    const safeEnd = Math.min(end, start + 199)

    for (let i = start; i <= safeEnd; i++) {
      let numStr = String(i)
      if (padZero && i < 10) {
        numStr = `0${i}`
      }
      list.push(`${prefix}${numStr}`.trim())
    }
    return list
  }, [fromNum, toNum, prefix, padZero])

  if (!isOpen) return null

  const applyPreset = (count: number) => {
    setFromNum(1)
    setToNum(count)
  }

  const handleApply = () => {
    if (generatedNumbers.length === 0) return
    setItems(generatedNumbers)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border ${
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
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Quay theo dải số (STT)</h2>
              <p className="text-xs text-slate-400">Tạo danh sách số thứ tự cho lớp học</p>
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
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Chọn nhanh số lượng học sinh:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[30, 35, 40, 45, 50].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => applyPreset(count)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all ${
                    toNum === count && fromNum === 1
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {count} bạn
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Từ số:</label>
              <input
                type="number"
                min={1}
                max={999}
                value={fromNum}
                onChange={(e) => setFromNum(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-center font-bold text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Đến số:</label>
              <input
                type="number"
                min={1}
                max={999}
                value={toNum}
                onChange={(e) => setToNum(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-center font-bold text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tiền tố hiển thị:</label>
              <input
                type="text"
                value={prefix}
                placeholder="Ví dụ: Số "
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 cursor-pointer pb-2 text-xs font-medium text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={padZero}
                  onChange={(e) => setPadZero(e.target.checked)}
                  className="rounded-md border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Thêm số 0 phía trước (01, 02...)</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Xem trước ({generatedNumbers.length} số):
              </span>
            </div>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {generatedNumbers.slice(0, 20).map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-mono"
                  >
                    {item}
                  </span>
                ))}
                {generatedNumbers.length > 20 && (
                  <span className="text-xs px-2 py-1 text-slate-500 font-mono">
                    ... và {generatedNumbers.length - 20} số nữa
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-850 border-slate-800'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={generatedNumbers.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors shadow-lg shadow-blue-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Tạo vòng quay ({generatedNumbers.length} số)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
