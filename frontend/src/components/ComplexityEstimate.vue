<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-slate-400">复杂度预估 · 回溯风险分析</h3>
      <span
        :class="levelStyle.badge"
        class="text-xs font-bold px-2 py-0.5 rounded-full"
      >{{ levelText }}</span>
    </div>

    <div v-if="estimate.warning" class="mb-3 p-3 rounded-lg text-sm" :class="levelStyle.warningBg">
      <div class="flex items-start gap-2">
        <span class="text-lg leading-none">⚠️</span>
        <span :class="levelStyle.warningText">{{ estimate.warning }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 mb-3">
      <div class="bg-slate-900 rounded p-2 text-center">
        <div class="text-xs text-slate-500 mb-1">时间复杂度</div>
        <div class="text-sm font-mono font-bold" :class="levelStyle.text">{{ estimate.estimatedComplexity }}</div>
      </div>
      <div class="bg-slate-900 rounded p-2 text-center">
        <div class="text-xs text-slate-500 mb-1">回溯潜力值</div>
        <div class="text-sm font-mono font-bold" :class="levelStyle.text">
          {{ estimate.maxBacktrackPotential > 9999 ? '∞' : estimate.maxBacktrackPotential }}
        </div>
      </div>
    </div>

    <div v-if="estimate.riskSources.length > 0" class="space-y-2">
      <div class="text-xs text-slate-500 font-semibold mb-1">风险来源 ({{ estimate.riskSources.length }})</div>
      <div
        v-for="(src, idx) in estimate.riskSources"
        :key="idx"
        class="bg-slate-900 rounded p-3 border-l-4"
        :class="levelStyle.leftBorder"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold px-2 py-0.5 rounded" :class="riskTypeTagStyle(src.type)">
            {{ riskTypeText(src.type) }}
          </span>
          <span class="text-xs text-slate-500 font-mono">位置: {{ src.position }}</span>
        </div>

        <div class="text-sm text-slate-300 mb-2">{{ src.description }}</div>

        <div class="mb-2">
          <div class="text-xs text-slate-500 mb-1">匹配模式:</div>
          <code class="text-xs font-mono bg-slate-800 text-cyan-400 px-2 py-1 rounded block truncate">{{ src.pattern }}</code>
        </div>

        <div class="mb-2">
          <div class="text-xs text-slate-500 mb-1">优化建议:</div>
          <div class="text-xs text-green-400 bg-slate-800 px-2 py-1 rounded">💡 {{ src.suggestion }}</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div class="bg-red-950/50 border border-red-900/50 rounded p-2">
            <div class="text-red-400 font-bold mb-1">❌ 反面示例</div>
            <code class="font-mono text-red-300 block break-all">{{ src.badExample }}</code>
          </div>
          <div class="bg-green-950/50 border border-green-900/50 rounded p-2">
            <div class="text-green-400 font-bold mb-1">✅ 推荐写法</div>
            <code class="font-mono text-green-300 block break-all">{{ src.goodExample }}</code>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-slate-500 bg-slate-900 rounded p-3 flex items-center gap-2">
      <span class="text-green-400 text-lg">✓</span>
      <div>
        <div class="text-green-400 font-semibold">无明显回溯风险</div>
        <div class="text-xs mt-0.5">当前正则结构清晰，在常规输入下应该可以高效执行</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRegexStore } from '../store/regex'
import type { RiskSource } from '../types'

const store = useRegexStore()

const estimate = computed(() => store.complexityEstimate)

const levelText = computed(() => {
  const map: Record<string, string> = {
    safe: '安全',
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '灾难性'
  }
  return map[estimate.value.riskLevel] || '未知'
})

const levelStyle = computed(() => {
  const level = estimate.value.riskLevel
  switch (level) {
    case 'safe':
      return {
        badge: 'bg-green-900 text-green-300 border border-green-700',
        text: 'text-green-400',
        warningBg: 'bg-green-950/50 border border-green-800',
        warningText: 'text-green-300',
        leftBorder: 'border-l-green-500'
      }
    case 'low':
      return {
        badge: 'bg-blue-900 text-blue-300 border border-blue-700',
        text: 'text-blue-400',
        warningBg: 'bg-blue-950/50 border border-blue-800',
        warningText: 'text-blue-300',
        leftBorder: 'border-l-blue-500'
      }
    case 'medium':
      return {
        badge: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
        text: 'text-yellow-400',
        warningBg: 'bg-yellow-950/50 border border-yellow-800',
        warningText: 'text-yellow-300',
        leftBorder: 'border-l-yellow-500'
      }
    case 'high':
      return {
        badge: 'bg-orange-900 text-orange-300 border border-orange-700',
        text: 'text-orange-400',
        warningBg: 'bg-orange-950/50 border border-orange-800',
        warningText: 'text-orange-300',
        leftBorder: 'border-l-orange-500'
      }
    case 'critical':
      return {
        badge: 'bg-red-900 text-red-300 border border-red-700 animate-pulse',
        text: 'text-red-400',
        warningBg: 'bg-red-950/50 border border-red-800',
        warningText: 'text-red-300',
        leftBorder: 'border-l-red-500'
      }
    default:
      return {
        badge: 'bg-slate-700 text-slate-300',
        text: 'text-slate-400',
        warningBg: 'bg-slate-800',
        warningText: 'text-slate-300',
        leftBorder: 'border-l-slate-500'
      }
  }
})

function riskTypeText(type: RiskSource['type']): string {
  const map: Record<RiskSource['type'], string> = {
    nested_quantifier: '嵌套量词',
    overlapping_alternation: '重叠分支',
    adjacent_repeating: '相邻重复',
    greedy_with_backtrack: '贪婪回溯',
    wide_charclass: '宽字符类'
  }
  return map[type] || type
}

function riskTypeTagStyle(type: RiskSource['type']): string {
  const map: Record<RiskSource['type'], string> = {
    nested_quantifier: 'bg-red-900/70 text-red-300 border border-red-700',
    overlapping_alternation: 'bg-orange-900/70 text-orange-300 border border-orange-700',
    adjacent_repeating: 'bg-yellow-900/70 text-yellow-300 border border-yellow-700',
    greedy_with_backtrack: 'bg-blue-900/70 text-blue-300 border border-blue-700',
    wide_charclass: 'bg-purple-900/70 text-purple-300 border border-purple-700'
  }
  return map[type] || 'bg-slate-700 text-slate-300'
}
</script>
