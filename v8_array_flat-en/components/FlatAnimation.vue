<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useNav } from "@slidev/client";

type SceneName =
  | "old"
  | "twopass"
  | "bulk"
  | "hole"
  | "kinds"
  | "barrier"
  | "compare-twopass"
  | "compare-bulk"
  | "flow-old"
  | "flow-new";
type Frame = { html: string; delay: number };
type Counter = [string, number, string];

const props = defineProps<{ scene: SceneName }>();

const GROUPS = 6;
const PER = 10;
const TOTAL = GROUPS * PER;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const newCapacity = (n: number) => n + (n >> 1) + 16;
const headHtml = (title: string, phase: string) =>
  `<div class="fa-head"><div class="fa-title">${title}</div><div class="fa-phase">${phase}</div></div>`;
const cellHtml = (cls: string, text: string) => `<div class="fa-c ${cls}">${text}</div>`;
const counterHtml = (cs: Counter[]) =>
  `<div class="fa-counters">${cs
    .map(
      ([k, v, u]) =>
        `<div><span>${k}</span><span class="fa-v">${v}</span><span class="fa-u">${u}</span></div>`,
    )
    .join("")}</div>`;

type ArrayState = {
  phase: string;
  activeGroup: number;
  copyingGroup: number;
  readCell: number;
  capacity: number;
  filled: number;
  newFrom: number;
  newTo: number;
  newStyle: string;
  copyingUpTo: number;
  dstLabel: string;
  counters: Counter[];
};

const arrayState = (counters: Counter[]): ArrayState => ({
  phase: "",
  activeGroup: -1,
  copyingGroup: -1,
  readCell: -1,
  capacity: 0,
  filled: 0,
  newFrom: -1,
  newTo: -1,
  newStyle: "new",
  copyingUpTo: 0,
  dstLabel: "",
  counters,
});

const dstCellClass = (s: ArrayState, i: number) => {
  if (i < s.copyingUpTo) return "copying";
  if (s.newFrom >= 0 && i >= s.newFrom && i <= s.newTo) return s.newStyle;
  return i < s.filled ? "filled" : "empty";
};

const renderArrays = (title: string, s: ArrayState) =>
  headHtml(title, s.phase) +
  '<div class="fa-label">Input is 6 sub-arrays of 10 elements</div>' +
  `<div class="fa-src">${range(GROUPS)
    .map(
      (g) =>
        `<div class="fa-group${g === s.activeGroup ? " active" : ""}${g === s.copyingGroup ? " copying" : ""}">${range(
          PER,
        )
          .map(
            (i) =>
              `<div class="fa-s${g * PER + i === s.readCell ? " read" : ""}${g === s.copyingGroup ? " copying" : ""}"></div>`,
          )
          .join("")}</div>`,
    )
    .join("")}</div>` +
  `<div class="fa-label">${s.dstLabel.replace(/(\d+)(\D*)$/, '<span class="fa-cap">$1</span>$2')}</div>` +
  `<div class="fa-dst">${range(s.capacity)
    .map(
      (i) =>
        `<div class="fa-d ${dstCellClass(s, i)}">${i < s.filled || i < s.copyingUpTo ? i : ""}</div>`,
    )
    .join("")}</div>` +
  counterHtml(s.counters);

const renderLane = (title: string, s: ArrayState) =>
  `<div class="fa-race-lane"><div class="fa-race-head"><span class="fa-race-title">${title}</span><span class="fa-race-phase">${s.phase}</span></div>` +
  `<div class="fa-race-dst">${range(s.capacity)
    .map((i) => `<div class="fa-rd ${dstCellClass(s, i)}"></div>`)
    .join("")}</div>` +
  `<div class="fa-race-counters">${s.counters
    .map(([k, v, u]) => `<span>${k}<span class="fa-v">${v}</span>${u}</span>`)
    .join("")}</div></div>`;

type Render = (s: ArrayState) => string;

