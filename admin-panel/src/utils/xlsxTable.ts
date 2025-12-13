import * as XLSX from 'xlsx'

export type XlsxTable = {
  headers: string[]
  rows: Array<Record<string, unknown>>
}

const toHeader = (value: unknown) => String(value ?? '').trim()

export const readFirstSheetAsTable = async (file: File): Promise<XlsxTable> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName)
    return { headers: [], rows: [] }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })

  const headerRow = (matrix[0] ?? []).map(toHeader).filter(Boolean)
  if (!headerRow.length)
    return { headers: [], rows: [] }

  const rows: Array<Record<string, unknown>> = []
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] ?? []
    const record: Record<string, unknown> = {}
    let hasAnyValue = false
    headerRow.forEach((header, colIndex) => {
      const cell = (line as any[])[colIndex]
      const value = typeof cell === 'string' ? cell.trim() : cell
      if (value !== '' && value != null)
        hasAnyValue = true
      record[header] = value
    })
    if (hasAnyValue)
      rows.push(record)
  }

  return { headers: headerRow, rows }
}

