<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api from '@/utils/api'
import type { Grade, Monitoring, Student, Subject, StudyYear } from '@/utils/types'

const monitoring = ref<Monitoring[]>([])
const students = ref<Student[]>([])
const subjects = ref<Subject[]>([])
const years = ref<StudyYear[]>([])
const grades = ref<Grade[]>([])

const loading = ref(false)
const optionsLoading = ref(false)
const errorMessage = ref('')

const createDialog = ref(false)
const createLoading = ref(false)
const editDialog = ref(false)
const editLoading = ref(false)
const editingEntry = ref<Monitoring | null>(null)

const createForm = reactive({
  studentId: '',
  subjectId: null as number | null,
  studyYearId: null as number | null,
  month: '',
  score: 0,
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

const fetchMonitoring = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<Monitoring[]>('/api/monitoring', {
      params: {
        search: filters.search || undefined,
        gradeId: filters.gradeId || undefined,
        studyYearId: filters.studyYearId || undefined,
      },
    })
    monitoring.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load monitoring entries.'
  } finally {
    loading.value = false
  }
}

const fetchOptions = async () => {
  optionsLoading.value = true
  if (!loading.value) errorMessage.value = ''
  const errors: string[] = []
  try {
    const [studentsRes, subjectsRes, yearsRes, gradesRes] = await Promise.allSettled([
      api.get<Student[]>('/api/students'),
      api.get<Subject[]>('/api/subjects'),
      api.get<StudyYear[]>('/api/years'),
      api.get<Grade[]>('/api/grades'),
    ])

    if (studentsRes.status === 'fulfilled') {
      students.value = studentsRes.value.data
    } else {
      console.error('Failed to load students', studentsRes.reason)
      errors.push('students')
    }

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

const resetForm = () => {
  createForm.studentId = ''
  createForm.subjectId = null
  createForm.studyYearId = null
  createForm.month = ''
  createForm.score = 0
}

const openEditDialog = (entry: Monitoring) => {
  editingEntry.value = entry
  editForm.subjectId = entry.subject.id
  editForm.studyYearId = entry.studyYear.id
  editForm.month = entry.month
  editForm.score = entry.score
  editDialog.value = true
}

const createMonitoringEntry = async () => {
  if (!createForm.studentId || !createForm.subjectId || !createForm.studyYearId || !createForm.month) return
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
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to create monitoring entry.'
  } finally {
    createLoading.value = false
  }
}

const updateMonitoringEntry = async () => {
  if (!editingEntry.value) return
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
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to update entry.'
  } finally {
    editLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchMonitoring(), fetchOptions()])
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
        </VRow>
      </VCardText>
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
      <template #item.year="{ item }">
        {{ item.studyYear.name }}
      </template>
      <template #item.actions="{ item }">
        <VBtn
          icon="ri-pencil-line"
          variant="text"
          @click="openEditDialog(item)"
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
              v-model="createForm.studentId"
              :items="students"
              item-title="fullName"
              item-value="id"
              label="Student"
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
              v-model="createForm.studyYearId"
              :items="years"
              item-title="name"
              item-value="id"
              label="Study year"
              class="mt-4"
              required
            />
            <VTextField
              v-model="createForm.month"
              type="month"
              label="Month"
              class="mt-4"
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
            <VTextField
              v-model="editForm.month"
              type="month"
              label="Month"
              class="mt-4"
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
  </div>
</template>
