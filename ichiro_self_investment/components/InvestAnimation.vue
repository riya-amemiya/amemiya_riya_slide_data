<script setup lang="ts">
import { useNav } from '@slidev/client'
import { computed, onMounted, onUnmounted, ref } from 'vue'

type SceneName = 'hits' | 'yunkel' | 'green'
type Frame = { html: string; delay: number }
type Counter = [string, string, string]

const props = defineProps<{ scene: SceneName }>()

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const num = (n: number) => n.toLocaleString('ja-JP')
const yen = (n: number) => {
  const man = Math.floor(n / 10000)
  const rest = n % 10000
  if (man === 0) return `${num(rest)}円`
  return `${man}万${rest ? num(rest) : ''}円`
}
const headHtml = (title: string, phase: string) =>
  `<div class="ia-head"><div class="ia-title">${title}</div><div class="ia-phase">${phase}</div></div>`
const counterHtml = (cs: Counter[]) =>
  `<div class="ia-counters">${cs
    .map(([k, v, u]) => `<div><span>${k}</span><span class="ia-v">${v}</span><span class="ia-u">${u}</span></div>`)
    .join('')}</div>`

const buildHits = (): Frame[] => {
  const NPB = 1278
  const MLB = 3089
  const SCALE = 600 / (NPB + MLB)
  const STEPS_NPB = 20
  const STEPS_MLB = 40
  const st = { phase: '', npb: 0, mlb: 0 }
  const bar = (cls: string, n: number) => `<div class="ia-bar ${cls}" style="width:${Math.round(n * SCALE)}px"></div>`
  const row = (name: string, bars: string, n: number) =>
    `<div class="ia-row"><div class="ia-name">${name}</div><div class="ia-bars">${bars}<div class="ia-num"><span class="ia-v">${num(n)}</span>本</div></div></div>`
  const draw = () =>
    headHtml('日米通算安打', st.phase) +
    row('日本', bar('npb', st.npb), st.npb) +
    row('メジャー', bar('mlb', st.mlb), st.mlb) +
    row('合計', bar('npb', st.npb) + bar('mlb', st.mlb), st.npb + st.mlb)
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  push(80)
  st.phase = '日本でのヒット'
  range(STEPS_NPB).forEach((i) => {
    st.npb = Math.round((NPB * (i + 1)) / STEPS_NPB)
    push(4)
  })
  push(60)
  st.phase = 'メジャーでのヒット'
  range(STEPS_MLB).forEach((i) => {
    st.mlb = Math.round((MLB * (i + 1)) / STEPS_MLB)
    push(4)
  })
  st.phase = ''
  push(400)
  return frames
}

const buildYunkel = (): Frame[] => {
  const PRICE = 3000
  const DAYS = 365
  const STEP = 5
  const SALARY = 8000000
  const st = { phase: '', days: 0 }
  const draw = () =>
    headHtml('ユンケル代', st.phase) +
    `<div class="ia-label">1マスが1日分の${num(PRICE)}円</div>` +
    `<div class="ia-days">${range(DAYS)
      .map((i) => `<div class="ia-day${i < st.days ? ' on' : ''}"></div>`)
      .join('')}</div>` +
    `<div class="ia-label">年俸<span class="ia-cap">${yen(SALARY)}</span>のうちユンケル代</div>` +
    `<div class="ia-salary"><div class="ia-spent" style="width:${((st.days * PRICE) / SALARY) * 100}%"></div></div>` +
    counterHtml([
      ['飲んだ日数', num(st.days), '日'],
      ['ユンケル代', yen(st.days * PRICE), ''],
    ])
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  st.phase = '毎日1本ずつ'
  push(100)
  range(DAYS / STEP).forEach((i) => {
    st.days = (i + 1) * STEP
    push(4)
  })
  st.phase = `1年で年俸の約${Math.round(((DAYS * PRICE) / SALARY) * 100)}%`
  push(400)
  return frames
}

const buildGreen = (): Frame[] => {
  const FARE = 750
  const DAYS = 3
  const st = { phase: '', rides: 0, newIdx: -1 }
  const tile = (i: number, name: string) =>
    `<div class="ia-ride${i < st.rides ? ' on' : ''}${i === st.newIdx ? ' new' : ''}"><span>${name}</span><span class="ia-fare">${num(FARE)}円</span></div>`
  const draw = () =>
    headHtml('グリーン車代', st.phase) +
    range(DAYS)
      .map(
        (d) =>
          `<div class="ia-row"><div class="ia-name">出社${d + 1}日目</div><div class="ia-rides">${tile(d * 2, '行き')}${tile(d * 2 + 1, '帰り')}</div></div>`,
      )
      .join('') +
    counterHtml([['1週間の合計', yen(st.rides * FARE), '']])
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  st.phase = `片道${num(FARE)}円`
  push(100)
  range(DAYS * 2).forEach((i) => {
    st.rides = i + 1
    st.newIdx = i
    st.phase = `出社${Math.floor(i / 2) + 1}日目の${i % 2 === 0 ? '行き' : '帰り'}`
    push(70)
  })
  st.newIdx = -1
  st.phase = `片道${num(FARE)}円 × 往復 × 週${DAYS}日`
  push(400)
  return frames
}

