<template>
  <div class="h-full flex flex-col">
    <BatchActions class="overflow-hidden transition-all" :class="isMultipleRow ? 'max-h-12 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'" :devices="selectionRows" />
    <div class="flex-1 min-h-0 overflow-hidden relative">
      <!-- 视图模式切换和列数设置 -->
      <div class="absolute top-2 right-2 z-10 flex items-center space-x-2 bg-[--el-bg-color] p-1 rounded-lg border border-[--el-border-color-lighter]">
        <el-tooltip :content="$t('device.viewMode.grid')" placement="top">
          <el-button :type="viewMode === 'grid' ? 'primary' : 'default'" text circle size="small" @click="viewMode = 'grid'">
            <el-icon><Grid /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="$t('device.viewMode.list')" placement="top">
          <el-button :type="viewMode === 'list' ? 'primary' : 'default'" text circle size="small" @click="viewMode = 'list'">
            <el-icon><List /></el-icon>
          </el-button>
        </el-tooltip>
        <template v-if="viewMode === 'grid'">
          <el-divider direction="vertical" />
          <span class="text-xs text-[--el-text-color-secondary]">{{ $t('device.viewMode.columns') }}</span>
          <el-slider v-model="gridColumns" :min="3" :max="12" :step="1" :show-tooltip="false" class="!w-20" />
          <span class="text-xs text-[--el-text-color-secondary] w-4">{{ gridColumns }}</span>
        </template>
      </div>

      <!-- 宫格模式 -->
      <div v-if="viewMode === 'grid'" class="h-full overflow-auto p-2">
        <div v-loading="loading && !deviceList.length" :element-loading-text="$t('common.loading')" class="grid gap-3 h-full content-start" :style="{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }">
          <template v-if="deviceList.length">
            <DeviceCard v-for="row in deviceList" :key="row.id" :row="row" :toggle-row-expansion="toggleRowExpansion" @command="handleCardCommand" />
          </template>
          <AppEmpty v-else :sub-title="$t('device.list.empty')" />
        </div>
      </div>

      <!-- 列表模式 -->
      <el-table v-else ref="tableRef" v-loading="loading && !deviceList.length" :element-loading-text="$t('common.loading')" :data="deviceList" style="width: 100%" height="100%" row-key="id" class="el-table--beautify" @selection-change="onSelectionChange">
        <template #empty>
          <AppEmpty :sub-title="$t('device.list.empty')"> </AppEmpty>
        </template>
        <el-table-column type="selection"></el-table-column>
        <el-table-column :label="$t('device.serial')" sortable show-overflow-tooltip align="left" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center space-x-2 relative">
              <DevicePopover :key="row.status" :device="row" class="" />
              <div class="flex-none max-w-[75%] truncate"> {{ row.id }} </div>
              <el-link type="primary" underline="never" title="WIFI" class="flex-none">
                <i v-if="row.wifi" class="i-bi-wifi"></i>
              </el-link>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('device.name')" prop="remark" sortable show-overflow-tooltip align="left" min-width="150" :filters="remarkFilters" :filter-method="remarkFilterMethod">
          <template #default="{ row }">
            <Remark :device="row" class="" />
          </template>
        </el-table-column>
        <el-table-column v-slot="{ row }" :label="$t('device.status')" prop="status" align="left" sortable show-overflow-tooltip min-width="150" :filters="statusFilters" :filter-method="filterMethod">
          <el-tag :type="getDictLabel('deviceStatus', row.status, { labelKey: 'tagType' })">
            <div class="flex items-center">
              <el-tooltip v-if="['unauthorized'].includes(row.status)" :content="$t('device.permission.error')" placement="top">
                <el-link type="danger" underline="never" icon="WarningFilled" class="mr-1 flex-none"></el-link>
              </el-tooltip>
              <span class="flex-none">{{ $t(getDictLabel('deviceStatus', row.status)) || '-' }}</span>
            </div>
          </el-tag>
        </el-table-column>
        <el-table-column v-slot="{ row }" :label="$t('common.actions')" align="left" min-width="150">
          <div class="flex items-center !space-x-0">
            <ConnectAction v-if="['offline'].includes(row.status) && row.wifi" v-bind="{ device: row, handleConnect, }" />
            <MirrorAction v-if="['device', 'unauthorized'].includes(row.status)" :ref="getMirrorActionRefs" v-bind="{ row, toggleRowExpansion }" />
            <MoreDropdown v-if="['device'].includes(row.status)" v-bind="{ row, toggleRowExpansion }" />
            <WirelessAction v-if="['device', 'unauthorized'].includes(row.status)" v-bind="{ row, handleConnect, handleRefresh }" />
            <RemoveAction v-if="['offline'].includes(row.status)" v-bind="{ device: row, handleRefresh, }" />
          </div>
        </el-table-column>
        <el-table-column type="expand">
          <template #header>
            <el-icon class="" :title="$t('device.control.more')">
              <Operation class="" />
            </el-icon>
          </template>
          <template #default="{ row }">
            <ControlBar :device="row" :swapy-enabled="true" button-class="!min-w-10 !w-4vw !max-w-12" />
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="flex-none flex items-center py-1 overflow-hidden py-2">
      <div class="flex-none">
        <WirelessGroup ref="wirelessGroupRef" v-bind="{ handleRefresh }" @auto-connected="onAutoConnected" />
      </div>
      <div class="flex-1 w-0 space-x-2 flex items-center justify-end">
        <el-button type="default" :icon="loading ? '' : 'Refresh'" :loading="loading" circle :title="$t('device.refresh.name')" @click="handleRefresh">
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { sleep } from '$/utils/index.js'
import { uniqBy } from 'lodash-es'
import AppEmpty from '$/components/app-empty/index.vue'
import BatchActions from './components/batch-actions/index.vue'
import ControlBar from '$/components/control-bar/index.vue'
import MirrorAction from './components/mirror-action/index.vue'
import MoreDropdown from './components/more-dropdown/index.vue'
import Remark from './components/remark/index.vue'
import WirelessAction from './components/wireless-action/index.vue'
import ConnectAction from './components/connect-action/index.vue'
import RemoveAction from './components/remove-action/index.vue'
import WirelessGroup from './components/wireless-group/index.vue'
import DevicePopover from './components/device-popover/index.vue'
import DeviceCard from './components/device-card/index.vue'
import { getDictLabel } from '$/dicts/helper'
import { deviceStatus } from '$/dicts/index.js'