const buildOld = (render: Render): Frame[] => {
  const alloc: Counter = ["Allocations", 0, ""];
  const write: Counter = ["Writes", 0, ""];
  const recopy: Counter = ["Re-copied", 0, ""];
  const recurse: Counter = ["Recursive calls", 0, ""];
  const s = arrayState([alloc, write, recopy, recurse]);
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: render(s), delay });
  s.dstLabel = "Result array capacity is 0";
  s.phase = "Start from an empty array";
  push(120);
  range(GROUPS).forEach((g) => {
    s.activeGroup = g;
    recurse[1]++;
    s.phase = "Recursive call per sub-array";
    s.readCell = -1;
    s.newFrom = -1;
    s.newTo = -1;
    push(45);
    range(PER).forEach((i) => {
      const idx = g * PER + i;
      if (s.filled === s.capacity) {
        const cap = newCapacity(s.filled + 1);
        s.phase = "Out of capacity";
        s.readCell = idx;
        s.newFrom = -1;
        s.newTo = -1;
        push(60);
        alloc[1]++;
        recopy[1] += s.filled;
        s.capacity = cap;
        s.copyingUpTo = s.filled;
        s.phase =
          s.filled === 0
            ? `Allocate capacity ${cap}`
            : `Reallocate to ${cap} and copy the contents`;
        s.dstLabel = `Result array capacity is ${cap}`;
        push(s.filled === 0 ? 70 : 110);
        s.copyingUpTo = 0;
      }
      s.phase = "Append one at a time";
      s.readCell = idx;
      s.filled++;
      s.newFrom = idx;
      s.newTo = idx;
      write[1]++;
      push(7);
    });
  });
  s.activeGroup = -1;
  s.readCell = -1;
  s.newFrom = -1;
  s.newTo = -1;
  s.phase = "Done";
  push(350);
  return frames;
};

const buildTwoPass = (bulk: boolean, render: Render): Frame[] => {
  const alloc: Counter = ["Allocations", 0, ""];
  const work: Counter = bulk ? ["memcpy", 0, ""] : ["Writes", 0, ""];
  const check: Counter = ["Checks", 0, ""];
  const s = arrayState([alloc, work, check]);
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: render(s), delay });
  s.dstLabel = "Length counted in pass 1 is 0";
  s.phase = "Pass 1 counts the length";
  push(100);
  range(GROUPS).forEach((g) => {
    s.activeGroup = g;
    s.phase = "Add each sub-array's .length";
    s.dstLabel = `Length counted in pass 1 is ${(g + 1) * PER}`;
    push(40);
  });
  s.activeGroup = -1;
  alloc[1]++;
  s.capacity = TOTAL;
  s.phase = `Allocate capacity ${TOTAL} only once`;
  s.dstLabel = `Result array capacity is ${TOTAL}`;
  push(110);
  range(GROUPS).forEach((g) => {
    if (bulk) {
      s.copyingGroup = g;
      s.phase = "Pass 2 memcpys each sub-array";
      check[1]++;
      work[1]++;
      s.filled += PER;
      s.newFrom = g * PER;
      s.newTo = g * PER + PER - 1;
      s.newStyle = "copying";
      push(50);
      return;
    }
    s.activeGroup = g;
    range(PER).forEach((i) => {
      const idx = g * PER + i;
      s.phase = "Pass 2 writes one at a time";
      s.readCell = idx;
      s.filled++;
      s.newFrom = idx;
      s.newTo = idx;
      check[1] += 4;
      work[1]++;
      push(7);
    });
  });
  s.activeGroup = -1;
  s.copyingGroup = -1;
  s.readCell = -1;
  s.newFrom = -1;
  s.newTo = -1;
  s.phase = "Done";
  push(350);
  return frames;
};

