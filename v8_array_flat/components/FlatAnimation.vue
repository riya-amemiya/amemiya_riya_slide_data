<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useNav } from '@slidev/client'

type SceneName = 'old' | 'twopass' | 'bulk' | 'hole' | 'kinds' | 'barrier' | 'stack' | 'compare-twopass' | 'compare-bulk'
type Frame = { html: string; delay: number }
type Counter = [string, number, string]

const props = defineProps<{ scene: SceneName }>()

const GROUPS = 6
const PER = 10
const TOTAL = GROUPS * PER

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const newCapacity = (n: number) => n + (n >> 1) + 16
const headHtml = (title: string, phase: string) =>
  `<div class="fa-head"><div class="fa-title">${title}</div><div class="fa-phase">${phase}</div></div>`
const cellHtml = (cls: string, text: string) => `<div class="fa-c ${cls}">${text}</div>`
const counterHtml = (cs: Counter[]) =>
  `<div class="fa-counters">${cs
    .map(([k, v, u]) => `<div><span>${k}</span><span class="fa-v">${v}</span><span class="fa-u">${u}</span></div>`)
    .join('')}</div>`

type ArrayState = {
  phase: string
  activeGroup: number
  copyingGroup: number
  readCell: number
  capacity: number
  filled: number
  newFrom: number
  newTo: number
  newStyle: string
  copyingUpTo: number
  dstLabel: string
  counters: Counter[]
}

const arrayState = (counters: Counter[]): ArrayState => ({
  phase: '',
  activeGroup: -1,
  copyingGroup: -1,
  readCell: -1,
  capacity: 0,
  filled: 0,
  newFrom: -1,
  newTo: -1,
  newStyle: 'new',
  copyingUpTo: 0,
  dstLabel: '',
  counters,
})

const dstCellClass = (s: ArrayState, i: number) => {
  if (i < s.copyingUpTo) return 'copying'
  if (s.newFrom >= 0 && i >= s.newFrom && i <= s.newTo) return s.newStyle
  return i < s.filled ? 'filled' : 'empty'
}

const renderArrays = (title: string, s: ArrayState) =>
  headHtml(title, s.phase) +
  '<div class="fa-label">入力は要素10個のサブ配列6個</div>' +
  `<div class="fa-src">${range(GROUPS)
    .map(
      (g) =>
        `<div class="fa-group${g === s.activeGroup ? ' active' : ''}${g === s.copyingGroup ? ' copying' : ''}">${range(PER)
          .map(
            (i) =>
              `<div class="fa-s${g * PER + i === s.readCell ? ' read' : ''}${g === s.copyingGroup ? ' copying' : ''}"></div>`,
          )
          .join('')}</div>`,
    )
    .join('')}</div>` +
  `<div class="fa-label">${s.dstLabel.replace(/(\d+)(\D*)$/, '<span class="fa-cap">$1</span>$2')}</div>` +
  `<div class="fa-dst">${range(s.capacity)
    .map((i) => `<div class="fa-d ${dstCellClass(s, i)}">${i < s.filled || i < s.copyingUpTo ? i : ''}</div>`)
    .join('')}</div>` +
  counterHtml(s.counters)

const renderLane = (title: string, s: ArrayState) =>
  `<div class="fa-race-lane"><div class="fa-race-head"><span class="fa-race-title">${title}</span><span class="fa-race-phase">${s.phase}</span></div>` +
  `<div class="fa-race-dst">${range(s.capacity)
    .map((i) => `<div class="fa-rd ${dstCellClass(s, i)}"></div>`)
    .join('')}</div>` +
  `<div class="fa-race-counters">${s.counters
    .map(([k, v, u]) => `<span>${k}<span class="fa-v">${v}</span>${u}</span>`)
    .join('')}</div></div>`

type Render = (s: ArrayState) => string