const deviceStore = useDeviceStore()
const preferenceStore = usePreferenceStore()

const loading = ref(false)
const mirrorActionRefs = ref([])
const selectionRows = ref([])
const tableRef = ref(null)
const wirelessGroupRef = ref(null)

// 视图模式相关状态
const viewMode = ref('list')
const gridColumns = ref(3)

// 从持久化存储加载设置
const $electronStore = window.$preload.store
function loadViewSettings() {
  const settings = $electronStore.get('deviceViewMode') || {}
  viewMode.value = settings.viewMode || 'list'
  gridColumns.value = settings.gridColumns || 3
}

// 保存视图设置到持久化存储
function saveViewSettings() {
  $electronStore.set('deviceViewMode', {
    viewMode: viewMode.value,
    gridColumns: gridColumns.value,
  })
}

// 监听设置变化
watch([viewMode, gridColumns], saveViewSettings)

const deviceList = computed({
  get: () => deviceStore.list,
  set: (val) => {
    deviceStore.list = val
  },
})

const isMultipleRow = computed(() => selectionRows.value.length > 0)

const statusFilters = computed(() => {
  return deviceStatus
    .map(item => ({
      text: window.t(item.label),
      value: item.value,
    }))
    .filter(item => !['emulator'].includes(item.value))
})