const builders: Record<SceneName, () => Frame[]> = {
  hits: buildHits,
  yunkel: buildYunkel,
  green: buildGreen,
}

const { isPrintMode } = useNav()
const frames = builders[props.scene]()
const index = ref(isPrintMode.value ? frames.length - 1 : 0)
const html = computed(() => frames[index.value].html)
const timer = ref<ReturnType<typeof setTimeout>>()

const tick = () => {
  timer.value = setTimeout(() => {
    index.value = (index.value + 1) % frames.length
    tick()
  }, frames[index.value].delay * 10)
}

onMounted(() => {
  if (!isPrintMode.value) tick()
})
onUnmounted(() => clearTimeout(timer.value))
</script>

<template>
  <div class="invest-anim" :class="`ia-${scene}`" v-html="html" />
</template>

<style>
.invest-anim {
  --ia-blue: #3984fd;
  --ia-navy: #243762;
  --ia-light: #f0f7ff;
  --ia-dash: #b9c6dd;
  --ia-orange: #ffb020;
  --ia-orange-bg: #fff4dc;
  position: relative;
  width: 880px;
  padding: 18px 20px;
  margin-bottom: 12px;
  background: #fff;
  color: var(--ia-navy);
  text-align: left;
}
.invest-anim.ia-hits {
  height: 190px;
}
.invest-anim.ia-yunkel,
.invest-anim.ia-green {
  height: 300px;
}
.invest-anim,
.invest-anim * {
  box-sizing: border-box;
}
.invest-anim div,
.invest-anim span {
  font-family: 'Noto Sans JP', sans-serif;
}
.invest-anim .ia-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  height: 34px;
}
.invest-anim .ia-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ia-blue);
}
.invest-anim .ia-phase {
  font-size: 16px;
  font-weight: 700;
}
.invest-anim .ia-label {
  font-size: 14px;
  font-weight: 700;
  margin: 10px 0 6px;
}
.invest-anim .ia-cap,
.invest-anim .ia-v {
  color: var(--ia-blue);
}
.invest-anim .ia-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
}
.invest-anim.ia-green .ia-row {
  grid-template-columns: 110px 1fr;
  margin-top: 14px;
}
.invest-anim .ia-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ia-blue);
}
.invest-anim .ia-bars {
  display: flex;
  align-items: center;
  height: 24px;
}
.invest-anim .ia-bar {
  height: 24px;
}
.invest-anim .ia-bar.npb {
  background: var(--ia-navy);
}
.invest-anim .ia-bar.mlb {
  background: var(--ia-blue);
}
.invest-anim .ia-num {
  font-size: 14px;
  margin-left: 12px;
  white-space: nowrap;
}
.invest-anim .ia-num .ia-v {
  font: 700 22px 'Nunito', 'Noto Sans JP', sans-serif;
  margin-right: 4px;
}
.invest-anim .ia-days {
  display: grid;
  grid-template-columns: repeat(73, 9px);
  gap: 2px;
}
.invest-anim .ia-day {
  width: 9px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid var(--ia-dash);
  background: #fff;
}
.invest-anim .ia-day.on {
  border-color: var(--ia-orange);
  background: var(--ia-orange);
}
.invest-anim .ia-salary {
  width: 801px;
  height: 28px;
  border: 2px solid var(--ia-blue);
  border-radius: 6px;
  background: var(--ia-light);
  overflow: hidden;
}
.invest-anim .ia-spent {
  height: 100%;
  background: var(--ia-orange);
}
.invest-anim .ia-rides {
  display: flex;
  gap: 12px;
}
.invest-anim .ia-ride {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 170px;
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px dashed var(--ia-dash);
  color: var(--ia-dash);
  font-size: 15px;
  font-weight: 700;
}
.invest-anim .ia-ride.on {
  border: 1px solid var(--ia-blue);
  background: var(--ia-light);
  color: var(--ia-blue);
}
.invest-anim .ia-ride.new {
  border-color: var(--ia-orange);
  background: var(--ia-orange);
  color: #fff;
}
.invest-anim .ia-fare {
  font-family: 'Nunito', 'Noto Sans JP', sans-serif;
}
.invest-anim .ia-counters {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 16px;
  display: flex;
  gap: 28px;
  font-size: 15px;
}
.invest-anim .ia-counters .ia-v {
  font: 700 20px 'Nunito', 'Noto Sans JP', sans-serif;
  margin-left: 6px;
}
.invest-anim .ia-u {
  font-size: 13px;
  margin-left: 2px;
}
</style>
