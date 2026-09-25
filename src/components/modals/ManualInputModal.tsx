import React, { useState, useEffect } from 'react'
import { X, Edit3, Check, Trash2 } from 'lucide-react'
import { useWheelStore } from '../../store/wheelStore'

interface ManualInputModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({ isOpen, onClose }) => {
  const items = useWheelStore((state) => state.items)
  const setItems = useWheelStore((state) => state.setItems)
  const theme = useWheelStore((state) => state.theme)

  const [text, setText] = useState('')

  useEffect(() => {
    if (isOpen) {
      setText(items.map((i) => i.name).join('\n'))
    }
  }, [isOpen, items])

  if (!isOpen) return null

  const cleanedItems = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const handleSave = () => {
    if (cleanedItems.length === 0) return
    setItems(cleanedItems)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${
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
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nhập / Dán danh sách học sinh</h2>
              <p className="text-xs text-slate-400">Mỗi học sinh trên một dòng riêng biệt</p>
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
        <div className="p-6 space-y-3 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Danh sách tên ({cleanedItems.length} học sinh):
            </span>
            <button
              type="button"
              onClick={() => setText('')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa hết</span>
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Nguyễn Văn An\nTrần Thị Bình\nLê Hoàng Cường...`}
            rows={12}
            className={`w-full flex-1 rounded-xl p-3.5 text-sm font-mono focus:outline-hidden resize-none leading-relaxed border ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500'
                : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-purple-500'
            }`}
          />
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
            onClick={handleSave}
            disabled={cleanedItems.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors shadow-lg shadow-purple-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Lưu danh sách ({cleanedItems.length})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
