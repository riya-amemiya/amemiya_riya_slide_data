---
theme: seriph
background: white
title: V8のArray.prototype.flatを最大約20倍速くするまでと、巨大OSSへの大規模コミットの道のり
info: |
  ある日、Xのタイムラインに「JSCのArray.prototype.flatが速くなる」という投稿が流れてきました。実装を読むと同じ発想がV8にも適用できそうに見え、約1ヶ月後、私のパッチはV8 14.7にマージされました。
  Chrome、Node.js、Deno、V8を積むあらゆるランタイムでflatが最大約20倍速くなります。

  本トークの主役は最適化そのものです。V8は配列の中身を「整数だけ」「浮動小数点を含む」「穴がある」といったElementsKindと呼ばれる内部型で追跡しており、この型情報を使うと「数値しか入っていない配列にはサブ配列が存在し得ない」ことが自明になり、走査そのものを省略できます。なぜ従来のflatは遅かったのか、メモリ割り当てを1回に減らす2パス方式、holeを詰めるflat特有の仕様との格闘、V8独自言語Torqueでの実装までを順を追って解説します。

  v8-devでの提案からGerritレビュー、マージまでの流れも紹介します。マージ翌日にGoogleの自動バグ検知システムClusterFuzzが私のパッチにバグを3件発見してきた顛末も含め、巨大OSSに一個人がコードを差し込む体験を一次情報としてお伝えします。
layout: center
defaults:
  layout: center
drawings:
  persist: false
transition: slide-left
mdc: true
seoMeta:
  ogImage: auto
css: unocss
highlighter: shiki
---

<style>
@import './style.css';
</style>

<div class="w-full">
  <h1 class="mega">
    V8の<span class="accent">Array.prototype.flat</span>を<br>
    最大約20倍速くするまでと、<br>
    巨大OSSへの大規模コミットの道のり
  </h1>
  <div class="byline">西 悠太 <span class="venue">/ 株式会社ダイニー</span></div>
</div>

---

<h1 style="margin-bottom:20px">自己紹介</h1>

<div class="intro-grid">
  <div class="bio">
    <p><strong>西 悠太</strong> <span>(Nishi Yuta)</span></p>
    <p><strong>21歳</strong>(重要、important)</p>
    <p>V8 Contributor</p><p>Platform Engineer at Dinii Inc.</p><p>TSKaigi Staff</p>
    <p style="margin-top:24px;">TypeScriptが好きです<br>V8にパッチを送るのも好きです<br>あと野球も好きです</p>
    <div class="role">@riya-amemiya</div>
  </div>
  <img class="avatar" src="/icon.png" alt="プロフィール画像" />
</div>

---

# そもそも何でこのパッチを出したのか

<p class="lede">
ある日、Xのタイムラインに「JSCのArray.prototype.flatが速くなる」という投稿が流れてきました
</p>
<p class="lede">
実装を読むと同じ発想がV8にも適用できそうに見えました<br>約1ヶ月後、私のパッチはV8 14.7にマージされました
</p>

---

<p class="lead-q">
Chrome、Node.js、Deno、V8を積む<br>あらゆるランタイムでflatが最大約20倍速くなります
</p>

---

<p class="lead-q">
最適化メインで話します
</p>

- なぜ従来のflatは遅かったのか
- メモリ割り当てを1回に減らす2パス方式
- holeを詰めるflat特有の仕様との格闘
- V8独自言語Torqueでの実装

上記について順を追って解説します

<p class="lede">
v8-devでの提案からGerritレビュー、マージまでの流れも紹介します
</p>

---

# なぜ従来のflatは<br>遅かったのか

---

# flatの仕様を理解する

```js
> [[1, 2], [3, 4]].flat()
[ 1, 2, 3, 4 ]
> [[[1]], [[2]]].flat(2)
[ 1, 2 ]
```

- `depth` 段までフラットにした新しい配列を返す
- `depth` を省略すると1

---

# holeの扱い

<p class="lede">
JavaScriptの配列では、要素が存在しないインデックスのことをholeと呼びます
</p>

```js
> [1, , 3]
[ 1, <1 empty item>, 3 ]
```

<p class="lede" style="margin-top:24px;">
holeは <code>undefined</code> と違い、プロパティ自体がない
</p>

---

# 従来のflatの実装

