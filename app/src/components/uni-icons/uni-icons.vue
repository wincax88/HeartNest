<script setup lang="ts">
import HnIcon from '../HnIcon.vue'

withDefaults(defineProps<{
  type?: string
  size?: number | string
  color?: string
  label?: string
  decorative?: boolean
}>(), {
  type: 'heart-filled',
  size: 24,
  color: 'currentColor',
  label: '',
  decorative: true,
})
</script>

<template>
  <HnIcon :name="type" :size="size" :color="color" :label="label" :decorative="decorative" />
</template>

<style scoped>
:deep(.hn-icon) { display: block; }
</style>
