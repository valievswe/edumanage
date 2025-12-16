<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '@/utils/api'
import type { Grade, Monitoring, Student, Subject, StudyYear } from '@/utils/types'
import { readFirstSheetAsTable } from '@/utils/xlsxTable'

const monitoring = ref<Monitoring[]>([])
const subjects = ref<Subject[]>([])
const years = ref<StudyYear[]>([])
const grades = ref<Grade[]>([])

const loading = ref(false)
const optionsLoading = ref(false)
const summaryLoading = ref(false)
const errorMessage = ref('')
const summaryError = ref('')
const monitoringSummary = reactive({
  overallAverage: null as number | null,
  totalEntries: 0,
  bySubject: [] as Array<{ subjectId: number; subjectName: string; averageScore: number | null; entries: number }>,
})
const snackbar = reactive({ visible: false, color: 'success', text: '' })
const deletingId = ref<number | null>(null)
const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, '')

// XLSX import (grade-wide, multi-subject for a given month)
const importDialog = ref(false)
const importSubmitting = ref(false)
const importFileName = ref('')
const importErrors = ref<string[]>([])
const importSummary = reactive({ students: 0, subjects: 0, entries: 0 })
const importEntries = ref<
  Array<{ studentId: string; subjectId: number; studyYearId: number; month: string; score: number }>
>([])
const importStudents = ref<Student[]>([])
const importInputEl = ref<HTMLInputElement | null>(null)

const importForm = reactive({
  studyYearId: null as number | null,
  gradeId: null as number | null,
  month: '',
})

const createDialog = ref(false)
const createLoading = ref(false)
const editDialog = ref(false)
const editLoading = ref(false)
const editingEntry = ref<Monitoring | null>(null)

const monthOptionsForYear = (year: StudyYear | undefined | null, current?: string) => {
  if (!year) return [] as Array<{ title: string; value: string }>
  const start = new Date(year.startDate)
  const end = new Date(year.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const options: Array<{ title: string; value: string }> = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (cursor.getTime() <= last.getTime()) {
    const y = cursor.getUTCFullYear()
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    const value = `${y}-${m}`
    options.push({ title: value, value })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  if (current && !options.some(o => o.value === current))
    options.unshift({ title: current, value: current })

  return options
}

const getYearById = (id: number | null) => years.value.find(y => y.id === id) ?? null

const createForm = reactive({
  studentId: '',
  subjectId: null as number | null,
  studyYearId: null as number | null,
  month: '',
  score: 0,
  gradeId: null as number | null,
})

const editForm = reactive({
  subjectId: null as number | null,
  studyYearId: null as number | null,
  month: '',
  score: 0,
})

const filters = reactive({
  search: '',
  gradeId: null as number | null,
  studyYearId: null as number | null,
  month: '',
})

const subjectColumns = computed(() => {
  const unique = new Map<number, Subject>()
  monitoring.value.forEach(entry => {
    if (!unique.has(entry.subject.id)) unique.set(entry.subject.id, entry.subject)
  })
  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
})

type MonitoringTableRow = {
  key: string
  studentId: string
  studyYearId: number
  student: string
  grade: string
  studyYear: string
  month: string
  average: number | null
} & Record<string, number | string | null>

const tableHeaders = computed(() => [
  { title: 'Student', key: 'student' },
  { title: 'Grade', key: 'grade' },
  { title: 'Study year', key: 'studyYear' },
  { title: 'Month', key: 'month' },
  ...subjectColumns.value.map(subject => ({ title: subject.name, key: `subject-${subject.id}` })),
  { title: 'Average', key: 'average' },
])

const monitoringRows = computed<MonitoringTableRow[]>(() => {
  const rows = new Map<
    string,
    {
      key: string
      studentId: string
      studyYearId: number
      student: string
      grade: string
      studyYear: string
      month: string
      scores: Record<number, number>
    }
  >()

  monitoring.value.forEach(entry => {
    const key = `${entry.student.id}-${entry.month}-${entry.studyYear.id}`
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        studentId: entry.student.id,
        studyYearId: entry.studyYear.id,
        student: entry.student.fullName,
        grade: entry.student.grade?.name || '—',
        studyYear: entry.studyYear.name,
        month: entry.month,
        scores: {},
      })
    }
    rows.get(key)!.scores[entry.subject.id] = entry.score
  })

  return Array.from(rows.values()).map(row => {
    const subjectCells: Record<string, number | null> = {}
    subjectColumns.value.forEach(subject => {
      subjectCells[`subject-${subject.id}`] = row.scores[subject.id] ?? null
    })
    const scoreValues = subjectColumns.value
      .map(subject => row.scores[subject.id])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    const average = scoreValues.length
      ? Number((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(1))
      : null

    return {
      key: row.key,
      studentId: row.studentId,
      studyYearId: row.studyYearId,
      student: row.student,
      grade: row.grade,
      studyYear: row.studyYear,
      month: row.month,
      average,
      ...subjectCells,
    }
  })
})