const buildHole = (): Frame[] => {
  const src = [1, null, 3, 4, null, 6, null, 8, 9, null];
  const st = {
    phase: "",
    read: -1,
    skip: -1,
    len: 0,
    cap: 0,
    out: [] as number[],
    newIdx: -1,
    alloc: 0,
    writes: 0,
    holes: 0,
  };
  const draw = () =>
    headHtml("Compacting holes", st.phase) +
    '<div class="fa-label">Input array has .length 10</div>' +
    `<div class="fa-cells">${src
      .map((v, i) =>
        v === null
          ? cellHtml(`hole${i === st.skip ? " skip" : ""}`, "hole")
          : cellHtml(i === st.read ? "read" : "", String(v)),
      )
      .join("")}</div>` +
    `<div class="fa-label">${
      st.cap
        ? `Result array capacity is <span class="fa-cap">${st.cap}</span>`
        : `Length counted in pass 1 is <span class="fa-cap">${st.len}</span>`
    }</div>` +
    `<div class="fa-cells">${range(st.cap)
      .map((i) =>
        i < st.out.length
          ? cellHtml(i === st.newIdx ? "new" : "", String(st.out[i]))
          : cellHtml("empty", ""),
      )
      .join("")}</div>` +
    counterHtml([
      ["Allocations", st.alloc, ""],
      ["Writes", st.writes, ""],
      ["Skipped holes", st.holes, ""],
    ]);
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: draw(), delay });
  st.phase = "Pass 1 counts the non-hole elements";
  push(100);
  src.forEach((v, i) => {
    st.read = v === null ? -1 : i;
    st.skip = v === null ? i : -1;
    st.len += v === null ? 0 : 1;
    push(v === null ? 45 : 30);
  });
  st.read = -1;
  st.skip = -1;
  st.alloc = 1;
  st.cap = st.len;
  st.phase = `Allocate capacity ${st.len} only once`;
  push(110);
  st.phase = "Pass 2 skips holes while writing";
  src.forEach((v, i) => {
    st.read = v === null ? -1 : i;
    st.skip = v === null ? i : -1;
    st.newIdx = -1;
    if (v === null) {
      st.holes++;
    } else {
      st.out.push(v);
      st.newIdx = st.out.length - 1;
      st.writes++;
    }
    push(v === null ? 45 : 30);
  });
  st.read = -1;
  st.skip = -1;
  st.newIdx = -1;
  st.phase = "Done";
  push(350);
  return frames;
};

const buildKinds = (): Frame[] => {
  const leaves = ["1", "2", "3.5", '"a"', '"b"'];
  const kindOf = (v: string) => (v.startsWith('"') ? 2 : v.includes(".") ? 1 : 0);
  const names = ["PACKED_SMI", "PACKED_DOUBLE", "PACKED_ELEMENTS"];
  const st = { phase: "" };
  const o = {
    kind: -1,
    flash: false,
    cells: [] as string[],
    copyUpTo: 0,
    newIdx: -1,
    alloc: 0,
    copied: 0,
  };
  const n = {
    kind: -1,
    cap: 0,
    cells: [] as string[],
    newIdx: -1,
    alloc: 0,
    seen: [false, false, false],
    read: -1,
  };
  const lane = (name: string, kindHtml: string, body: string, stats: string) =>
    `<div class="fa-lane"><div class="fa-lane-name">${name}</div><div class="fa-row">${kindHtml}${body}</div><div class="fa-stat">${stats}</div></div>`;
  const stats = (a: number, c: number) =>
    `Allocations<span class="fa-v">${a}</span> Re-copied<span class="fa-v">${c}</span>`;
  const oldKind = () =>
    o.kind < 0
      ? '<div class="fa-kind" style="visibility:hidden">-</div>'
      : `<div class="fa-kind${o.flash ? " flash" : ""}">${names[o.kind]}</div>`;
  const oldBody = () =>
    o.kind < 0
      ? ""
      : `<div class="fa-alloc">${o.cells
          .map((v, i) => cellHtml(i < o.copyUpTo ? "copy" : i === o.newIdx ? "new" : "", v))
          .join("")}</div>`;
  const newKind = () =>
    n.kind < 0
      ? `<div class="fa-flags">${["seenSmi", "seenDouble", "seenObject"]
          .map((f, i) => `<span class="fa-flag${n.seen[i] ? " on" : ""}">${f}</span>`)
          .join("")}</div>`
      : `<div class="fa-kind">${names[n.kind]}</div>`;
  const newBody = () =>
    n.kind < 0
      ? `<div class="fa-cells">${leaves.map((v, i) => cellHtml(i === n.read ? "read" : "", v)).join("")}</div>`
      : `<div class="fa-alloc">${range(n.cap)
          .map((i) =>
            i < n.cells.length
              ? cellHtml(i === n.newIdx ? "new" : "", n.cells[i])
              : cellHtml("empty", ""),
          )
          .join("")}</div>`;
  const draw = () =>
    headHtml("Arrays of mixed types", st.phase) +
    '<div class="fa-label">Input is <span class="fa-mono">[[1, 2], [3.5], ["a", "b"]]</span></div>' +
    lane("Before", oldKind(), oldBody(), stats(o.alloc, o.copied)) +
    lane("Two-pass", newKind(), newBody(), stats(n.alloc, 0));
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: draw(), delay });
  st.phase = "Before the optimization, values are appended one by one";
  push(110);
  leaves.forEach((v) => {
    const k = kindOf(v);
    o.flash = false;
    o.copyUpTo = 0;
    o.newIdx = -1;
    if (o.kind < 0) {
      o.kind = k;
      o.alloc++;
      st.phase = `Allocate as ${names[k]}`;
      push(70);
    } else if (k > o.kind) {
      o.kind = k;
      o.flash = true;
      o.alloc++;
      o.copied += o.cells.length;
      o.copyUpTo = o.cells.length;
      st.phase = `${v} arrives, so reallocate as ${names[k]}`;
      push(130);
      o.flash = false;
      o.copyUpTo = 0;
    }
    o.cells.push(v);
    o.newIdx = o.cells.length - 1;
    st.phase = `Append ${v}`;
    push(50);
  });
  o.newIdx = -1;
  st.phase = "The two-pass approach checks types in pass 1";
  push(110);
  leaves.forEach((v, i) => {
    n.read = i;
    n.seen[kindOf(v)] = true;
    push(45);
  });
  n.read = -1;
  n.kind = 2;
  n.cap = leaves.length;
  n.alloc = 1;
  st.phase = "Allocate once as PACKED_ELEMENTS";
  push(120);
  st.phase = "Pass 2 writes";
  leaves.forEach((v) => {
    n.cells.push(v);
    n.newIdx = n.cells.length - 1;
    push(40);
  });
  n.newIdx = -1;
  st.phase = "Done";
  push(350);
  return frames;
};

