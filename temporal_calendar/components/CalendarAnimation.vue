<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useNav } from '@slidev/client'

type SceneName = 'cycles' | 'ramadan'
type Frame = { html: string; delay: number }
type Counter = [string, string, string]

const props = defineProps<{ scene: SceneName }>()

const SOLAR_YEAR = 365.24219
const SYNODIC_MONTH = 29.53059

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const headHtml = (title: string, phase: string) =>
  `<div class="ca-head"><div class="ca-title">${title}</div><div class="ca-phase">${phase}</div></div>`
const counterHtml = (cs: Counter[]) =>
  `<div class="ca-counters">${cs
    .map(([k, v, u]) => `<div><span>${k}</span><span class="ca-v">${v}</span><span class="ca-u">${u}</span></div>`)
    .join('')}</div>`
const laneHtml = (name: string, body: string) =>
  `<div class="ca-lane"><div class="ca-lane-name">${name}</div>${body}</div>`

const buildCycles = (): Frame[] => {
  const scale = 1.75
  const yearEnd = SOLAR_YEAR * scale
  const draw = (t: number, phase: string) => {
    const months = Math.floor(t / SYNODIC_MONTH + 1e-9)
    const partial = t - months * SYNODIC_MONTH
    const blocks = range(months)
      .map(
        (i) =>
          `<div class="ca-moon${i % 2 ? ' alt' : ''}" style="left:${i * SYNODIC_MONTH * scale}px;width:${SYNODIC_MONTH * scale}px">${i + 1}</div>`,
      )
      .join('')
    const current =
      partial > 0.01
        ? `<div class="ca-moon now" style="left:${months * SYNODIC_MONTH * scale}px;width:${partial * scale}px"></div>`
        : ''
    return (
      headHtml('1年と月の満ち欠け', phase) +
      laneHtml(
        '太陽年',
        `<div class="ca-track" style="--end:${yearEnd}px"><div class="ca-fill" style="width:${Math.min(t, SOLAR_YEAR) * scale}px"></div></div>`,
      ) +
      laneHtml('朔望月', `<div class="ca-track" style="--end:${yearEnd}px">${blocks}${current}</div>`) +
      counterHtml([
        ['経過', String(Math.floor(t)), '日'],
        ['新月から新月まで', String(months), '回'],
        ['1年の終わりまで', Math.max(0, SOLAR_YEAR - t).toFixed(2), '日'],
      ])
    )
  }
  const frames: Frame[] = []
  const push = (t: number, phase: string, delay: number) => frames.push({ html: draw(t, phase), delay })
  const twelve = 12 * SYNODIC_MONTH
  const thirteen = 13 * SYNODIC_MONTH
  push(0, '新月の日から数え始める', 120)
  range(Math.floor(twelve / 6)).forEach((i) => push((i + 1) * 6, '月が満ち欠けを繰り返す', 6))
  push(twelve, '12か月で354.37日、1年まであと10.88日', 260)
  push(SOLAR_YEAR, '1年が終わってもまだ13か月目の途中', 260)
  range(Math.floor((thirteen - SOLAR_YEAR) / 6)).forEach((i) => push(SOLAR_YEAR + (i + 1) * 6, '13か月目を最後まで数える', 8))
  push(thirteen, '13か月だと1年を18.66日超える', 400)
  return frames
}

const RAMADAN: [number, string][] = [
  [1440, '2019-05-06'],
  [1441, '2020-04-24'],
  [1442, '2021-04-13'],
  [1443, '2022-04-02'],
  [1444, '2023-03-23'],
  [1445, '2024-03-11'],
  [1446, '2025-03-01'],
  [1447, '2026-02-18'],
  [1448, '2027-02-08'],
  [1449, '2028-01-28'],
  [1450, '2029-01-16'],
  [1451, '2030-01-05'],
  [1452, '2030-12-26'],
  [1453, '2031-12-16'],
  [1454, '2032-12-04'],
  [1455, '2033-11-23'],
  [1456, '2034-11-12'],
  [1457, '2035-11-01'],
  [1458, '2036-10-21'],
  [1459, '2037-10-10'],
  [1460, '2038-09-30'],
  [1461, '2039-09-19'],
  [1462, '2040-09-08'],
  [1463, '2041-08-28'],
  [1464, '2042-08-17'],
  [1465, '2043-08-06'],
  [1466, '2044-07-26'],
  [1467, '2045-07-16'],
  [1468, '2046-07-05'],
  [1469, '2047-06-25'],
  [1470, '2048-06-13'],
  [1471, '2049-06-02'],
  [1472, '2050-05-22'],
  [1473, '2051-05-12'],
  [1474, '2052-04-30'],
]