1. 長さ0の配列を作る
2. ソース配列を先頭から1個ずつ見る
3. 配列なら再帰呼び出しで中へ
4. それ以外は末尾に1個足す

---

# どこが遅かったのか

- 容量が足りなくなるたびに確保し直してコピー
- 汎用のプロパティ書き込みで1個ずつ追加
- サブ配列ごとに再帰呼び出し

---

<img class="anim" src="/flat-old.gif" alt="最適化前のflatが結果配列を伸ばしながら1個ずつ追加する様子" />

---

# ElementsKindとは

<p class="lede">
V8は配列の中身を<br>「整数だけ」「浮動小数点を含む」「Holeがある」といった<br>ElementsKindと呼ばれる内部型で追跡しており、
</p>
<p class="lede">
この型情報を使うと<br>「数値しか入っていない配列にはサブ配列が存在し得ない」ことが自明になり、<br>走査そのものを省略できます
</p>

---

# 主要なElementsKind

| | Packed（holeなし） | Holey（holeあり） |
| --- | --- | --- |
| 小さな整数（Smi）だけ | `PACKED_SMI_ELEMENTS` | `HOLEY_SMI_ELEMENTS` |
| 浮動小数点数を含む | `PACKED_DOUBLE_ELEMENTS` | `HOLEY_DOUBLE_ELEMENTS` |
| 文字列やオブジェクトを含む | `PACKED_ELEMENTS` | `HOLEY_ELEMENTS` |

<p class="lede" style="margin-top:24px;">
遷移は原則として一方向<br>HOLEYになったら、holeを埋めてもPACKEDには戻らない
</p>

---

<p class="lede">
<code>PACKED_SMI_ELEMENTS</code> と <code>PACKED_DOUBLE_ELEMENTS</code> には<br>数値しか入らない
</p>

- サブ配列は入らない
- Proxyも入らない
- holeもない

<p class="lede">
この保証を使って最適化する
</p>

---

# メモリ割り当てを<br>1回に減らす2パス方式

---

# 最適化の戦略

<p class="lede">
JSCと同じ2パス方式
</p>

1. 第1パスで結果の長さとElementsKindを求める
2. その長さで1回だけ確保
3. 第2パスで要素を書き込む

<p class="lede">
参考にしたSosuke SuzukiさんのPR<br>
<a href="https://github.com/WebKit/WebKit/pull/56035">https://github.com/WebKit/WebKit/pull/56035</a>
</p>

---

# 結果配列を何回確保するか

<p class="lede">要素10個のサブ配列6個の場合</p>

<div class="alloc">
  <div class="alloc-name">最適化前</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar old" style="width:85px"></div><span>容量17で確保</span></div>
    <div class="alloc-row"><div class="bar old" style="width:215px"></div><span>容量43で確保し直し、17個をコピー</span></div>
    <div class="alloc-row"><div class="bar old" style="width:410px"></div><span>容量82で確保し直し、43個をコピー</span></div>
  </div>
  <div class="alloc-name">2パス方式</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar new" style="width:300px"></div><span>容量60で1回だけ確保</span></div>
  </div>
</div>

---

<img class="anim" src="/flat-two-pass.gif" alt="2パス方式で長さを数えてから1回だけ確保して書き込む様子" />

---

# 2パス方式で変わること

| | 最適化前 | 2パス方式 |
| --- | --- | --- |
| メモリ割り当て | O(log n)回 | 1回 |
| 要素の書き込み | 汎用のプロパティ書き込み | 確保した領域に直接書く |
| ElementsKindの遷移 | 起こりうる | 起こらない |

---

# 数値配列のショートカット

- ソースが `PACKED_SMI_ELEMENTS` か `PACKED_DOUBLE_ELEMENTS` なら、中身は数値だけでholeもない
- だから要素を見ずに `.length` をそのまま結果の長さにする

```ts
// src/builtins/array-flat.tq
if (sourceKind == ElementsKind::PACKED_SMI_ELEMENTS ||
    sourceKind == ElementsKind::PACKED_DOUBLE_ELEMENTS) {
  return FlattenedLengthResult{length: sourceLength, targetKind: sourceKind};
}
```

<p class="lede" style="margin-top:24px;">
<code>[1, 2, 3, ..., 1024].flat()</code> の長さ計算はO(1)
</p>

