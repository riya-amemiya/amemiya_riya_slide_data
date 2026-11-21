---
theme: seriph
background: white
title: Making V8's Array.prototype.flat up to ~20x faster, and the road to a large commit in a huge OSS project
info: |
  One day, a post saying "JSC's Array.prototype.flat is getting faster" showed up on my X timeline. Reading the implementation, it looked like the same idea could apply to V8, and about a month later my patch was merged into V8 14.7.
  Array.prototype.flat becomes up to ~20x faster in Chrome, Node.js, Deno, and every runtime that ships V8.

  The main subject of this talk is the optimization itself. V8 tracks the contents of an array with internal types called ElementsKind, such as "integers only", "contains floating-point numbers", or "has holes". With this type information it becomes obvious that "an array that contains only numbers cannot contain sub-arrays", so the traversal itself can be skipped. The talk walks through why the old flat was slow, the two-pass approach that cuts memory allocation down to one, the struggle with flat's unusual rule of compacting holes, and the implementation in Torque, V8's own language.

  It also covers the path from a proposal on v8-dev through Gerrit review to the merge. Including the day after the merge, when Google's automated bug finder ClusterFuzz found three bugs in my patch, this is a first-hand account of one person landing code in a huge OSS project.
layout: center
defaults:
  layout: center
drawings:
  persist: false
transition: slide-left
mdc: true
seoMeta:
  ogImage: auto
  ogDescription: "Why the old flat was slow, the two-pass approach that cuts memory allocation down to one, the struggle with flat's rule of compacting holes, and the implementation in Torque, V8's own language."
events:
  - name: "Frontend Conference Kansai 2026"
    url: https://2026.frontend-conf.osaka.jp/
    date: 2026-10-12
  - name: "JSConf 2026"
    url: https://jsconf.jp/2026/
    date: 2026-11-22
tags:
  - V8
  - JavaScript
  - OSS
css: unocss
highlighter: shiki
---

<style>
@import './style.css';
</style>

<div class="w-full">
  <h1 class="mega">
    Making V8's <span class="accent">Array.prototype.flat</span><br>
    up to ~20x faster, and the road to<br>
    a large commit in a huge OSS project
  </h1>
  <div class="byline">Yuta Nishi <span class="venue">/ Dinii Inc.</span></div>
</div>

---

<h1 style="margin-bottom:20px">About me</h1>

<div class="intro-grid">
  <div class="bio">
    <p><strong>Yuta Nishi</strong></p>
    <p><strong>21 years old</strong> (important)</p>
    <p>V8 Contributor</p><p>Platform Engineer at Dinii Inc.</p><p>TSKaigi Staff</p>
    <p style="margin-top:24px;">I love TypeScript<br>I also love sending patches to V8<br>And I love baseball</p>
    <div class="role">@riya-amemiya</div>
  </div>
  <img class="avatar" src="/icon.png" alt="Profile picture" />
</div>

---

# Why I sent this patch in the first place

<p class="lede">
One day, a post saying "JSC's Array.prototype.flat is getting faster" showed up on my X timeline
</p>
<p class="lede">
Reading the implementation, it looked like the same idea could apply to V8<br>About a month later, my patch was merged into V8 14.7
</p>

---

```sh
❯ node -v
v26.13.1

❯ node -p process.versions.v8
14.6.202.34-node.40
```

---

```sh
❯ node -v
v27.0.0-alpha.0.1.1

❯ node -p process.versions.v8
15.6.75.50-node.14
```

---

<p class="lead-q">
In Chrome, Node.js, Deno, and every runtime that ships V8,<br>flat becomes up to ~20x faster
</p>

---

# ~20x in two steps

<p class="lede">
Up to ~5x with the two-pass approach, then another ~5x with bulk copy
</p>

<div class="alloc">
  <div class="alloc-name">Before</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar old" style="width:20px"></div><span>1x</span></div>
  </div>
  <div class="alloc-name">Two-pass</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar new" style="width:100px"></div><span>~5x</span></div>
  </div>
  <div class="alloc-name">Bulk copy</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar new" style="width:400px"></div><span>~20x</span></div>
  </div>
