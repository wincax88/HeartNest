<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useBootstrapStore } from '@/stores/bootstrap'
import { hasStoredSession } from '@/services/api'

onLaunch(() => {
  if (!hasStoredSession()) return
  useBootstrapStore().initialize().catch(() => {
    uni.showToast({ title: '无法连接 HeartNest 服务', icon: 'none' })
  })
})
</script>

<style lang="scss">
@use './styles/global.scss';
</style>