const buildOld = (render: Render): Frame[] => {
  const alloc: Counter = ['確保', 0, '回']
  const write: Counter = ['書き込み', 0, '回']
  const recopy: Counter = ['コピーし直し', 0, '個']
  const recurse: Counter = ['再帰呼び出し', 0, '回']
  const s = arrayState([alloc, write, recopy, recurse])
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: render(s), delay })
  s.dstLabel = '結果配列の容量は 0'
  s.phase = '長さ0の配列から始める'
  push(120)
  range(GROUPS).forEach((g) => {
    s.activeGroup = g
    recurse[1]++
    s.phase = 'サブ配列ごとに再帰呼び出し'
    s.readCell = -1
    s.newFrom = -1
    s.newTo = -1
    push(45)
    range(PER).forEach((i) => {
      const idx = g * PER + i
      if (s.filled === s.capacity) {
        const cap = newCapacity(s.filled + 1)
        s.phase = '容量が足りない'
        s.readCell = idx
        s.newFrom = -1
        s.newTo = -1
        push(60)
        alloc[1]++
        recopy[1] += s.filled
        s.capacity = cap
        s.copyingUpTo = s.filled
        s.phase = s.filled === 0 ? `容量${cap}で確保` : `容量${cap}で確保し直し、中身をコピー`
        s.dstLabel = `結果配列の容量は ${cap}`
        push(s.filled === 0 ? 70 : 110)
        s.copyingUpTo = 0
      }
      s.phase = '1個ずつ追加'
      s.readCell = idx
      s.filled++
      s.newFrom = idx
      s.newTo = idx
      write[1]++
      push(7)
    })
  })
  s.activeGroup = -1
  s.readCell = -1
  s.newFrom = -1
  s.newTo = -1
  s.phase = '完了'
  push(350)
  return frames
}

const buildTwoPass = (bulk: boolean, render: Render): Frame[] => {
  const alloc: Counter = ['確保', 0, '回']
  const work: Counter = bulk ? ['memcpy', 0, '回'] : ['書き込み', 0, '回']
  const check: Counter = ['確認', 0, '回']
  const s = arrayState([alloc, work, check])
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: render(s), delay })
  s.dstLabel = '第1パスで数えた長さは 0'
  s.phase = '第1パスで長さを数える'
  push(100)
  range(GROUPS).forEach((g) => {
    s.activeGroup = g
    s.phase = '各サブ配列の .length を足す'
    s.dstLabel = `第1パスで数えた長さは ${(g + 1) * PER}`
    push(40)
  })
  s.activeGroup = -1
  alloc[1]++
  s.capacity = TOTAL
  s.phase = `容量${TOTAL}で1回だけ確保`
  s.dstLabel = `結果配列の容量は ${TOTAL}`
  push(110)
  range(GROUPS).forEach((g) => {
    if (bulk) {
      s.copyingGroup = g
      s.phase = '第2パスでサブ配列ごとにmemcpy'
      check[1]++
      work[1]++
      s.filled += PER
      s.newFrom = g * PER
      s.newTo = g * PER + PER - 1
      s.newStyle = 'copying'
      push(50)
      return
    }
    s.activeGroup = g
    range(PER).forEach((i) => {
      const idx = g * PER + i
      s.phase = '第2パスで1個ずつ書き込む'
      s.readCell = idx
      s.filled++
      s.newFrom = idx
      s.newTo = idx
      check[1] += 4
      work[1]++
      push(7)
    })
  })
  s.activeGroup = -1
  s.copyingGroup = -1
  s.readCell = -1
  s.newFrom = -1
  s.newTo = -1
  s.phase = '完了'
  push(350)
  return frames
}