</div>

---

<p class="lead-q">
This talk is mostly about the optimization
</p>

- Why the old flat was slow
- The two-pass approach that cuts memory allocation down to one
- The struggle with flat's rule of compacting holes
- Skipping the traversal itself with ElementsKind
- Another ~5x with bulk copy
- The implementation in Torque, V8's own language

I will walk through these in order

<p class="lede">
I will also show the path from a proposal on v8-dev through Gerrit review to the merge
</p>

---

# Understanding the spec of flat

```js
> [[1, 2], [3, 4]].flat()
[ 1, 2, 3, 4 ]
> [[[1]], [[2]]].flat(2)
[ 1, 2 ]
```

- Returns a new array flattened `depth` levels deep
- `depth` defaults to 1

---

# Why the old flat<br>was slow

---

# The old implementation of flat

<div class="ba">
  <div>
    <div class="ba-col-title">The flow</div>
    <div class="ba-steps">
      <div class="ba-step">Create an empty array</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Read one element of the source array</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">If it is an array, recurse into it</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">Otherwise append it to the result<br>through a generic property store every time</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">When capacity runs out, reallocate and copy</div>
    </div>
    <div class="ba-loop">↑ Repeat for every element</div>
  </div>
  <div>
    <div class="ba-col-title">What a reallocation does</div>
    <div class="ba-steps">
      <div class="ba-step">Allocate an array with the new capacity</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">Copy everything from the old array</div>
    </div>
  </div>
</div>

---

<FlatAnimation scene="old" />

<p class="lede">New capacity = required length + half of the required length + 16</p>

---

# The two-pass approach that cuts<br>memory allocation down to one

---

# Before and the two-pass approach

<div class="ba">
  <div>
    <div class="ba-col-title">Before</div>
    <div class="ba-steps">
      <div class="ba-step">Create an empty array</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Look at elements one by one<br>recurse into arrays</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Append one to the end of the result</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">When capacity runs out<br>reallocate and copy</div>
    </div>
    <div class="ba-loop">↑ Repeat for every element</div>
  </div>
  <div>
    <div class="ba-col-title">Two-pass</div>
    <div class="ba-steps">
      <div class="ba-step">Pass 1 finds the length and type</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step win">Allocate once with that length</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Pass 2 writes directly</div>
    </div>
  </div>
</div>

<p class="lede" style="margin-top:20px;">
Based on the two-pass approach Sosuke Suzuki implemented in JSC<br>
<a href="https://github.com/WebKit/WebKit/pull/56035">https://github.com/WebKit/WebKit/pull/56035</a>
</p>

---

# How many times the result array is allocated

<p class="lede">For 6 sub-arrays of 10 elements</p>

<div class="alloc">
  <div class="alloc-name">Before</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar old" style="width:85px"></div><span>Allocate capacity 17</span></div>
    <div class="alloc-row"><div class="bar old" style="width:215px"></div><span>Reallocate to 43 and copy 17</span></div>
    <div class="alloc-row"><div class="bar old" style="width:410px"></div><span>Reallocate to 82 and copy 43</span></div>
  </div>
  <div class="alloc-name">Two-pass</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar new" style="width:300px"></div><span>Allocate capacity 60 only once</span></div>
  </div>
</div>

---

<FlatAnimation scene="compare-twopass" />

---

# The struggle with flat's rule<br>of compacting holes

---

# What a hole is

<p class="lede">
In a JavaScript array, an index with no element is called a hole
</p>

<div class="array-memory">
  <div class="array-label">[1, , 3]</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">3</div>
  </div>
  <div class="array-label" style="margin-top:20px;">[1, undefined, 3]</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">undefined</div>
    <div class="cell copied">3</div>
  </div>
</div>

<p class="lede">
Unlike <code>undefined</code>, a hole has no property at all
</p>

---

# How holes are handled

