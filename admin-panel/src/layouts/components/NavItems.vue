<script lang="ts" setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
</script>

<template>
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'ri-dashboard-line',
      to: '/dashboard',
    }"
  />

  <VerticalNavSectionTitle
    :item="{
      heading: 'Management',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Students',
      icon: 'ri-team-line',
      to: '/students',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Subjects',
      icon: 'ri-book-line',
      to: '/subjects',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Grades',
      icon: 'ri-honour-line',
      to: '/grades',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Study Years',
      icon: 'ri-timer-line',
      to: '/years',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Marks',
      icon: 'ri-bar-chart-2-line',
      to: '/marks',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Monitoring',
      icon: 'ri-pulse-line',
      to: '/monitoring',
    }"
  />

  <VerticalNavSectionTitle
    :item="{
      heading: 'System',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Profile',
      icon: 'ri-user-settings-line',
      to: '/dashboard',
    }"
  />
</template>
