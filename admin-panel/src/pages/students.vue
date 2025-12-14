<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/utils/api'
import { parseClipboardTable, readFirstSheetAsTable } from '@/utils/xlsxTable'
import type {
  Grade,
  Student,
  StudentImportResponse,
  StudentMarksResponse,
  StudyYear,
} from '@/utils/types'

const students = ref<Student[]>([])
const years = ref<StudyYear[]>([])
const grades = ref<Grade[]>([])
const loading = ref(false)
const dialog = ref(false)
const editingId = ref<string | null>(null)
const marksDialog = ref(false)
const saving = ref(false)
const deleting = ref<string | null>(null)
const errorMessage = ref('')
const selectedMarks = ref<StudentMarksResponse | null>(null)
const snackbar = reactive({ visible: false, color: 'success', text: '' })

const showSnackbar = (text: string, color: string = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.visible = true
}

const form = reactive({
  id: '',
  fullName: '',
  gradeId: null as number | null,
  studyYearId: '' as string | number,
})

const filters = reactive({
  search: '',
  gradeId: null as number | null,
  studyYearId: null as number | null,
})

const importDialog = ref(false)
const importInputEl = ref<HTMLInputElement | null>(null)
const importFileName = ref('')
const importErrors = ref<string[]>([])
const importEntries = ref<Array<{ id: string; fullName: string; gradeId: number | null }>>([])
const importSummary = reactive({
  total: 0,
  created: 0,
  updated: 0,
  skippedExisting: 0,
  duplicatesMerged: 0,
  invalid: 0,
})
const importForm = reactive({
  studyYearId: null as number | null,
  gradeId: null as number | null,
  updateExisting: false,
})
const importSubmitting = ref(false)
const importPasting = ref(false)

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Full name', key: 'fullName' },
  { title: 'Grade', key: 'grade' },
  { title: 'Study year', key: 'studyYear' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const yearLookup = computed(() =>
  years.value.reduce<Record<number, string>>((acc, year) => {
    acc[year.id] = year.name
    return acc
  }, {}),
)

const fetchStudents = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<Student[]>('/api/students', {
      params: {
        search: filters.search || undefined,
        gradeId: filters.gradeId || undefined,
        studyYearId: filters.studyYearId || undefined,
      },
    })
    students.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load students.'
  } finally {
    loading.value = false
  }
}

const fetchYears = async () => {
  const { data } = await api.get<StudyYear[]>('/api/years')
  years.value = data
}

const fetchGrades = async () => {
  const { data } = await api.get<Grade[]>('/api/grades')
  grades.value = data
}

const normalizeKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')

const resetImport = () => {
  importFileName.value = ''
  importErrors.value = []
  importEntries.value = []
  importSummary.total = 0
  importSummary.created = 0
  importSummary.updated = 0
  importSummary.skippedExisting = 0
  importSummary.duplicatesMerged = 0
  importSummary.invalid = 0
}

const openImportDialog = () => {
  resetImport()
  importForm.studyYearId = filters.studyYearId
  importForm.gradeId = filters.gradeId
  importForm.updateExisting = false
  importDialog.value = true
}

const onPickImportFile = () => importInputEl.value?.click()

const onImportFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  resetImport()
  importFileName.value = file.name

  if (!importForm.studyYearId) {
    importErrors.value = ['Select a study year before importing.']
    return
  }

  const table = await readFirstSheetAsTable(file)
  await processImportTable(table)
}