const remarkFilters = computed(() => {
  const value = deviceList.value
    .map(item => ({
      text: item.remark ?? item.name,
      value: item.remark ?? item.name,
    }))
  return uniqBy(value, 'value')
})

function remarkFilterMethod(value, row, column) {
  const target = row.remark || row.name
  return target === value
}

async function getDeviceData(options = {}) {
  const { unloading = false } = options
  if (!unloading) {
    loading.value = true
  }
  try {
    await deviceStore.getList()
  } catch (error) {
    const message = error?.message || error?.cause?.message || ''
    console.warn('Device list fetch error:', message)
    if (message.includes('failed to start daemon')) {
      await getDeviceData()
      return false
    }
    if (message) {
      ElMessage.warning(message)
    }
    deviceList.value = []
  }
  loading.value = false
}

function filterMethod(value, row, column) {
  const property = column.property
  return row[property] === value
}

function onSelectionChange(rows) {
  selectionRows.value = rows
}

async function onAdbWatch(type, ret) {
  if (ret && ret.id) {
    await sleep(1000)
    getDeviceData()
  }
  if (type === 'remove') {
    mirrorActionRefs.value = mirrorActionRefs.value.filter(
      item => item.row.id !== ret.id,
    )
  }
}

async function getMirrorActionRefs(ref) {
  await nextTick()
  if (!ref?.row?.id) return false
  const exists = mirrorActionRefs.value.some(item => item.row.id === ref.row.id)
  if (exists) return false
  const length = mirrorActionRefs.value.length
  mirrorActionRefs.value.push(ref)
  await sleep(length * 1000)
  const autoMirror = preferenceStore.data.autoMirror
  if (autoMirror) {
    ref.handleClick(ref.row)
  }
}

function toggleRowExpansion(...args) {
  tableRef.value?.toggleRowExpansion(...args)
}

function handleConnect(...args) {
  wirelessGroupRef.value.connect(...args)
}

async function handleRefresh() {
  loading.value = true
  await sleep()
  getDeviceData({ resetResolve: true, unloading: true })
}

function onAutoConnected() {}

