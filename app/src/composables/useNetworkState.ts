import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useNetworkState() {
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const handleStatus = (status: { isConnected: boolean }) => { online.value = status.isConnected }

  onMounted(() => {
    uni.getNetworkType?.({ success: ({ networkType }) => { online.value = networkType !== 'none' } })
    uni.onNetworkStatusChange?.(handleStatus)
  })
  onBeforeUnmount(() => uni.offNetworkStatusChange?.(handleStatus))

  return { online }
}