<div class="ba">
  <div>
    <div class="ba-col-title">map keeps holes</div>
    <div class="cells">
      <div class="cell copied">1</div>
      <div class="cell hole">hole</div>
      <div class="cell copied">3</div>
    </div>
    <div class="copy-arrow">↓ map(n =&gt; n * 2)</div>
    <div class="cells">
      <div class="cell copied">2</div>
      <div class="cell hole">hole</div>
      <div class="cell copied">6</div>
    </div>
  </div>
  <div>
    <div class="ba-col-title">flat skips holes and compacts</div>
    <div class="cells">
      <div class="cell copied">1</div>
      <div class="cell hole">hole</div>
      <div class="cell copied">3</div>
    </div>
    <div class="copy-arrow">↓ flat()</div>
    <div class="cells">
      <div class="cell copied">1</div>
      <div class="cell copied">3</div>
    </div>
  </div>
</div>

---

# The tricky part for the optimization

<div class="array-memory">
  <div class="array-label">The source .length is 5</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">3</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">5</div>
  </div>
  <div class="copy-arrow">↓ flat()</div>
  <div class="array-label">The result length is 3</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">3</div>
    <div class="cell copied">5</div>
  </div>
</div>

<p class="lede">To know the length up front, holes have to be left out of the count</p>

---

# Counting an array with holes

<p class="lede">Look at elements one by one and count everything except holes</p>

```ts
// src/builtins/array-flat.tq
let element: JSAny;
try {
  element = fastOW.LoadElementNoHole(index) otherwise FoundHole;
} label FoundHole {
  index++;
  continue;
}
```

<p class="lede" style="margin-top:24px;">
<code>LoadElementNoHole</code> jumps to <code>FoundHole</code> when it finds a hole
</p>

---

<FlatAnimation scene="hole" />

---

# Skipping the traversal itself<br>with ElementsKind

---

# The cost of pass 1

<p class="lede">The two-pass approach walks the array twice, so pass 1 should be cheap</p>

<div class="ba">
  <div>
    <div class="ba-col-title">Count every element</div>
    <div class="ba-steps">
      <div class="ba-step cost">Pass 1 looks at every element and counts</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Allocate once with that length</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Pass 2 writes every element</div>
    </div>
  </div>
  <div>
    <div class="ba-col-title">Look at the kind of array</div>
    <div class="ba-steps">
      <div class="ba-step win">Pass 1 only looks at the kind of array</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Allocate once with that length</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Pass 2 writes every element</div>
    </div>
  </div>
</div>

---

# What ElementsKind is

<p class="lede">
V8 tracks the contents of an array with internal types<br>such as "integers only", "contains floating-point numbers", or "has holes"<br>called ElementsKind
</p>
<p class="lede">
With this type information it becomes obvious that<br>"an array that contains only numbers cannot contain sub-arrays",<br>so the traversal itself can be skipped
</p>

---

# Examples of ElementsKind

| Array          | ElementsKind             |
| -------------- | ------------------------ |
| `[1, 2, 3]`    | `PACKED_SMI_ELEMENTS`    |
| `[1, 2.5, 3]`  | `PACKED_DOUBLE_ELEMENTS` |
| `[1, "a", {}]` | `PACKED_ELEMENTS`        |
| `[1, , 3]`     | `HOLEY_SMI_ELEMENTS`     |

---

# The main ElementsKinds

|                                 | Packed (no holes)        | Holey (has holes)       |
| ------------------------------- | ------------------------ | ----------------------- |
| Small integers (Smi) only       | `PACKED_SMI_ELEMENTS`    | `HOLEY_SMI_ELEMENTS`    |
| Contains floating-point numbers | `PACKED_DOUBLE_ELEMENTS` | `HOLEY_DOUBLE_ELEMENTS` |
| Contains strings or objects     | `PACKED_ELEMENTS`        | `HOLEY_ELEMENTS`        |

<p class="lede" style="margin-top:24px;">
<code>PACKED_SMI_ELEMENTS</code> and <code>PACKED_DOUBLE_ELEMENTS</code> never hold sub-arrays, Proxies, or holes<br>
The optimization relies on this guarantee
</p>

