import React, { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'
import { parseExcelFile, extractNamesFromSheet, type ParsedExcelResult } from '../../utils/excel'
import { useWheelStore } from '../../store/wheelStore'

interface ImportExcelModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose }) => {
  const setItems = useWheelStore((state) => state.setItems)
  const theme = useWheelStore((state) => state.theme)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedExcelResult | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [selectedColIndex, setSelectedColIndex] = useState<number>(0)
  const [startRowIndex, setStartRowIndex] = useState<number>(1)
  const [combineNames, setCombineNames] = useState<boolean>(true)
  const [extractedNames, setExtractedNames] = useState<string[]>([])

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const processFile = async (file: File) => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await parseExcelFile(file)

      if (data.sheetNames.length === 0) {
        setError('File Excel không có sheet nào.')
        return
      }

      const activeSheet = data.activeSheetName
      const sheetInfo = data.sheets[activeSheet]
      const col = sheetInfo?.detectedColIndex >= 0 ? sheetInfo.detectedColIndex : 0
      const startRow = sheetInfo?.firstDataRowIndex ?? Math.max(1, (sheetInfo?.headerRowIndex ?? 0) + 1)
      const hasPaired = sheetInfo?.pairedColIndex !== undefined && sheetInfo.pairedColIndex >= 0

      setParsedData(data)
      setSelectedSheet(activeSheet)
      setSelectedColIndex(col)
      setStartRowIndex(startRow)
      setCombineNames(hasPaired)

      if (sheetInfo) {
        const names = extractNamesFromSheet(sheetInfo, col, startRow, hasPaired)
        setExtractedNames(names)
      }
    } catch (err) {
      setError('Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName)
    if (!parsedData) return
    const sheetInfo = parsedData.sheets[sheetName]
    if (sheetInfo) {
      const col = sheetInfo.detectedColIndex >= 0 ? sheetInfo.detectedColIndex : 0
      const startRow = sheetInfo.firstDataRowIndex ?? Math.max(1, (sheetInfo.headerRowIndex ?? 0) + 1)
      const hasPaired = sheetInfo.pairedColIndex !== undefined && sheetInfo.pairedColIndex >= 0
      setSelectedColIndex(col)
      setStartRowIndex(startRow)
      setCombineNames(hasPaired)
      setExtractedNames(extractNamesFromSheet(sheetInfo, col, startRow, hasPaired))
    }
  }

  const handleColumnChange = (colIndex: number) => {
    setSelectedColIndex(colIndex)
    if (!parsedData) return
    const sheetInfo = parsedData.sheets[selectedSheet]
    if (sheetInfo) {
      setExtractedNames(extractNamesFromSheet(sheetInfo, colIndex, startRowIndex, combineNames))
    }
  }

  const handleStartRowChange = (row: number) => {
    setStartRowIndex(row)
    if (!parsedData) return
    const sheetInfo = parsedData.sheets[selectedSheet]
    if (sheetInfo) {
      setExtractedNames(extractNamesFromSheet(sheetInfo, selectedColIndex, row, combineNames))
    }
  }

  const handleToggleCombine = (checked: boolean) => {
    setCombineNames(checked)
    if (!parsedData) return
    const sheetInfo = parsedData.sheets[selectedSheet]
    if (sheetInfo) {
      setExtractedNames(extractNamesFromSheet(sheetInfo, selectedColIndex, startRowIndex, checked))
    }
  }

  const handleConfirmImport = () => {
    if (extractedNames.length === 0) {
      setError('Không tìm thấy học sinh nào trong cột đã chọn.')
      return
    }
    setItems(extractedNames)
    onClose()
  }

  const currentSheetInfo = parsedData && selectedSheet ? parsedData.sheets[selectedSheet] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${
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
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nhập danh sách từ Excel</h2>
              <p className="text-xs text-slate-400">Hỗ trợ file .xlsx, .xls, .csv hoàn toàn offline</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* File Upload Zone */}
          {!parsedData && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">
                  Nhấp để chọn file Excel hoặc kéo thả vào đây
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Chỉ đọc trực tiếp trên máy của bạn, không tải lên internet
                </p>
              </div>
              {isLoading && <p className="text-sm text-emerald-400 animate-pulse">Đang phân tích file Excel...</p>}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Configuration after file parse */}
          {parsedData && currentSheetInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Sheet Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Chọn trang tính (Sheet):
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-emerald-500 text-slate-200"
                  >
                    {parsedData.sheetNames.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Column Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Chọn cột chứa Họ và Tên:
                  </label>
                  <select
                    value={selectedColIndex}
                    onChange={(e) => handleColumnChange(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-emerald-500 text-slate-200"
                  >
                    {currentSheetInfo.headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header} {idx === currentSheetInfo.detectedColIndex ? '★ (Gợi ý)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combine Họ đệm + Tên toggle */}
              {currentSheetInfo.pairedColIndex !== undefined && currentSheetInfo.pairedColIndex >= 0 && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={combineNames}
                    onChange={(e) => handleToggleCombine(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span>
                    Tự động gộp 2 cột <strong>Họ đệm</strong> và <strong>Tên</strong> thành Họ và Tên đầy đủ
                  </span>
                </label>
              )}

              {/* Start row configuration */}
              <div className="flex items-center gap-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-xs text-slate-300">Bắt đầu lấy từ dòng số:</span>
                <input
                  type="number"
                  min={1}
                  max={currentSheetInfo.rows.length}
                  value={startRowIndex + 1}
                  onChange={(e) => handleStartRowChange(Math.max(0, Number(e.target.value) - 1))}
                  className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto text-xs text-emerald-400 hover:underline"
                >
                  Chọn file khác
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Preview table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Xem trước kết quả ({extractedNames.length} học sinh):
                  </span>
                  <span className="text-xs text-slate-400">Hiển thị tối đa 8 dòng đầu</span>
                </div>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-2 max-h-48 overflow-y-auto">
                  {extractedNames.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Không có dữ liệu trong cột đã chọn</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {extractedNames.slice(0, 10).map((name, i) => (
                        <div
                          key={i}
                          className="text-xs px-2.5 py-1.5 bg-slate-900/80 rounded-lg border border-slate-800/80 text-slate-200 truncate flex items-center gap-2"
                        >
                          <span className="text-slate-500 w-5 text-right">{i + 1}.</span>
                          <span className="truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {extractedNames.length > 10 && (
                    <p className="text-center text-xs text-slate-400 mt-2">
                      ... và còn {extractedNames.length - 10} học sinh khác
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
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
          {parsedData && (
            <button
              onClick={handleConfirmImport}
              disabled={extractedNames.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Nhập vào vòng quay ({extractedNames.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
