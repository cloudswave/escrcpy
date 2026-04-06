<template>
  <el-config-provider :locale="locale" :size="size">
    <AuthorizationDialog v-if="!isAuthorized" @authorized="handleAuthorized" />
    <Layouts v-else />
  </el-config-provider>
</template>

<script setup>
import Layouts from './layouts/index.vue'
import AuthorizationDialog from './components/AuthorizationDialog/index.vue'

const router = useRouter()
const { locale, size } = useWindowStateSync()

const isAuthorized = ref(false)

onMounted(async () => {
  await checkAuthorization()
  showTips()
  startApp.open()
})

async function checkAuthorization() {
  try {
    const result = await window.$preload.checkAuthorizationStatus()
    isAuthorized.value = result.success && result.data
  } catch (e) {
    console.error('Check authorization failed:', e)
    isAuthorized.value = false
  }
}

function handleAuthorized() {
  isAuthorized.value = true
}

const startApp = useStartApp()

window.$preload.ipcRenderer.on('quit-before', async () => {
  ElLoading.service({
    lock: true,
    text: window.t('appClose.quit.loading'),
  })
})

window.$preload.ipcRenderer.on('execute-arguments-change', async (event, params) => {
  startApp.open(params)
})

window.$preload.ipcRenderer.on('navigate-to-route', (event, route) => {
  router.push(route)
})

async function showTips() {
  const { getScrcpyPath } = window.$preload.configs || {}
  const scrcpyPath = getScrcpyPath?.({ store: window.$preload.store })
  if (scrcpyPath) {
    return false
  }
  ElMessageBox.alert(
    `<div>
    ${window.t('dependencies.lack.content', {
      name: '<a class="hover:underline text-primary-500" href="https://github.com/Genymobile/scrcpy" target="_blank">scrcpy</a>',
    })}
    <div>`,
    window.t('dependencies.lack.title'),
    {
      dangerouslyUseHTMLString: true,
    },
  )
}
</script>

<style lang="postcss">
</style>