const buildBarrier = (): Frame[] => {
  const N = 5;
  const st = { phase: "", smiDone: false, smiCopying: false, objDone: 0, objNow: -1, notify: 0 };
  const lane = (name: string, src: string, dst: string, stat: string, note: string) =>
    `<div class="fa-lane fa-lane-wide"><div class="fa-lane-name">${name}</div><div><div class="fa-row">${src}<span class="fa-arrow">→</span>${dst}</div><div class="fa-note">${note}</div></div><div class="fa-stat">${stat}</div></div>`;
  const draw = () =>
    headHtml("Copying sub-arrays into the result", st.phase) +
    lane(
      "PACKED_SMI_ELEMENTS",
      `<div class="fa-cells">${range(N)
        .map((i) => cellHtml(st.smiCopying ? "copy" : "", String(i + 1)))
        .join("")}</div>`,
      `<div class="fa-alloc">${range(N)
        .map((i) =>
          st.smiDone || st.smiCopying
            ? cellHtml(st.smiCopying ? "copy" : "", String(i + 1))
            : cellHtml("empty", ""),
        )
        .join("")}</div>`,
      'GC notifications<span class="fa-v">0</span>',
      st.smiCopying ? "Copied at once with memcpy" : "",
    ) +
    lane(
      "PACKED_ELEMENTS",
      `<div class="fa-cells">${range(N)
        .map((i) => cellHtml(`ptr${i === st.objNow ? " read" : ""}`, "obj"))
        .join("")}</div>`,
      `<div class="fa-alloc">${range(N)
        .map((i) =>
          i < st.objDone
            ? cellHtml(`ptr${i === st.objNow ? " new" : ""}`, "obj")
            : cellHtml("empty", ""),
        )
        .join("")}</div>`,
      `GC notifications<span class="fa-v">${st.notify}</span>`,
      st.objNow >= 0 ? "Each write notifies the GC through the write barrier" : "",
    );
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: draw(), delay });
  st.phase = "Copy two sub-arrays of the same length";
  push(120);
  range(N).forEach((i) => {
    st.smiCopying = i === 0;
    st.smiDone = i > 0;
    st.objNow = i;
    st.objDone = i + 1;
    st.notify = i + 1;
    st.phase = "Copying";
    push(55);
  });
  st.smiCopying = false;
  st.smiDone = true;
  st.objNow = -1;
  st.phase = "Done";
  push(350);
  return frames;
};

const FLOW_SRC: (number | null)[][] = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, null, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
];
const FLOW_KINDS = ["PACKED_SMI", "HOLEY_SMI", "PACKED_SMI"];
const FLOW_PER = 7;

