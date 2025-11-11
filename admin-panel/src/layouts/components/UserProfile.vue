<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/utils/authStore'

const router = useRouter()
const authStore = useAuthStore()

const adminName = computed(() => authStore.admin?.username || 'Admin')
const adminEmail = computed(() => authStore.admin?.email || 'admin@example.com')
const initials = computed(() => adminName.value.slice(0, 2).toUpperCase())

const handleLogout = () => {
  authStore.logout()
  router.push({ path: '/login' })
}
</script>

<template>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    color="success"
    bordered
  >
    <VAvatar
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      {{ initials }}

      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="primary"
                    variant="tonal"
                  >
                    {{ initials }}
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ adminName }}
            </VListItemTitle>
            <VListItemSubtitle>{{ adminEmail }}</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />

          <VListItem
            link
            to="/dashboard"
          >
            <template #prepend>
              <VIcon
                class="me-2"
                icon="ri-user-line"
                size="22"
              />
            </template>

            <VListItemTitle>Dashboard</VListItemTitle>
          </VListItem>

          <VListItem
            link
            to="/students"
          >
            <template #prepend>
              <VIcon
                class="me-2"
                icon="ri-team-line"
                size="22"
              />
            </template>

            <VListItemTitle>Students</VListItemTitle>
          </VListItem>

          <VDivider class="my-2" />

          <VListItem @click="handleLogout">
            <template #prepend>
              <VIcon
                class="me-2"
                icon="ri-logout-box-r-line"
                size="22"
              />
            </template>

            <VListItemTitle>Logout</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
    </VAvatar>
  </VBadge>
</template>
