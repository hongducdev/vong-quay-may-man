import type { WinnerRecord } from '../store/wheelStore'

/**
 * SheetJS is by far the largest dependency in the bundle and is only ever needed
 * once the user actually imports/exports a spreadsheet. Loading it dynamically
 * keeps it out of the startup path, which matters most on the low-spec machines
 * this app targets.
 */
type XlsxModule = typeof import('xlsx')
let xlsxPromise: Promise<XlsxModule> | null = null
function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxPromise) xlsxPromise = import('xlsx')
  return xlsxPromise
}

export interface ParsedSheetData {
  sheetName: string
  headers: string[]
  rows: (string | number)[][]
  detectedColIndex: number
  pairedColIndex: number // Adjacent column for first name (Tên) if split, -1 if single
  headerRowIndex: number
  firstDataRowIndex: number
}

export interface ParsedExcelResult {
  sheetNames: string[]
  sheets: Record<string, ParsedSheetData>
  activeSheetName: string
}

const NAME_KEYWORDS = [
  'họ và tên',
  'họ tên',
  'họ và tên học sinh',
  'họ tên học sinh',
  'tên học sinh',
  'họ đệm và tên',
  'họ đệm',
  'họ và đệm',
  'họ',
  'tên',
  'name',
  'full name',
  'student',
  'student name',
]

const FOOTER_KEYWORDS = [
  'thống kê',
  'tổng số',
  'số học sinh đạt',
  'số lượng - tỉ lệ',
  'số lượng',
  'ghi chú',
  'xác nhận',
  'giáo viên',
  'người lập',
]

export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheets: Record<string, ParsedSheetData> = {}

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const merges = worksheet['!merges'] || []

    // Get 2D raw array of cells
    // SAFETY: XLSX.utils.sheet_to_json with header: 1 returns (string | number)[][]
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as (string | number)[][]

    if (rawRows.length === 0) {
      sheets[sheetName] = {
        sheetName,
        headers: [],
        rows: [],
        detectedColIndex: -1,
        pairedColIndex: -1,
        headerRowIndex: -1,
        firstDataRowIndex: 0,
      }
      continue
    }

    // 1. Detect header row (first 10 rows)
    let bestHeaderRow = 0
    let bestColIndex = -1
    let pairedColIndex = -1
    let foundKeyword = false

    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r]
      for (let c = 0; c < row.length; c++) {
        const cellVal = String(row[c] || '').trim().toLowerCase()
        if (
          cellVal === 'họ và tên' ||
          cellVal === 'họ tên' ||
          cellVal === 'họ và tên học sinh' ||
          cellVal === 'họ tên học sinh' ||
          cellVal === 'họ đệm' ||
          cellVal === 'họ và đệm'
        ) {
          bestHeaderRow = r
          bestColIndex = c
          foundKeyword = true

          // Check if this cell is merged horizontally with the next column (Họ đệm + Tên)
          const merge = merges.find(
            (m) => m.s.r <= r && m.e.r >= r && m.s.c === c && m.e.c > c
          )
          if (merge) {
            pairedColIndex = merge.e.c
          } else if (c + 1 < row.length) {
            // Check if next column header or subheader is "Tên" or empty
            const nextHeader = String(row[c + 1] || '').trim().toLowerCase()
            const subHeader = (rawRows[r + 1] && String(rawRows[r + 1][c + 1] || '').trim().toLowerCase()) || ''
            if (nextHeader === 'tên' || subHeader === 'tên' || nextHeader === '') {
              pairedColIndex = c + 1
            }
          }
          break
        }
      }
      if (foundKeyword) break
    }

    // Fallback: search for any column matching "name" or heuristic
    if (bestColIndex === -1) {
      for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
        const row = rawRows[r]
        for (let c = 0; c < row.length; c++) {
          const cellVal = String(row[c] || '').trim().toLowerCase()
          if (NAME_KEYWORDS.some((kw) => cellVal === kw || cellVal.includes(kw))) {
            bestHeaderRow = r
            bestColIndex = c
            foundKeyword = true
            break
          }
        }
        if (foundKeyword) break
      }
    }

    // Second fallback: Inspect data rows to find the column with strings that look like names
    if (bestColIndex === -1) {
      let maxNameScore = -1
      const colScores: Record<number, number> = {}

      for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
        const row = rawRows[r]
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim()
          if (val.length >= 4 && val.includes(' ') && Number.isNaN(Number(val))) {
            colScores[c] = (colScores[c] || 0) + 1
          }
        }
      }

      for (const [colStr, score] of Object.entries(colScores)) {
        if (score > maxNameScore) {
          maxNameScore = score
          bestColIndex = Number(colStr)
        }
      }

      if (bestColIndex === -1 && rawRows[0] && rawRows[0].length > 0) {
        bestColIndex = Math.min(1, rawRows[0].length - 1)
      }
    }

    // 2. Find the first row where student data actually begins
    let firstDataRow = Math.max(1, bestHeaderRow + 1)
    for (let r = bestHeaderRow + 1; r < Math.min(rawRows.length, bestHeaderRow + 6); r++) {
      const cellVal = String(rawRows[r]?.[bestColIndex] || '').trim()
      // If cellVal has text and is not a subheader like TX1, GK1, etc.
      if (cellVal.length > 0 && !['tx1', 'tx2', 'tx3', 'tx4', 'gk1', 'ck1'].includes(cellVal.toLowerCase())) {
        firstDataRow = r
        break
      }
    }

    // If paired column not determined by header, check if next column has single-word names
    if (pairedColIndex === -1 && bestColIndex + 1 < (rawRows[firstDataRow]?.length || 0)) {
      let singleWordCount = 0
      const nextCol = bestColIndex + 1
      for (let r = firstDataRow; r < Math.min(rawRows.length, firstDataRow + 10); r++) {
        const valA = String(rawRows[r]?.[bestColIndex] || '').trim()
        const valB = String(rawRows[r]?.[nextCol] || '').trim()
        if (valA.length > 2 && valB.length >= 1 && !valB.includes(' ') && Number.isNaN(Number(valB))) {
          singleWordCount++
        }
      }
      if (singleWordCount >= 3) {
        pairedColIndex = nextCol
      }
    }

    // Format display headers
    const headers = (rawRows[bestHeaderRow] || []).map((h, i) => {
      const trimmed = String(h).trim()
      if (i === bestColIndex && pairedColIndex === i + 1) {
        return trimmed ? `${trimmed} (Họ đệm + Tên)` : `Họ và tên (Cột ${String.fromCharCode(65 + i)} + ${String.fromCharCode(65 + i + 1)})`
      }
      return trimmed || `Cột ${String.fromCharCode(65 + i)}`
    })

    sheets[sheetName] = {
      sheetName,
      headers,
      rows: rawRows,
      detectedColIndex: Math.max(0, bestColIndex),
      pairedColIndex,
      headerRowIndex: bestHeaderRow,
      firstDataRowIndex: firstDataRow,
    }
  }

  return {
    sheetNames: workbook.SheetNames,
    sheets,
    activeSheetName: workbook.SheetNames[0] || '',
  }
}