const buildHole = (): Frame[] => {
  const src = [1, null, 3, 4, null, 6, null, 8, 9, null]
  const st = { phase: '', read: -1, skip: -1, len: 0, cap: 0, out: [] as number[], newIdx: -1, alloc: 0, writes: 0, holes: 0 }
  const draw = () =>
    headHtml('holeを詰める', st.phase) +
    '<div class="fa-label">入力は .length が 10 の配列</div>' +
    `<div class="fa-cells">${src
      .map((v, i) =>
        v === null ? cellHtml(`hole${i === st.skip ? ' skip' : ''}`, 'hole') : cellHtml(i === st.read ? 'read' : '', String(v)),
      )
      .join('')}</div>` +
    `<div class="fa-label">${
      st.cap
        ? `結果配列の容量は <span class="fa-cap">${st.cap}</span>`
        : `第1パスで数えた長さは <span class="fa-cap">${st.len}</span>`
    }</div>` +
    `<div class="fa-cells">${range(st.cap)
      .map((i) => (i < st.out.length ? cellHtml(i === st.newIdx ? 'new' : '', String(st.out[i])) : cellHtml('empty', '')))
      .join('')}</div>` +
    counterHtml([
      ['確保', st.alloc, '回'],
      ['書き込み', st.writes, '回'],
      ['飛ばしたhole', st.holes, '個'],
    ])
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  st.phase = '第1パスでholeでない要素を数える'
  push(100)
  src.forEach((v, i) => {
    st.read = v === null ? -1 : i
    st.skip = v === null ? i : -1
    st.len += v === null ? 0 : 1
    push(v === null ? 45 : 30)
  })
  st.read = -1
  st.skip = -1
  st.alloc = 1
  st.cap = st.len
  st.phase = `容量${st.len}で1回だけ確保`
  push(110)
  st.phase = '第2パスでholeを飛ばして書き込む'
  src.forEach((v, i) => {
    st.read = v === null ? -1 : i
    st.skip = v === null ? i : -1
    st.newIdx = -1
    if (v === null) {
      st.holes++
    } else {
      st.out.push(v)
      st.newIdx = st.out.length - 1
      st.writes++
    }
    push(v === null ? 45 : 30)
  })
  st.read = -1
  st.skip = -1
  st.newIdx = -1
  st.phase = '完了'
  push(350)
  return frames
}

const buildKinds = (): Frame[] => {
  const leaves = ['1', '2', '3.5', '"a"', '"b"']
  const kindOf = (v: string) => (v.startsWith('"') ? 2 : v.includes('.') ? 1 : 0)
  const names = ['PACKED_SMI', 'PACKED_DOUBLE', 'PACKED_ELEMENTS']
  const st = { phase: '' }
  const o = { kind: -1, flash: false, cells: [] as string[], copyUpTo: 0, newIdx: -1, alloc: 0, copied: 0 }
  const n = { kind: -1, cap: 0, cells: [] as string[], newIdx: -1, alloc: 0, seen: [false, false, false], read: -1 }
  const lane = (name: string, kindHtml: string, body: string, stats: string) =>
    `<div class="fa-lane"><div class="fa-lane-name">${name}</div><div class="fa-row">${kindHtml}${body}</div><div class="fa-stat">${stats}</div></div>`
  const stats = (a: number, c: number) => `確保<span class="fa-v">${a}</span>回 コピーし直し<span class="fa-v">${c}</span>個`
  const oldKind = () =>
    o.kind < 0
      ? '<div class="fa-kind" style="visibility:hidden">-</div>'
      : `<div class="fa-kind${o.flash ? ' flash' : ''}">${names[o.kind]}</div>`
  const oldBody = () =>
    o.kind < 0
      ? ''
      : `<div class="fa-alloc">${o.cells
          .map((v, i) => cellHtml(i < o.copyUpTo ? 'copy' : i === o.newIdx ? 'new' : '', v))
          .join('')}</div>`
  const newKind = () =>
    n.kind < 0
      ? `<div class="fa-flags">${['seenSmi', 'seenDouble', 'seenObject']
          .map((f, i) => `<span class="fa-flag${n.seen[i] ? ' on' : ''}">${f}</span>`)
          .join('')}</div>`
      : `<div class="fa-kind">${names[n.kind]}</div>`
  const newBody = () =>
    n.kind < 0
      ? `<div class="fa-cells">${leaves.map((v, i) => cellHtml(i === n.read ? 'read' : '', v)).join('')}</div>`
      : `<div class="fa-alloc">${range(n.cap)
          .map((i) => (i < n.cells.length ? cellHtml(i === n.newIdx ? 'new' : '', n.cells[i]) : cellHtml('empty', '')))
          .join('')}</div>`
  const draw = () =>
    headHtml('型が混ざった配列', st.phase) +
    '<div class="fa-label">入力は <span class="fa-mono">[[1, 2], [3.5], ["a", "b"]]</span></div>' +
    lane('最適化前', oldKind(), oldBody(), stats(o.alloc, o.copied)) +
    lane('2パス方式', newKind(), newBody(), stats(n.alloc, 0))
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  st.phase = '最適化前は1個ずつ足していく'
  push(110)
  leaves.forEach((v) => {
    const k = kindOf(v)
    o.flash = false
    o.copyUpTo = 0
    o.newIdx = -1
    if (o.kind < 0) {
      o.kind = k
      o.alloc++
      st.phase = `${names[k]} で確保`
      push(70)
    } else if (k > o.kind) {
      o.kind = k
      o.flash = true
      o.alloc++
      o.copied += o.cells.length
      o.copyUpTo = o.cells.length
      st.phase = `${v} が来たので ${names[k]} で確保し直し`
      push(130)
      o.flash = false
      o.copyUpTo = 0
    }
    o.cells.push(v)
    o.newIdx = o.cells.length - 1
    st.phase = `${v} を追加`
    push(50)
  })
  o.newIdx = -1
  st.phase = '2パス方式は第1パスで型を調べる'
  push(110)
  leaves.forEach((v, i) => {
    n.read = i
    n.seen[kindOf(v)] = true
    push(45)
  })
  n.read = -1
  n.kind = 2
  n.cap = leaves.length
  n.alloc = 1
  st.phase = 'PACKED_ELEMENTS で1回だけ確保'
  push(120)
  st.phase = '第2パスで書き込む'
  leaves.forEach((v) => {
    n.cells.push(v)
    n.newIdx = n.cells.length - 1
    push(40)
  })
  n.newIdx = -1
  st.phase = '完了'
  push(350)
  return frames
}

