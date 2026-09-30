<script setup lang="ts">
import { computed } from 'vue'
import { iconPaths } from './icons/paths'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  color?: string
  label?: string
  decorative?: boolean
}>(), {
  size: 24,
  color: 'currentColor',
  label: '',
  decorative: false,
})

const paths = computed(() => iconPaths[props.name] ?? iconPaths['heart-filled'])
const pixelSize = computed(() => `${Number(props.size) || 24}px`)
</script>

<template>
  <svg
    class="hn-icon"
    viewBox="0 0 24 24"
    :width="pixelSize"
    :height="pixelSize"
    :style="{ color }"
    fill="currentColor"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : (label || name)"
    :aria-hidden="decorative ? 'true' : undefined"
    focusable="false"
  >
    <path v-for="path in paths" :key="path" :d="path" />
  </svg>
</template>

<style scoped>
.hn-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
</style>