type FlowState = {
  phase: string;
  step: number;
  checks: number[];
  active: number[];
  readGroup: number;
  readCell: number;
  copyGroup: number;
  capacity: number;
  out: number[];
  newFrom: number;
  newTo: number;
  newStyle: string;
  copyingUpTo: number;
  dstLabel: string;
  counters: Counter[];
};

const flowState = (checkCount: number, counters: Counter[]): FlowState => ({
  phase: "",
  step: 0,
  checks: Array(checkCount).fill(0),
  active: [],
  readGroup: -1,
  readCell: -1,
  copyGroup: -1,
  capacity: 0,
  out: [],
  newFrom: -1,
  newTo: -1,
  newStyle: "new",
  copyingUpTo: 0,
  dstLabel: "",
  counters,
});

const flowDstClass = (s: FlowState, i: number) => {
  if (i < s.copyingUpTo) return "copy";
  if (i >= s.newFrom && i <= s.newTo) return s.newStyle;
  return i < s.out.length ? "filled" : "empty";
};

const flowSrcCell = (s: FlowState, g: number, i: number, v: number | null) => {
  const cur = g * FLOW_PER + i === s.readCell;
  return v === null
    ? `<div class="fa-fc hole${cur ? " skip" : ""}">hole</div>`
    : `<div class="fa-fc${cur ? " read" : ""}${g === s.copyGroup ? " copy" : ""}">${v}</div>`;
};

const renderFlow = (title: string, steps: string[], checkNames: string[]) => (s: FlowState) =>
  headHtml(title, s.phase) +
  `<div class="fa-flow-row"><span class="fa-flow-name">Steps</span><div class="fa-flow-items">${steps
    .map((t, i) => `<span class="fa-flow-step${i === s.step ? " on" : ""}">${t}</span>`)
    .join('<span class="fa-arrow">→</span>')}</div></div>` +
  `<div class="fa-flow-row"><span class="fa-flow-name">Checks</span><div class="fa-flow-items">${checkNames
    .map(
      (t, i) =>
        `<span class="fa-flow-check${s.active.includes(i) ? " on" : ""}">${t}<span class="fa-v">${s.checks[i]}</span></span>`,
    )
    .join("")}</div></div>` +
  '<div class="fa-label">Input is <span class="fa-mono">[[1, …, 7], [8, , 10, …, 14], [15, …, 21]]</span></div>' +
  `<div class="fa-flow-src">${FLOW_SRC.map(
    (arr, g) =>
      `<div class="fa-flow-group${g === s.readGroup ? " active" : ""}${g === s.copyGroup ? " copying" : ""}"><div class="fa-flow-cells">${arr
        .map((v, i) => flowSrcCell(s, g, i, v))
        .join("")}</div><div class="fa-flow-kind">${FLOW_KINDS[g]}</div></div>`,
  ).join("")}</div>` +
  `<div class="fa-label">${s.dstLabel.replace(/(\d+)(\D*)$/, '<span class="fa-cap">$1</span>$2')}</div>` +
  `<div class="fa-flow-dst">${range(s.capacity)
    .map(
      (i) => `<div class="fa-fc ${flowDstClass(s, i)}">${i < s.out.length ? s.out[i] : ""}</div>`,
    )
    .join("")}</div>` +
  counterHtml(s.counters);