// Quick entry (month+subject for a whole grade)
const quickSelections = reactive({
  studyYearId: null as number | null,
  gradeId: null as number | null,
  subjectIds: [] as number[],
  month: '',
})
const quickScores = reactive<Record<string, Record<number, number | null>>>({})
const quickStudents = ref<Student[]>([])
const quickSubmitting = ref(false)
const quickExisting = ref<Monitoring[]>([])
const quickPasteErrors = ref<string[]>([])
const subjectMap = computed(() => new Map(subjects.value.map(s => [s.id, s])))

const resetQuickScores = () => {
  Object.keys(quickScores).forEach(key => delete quickScores[key])
}

const quickReady = () =>
  Boolean(
    quickSelections.studyYearId &&
    quickSelections.gradeId &&
    quickSelections.subjectIds.length &&
    quickSelections.month,
  )

const scoreEntered = (value: unknown) => value !== null && value !== undefined && value !== ''
const scoreInvalid = (value: unknown) => {
  if (!scoreEntered(value)) return false
  const num = Number(value)
  if (!Number.isFinite(num)) return true
  return num < 0 || num > 100
}

const quickEntryCount = computed(() => {
  let count = 0
  quickStudents.value.forEach(student => {
    quickSelections.subjectIds.forEach(subjectId => {
      if (scoreEntered(quickScores[student.id]?.[subjectId])) count += 1
    })
  })
  return count
})

const quickValidationErrors = computed(() => {
  const errors: string[] = []
  quickStudents.value.forEach((student, rowIdx) => {
    quickSelections.subjectIds.forEach(subjectId => {
      const value = quickScores[student.id]?.[subjectId]
      if (scoreInvalid(value)) {
        const subjectName = subjectMap.value.get(subjectId)?.name || 'Subject'
        errors.push(`Row ${rowIdx + 1} (${student.fullName}) • ${subjectName}: score must be 0-100`)
      }
    })
  })
  return errors
})
const quickHasErrors = computed(() => quickValidationErrors.value.length > 0)

const fetchQuickStudents = async () => {
  if (!quickSelections.studyYearId || !quickSelections.gradeId) {
    quickStudents.value = []
    resetQuickScores()
    return
  }

  const { data } = await api.get<Student[]>('/api/students/options', {
    params: {
      studyYearId: quickSelections.studyYearId,
      gradeId: quickSelections.gradeId,
      limit: 5000,
    },
  })
  quickStudents.value = data
}

const fetchQuickExisting = async () => {
  if (!quickReady()) {
    quickExisting.value = []
    return
  }

  const { data } = await api.get<Monitoring[]>('/api/monitoring', {
    params: {
      studyYearId: quickSelections.studyYearId,
      gradeId: quickSelections.gradeId,
      month: quickSelections.month,
    },
  })
  const selected = new Set(quickSelections.subjectIds)
  quickExisting.value = data.filter(e => selected.has(e.subject.id))
}

const prefillQuickScores = () => {
  resetQuickScores()
  if (!quickReady()) return
  const existingMap = new Map<string, Map<number, number>>()
  quickExisting.value.forEach(entry => {
    if (!existingMap.has(entry.student.id)) existingMap.set(entry.student.id, new Map())
    existingMap.get(entry.student.id)?.set(entry.subject.id, entry.score)
  })
  quickStudents.value.forEach(student => {
    if (!quickScores[student.id]) quickScores[student.id] = {}
    quickSelections.subjectIds.forEach(subjectId => {
      const existing = existingMap.get(student.id)?.get(subjectId)
      quickScores[student.id][subjectId] = existing ?? null
    })
  })
}

const getQuickExistingScore = (studentId: string, subjectId: number) => {
  const found = quickExisting.value.find(e => e.student.id === studentId && e.subject.id === subjectId)
  return found?.score ?? null
}

