<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import api from '@/utils/api'
import type { Grade, Monitoring, Student, Subject, StudyYear } from '@/utils/types'
import { readFirstSheetAsTable } from '@/utils/xlsxTable'

const monitoring = ref<Monitoring[]>([])
const subjects = ref<Subject[]>([])
const years = ref<StudyYear[]>([])
const grades = ref<Grade[]>([])

const loading = ref(false)
const optionsLoading = ref(false)
const errorMessage = ref('')
const snackbar = reactive({ visible: false, color: 'success', text: '' })
const deletingId = ref<number | null>(null)

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

const headers = [
  { title: 'Student', key: 'student' },
  { title: 'Grade', key: 'grade' },
  { title: 'Subject', key: 'subject' },
  { title: 'Month', key: 'month' },
  { title: 'Score', key: 'score' },
  { title: 'Study year', key: 'year' },
  { title: 'Actions', key: 'actions', sortable: false },
]

// Quick entry (month+subject for a whole grade)
const quickSelections = reactive({
  studyYearId: null as number | null,
  gradeId: null as number | null,
  subjectId: null as number | null,
  month: '',
})
const quickScores = reactive<Record<string, number | null>>({})
const quickStudents = ref<Student[]>([])
const quickSubmitting = ref(false)
const quickExisting = ref<Monitoring[]>([])

const resetQuickScores = () => {
  Object.keys(quickScores).forEach(key => delete quickScores[key])
}

const quickReady = () =>
  Boolean(quickSelections.studyYearId && quickSelections.gradeId && quickSelections.subjectId && quickSelections.month)

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
  quickExisting.value = data.filter(e => e.subject.id === quickSelections.subjectId)
}

const prefillQuickScores = () => {
  resetQuickScores()
  if (!quickReady()) return
  const map = new Map<string, number>()
  quickExisting.value.forEach(entry => {
    map.set(entry.student.id, entry.score)
  })
  quickStudents.value.forEach(student => {
    quickScores[student.id] = map.get(student.id) ?? null
  })
}

const getQuickExistingScore = (studentId: string) => {
  const found = quickExisting.value.find(e => e.student.id === studentId)
  return found?.score ?? null
}

const saveQuickMonitoring = async () => {
  if (!quickReady()) return
  const entries = quickStudents.value
    .map(student => {
      const value = quickScores[student.id]
      if (value === null || value === undefined || value === '') return null
      return {
        studentId: student.id,
        subjectId: quickSelections.subjectId!,
        studyYearId: quickSelections.studyYearId!,
        month: quickSelections.month,
        score: Number(value),
      }
    })
    .filter(Boolean) as Array<{
      studentId: string
      subjectId: number
      studyYearId: number
      month: string
      score: number
    }>

  if (!entries.length) return
  quickSubmitting.value = true
  try {
    await api.post('/api/monitoring/bulk', { entries })
    await fetchMonitoring()
    await fetchQuickExisting()
    prefillQuickScores()
    showSnackbar('Monitoring scores saved')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save monitoring scores.'
    showSnackbar('Failed to save monitoring scores', 'error')
  } finally {
    quickSubmitting.value = false
  }
}

const fetchMonitoring = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<Monitoring[]>('/api/monitoring', {
      params: {
        search: filters.search || undefined,
        gradeId: filters.gradeId || undefined,
        studyYearId: filters.studyYearId || undefined,
        month: filters.month || undefined,
      },
    })
    monitoring.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load monitoring entries.'
  } finally {
    loading.value = false
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

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, '')
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
  () => [quickSelections.subjectId, quickSelections.month],
  async () => {
    await fetchQuickExisting()
    prefillQuickScores()
  },
)
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
      <VCardTitle>Quick entry</VCardTitle>
      <VCardSubtitle>
        Select study year, grade, month, and subject to update monitoring scores for every student.
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
              v-model="quickSelections.subjectId"
              :items="subjects"
              item-title="name"
              item-value="id"
              label="Subject"
              :loading="optionsLoading"
            />
          </VCol>
        </VRow>

        <VTable
          v-if="quickReady() && quickStudents.length"
          class="bulk-table"
        >
          <thead>
            <tr>
              <th>Student</th>
              <th>Grade</th>
              <th style="width: 160px;">Score</th>
              <th style="width: 120px;">Existing</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in quickStudents" :key="student.id">
              <td>{{ student.fullName }}</td>
              <td>{{ student.grade?.name || '—' }}</td>
              <td>
                <VTextField
                  v-model.number="quickScores[student.id]"
                  type="number"
                  density="compact"
                  hide-details
                  min="0"
                  max="100"
                />
              </td>
              <td>{{ getQuickExistingScore(student.id) ?? '—' }}</td>
            </tr>
          </tbody>
        </VTable>
        <p v-else class="text-medium-emphasis mb-0">
          Select all fields to begin entering monitoring scores.
        </p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          color="primary"
          :disabled="!quickReady()"
          :loading="quickSubmitting"
          @click="saveQuickMonitoring"
        >
          Save scores
        </VBtn>
      </VCardActions>
    </VCard>

    <VDataTable
      :headers="headers"
      :items="monitoring"
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
      <template #item.month="{ item }">
        {{ formatMonth(item.month) }}
      </template>
      <template #item.year="{ item }">
        {{ item.studyYear.name }}
      </template>
      <template #item.actions="{ item }">
        <VBtn
          icon="ri-pencil-line"
          variant="text"
          @click="openEditDialog(item)"
        />
        <VBtn
          icon="ri-delete-bin-6-line"
          variant="text"
          color="error"
          :loading="deletingId === item.id"
          @click="deleteMonitoringEntry(item)"
        />
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