const buildFlowOld = (): Frame[] => {
  const alloc: Counter = ["Allocations", 0, ""];
  const recopy: Counter = ["Re-copied", 0, ""];
  const write: Counter = ["Writes", 0, ""];
  const recurse: Counter = ["Recursive calls", 0, ""];
  const s = flowState(4, [alloc, recopy, write, recurse]);
  const render = renderFlow(
    "The whole flow before the optimization",
    [
      "Create an empty array",
      "Read an element",
      "Recurse into arrays",
      "Append one to the end",
      "Reallocate when full",
    ],
    ["Shape change", "hole", "Is array", "Capacity"],
  );
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: render(s), delay });
  const check = (...ids: number[]) => {
    s.active = ids;
    ids.forEach((id) => s.checks[id]++);
  };
  s.dstLabel = "Result array capacity is 0";
  s.phase = "Start from an empty array";
  push(120);
  FLOW_SRC.forEach((arr, g) => {
    s.readGroup = g;
    s.readCell = -1;
    s.newFrom = -1;
    s.newTo = -1;
    s.step = 1;
    check(0, 1, 2);
    s.phase = "Read and check an outer element";
    push(70);
    s.step = 2;
    s.active = [];
    recurse[1]++;
    s.phase = "It is a sub-array, so recurse";
    push(60);
    arr.forEach((v, i) => {
      s.readCell = g * FLOW_PER + i;
      s.newFrom = -1;
      s.newTo = -1;
      if (v === null) {
        s.step = 1;
        check(0, 1);
        s.phase = "It is a hole, so skip it";
        push(60);
        return;
      }
      check(0, 1, 3);
      if (s.out.length === s.capacity) {
        const cap = newCapacity(s.out.length + 1);
        s.step = 4;
        alloc[1]++;
        recopy[1] += s.out.length;
        s.copyingUpTo = s.out.length;
        s.capacity = cap;
        s.dstLabel = `Result array capacity is ${cap}`;
        s.phase =
          s.out.length === 0
            ? `Allocate capacity ${cap}`
            : `Out of capacity, so reallocate to ${cap} and copy the contents`;
        push(s.out.length === 0 ? 80 : 130);
        s.copyingUpTo = 0;
        s.active = [];
      }
      s.step = 3;
      s.out.push(v);
      write[1]++;
      s.newFrom = s.out.length - 1;
      s.newTo = s.newFrom;
      s.phase = "Append one to the end";
      push(30);
    });
  });
  s.readGroup = -1;
  s.readCell = -1;
  s.newFrom = -1;
  s.newTo = -1;
  s.active = [];
  s.phase = "Done";
  push(350);
  return frames;
};

const buildFlowNew = (): Frame[] => {
  const alloc: Counter = ["Allocations", 0, ""];
  const bulk: Counter = ["memcpy", 0, ""];
  const write: Counter = ["Writes", 0, ""];
  const s = flowState(6, [alloc, bulk, write]);
  const render = renderFlow(
    "The whole flow after the optimization",
    [
      "Check entry",
      "Pass 1 finds length and type",
      "Allocate once",
      "Pass 2 writes",
      "Verify count",
    ],
    ["Entry", "Shape change", "hole", "Is array", "Write bounds", "Length match"],
  );
  const frames: Frame[] = [];
  const push = (delay: number) => frames.push({ html: render(s), delay });
  const check = (...ids: number[]) => {
    s.active = ids;
    ids.forEach((id) => s.checks[id]++);
  };
  const counted = { len: 0 };
  s.step = 0;
  check(0);
  s.dstLabel = "Length counted in pass 1 is 0";
  s.phase = "Check the length, array state, and species";
  push(120);
  s.step = 1;
  check(1);
  s.phase = "Check the shape of the outer array";
  push(60);
  FLOW_SRC.forEach((arr, g) => {
    s.readGroup = g;
    s.readCell = -1;
    check(2, 3);
    if (FLOW_KINDS[g] === "PACKED_SMI") {
      counted.len += arr.length;
      s.dstLabel = `Length counted in pass 1 is ${counted.len}`;
      s.phase = `PACKED_SMI, so add its .length of ${arr.length}`;
      push(90);
      return;
    }
    s.phase = "HOLEY_SMI, so step inside";
    push(80);
    check(1);
    s.phase = "Check the shape of the sub-array";
    push(50);
    arr.forEach((v, i) => {
      s.readCell = g * FLOW_PER + i;
      check(2);
      counted.len += v === null ? 0 : 1;
      s.dstLabel = `Length counted in pass 1 is ${counted.len}`;
      s.phase = v === null ? "Do not count the hole" : "Count a non-hole element";
      push(v === null ? 60 : 35);
    });
    s.readCell = -1;
    check(1);
    s.phase = "Back to the outer array, check its shape";
    push(60);
  });
  s.readGroup = -1;
  s.active = [];
  s.phase = `Length is ${counted.len}, type is PACKED_SMI`;
  push(100);
  s.step = 2;
  alloc[1]++;
  s.capacity = counted.len;
  s.dstLabel = `Result array capacity is ${counted.len}`;
  s.phase = `Allocate capacity ${counted.len} only once`;
  push(120);
  s.step = 3;
  check(1);
  s.phase = "Check the shape of the outer array";
  push(60);
  FLOW_SRC.forEach((arr, g) => {
    s.readGroup = g;
    s.readCell = -1;
    s.newFrom = -1;
    s.newTo = -1;
    if (FLOW_KINDS[g] === "PACKED_SMI") {
      check(2, 3, 4);
      bulk[1]++;
      s.copyGroup = g;
      s.newFrom = s.out.length;
      arr.forEach((v) => {
        if (v !== null) s.out.push(v);
      });
      s.newTo = s.out.length - 1;
      s.newStyle = "copy";
      s.phase = `PACKED_SMI, so memcpy all ${arr.length} at once`;
      push(100);
      s.copyGroup = -1;
      s.newStyle = "new";
      return;
    }
    check(2, 3);
    s.phase = "HOLEY_SMI, so step inside";
    push(80);
    check(1);
    s.phase = "Check the shape of the sub-array";
    push(50);
    arr.forEach((v, i) => {
      s.readCell = g * FLOW_PER + i;
      s.newFrom = -1;
      s.newTo = -1;
      if (v === null) {
        check(2);
        s.phase = "Skip the hole";
        push(60);
        return;
      }
      check(2, 4);
      s.out.push(v);
      write[1]++;
      s.newFrom = s.out.length - 1;
      s.newTo = s.newFrom;
      s.phase = "Write one at a time";
      push(40);
    });
    s.readCell = -1;
    s.newFrom = -1;
    s.newTo = -1;
    check(1);
    s.phase = "Back to the outer array, check its shape";
    push(60);
  });
  s.readGroup = -1;
  s.newFrom = -1;
  s.newTo = -1;
  s.step = 4;
  check(5);
  s.phase = `Written count ${s.out.length} matches length ${counted.len}`;
  push(120);
  s.active = [];
  s.phase = "Done";
  push(350);
  return frames;
};