---

# A shortcut for numeric arrays

<p class="lede">Numbers only and no holes is guaranteed, so there is no need to look at each element</p>

<div class="array-memory">
  <div class="array-label">[1, 2, 3, 4, 5] is PACKED_SMI_ELEMENTS</div>
  <div class="cells">
    <div class="cell">1</div>
    <div class="cell">2</div>
    <div class="cell">3</div>
    <div class="cell">4</div>
    <div class="cell">5</div>
  </div>
  <div class="copy-arrow">↓ use .length as is, without looking at elements</div>
  <div class="array-label">The result length is 5</div>
</div>

---

<p class="lede">
If the source is <code>PACKED_SMI_ELEMENTS</code> or <code>PACKED_DOUBLE_ELEMENTS</code><br><code>.length</code> becomes the result length as is
</p>

```ts
// src/builtins/array-flat.tq
if (sourceKind == ElementsKind::PACKED_SMI_ELEMENTS ||
    sourceKind == ElementsKind::PACKED_DOUBLE_ELEMENTS) {
  return FlattenedLengthResult{length: sourceLength, targetKind: sourceKind};
}
```

<p class="lede" style="margin-top:24px;">
Computing the length of <code>[1, 2, 3, ..., 1024].flat()</code> is O(1)
</p>

---

# `[[1,2,3], [4,5,6], [7,8,9]].flat()`

<p class="lede">For numeric sub-arrays, add <code>.length</code> without reading their contents</p>

<div class="sum">
  <div class="array-label">The outer array is PACKED_ELEMENTS</div>
  <div class="sum-row">
    <div class="sum-item">
      <div class="cells"><div class="cell">1</div><div class="cell">2</div><div class="cell">3</div></div>
      <div class="sum-len">PACKED_SMI, so +3</div>
    </div>
    <div class="sum-item">
      <div class="cells"><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div></div>
      <div class="sum-len">PACKED_SMI, so +3</div>
    </div>
    <div class="sum-item">
      <div class="cells"><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div></div>
      <div class="sum-len">PACKED_SMI, so +3</div>
    </div>
  </div>
  <div class="sum-total">The result length is 9</div>
</div>

---

# Arrays of mixed types

<p class="lede">For <code>[[1, 2], [3.5], ["a", "b"]].flat()</code></p>

<div class="kinds">
  <div class="col-label">Before</div>
  <div class="kind-flow">
    <span class="kind">PACKED_SMI</span>
    <span class="step">When 3.5 arrives<br>reallocate and copy</span>
    <span class="kind">PACKED_DOUBLE</span>
    <span class="step">When "a" arrives<br>reallocate and copy</span>
    <span class="kind">PACKED_ELEMENTS</span>
  </div>
  <div class="col-label">Two-pass</div>
  <div class="kind-flow">
    <span class="step">Pass 1 checks<br>every type</span>
    <span class="kind">PACKED_ELEMENTS</span>
    <span class="tail">allocated only once</span>
  </div>
</div>

---

<FlatAnimation scene="kinds" />

---

# The ElementsKind of the result array

<p class="lede">
While counting the length, track the type of values going into the result with three flags
</p>

```ts
// src/builtins/array-flat.tq
if (!IsNumber(element)) {
  seenObject = true;
} else if (!TaggedIsSmi(element)) {
  seenDouble = true;
} else {
  seenSmi = true;
}
```

<p class="lede" style="margin-top:24px;">
The result of <code>[[1], [2], [3]].flat()</code> is <code>PACKED_SMI_ELEMENTS</code>
</p>

---

<p class="lead-q">
With the two-pass approach so far,<br>flat became up to ~5x faster
</p>

---

# Another ~5x<br>with bulk copy

---

# Pass 2 still copied one at a time

