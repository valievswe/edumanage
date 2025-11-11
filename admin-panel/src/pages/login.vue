<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/utils/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const credentials = reactive({
  email: '',
  password: '',
})

const isPasswordVisible = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    await authStore.login(credentials)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Unable to sign in. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <VCard class="auth-card pa-6">
      <VCardTitle class="text-h5 pb-2">
        Admin Sign In
      </VCardTitle>
      <VCardSubtitle class="text-body-2 pb-4">
        Use the credentials configured in your backend to access the panel.
      </VCardSubtitle>

      <VAlert
        v-if="errorMessage"
        type="error"
        class="mb-4"
        variant="tonal"
      >
        {{ errorMessage }}
      </VAlert>

      <VForm @submit.prevent="handleSubmit">
        <VTextField
          v-model="credentials.email"
          label="Email"
          type="email"
          prepend-inner-icon="ri-mail-line"
          required
        />

        <VTextField
          v-model="credentials.password"
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          prepend-inner-icon="ri-lock-line"
          :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
          class="mt-4"
          required
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
        />

        <VBtn
          class="mt-6"
          block
          color="primary"
          type="submit"
          :loading="loading"
        >
          Sign in
        </VBtn>
      </VForm>
    </VCard>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.2), transparent),
    radial-gradient(circle at bottom, rgba(59, 130, 246, 0.15), transparent);
}

.auth-card {
  width: min(420px, 100%);
}
</style>
