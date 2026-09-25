import { useState, useCallback, useEffect, Suspense, lazy } from 'react'
import { Header } from './components/layout/Header'
import { WheelCanvas } from './components/wheel/WheelCanvas'
import { StudentListSidebar } from './components/sidebar/StudentListSidebar'
import { WinnerModal } from './components/modals/WinnerModal'
import { PerfHud } from './components/dev/PerfHud'
import { useWheelStore, type StudentItem } from './store/wheelStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { getProfile, resolveTier } from './utils/perf'
import { checkForAppUpdates, type UpdateInfo } from './utils/updater'
import { AlertCircle, Clock, Sparkles, X } from 'lucide-react'

// Modals are only needed after the user clicks a toolbar button. Loading them
// on demand keeps SheetJS (the biggest dependency by far) out of the startup
// bundle, which is what makes first launch feel instant on a slow machine.
const ImportExcelModal = lazy(() =>
  import('./components/modals/ImportExcelModal').then((m) => ({ default: m.ImportExcelModal }))
)
const NumberRangeModal = lazy(() =>
  import('./components/modals/NumberRangeModal').then((m) => ({ default: m.NumberRangeModal }))
)
const ManualInputModal = lazy(() =>
  import('./components/modals/ManualInputModal').then((m) => ({ default: m.ManualInputModal }))
)
const SettingsModal = lazy(() =>
  import('./components/modals/SettingsModal').then((m) => ({ default: m.SettingsModal }))
)
const UpdateModal = lazy(() =>
  import('./components/modals/UpdateModal').then((m) => ({ default: m.UpdateModal }))
)