---

# サブ配列に対するショートカット

<p class="lede">
数値だけのサブ配列は、中を読まずに <code>.length</code> を足す
</p>

```ts
// src/builtins/array-flat.tq
if (rawKind == ElementsKind::PACKED_SMI_ELEMENTS) {
  seenSmi = true;
  const subLen: Smi =
      Cast<Smi>(elementArray.length) otherwise goto Bailout;
  targetLength =
      math::TrySmiAdd(targetLength, subLen) otherwise goto Bailout;
  index++;
  continue;
}
```

---

# `[[1,2,3], [4,5,6], [7,8,9]].flat()`

<p class="lede">見るのは外側の3要素だけ</p>

<div class="sum">
  <div class="array-label">外側の配列は PACKED_ELEMENTS</div>
  <div class="sum-row">
    <div class="sum-item">
      <div class="cells"><div class="cell">1</div><div class="cell">2</div><div class="cell">3</div></div>
      <div class="sum-len">PACKED_SMI なので +3</div>
    </div>
    <div class="sum-item">
      <div class="cells"><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div></div>
      <div class="sum-len">PACKED_SMI なので +3</div>
    </div>
    <div class="sum-item">
      <div class="cells"><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div></div>
      <div class="sum-len">PACKED_SMI なので +3</div>
    </div>
  </div>
  <div class="sum-total">結果の長さは 9</div>
</div>

---

# ElementsKindの追跡

<p class="lede">
長さを数えながら、結果に入る値の型を3つのフラグで追う
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

---

<p class="lede">
走査が終わったら、フラグから結果のElementsKindを決める
</p>

```ts
// src/builtins/array-flat.tq
if (seenObject) {
  targetKind = ElementsKind::PACKED_ELEMENTS;
} else if (seenDouble) {
  targetKind = ElementsKind::PACKED_DOUBLE_ELEMENTS;
} else {
  targetKind = ElementsKind::PACKED_SMI_ELEMENTS;
}
```

<p class="lede" style="margin-top:24px;">
<code>[[1], [2], [3]].flat()</code> の結果は <code>PACKED_SMI_ELEMENTS</code>
</p>

---

# 型が混ざった配列

<p class="lede"><code>[[1, 2], [3.5], ["a", "b"]].flat()</code> の場合</p>

<div class="kinds">
  <div class="col-label">最適化前</div>
  <div class="kind-flow">
    <span class="kind">PACKED_SMI</span>
    <span class="step">3.5が来たら<br>確保し直してコピー</span>
    <span class="kind">PACKED_DOUBLE</span>
    <span class="step">"a"が来たら<br>確保し直してコピー</span>
    <span class="kind">PACKED_ELEMENTS</span>
  </div>
  <div class="col-label">2パス方式</div>
  <div class="kind-flow">
    <span class="step">第1パスで<br>全部の型を調べる</span>
    <span class="kind">PACKED_ELEMENTS</span>
    <span class="tail">で1回だけ確保</span>
  </div>
</div>

---

<img class="anim" src="/flat-kinds.gif" alt="型が混ざった配列で最適化前は確保し直しが起き、2パス方式は1回だけ確保する様子" />

---

<p class="lede">
SmiとDoubleが混ざると <code>PACKED_DOUBLE_ELEMENTS</code>
</p>

```js
// test/mjsunit/array-flat-elements-kind.js
assertSmiElementsKind([[1],[1]].flat());
assertDoubleElementsKind([[1],[1.1]].flat());
assertObjectElementsKind([["hello"]].flat());
```

<p class="lede" style="margin-top:24px;">
SmiはDoubleで表せるので、<br><code>PACKED_ELEMENTS</code> まで広げない
</p>

---

# flatのあとの処理も速くなる

- JITはElementsKindに合わせて特殊化したコードを作る
- 結果が `PACKED_SMI_ELEMENTS` なら、後のループで型チェックを省ける

---

# 第2パスはまだ1個ずつコピーしていた

- `[1, 2, 3]` はメモリ上では整数が3つ並んでいるだけ
- まとめて移せば済むのに、1個ずつ読み書きしていた

---

# 要素1個ごとに4つ確認する

- 配列の構造が変わっていないか（Recheck）
- holeでないか
- Proxyでないか
- 書き込み先からあふれないか