async function processImportTable(table: Awaited<ReturnType<typeof readFirstSheetAsTable>>) {
  const gradeByName = new Map(grades.value.map(grade => [normalizeKey(grade.name), grade.id]))
  const idHeader =
    table.headers.find(header =>
      ['studentid', 'student_id', 'id', 'code'].includes(normalizeKey(header)),
    ) ?? null
  const nameHeader =
    table.headers.find(header =>
      ['fullname', 'full_name', 'fio', 'name'].includes(normalizeKey(header)),
    ) ?? null
  const gradeHeader =
    table.headers.find(header =>
      ['grade', 'class', 'grade_name'].includes(normalizeKey(header)),
    ) ?? null

  if (!idHeader || !nameHeader) {
    importErrors.value = ['Missing required columns: studentId and fullName']
    return
  }

  const errors: string[] = []
  const seen = new Set<string>()
  const mapped = new Map<string, { id: string; fullName: string; gradeId: number | null }>()
  let duplicatesMerged = 0
  let invalid = 0

  table.rows.forEach((row, index) => {
    const rowNumber = index + 2
    const rawId = row[idHeader]
    const rawName = row[nameHeader]
    const id = typeof rawId === 'string' ? rawId.trim() : String(rawId ?? '').trim()
    const fullName =
      typeof rawName === 'string' ? rawName.trim() : String(rawName ?? '').trim()

    if (!id || !fullName) {
      invalid += 1
      return
    }

    let gradeId = importForm.gradeId
    if (gradeHeader) {
      const rawGrade = row[gradeHeader]
      const gradeKey = normalizeKey(rawGrade as string)
      if (gradeKey) {
        const matched = gradeByName.get(gradeKey)
        if (!matched) {
          errors.push(`Row ${rowNumber}: grade "${rawGrade}" not found`)
          return
        }
        gradeId = matched
      }
    }

    if (seen.has(id)) duplicatesMerged += 1
    seen.add(id)
    mapped.set(id, { id, fullName, gradeId: gradeId ?? null })
  })

  importEntries.value = Array.from(mapped.values())
  importSummary.total = importEntries.value.length
  importSummary.invalid = invalid
  importSummary.duplicatesMerged = duplicatesMerged
  importErrors.value = errors.slice(0, 50)
}

const pasteImportFromClipboard = async () => {
  resetImport()
  importFileName.value = 'Clipboard'
  if (!importForm.studyYearId) {
    importErrors.value = ['Select a study year before importing.']
    return
  }
  try {
    importPasting.value = true
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      importErrors.value = ['Clipboard is empty. Copy rows from your sheet first.']
      return
    }
    const table = parseClipboardTable(text)
    await processImportTable(table)
    if (!importEntries.value.length)
      importErrors.value = ['No valid rows found in clipboard data.']
  } catch (err) {
    console.error('Clipboard paste failed', err)
    importErrors.value = ['Unable to read clipboard. Paste permissions are required.']
  } finally {
    importPasting.value = false
  }
}

const submitImport = async () => {
  if (!importEntries.value.length || !importForm.studyYearId) return
  importSubmitting.value = true
  importErrors.value = []
  try {
    const { data } = await api.post<StudentImportResponse>('/api/students/import', {
      studyYearId: importForm.studyYearId,
      gradeId: importForm.gradeId,
      updateExisting: importForm.updateExisting,
      entries: importEntries.value,
    })
    importSummary.created = data.created
    importSummary.updated = data.updated
    importSummary.skippedExisting = data.skippedExisting
    showSnackbar(`Imported ${data.created} new, updated ${data.updated}`)
    importDialog.value = false
    await fetchStudents()
  } catch (err: any) {
    importErrors.value = [err?.response?.data?.message || 'Failed to import students.']
    showSnackbar('Failed to import students', 'error')
  } finally {
    importSubmitting.value = false
  }
}

const resetForm = () => {
  form.id = ''
  form.fullName = ''
  form.gradeId = null
  form.studyYearId = ''
}

const openCreateDialog = () => {
  editingId.value = null
  resetForm()
  dialog.value = true
}

const openEditDialog = (student: Student) => {
  editingId.value = student.id
  form.id = student.id
  form.fullName = student.fullName
  form.gradeId = student.grade?.id ?? null
  form.studyYearId = student.studyYearId
  dialog.value = true
}

const saveStudent = async () => {
  if (!form.id || !form.fullName || !form.studyYearId) return
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`/api/students/${editingId.value}`, {
        id: form.id,
        fullName: form.fullName,
        gradeId: form.gradeId,
      })
      showSnackbar('Student updated')
    } else {
      await api.post('/api/students', {
        id: form.id,
        fullName: form.fullName,
        gradeId: form.gradeId,
        studyYearId: Number(form.studyYearId),
      })
      showSnackbar('Student created')
    }
    dialog.value = false
    resetForm()
    await fetchStudents()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save student.'
    showSnackbar('Failed to save student', 'error')
  } finally {
    saving.value = false
  }
}