const builders: Record<SceneName, () => Frame[][]> = {
  old: () => [buildOld((s) => renderArrays("Before", s))],
  twopass: () => [buildTwoPass(false, (s) => renderArrays("Two-pass", s))],
  bulk: () => [buildTwoPass(true, (s) => renderArrays("Bulk copy", s))],
  hole: () => [buildHole()],
  kinds: () => [buildKinds()],
  barrier: () => [buildBarrier()],
  "compare-twopass": () => [
    buildOld((s) => renderLane("Before", s)),
    buildTwoPass(false, (s) => renderLane("Two-pass", s)),
  ],
  "compare-bulk": () => [
    buildTwoPass(false, (s) => renderLane("Two-pass", s)),
    buildTwoPass(true, (s) => renderLane("Bulk copy", s)),
  ],
  "flow-old": () => [buildFlowOld()],
  "flow-new": () => [buildFlowNew()],
};

const raceTitles: Partial<Record<SceneName, string>> = {
  "compare-twopass": "Before and two-pass, side by side",
  "compare-bulk": "Two-pass and bulk copy, side by side",
};

const lanes = builders[props.scene]();
const raceTitle = raceTitles[props.scene];
const header = raceTitle ? headHtml(raceTitle, "Input is 6 sub-arrays of 10 elements") : "";
const ends = lanes.map((fs) =>
  fs.reduce<number[]>((acc, f) => [...acc, (acc[acc.length - 1] ?? 0) + f.delay * 10], []),
);
const cycle = Math.max(...ends.map((e) => e[e.length - 1]));
const { isPrintMode } = useNav();
const elapsed = ref(isPrintMode.value ? cycle : 0);
const html = computed(
  () =>
    header +
    lanes
      .map((fs, i) => {
        const at = ends[i].findIndex((end) => elapsed.value < end);
        return fs[at < 0 ? fs.length - 1 : at].html;
      })
      .join(""),
);
const timer = ref<ReturnType<typeof setInterval>>();

const play = () => {
  clearInterval(timer.value);
  const start = performance.now();
  timer.value = setInterval(() => {
    elapsed.value = performance.now() - start;
    if (elapsed.value >= cycle) clearInterval(timer.value);
  }, 30);
};
onUnmounted(() => clearInterval(timer.value));
</script>

