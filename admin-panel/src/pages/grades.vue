<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api from '@/utils/api'
import type { Grade } from '@/utils/types'

const grades = ref<Grade[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const selectedGrade = ref<Grade | null>(null)
const errorMessage = ref('')

const form = reactive({
  name: '',
})

const fetchGrades = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<Grade[]>('/api/grades')
    grades.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load grades.'
  } finally {
    loading.value = false
  }
}

const openDialog = (grade?: Grade) => {
  selectedGrade.value = grade || null
  form.name = grade?.name || ''
  dialog.value = true
}

const saveGrade = async () => {
  if (!form.name) return
  saving.value = true
  try {
    if (selectedGrade.value) {
      await api.put(`/api/grades/${selectedGrade.value.id}`, { name: form.name })
    } else {
      await api.post('/api/grades', { name: form.name })
    }
    dialog.value = false
    await fetchGrades()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save grade.'
  } finally {
    saving.value = false
  }
}

const deleteGrade = async (grade: Grade) => {
  if (!confirm(`Delete grade "${grade.name}"?`)) return
  try {
    await api.delete(`/api/grades/${grade.id}`)
    await fetchGrades()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to delete grade.'
  }
}

onMounted(fetchGrades)
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h5 mb-1">
          Grades
        </h2>
        <p class="text-medium-emphasis">
          Define the grades/classes students belong to.
        </p>
      </div>
      <div class="d-flex gap-3">
        <VBtn
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="fetchGrades"
        >
          Refresh
        </VBtn>
        <VBtn
          color="primary"
          @click="openDialog()"
        >
          New grade
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
          <th>Students</th>
          <th class="text-right">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="grade in grades"
          :key="grade.id"
        >
          <td>{{ grade.name }}</td>
          <td>{{ grade._count?.students ?? 0 }}</td>
          <td class="text-right">
            <VBtn
              icon="ri-pencil-line"
              variant="text"
              @click="openDialog(grade)"
            />
            <VBtn
              icon="ri-delete-bin-6-line"
              variant="text"
              color="error"
              @click="deleteGrade(grade)"
            />
          </td>
        </tr>
        <tr v-if="!grades.length">
          <td
            colspan="3"
            class="text-center text-medium-emphasis"
          >
            No grades yet.
          </td>
        </tr>
      </tbody>
    </VTable>

    <VDialog
      v-model="dialog"
      max-width="420"
      persistent
    >
      <VCard>
        <VCardTitle>
          {{ selectedGrade ? 'Edit grade' : 'New grade' }}
        </VCardTitle>
        <VCardText>
          <VTextField
            v-model="form.name"
            label="Name"
            autofocus
            required
          />
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
            @click="saveGrade"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
