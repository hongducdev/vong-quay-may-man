import React from 'react'
import { useStore } from 'zustand'
import { perfMonitor } from '../../utils/perfMonitor'
import { useWheelStore } from '../../store/wheelStore'

/**
 * Small diagnostic overlay (Settings -> "Hiện chỉ số hiệu năng").
 *
 * There is no way to validate "runs smoothly on a weak PC" from a build log, so
 * this gives a teacher (or you, on a test machine) a direct readout of the
 * measured frame rate, the render cost per frame and which quality tier the app
 * settled on.
 */
export const PerfHud: React.FC = () => {
  const show = useWheelStore((state) => state.showPerfHud)
  const sample = useStore(perfMonitor, (state) => state)

  if (!show) return null

  const fpsColor = sample.fps >= 45 ? 'text-emerald-400' : sample.fps >= 25 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className="fixed bottom-3 left-3 z-100 pointer-events-none select-none rounded-lg border border-slate-700/80 bg-slate-950/85 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-300 shadow-lg backdrop-blur-none">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">FPS</span>
        <span className={`font-bold ${fpsColor}`}>{sample.fps || '--'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Vẽ/khung</span>
        <span className="font-bold">{sample.frameMs ? `${sample.frameMs.toFixed(1)} ms` : '--'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Mức</span>
        <span className="font-bold uppercase text-amber-400">{sample.tier}</span>
        {sample.downgraded ? <span className="text-rose-400">(đã tự hạ)</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Đang quay</span>
        <span className="font-bold">{sample.spinning ? 'có' : 'không'}</span>
      </div>
    </div>
  )
}