const onQuickPaste = (event: ClipboardEvent) => {
  if (!quickReady()) return
  const text = event.clipboardData?.getData('text') || ''
  if (!text.trim()) return
  quickPasteErrors.value = []

  const rows = text
    .trim()
    .split(/\r?\n/)
    .map(line => line.split('\t'))
    .filter(r => r.length)

  if (!rows.length) return

  const subjectsOrdered = quickSelections.subjectIds
    .map(id => subjectMap.value.get(id))
    .filter(Boolean) as Subject[]

  if (!subjectsOrdered.length) return

  const headerCells = rows[0].map(cell => cell.trim())
  const headerMatches =
    headerCells.length === subjectsOrdered.length &&
    headerCells.every((cell, idx) => normalizeKey(cell) === normalizeKey(subjectsOrdered[idx].name))

  const dataRows = headerMatches ? rows.slice(1) : rows
  const maxRows = quickStudents.value.length
  const errors: string[] = []

  dataRows.slice(0, maxRows).forEach((cells, rowIndex) => {
    const student = quickStudents.value[rowIndex]
    if (!student) return
    if (!quickScores[student.id]) quickScores[student.id] = {}

    subjectsOrdered.forEach((subject, colIdx) => {
      const raw = cells[colIdx] ?? ''
      if (raw === '' || raw == null) {
        quickScores[student.id][subject.id] = null
        return
      }
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) {
        errors.push(`Row ${rowIndex + 1}: invalid number "${raw}"`)
        return
      }
      quickScores[student.id][subject.id] = parsed
    })
  })

  if (errors.length) quickPasteErrors.value = errors.slice(0, 20)
}

const saveQuickMonitoring = async () => {
  if (!quickReady()) return
  if (quickHasErrors.value) {
    errorMessage.value = 'Fix validation errors before saving.'
    return
  }
  const entries: Array<{
    studentId: string
    subjectId: number
    studyYearId: number
    month: string
    score: number
  }> = []

  quickStudents.value.forEach(student => {
    quickSelections.subjectIds.forEach(subjectId => {
      const value = quickScores[student.id]?.[subjectId]
      if (value === null || value === undefined || value === '') return
      entries.push({
        studentId: student.id,
        subjectId,
        studyYearId: quickSelections.studyYearId!,
        month: quickSelections.month,
        score: Number(value),
      })
    })
  })

  if (!entries.length) return
  quickSubmitting.value = true
  try {
    const { data } = await api.post('/api/monitoring/bulk', {
      entries,
      gradeId: quickSelections.gradeId,
    })
    const apiErrors = Array.isArray(data?.errors) ? data.errors : []
    if (apiErrors.length) {
      errorMessage.value = `${apiErrors.length} rows failed.`
      quickPasteErrors.value = apiErrors.slice(0, 50).map((err: any) => err?.message || String(err))
      showSnackbar('Saved with some errors', 'warning')
    } else {
      quickPasteErrors.value = []
      showSnackbar('Monitoring scores saved')
    }
    await fetchMonitoring()
    await fetchQuickExisting()
    prefillQuickScores()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save monitoring scores.'
    showSnackbar('Failed to save monitoring scores', 'error')
  } finally {
    quickSubmitting.value = false
  }
}

const fetchMonitoring = async () => {
  loading.value = true
  summaryLoading.value = true
  errorMessage.value = ''
  summaryError.value = ''
  const params = {
    search: filters.search || undefined,
    gradeId: filters.gradeId || undefined,
    studyYearId: filters.studyYearId || undefined,
    month: filters.month || undefined,
  }
  try {
    const [listRes, summaryRes] = await Promise.allSettled([
      api.get<Monitoring[]>('/api/monitoring', { params }),
      api.get('/api/monitoring/summary', { params }),
    ])

    if (listRes.status === 'fulfilled') {
      monitoring.value = listRes.value.data
    } else {
      const message = (listRes.reason as any)?.response?.data?.message
      errorMessage.value = message || 'Failed to load monitoring entries.'
      monitoring.value = []
    }

    if (summaryRes.status === 'fulfilled') {
      const data = summaryRes.value.data
      monitoringSummary.totalEntries = data?.totalEntries ?? 0
      monitoringSummary.overallAverage = data?.overallAverage ?? null
      monitoringSummary.bySubject = Array.isArray(data?.bySubject) ? data.bySubject : []
    } else {
      const message = (summaryRes.reason as any)?.response?.data?.message
      summaryError.value = message || 'Failed to load monitoring averages.'
      monitoringSummary.totalEntries = 0
      monitoringSummary.overallAverage = null
      monitoringSummary.bySubject = []
    }
  } finally {
    loading.value = false
    summaryLoading.value = false
  }
}