const buildRamadan = (): Frame[] => {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const scale = 2.1
  const parse = (iso: string) => iso.split('-').map(Number)
  const dayOfYear = (iso: string) => {
    const [y, m, d] = parse(iso)
    return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000
  }
  const draw = (index: number, phase: string) => {
    const [hijri, iso] = RAMADAN[index]
    const [y, m, d] = parse(iso)
    const trail = range(Math.min(index, 4))
      .map((k) => RAMADAN[index - 1 - k][1])
      .map((past, k) => `<div class="ca-pin past" style="left:${dayOfYear(past) * scale}px;opacity:${0.6 - k * 0.12}"></div>`)
      .join('')
    return (
      headHtml('islamic-umalquraのラマダン初日', phase) +
      `<div class="ca-label">グレゴリオ暦の1年</div>` +
      `<div class="ca-year">${monthDays
        .map((n, i) => `<div class="ca-month" style="width:${n * scale}px">${i + 1}月</div>`)
        .join('')}${trail}<div class="ca-pin" style="left:${dayOfYear(iso) * scale}px"></div></div>` +
      counterHtml([
        ['イスラム暦', String(hijri), '年'],
        ['ラマダン初日', `${y}年${m}月${d}日`, ''],
      ])
    )
  }
  const frames: Frame[] = []
  RAMADAN.forEach((_, i) => {
    const last = i === RAMADAN.length - 1
    frames.push({
      html: draw(i, last ? 'イスラム暦で34年たつとほぼ同じ時期に戻る' : '毎年約11日ずつ早まる'),
      delay: i === 0 ? 160 : last ? 400 : 45,
    })
  })
  return frames
}

const builders: Record<SceneName, () => Frame[]> = {
  cycles: buildCycles,
  ramadan: buildRamadan,
}

const frames = builders[props.scene]()
const ends = frames.reduce<number[]>((acc, f) => [...acc, (acc[acc.length - 1] ?? 0) + f.delay * 10], [])
const cycle = ends[ends.length - 1]
const { isPrintMode } = useNav()
const elapsed = ref(isPrintMode.value ? cycle : 0)
const html = computed(() => {
  const at = ends.findIndex((end) => elapsed.value < end)
  return frames[at < 0 ? frames.length - 1 : at].html
})
const timer = ref<ReturnType<typeof setInterval>>()

const play = () => {
  clearInterval(timer.value)
  const start = performance.now()
  timer.value = setInterval(() => {
    elapsed.value = performance.now() - start
    if (elapsed.value >= cycle) clearInterval(timer.value)
  }, 30)
}
onUnmounted(() => clearInterval(timer.value))
</script>

<template>
  <div class="cal-anim" v-html="html" />
  <button v-if="!isPrintMode" class="cal-anim-play" @click="play">再生</button>
</template>

<style>
.cal-anim {
  --ca-blue: #3984fd;
  --ca-navy: #243762;
  --ca-light: #f0f7ff;
  --ca-dash: #b9c6dd;
  --ca-copy: #ffb020;
  --ca-copy-bg: #fff4dc;
  position: relative;
  width: 880px;
  height: 300px;
  padding: 18px 20px;
  margin-bottom: 12px;
  background: #fff;
  color: var(--ca-navy);
  text-align: left;
}
.cal-anim,
.cal-anim * {
  box-sizing: border-box;
}
.cal-anim div,
.cal-anim span {
  font-family: 'Noto Sans JP', sans-serif;
}
.cal-anim .ca-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  height: 34px;
}
.cal-anim .ca-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ca-blue);
}
.cal-anim .ca-phase {
  font-size: 16px;
  font-weight: 700;
}
.cal-anim .ca-label {
  font-size: 14px;
  font-weight: 700;
  margin: 12px 0 6px;
}
.cal-anim .ca-counters {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 16px;
  display: flex;
  gap: 28px;
  font-size: 15px;
}
.cal-anim .ca-v {
  font: 700 20px 'Nunito', 'Noto Sans JP', sans-serif;
  margin-left: 6px;
  color: var(--ca-blue);
}
.cal-anim .ca-u {
  font-size: 13px;
  margin-left: 2px;
}
.cal-anim .ca-lane {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 12px;
  align-items: center;
  margin-top: 22px;
}
.cal-anim .ca-lane-name {
  font-weight: 700;
  color: var(--ca-blue);
  font-size: 15px;
}
.cal-anim .ca-track {
  position: relative;
  height: 40px;
  border-radius: 6px;
  background: var(--ca-light);
}
.cal-anim .ca-track::after {
  content: '';
  position: absolute;
  top: -8px;
  bottom: -8px;
  left: var(--end);
  border-left: 2px dashed var(--ca-navy);
}
.cal-anim .ca-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 6px;
  background: var(--ca-navy);
}
.cal-anim .ca-moon {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 6px;
  background: var(--ca-blue);
  border: 1px solid #fff;
  color: #fff;
  font: 700 13px/38px 'Nunito', sans-serif;
  text-align: center;
}
.cal-anim .ca-moon.alt {
  background: #6aa3fd;
}
.cal-anim .ca-moon.now {
  background: var(--ca-copy);
}
.cal-anim .ca-year {
  position: relative;
  display: flex;
  height: 56px;
  margin-top: 30px;
}
.cal-anim .ca-month {
  height: 100%;
  border: 1px solid #b5d0fb;
  background: var(--ca-light);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  line-height: 54px;
}
.cal-anim .ca-pin {
  position: absolute;
  top: -14px;
  bottom: -14px;
  width: 4px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--ca-copy);
}
.cal-anim .ca-pin.past {
  background: var(--ca-blue);
}
.slidev-layout .cal-anim-play {
  display: block;
  margin: 0 0 12px 20px;
  padding: 4px 20px;
  border: 2px solid #3984fd;
  border-radius: 8px;
  background: #fff;
  color: #3984fd;
  font: 700 15px 'Noto Sans JP', sans-serif;
  cursor: pointer;
}
</style>
