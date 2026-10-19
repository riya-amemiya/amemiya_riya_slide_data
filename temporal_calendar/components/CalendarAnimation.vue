<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useNav } from '@slidev/client'

type SceneName = 'cycles' | 'ramadan' | 'metonic' | 'convert' | 'addyear'
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
const raceHtml = (title: string, phase: string, body: string, cs: Counter[]) =>
  `<div class="ca-race"><div class="ca-race-head"><span class="ca-race-title">${title}</span><span class="ca-race-phase">${phase}</span></div>${body}<div class="ca-race-counters">${cs
    .map(([k, v, u]) => `<span>${k}<span class="ca-v">${v}</span>${u}</span>`)
    .join('')}</div></div>`

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
  push(SOLAR_YEAR, '1年が終わった時点で13か月目の途中', 260)
  range(Math.floor((thirteen - SOLAR_YEAR) / 6)).forEach((i) => push(SOLAR_YEAR + (i + 1) * 6, '13か月目を最後まで数える', 8))
  push(thirteen, '13か月だと1年を18.66日越える', 400)
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
      headHtml('islamic-umalqura のラマダン初日', phase) +
      `<div class="ca-label">グレゴリオ暦の1年</div>` +
      `<div class="ca-year">${monthDays
        .map((n, i) => `<div class="ca-month" style="width:${n * scale}px">${i + 1}月</div>`)
        .join('')}${trail}<div class="ca-pin" style="left:${dayOfYear(iso) * scale}px"></div></div>` +
      counterHtml([
        ['ヒジュラ暦', String(hijri), '年'],
        ['ラマダン初日', `${y}年${m}月${d}日`, ''],
      ])
    )
  }
  const frames: Frame[] = []
  RAMADAN.forEach((_, i) => {
    const last = i === RAMADAN.length - 1
    frames.push({
      html: draw(i, last ? 'ヒジュラ暦で34年後、ほぼ同じ時期に戻る' : '毎年約11日ずつ早まる'),
      delay: i === 0 ? 160 : last ? 400 : 45,
    })
  })
  return frames
}

const buildMetonic = (): Frame[] => {
  const leapYears = [3, 6, 8, 11, 14, 17, 19]
  const yearGap = SOLAR_YEAR - 12 * SYNODIC_MONTH
  const gaugeScale = 17
  const st = { year: 0, gap: 0, leaps: 0, inserting: false }
  const draw = (phase: string) =>
    headHtml('ヘブライ暦の19年周期', phase) +
    `<div class="ca-label">各年の月の数</div>` +
    `<div class="ca-years">${range(19)
      .map((i) => {
        const y = i + 1
        const done = y < st.year || (y === st.year && !st.inserting)
        const months = leapYears.includes(y) ? 13 : 12
        return `<div class="ca-y${y === st.year ? ' now' : ''}${done && months === 13 ? ' leap' : ''}"><div class="ca-y-n">${y}</div><div class="ca-y-m">${done ? months : ''}</div></div>`
      })
      .join('')}</div>` +
    `<div class="ca-label">12か月の年を重ねたときの季節とのずれ</div>` +
    `<div class="ca-gauge"><div class="ca-gauge-fill${st.inserting ? ' over' : ''}" style="width:${Math.max(0, st.gap) * gaugeScale}px"></div><div class="ca-gauge-month" style="left:${SYNODIC_MONTH * gaugeScale}px"><span>1か月</span></div></div>` +
    counterHtml([
      ['経過', String(st.year), '年'],
      ['13か月の年', String(st.leaps), '回'],
      ['ずれ', st.gap.toFixed(2), '日'],
    ])
  const frames: Frame[] = []
  const push = (phase: string, delay: number) => frames.push({ html: draw(phase), delay })
  push('12か月の年は太陽年より10.88日短い', 160)
  range(19).forEach((i) => {
    const y = i + 1
    st.year = y
    st.gap += yearGap
    if (leapYears.includes(y)) {
      st.inserting = true
      push(`${y}年目、ずれが1か月に近づく`, 90)
      st.inserting = false
      st.gap -= SYNODIC_MONTH
      st.leaps++
      push(`${y}年目にうるう月を入れて13か月にする`, 110)
      return
    }
    push(`${y}年目は12か月`, 55)
  })
  push('19年でずれがほぼ0に戻る', 400)
  return frames
}

const CONVERT: [string, [number, string, number][]][] = [
  ['iso8601', range(14).map((i): [number, string, number] => [2026, 'M09', 10 + i])],
  ['hebrew', [[5786, 'M12', 28], [5786, 'M12', 29], ...range(12).map((i): [number, string, number] => [5787, 'M01', i + 1])]],
  ['chinese', [[2026, 'M07', 29], ...range(13).map((i): [number, string, number] => [2026, 'M08', i + 1])]],
  [
    'islamic-umalqura',
    [[1448, 'M03', 28], [1448, 'M03', 29], ...range(12).map((i): [number, string, number] => [1448, 'M04', i + 1])],
  ],
  ['ethiopic', [[2018, 'M13', 5], ...range(13).map((i): [number, string, number] => [2019, 'M01', i + 1])]],
  ['indian', [...range(13).map((i): [number, string, number] => [1948, 'M06', 19 + i]), [1948, 'M07', 1]]],
]

