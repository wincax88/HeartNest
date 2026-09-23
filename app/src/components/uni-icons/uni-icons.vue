<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ type?: string; size?: number | string; color?: string }>(), {
  type: '', size: 24, color: 'currentColor',
})

const glyphs: Record<string, string> = {
  'heart-filled': '♥',
  'home-filled': '⌂',
  'person-filled': '●',
  'cloud-filled': '☁',
  'calendar-filled': '▣',
  calendar: '▣',
  'fire-filled': '◆',
  'vip-filled': '♛',
  'star-filled': '★',
  'gear-filled': '⚙',
  'checkbox-filled': '✓',
  'chatboxes-filled': '◌',
  'paperplane-filled': '➤',
  'sound-filled': '◖',
  list: '≡',
  left: '‹',
  right: '›',
}

const glyph = computed(() => glyphs[props.type] ?? '•')
const fontSize = computed(() => `${Number(props.size) || 24}px`)
</script>

<template>
  <text class="hn-icon" :style="{ color, fontSize }" aria-hidden="true">{{ glyph }}</text>
</template>

<style scoped>
.hn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}
</style>