<div class="ba">
  <div>
    <div class="ba-col-title">Pass 2 of the two-pass approach</div>
    <div class="ba-steps">
      <div class="ba-step">Step into the sub-array</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Read one element</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">Four checks<br>shape change, hole, Proxy, write bounds</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Write one to the result</div>
    </div>
    <div class="ba-loop">↑ Repeat for every element</div>
  </div>
  <div>
    <div class="ba-col-title">Bulk copy</div>
    <div class="ba-steps">
      <div class="ba-step">Check the sub-array type only once</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step win">Copy everything at once with memcpy</div>
    </div>
  </div>
</div>

---

# Numeric sub-arrays are copied in one go

<p class="lede">Pass 1 has already fixed the length and type, so the block can be poured in as is</p>

<div class="array-memory">
  <div class="array-label">Memory of sub-array [1, 2, 3]</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">2</div>
    <div class="cell copied">3</div>
  </div>
  <div class="copy-arrow">↓ memcpy copies all 3 at once</div>
  <div class="array-label">Memory of the result array</div>
  <div class="cells">
    <div class="cell">0</div>
    <div class="cell copied">1</div>
    <div class="cell copied">2</div>
    <div class="cell copied">3</div>
    <div class="cell hole"></div>
  </div>
</div>

<p class="lede">HOLEY sub-arrays cannot be memcpy'd and are copied one by one</p>

---

<FlatAnimation scene="compare-bulk" />

---

<p class="lede">
<code>TorqueCopyElements</code> ends up calling <code>memcpy</code> from <code>libc</code>
</p>

<div class="code-sm">

```ts
// src/builtins/array-flat.tq
if (subArray.map.elements_kind == ElementsKind::PACKED_SMI_ELEMENTS) {
  const srcElements: FixedArray = Cast<FixedArray>(subArray.elements)
      otherwise goto Bailout;
  const srcLen: Smi = Cast<Smi>(subArray.length) otherwise goto Bailout;
  const newIdx: Smi = math::TrySmiAdd(targetIndex, srcLen)
      otherwise goto Bailout;
  if (Convert<intptr>(newIdx) > vector.fixedArray.length_intptr) {
    goto Bailout;
  }
  TorqueCopyElements(
      vector.fixedArray, SmiUntag(targetIndex), srcElements, 0,
      SmiUntag(srcLen));
  targetIndex = newIdx;
  index++;
  continue;
}
```

</div>

<p class="lede" style="margin-top:16px;">
<code>PACKED_DOUBLE_ELEMENTS</code> copies its <code>FixedDoubleArray</code> the same way
</p>

---

# Only numeric arrays can be memcpy'd

| ElementsKind             | Contents                          | Pointers | memcpy |
| ------------------------ | --------------------------------- | -------- | ------ |
| `PACKED_SMI_ELEMENTS`    | The small integers themselves     | None     | Yes    |
| `PACKED_DOUBLE_ELEMENTS` | Raw doubles                       | None     | Yes    |
| `PACKED_ELEMENTS`        | References to strings and objects | Yes      | No     |

<p class="lede" style="margin-top:20px;">The dividing line is the write barrier</p>

---

# Write barrier

<p class="lede">
V8's GC needs to know which object points where<br>
The write barrier is what tells the GC every time a pointer is written
</p>

<div class="ba">
  <div>
    <div class="ba-col-title">Writing one at a time</div>
    <div class="ba-steps">
      <div class="ba-step">Write one pointer</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step win">The write barrier tells the GC</div>
    </div>
    <div class="ba-loop">↑ Repeat for every element</div>
  </div>
  <div>
    <div class="ba-col-title">Copying in one go with memcpy</div>
    <div class="ba-steps">
      <div class="ba-step">Copy the pointers all at once</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">The GC never learns about the new references</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">Live objects get collected<br>and you get a use-after-free</div>
    </div>
  </div>
</div>

---

<FlatAnimation scene="barrier" />

---

# Allocating without initialization

<p class="lede">When the result is a <code>FixedDoubleArray</code>, the allocation changed too</p>