const buildConvert = (): Frame[] => {
  const draw = (cursor: number, phase: string) =>
    headHtml('ISO 8601の2026年9月10日から14日間', phase) +
    `<div class="ca-conv">${CONVERT.map(([id, days]) => {
      const [y, code, d] = days[Math.max(cursor, 0)]
      return (
        `<div class="ca-conv-name">${id}</div>` +
        `<div class="ca-conv-cells">${days
          .map(
            ([, , day], i) =>
              `<div class="ca-cv${i > cursor ? ' later' : day === 1 ? ' first' : ''}${i === cursor ? ' cursor' : ''}">${day}</div>`,
          )
          .join('')}</div>` +
        `<div class="ca-conv-val">${cursor < 0 ? '' : `${y}年 ${code} ${d}日`}</div>`
      )
    }).join('')}</div>`
  const special: Record<number, string> = {
    1: '中国暦で8月、エチオピア暦で2019年が始まる',
    2: 'ヘブライ暦で5787年、イスラム暦で4月が始まる',
    13: 'インド国定暦で7月が始まる',
  }
  const frames: Frame[] = [{ html: draw(-1, '同じ日付を暦ごとに読む'), delay: 120 }]
  range(14).forEach((i) =>
    frames.push({ html: draw(i, special[i] ?? `9月${10 + i}日`), delay: special[i] ? 170 : 40 }),
  )
  frames.push({ html: draw(13, '月が変わる日は暦ごとに違う'), delay: 400 })
  return frames
}

const buildAddYear = (overflow: 'constrain' | 'reject'): Frame[] => {
  const common = range(12).map((i) => `M${String(i + 1).padStart(2, '0')}`)
  const leap = [...common.slice(0, 5), 'M05L', ...common.slice(5)]
  const steps = ['暦の年月日に直す', '年に1を足す', 'monthCodeを探す', 'ISO 8601の日付に戻す']
  const draw = (step: number, year: number, codes: string[], cursor: number, hit: number, phase: string, result: string) =>
    raceHtml(
      `<span class="ca-code">overflow: "${overflow}"</span>`,
      phase,
      `<div class="ca-steps">${steps
        .map((t, i) => `<span class="ca-step${i === step ? ' on' : ''}">${t}</span>`)
        .join('<span class="ca-arrow">→</span>')}</div>` +
        `<div class="ca-months ca-months-sm"><span class="ca-yr">${year}年</span>${codes
          .map(
            (c, i) =>
              `<div class="ca-mo code${c.endsWith('L') ? ' leap' : ''}${i === hit ? ' hit' : i === cursor ? ' cursor' : ''}">${c}</div>`,
          )
          .join('')}</div>`,
      [['結果', result, '']],
    )
  const frames: Frame[] = []
  const push = (delay: number, ...args: Parameters<typeof draw>) => frames.push({ html: draw(...args), delay })
  push(130, 0, 5787, leap, 5, -1, '5787年 M05L 1日から始める', '-')
  push(120, 1, 5788, common, -1, -1, '5788年は12か月', '-')
  range(12).forEach((i) => push(12, 2, 5788, common, i, -1, 'M05Lを探す', '-'))
  if (overflow === 'constrain') {
    push(160, 2, 5788, common, -1, 5, 'M05LがないのでM06にする', '-')
    push(350, 3, 5788, common, -1, 5, '5788年 M06 1日', '2028-02-28')
    return frames
  }
  push(350, 2, 5788, common, -1, -1, 'M05LがないのでRangeErrorを投げる', 'RangeError')
  return frames
}

const builders: Record<SceneName, () => Frame[][]> = {
  cycles: () => [buildCycles()],
  ramadan: () => [buildRamadan()],
  metonic: () => [buildMetonic()],
  convert: () => [buildConvert()],
  addyear: () => [buildAddYear('constrain'), buildAddYear('reject')],
}

const raceTitles: Partial<Record<SceneName, string>> = {
  addyear: 'ヘブライ暦5787年 M05L 1日に1年足す',
}