---

# 2パス方式があるからできること

- 第1パスでコピー先の長さと型はもう決まっている
- 配列を作り直さなくていい
- 要素ごとに型をそろえ直さなくていい

---

# 数値のサブ配列はまとめてコピー

<div class="array-memory">
  <div class="array-label">サブ配列 [1, 2, 3] のメモリ</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">2</div>
    <div class="cell copied">3</div>
  </div>
  <div class="copy-arrow">↓ memcpy で3個まとめてコピー</div>
  <div class="array-label">結果配列のメモリ</div>
  <div class="cells">
    <div class="cell">0</div>
    <div class="cell copied">1</div>
    <div class="cell copied">2</div>
    <div class="cell copied">3</div>
    <div class="cell hole"></div>
  </div>
</div>

---

<img class="anim" src="/flat-bulk-copy.gif" alt="サブ配列ごとにmemcpyでまとめてコピーする様子" />

---

<p class="lede">
<code>TorqueCopyElements</code> は最終的に <code>libc</code> の <code>memcpy</code> を呼ぶ
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
<code>PACKED_DOUBLE_ELEMENTS</code> も同じように <code>FixedDoubleArray</code> をコピー
</p>

---

# まとめてコピーできるのは数値配列だけ

- 対象は `PACKED_SMI_ELEMENTS` と `PACKED_DOUBLE_ELEMENTS`
- `PACKED_ELEMENTS` は対象外
- 分かれ目はwrite barrier

---

# write barrier

- V8のGCは世代別で、若い世代と古い世代を別々に掃除する
- だからGCは、どのオブジェクトがどこを指しているかを知っておく必要がある
- ポインタを書くたびにGCへ知らせる仕組みがwrite barrier

---

# memcpyでポインタを運ぶと

- `memcpy` はビット列を写すだけで、GCに知らせない
- GCは新しくできた参照に気づけない
- まだ使っているオブジェクトが回収され、use-after-freeになる

---

# どの型ならmemcpyできるか

| ElementsKind | 中身 | ポインタ | memcpy |
| --- | --- | --- | --- |
| `PACKED_SMI_ELEMENTS` | 小さな整数そのもの | なし | できる |
| `PACKED_DOUBLE_ELEMENTS` | 生のdouble | なし | できる |
| `PACKED_ELEMENTS` | 文字列やオブジェクトへの参照 | あり | できない |

---

<img class="anim" src="/flat-write-barrier.gif" alt="数値配列はmemcpyで一度にコピーし、オブジェクト配列は1個ずつGCに知らせながら書く様子" />

---

# hole埋めをやめる

- `AllocateFixedDoubleArrayWithHoles` は全スロットをholeの値で埋めてから返す
- 2パス方式なら、第2パスで全スロットが必ず埋まる
- 初期化しない `AllocateFixedArray` で確保して、`FixedDoubleArray` として使う

---

# holeを詰める<br>flat特有の仕様との格闘

---

```js
> [1, , 3].flat()
[ 1, 3 ]
> [1, , 3].map(n => n * 2)
[ 2, <1 empty item>, 6 ]
```

- `map` はholeを残す
- `flat` はholeを飛ばして詰める

---

# 最適化するうえで厄介なところ

<div class="array-memory">
  <div class="array-label">ソースの .length は 5</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">3</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">5</div>
  </div>
  <div class="copy-arrow">↓ flat()</div>
  <div class="array-label">結果の長さは 3</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">3</div>
    <div class="cell copied">5</div>
  </div>
</div>

- `.length` と結果の要素数が合わない
- 長さを先に出すには、holeを数える必要がある

---

# HOLEY配列の扱い

- `.length` をそのまま結果の長さにできない
- 1個ずつ見て、hole以外を数える
- HOLEYなサブ配列は `memcpy` できず、1個ずつコピー

---

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

- `LoadElementNoHole` はholeを見つけると `FoundHole` へ飛ぶ
- そのインデックスを飛ばすので、holeが詰まる
- HOLEY配列でも確保は1回だけ

---

<img class="anim" src="/flat-hole.gif" alt="第1パスでhole以外を数え、第2パスでholeを飛ばして詰めて書き込む様子" />

---

# V8独自言語Torqueでの実装