const buildBarrier = (): Frame[] => {
  const N = 5
  const st = { phase: '', smiDone: false, smiCopying: false, objDone: 0, objNow: -1, notify: 0 }
  const lane = (name: string, src: string, dst: string, stat: string, note: string) =>
    `<div class="fa-lane fa-lane-wide"><div class="fa-lane-name">${name}</div><div><div class="fa-row">${src}<span class="fa-arrow">→</span>${dst}</div><div class="fa-note">${note}</div></div><div class="fa-stat">${stat}</div></div>`
  const draw = () =>
    headHtml('サブ配列を結果配列へコピー', st.phase) +
    lane(
      'PACKED_SMI_ELEMENTS',
      `<div class="fa-cells">${range(N).map((i) => cellHtml(st.smiCopying ? 'copy' : '', String(i + 1))).join('')}</div>`,
      `<div class="fa-alloc">${range(N)
        .map((i) => (st.smiDone || st.smiCopying ? cellHtml(st.smiCopying ? 'copy' : '', String(i + 1)) : cellHtml('empty', '')))
        .join('')}</div>`,
      'GCへの通知<span class="fa-v">0</span>回',
      st.smiCopying ? 'memcpyでまとめてコピー' : '',
    ) +
    lane(
      'PACKED_ELEMENTS',
      `<div class="fa-cells">${range(N).map((i) => cellHtml(`ptr${i === st.objNow ? ' read' : ''}`, 'obj')).join('')}</div>`,
      `<div class="fa-alloc">${range(N)
        .map((i) => (i < st.objDone ? cellHtml(`ptr${i === st.objNow ? ' new' : ''}`, 'obj') : cellHtml('empty', '')))
        .join('')}</div>`,
      `GCへの通知<span class="fa-v">${st.notify}</span>回`,
      st.objNow >= 0 ? '1個書くたびにwrite barrierでGCに通知' : '',
    )
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  st.phase = '同じ長さのサブ配列を2つコピーする'
  push(120)
  range(N).forEach((i) => {
    st.smiCopying = i === 0
    st.smiDone = i > 0
    st.objNow = i
    st.objDone = i + 1
    st.notify = i + 1
    st.phase = 'コピー中'
    push(55)
  })
  st.smiCopying = false
  st.smiDone = true
  st.objNow = -1
  st.phase = '完了'
  push(350)
  return frames
}

