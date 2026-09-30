<script setup lang="ts">
import { computed } from 'vue'
import OfficialUniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
import HnIcon from '../HnIcon.vue'

const props = withDefaults(defineProps<{
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

const miniProgramType = computed(() => props.type === 'cloud-filled' ? 'cloud-upload-filled' : props.type)
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <OfficialUniIcons
    :type="miniProgramType"
    :size="props.size"
    :color="props.color"
    :role="props.decorative ? undefined : 'img'"
    :aria-label="props.decorative ? undefined : (props.label || props.type)"
    :aria-hidden="props.decorative ? 'true' : undefined"
  />
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <HnIcon :name="props.type" :size="props.size" :color="props.color" :label="props.label" :decorative="props.decorative" />
  <!-- #endif -->
</template>

<style scoped>
:deep(.hn-icon) { display: block; }
</style>
