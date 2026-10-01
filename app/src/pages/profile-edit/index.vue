<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
// #ifdef H5
import { defineComponent, h } from 'vue'
// Render the browser's input directly so its accessible label reaches the editable control.
const BrowserNicknameInput = defineComponent({ inheritAttrs: false, setup: (_, { attrs }) => () => h('input', attrs) })
// #endif
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import { api } from '@/services/api'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useProfileStore } from '@/stores/profile'

const store = useProfileStore()
const bootstrap = useBootstrapStore()
const displayName = ref('')
const avatarPreview = ref('')
const uploadedAvatarUrl = ref<string>()
const avatarFailed = ref(false)
const uploading = ref(false)
const choosing = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const nicknameRejected = ref(false)
let isWechat = false
const pageStyle: { paddingTop?: string } = {}
// #ifdef MP-WEIXIN
isWechat = true
const capsule = uni.getMenuButtonBoundingClientRect?.()
if (capsule?.bottom > 0) pageStyle.paddingTop = `${capsule.bottom + 12}px`
// #endif
const nativeAvatar = isWechat && (uni.canIUse?.('button.open-type.chooseAvatar') ?? true)
const nativeNickname = isWechat && (uni.canIUse?.('input.type.nickname') ?? true)
const busy = computed(() => uploading.value || choosing.value || saving.value)
const saveLabel = computed(() => uploading.value ? '头像上传中…' : saving.value ? '正在保存…' : '保存资料')
watch(avatarPreview, () => { avatarFailed.value = false })
onMounted(loadProfile)

async function loadProfile() {
  try {
    await bootstrap.initialize()
    displayName.value = store.profile.displayName
    avatarPreview.value = store.profile.avatar || ''
  } catch { /* The loading state offers a retry. */ }
}

function editNickname(event: Event | { detail?: { value?: string } }) {
  const value = (event as { detail?: { value?: string } }).detail?.value ?? ((event as Event).target as HTMLInputElement | null)?.value
  if (typeof value !== 'string' || value === displayName.value) return
  displayName.value = value
  nicknameRejected.value = false
  errorMessage.value = ''
}

function reviewNickname(event: { detail?: { pass?: boolean } }) {
  nicknameRejected.value = event.detail?.pass === false
  errorMessage.value = nicknameRejected.value ? '这个昵称暂时无法使用，请换一个再试。' : ''
}

async function uploadAvatar(filePath: string, size?: number) {
  if (!filePath || busy.value) return
  if (size && size > 2 * 1024 * 1024) { errorMessage.value = '请选择不超过 2 MB 的图片'; return }
  const previous = avatarPreview.value
  uploading.value = true
  errorMessage.value = ''
  avatarPreview.value = filePath
  try {
    const result = await api.uploadAvatar(filePath)
    uploadedAvatarUrl.value = result.avatarUrl
  } catch (error) {
    avatarPreview.value = previous
    errorMessage.value = error instanceof Error ? error.message : '头像上传失败，请重试'
  } finally { uploading.value = false }
}

function chooseWechatAvatar(event: { detail?: { avatarUrl?: string } }) {
  if (event.detail?.avatarUrl) void uploadAvatar(event.detail.avatarUrl)
}

function chooseAvatar() {
  if (nativeAvatar || busy.value) return
  choosing.value = true
  errorMessage.value = ''
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success(result) {
      choosing.value = false
      const files = result.tempFiles
      const size = Array.isArray(files) ? files[0]?.size : undefined
      void uploadAvatar(result.tempFilePaths[0], size)
    },
    fail(error) {
      if (!error.errMsg?.toLowerCase().includes('cancel')) errorMessage.value = '暂时无法选择图片，请重试'
    },
    complete() { choosing.value = false },
  })
}

async function save(event?: Event | { detail?: { value?: { displayName?: string } } }) {
  if (busy.value || !bootstrap.loaded || nicknameRejected.value) return
  const name = ((event as { detail?: { value?: { displayName?: string } } })?.detail?.value?.displayName ?? displayName.value).trim()
  displayName.value = name
  if (!name || name.length > 30) { errorMessage.value = '请输入 1–30 个字符的昵称'; return }
  saving.value = true
  errorMessage.value = ''
  try {
    await store.updateProfile({ displayName: name, ...(uploadedAvatarUrl.value ? { avatarUrl: uploadedAvatarUrl.value } : {}) })
    uni.showToast({ title: '资料已保存', icon: 'success' })
    goBack()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败，请重试'
  } finally { saving.value = false }
}