<template>
  <div class="flat-anim" :class="{ 'fa-tall': scene.startsWith('flow-') }" v-html="html" />
  <button v-if="!isPrintMode" class="flat-anim-play" @click="play">Play</button>
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
  font-family: "Noto Sans JP", sans-serif;
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
  font:
    700 10px/22px "Nunito",
    sans-serif;
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
  font:
    700 20px "Nunito",
    "Noto Sans JP",
    sans-serif;
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
  font:
    700 15px/38px "Nunito",
    "Noto Sans JP",
    sans-serif;
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
  font:
    700 13px "PT Mono",
    ui-monospace,
    Menlo,
    monospace;
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
.flat-anim .fa-lane-name {
  font-weight: 700;
  color: var(--fa-blue);
  font-size: 15px;
}
.flat-anim .fa-stat {
  font-size: 14px;
}
.flat-anim .fa-stat .fa-v {
  font:
    700 20px "Nunito",
    "Noto Sans JP",
    sans-serif;
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
  font:
    700 12px "PT Mono",
    ui-monospace,
    Menlo,
    monospace;
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
.flat-anim .fa-mono {
  font-family: "PT Mono", ui-monospace, Menlo, monospace;
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
  font:
    700 18px "Nunito",
    "Noto Sans JP",
    sans-serif;
  margin: 0 2px 0 6px;
}
.flat-anim.fa-tall {
  height: 390px;
}
.flat-anim .fa-flow-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.flat-anim .fa-flow-name {
  width: 64px;
  flex: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--fa-blue);
}
.flat-anim .fa-flow-items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.flat-anim .fa-flow-step,
.flat-anim .fa-flow-check {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border: 1px solid var(--fa-dash);
  border-radius: 6px;
  color: var(--fa-dash);
  background: #fff;
}
.flat-anim .fa-flow-step.on {
  border-color: var(--fa-blue);
  background: var(--fa-blue);
  color: #fff;
}
.flat-anim .fa-flow-check {
  color: var(--fa-navy);
}
.flat-anim .fa-flow-check.on {
  border-color: var(--fa-copy);
  background: var(--fa-copy-bg);
}
.flat-anim .fa-flow-check .fa-v {
  margin-left: 6px;
}
.flat-anim .fa-flow-src {
  display: flex;
  gap: 12px;
}
.flat-anim .fa-flow-group {
  padding: 3px;
  border: 2px solid transparent;
  border-radius: 6px;
}
.flat-anim .fa-flow-group.active {
  border-color: var(--fa-blue);
}
.flat-anim .fa-flow-group.copying {
  border-color: var(--fa-copy);
  background: var(--fa-copy-bg);
}
.flat-anim .fa-flow-cells {
  display: flex;
  gap: 2px;
}
.flat-anim .fa-flow-kind {
  font:
    700 11px "PT Mono",
    ui-monospace,
    Menlo,
    monospace;
  margin-top: 3px;
  text-align: center;
}
.flat-anim .fa-flow-dst {
  display: grid;
  grid-template-columns: repeat(22, 26px);
  gap: 3px;
  min-height: 55px;
}
.flat-anim .fa-fc {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  font:
    700 12px/24px "Nunito",
    sans-serif;
  text-align: center;
  border: 1px solid #b5d0fb;
  background: var(--fa-light);
  color: var(--fa-blue);
}
.flat-anim .fa-fc.hole {
  border: 1px dashed var(--fa-dash);
  background: #fff;
  color: var(--fa-dash);
  font-size: 8px;
}
.flat-anim .fa-fc.read {
  border: 2px solid var(--fa-blue);
  line-height: 22px;
}
.flat-anim .fa-fc.skip {
  border: 2px dashed var(--fa-copy);
  color: var(--fa-copy);
  line-height: 22px;
}
.flat-anim .fa-fc.empty {
  border: 1px dashed var(--fa-dash);
  background: #fff;
}
.flat-anim .fa-fc.new {
  border-color: var(--fa-blue);
  background: var(--fa-blue);
  color: #fff;
}
.flat-anim .fa-fc.copy {
  border-color: var(--fa-copy);
  background: var(--fa-copy);
  color: #fff;
}
.slidev-layout .flat-anim-play {
  display: block;
  margin: 0 0 12px 20px;
  padding: 4px 20px;
  border: 2px solid #3984fd;
  border-radius: 8px;
  background: #fff;
  color: #3984fd;
  font:
    700 15px "Noto Sans JP",
    sans-serif;
  cursor: pointer;
}
</style>