<div class="mapping" style="margin-top:24px;">
  <div class="key">Torque</div><div>V8の組み込み関数を書く専用言語</div>
  <div class="key">fast path</div><div>条件がそろったときだけ通る速い経路</div>
  <div class="key">slow path</div><div>どんな入力でも正しく動く従来の経路</div>
  <div class="key">bailout</div><div>前提が崩れたときにslow pathへ逃げること</div>
</div>

---

- 従来の `flat` はTorqueの `FlattenIntoArrayFast` と `FlattenIntoArraySlow`
- その手前に `TryFastFlat` を追加

```ts
// src/builtins/array-flat.tq
try {
  return TryFastFlat(o, len, depthSmi) otherwise SlowFastPath;
} label SlowFastPath {}

const a: JSReceiver = ArraySpeciesCreate(context, o, 0);
```

<p class="lede" style="margin-top:24px;">
条件を満たさなければ従来のslow pathへ
</p>

---

# slow pathに戻るとき

- `Symbol.species` が上書きされている
- ソース配列がProxy
- サブ配列にProxyがある
- 配列がfast modeでない（dictionary modeなど）
- 長さがSmiに収まらない
- ネストが深すぎる

---

# 明示的スタックによる反復処理

- 再帰で書くと、Torqueコンパイラがスタックオーバーフローで落ちた
- そこでスタックを自前で持つループにした

```ts
// src/builtins/array-flat.tq
if (stack.length >= kMaxFlatFastStackEntries) goto Bailout;
stack.Push(currentArray);
stack.Push(nextIndex);
stack.Push(currentDepth);
```

- 1段ごとに配列、再開位置、深さの3つを積む
- 積めるのは3072個まで、つまり深さ1024まで

---

<img class="anim" src="/flat-stack.gif" alt="サブ配列に入るときに戻り先をスタックに積み、見終わったらスタックから戻る様子" />

---

# 安全性の担保とBailout

- 前提がそろっている間だけ速いコードで進む
- 前提が崩れたら、その場でslow pathへ

---

# どこでbailoutするか

| 場所 | 確認すること |
| --- | --- |
| fast pathの入口 | 長さがSmiの範囲内か、配列がfast modeか |
| 走査中 | `Recheck()` で配列の構造が変わっていないか |
| 第2パスの最後 | 書き込んだ要素数と、第1パスで数えた長さが一致するか |

---

# 2パス方式のベンチマーク

- d8で、要素1,024個のサブ配列20,000個を `flat()` して計測
- 50回の中央値

| 配列型 | パッチ適用 (median) | main (median) | 改善倍率 |
| --- | --- | --- | --- |
| SMI (整数) | 39.32 ms | 181.06 ms | ~4.6x |
| DOUBLE (浮動小数点数) | 48.21 ms | 224.80 ms | ~4.7x |
| OBJECT (文字列) | 79.56 ms | 190.80 ms | ~2.4x |

---

# バルクコピーまで入れたベンチマーク

- d8（arm64）で、V8 14.6.206とmainを比較
- 要素1,000個のサブ配列1,000個を `flat(2)` して計測
- 8回の最小値

| サブ配列の型 | 最適化前 | 最適化後 | 速度比 |
| --- | --- | --- | --- |
| `PACKED_SMI_ELEMENTS` | 6.09 ms | 0.26 ms | 約24x |
| `PACKED_DOUBLE_ELEMENTS` | 7.56 ms | 0.53 ms | 約14x |
| `PACKED_ELEMENTS` | 5.92 ms | 3.87 ms | 約1.5x |
| `HOLEY_SMI_ELEMENTS` | 5.91 ms | 3.45 ms | 約1.7x |
| `HOLEY_DOUBLE_ELEMENTS` | 7.49 ms | 4.66 ms | 約1.6x |
| `HOLEY_ELEMENTS` | 6.12 ms | 3.85 ms | 約1.6x |

---

# 3つの実装の比較

| | 最適化前 | 2パス方式 | バルクコピー |
| --- | --- | --- | --- |
| 結果配列の確保 | 足りなくなるたびに作り直す | 長さを数えて1回だけ | 1回だけ |
| サブ配列の処理 | 再帰で中へ入り1個ずつ追加 | 1個ずつ直接書く | 数値配列は `memcpy` でまとめて |
| 要素ごとの確認 | ある | ある | 数値配列ではない |
| 速度の目安 | 1x | 約5x | 約20x |