export function App() {
  const availableItems = useWheelStore((state) => state.availableItems)
  const items = useWheelStore((state) => state.items)
  const isSpinning = useWheelStore((state) => state.isSpinning)
  const setIsSpinning = useWheelStore((state) => state.setIsSpinning)
  const recordWinner = useWheelStore((state) => state.recordWinner)
  const spinDuration = useWheelStore((state) => state.spinDuration)
  const showWinnerModal = useWheelStore((state) => state.showWinnerModal)
  const setShowWinnerModal = useWheelStore((state) => state.setShowWinnerModal)
  const theme = useWheelStore((state) => state.theme)
  const qualityMode = useWheelStore((state) => state.qualityMode)
  const autoTierCap = useWheelStore((state) => state.autoTierCap)

  // backdrop-filter forces a full-viewport composite on every frame. It is a
  // nice touch on a real GPU and a measurable cost on a software rasterizer,
  // so it follows the quality profile.
  const profile = getProfile(resolveTier(qualityMode, autoTierCap))

  // Modals state
  const [isExcelOpen, setIsExcelOpen] = useState(false)
  const [isRangeOpen, setIsRangeOpen] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  // Unobtrusive background update check after app startup
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const upd = await checkForAppUpdates()
        if (upd && upd.available) {
          setUpdateInfo(upd)
          setShowUpdateBanner(true)
        }
      } catch {
        // Silently ignore network failures on startup
      }
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [])

  // Spin trigger handler
  const handleTriggerSpin = useCallback(() => {
    if (isSpinning || availableItems.length === 0 || showWinnerModal) return
    setIsSpinning(true)
  }, [isSpinning, availableItems.length, showWinnerModal, setIsSpinning])

  // Wheel finish callback
  const handleSpinEnd = useCallback(
    (winner: StudentItem) => {
      setIsSpinning(false)
      recordWinner(winner)
    },
    [setIsSpinning, recordWinner]
  )

  // Keyboard shortcuts (Spacebar to spin, Esc to close modals)
  useKeyboardShortcuts({
    onSpinTrigger: handleTriggerSpin,
    onCloseModals: () => {
      if (showWinnerModal) setShowWinnerModal(false)
      setIsExcelOpen(false)
      setIsRangeOpen(false)
      setIsManualOpen(false)
      setIsSettingsOpen(false)
    },
  })

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
        theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Header */}
      <Header
        onOpenExcelModal={() => setIsExcelOpen(true)}
        onOpenRangeModal={() => setIsRangeOpen(true)}
        onOpenManualModal={() => setIsManualOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Floating Update Banner if a new version is found on startup */}
      {showUpdateBanner && updateInfo && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-emerald-600 text-white rounded-full shadow-xl border border-emerald-400 text-xs font-semibold animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Đã có phiên bản mới <strong>v{updateInfo.version}</strong>!</span>
          <button
            type="button"
            onClick={() => {
              setShowUpdateBanner(false)
              setIsUpdateOpen(true)
            }}
            className="px-3 py-1 bg-white text-emerald-800 rounded-full font-bold hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            Cập nhật ngay
          </button>
          <button
            type="button"
            onClick={() => setShowUpdateBanner(false)}
            className="p-1 hover:bg-emerald-700 rounded-full text-emerald-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Center: Wheel Arena */}
        <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-5 overflow-hidden relative">
          {/* Top Info Bar inside arena */}
          <div
            className={`w-full flex items-center justify-between max-w-xl px-4 py-2 rounded-2xl text-xs border transition-colors ${
              profile.backdropBlur ? 'backdrop-blur-xs' : ''
            } ${
              theme === 'light'
                ? 'bg-white/95 border-slate-200 text-slate-700 shadow-xs'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Còn lại:{' '}
                <strong
                  className={`font-bold text-sm ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`}
                >
                  {availableItems.length}
                </strong>{' '}
                / {items.length} học sinh
              </span>
            </div>

            {/* Spin duration indicator (clickable to edit) */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Nhấp để thay đổi thời gian quay"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-[11px] ${
                theme === 'light'
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-amber-400'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80 hover:border-amber-500/50'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>Quay:</span>
              <strong
                className={`font-bold ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`}
              >
                {Math.round(spinDuration / 1000)}s
              </strong>
            </button>

            <div
              className={`hidden sm:flex items-center gap-1.5 font-mono text-[11px] ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <kbd
                className={`px-2 py-0.5 rounded-md border font-bold ${
                  theme === 'light'
                    ? 'bg-slate-100 border-slate-300 text-amber-700'
                    : 'bg-slate-800 border-slate-700 text-amber-300'
                }`}
              >
                Space
              </kbd>
              <span>hoặc Nhấp vòng quay</span>
            </div>
          </div>

          {/* Wheel Canvas Container */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
            {availableItems.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center text-center p-8 border rounded-3xl max-w-md space-y-4 shadow-sm ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-slate-900/50 border-slate-800 text-slate-200'
                }`}
              >
                <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <div>
                  <h3
                    className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}
                  >
                    Vòng quay đang trống
                  </h3>
                  <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Tất cả học sinh đã được gọi, hoặc chưa có danh sách. Hãy nhấn "Nhập Excel", "Quay Số", hoặc "Khôi phục".
                  </p>
                </div>
              </div>
            ) : (
              <WheelCanvas
                items={availableItems}
                isSpinning={isSpinning}
                onSpinStart={() => setIsSpinning(true)}
                onSpinEnd={handleSpinEnd}
                spinDuration={spinDuration}
              />
            )}
          </div>
        </main>

        {/* Right: Sidebar */}
        {isSidebarOpen && <StudentListSidebar />}
      </div>

      {/* Modals */}
      <WinnerModal />
      <Suspense fallback={null}>
        {isExcelOpen && <ImportExcelModal isOpen onClose={() => setIsExcelOpen(false)} />}
        {isRangeOpen && <NumberRangeModal isOpen onClose={() => setIsRangeOpen(false)} />}
        {isManualOpen && <ManualInputModal isOpen onClose={() => setIsManualOpen(false)} />}
        {isSettingsOpen && (
          <SettingsModal
            isOpen
            onClose={() => setIsSettingsOpen(false)}
            onUpdateAvailable={(upd) => {
              setUpdateInfo(upd)
              setIsUpdateOpen(true)
            }}
          />
        )}
        {isUpdateOpen && (
          <UpdateModal
            isOpen
            updateInfo={updateInfo}
            onClose={() => setIsUpdateOpen(false)}
          />
        )}
      </Suspense>

      {/* Optional FPS/quality readout for diagnosing weak machines */}
      <PerfHud />
    </div>
  )
}

export default App
