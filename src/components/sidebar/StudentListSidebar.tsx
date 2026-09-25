import React, { useState } from 'react'
import {
  Users,
  Award,
  Search,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Plus,
} from 'lucide-react'
import { useWheelStore } from '../../store/wheelStore'
import { exportResultsToExcel, exportToTextFile } from '../../utils/excel'

export const StudentListSidebar: React.FC = () => {
  const items = useWheelStore((state) => state.items)
  const availableItems = useWheelStore((state) => state.availableItems)
  const winners = useWheelStore((state) => state.winners)
  const removeStudent = useWheelStore((state) => state.removeStudent)
  const addStudent = useWheelStore((state) => state.addStudent)
  const resetAvailableToMaster = useWheelStore((state) => state.resetAvailableToMaster)
  const isSpinning = useWheelStore((state) => state.isSpinning)
  const theme = useWheelStore((state) => state.theme)

  const [activeTab, setActiveTab] = useState<'available' | 'winners' | 'all'>('available')
  const [searchQuery, setSearchQuery] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)

  // Filter students
  const filteredAvailable = availableItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredWinners = winners.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredAll = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentName.trim()) return
    addStudent(newStudentName)
    setNewStudentName('')
    setShowAddInput(false)
  }

  const handleExportExcel = async () => {
    try {
      await exportResultsToExcel(
        items.map((i) => i.name),
        winners,
        `ket-qua-quay-thuong-${Date.now()}.xlsx`
      )
    } catch {
      // SheetJS loads on demand; a failure here only affects the export.
    }
  }

  const handleExportText = () => {
    exportToTextFile(
      items.map((i) => i.name),
      `danh-sach-hoc-sinh-${Date.now()}.txt`
    )
  }

  return (
    <aside
      className={`w-76 sm:w-80 md:w-84 flex flex-col h-full shrink-0 border-l transition-colors duration-200 animate-in slide-in-from-right ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Sidebar Header & Tabs */}
      <div
        className={`p-3.5 border-b space-y-3 ${
          theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-850/60 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-2 font-bold text-sm ${
              theme === 'light' ? 'text-slate-800' : 'text-slate-200'
            }`}
          >
            <Users className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
            <span>Danh Sách Lớp ({items.length})</span>
          </div>

          {/* Quick export dropdown / buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportExcel}
              title="Xuất file Excel kết quả"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'hover:bg-slate-200 text-emerald-600 hover:text-emerald-700'
                  : 'hover:bg-slate-750 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportText}
              title="Xuất file Text danh sách"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'hover:bg-slate-200 text-blue-600 hover:text-blue-700'
                  : 'hover:bg-slate-750 text-blue-400 hover:text-blue-300'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={resetAvailableToMaster}
              disabled={isSpinning || availableItems.length === items.length}
              title="Khôi phục toàn bộ danh sách lên vòng quay"
              className={`p-1.5 disabled:opacity-40 rounded-lg transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'hover:bg-slate-200 text-amber-600 hover:text-amber-700'
                  : 'hover:bg-slate-750 text-amber-400 hover:text-amber-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`grid grid-cols-3 gap-1 p-1 rounded-xl border text-xs font-semibold ${
            theme === 'light'
              ? 'bg-slate-100 border-slate-200 text-slate-600'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}
        >
          <button
            onClick={() => setActiveTab('available')}
            className={`py-1.5 px-2 rounded-lg transition-all ${
              activeTab === 'available'
                ? theme === 'light'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'hover:text-slate-800'
            }`}
          >
            Chưa gọi ({availableItems.length})
          </button>
          <button
            onClick={() => setActiveTab('winners')}
            className={`py-1.5 px-2 rounded-lg transition-all ${
              activeTab === 'winners'
                ? theme === 'light'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'hover:text-slate-800'
            }`}
          >
            Đã gọi ({winners.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-1.5 px-2 rounded-lg transition-all ${
              activeTab === 'all'
                ? theme === 'light'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-blue-500 text-white font-bold shadow-xs'
                : 'hover:text-slate-800'
            }`}
          >
            Tất cả ({items.length})
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm học sinh..."
            className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-hidden transition-colors ${
              theme === 'light'
                ? 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-amber-500'
                : 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-amber-500'
            }`}
          />
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {/* Tab 1: Available on wheel */}
        {activeTab === 'available' && (
          <>
            {filteredAvailable.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                <p>
                  {items.length === 0
                    ? 'Chưa có học sinh nào. Hãy nhập file Excel hoặc số lượng.'
                    : 'Đã gọi hết học sinh! Nhấn nút Khôi phục để quay lại từ đầu.'}
                </p>
                {items.length > 0 && (
                  <button
                    onClick={resetAvailableToMaster}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục vòng quay</span>
                  </button>
                )}
              </div>
            ) : (
              filteredAvailable.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 border rounded-xl transition-colors group ${
                    theme === 'light'
                      ? 'bg-slate-50/90 hover:bg-slate-100 border-slate-200/90'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-6 text-right font-mono text-xs font-bold shrink-0 ${
                        theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}.
                    </span>
                    <span
                      className={`font-semibold text-sm truncate ${
                        theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeStudent(item.id)}
                    disabled={isSpinning}
                    title="Xóa bạn này khỏi danh sách"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-md transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {/* Tab 2: Winners */}
        {activeTab === 'winners' && (
          <>
            {filteredWinners.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 space-y-1">
                <Award className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                <p>Chưa có học sinh nào được gọi trong phiên này</p>
              </div>
            ) : (
              filteredWinners.map((record, idx) => (
                <div
                  key={record.id}
                  className={`flex items-center justify-between px-3 py-2.5 border rounded-xl ${
                    theme === 'light'
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-emerald-950/20 border-emerald-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-6 font-bold font-mono text-xs shrink-0 text-right ${
                        theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <p
                        className={`font-bold text-sm truncate ${
                          theme === 'light' ? 'text-emerald-800' : 'text-emerald-300'
                        }`}
                      >
                        {record.name}
                      </p>
                      <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(record.timestamp).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Tab 3: All Students */}
        {activeTab === 'all' && (
          <>
            {filteredAll.map((item, idx) => {
              const isCalled = winners.some((w) => w.studentId === item.id)
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 border rounded-xl group ${
                    theme === 'light'
                      ? 'bg-slate-50/90 border-slate-200/90'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-6 text-right font-mono text-xs font-bold shrink-0 ${
                        theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}.
                    </span>
                    <span
                      className={`font-semibold text-sm truncate ${
                        theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      isCalled
                        ? theme === 'light'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : theme === 'light'
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCalled ? 'Đã gọi' : 'Chưa'}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Quick Add Student at Bottom */}
      <div
        className={`p-3 border-t ${
          theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-850/80'
        }`}
      >
        {showAddInput ? (
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Nhập tên học sinh..."
              className={`flex-1 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden ${
                theme === 'light'
                  ? 'bg-white border border-slate-300 text-slate-800 focus:border-amber-500'
                  : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-500'
              }`}
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={() => setShowAddInput(false)}
              className={`px-2 py-1.5 text-xs rounded-xl cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              Hủy
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed text-xs font-medium transition-colors cursor-pointer ${
              theme === 'light'
                ? 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm một học sinh</span>
          </button>
        )}
      </div>
    </aside>
  )
}