<div class="ba">
  <div>
    <div class="ba-col-title">Two-pass</div>
    <div class="ba-steps">
      <div class="ba-step">Allocate with <code>AllocateFixedDoubleArrayWithHoles</code></div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">Fill every slot with the hole value<br>so unwritten slots never read garbage</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Pass 2 writes every slot</div>
    </div>
  </div>
  <div>
    <div class="ba-col-title">Bulk copy</div>
    <div class="ba-steps">
      <div class="ba-step win">Allocate with the uninitialized <code>AllocateFixedArray</code></div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Use it as a <code>FixedDoubleArray</code></div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">Pass 2 writes every slot</div>
    </div>
  </div>
</div>

<p class="lede" style="margin-top:20px;">Pass 1 counts the length exactly, so pass 2 always fills every slot</p>

---

# The implementation in Torque,<br>V8's own language

---

<div class="mapping" style="margin-top:24px;">
  <div class="key">Torque</div><div>A language dedicated to writing V8's builtins</div>
  <div class="key">fast path</div><div>A fast route taken only when conditions hold</div>
  <div class="key">slow path</div><div>The existing route that is correct for any input</div>
  <div class="key">bailout</div><div>Switching to the slow path when an assumption breaks</div>
</div>

---

- The old `flat` is Torque's `FlattenIntoArrayFast` and `FlattenIntoArraySlow`
- `TryFastFlat` is added in front of them

```ts
// src/builtins/array-flat.tq
try {
  return TryFastFlat(o, len, depthSmi) otherwise SlowFastPath;
} label SlowFastPath {}

const a: JSReceiver = ArraySpeciesCreate(context, o, 0);
```

<p class="lede" style="margin-top:24px;">
If the conditions are not met, it falls through to the existing slow path
</p>

---

# Where it bails out

<p class="lede">Stay on the fast path while the assumptions hold, and switch to the slow path on the spot when they break</p>

| Where                | What is checked                                                                      |
| -------------------- | ------------------------------------------------------------------------------------ |
| Fast path entry      | The length fits in a Smi, the array is in fast mode, `Symbol.species` is the default |
| During the traversal | `Recheck()` confirms the array's shape has not changed, and there is no Proxy        |
| End of pass 2        | The number of written elements matches the length counted in pass 1                  |

<p class="lede" style="margin-top:20px;">
Fast mode means an array whose ElementsKind is one of the six PACKED or HOLEY kinds<br>and whose prototype chain is still the default
</p>

---

# How much faster did it get

---

<FlatAnimation scene="flow-old" />

---

<FlatAnimation scene="flow-new" />

---

# Comparing the three implementations

<table class="ba-table">
<thead>
  <tr><th></th><th>Before</th><th>Two-pass</th><th>Bulk copy</th></tr>
</thead>
<tbody>
  <tr><td>Result allocation</td><td class="bad">Rebuilt whenever it runs out</td><td class="good">Count the length, allocate once</td><td class="good">Once</td></tr>
  <tr><td>Sub-array handling</td><td class="bad">Recurse and append one at a time</td><td class="bad">Write directly one at a time</td><td class="good">Numeric arrays via <code>memcpy</code> in one go</td></tr>
  <tr><td>Per-element checks</td><td class="bad">Yes</td><td class="bad">Yes</td><td class="good">Not needed for numeric arrays</td></tr>
  <tr><td>Rough speed</td><td class="bad">1x</td><td>~5x</td><td class="good">~20x</td></tr>
</tbody>
</table>

---

# Benchmark

- d8 (arm64), V8 14.6.206 compared with main
- `flat(2)` on 1,000 sub-arrays of 1,000 elements each
- Minimum of 8 runs

| Sub-array type           | Before  | After   | Speedup |
| ------------------------ | ------- | ------- | ------- |
| `PACKED_SMI_ELEMENTS`    | 6.09 ms | 0.26 ms | ~24x    |
| `PACKED_DOUBLE_ELEMENTS` | 7.56 ms | 0.53 ms | ~14x    |
| `PACKED_ELEMENTS`        | 5.92 ms | 3.87 ms | ~1.5x   |
| `HOLEY_SMI_ELEMENTS`     | 5.91 ms | 3.45 ms | ~1.7x   |
| `HOLEY_DOUBLE_ELEMENTS`  | 7.49 ms | 4.66 ms | ~1.6x   |
| `HOLEY_ELEMENTS`         | 6.12 ms | 3.85 ms | ~1.6x   |