---

# V8に大きな変更を<br>入れるまでの流れ

---

# 1本目のCLがマージされるまで

<div class="timeline">
  <div class="tl-axis"></div>
  <div class="tl-wait" style="left:3.3%; width:66.7%;"><span>レビュー待ち 約3週間</span></div>
  <div class="tl-ps" style="left:0%"></div>
  <div class="tl-ps" style="left:3.3%"></div>
  <div class="tl-ps" style="left:73.3%"></div>
  <div class="tl-ps" style="left:83.3%"></div>
  <div class="tl-ps" style="left:90%"></div>
  <div class="tl-ps" style="left:100%"></div>
  <div class="tl-ev up" style="left:0%"><span class="d">1/28</span>CLを出す</div>
  <div class="tl-ev up" style="left:26.7%"><span class="d">2/5</span>レビューをお願い</div>
  <div class="tl-ev up" style="left:46.7%"><span class="d">2/11</span>レビュアーを追加</div>
  <div class="tl-ev up" style="left:70%"><span class="d">2/18</span>Leszekさんのレビュー</div>
  <div class="tl-ev up" style="left:90%"><span class="d">2/24</span>Olivierさんの+1</div>
  <div class="tl-ev up hi" style="left:100%"><span class="d">2/27</span>マージ</div>
  <div class="tl-ev down" style="left:1.6%">PS1〜4</div>
  <div class="tl-ev down" style="left:73.3%">PS5〜7</div>
  <div class="tl-ev down" style="left:83.3%">PS8</div>
  <div class="tl-ev down" style="left:90%">PS9〜11</div>
  <div class="tl-ev down" style="left:100%">PS12〜14</div>
</div>

---

# まずv8-devで提案する

- 大きな変更は、いきなりパッチを出さない
- 先にレビュアーと方針をすり合わせる
- v8-devに投稿すると、誰かが反応してくれる

<p class="lede">
<a href="https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM">https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM</a>
</p>

---

<p class="lead-q">
「良さそうだね<br>パッチ出して、議論はそっちでしようか」
</p>

<p class="lede">Leszek Swirskiさんの返信</p>

---

# GerritにCLを出す

- 1/28にCLをアップロード
- レビュアーには、変更したファイルのオーナーであるLeszekさんを入れる
- 最初の版はC++のruntime関数で書いていた

---

# 最初の指摘

- Leszekさん「このfast pathはruntime関数ではなく、Torque/CSAで実装するのがよい」
- runtimeの呼び出しコストを払わずに済む
- V8では普通、fast pathはTorqueかCSAで書き、runtimeを呼ぶのはslow pathだけ
- パッチセット2でTorqueに書き直す

---

# レビューが止まったとき

- 2/5 Leszekさんにレビューをお願い
- 2/11 ガイドラインに沿ってレビュアーを追加
- Leszekさん「大きなコミットなので、レビューにまとまった時間が要る」
- 2/18 Leszekさんからコメント5件

---

# dry runは自分では回せない

- 私にはtry jobを回す権限も、CQに投げる権限もなかった
- レビュアーに `Commit-Queue+1` でdry runを頼む
- 2/19 `v8_linux64_sandbox_testing_rel` で失敗
- 直して2/20に再実行、今度は通る

---

# Commit-Queueラベル

| ラベル | 動き |
| --- | --- |
| `Commit-Queue+1` | try botでテストだけ回す（dry run） |
| `Commit-Queue+2` | テストが通ったらそのままマージ |

---

# 2人目のレビュアー

- マージには2人目の+1が要る
- 2/20 Olivier Flückigerさんがレビューに参加
- 2/24 Olivierさんの `Code-Review+1`

---

# マージ当日の2/27

<ol class="journey">
  <li><span class="when">16:12</span>LeszekさんがCQに投げる</li>
  <li><span class="when">16:51</span><code>v8_linux64_asan_rel</code> で失敗</li>
  <li><span class="when">17:15</span>テストの期待値を直して再アップロード</li>
  <li><span class="when">17:57</span>dry runが通る</li>
  <li><span class="when">20:04</span>OlivierさんがCQに投げる</li>
  <li><span class="when">20:37</span>マージ</li>
</ol>

---

# 数字で見る1本目のCL

