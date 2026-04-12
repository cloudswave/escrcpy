<template>
  <el-dialog
    v-model="visible"
    :title="$t('authorization.title')"
    width="400px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <div class="auth-dialog-content">
      <p class="description">{{ $t('authorization.description') }}</p>
      <p class="hint">{{ $t('authorization.hint') }}</p>
      
      <el-input
        v-model="licenseKey"
        :placeholder="$t('authorization.input.placeholder')"
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
        {{ isVerifying ? $t('authorization.verifying') : $t('authorization.verify') }}
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
    error.value = window.t('authorization.error.empty')
    return
  }

  isVerifying.value = true
  error.value = ''

  try {
    const result = await window.$preload.verifyAuthorization(licenseKey.value.trim())
    if (result.success) {
      emit('authorized')
    } else {
      error.value = result.message || window.t('authorization.error.failed')
    }
  } catch (err) {
    error.value = err.message || window.t('authorization.error.retry')
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