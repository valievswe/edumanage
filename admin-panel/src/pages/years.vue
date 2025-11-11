<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api from '@/utils/api'
import type { StudyYear } from '@/utils/types'

const years = ref<StudyYear[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const editingYear = ref<StudyYear | null>(null)

const quarterDialog = ref(false)
const quarterSaving = ref(false)
const selectedYearId = ref<number | null>(null)

const form = reactive({
  name: '',
  startDate: '',
  endDate: '',
})

const quarterForm = reactive({
  name: '',
  startDate: '',
  endDate: '',
})

const fetchYears = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<StudyYear[]>('/api/years')
    years.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load study years.'
  } finally {
    loading.value = false
  }
}

const resetYearForm = () => {
  form.name = ''
  form.startDate = ''
  form.endDate = ''
}

const openYearDialog = (year?: StudyYear) => {
  editingYear.value = year ?? null
  if (year) {
    form.name = year.name
    form.startDate = year.startDate.substring(0, 10)
    form.endDate = year.endDate.substring(0, 10)
  } else {
    resetYearForm()
  }
  dialog.value = true
}

const saveYear = async () => {
  if (!form.name || !form.startDate || !form.endDate) return
  saving.value = true
  try {
    if (editingYear.value) {
      await api.put(`/api/years/${editingYear.value.id}`, { ...form })
    } else {
      await api.post('/api/years', { ...form })
    }
    dialog.value = false
    editingYear.value = null
    resetYearForm()
    await fetchYears()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save study year.'
  } finally {
    saving.value = false
  }
}

const deleteYear = async (year: StudyYear) => {
  if (!confirm(`Delete study year "${year.name}"?`)) return
  try {
    await api.delete(`/api/years/${year.id}`)
    await fetchYears()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to delete study year.'
  }
}

const openQuarterDialog = (yearId: number) => {
  selectedYearId.value = yearId
  quarterForm.name = ''
  quarterForm.startDate = ''
  quarterForm.endDate = ''
  quarterDialog.value = true
}

const saveQuarter = async () => {
  if (!selectedYearId.value || !quarterForm.name) return
  quarterSaving.value = true
  try {
    await api.post('/api/quarters', {
      studyYearId: selectedYearId.value,
      name: quarterForm.name,
      startDate: quarterForm.startDate || undefined,
      endDate: quarterForm.endDate || undefined,
    })
    quarterDialog.value = false
    await fetchYears()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to create quarter.'
  } finally {
    quarterSaving.value = false
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString()

onMounted(fetchYears)
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h5 mb-1">
          Study years
        </h2>
        <p class="text-medium-emphasis">
          Add custom ranges to group students, quarters, and monitoring entries.
        </p>
      </div>
      <div class="d-flex gap-3">
        <VBtn
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="fetchYears"
        >
          Refresh
        </VBtn>
        <VBtn
          color="primary"
          @click="openYearDialog()"
        >
          New study year
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

    <VTable class="elevation-1">
      <thead>
        <tr>
          <th>Name</th>
          <th>Start</th>
          <th>End</th>
          <th>Quarters</th>
          <th class="text-right">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="year in years"
          :key="year.id"
        >
          <td>{{ year.name }}</td>
          <td>{{ formatDate(year.startDate) }}</td>
          <td>{{ formatDate(year.endDate) }}</td>
          <td>
            <VChip
              v-for="quarter in year.quarters"
              :key="quarter.id"
              class="me-2 mb-2"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ quarter.name }}
            </VChip>
            <span v-if="!year.quarters?.length" class="text-medium-emphasis">No quarters</span>
          </td>
          <td class="text-right">
            <VBtn
              variant="text"
              icon="ri-pencil-line"
              class="me-2"
              @click="openYearDialog(year)"
            />
            <VBtn
              variant="text"
              icon="ri-add-line"
              class="me-2"
              @click="openQuarterDialog(year.id)"
            />
            <VBtn
              icon="ri-delete-bin-6-line"
              variant="text"
              color="error"
              @click="deleteYear(year)"
            />
          </td>
        </tr>
        <tr v-if="!years.length">
          <td
            colspan="4"
            class="text-center text-medium-emphasis"
          >
            No study years defined.
          </td>
        </tr>
      </tbody>
    </VTable>

    <VDialog
      v-model="dialog"
      max-width="480"
    >
      <VCard>
        <VCardTitle>{{ editingYear ? 'Edit study year' : 'New study year' }}</VCardTitle>
        <VCardText>
          <VForm @submit.prevent="saveYear">
            <VTextField
              v-model="form.name"
              label="Name"
              placeholder="2024 / 2025"
              required
            />
            <VTextField
              v-model="form.startDate"
              label="Start date"
              type="date"
              class="mt-4"
              required
            />
            <VTextField
              v-model="form.endDate"
              label="End date"
              type="date"
              class="mt-4"
              required
            />
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="() => { dialog = false; editingYear = null }"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            @click="saveYear"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="quarterDialog"
      max-width="480"
    >
      <VCard>
        <VCardTitle>New quarter</VCardTitle>
        <VCardText>
          <VForm @submit.prevent="saveQuarter">
            <VTextField
              v-model="quarterForm.name"
              label="Name"
              placeholder="Quarter 1"
              required
            />
            <VTextField
              v-model="quarterForm.startDate"
              label="Start date"
              type="date"
              class="mt-4"
            />
            <VTextField
              v-model="quarterForm.endDate"
              label="End date"
              type="date"
              class="mt-4"
            />
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="quarterDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="quarterSaving"
            @click="saveQuarter"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
