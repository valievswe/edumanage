<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/utils/api'
import type { Mark, Monitoring, Student, Subject, StudyYear } from '@/utils/types'

const loading = ref(false)
const errorMessage = ref('')
type Stats = {
  students: number
  subjects: number
  years: number
  marks: number
  monitoring: number
}

const stats = ref<Stats>({
  students: 0,
  subjects: 0,
  years: 0,
  marks: 0,
  monitoring: 0,
})
const gradeCounts = ref<Record<string, number>>({})
const latestStudents = ref<Student[]>([])
const latestMarks = ref<Mark[]>([])

const statCards: Array<{ key: keyof Stats; label: string; icon: string }> = [
  { key: 'students', label: 'Students', icon: 'ri-team-line' },
  { key: 'subjects', label: 'Subjects', icon: 'ri-book-line' },
  { key: 'years', label: 'Study years', icon: 'ri-timer-line' },
  { key: 'marks', label: 'Marks', icon: 'ri-bar-chart-line' },
  { key: 'monitoring', label: 'Monitoring entries', icon: 'ri-pulse-line' },
]

const getStatValue = (key: keyof Stats) => stats.value[key]

const fetchDashboard = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [studentsRes, subjectsRes, yearsRes, monitoringRes, marksRes] = await Promise.all([
      api.get<Student[]>('/api/students'),
      api.get<Subject[]>('/api/subjects'),
      api.get<StudyYear[]>('/api/years'),
      api.get<Monitoring[]>('/api/monitoring'),
      api.get<Mark[]>('/api/marks'),
    ])

    const students = studentsRes.data
    const marks = marksRes.data

    stats.value = {
      students: students.length,
      subjects: subjectsRes.data.length,
      years: yearsRes.data.length,
      monitoring: monitoringRes.data.length,
      marks: marks.length,
    }

    latestStudents.value = students.slice(0, 5)
    latestMarks.value = marks.slice(0, 5)

    const counts: Record<string, number> = {}
    students.forEach(student => {
      const grade = (student.grade?.name || 'Unknown').toUpperCase()
      counts[grade] = (counts[grade] || 0) + 1
    })
    gradeCounts.value = counts
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Unable to load dashboard data.'
  } finally {
    loading.value = false
  }
}

const formatDate = (value: string) => new Date(value).toLocaleDateString()

onMounted(fetchDashboard)
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h2 class="text-h4 mb-1">
          Welcome back
        </h2>
        <p class="text-medium-emphasis">
          Keep track of students, marks, and study years from a single dashboard.
        </p>
      </div>

      <div class="d-flex gap-3">
        <VBtn
          color="primary"
          :loading="loading"
          @click="fetchDashboard"
        >
          Refresh data
        </VBtn>
      </div>
    </div>

    <VAlert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      {{ errorMessage }}
    </VAlert>

    <VRow>
      <VCol
        v-for="card in statCards"
        :key="card.key"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <VCard>
          <VCardText class="d-flex justify-space-between align-center">
            <div>
              <p class="text-caption text-uppercase text-medium-emphasis mb-1">
                {{ card.label }}
              </p>
              <h3 class="text-h4 mb-0">
                {{ getStatValue(card.key) }}
              </h3>
            </div>
            <VAvatar
              color="primary"
              variant="tonal"
              size="40"
            >
              <VIcon :icon="card.icon" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-2">
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardTitle>Students by grade</VCardTitle>
          <VDivider />
          <VList>
            <VListItem
              v-for="(count, grade) in gradeCounts"
              :key="grade"
            >
              <VListItemTitle>{{ grade }}</VListItemTitle>
              <VListItemSubtitle>{{ count }} students</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="!Object.keys(gradeCounts).length">
              <VListItemTitle class="text-medium-emphasis">
                No grade data yet.
              </VListItemTitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardTitle>
            Recently added students
          </VCardTitle>
          <VDivider />
          <VList>
            <VListItem
              v-for="student in latestStudents"
              :key="student.id"
            >
              <VListItemTitle>{{ student.fullName }}</VListItemTitle>
              <VListItemSubtitle>
                Grade: {{ student.grade?.name || '—' }} • Joined: {{ formatDate(student.createdAt) }}
              </VListItemSubtitle>
            </VListItem>
            <VListItem
              v-if="!latestStudents.length"
              class="text-medium-emphasis"
            >
              No students yet.
            </VListItem>
          </VList>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardTitle>
            Latest marks
          </VCardTitle>
          <VDivider />
          <VList>
            <VListItem
              v-for="mark in latestMarks"
              :key="mark.id"
            >
              <VListItemTitle>
                {{ mark.student.fullName }} — {{ mark.score }}
              </VListItemTitle>
              <VListItemSubtitle>
                {{ mark.subject.name }} • {{ mark.quarter.name }} • {{ formatDate(mark.createdAt) }}
              </VListItemSubtitle>
            </VListItem>
            <VListItem
              v-if="!latestMarks.length"
              class="text-medium-emphasis"
            >
              No marks recorded yet.
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
