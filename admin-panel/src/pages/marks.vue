<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '@/utils/api'
import type { Grade, Mark, Student, Subject, Quarter, StudyYear } from '@/utils/types'
import { readFirstSheetAsTable } from '@/utils/xlsxTable'

const marks = ref<Mark[]>([])
const students = ref<Student[]>([])
const subjects = ref<Subject[]>([])
const years = ref<StudyYear[]>([])
const grades = ref<Grade[]>([])
const quarters = ref<Array<Quarter & { studyYear?: StudyYear }>>([])

const loading = ref(false)
const optionsLoading = ref(false)
const errorMessage = ref('')

const editDialog = ref(false)
const saving = ref(false)
const selectedMark = ref<Mark | null>(null)
const deletingMarkId = ref<number | null>(null)
const editForm = reactive({
  score: 0,
})

const createDialog = ref(false)
const createLoading = ref(false)
const createForm = reactive({
  studentId: '',
  subjectId: null as number | null,
  quarterId: null as number | null,
  score: 0,
  gradeId: null as number | null,
})

const bulkSelections = reactive({
  studyYearId: null as number | null,
  gradeId: null as number | null,
  subjectIds: [] as number[],
  quarterId: null as number | null,
})

const bulkScores = reactive<Record<string, Record<number, number | null>>>({})
const bulkSubmitting = ref(false)
const bulkPasteErrors = ref<string[]>([])

const snackbar = reactive({ visible: false, color: 'success', text: '' })
const showSnackbar = (text: string, color: string = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.visible = true
}

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, '')

const filteredStudents = computed(() => students.value)

const quarterOptions = computed(() => {
  if (!bulkSelections.studyYearId) return quarters.value
  return quarters.value.filter(q => q.studyYearId === bulkSelections.studyYearId)
})

const importQuarterOptions = computed(() => {
  if (!importForm.studyYearId) return quarters.value
  return quarters.value.filter(q => q.studyYearId === importForm.studyYearId)
})

const subjectMap = computed(() => new Map(subjects.value.map(s => [s.id, s])))

const markKey = (studentId: string, subjectId: number, quarterId: number) =>
  `${studentId}-${subjectId}-${quarterId}`

const existingMarksMap = computed(() => {
  const map = new Map<string, Mark>()
  marks.value.forEach(mark => {
    map.set(markKey(mark.student.id, mark.subject.id, mark.quarter.id), mark)
  })
  return map
})

const bulkReady = computed(
  () => Boolean(bulkSelections.subjectIds.length && bulkSelections.quarterId && filteredStudents.value.length),
)