const buildStack = (): Frame[] => {
  const arrays: Record<string, string[]> = {
    '外側': ['X', 'Y'],
    X: ['"a"', 'Z'],
    Z: ['"b"', '"c"'],
    Y: ['"d"'],
  }
  const st = {
    phase: '',
    cur: '外側',
    idx: 0,
    depth: 2,
    stack: [] as [string, number, number][],
    pushed: false,
    out: [] as string[],
    newIdx: -1,
  }
  const draw = () =>
    headHtml('明示的スタック', st.phase) +
    '<div class="fa-label">入力は <span class="fa-mono">[X, Y].flat(2)</span>　<span class="fa-mono">X = ["a", Z]</span>　<span class="fa-mono">Z = ["b", "c"]</span>　<span class="fa-mono">Y = ["d"]</span></div>' +
    `<div class="fa-lane fa-lane-two"><div class="fa-lane-name">見ている配列</div><div class="fa-row"><span class="fa-cur">${st.cur}</span><div class="fa-cells">${arrays[
      st.cur
    ]
      .map((v, i) => cellHtml(i === st.idx ? 'read' : '', v))
      .join('')}</div><span class="fa-stat">残りの深さ<span class="fa-v">${st.depth}</span></span></div></div>` +
    `<div class="fa-lane fa-lane-two"><div class="fa-lane-name">スタック</div><div class="fa-stack">${
      st.stack.length
        ? st.stack
            .map(
              (e, i) =>
                `<div class="fa-entry${st.pushed && i === st.stack.length - 1 ? ' push' : ''}"><span class="fa-k">配列</span>${e[0]} <span class="fa-k">再開位置</span>${e[1]} <span class="fa-k">深さ</span>${e[2]}</div>`,
            )
            .join('')
        : '<span class="fa-stat fa-empty-text">空</span>'
    }</div></div>` +
    `<div class="fa-lane fa-lane-two"><div class="fa-lane-name">結果</div><div class="fa-cells">${st.out
      .map((v, i) => cellHtml(i === st.newIdx ? 'new' : '', v))
      .join('')}</div></div>`
  const frames: Frame[] = []
  const push = (delay: number) => frames.push({ html: draw(), delay })
  const walk = (): void => {
    const items = arrays[st.cur]
    st.newIdx = -1
    st.pushed = false
    if (st.idx < items.length) {
      const v = items[st.idx]
      if (v in arrays && st.depth > 0) {
        st.phase = `${v} は配列なので、戻り先を積んで中に入る`
        push(70)
        st.stack.push([st.cur, st.idx + 1, st.depth])
        st.cur = v
        st.idx = 0
        st.depth -= 1
        st.pushed = true
        push(110)
      } else {
        st.out.push(v)
        st.newIdx = st.out.length - 1
        st.phase = `${v} を結果に書く`
        push(60)
        st.idx++
      }
      walk()
      return
    }
    const top = st.stack[st.stack.length - 1]
    if (!top) return
    st.phase = `${st.cur} を見終わったので、スタックから戻る`
    push(80)
    st.stack.pop()
    st.cur = top[0]
    st.idx = top[1]
    st.depth = top[2]
    push(80)
    walk()
  }
  st.phase = '外側の配列から見ていく'
  push(110)
  walk()
  st.phase = '完了'
  push(350)
  return frames
}

const builders: Record<SceneName, () => Frame[][]> = {
  old: () => [buildOld((s) => renderArrays('最適化前', s))],
  twopass: () => [buildTwoPass(false, (s) => renderArrays('2パス方式', s))],
  bulk: () => [buildTwoPass(true, (s) => renderArrays('バルクコピー', s))],
  hole: () => [buildHole()],
  kinds: () => [buildKinds()],
  barrier: () => [buildBarrier()],
  stack: () => [buildStack()],
  'compare-twopass': () => [
    buildOld((s) => renderLane('最適化前', s)),
    buildTwoPass(false, (s) => renderLane('2パス方式', s)),
  ],
  'compare-bulk': () => [
    buildTwoPass(false, (s) => renderLane('2パス方式', s)),
    buildTwoPass(true, (s) => renderLane('バルクコピー', s)),
  ],
}

const raceTitles: Partial<Record<SceneName, string>> = {
  'compare-twopass': '最適化前と2パス方式を同時に動かす',
  'compare-bulk': '2パス方式とバルクコピーを同時に動かす',
}

const lanes = builders[props.scene]()
const raceTitle = raceTitles[props.scene]
const header = raceTitle ? headHtml(raceTitle, '入力は要素10個のサブ配列6個') : ''
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

onMounted(() => {
  if (isPrintMode.value) return
  const start = performance.now()
  timer.value = setInterval(() => {
    elapsed.value = (performance.now() - start) % cycle
  }, 30)
})
onUnmounted(() => clearInterval(timer.value))
</script>