| | |
| --- | --- |
| 期間 | 1/28〜2/27の30日 |
| パッチセット | 15 |
| レビュアー | Leszek Swirskiさん、Olivier Flückigerさん |
| レビューコメント | Leszekさん10件、Olivierさん20件 |
| CQで落ちた回数 | 2回 |

---

<p class="lede">
2/27にマージ、Chrome 147（V8 14.7）でリリース
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

# 2本目のCL（バルクコピー）

<ol class="journey">
  <li><span class="when">3/5</span>CLをアップロード</li>
  <li><span class="when">5/28</span>Olivierさんのレビューが始まる</li>
  <li><span class="when">6/16</span>Olivierさんの <code>Code-Review+1</code>、dry runが通る</li>
  <li><span class="when">6/17</span>LeszekさんがCQに投げてマージ</li>
</ol>

---

# ClusterFuzzとの戦い

---

<p class="lede">
マージの翌日、GoogleのClusterFuzzがバグを3件発見
</p>

- crbug 488366773
- crbug 488586038
- crbug 489008235

---

<p class="lede">
原因は <code>GetPackedElementsKind</code> が<br><code>HOLEY_DOUBLE_ELEMENTS</code> を <code>PACKED_DOUBLE_ELEMENTS</code> として扱っていたこと
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

# なぜクラッシュしたのか

- `HOLEY_DOUBLE_ELEMENTS` はholeを含むので、`.length` と要素数が合わない
- 第1パスで出した長さと実際の要素数がずれる
- `V8_ENABLE_UNDEFINED_DOUBLE` が有効だと、`FixedDoubleArray` にundefinedも入る
- 第2パスの `UnsafeCast<Number>` がundefinedを受け取ってクラッシュ

```ts
// src/builtins/array-flat.tq
doubleElements.values[targetIndex] =
    Convert<float64_or_undefined_or_hole>(UnsafeCast<Number>(element));
```

---

# 修正

- `GetPackedElementsKind` を消し、`source.map.elements_kind` を直接見る
- ショートカットは本当にPACKEDなときだけ
- 回帰テストを足し、CLの `Bug:` にissue番号を書く

---

# Closeまで

- buganizer-systemからメールが届く
- 2/28に修正のCLを出し、3/3にマージ
- 4人から `Code-Review+1`
- マージ後、ClusterFuzzが自動で再評価してClose

---

<p class="lead-q">
マージ後も<br>ClusterFuzzが品質を守っている
</p>

---

# まとめ

- ElementsKindを見れば、数値だけのPacked配列は走査しなくていい
- 長さを先に数えれば、結果配列の確保は1回
- 数値だけのサブ配列はwrite barrierが要らないので、`memcpy` でまとめてコピー
- 1本目のCLは30日でマージ、その翌日にClusterFuzzがバグを3件発見

---

# 参考資料

<ul class="refs">
  <li>X: <a href="https://x.com/bunjavascript/status/2011898197330075845">x.com/bunjavascript/status/2011898197330075845</a></li>
  <li>WebKit: <a href="https://github.com/WebKit/WebKit/pull/56035">WebKit/WebKit#56035</a></li>
  <li>v8-dev: <a href="https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM">[Design/Perf] C++ fast path for Array.prototype.flat (2-pass, V8)</a></li>
  <li>Gerrit: <a href="https://chromium-review.googlesource.com/c/v8/v8/+/7526287">[array] Add Torque fast path for Array.prototype.flat</a></li>
  <li>Gerrit: <a href="https://chromium-review.googlesource.com/c/v8/v8/+/7614915">[array] Fix flat fast path crash on HOLEY_DOUBLE with undefined</a></li>
  <li>Gerrit: <a href="https://chromium-review.googlesource.com/c/v8/v8/+/7632521">[array] Add bulk copy shortcuts to Array.flat fast path</a></li>
  <li>Zenn: <a href="https://zenn.dev/dinii/articles/675d47a6c21c83">Chromium(V8)のArray.prototype.flatを最大約5倍高速化した</a></li>
  <li>Zenn: <a href="https://zenn.dev/dinii/articles/e12fbacc8e761c">Chromium(V8)のArray.prototype.flatをバルクコピーでさらに約5倍高速化した</a></li>
</ul>

---

# ご清聴ありがとうございました
