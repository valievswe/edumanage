import * as XLSX from 'xlsx'

export type XlsxTable = {
  headers: string[]
  rows: Array<Record<string, unknown>>
}

const toHeader = (value: unknown) => String(value ?? '').trim()

const splitSmart = (text: string) => {
  // Prefer tabs; fall back to commas if no tabs present.
  const hasTabs = text.includes('\t')
  const delimiter = hasTabs ? '\t' : ','
  return text.split(delimiter).map(part => part.trim())
}

export const parseClipboardTable = (text: string): XlsxTable => {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.length)
  if (!lines.length)
    return { headers: [], rows: [] }

  const headerParts = splitSmart(lines[0])
  const headers = headerParts.map(toHeader).filter(Boolean)
  if (!headers.length)
    return { headers: [], rows: [] }

  const rows: Array<Record<string, unknown>> = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitSmart(lines[i])
    const record: Record<string, unknown> = {}
    let hasValue = false
    headers.forEach((header, idx) => {
      const value = cells[idx] ?? ''
      if (value !== '' && value != null)
        hasValue = true
      record[header] = value
    })
    if (hasValue)
      rows.push(record)
  }

  return { headers, rows }
}

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