---

# How a large change<br>gets into V8

---

<div class="ba-steps" style="width:420px;">
  <div class="ba-step">Propose on v8-dev and agree on the direction</div>
  <div class="ba-arrow">↓</div>
  <div class="ba-step">Upload a CL to Gerrit</div>
  <div class="ba-arrow">↓</div>
  <div class="ba-step">Get reviewed and revise</div>
  <div class="ba-arrow">↓</div>
  <div class="ba-step">Get Code-Review+1 from two people</div>
  <div class="ba-arrow">↓</div>
  <div class="ba-step win">Merge once the Commit-Queue tests pass</div>
</div>

---

# First, propose on v8-dev

- Do not send a patch out of the blue for a large change
- Agree on the direction with reviewers first
- Post on v8-dev and someone will respond

<p class="lede">
Leszek Swirski's reply<br>
"Sounds good, send a patch and let's discuss there"<br>
<a href="https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM">https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM</a>
</p>

---

# The first review comment

<p class="lede">
Leszek: "This fast path should be implemented in Torque/CSA rather than as a runtime function"
</p>

<div class="ba">
  <div>
    <div class="ba-col-title">First patch set</div>
    <div class="ba-steps">
      <div class="ba-step">flat is called</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">Call a C++ runtime function<br>every call pays a cost</div>
    </div>
  </div>
  <div>
    <div class="ba-col-title">Patch set 2</div>
    <div class="ba-steps">
      <div class="ba-step">flat is called</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step win">Enter a fast path written in Torque</div>
    </div>
  </div>
</div>

<p class="lede" style="margin-top:20px;">
In V8, fast paths are normally written in Torque or CSA, and only slow paths call the runtime<br>
CSA stands for CodeStubAssembler, V8's own assembler for writing builtins
</p>

---

# Getting to the merge

- Add Leszek, an owner of the changed files, as a reviewer
- A merge needs `Code-Review+1` from two people
- I cannot trigger try jobs or the CQ, so I ask the reviewers

| Label            | What it does                                  |
| ---------------- | --------------------------------------------- |
| `Commit-Queue+1` | Only runs the tests on the try bots (dry run) |
| `Commit-Queue+2` | Merges as soon as the tests pass              |

---

<p class="lede">
Released in Chrome 147 (V8 14.7)
</p>

```text
[array] Add Torque fast path for Array.prototype.flat

Reviewed-on: https://chromium-review.googlesource.com/c/v8/v8/+/7526287
Reviewed-by: Olivier Flückiger <olivf@chromium.org>
Reviewed-by: Leszek Swirski <leszeks@chromium.org>
Commit-Queue: Olivier Flückiger <olivf@chromium.org>
Commit-Queue: Leszek Swirski <leszeks@chromium.org>
Cr-Commit-Position: refs/heads/main@{#105498}
```

---

# The fight with ClusterFuzz

---

<p class="lede">
The day after the merge, Google's automated bug finder ClusterFuzz found three bugs<br>
Emails arrive from buganizer-system
</p>

- crbug 488366773
- crbug 488586038
- crbug 489008235

---

<p class="lede">
The cause was that <code>GetPackedElementsKind</code><br>treated <code>HOLEY_DOUBLE_ELEMENTS</code> as <code>PACKED_DOUBLE_ELEMENTS</code>
</p>

<div class="code-sm">