const showSnackbar = (text: string, color: string = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.visible = true
}

const formatMonth = (value: string) => {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) return value
  const [year, month] = [match[1], match[2]]
  return `${year}-${month}`
}

const formatAverage = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return '—'
  return Number(value.toFixed(1)).toString()
}

// Normalize VDataTable slot item (raw row vs wrapper with `.raw`)
const resolveRow = (item: unknown): MonitoringTableRow | null => {
  if (!item || typeof item !== 'object') return null
  if ('raw' in item) return (item as { raw?: MonitoringTableRow | null }).raw ?? null
  return item as MonitoringTableRow
}

const openCellForEditing = (row: MonitoringTableRow, subjectId: number) => {
  const entry = monitoring.value.find(
    m =>
      m.student.id === row.studentId &&
      m.studyYear.id === row.studyYearId &&
      m.subject.id === subjectId &&
      m.month === row.month,
  )
  if (entry) openEditDialog(entry)
}

const fetchOptions = async () => {
  optionsLoading.value = true
  if (!loading.value) errorMessage.value = ''
  const errors: string[] = []
  try {
    const [subjectsRes, yearsRes, gradesRes] = await Promise.allSettled([
      api.get<Subject[]>('/api/subjects'),
      api.get<StudyYear[]>('/api/years'),
      api.get<Grade[]>('/api/grades'),
    ])

    if (subjectsRes.status === 'fulfilled') {
      subjects.value = subjectsRes.value.data
    } else {
      console.error('Failed to load subjects', subjectsRes.reason)
      errors.push('subjects')
    }

    if (yearsRes.status === 'fulfilled') {
      years.value = yearsRes.value.data
    } else {
      console.error('Failed to load study years', yearsRes.reason)
      errors.push('study years')
    }

    if (gradesRes.status === 'fulfilled') {
      grades.value = gradesRes.value.data
    } else {
      console.error('Failed to load grades', gradesRes.reason)
      errors.push('grades')
    }
  } finally {
    optionsLoading.value = false
  }

  if (errors.length) {
    errorMessage.value = `Failed to load ${errors.join(', ')}.`
  }
}

const resetImport = () => {
  importFileName.value = ''
  importErrors.value = []
  importEntries.value = []
  importSummary.students = 0
  importSummary.subjects = 0
  importSummary.entries = 0
}

const openImportDialog = () => {
  resetImport()
  importForm.studyYearId = filters.studyYearId
  importForm.gradeId = filters.gradeId
  importForm.month = filters.month
  importDialog.value = true
}

const fetchImportStudents = async () => {
  if (!importForm.studyYearId) {
    importStudents.value = []
    return
  }
  const { data } = await api.get<Student[]>('/api/students', {
    params: {
      studyYearId: importForm.studyYearId,
      gradeId: importForm.gradeId || undefined,
    },
  })
  importStudents.value = data
}

const findStudentIdHeader = (headers: string[]) =>
  headers.find(h => ['studentid', 'student_id', 'id'].includes(normalizeKey(h))) ?? null

