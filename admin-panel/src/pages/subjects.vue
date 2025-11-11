<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api from '@/utils/api'
import type { Subject } from '@/utils/types'

const subjects = ref<Subject[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const selectedSubject = ref<Subject | null>(null)
const form = reactive({
  name: '',
})
const errorMessage = ref('')

const fetchSubjects = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get<Subject[]>('/api/subjects')
    subjects.value = data
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load subjects.'
  } finally {
    loading.value = false
  }
}

const openDialog = (subject?: Subject) => {
  selectedSubject.value = subject || null
  form.name = subject?.name || ''
  dialog.value = true
}

const saveSubject = async () => {
  if (!form.name) return
  saving.value = true
  try {
    if (selectedSubject.value) {
      await api.put(`/api/subjects/${selectedSubject.value.id}`, { name: form.name })
    } else {
      await api.post('/api/subjects', { name: form.name })
    }
    dialog.value = false
    await fetchSubjects()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to save subject.'
  } finally {
    saving.value = false
  }
}

const deleteSubject = async (subject: Subject) => {
  if (!confirm(`Delete subject "${subject.name}"?`)) return
  try {
    await api.delete(`/api/subjects/${subject.id}`)
    await fetchSubjects()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to delete subject.'
  }
}

onMounted(fetchSubjects)
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h5 mb-1">
          Subjects
        </h2>
        <p class="text-medium-emphasis">
          Keep the subject catalogue up to date for mark entry and monitoring.
        </p>
      </div>
      <div class="d-flex gap-3">
        <VBtn
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="fetchSubjects"
        >
          Refresh
        </VBtn>
        <VBtn
          color="primary"
          @click="openDialog()"
        >
          New subject
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
          <th class="text-left">
            Name
          </th>
          <th class="text-right">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="subject in subjects"
          :key="subject.id"
        >
          <td>{{ subject.name }}</td>
          <td class="text-right">
            <VBtn
              icon="ri-pencil-line"
              variant="text"
              @click="openDialog(subject)"
            />
            <VBtn
              icon="ri-delete-bin-6-line"
              variant="text"
              color="error"
              @click="deleteSubject(subject)"
            />
          </td>
        </tr>
        <tr v-if="!subjects.length">
          <td
            colspan="2"
            class="text-center text-medium-emphasis"
          >
            No subjects yet.
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
          {{ selectedSubject ? 'Edit subject' : 'New subject' }}
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
            @click="saveSubject"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
