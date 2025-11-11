<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/utils/api'
import type { Grade, Student, StudentMarksResponse, StudyYear } from '@/utils/types'

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
  try {
    await api.delete(`/api/students/${studentId}`)
    await fetchStudents()
    showSnackbar('Student deleted')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to delete student.'
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
          color="primary"
          @click="openCreateDialog"
        >
          New student
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
              :disabled="!!editingId"
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
