<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; disabled?: boolean; maxlength?: number; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; confirm: [] }>()
const input = ref<HTMLTextAreaElement>()
function resize() {
  if (!input.value) return
  input.value.style.height = '0px'
  input.value.style.height = `${Math.min(120, Math.max(44, input.value.scrollHeight))}px`
}
function handleInput(event: Event) { emit('update:modelValue', (event.target as HTMLTextAreaElement).value) }
function handleKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  if (!props.disabled) emit('confirm')
}
watch(() => props.modelValue, () => { void nextTick(resize) })
onMounted(() => { resize(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => window.removeEventListener('resize', resize))
</script>

<template>
  <component :is="'textarea'" ref="input" :value="modelValue" :disabled="disabled" :maxlength="maxlength" :placeholder="placeholder" rows="1" aria-label="输入聊天消息" @input="handleInput" @keydown="handleKey" />
</template>