const headers = [
  { title: 'Student', key: 'student' },
  { title: 'Grade', key: 'grade' },
  { title: 'Subject', key: 'subject' },
  { title: 'Quarter', key: 'quarter' },
  { title: 'Score', key: 'score' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const marksFilters = reactive({
  search: '',
  gradeId: null as number | null,
  studyYearId: null as number | null,
  subjectId: null as number | null,
})

const fetchMarks = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<Mark[]>('/api/marks', {
      params: {
        search: marksFilters.search || undefined,
        gradeId: marksFilters.gradeId || undefined,
        studyYearId: marksFilters.studyYearId || undefined,
        subjectId: marksFilters.subjectId || undefined,
      },
    })
    marks.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load marks.'
  } finally {
    loading.value = false
  }
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
      quarters.value = years.value.flatMap(year =>
        (year.quarters ?? []).map(q => ({ ...q, studyYear: year })),
      )
    } else {
      console.error('Failed to load quarters', yearsRes.reason)
      errors.push('quarters')
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

const fetchBulkStudents = async () => {
  if (!bulkSelections.studyYearId) {
    students.value = []
    resetBulkScores()
    return
  }

  try {
    const { data } = await api.get<Student[]>('/api/students/options', {
      params: {
        studyYearId: bulkSelections.studyYearId,
        gradeId: bulkSelections.gradeId || undefined,
      },
    })
    students.value = data
    prefillBulkScores()
  } catch (err: any) {
    console.error('Failed to load students for bulk entry', err)
    errorMessage.value = err?.response?.data?.message || 'Failed to load students.'
    students.value = []
  }
}

const openEditDialog = (mark: Mark) => {
  selectedMark.value = mark
  editForm.score = mark.score
  editDialog.value = true
}

const updateMark = async () => {
  if (!selectedMark.value) return
  saving.value = true
  try {
    await api.put(`/api/marks/${selectedMark.value.id}`, { score: editForm.score })
    editDialog.value = false
    await fetchMarks()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to update mark.'
  } finally {
    saving.value = false
  }
}

const deleteMark = async (mark: Mark) => {
  if (!confirm('Delete this mark?')) return
  deletingMarkId.value = mark.id
  try {
    await api.delete(`/api/marks/${mark.id}`)
    await fetchMarks()
    showSnackbar('Mark deleted')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to delete mark.'
    showSnackbar('Failed to delete mark', 'error')
  } finally {
    deletingMarkId.value = null
  }
}

const resetCreateForm = () => {
  createForm.studentId = ''
  createForm.subjectId = null
  createForm.quarterId = null
  createForm.score = 0
  createForm.gradeId = null
}

const resetBulkScores = () => {
  Object.keys(bulkScores).forEach(key => delete bulkScores[key])
}

const prefillBulkScores = () => {
  resetBulkScores()
  if (!bulkReady.value || !bulkSelections.quarterId) return

  filteredStudents.value.forEach(student => {
    if (!bulkScores[student.id]) bulkScores[student.id] = {}
    bulkSelections.subjectIds.forEach(subjectId => {
      const key = markKey(student.id, subjectId, bulkSelections.quarterId!)
      const existing = existingMarksMap.value.get(key)
      bulkScores[student.id][subjectId] = existing?.score ?? null
    })
  })
}

const getExistingScore = (studentId: string, subjectId: number) => {
  if (!bulkSelections.quarterId) return null
  const existing = existingMarksMap.value.get(
    markKey(studentId, subjectId, bulkSelections.quarterId),
  )
  return existing?.score ?? null
}

const onBulkPaste = (event: ClipboardEvent) => {
  if (!bulkReady.value) return
  const text = event.clipboardData?.getData('text') || ''
  if (!text.trim()) return
  bulkPasteErrors.value = []

  const rows = text
    .trim()
    .split(/\r?\n/)
    .map(line => line.split('\t'))
    .filter(r => r.length)

  if (!rows.length) return

  const subjectsOrdered = bulkSelections.subjectIds
    .map(id => subjectMap.value.get(id))
    .filter(Boolean) as Subject[]

  if (!subjectsOrdered.length) return

  const headerCells = rows[0].map(cell => cell.trim())
  const headerMatches =
    headerCells.length === subjectsOrdered.length &&
    headerCells.every((cell, idx) => normalizeKey(cell) === normalizeKey(subjectsOrdered[idx].name))

  const dataRows = headerMatches ? rows.slice(1) : rows
  const maxRows = filteredStudents.value.length
  const errors: string[] = []

  dataRows.slice(0, maxRows).forEach((cells, rowIndex) => {
    const student = filteredStudents.value[rowIndex]
    if (!student) return
    if (!bulkScores[student.id]) bulkScores[student.id] = {}

    subjectsOrdered.forEach((subject, colIdx) => {
      const raw = cells[colIdx] ?? ''
      if (raw === '' || raw == null) {
        bulkScores[student.id][subject.id] = null
        return
      }
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) {
        errors.push(`Row ${rowIndex + 1}: invalid number "${raw}"`)
        return
      }
      bulkScores[student.id][subject.id] = parsed
    })
  })

  if (errors.length) {
    bulkPasteErrors.value = errors.slice(0, 20)
  }
}