export function extractNamesFromSheet(
  sheetData: ParsedSheetData,
  colIndex: number,
  startRow: number,
  combineWithNextCol: boolean = true
): string[] {
  const result: string[] = []
  const { rows, pairedColIndex } = sheetData
  const shouldCombine = combineWithNextCol && pairedColIndex !== undefined && pairedColIndex >= 0

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue

    // 1. Check for footer/summary markers to stop reading
    const firstCell = String(row[0] || '').trim().toLowerCase()
    const colACell = String(row[colIndex] || '').trim().toLowerCase()

    if (
      FOOTER_KEYWORDS.some((kw) => firstCell.includes(kw) || colACell.includes(kw))
    ) {
      break // Finished student list!
    }

    const valA = String(row[colIndex] || '').trim()
    const valB = shouldCombine ? String(row[pairedColIndex] || '').trim() : ''

    // If both empty or valA is empty (in split tables, summary rows like "Tốt", "Khá" have empty valA)
    if (!valA) continue

    // Filter out keywords or numbers
    if (NAME_KEYWORDS.some((kw) => valA.toLowerCase() === kw)) continue
    if (!Number.isNaN(Number(valA)) && valA.length <= 4) continue

    const fullName = valB && valB !== valA ? `${valA} ${valB}`.trim() : valA
    if (fullName) {
      result.push(fullName)
    }
  }

  return result
}

// Download list as text file
export function exportToTextFile(items: string[], filename: string = 'danh-sach-hoc-sinh.txt') {
  const content = items.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Download session results as Excel file
export async function exportResultsToExcel(
  allItems: string[],
  winners: WinnerRecord[],
  filename: string = 'ket-qua-quay-thuong.xlsx'
) {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()

  // 1. Winners sheet
  const winnersData = winners.map((w, index) => ({
    STT: index + 1,
    'Họ và tên': w.name,
    'Thời gian gọi': new Date(w.timestamp).toLocaleTimeString('vi-VN'),
  }))
  const wsWinners = XLSX.utils.json_to_sheet(winnersData)
  XLSX.utils.book_append_sheet(wb, wsWinners, 'Đã Gọi')

  // 2. All students sheet
  const allData = allItems.map((name, index) => ({
    STT: index + 1,
    'Họ và tên': name,
    'Trạng thái': winners.some((w) => w.name === name) ? 'Đã gọi' : 'Chưa gọi',
  }))
  const wsAll = XLSX.utils.json_to_sheet(allData)
  XLSX.utils.book_append_sheet(wb, wsAll, 'Toàn Bộ Lớp')

  XLSX.writeFile(wb, filename)
}