const lanes = builders[props.scene]()
const raceTitle = raceTitles[props.scene]
const header = raceTitle ? headHtml(raceTitle, '') : ''
const tall = ['convert', 'addyear'].includes(props.scene)
const ends = lanes.map((fs) =>
  fs.reduce<number[]>((acc, f) => [...acc, (acc[acc.length - 1] ?? 0) + f.delay * 10], []),
)
const cycle = Math.max(...ends.map((e) => e[e.length - 1]))
const { isPrintMode } = useNav()
const elapsed = ref(isPrintMode.value ? cycle : 0)
const html = computed(
  () =>
    header +
    lanes
      .map((fs, i) => {
        const at = ends[i].findIndex((end) => elapsed.value < end)
        return fs[at < 0 ? fs.length - 1 : at].html
      })
      .join(''),
)
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
  <div class="cal-anim" :class="{ 'ca-tall': tall }" v-html="html" />
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
.cal-anim .ca-years {
  display: flex;
  gap: 4px;
}
.cal-anim .ca-y {
  width: 38px;
  border-radius: 6px;
  border: 1px solid #b5d0fb;
  text-align: center;
}
.cal-anim .ca-y.now {
  border: 2px solid var(--ca-blue);
}
.cal-anim .ca-y.leap {
  background: var(--ca-copy-bg);
  border-color: var(--ca-copy);
}
.cal-anim .ca-y-n {
  font-size: 11px;
}
.cal-anim .ca-y-m {
  font: 700 16px/22px 'Nunito', sans-serif;
  min-height: 22px;
}
.cal-anim .ca-gauge {
  position: relative;
  height: 30px;
  width: 700px;
  border-radius: 6px;
  background: var(--ca-light);
}
.cal-anim .ca-gauge-fill {
  height: 100%;
  border-radius: 6px;
  background: var(--ca-blue);
}
.cal-anim .ca-gauge-fill.over {
  background: var(--ca-copy);
}
.cal-anim .ca-gauge-month {
  position: absolute;
  top: -6px;
  bottom: -6px;
  border-left: 2px dashed var(--ca-navy);
}
.cal-anim .ca-gauge-month span {
  position: absolute;
  left: 6px;
  top: 6px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.cal-anim .ca-months {
  display: flex;
  gap: 4px;
}
.cal-anim .ca-mo {
  width: 50px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid #b5d0fb;
  background: var(--ca-light);
  color: var(--ca-blue);
  font: 700 15px/38px 'Nunito', sans-serif;
  text-align: center;
}
.cal-anim .ca-mo.code {
  font: 700 13px/38px ui-monospace, Menlo, monospace;
}
.cal-anim .ca-mo.leap {
  background: var(--ca-copy-bg);
  border-color: var(--ca-copy);
  color: var(--ca-navy);
}
.cal-anim .ca-mo.cursor {
  background: var(--ca-blue);
  border-color: var(--ca-blue);
  color: #fff;
}
.cal-anim.ca-tall {
  height: 390px;
}
.cal-anim .ca-race {
  margin-top: 16px;
}
.cal-anim .ca-race-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.cal-anim .ca-race-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ca-blue);
}
.cal-anim .ca-code {
  font: 700 16px ui-monospace, Menlo, monospace;
  color: var(--ca-blue);
}
.cal-anim .ca-race-phase {
  font-size: 14px;
  font-weight: 700;
}
.cal-anim .ca-race-counters {
  display: flex;
  gap: 22px;
  margin-top: 6px;
  font-size: 14px;
  min-height: 24px;
}
.cal-anim .ca-race-counters .ca-v {
  font-size: 18px;
  margin: 0 2px 0 6px;
}
.cal-anim .ca-conv {
  display: grid;
  grid-template-columns: 150px max-content 1fr;
  gap: 8px 14px;
  align-items: center;
  margin-top: 18px;
}
.cal-anim .ca-conv-name {
  font: 700 14px ui-monospace, Menlo, monospace;
  color: var(--ca-blue);
}
.cal-anim .ca-conv-cells {
  display: flex;
  gap: 3px;
}
.cal-anim .ca-cv {
  width: 32px;
  height: 36px;
  border-radius: 5px;
  border: 1px solid #b5d0fb;
  background: var(--ca-light);
  color: var(--ca-blue);
  font: 700 13px/34px 'Nunito', sans-serif;
  text-align: center;
}
.cal-anim .ca-cv.later {
  border: 1px dashed var(--ca-dash);
  background: #fff;
  color: var(--ca-dash);
}
.cal-anim .ca-cv.first {
  background: var(--ca-copy-bg);
  border-color: var(--ca-copy);
  color: var(--ca-navy);
}
.cal-anim .ca-cv.cursor {
  border: 2px solid var(--ca-blue);
  line-height: 32px;
}
.cal-anim .ca-conv-val {
  font: 700 14px 'Nunito', 'Noto Sans JP', sans-serif;
  white-space: nowrap;
}
.cal-anim .ca-steps {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.cal-anim .ca-step {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border: 1px solid var(--ca-dash);
  border-radius: 6px;
  color: var(--ca-dash);
}
.cal-anim .ca-step.on {
  border-color: var(--ca-blue);
  background: var(--ca-blue);
  color: #fff;
}
.cal-anim .ca-arrow {
  font-weight: 700;
  color: var(--ca-blue);
}
.cal-anim .ca-months-sm {
  align-items: center;
}
.cal-anim .ca-months-sm .ca-mo {
  width: 46px;
  height: 32px;
  line-height: 30px;
}
.cal-anim .ca-yr {
  width: 64px;
  font-size: 14px;
  font-weight: 700;
}
.cal-anim .ca-mo.hit {
  background: var(--ca-copy);
  border-color: var(--ca-copy);
  color: #fff;
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