const parseScore = (value: unknown): number | null => {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const onPickImportFile = () => importInputEl.value?.click()

const onImportFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  resetImport()
  importFileName.value = file.name

  if (!importForm.studyYearId || !importForm.month) {
    importErrors.value = ['Select study year and month before selecting a file.']
    return
  }

  await fetchImportStudents()
  const allowedStudents = new Map(importStudents.value.map(s => [s.id, s]))
  const subjectByName = new Map(subjects.value.map(s => [normalizeKey(s.name), s.id]))

  const table = await readFirstSheetAsTable(file)
  const studentIdHeader = findStudentIdHeader(table.headers)
  if (!studentIdHeader) {
    importErrors.value = ['Missing required column: studentId']
    return
  }

  const ignoredHeaders = new Set([studentIdHeader, 'fullName', 'full name', 'fullname', 'name'].map(normalizeKey))
  const subjectHeaders = table.headers.filter(h => !ignoredHeaders.has(normalizeKey(h)))

  const unknownSubjects = subjectHeaders.filter(h => !subjectByName.has(normalizeKey(h)))
  if (unknownSubjects.length) {
    importErrors.value.push(
      `Unknown subject columns: ${unknownSubjects.slice(0, 10).join(', ')}${unknownSubjects.length > 10 ? '…' : ''}`,
    )
  }

  const errors: string[] = []
  const entries: Array<{ studentId: string; subjectId: number; studyYearId: number; month: string; score: number }> = []
  const studentsSeen = new Set<string>()
  const subjectsSeen = new Set<number>()

  table.rows.forEach((row, index) => {
    const rowNumber = index + 2
    const rawStudentId = row[studentIdHeader]
    const studentId = typeof rawStudentId === 'string' ? rawStudentId.trim() : String(rawStudentId ?? '').trim()
    if (!studentId) return

    if (!allowedStudents.has(studentId)) {
      errors.push(`Row ${rowNumber}: studentId "${studentId}" not found in selected study year/grade`)
      return
    }

    studentsSeen.add(studentId)
    subjectHeaders.forEach(header => {
      const subjectId = subjectByName.get(normalizeKey(header))
      if (!subjectId) return
      const score = parseScore(row[header])
      if (score == null) return
      subjectsSeen.add(subjectId)
      entries.push({
        studentId,
        subjectId,
        studyYearId: importForm.studyYearId!,
        month: importForm.month,
        score,
      })
    })
  })

  importEntries.value = entries
  importSummary.students = studentsSeen.size
  importSummary.subjects = subjectsSeen.size
  importSummary.entries = entries.length
  importErrors.value = [...importErrors.value, ...errors.slice(0, 50)]
}

const submitImport = async () => {
  if (!importEntries.value.length) return
  importSubmitting.value = true
  try {
    const chunkSize = 500
    for (let i = 0; i < importEntries.value.length; i += chunkSize) {
      const chunk = importEntries.value.slice(i, i + chunkSize)
      await api.post('/api/monitoring/bulk', { entries: chunk })
    }
    await fetchMonitoring()
    showSnackbar(`Imported ${importSummary.entries} monitoring scores`)
    importDialog.value = false
  } catch (err: any) {
    const message = err?.response?.data?.message || 'Failed to import monitoring.'
    importErrors.value = [message, ...importErrors.value]
    showSnackbar('Failed to import monitoring', 'error')
  } finally {
    importSubmitting.value = false
  }
}

const resetForm = () => {
  createForm.studentId = ''
  createForm.subjectId = null
  createForm.studyYearId = null
  createForm.month = ''
  createForm.score = 0
  createForm.gradeId = null
}

const openEditDialog = (entry: Monitoring) => {
  editingEntry.value = entry
  editForm.subjectId = entry.subject.id
  editForm.studyYearId = entry.studyYear.id
  editForm.month = entry.month
  editForm.score = entry.score
  editDialog.value = true
}

const createStudentOptions = ref<Student[]>([])
const fetchCreateStudents = async () => {
  if (!createForm.studyYearId || !createForm.gradeId) {
    createStudentOptions.value = []
    return
  }
  const { data } = await api.get<Student[]>('/api/students/options', {
    params: {
      studyYearId: createForm.studyYearId,
      gradeId: createForm.gradeId,
      limit: 5000,
    },
  })
  createStudentOptions.value = data
}

const createMonitoringEntry = async () => {
  if (
    !createForm.gradeId ||
    !createForm.studentId ||
    !createForm.subjectId ||
    !createForm.studyYearId ||
    !createForm.month
  ) return
  createLoading.value = true
  try {
    await api.post('/api/monitoring', {
      studentId: createForm.studentId,
      subjectId: createForm.subjectId,
      studyYearId: createForm.studyYearId,
      month: createForm.month,
      score: createForm.score,
    })
    createDialog.value = false
    resetForm()
    await fetchMonitoring()
    showSnackbar('Monitoring entry saved')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to create monitoring entry.'
    showSnackbar('Failed to save monitoring entry', 'error')
  } finally {
    createLoading.value = false
  }
}

const updateMonitoringEntry = async () => {
  if (!editingEntry.value) return
  if (!editForm.month) return
  editLoading.value = true
  try {
    await api.put(`/api/monitoring/${editingEntry.value.id}`, {
      subjectId: editForm.subjectId,
      studyYearId: editForm.studyYearId,
      month: editForm.month,
      score: editForm.score,
    })
    editDialog.value = false
    editingEntry.value = null
    await fetchMonitoring()
    showSnackbar('Monitoring entry updated')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to update entry.'
    showSnackbar('Failed to update monitoring entry', 'error')
  } finally {
    editLoading.value = false
  }
}