// 处理卡片组件的命令
async function handleCardCommand(command, row) {
  const targetRow = row || row.id
  if (command === 'mirror') {
    // 启动投屏
    toggleRowExpansion(targetRow, true)
    const args = preferenceStore.scrcpyParameter(targetRow.id, {
      excludes: ['--otg', '--mouse=aoa', '--keyboard=aoa'],
    })
    try {
      const { openFloatControl } = await import('$/utils/device/index.js')
      const mirroring = window.$scrcpy.mirror(targetRow.id, {
        title: deviceStore.getLabel(targetRow, 'mirror'),
        args,
      })
      await sleep(1000)
      openFloatControl(targetRow)
      await mirroring
    } catch (error) {
      console.error('mirror.error', error)
      if (error.message) {
        ElMessage.warning(error.message)
      }
    }
  } else if (command === 'screenshot') {
    // 截屏
    window.$preload.adb.getScreenshot(targetRow.id)
  } else if (command === 'install') {
    // 安装APK
    try {
      const files = await window.$preload.ipcRenderer.invoke('show-open-dialog', {
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: $t('device.control.install.placeholder'),
            extensions: ['apk'],
          },
        ],
      })
      if (!files?.length) return
      
      const loadingMsg = ElMessage({
        message: $t('device.control.install.progress', { deviceName: deviceStore.getLabel(targetRow) }),
        type: 'info',
        duration: 0,
      })
      
      let failCount = 0
      for (const file of files) {
        try {
          await window.$preload.adb.install(targetRow.id, file)
        } catch (e) {
          console.warn(e)
          ++failCount
        }
      }
      
      loadingMsg.close()
      
      const totalCount = files.length
      const successCount = totalCount - failCount
      
      if (successCount) {
        if (totalCount > 1) {
          ElMessage.success($t('device.control.install.success', {
            deviceName: deviceStore.getLabel(targetRow),
            totalCount,
            successCount,
            failCount,
          }))
        } else {
          ElMessage.success($t('device.control.install.success.single', {
            deviceName: deviceStore.getLabel(targetRow),
          }))
        }
      } else {
        ElMessage.warning($t('device.control.install.error'))
      }
    } catch (error) {
      console.error('install.error', error)
    }
  } else if (command === 'explorer') {
    // 文件管理
    window.$preload.win.open('pages/explorer', {
      device: targetRow,
      instanceId: targetRow.id,
    })
  } else if (command === 'terminal') {
    // 终端
    window.$preload.win.open('pages/terminal', {
      title: 'terminal.command.name',
      type: 'device',
      device: targetRow,
      instanceId: targetRow.id,
    })
  } else if (command === 'reboot') {
    // 重启
    await window.$preload.adb.deviceShell(targetRow.id, 'reboot')
    ElMessage.success($t('device.control.reboot.success'))
  } else if (command === 'rotation') {
    // 旋转 - 显示旋转选项菜单
    ElMessageBox.confirm('', {
      title: $t('device.control.rotation.name'),
      message: h('div', {}, [
        h('el-radio-group', { modelValue: 'vertically', onChange: async (val) => {
          await window.$preload.adb.deviceShell(targetRow.id, 'content insert --uri content://settings/system --bind name:s:user_rotation --bind value:i:0')
          ElMessage.success($t('device.control.rotation.vertically') + ' OK')
        }}, [
          h('el-radio-button', { value: 'vertically' }, $t('device.control.rotation.vertically'))
        ])
      ]),
      confirmButtonText: $t('device.control.rotation.vertically'),
      cancelButtonText: $t('device.control.rotation.horizontally'),
    }).then(async () => {
      // 纵向
      await window.$preload.adb.deviceShell(targetRow.id, 'content insert --uri content://settings/system --bind name:s:user_rotation --bind value:i:0')
      ElMessage.success($t('device.control.rotation.vertically') + ' OK')
    }).catch(async () => {
      // 横向
      await window.$preload.adb.deviceShell(targetRow.id, 'content insert --uri content://settings/system --bind name:s:user_rotation --bind value:i:1')
      ElMessage.success($t('device.control.rotation.horizontally') + ' OK')
    })
  } else if (command === 'volume') {
    // 音量控制 - 显示音量选项菜单
    const volumeOptions = [
      { label: $t('device.control.volume-up.name'), command: 'input keyevent 24' },
      { label: $t('device.control.volume-down.name'), command: 'input keyevent 25' },
      { label: $t('device.control.volume-mute.name'), command: 'input keyevent 164' },
    ]
    const buttons = volumeOptions.map(opt => 
      h('el-button', { onClick: async () => {
        await window.$preload.adb.deviceShell(targetRow.id, opt.command)
      }}, opt.label)
    )
    ElMessageBox({
      title: $t('device.control.volume.name'),
      message: h('div', { class: 'flex gap-2 flex-wrap' }, buttons),
      showCancelButton: false,
      confirmButtonText: $t('common.close'),
    })
  } else if (command === 'copilot') {
    // AI助手
    window.$preload.win.open('pages/copilot', {
      device: targetRow,
      instanceId: targetRow.id,
    })
  }
}

let unAdbWatch = null
onMounted(async () => {
  loadViewSettings()
  await getDeviceData()
  unAdbWatch = await window.$preload.adb.watch(onAdbWatch)
})

onBeforeUnmount(() => {
  unAdbWatch?.()
})

onActivated(() => {
  getDeviceData()
})
</script>

<style lang="postcss" scoped>
:deep() {
  .el-table {
    --el-empty-image-width: 24vh;
    .el-table__row .cell {
      @apply !py-1;
    }
    .el-table__expanded-cell {
      @apply !py-0;
    }
  }
}
</style>