const deleteStudent = async (studentId: string) => {
  if (!confirm('Delete this student?')) return
  deleting.value = studentId
  const performDelete = (force = false) =>
    api.delete(`/api/students/${studentId}`, { params: force ? { force: true } : undefined })
  try {
    await performDelete()
    await fetchStudents()
    showSnackbar('Student deleted')
  } catch (err: any) {
    const status = err?.response?.status
    const data = err?.response?.data || {}
    if (status === 409 && data?.code === 'STUDENT_HAS_RESULTS') {
      const related = data?.details
        ? ` (${data.details.marks ?? 0} marks, ${data.details.monitorings ?? 0} monitoring)`
        : ''
      const confirmCascade = confirm(
        `${data?.message || 'Student has related marks or monitoring.'}${related}\nDelete everything?`,
      )
      if (confirmCascade) {
        try {
          await performDelete(true)
          await fetchStudents()
          showSnackbar('Student and related results deleted')
          return
        } catch (forceErr: any) {
          errorMessage.value = forceErr?.response?.data?.message || 'Failed to delete student.'
          showSnackbar('Failed to delete student', 'error')
          return
        }
      }
    }
    errorMessage.value = data?.message || 'Failed to delete student.'
    showSnackbar('Failed to delete student', 'error')
  } finally {
    deleting.value = null
  }
}

const openMarks = async (student: Student) => {
  try {
    const { data } = await api.get<StudentMarksResponse>(`/api/students/${student.id}/marks`)
    selectedMarks.value = data
    marksDialog.value = true
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load marks.'
  }
}