const createMark = async () => {
  if (!createForm.gradeId || !createForm.studentId || !createForm.subjectId || !createForm.quarterId) return
  createLoading.value = true
  try {
    await api.post('/api/marks', {
      studentId: createForm.studentId,
      subjectId: createForm.subjectId,
      quarterId: createForm.quarterId,
      score: createForm.score,
    })
    createDialog.value = false
    resetCreateForm()
    await fetchMarks()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to create mark.'
  } finally {
    createLoading.value = false
  }
}

const saveBulkMarks = async () => {
  if (!bulkReady.value || !bulkSelections.quarterId) return

  const entries: Array<{
    studentId: string
    subjectId: number
    quarterId: number
    score: number
  }> = []

  filteredStudents.value.forEach(student => {
    bulkSelections.subjectIds.forEach(subjectId => {
      const value = bulkScores[student.id]?.[subjectId]
      if (value === null || value === undefined || value === '') return
      entries.push({
        studentId: student.id,
        subjectId,
        quarterId: bulkSelections.quarterId!,
        score: Number(value),
      })
    })
  })

  if (!entries.length) return

  bulkSubmitting.value = true
  bulkPasteErrors.value = []
  try {
    const { data } = await api.post('/api/marks/bulk', {
      entries,
      studyYearId: bulkSelections.studyYearId,
      gradeId: bulkSelections.gradeId,
    })
    const apiErrors = Array.isArray(data?.errors) ? data.errors : []
    if (apiErrors.length) {
      errorMessage.value = `${apiErrors.length} rows failed.`
      bulkPasteErrors.value = apiErrors.slice(0, 50).map((err: any) => err?.message || String(err))
      showSnackbar('Saved with some errors', 'warning')
    } else {
      showSnackbar(`Saved ${data?.updated ?? entries.length} marks`)
    }
    await fetchMarks()
    prefillBulkScores()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save marks.'
    showSnackbar('Failed to save marks', 'error')
  } finally {
    bulkSubmitting.value = false
  }
}

// ===== XLSX import (grade-wide, multi-subject) =====
const importDialog = ref(false)
const importSubmitting = ref(false)
const importFileName = ref('')
const importErrors = ref<string[]>([])
const importSummary = reactive({ students: 0, subjects: 0, entries: 0 })
const importEntries = ref<Array<{ studentId: string; subjectId: number; quarterId: number; score: number }>>([])
const importStudents = ref<Student[]>([])
const importInputEl = ref<HTMLInputElement | null>(null)

const importForm = reactive({
  studyYearId: null as number | null,
  gradeId: null as number | null,
  quarterId: null as number | null,
})

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
  importForm.studyYearId = bulkSelections.studyYearId
  importForm.gradeId = bulkSelections.gradeId
  importForm.quarterId = bulkSelections.quarterId
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

  if (!importForm.studyYearId || !importForm.quarterId) {
    importErrors.value = ['Select study year and quarter before selecting a file.']
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
  const entries: Array<{ studentId: string; subjectId: number; quarterId: number; score: number }> = []
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
        quarterId: importForm.quarterId!,
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
      await api.post('/api/marks/bulk', { entries: chunk })
    }
    await fetchMarks()
    showSnackbar(`Imported ${importSummary.entries} marks`)
    importDialog.value = false
  } catch (err: any) {
    const message = err?.response?.data?.message || 'Failed to import marks.'
    importErrors.value = [message, ...importErrors.value]
    showSnackbar('Failed to import marks', 'error')
  } finally {
    importSubmitting.value = false
  }
}