function goBack() {
  if (typeof getCurrentPages === 'function' && getCurrentPages().length < 2) {
    uni.reLaunch({ url: '/pages/profile/index' })
    return
  }
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/profile/index' }) })
}
</script>

<template>
  <view class="hn-screen edit-screen">
    <view class="hn-page edit-page" :style="pageStyle">
      <HnAppHeader title="编辑资料" subtitle="让这里更像你">
        <button class="back-button" type="button" role="button" :tabindex="busy ? -1 : 0" aria-label="返回" :disabled="busy" :aria-disabled="busy" @click="goBack" @keydown.enter.prevent="goBack" @keydown.space.prevent="goBack"><uni-icons type="left" :size="24" color="#eef0ff" /></button>
      </HnAppHeader>
      <HnAsyncState v-if="bootstrap.loading && !bootstrap.loaded" state="loading" title="正在载入个人资料…" />
      <HnAsyncState v-else-if="!bootstrap.loaded && bootstrap.error" state="error" title="暂时没能加载个人资料" :description="bootstrap.error" action-label="重新加载" @action="loadProfile" />
      <form v-else-if="bootstrap.loaded" class="profile-form" @submit="save">
        <view class="avatar-section">
          <button data-testid="choose-avatar" class="avatar-button" type="button" role="button" :tabindex="busy ? -1 : 0" :open-type="nativeAvatar ? 'chooseAvatar' : undefined" :disabled="busy" :aria-disabled="busy" aria-label="更换头像" @chooseavatar="chooseWechatAvatar" @click="chooseAvatar" @keydown.enter.prevent="chooseAvatar" @keydown.space.prevent="chooseAvatar">
            <view class="avatar-frame">
              <image v-if="avatarPreview && !avatarFailed" data-testid="avatar-preview" class="avatar-image" :src="avatarPreview" mode="aspectFill" aria-hidden="true" @error="avatarFailed = true" />
              <view v-else class="avatar-placeholder"><uni-icons type="person-filled" :size="38" color="#efc3dc" /></view>
              <view class="camera-badge"><uni-icons type="camera-filled" :size="16" color="#fff4fb" /></view>
            </view>
            <text class="avatar-action">{{ uploading ? '正在上传头像…' : '点击更换头像' }}</text>
          </button>
          <text class="avatar-hint">{{ nativeAvatar ? '选择微信头像，或从相册上传' : '从相册选择，或拍一张新照片' }}</text>
          <text class="file-hint">JPG / PNG / WebP · 2 MB 以内</text>
        </view>
        <view class="nickname-section">
          <view class="field-heading"><label for="profile-nickname" class="field-label">昵称</label><text class="field-limit">最多 30 字</text></view>
          <!-- #ifdef H5 -->
          <BrowserNicknameInput id="profile-nickname" data-testid="profile-nickname" name="displayName" class="nickname-input" type="text" :value="displayName" :disabled="busy" :maxlength="30" placeholder="想让我们怎么称呼你？" aria-label="昵称" aria-describedby="nickname-hint" :aria-invalid="nicknameRejected" @input="editNickname" @blur="editNickname" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <input id="profile-nickname" data-testid="profile-nickname" name="displayName" class="nickname-input" :type="nativeNickname ? 'nickname' : 'text'" :value="displayName" :disabled="busy" :maxlength="30" placeholder="想让我们怎么称呼你？" placeholder-class="nickname-placeholder" aria-label="昵称" aria-describedby="nickname-hint" :aria-invalid="nicknameRejected" @input="editNickname" @blur="editNickname" @nicknamereview="reviewNickname" />
          <!-- #endif -->
          <text id="nickname-hint" class="field-hint">{{ nativeNickname ? '点击输入框，可选择微信昵称，也可以自己填写。' : '取一个喜欢的名字，随时都可以更改。' }}</text>
        </view>
        <text v-if="errorMessage" data-testid="profile-error" class="form-error" role="alert">{{ errorMessage }}</text>
        <button data-testid="save-profile" class="save-button" type="button" role="button" :tabindex="busy || nicknameRejected ? -1 : 0" form-type="submit" :disabled="busy || nicknameRejected" :aria-disabled="busy || nicknameRejected" @keydown.enter.prevent="save()" @keydown.space.prevent="save()"><text>{{ saveLabel }}</text><uni-icons v-if="!busy" type="checkbox-filled" :size="20" color="#fff" /></button>
        <text class="save-hint">保存后，你的头像和昵称会更新在「我的」页面。</text>
      </form>
    </view>
  </view>