const deleteMonitoringEntry = async (entry: Monitoring) => {
  if (!confirm('Delete this monitoring entry?')) return
  deletingId.value = entry.id
  try {
    await api.delete(`/api/monitoring/${entry.id}`)
    await fetchMonitoring()
    showSnackbar('Monitoring entry deleted')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to delete entry.'
    showSnackbar('Failed to delete monitoring entry', 'error')
  } finally {
    deletingId.value = null
  }
}

onMounted(async () => {
  await Promise.all([fetchMonitoring(), fetchOptions()])
})

// keep month selection consistent with study year date range
watch(
  () => createForm.studyYearId,
  () => {
    createForm.month = ''
    createForm.studentId = ''
    fetchCreateStudents()
  },
)

watch(
  () => createForm.gradeId,
  () => {
    createForm.studentId = ''
    fetchCreateStudents()
  },
)

watch(
  () => [quickSelections.studyYearId, quickSelections.gradeId],
  async () => {
    await fetchQuickStudents()
    await fetchQuickExisting()
    prefillQuickScores()
  },
)

watch(
  () => [quickSelections.subjectIds.join(','), quickSelections.month],
  async () => {
    await fetchQuickExisting()
    prefillQuickScores()
  },
)

watch(quickStudents, () => {
  prefillQuickScores()
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h5 mb-1">
          Monitoring
        </h2>
        <p class="text-medium-emphasis">
          Monthly performance snapshots collected across subjects.
        </p>
      </div>
      <div class="d-flex gap-3">
        <VBtn
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="fetchMonitoring"
        >
          Refresh
        </VBtn>
        <VBtn
          variant="outlined"
          color="primary"
          :loading="optionsLoading"
          @click="openImportDialog"
        >
          Import XLSX
        </VBtn>
        <VBtn
          color="primary"
          :loading="optionsLoading"
          @click="createDialog = true"
        >
          Add entry
        </VBtn>
      </div>
    </div>

    <VAlert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ errorMessage }}
    </VAlert>

    <VCard class="mb-4">
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <VTextField
              v-model="filters.search"
              label="Search"
              placeholder="Name or ID"
              prepend-inner-icon="ri-search-line"
              @input="fetchMonitoring"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
              clearable
              @update:model-value="fetchMonitoring"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              clearable
              @update:model-value="fetchMonitoring"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model="filters.month"
              type="month"
              label="Month"
              clearable
              @update:model-value="fetchMonitoring"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard class="mb-6">
      <VCardTitle>Monitoring averages</VCardTitle>
      <VCardSubtitle>
        Calculated from the current filters.
      </VCardSubtitle>
      <VCardText>
        <div class="d-flex flex-wrap gap-6 align-center mb-4">
          <div>
            <div class="text-caption text-medium-emphasis">
              Overall average
            </div>
            <div class="text-h4">
              <span v-if="summaryLoading">...</span>
              <span v-else>{{ formatAverage(monitoringSummary.overallAverage) }}</span>
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">
              Entries counted
            </div>
            <div class="text-h6">
              <span v-if="summaryLoading">...</span>
              <span v-else>{{ monitoringSummary.totalEntries }}</span>
            </div>
          </div>
        </div>
        <VAlert
          v-if="summaryError"
          type="warning"
          variant="tonal"
          class="mb-3"
        >
          {{ summaryError }}
        </VAlert>
        <div v-if="summaryLoading" class="text-medium-emphasis">
          Calculating averages...
        </div>
        <VTable
          v-else-if="monitoringSummary.bySubject.length"
          density="comfortable"
        >
          <thead>
            <tr>
              <th>Subject</th>
              <th>Average score</th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="subject in monitoringSummary.bySubject"
              :key="subject.subjectId"
            >
              <td>{{ subject.subjectName }}</td>
              <td>{{ formatAverage(subject.averageScore) }}</td>
              <td>{{ subject.entries }}</td>
            </tr>
          </tbody>
        </VTable>
        <p v-else class="text-medium-emphasis mb-0">
          No monitoring entries match the current filters.
        </p>
      </VCardText>
    </VCard>

    <VCard class="mb-6">
      <VCardTitle>Quick entry</VCardTitle>
      <VCardSubtitle>
        Select study year, grade, month, and one or more subjects to update monitoring scores for every student. Paste directly from Excel/Sheets.
      </VCardSubtitle>
      <VCardText>
        <VRow class="mb-4">
          <VCol cols="12" md="3">
            <VSelect
              v-model="quickSelections.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              :loading="optionsLoading"
              @update:model-value="() => { quickSelections.month = '' }"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="quickSelections.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="quickSelections.month"
              :items="monthOptionsForYear(getYearById(quickSelections.studyYearId), quickSelections.month)"
              item-title="title"
              item-value="value"
              label="Month"
              :disabled="!quickSelections.studyYearId"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="quickSelections.subjectIds"
              :items="subjects"
              item-title="name"
              item-value="id"
              label="Subjects"
              :loading="optionsLoading"
              multiple
              chips
              closable-chips
            />
          </VCol>
        </VRow>

        <div
          v-if="quickReady() && quickStudents.length"
          class="sheet-scroll"
          @paste.prevent="onQuickPaste"
        >
          <VTable class="bulk-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade</th>
                <th
                  v-for="subjectId in quickSelections.subjectIds"
                  :key="subjectId"
                  style="min-width: 180px;"
                >
                  {{ subjectMap.get(subjectId)?.name || 'Subject' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in quickStudents" :key="student.id">
                <td>{{ student.fullName }}</td>
                <td>{{ student.grade?.name || '—' }}</td>
                <td
                  v-for="subjectId in quickSelections.subjectIds"
                  :key="`${student.id}-${subjectId}`"
                >
                  <VTextField
                    v-model.number="quickScores[student.id][subjectId]"
                    type="number"
                    density="compact"
                    hide-details
                    min="0"
                    max="100"
                    :error="scoreInvalid(quickScores[student.id]?.[subjectId])"
                    :error-messages="scoreInvalid(quickScores[student.id]?.[subjectId]) ? '0-100 only' : undefined"
                  />
                  <div class="text-caption text-medium-emphasis">
                    Existing: {{ getQuickExistingScore(student.id, subjectId) ?? '—' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p v-else class="text-medium-emphasis mb-0">
          Select all fields to begin entering monitoring scores.
        </p>
        <VAlert
          v-if="quickHasErrors"
          type="error"
          variant="tonal"
          class="mt-3"
        >
          <div class="text-body-2 font-weight-medium mb-1">
            Fix these before saving:
          </div>
          <div
            v-for="err in quickValidationErrors.slice(0, 8)"
            :key="err"
          >
            {{ err }}
          </div>
        </VAlert>
        <VAlert
          v-else-if="quickPasteErrors.length"
          type="warning"
          variant="tonal"
          class="mt-3"
        >
          <div class="text-body-2 font-weight-medium mb-1">
            Paste issues
          </div>
          <div
            v-for="err in quickPasteErrors"
            :key="err"
          >
            {{ err }}
          </div>
        </VAlert>
        <VAlert
          v-else-if="quickEntryCount"
          type="info"
          variant="tonal"
          class="mt-3"
        >
          Ready to save {{ quickEntryCount }} scores.
        </VAlert>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          color="primary"
          :disabled="!quickReady() || quickHasErrors || !quickEntryCount"
          :loading="quickSubmitting"
          @click="saveQuickMonitoring"
        >
          Save scores
        </VBtn>
      </VCardActions>
    </VCard>

    <VDataTable
      :headers="tableHeaders"
      :items="monitoringRows"
      :loading="loading"
      item-value="key"
      class="elevation-1"
    >
      <template #item="{ item }">
        <template v-for="row in [resolveRow(item)]" :key="row?.key || (item as any)?.key || 'row'">
          <tr v-if="row">
            <td>{{ row.student }}</td>
            <td>{{ row.grade }}</td>
            <td>{{ row.studyYear }}</td>
            <td>{{ formatMonth(row.month) }}</td>
            <td
              v-for="subject in subjectColumns"
              :key="`${row.key}-${subject.id}`"
              class="text-center"
            >
              <span
                v-if="row[`subject-${subject.id}`] !== null"
                class="score-cell"
                title="Click to edit score"
                @click="openCellForEditing(row, subject.id)"
              >
                {{ row[`subject-${subject.id}`] }}
              </span>
              <span v-else class="text-medium-emphasis">
                —
              </span>
            </td>
            <td>{{ formatAverage(row.average) }}</td>
          </tr>
        </template>
      </template>
    </VDataTable>

    <VDialog
      v-model="createDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>New monitoring entry</VCardTitle>
        <VCardText>
          <VForm @submit.prevent="createMonitoringEntry">
            <VSelect
              v-model="createForm.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              required
            />
            <VSelect
              v-model="createForm.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
              class="mt-4"
              required
            />
            <VSelect
              v-model="createForm.studentId"
              :items="createStudentOptions"
              item-title="fullName"
              item-value="id"
              label="Student"
              class="mt-4"
              required
            />
            <VSelect
              v-model="createForm.subjectId"
              :items="subjects"
              item-title="name"
              item-value="id"
              label="Subject"
              class="mt-4"
              required
            />
            <VSelect
              v-model="createForm.month"
              :items="monthOptionsForYear(getYearById(createForm.studyYearId), createForm.month)"
              item-title="title"
              item-value="value"
              label="Month"
              class="mt-4"
              :disabled="!createForm.studyYearId"
              required
            />
            <VTextField
              v-model.number="createForm.score"
              type="number"
              label="Score"
              min="0"
              max="100"
              class="mt-4"
              required
            />
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="createDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="createLoading"
            @click="createMonitoringEntry"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="editDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>Edit monitoring entry</VCardTitle>
        <VCardText>
          <VForm @submit.prevent="updateMonitoringEntry">
            <VSelect
              v-model="editForm.subjectId"
              :items="subjects"
              item-title="name"
              item-value="id"
              label="Subject"
              class="mt-2"
            />
            <VSelect
              v-model="editForm.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              class="mt-4"
            />
            <VSelect
              v-model="editForm.month"
              :items="monthOptionsForYear(getYearById(editForm.studyYearId), editForm.month)"
              item-title="title"
              item-value="value"
              label="Month"
              class="mt-4"
              required
            />
            <VTextField
              v-model.number="editForm.score"
              type="number"
              label="Score"
              min="0"
              max="100"
              class="mt-4"
            />
          </VForm>
        </VCardText>
        <VCardActions>
          <VBtn
            v-if="editingEntry"
            variant="text"
            color="error"
            :loading="deletingId === editingEntry.id"
            @click="deleteMonitoringEntry(editingEntry)"
          >
            Delete
          </VBtn>
          <VSpacer />
          <VBtn
            variant="text"
            @click="() => { editDialog = false; editingEntry = null }"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="editLoading"
            @click="updateMonitoringEntry"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="importDialog"
      max-width="760"
    >
      <VCard>
        <VCardTitle>Import monitoring from XLSX</VCardTitle>
        <VCardSubtitle>
          First column must be <code>studentId</code>; each subject is a separate column header (exact subject name).
        </VCardSubtitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VSelect
                v-model="importForm.studyYearId"
                :items="years"
                item-title="name"
                item-value="id"
                label="Study year"
                :loading="optionsLoading"
                @update:model-value="resetImport"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="importForm.gradeId"
                :items="grades"
                item-title="name"
                item-value="id"
                label="Grade (optional)"
                clearable
                @update:model-value="resetImport"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="importForm.month"
                type="month"
                label="Month"
                required
                @update:model-value="resetImport"
              />
            </VCol>
          </VRow>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <VBtn
              color="primary"
              variant="outlined"
              :disabled="!importForm.studyYearId || !importForm.month"
              @click="onPickImportFile"
            >
              Choose XLSX file
            </VBtn>
            <span v-if="importFileName" class="text-medium-emphasis align-self-center">{{ importFileName }}</span>
            <input
              ref="importInputEl"
              type="file"
              accept=".xlsx,.xls"
              hidden
              @change="onImportFileSelected"
            >
          </div>

          <VAlert
            v-if="importErrors.length"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <div v-for="(err, idx) in importErrors" :key="idx">
              {{ err }}
            </div>
          </VAlert>

          <VAlert
            v-if="importSummary.entries"
            type="info"
            variant="tonal"
            class="mt-4"
          >
            Parsed {{ importSummary.entries }} monitoring scores for {{ importSummary.students }} students across
            {{ importSummary.subjects }} subjects.
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="importDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :disabled="!importSummary.entries || importErrors.length > 0"
            :loading="importSubmitting"
            @click="submitImport"
          >
            Import
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar.visible"
      :color="snackbar.color"
      location="bottom end"
      timeout="2500"
    >
      {{ snackbar.text }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.sheet-scroll {
  overflow: auto;
}
.bulk-table th:first-child,
.bulk-table td:first-child {
  position: sticky;
  left: 0;
  background: var(--v-theme-surface);
  z-index: 2;
}
.bulk-table th:nth-child(2),
.bulk-table td:nth-child(2) {
  position: sticky;
  left: 140px;
  background: var(--v-theme-surface);
  z-index: 2;
}
.score-cell {
  cursor: pointer;
}
</style>
