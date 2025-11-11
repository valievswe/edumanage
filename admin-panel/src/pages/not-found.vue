<template>
  <div class="not-found">
    <VIcon
      icon="ri-error-warning-line"
      size="64"
      color="primary"
      class="mb-4"
    />
    <h2 class="text-h4 mb-2">
      Page not found
    </h2>
    <p class="text-medium-emphasis mb-6">
      The page you are looking for doesn’t exist or was removed.
    </p>
    <VBtn
      color="primary"
      to="/dashboard"
    >
      Back to dashboard
    </VBtn>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.75rem;
}
</style>
