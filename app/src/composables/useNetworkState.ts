import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useNetworkState() {
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const handleStatus = (status: { isConnected: boolean }) => {
    online.value = status.isConnected
    // #ifdef H5
    if (typeof navigator !== 'undefined') online.value = status.isConnected && navigator.onLine
    // #endif
  }
  const handleBrowserStatus = () => { online.value = navigator.onLine }

  onMounted(() => {
    uni.getNetworkType?.({ success: ({ networkType }) => handleStatus({ isConnected: networkType !== 'none' }) })
    uni.onNetworkStatusChange?.(handleStatus)
    // #ifdef H5
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleBrowserStatus)
      window.addEventListener('offline', handleBrowserStatus)
    }
    // #endif
  })
  onBeforeUnmount(() => {
    uni.offNetworkStatusChange?.(handleStatus)
    // #ifdef H5
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleBrowserStatus)
      window.removeEventListener('offline', handleBrowserStatus)
    }
    // #endif
  })

  return { online }
}