const createStudentOptions = ref<Student[]>([])
const fetchCreateStudents = async () => {
  if (!createForm.quarterId) {
    createStudentOptions.value = []
    return
  }
  if (!createForm.gradeId) {
    createStudentOptions.value = []
    return
  }
  const quarter = quarters.value.find(q => q.id === createForm.quarterId)
  if (!quarter) {
    createStudentOptions.value = []
    return
  }
  const { data } = await api.get<Student[]>('/api/students/options', {
    params: {
      studyYearId: quarter.studyYearId,
      gradeId: createForm.gradeId || undefined,
      limit: 5000,
    },
  })
  createStudentOptions.value = data
  if (createForm.studentId && !createStudentOptions.value.some(s => s.id === createForm.studentId)) {
    createForm.studentId = ''
  }
}

watch(
  () => [createForm.quarterId, createForm.gradeId],
  () => {
    fetchCreateStudents()
  },
)

onMounted(async () => {
  await Promise.all([fetchMarks(), fetchOptions()])
})

watch(
  () => [bulkSelections.studyYearId, bulkSelections.gradeId],
  () => {
    fetchBulkStudents()
    if (bulkSelections.quarterId && !quarterOptions.value.some(q => q.id === bulkSelections.quarterId)) {
      bulkSelections.quarterId = null
    }
  },
)

watch(
  () => [bulkSelections.subjectIds.join(','), bulkSelections.quarterId],
  () => {
    prefillBulkScores()
  },
)

watch(marks, () => {
  prefillBulkScores()
})