<template>
  <div class="flat-anim" v-html="html" />
</template>

<style>
.flat-anim {
  --fa-blue: #3984fd;
  --fa-navy: #243762;
  --fa-light: #f0f7ff;
  --fa-dash: #b9c6dd;
  --fa-copy: #ffb020;
  --fa-copy-bg: #fff4dc;
  position: relative;
  width: 880px;
  height: 300px;
  padding: 18px 20px;
  margin-bottom: 12px;
  background: #fff;
  color: var(--fa-navy);
  text-align: left;
}
.flat-anim,
.flat-anim * {
  box-sizing: border-box;
}
.flat-anim div,
.flat-anim span {
  font-family: 'Noto Sans JP', sans-serif;
}
.flat-anim .fa-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  height: 34px;
}
.flat-anim .fa-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--fa-blue);
}
.flat-anim .fa-phase {
  font-size: 16px;
  font-weight: 700;
}
.flat-anim .fa-label {
  font-size: 14px;
  font-weight: 700;
  margin: 10px 0 6px;
}
.flat-anim .fa-cap,
.flat-anim .fa-v {
  color: var(--fa-blue);
}
.flat-anim .fa-src {
  display: flex;
  gap: 6px;
}
.flat-anim .fa-group {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 2px solid transparent;
  border-radius: 6px;
}
.flat-anim .fa-group.active {
  border-color: var(--fa-blue);
}
.flat-anim .fa-group.copying {
  border-color: var(--fa-copy);
  background: var(--fa-copy-bg);
}
.flat-anim .fa-s {
  width: 10px;
  height: 22px;
  border-radius: 3px;
  background: var(--fa-light);
  border: 1px solid #b5d0fb;
}
.flat-anim .fa-s.read {
  background: var(--fa-blue);
  border-color: var(--fa-blue);
}
.flat-anim .fa-s.copying {
  background: var(--fa-copy);
  border-color: var(--fa-copy);
}
.flat-anim .fa-dst {
  display: grid;
  grid-template-columns: repeat(30, 24px);
  gap: 4px;
  min-height: 52px;
}
.flat-anim .fa-d {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font: 700 10px/22px 'Nunito', sans-serif;
  text-align: center;
}
.flat-anim .fa-d.empty {
  border: 1px dashed var(--fa-dash);
  background: #fff;
}
.flat-anim .fa-d.filled {
  border: 1px solid #b5d0fb;
  background: var(--fa-light);
  color: var(--fa-blue);
}
.flat-anim .fa-d.new {
  border: 1px solid var(--fa-blue);
  background: var(--fa-blue);
  color: #fff;
}
.flat-anim .fa-d.copying {
  border: 1px solid var(--fa-copy);
  background: var(--fa-copy);
  color: #fff;
}
.flat-anim .fa-counters {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 16px;
  display: flex;
  gap: 28px;
  font-size: 15px;
}
.flat-anim .fa-counters .fa-v {
  font: 700 20px 'Nunito', 'Noto Sans JP', sans-serif;
  margin-left: 6px;
}
.flat-anim .fa-u {
  font-size: 13px;
  margin-left: 2px;
}
.flat-anim .fa-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.flat-anim .fa-cells {
  display: flex;
  gap: 6px;
  min-height: 40px;
  align-items: center;
}
.flat-anim .fa-c {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  font: 700 15px/38px 'Nunito', 'Noto Sans JP', sans-serif;
  text-align: center;
  border: 1px solid #b5d0fb;
  background: var(--fa-light);
  color: var(--fa-blue);
}
.flat-anim .fa-c.hole {
  border: 1px dashed var(--fa-dash);
  background: #fff;
  color: var(--fa-dash);
  font-size: 11px;
}
.flat-anim .fa-c.empty {
  border: 1px dashed var(--fa-dash);
  background: #fff;
}
.flat-anim .fa-c.read {
  border: 2px solid var(--fa-blue);
}
.flat-anim .fa-c.skip {
  border: 2px dashed var(--fa-copy);
  color: var(--fa-copy);
}
.flat-anim .fa-c.new {
  border-color: var(--fa-blue);
  background: var(--fa-blue);
  color: #fff;
}
.flat-anim .fa-c.copy {
  border-color: var(--fa-copy);
  background: var(--fa-copy);
  color: #fff;
}
.flat-anim .fa-c.ptr {
  font-size: 13px;
}
.flat-anim .fa-alloc {
  display: flex;
  gap: 6px;
  padding: 4px;
  border: 2px solid var(--fa-blue);
  border-radius: 8px;
  min-height: 52px;
  align-items: center;
}
.flat-anim .fa-kind {
  font: 700 13px ui-monospace, Menlo, monospace;
  padding: 5px 9px;
  border: 2px solid var(--fa-blue);
  border-radius: 8px;
  background: var(--fa-light);
  min-width: 150px;
  text-align: center;
}
.flat-anim .fa-kind.flash {
  border-color: var(--fa-copy);
  background: var(--fa-copy-bg);
}
.flat-anim .fa-lane {
  display: grid;
  grid-template-columns: 110px 1fr 190px;
  gap: 12px;
  align-items: center;
  margin-top: 14px;
}
.flat-anim .fa-lane-wide {
  grid-template-columns: 190px 1fr 150px;
}
.flat-anim .fa-lane-two {
  grid-template-columns: 150px 1fr;
  margin-top: 8px;
}
.flat-anim .fa-lane-name {
  font-weight: 700;
  color: var(--fa-blue);
  font-size: 15px;
}
.flat-anim .fa-stat {
  font-size: 14px;
}
.flat-anim .fa-stat .fa-v {
  font: 700 20px 'Nunito', 'Noto Sans JP', sans-serif;
  margin: 0 2px 0 6px;
}
.flat-anim .fa-note {
  font-size: 13px;
  font-weight: 700;
  color: var(--fa-copy);
  min-height: 20px;
}
.flat-anim .fa-arrow {
  font-weight: 700;
  color: var(--fa-blue);
}
.flat-anim .fa-flags {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 150px;
}
.flat-anim .fa-flag {
  font: 700 12px ui-monospace, Menlo, monospace;
  padding: 1px 8px;
  border-radius: 6px;
  border: 1px solid var(--fa-dash);
  color: var(--fa-dash);
  text-align: center;
}
.flat-anim .fa-flag.on {
  border-color: var(--fa-blue);
  color: var(--fa-blue);
  background: var(--fa-light);
}
.flat-anim .fa-stack {
  display: flex;
  gap: 8px;
  min-height: 58px;
  align-items: flex-end;
}
.flat-anim .fa-entry {
  border: 2px solid var(--fa-blue);
  border-radius: 8px;
  padding: 4px 10px;
  font: 700 13px/1.5 'Nunito', 'Noto Sans JP', sans-serif;
  background: var(--fa-light);
}
.flat-anim .fa-entry.push {
  border-color: var(--fa-copy);
  background: var(--fa-copy-bg);
}
.flat-anim .fa-k {
  font-weight: 400;
  font-size: 12px;
  margin-right: 4px;
}
.flat-anim .fa-cur {
  font-weight: 700;
  min-width: 44px;
}
.flat-anim .fa-empty-text {
  color: var(--fa-dash);
}
.flat-anim .fa-mono {
  font-family: ui-monospace, Menlo, monospace;
}
.flat-anim .fa-race-lane {
  margin-top: 14px;
}
.flat-anim .fa-race-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.flat-anim .fa-race-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--fa-blue);
}
.flat-anim .fa-race-phase {
  font-size: 14px;
  font-weight: 700;
}
.flat-anim .fa-race-dst {
  display: grid;
  grid-template-columns: repeat(41, 14px);
  gap: 2px;
  min-height: 30px;
}
.flat-anim .fa-rd {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}
.flat-anim .fa-rd.empty {
  border: 1px dashed var(--fa-dash);
  background: #fff;
}
.flat-anim .fa-rd.filled {
  background: #9cc2fd;
}
.flat-anim .fa-rd.new {
  background: var(--fa-blue);
}
.flat-anim .fa-rd.copying {
  background: var(--fa-copy);
}
.flat-anim .fa-race-counters {
  display: flex;
  gap: 22px;
  margin-top: 6px;
  font-size: 14px;
}
.flat-anim .fa-race-counters .fa-v {
  font: 700 18px 'Nunito', 'Noto Sans JP', sans-serif;
  margin: 0 2px 0 6px;
}
</style>
