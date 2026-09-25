import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { soundManager } from '../utils/audio'
import { nextTierDown, resolveTier, type QualityMode, type QualityTier } from '../utils/perf'

export interface StudentItem {
  id: string
  name: string
}

export interface WinnerRecord {
  id: string
  studentId: string
  name: string
  timestamp: number
}

interface WheelState {
  // Student lists (items identified by unique id to support duplicate names)
  items: StudentItem[] // master list
  availableItems: StudentItem[] // current active wheel items
  winners: WinnerRecord[] // history of winners

  // App & Spin state
  isSpinning: boolean
  latestWinner: StudentItem | null
  showWinnerModal: boolean
  soundMuted: boolean
  spinDuration: number // in ms, default 15000 (15 seconds)
  title: string // e.g. "Lớp 12A1 - Vòng Quay Gọi Tên"
  theme: 'light' | 'dark' // default 'light'
  qualityMode: QualityMode // 'auto' | 'high' | 'medium' | 'low'
  autoTierCap: QualityTier | null // sticky result of a runtime performance downgrade
  showPerfHud: boolean // small FPS/quality overlay, for diagnosing weak machines

  // Actions
  setItems: (newNames: string[]) => void
  addStudent: (name: string) => void
  removeStudent: (id: string) => void
  setIsSpinning: (spinning: boolean) => void
  setLatestWinner: (winner: StudentItem | null) => void
  setShowWinnerModal: (show: boolean) => void
  recordWinner: (winner: StudentItem) => void
  removeWinnerFromAvailable: (id: string) => void
  resetAvailableToMaster: () => void
  clearWinnersHistory: () => void
  clearAll: () => void
  setSoundMuted: (muted: boolean) => void
  setSpinDuration: (duration: number) => void
  setTitle: (title: string) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setQualityMode: (mode: QualityMode) => void
  applyAutoDowngrade: () => void
  setShowPerfHud: (show: boolean) => void
}

const DEFAULT_SAMPLE_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Hoàng Cường',
  'Phạm Thị Dung',
  'Hoàng Văn Dũng',
  'Vũ Thị Giang',
  'Đặng Minh Hải',
  'Bùi Thị Hằng',
  'Đỗ Quang Huy',
  'Ngô Thu Hương',
  'Dương Quốc Khánh',
  'Lý Minh Khôi',
  'Mai Phương Linh',
  'Phan Thanh Long',
  'Hồ Bảo Ngọc',
]

function createStudentList(names: string[]): StudentItem[] {
  return names
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `std-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      name,
    }))
}

// Convert any legacy string[] from localStorage to StudentItem[]
function normalizeItem(raw: unknown, index: number): StudentItem {
  if (typeof raw === 'string') {
    return {
      id: `std-migrated-${index}-${Math.random().toString(36).slice(2, 7)}`,
      name: raw,
    }
  }
  if (raw && typeof raw === 'object' && 'name' in raw) {
    const obj = raw as { id?: string; name?: string }
    return {
      id: obj.id || `std-${index}-${Date.now()}`,
      name: String(obj.name || ''),
    }
  }
  return {
    id: `std-${index}-${Date.now()}`,
    name: String(raw || ''),
  }
}

const DEFAULT_ITEMS = createStudentList(DEFAULT_SAMPLE_NAMES)

export const useWheelStore = create<WheelState>()(
  persist(
    (set, get) => ({
      items: DEFAULT_ITEMS,
      availableItems: DEFAULT_ITEMS,
      winners: [],
      isSpinning: false,
      latestWinner: null,
      showWinnerModal: false,
      soundMuted: false,
      spinDuration: 15000,
      title: 'Vòng Quay Gọi Tên Học Sinh',
      theme: 'light', // Default to white background / light theme for classroom visibility
      qualityMode: 'auto',
      autoTierCap: null,
      showPerfHud: false,

      setItems: (newNames: string[]) => {
        const studentList = createStudentList(newNames)
        set({
          items: studentList,
          availableItems: studentList,
          winners: [],
          latestWinner: null,
          showWinnerModal: false,
        })
      },

      addStudent: (name: string) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const newStudent: StudentItem = {
          id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: trimmed,
        }
        const { items, availableItems } = get()
        set({
          items: [...items, newStudent],
          availableItems: [...availableItems, newStudent],
        })
      },

      removeStudent: (id: string) => {
        const { items, availableItems } = get()
        set({
          items: items.filter((item) => item.id !== id),
          availableItems: availableItems.filter((item) => item.id !== id),
        })
      },

      setIsSpinning: (spinning: boolean) => set({ isSpinning: spinning }),

      setLatestWinner: (winner: StudentItem | null) => set({ latestWinner: winner }),

      setShowWinnerModal: (show: boolean) => set({ showWinnerModal: show }),

      recordWinner: (winner: StudentItem) => {
        const newRecord: WinnerRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          studentId: winner.id,
          name: winner.name,
          timestamp: Date.now(),
        }
        set((state) => ({
          isSpinning: false,
          latestWinner: winner,
          showWinnerModal: true,
          winners: [newRecord, ...state.winners],
        }))
      },

      // Crucial: Remove by student ID so identical names are preserved
      removeWinnerFromAvailable: (id: string) => {
        set((state) => ({
          availableItems: state.availableItems.filter((item) => item.id !== id),
        }))
      },

      resetAvailableToMaster: () => {
        set((state) => ({
          availableItems: [...state.items],
        }))
      },

      clearWinnersHistory: () => set({ winners: [] }),

      clearAll: () =>
        set({
          items: [],
          availableItems: [],
          winners: [],
          latestWinner: null,
          showWinnerModal: false,
        }),

      setSoundMuted: (muted: boolean) => {
        soundManager.setMuted(muted)
        set({ soundMuted: muted })
      },

      setSpinDuration: (duration: number) => set({ spinDuration: duration }),

      setTitle: (title: string) => set({ title }),

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      setTheme: (theme: 'light' | 'dark') => set({ theme }),

      setQualityMode: (mode: QualityMode) => set({ qualityMode: mode }),

      /**
       * Called by the render loop when this machine cannot hold the target frame
       * rate. Steps one tier down and remembers it, so the next launch starts at
       * the working tier instead of stuttering again. Never upgrades automatically
       * - silently oscillating between tiers is worse than a slightly conservative one.
       */
      applyAutoDowngrade: () => {
        const { qualityMode, autoTierCap } = get()
        if (qualityMode !== 'auto') return
        const current = resolveTier(qualityMode, autoTierCap)
        if (current === 'low') return
        set({ autoTierCap: nextTierDown(current) })
      },

      setShowPerfHud: (show: boolean) => set({ showPerfHud: show }),
    }),
    {
      name: 'vong-quay-may-man-storage',
      // Only persist configuration and student data, not transient spinning states
      partialize: (state) => ({
        items: state.items,
        availableItems: state.availableItems,
        winners: state.winners,
        soundMuted: state.soundMuted,
        spinDuration: state.spinDuration,
        title: state.title,
        theme: state.theme,
        qualityMode: state.qualityMode,
        autoTierCap: state.autoTierCap,
        showPerfHud: state.showPerfHud,
      }),
      // Normalize any legacy stored data from previous versions
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (Array.isArray(state.items)) {
          state.items = state.items.map(normalizeItem)
        }
        if (Array.isArray(state.availableItems)) {
          state.availableItems = state.availableItems.map(normalizeItem)
        }
      },
    }
  )
)