watch(students, () => {
  prefillBulkScores()
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h5 mb-1">
          Marks
        </h2>
        <p class="text-medium-emphasis">
          Create and review scores recorded across subjects and quarters.
        </p>
      </div>
      <div class="d-flex gap-3">
        <VBtn
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="fetchMarks"
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
          Add mark
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

    <VCard class="mb-6">
      <VCardTitle>Quick entry</VCardTitle>
      <VCardSubtitle>
        Select a study year, quarter, and one or more subjects to update scores for every student. Paste directly from Excel/Sheets.
      </VCardSubtitle>
      <VCardText>
        <VRow class="mb-4">
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="bulkSelections.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              :loading="optionsLoading"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="bulkSelections.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
              clearable
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="bulkSelections.subjectIds"
              :items="subjects"
              item-title="name"
              item-value="id"
              label="Subjects"
              multiple
              chips
              closable-chips
              :loading="optionsLoading"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="bulkSelections.quarterId"
              :items="quarterOptions"
              item-title="name"
              item-value="id"
              label="Quarter"
              :loading="optionsLoading"
              :disabled="!bulkSelections.studyYearId"
            >
              <template #item="{ props, item }">
                <VListItem
                  v-bind="props"
                  :subtitle="item?.raw?.studyYear?.name"
                />
              </template>
              <template #selection="{ item }">
                <span>{{ item?.title }}</span>
              </template>
            </VSelect>
          </VCol>
        </VRow>

        <div
          v-if="bulkSelections.subjectIds.length && bulkSelections.quarterId"
          @paste.prevent="onBulkPaste"
        >
          <VTable
            v-if="filteredStudents.length"
            class="bulk-table"
          >
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade</th>
                <th
                  v-for="subjectId in bulkSelections.subjectIds"
                  :key="subjectId"
                  style="min-width: 180px;"
                >
                  {{ subjectMap.get(subjectId)?.name || 'Subject' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="student in filteredStudents"
                :key="student.id"
              >
                <td>{{ student.fullName }}</td>
                <td>{{ student.grade?.name || '—' }}</td>
                <td
                  v-for="subjectId in bulkSelections.subjectIds"
                  :key="`${student.id}-${subjectId}`"
                >
                  <VTextField
                    v-model.number="bulkScores[student.id][subjectId]"
                    type="number"
                    density="compact"
                    hide-details
                    min="0"
                    max="100"
                  />
                  <div class="text-caption text-medium-emphasis">
                    Existing: {{ getExistingScore(student.id, subjectId) ?? '—' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
          <p
            v-else
            class="text-medium-emphasis mb-0"
          >
            No students found for this study year.
          </p>
        </div>
        <div v-else class="text-medium-emphasis">
          Select subjects and a quarter to begin entering scores.
        </div>
        <VAlert
          v-if="bulkPasteErrors.length"
          type="warning"
          variant="tonal"
          class="mt-3"
        >
          <div class="text-body-2 font-weight-medium mb-1">
            Paste issues
          </div>
          <div
            v-for="err in bulkPasteErrors"
            :key="err"
          >
            {{ err }}
          </div>
        </VAlert>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          color="primary"
          :disabled="!bulkReady"
          :loading="bulkSubmitting"
          @click="saveBulkMarks"
        >
          Save scores
        </VBtn>
      </VCardActions>
    </VCard>

    <VCard class="mb-4">
      <VCardText>
        <VRow>
          <VCol cols="12" md="3">
            <VTextField
              v-model="marksFilters.search"
              label="Search"
              placeholder="Name or ID"
              prepend-inner-icon="ri-search-line"
              @input="fetchMarks"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="marksFilters.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
              clearable
              @update:model-value="fetchMarks"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="marksFilters.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              clearable
              @update:model-value="fetchMarks"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="marksFilters.subjectId"
              :items="subjects"
              item-title="name"
              item-value="id"
              label="Subject"
              clearable
              @update:model-value="fetchMarks"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VDataTable
      :items="marks"
      :headers="headers"
      :loading="loading"
      class="elevation-1"
    >
      <template #item.student="{ item }">
        {{ item.student.fullName }}
      </template>
      <template #item.grade="{ item }">
        {{ item.student.grade?.name || '—' }}
      </template>
      <template #item.subject="{ item }">
        {{ item.subject.name }}
      </template>
      <template #item.quarter="{ item }">
        {{ item.quarter.name }}
      </template>
      <template #item.actions="{ item }">
        <VBtn
          variant="text"
          icon="ri-pencil-line"
          @click="openEditDialog(item)"
        />
        <VBtn
          variant="text"
          icon="ri-delete-bin-6-line"
          color="error"
          :loading="deletingMarkId === item.id"
          @click="deleteMark(item)"
        />
      </template>
    </VDataTable>

    <VDialog
      v-model="createDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>New mark</VCardTitle>
        <VCardText>
          <VForm @submit.prevent="createMark">
            <VSelect
              v-model="createForm.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
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
              v-model="createForm.quarterId"
              :items="quarters"
              item-title="name"
              item-value="id"
              label="Quarter"
              class="mt-4"
              required
            >
              <template #item="{ props, item }">
                <VListItem
                  v-bind="props"
                  :subtitle="item?.raw?.studyYear?.name"
                />
              </template>
              <template #selection="{ item }">
                <span>{{ item?.title }}</span>
              </template>
            </VSelect>
            <VTextField
              v-model.number="createForm.score"
              type="number"
              label="Score"
              class="mt-4"
              min="0"
              max="100"
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
            @click="createMark"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="editDialog"
      max-width="420"
    >
      <VCard>
        <VCardTitle>Edit mark</VCardTitle>
        <VCardText>
          <p class="text-medium-emphasis">
            {{ selectedMark?.student.fullName }} • {{ selectedMark?.subject.name }} • {{ selectedMark?.quarter.name }}
          </p>
          <VTextField
            v-model.number="editForm.score"
            type="number"
            label="Score"
            min="0"
            max="100"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="editDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            @click="updateMark"
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
        <VCardTitle>Import marks from XLSX</VCardTitle>
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
            <VSelect
              v-model="importForm.quarterId"
              :items="importQuarterOptions"
              item-title="name"
              item-value="id"
              label="Quarter"
              :disabled="!importForm.studyYearId"
              @update:model-value="resetImport"
            />
            </VCol>
          </VRow>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <VBtn
              color="primary"
              variant="outlined"
              :disabled="!importForm.studyYearId || !importForm.quarterId"
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
            Parsed {{ importSummary.entries }} marks for {{ importSummary.students }} students across
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