onMounted(async () => {
  await Promise.all([fetchStudents(), fetchYears(), fetchGrades()])
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h5 mb-1">
          Students
        </h2>
        <p class="text-medium-emphasis">
          Manage student records, grades, and study year assignments.
        </p>
      </div>
      <div class="d-flex gap-3">
        <VBtn
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="fetchStudents"
        >
          Refresh
        </VBtn>
        <VBtn
          variant="tonal"
          color="secondary"
          @click="openImportDialog"
        >
          Import XLSX
        </VBtn>
        <VBtn
          color="primary"
          @click="openCreateDialog"
        >
          New student
        </VBtn>
      </div>
    </div>

    <input
      ref="importInputEl"
      type="file"
      accept=".xlsx,.xls"
      class="d-none"
      @change="onImportFileSelected"
    />

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
              @input="fetchStudents"
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
              @update:model-value="fetchStudents"
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
              @update:model-value="fetchStudents"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VDataTable
      :headers="headers"
      :items="students"
      :loading="loading"
      class="elevation-1"
    >
      <template #item.grade="{ item }">
        {{ item.grade?.name || '—' }}
      </template>
      <template #item.studyYear="{ item }">
        {{ yearLookup[item.studyYearId] || '—' }}
      </template>
      <template #item.actions="{ item }">
        <VBtn
          icon="ri-eye-line"
          variant="text"
          @click="openMarks(item)"
        />
        <VBtn
          icon="ri-pencil-line"
          variant="text"
          @click="openEditDialog(item)"
        />
        <VBtn
          icon="ri-delete-bin-6-line"
          variant="text"
          :loading="deleting === item.id"
          color="error"
          @click="deleteStudent(item.id)"
        />
      </template>
    </VDataTable>

    <VDialog
      v-model="importDialog"
      max-width="780"
    >
      <VCard>
        <VCardTitle>Import students from XLSX</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Required columns: <code>studentId</code>/<code>id</code> and <code>fullName</code>. Optional
            <code>grade</code> column will match existing grade names.
          </p>
          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="importForm.studyYearId"
                :items="years"
                item-title="name"
                item-value="id"
                label="Study year"
                required
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="importForm.gradeId"
                :items="grades"
                item-title="name"
                item-value="id"
                label="Grade (apply to all rows)"
                clearable
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSwitch
                v-model="importForm.updateExisting"
                label="Update existing students"
                inset
              />
            </VCol>
          <VCol
            cols="12"
            md="6"
            class="d-flex align-center"
          >
            <VBtn
              variant="tonal"
              color="primary"
              @click="onPickImportFile"
            >
                Choose file
            </VBtn>
            <span class="ms-3 text-body-2 text-medium-emphasis">
              {{ importFileName || 'No file selected' }}
            </span>
          </VCol>
          <VCol
            cols="12"
            md="6"
            class="d-flex align-center"
          >
            <VBtn
              variant="outlined"
              color="secondary"
              :loading="importPasting"
              @click="pasteImportFromClipboard"
            >
              Paste from clipboard
            </VBtn>
            <span class="ms-3 text-body-2 text-medium-emphasis">
              Copy rows (with headers) from Excel/Sheets and click paste.
            </span>
          </VCol>
        </VRow>

          <VAlert
            v-if="importErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="pl-4 mb-0">
              <li
                v-for="err in importErrors"
                :key="err"
              >
                {{ err }}
              </li>
            </ul>
          </VAlert>

          <VCard
            v-if="importEntries.length"
            variant="outlined"
            class="mb-2"
          >
            <VCardText class="py-3">
              <div class="d-flex justify-space-between text-body-2">
                <span>Rows ready</span>
                <strong>{{ importEntries.length }}</strong>
              </div>
              <div class="d-flex justify-space-between text-body-2 text-medium-emphasis">
                <span>Duplicates merged</span>
                <span>{{ importSummary.duplicatesMerged }}</span>
              </div>
              <div class="d-flex justify-space-between text-body-2 text-medium-emphasis">
                <span>Invalid rows ignored</span>
                <span>{{ importSummary.invalid }}</span>
              </div>
              <div class="text-body-2 text-medium-emphasis mt-2">
                Existing students will {{ importForm.updateExisting ? 'be updated' : 'be skipped' }}.
              </div>
            </VCardText>
          </VCard>
          <div
            v-else
            class="text-body-2 text-medium-emphasis"
          >
            Choose a file to preview rows before importing.
          </div>
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
            :loading="importSubmitting"
            :disabled="!importEntries.length || !importForm.studyYearId"
            @click="submitImport"
          >
            Import
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="dialog"
      max-width="500"
      persistent
    >
      <VCard>
        <VCardTitle>{{ editingId ? 'Edit student' : 'Add new student' }}</VCardTitle>
        <VCardText>
          <VForm @submit.prevent="saveStudent">
            <VTextField
              v-model="form.id"
              label="Student ID"
              required
            />
            <VTextField
              v-model="form.fullName"
              label="Full name"
              class="mt-4"
              required
            />
            <VSelect
              v-model="form.gradeId"
              :items="grades"
              item-title="name"
              item-value="id"
              label="Grade"
              class="mt-4"
              clearable
            />
            <VSelect
              v-model="form.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              class="mt-4"
              :disabled="!!editingId"
              required
            />
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="dialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            @click="saveStudent"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar.visible"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.text }}
    </VSnackbar>

    <VDialog
      v-model="marksDialog"
      max-width="720"
    >
      <VCard>
        <VCardTitle>
          {{ selectedMarks?.name }} ({{ selectedMarks?.grade || 'No grade' }}) — Marks & Monitoring
        </VCardTitle>
        <VCardText>
          <h4 class="text-subtitle-1 mb-2">
            Marks
          </h4>
          <VTable density="comfortable">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Quarter</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="mark in selectedMarks?.marks"
                :key="mark.subject + mark.quarter"
              >
                <td>{{ mark.subject }}</td>
                <td>{{ mark.quarter }}</td>
                <td>{{ mark.score }}</td>
              </tr>
              <tr v-if="!selectedMarks?.marks?.length">
                <td
                  colspan="3"
                  class="text-center text-medium-emphasis"
                >
                  No marks yet.
                </td>
              </tr>
            </tbody>
          </VTable>

          <h4 class="text-subtitle-1 mt-6 mb-2">
            Monitoring
          </h4>
          <VTable density="comfortable">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Month</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="monitor in selectedMarks?.monitoring"
                :key="monitor.subject + monitor.month"
              >
                <td>{{ monitor.subject }}</td>
                <td>{{ monitor.month }}</td>
                <td>{{ monitor.score }}</td>
              </tr>
              <tr v-if="!selectedMarks?.monitoring?.length">
                <td
                  colspan="3"
                  class="text-center text-medium-emphasis"
                >
                  No monitoring entries.
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="marksDialog = false">
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
