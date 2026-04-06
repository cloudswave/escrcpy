<template>
  <div
    class="device-card relative rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg border border-[--el-border-color-lighter]"
    :class="{ 'opacity-60': row.status === 'offline' }"
    @click="handleClick"
  >
    <!-- 设备预览图 -->
    <div class="device-preview relative aspect-video bg-[--el-bg-color-page]">
      <img
        v-if="previewImage"
        :src="previewImage"
        :alt="row.id"
        class="w-full h-full object-cover"
        @error="previewImage = null"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-[--el-text-color-placeholder]">
        <el-icon :size="40"><Monitor /></el-icon>
      </div>
      
      <!-- 状态标签 -->
      <el-tag
        class="absolute top-2 left-2"
        :type="getDictLabel('deviceStatus', row.status, { labelKey: 'tagType' })"
        size="small"
      >
        {{ $t(getDictLabel('deviceStatus', row.status)) || '-' }}
      </el-tag>
      
      <!-- 更多按钮 -->
      <el-dropdown
        class="absolute top-2 right-2"
        :hide-on-click="false"
        trigger="click"
        @command="handleCommand"
        @click.stop
      >
        <el-button
          type="primary"
          text
          :disabled="['unauthorized', 'offline'].includes(row.status)"
          circle
          size="small"
          icon="More"
          @click.stop
        />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="screenshot">
              <el-icon><Camera /></el-icon>
              {{ $t('device.control.screenshot') }}
            </el-dropdown-item>
            <el-dropdown-item command="record">
              <el-icon><VideoCamera /></el-icon>
              {{ $t('device.actions.more.record.name') }}
            </el-dropdown-item>
            <el-dropdown-item command="custom">
              <el-icon><Setting /></el-icon>
              {{ $t('device.actions.more.custom.name') }}
            </el-dropdown-item>
            <el-dropdown-item command="camera" divided>
              <el-icon><VideoPlay /></el-icon>
              {{ $t('device.actions.more.camera.name') }}
            </el-dropdown-item>
            <el-dropdown-item command="otg">
              <el-icon><Connection /></el-icon>
              {{ $t('device.actions.more.otg.name') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="absolute inset-0 bg-black/30 flex items-center justify-center">
        <el-icon class="is-loading" :size="30" color="#fff"><Loading /></el-icon>
      </div>
    </div>
    
    <!-- 设备信息 -->
    <div class="device-info p-2 bg-[--el-bg-color]">
      <div class="flex items-center space-x-1">
        <DevicePopover :key="row.status" :device="row" />
        <span class="truncate text-sm font-medium">{{ row.remark || row.name || row.id }}</span>
        <el-link v-if="row.wifi" type="primary" underline="never">
          <i v-if="row.wifi" class="i-bi-wifi"></i>
        </el-link>
      </div>
      <div class="text-xs text-[--el-text-color-secondary] truncate mt-0.5">
        {{ row.id }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { sleep } from '$/utils/index.js'
import { getDictLabel } from '$/dicts/helper'
import DevicePopover from '../device-popover/index.vue'

const props = defineProps({
  row: {
    type: Object,
    default: () => ({}),
  },
  toggleRowExpansion: {
    type: Function,
    default: () => () => false,
  },
})

const emit = defineEmits(['command'])

const loading = ref(false)
const previewImage = ref(null)
const preferenceStore = usePreferenceStore()
const deviceStore = useDeviceStore()

// 获取设备预览图
async function fetchPreview() {
  if (props.row.status !== 'device') return
  
  try {
    const base64 = await window.$preload.adb.getScreenshot(props.row.id)
    if (base64) {
      previewImage.value = `data:image/png;base64,${base64}`
    }
  } catch (error) {
    console.warn('Failed to fetch preview:', error)
  }
}

// 定期刷新预览图
let previewTimer = null
onMounted(() => {
  fetchPreview()
  // 每5秒刷新一次预览
  previewTimer = setInterval(fetchPreview, 5000)
})

onBeforeUnmount(() => {
  if (previewTimer) {
    clearInterval(previewTimer)
  }
})

function handleClick() {
  if (['offline', 'unauthorized'].includes(props.row.status)) return
  emit('command', 'mirror')
}

function handleCommand(command) {
  emit('command', command)
}

// 暴露方法供父组件调用
defineExpose({
  handleClick: () => {
    loading.value = true
    props.toggleRowExpansion(props.row, true)
    const args = preferenceStore.scrcpyParameter(props.row.id, {
      excludes: ['--otg', '--mouse=aoa', '--keyboard=aoa'],
    })
    
    window.$scrcpy.mirror(props.row.id, {
      title: deviceStore.getLabel(props.row, 'mirror'),
      args,
    }).then(async (mirroring) => {
      await sleep(1000)
      loading.value = false
      // 打开浮动控制面板
      const { openFloatControl } = await import('$/utils/device/index.js')
      openFloatControl(props.row)
      await mirroring
    }).catch((error) => {
      loading.value = false
      console.error('mirror.error', error)
      if (error.message) {
        ElMessage.warning(error.message)
      }
    })
  },
})
</script>

<style lang="postcss" scoped>
.device-card:hover {
  transform: translateY(-2px);
}
</style>