</template>

<style scoped lang="scss">
.edit-screen { background: #071126; }
.edit-page { padding-bottom: calc(60rpx + env(safe-area-inset-bottom)); }
.back-button { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 76rpx; height: 76rpx; margin: 0; padding: 0; border: 1rpx solid rgba(174, 186, 225, .12); border-radius: 50%; background: #14203b; line-height: 1; }
.profile-form { display: block; margin-top: 44rpx; }
.back-button::after, .avatar-button::after, .save-button::after { border: 0; }
.avatar-section { display: flex; flex-direction: column; align-items: center; padding: 40rpx 24rpx; border: 1rpx solid rgba(186, 196, 235, .17); border-radius: 32rpx; background: linear-gradient(145deg, #1c2949, #131e38); }
.avatar-button { display: flex; flex-direction: column; align-items: center; gap: 26rpx; width: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: #f0cae4; line-height: 1.5; }
.avatar-frame { position: relative; width: 152rpx; height: 152rpx; }
.avatar-image, .avatar-placeholder { width: 100%; height: 100%; border: 2rpx solid rgba(246, 205, 229, .35); border-radius: 48rpx; background: #303550; }
.avatar-placeholder { display: flex; align-items: center; justify-content: center; }
.camera-badge { position: absolute; right: -8rpx; bottom: -6rpx; display: flex; align-items: center; justify-content: center; width: 52rpx; height: 52rpx; border: 4rpx solid #192640; border-radius: 50%; background: #88699f; }
.avatar-action { font-size: 30rpx; font-weight: 600; }
.avatar-hint { margin-top: 12rpx; color: #c5cce1; font-size: 26rpx; line-height: 1.6; text-align: center; }
.file-hint { margin-top: 10rpx; color: #a9b4d0; font-size: 24rpx; line-height: 1.5; }
.nickname-section { margin-top: 44rpx; }
.field-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.field-label { color: #eef0fb; font-size: 30rpx; font-weight: 600; }
.field-limit { color: #afb9d3; font-size: 24rpx; }
.nickname-input { box-sizing: border-box; width: 100%; height: 96rpx; padding: 0 26rpx; border: 1rpx solid rgba(190, 200, 240, .3); border-radius: 22rpx; color: #fff; background: #1d2947; font-size: 30rpx; }
.nickname-placeholder, .nickname-input::placeholder { color: #a9b4cf; }
.field-hint { display: block; margin-top: 18rpx; color: #bbc4df; font-size: 26rpx; line-height: 1.7; }
.form-error { display: block; margin-top: 26rpx; color: #ffd0d8; font-size: 28rpx; line-height: 1.6; }
.save-button { display: flex; align-items: center; justify-content: center; gap: 18rpx; width: 100%; min-height: 100rpx; margin: 44rpx 0 0; padding: 20rpx 32rpx; border: 1rpx solid rgba(235, 204, 255, .4); border-radius: 26rpx; color: #fff; background: #7760b5; font-size: 32rpx; font-weight: 600; line-height: 1.5; }
.save-hint { display: block; margin-top: 24rpx; color: #aeb8d3; font-size: 24rpx; line-height: 1.7; text-align: center; }
.save-button[disabled], .avatar-button[disabled], .back-button[disabled] { opacity: .65; }
@media (max-width: 360px) { .edit-page { padding-right: 28rpx; padding-left: 28rpx; } }
</style>