```ts
// src/builtins/array-flat.tq
macro GetPackedElementsKind(kind: ElementsKind): ElementsKind {
  if (kind == ElementsKind::HOLEY_SMI_ELEMENTS)
    return ElementsKind::PACKED_SMI_ELEMENTS;
  if (kind == ElementsKind::HOLEY_DOUBLE_ELEMENTS)
    return ElementsKind::PACKED_DOUBLE_ELEMENTS;
  if (kind == ElementsKind::HOLEY_ELEMENTS)
    return ElementsKind::PACKED_ELEMENTS;
  return kind;
}

const sourceKind: ElementsKind =
    GetPackedElementsKind(source.map.elements_kind);
```

</div>

---

# Why it crashed

<div class="array-memory">
  <div class="array-label">A HOLEY_DOUBLE_ELEMENTS array with .length 3</div>
  <div class="cells">
    <div class="cell copied">1.5</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">3.5</div>
  </div>
  <div class="copy-arrow">↓ treated as PACKED_DOUBLE_ELEMENTS, so .length 3 is used as the length</div>
  <div class="array-label">There are only 2 actual elements</div>
  <div class="cells">
    <div class="cell copied">1.5</div>
    <div class="cell copied">3.5</div>
    <div class="cell hole"></div>
  </div>
</div>

<p class="lede">The length computed in pass 1 no longer matches the actual number of elements</p>

---

<p class="lede">
With <code>V8_ENABLE_UNDEFINED_DOUBLE</code> enabled, a <code>FixedDoubleArray</code> can also hold undefined
</p>

```ts
// src/builtins/array-flat.tq
doubleElements.values[targetIndex] = Convert<float64_or_undefined_or_hole>(
  UnsafeCast<Number>(element),
);
```

<p class="lede" style="margin-top:24px;">
<code>UnsafeCast&lt;Number&gt;</code> in pass 2 receives undefined and crashes
</p>

---

# The fix and the close

- Delete `GetPackedElementsKind` and read `source.map.elements_kind` directly
- Take the shortcut only when the array is truly PACKED
- Add a regression test and put the issue number in the CL's `Bug:` line
- After the merge, ClusterFuzz re-verifies automatically and closes the issues

---

# Summary

- The old flat appended one element at a time while reallocating the result array
- The two-pass approach finds the length and type first and allocates once
- Holes are left out of the count in pass 1 and skipped in pass 2
- Numeric arrays skip the traversal itself by looking at ElementsKind
- Numeric sub-arrays need no write barrier, so they are copied in one go with `memcpy`
- Implemented as Torque's `TryFastFlat`, falling back to the slow path when an assumption breaks
- Agreed on v8-dev, sent to Gerrit, merged with two `Code-Review+1` and the CQ
- The bugs ClusterFuzz found the day after the merge were fixed with a regression test

---

# References

<ul class="refs">
  <li>X: <a href="https://x.com/bunjavascript/status/2011898197330075845">x.com/bunjavascript/status/2011898197330075845</a></li>
  <li>WebKit: <a href="https://github.com/WebKit/WebKit/pull/56035">WebKit/WebKit#56035</a></li>
  <li>v8-dev: <a href="https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM">[Design/Perf] C++ fast path for Array.prototype.flat (2-pass, V8)</a></li>
  <li>Gerrit: <a href="https://chromium-review.googlesource.com/c/v8/v8/+/7526287">[array] Add Torque fast path for Array.prototype.flat</a></li>
  <li>Gerrit: <a href="https://chromium-review.googlesource.com/c/v8/v8/+/7614915">[array] Fix flat fast path crash on HOLEY_DOUBLE with undefined</a></li>
  <li>Gerrit: <a href="https://chromium-review.googlesource.com/c/v8/v8/+/7632521">[array] Add bulk copy shortcuts to Array.flat fast path</a></li>
  <li>Zenn (Japanese): <a href="https://zenn.dev/dinii/articles/675d47a6c21c83">Chromium(V8)のArray.prototype.flatを最大約5倍高速化した</a></li>
  <li>Zenn (Japanese): <a href="https://zenn.dev/dinii/articles/e12fbacc8e761c">Chromium(V8)のArray.prototype.flatをバルクコピーでさらに約5倍高速化した</a></li>
</ul>

---

# Thank you
