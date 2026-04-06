<template>
  <el-dialog
    v-model="visible"
    title="软件授权"
    width="400px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <div class="auth-dialog-content">
      <p class="description">首次使用需要授权激活，请输入授权码</p>
      <p class="hint">可关注微信公众号: 搞机Geek 获取授权码</p>
      
      <el-input
        v-model="licenseKey"
        placeholder="请输入授权码"
        :disabled="isVerifying"
        @keyup.enter="handleVerify"
      />
      
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        class="error-alert"
      />
    </div>
    
    <template #footer>
      <el-button
        type="primary"
        :loading="isVerifying"
        @click="handleVerify"
      >
        {{ isVerifying ? '验证中...' : '验证授权码' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['authorized'])

const visible = ref(true)
const licenseKey = ref('')
const isVerifying = ref(false)
const error = ref('')

onMounted(async () => {
  await checkStatus()
})

async function checkStatus() {
  try {
    const result = await window.$preload.checkAuthorizationStatus()
    if (result.success && result.data) {
      emit('authorized')
    }
  } catch (e) {
    console.error('Check authorization failed:', e)
  }
}

async function handleVerify() {
  if (!licenseKey.value.trim()) {
    error.value = '请输入授权码'
    return
  }

  isVerifying.value = true
  error.value = ''

  try {
    const result = await window.$preload.verifyAuthorization(licenseKey.value.trim())
    if (result.success) {
      emit('authorized')
    } else {
      error.value = result.message || '授权失败'
    }
  } catch (err) {
    error.value = err.message || '授权失败，请重试'
  } finally {
    isVerifying.value = false
  }
}
</script>

<style scoped>
.auth-dialog-content {
  text-align: center;
}

.description {
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.hint {
  margin-bottom: 20px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.error-alert {
  margin-top: 16px;
}
</style>