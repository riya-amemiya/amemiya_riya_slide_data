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
ある日、Xのタイムラインに「JSCのArray.prototype.flatが速くなる」という投稿が流れてきました。
</p>
<p class="lede">
実装を読むと同じ発想がV8にも適用できそうに見えました<br>約1ヶ月後、私のパッチはV8 14.7にマージされました。
</p>

---

<p class="lead-q">
Chrome、Node.js、Deno、V8を積む<br>あらゆるランタイムでflatが最大約20倍速くなります。
</p>

---

<p class="lead-q">
最適化メインで話します
</p>

- なぜ従来のflatは遅かったのか
- メモリ割り当てを1回に減らす2パス方式
- holeを詰めるflat特有の仕様との格闘
- V8独自言語Torqueでの実装

上記について順を追って解説します。

<p class="lede">
v8-devでの提案からGerritレビュー、マージまでの流れも紹介します。
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

- `flat(depth)` はネストした配列を `depth` の深さまで平坦化
- `depth` を省略すると1

---

# holeの扱い

<p class="lede">
JavaScriptの配列では、要素が存在しないインデックスのことをholeと呼びます。
</p>

```js
> [1, , 3]
[ 1, <1 empty item>, 3 ]
```

<p class="lede" style="margin-top:24px;">
holeは <code>undefined</code> とは異なり、プロパティ自体が存在しない状態です。
</p>

---

# 従来のflatの実装

1. 空の結果配列を作る
2. ソース配列を先頭から走査する
3. 要素が配列なら、再帰で中へ降りる
4. それ以外なら、結果配列の末尾に1個追加する

---

# どこが遅かったのか

- 結果配列が空から伸びるので、容量が足りなくなるたびに再確保とコピー
- 1要素ずつ汎用的なプロパティ書き込みを呼ぶ
- サブ配列ごとに再帰呼び出し

---

<img class="anim" src="/flat-old.gif" alt="最適化前のflatが結果配列を伸ばしながら1個ずつ追加する様子" />

- 容量は 17 → 43 → 82 と伸び、そのたびに全要素をコピー
- 60要素に対して、確保3回とコピー60要素

---

# ElementsKindとは

<p class="lede">
V8は配列の中身を<br>「整数だけ」「浮動小数点を含む」「Holeがある」といった<br>ElementsKindと呼ばれる内部型で追跡しており、
</p>
<p class="lede">
この型情報を使うと<br>「数値しか入っていない配列にはサブ配列が存在し得ない」ことが自明になり、<br>走査そのものを省略できます。
</p>

---

# 主要なElementsKind

| | Packed（holeなし） | Holey（holeあり） |
| --- | --- | --- |
| 小さな整数（Smi）だけ | `PACKED_SMI_ELEMENTS` | `HOLEY_SMI_ELEMENTS` |
| 浮動小数点数を含む | `PACKED_DOUBLE_ELEMENTS` | `HOLEY_DOUBLE_ELEMENTS` |
| 文字列やオブジェクトを含む | `PACKED_ELEMENTS` | `HOLEY_ELEMENTS` |

<p class="lede" style="margin-top:24px;">
遷移は原則一方向で、一度HOLEYになると<br>holeを埋めてもPACKEDには基本的に戻りません。
</p>

---

<p class="lede">
<code>PACKED_SMI_ELEMENTS</code> と <code>PACKED_DOUBLE_ELEMENTS</code> には<br>数値しか入りません。
</p>

- サブ配列は入らない
- Proxyも入らない
- holeもない

<p class="lede">
この保証を最適化に使うのが今回のパッチの肝です。
</p>

---

# メモリ割り当てを<br>1回に減らす2パス方式

---

# 最適化の戦略

<p class="lede">
V8もJSCと同様に2パス方式を採用しました。
</p>

1. 第1パスで、結果配列の正確な長さとElementsKindを計算
2. その長さで、メモリを1回だけ確保
3. 第2パスで、要素を直接書き込む

<p class="lede">
参考にさせて頂いたSosuke Suzukiさんに感謝申し上げます。<br>
<a href="https://github.com/WebKit/WebKit/pull/56035">https://github.com/WebKit/WebKit/pull/56035</a>
</p>

---

# 60要素を平坦化するときの確保

<div class="alloc">
  <div class="alloc-name">最適化前</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar old" style="width:85px"></div><span>容量17を確保</span></div>
    <div class="alloc-row"><div class="bar old" style="width:215px"></div><span>容量43で確保し直し、17要素をコピー</span></div>
    <div class="alloc-row"><div class="bar old" style="width:410px"></div><span>容量82で確保し直し、43要素をコピー</span></div>
  </div>
  <div class="alloc-name">2パス方式</div>
  <div class="alloc-bars">
    <div class="alloc-row"><div class="bar new" style="width:300px"></div><span>長さ60で1回だけ確保</span></div>
  </div>
</div>

---

<img class="anim" src="/flat-two-pass.gif" alt="2パス方式で長さを数えてから1回だけ確保して書き込む様子" />

- 第1パスはサブ配列の `.length` を足すだけ
- 確保は1回、再確保に伴うコピーはなし

---

<div class="mapping">
  <div class="key">メモリ割り当て</div><div>O(log n)回 → 1回</div>
  <div class="key">要素書き込みコスト</div><div>直接書き込みでオーバーヘッド激減</div>
  <div class="key">ElementsKind遷移</div><div>ゼロ</div>
</div>

---

# 数値配列のショートカット

- ソースが `PACKED_SMI_ELEMENTS` か `PACKED_DOUBLE_ELEMENTS`
- 中身は数値だけで、holeもない
- だから要素を走査せず、長さはソースの `.length` そのまま

```ts
// src/builtins/array-flat.tq
if (sourceKind == ElementsKind::PACKED_SMI_ELEMENTS ||
    sourceKind == ElementsKind::PACKED_DOUBLE_ELEMENTS) {
  return FlattenedLengthResult{length: sourceLength, targetKind: sourceKind};
}
```

<p class="lede" style="margin-top:24px;">
<code>[1, 2, 3, ..., 1024].flat()</code> の長さ計算はO(1)になります。
</p>

---

# サブ配列に対するショートカット

<p class="lede">
数値だけのサブ配列は、中を読まずに <code>.length</code> を足します。
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

<div class="sum">
  <div class="array-label">外側の配列　PACKED_ELEMENTS</div>
  <div class="sum-row">
    <div class="sum-item">
      <div class="cells"><div class="cell">1</div><div class="cell">2</div><div class="cell">3</div></div>
      <div class="sum-len">PACKED_SMI　+3</div>
    </div>
    <div class="sum-item">
      <div class="cells"><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div></div>
      <div class="sum-len">PACKED_SMI　+3</div>
    </div>
    <div class="sum-item">
      <div class="cells"><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div></div>
      <div class="sum-len">PACKED_SMI　+3</div>
    </div>
  </div>
  <div class="sum-total">結果の長さ　9</div>
</div>

- 走査するのは外側の3要素だけ
- サブ配列の中身は読まない

---

# ElementsKindの追跡

<p class="lede">
長さを数えながら、結果配列に入る値の型を3つのフラグで追跡します。
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
走査が終わったら、フラグから結果配列のElementsKindを決めます。
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
<code>[[1], [2], [3]].flat()</code> の結果は <code>PACKED_SMI_ELEMENTS</code> になります。
</p>

---

# 型が混ざる配列の平坦化

<div class="kinds">
  <div class="col-label">最適化前</div>
  <div class="kind-flow">
    <span class="kind">PACKED_SMI</span>
    <span class="step">1.1を追加<br>再確保とコピー</span>
    <span class="kind">PACKED_DOUBLE</span>
    <span class="step">"a"を追加<br>再確保とコピー</span>
    <span class="kind">PACKED_ELEMENTS</span>
  </div>
  <div class="col-label">2パス方式</div>
  <div class="kind-flow">
    <span class="step">第1パスで<br>全要素の型を把握</span>
    <span class="kind">PACKED_ELEMENTS</span>
    <span class="tail">で1回だけ確保</span>
  </div>
</div>

- 要素を足すたびのElementsKindの遷移が起きない

---

<p class="lede">
SmiとDoubleが混ざると <code>PACKED_DOUBLE_ELEMENTS</code> になります。
</p>

```js
// test/mjsunit/array-flat-elements-kind.js
assertSmiElementsKind([[1],[1]].flat());
assertDoubleElementsKind([[1],[1.1]].flat());
assertObjectElementsKind([["hello"]].flat());
```

<p class="lede" style="margin-top:24px;">
SmiはDoubleで表せるので、<br>汎用の <code>PACKED_ELEMENTS</code> まで広げずに済みます。
</p>

---

# flatの後に続く処理への影響

- V8のJITコンパイラは、ElementsKindに合わせて特殊化したコードを生成
- 結果が `PACKED_SMI_ELEMENTS` なら、後段のループで型チェックを省ける

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

# 最適化するうえで厄介な点

<div class="array-memory">
  <div class="array-label">ソース　.length は 5</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">3</div>
    <div class="cell hole">hole</div>
    <div class="cell copied">5</div>
  </div>
  <div class="copy-arrow">↓ flat()</div>
  <div class="array-label">結果　長さは 3</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">3</div>
    <div class="cell copied">5</div>
  </div>
</div>

- `.length` と結果の要素数が一致しない
- 正確な長さを先に出すには、holeを数える必要がある

---

# HOLEY配列の扱い

- HOLEY配列には `.length` のショートカットが使えない
- 要素を1つずつ走査し、holeを除いて数える

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

- `LoadElementNoHole` はholeを見つけるとラベルへジャンプ
- そのインデックスを飛ばすので、結果は詰まった配列になる
- HOLEY配列でも、1回だけ確保する恩恵は受けられる

---

# V8独自言語Torqueでの実装

<div class="mapping" style="margin-top:24px;">
  <div class="key">Torque</div><div>V8の組み込み関数を書くための専用言語</div>
  <div class="key">fast path / slow path</div><div>速いが条件付きの経路と、どんな入力でも正しく処理できる経路</div>
  <div class="key">bailout</div><div>fast pathの前提が崩れたとき、slow pathへ退避すること</div>
</div>

---

- 従来の `flat` は、Torqueの `FlattenIntoArrayFast` と `FlattenIntoArraySlow`
- その手前に `TryFastFlat` を追加

```ts
// src/builtins/array-flat.tq
try {
  return TryFastFlat(o, len, depthSmi) otherwise SlowFastPath;
} label SlowFastPath {}

const a: JSReceiver = ArraySpeciesCreate(context, o, 0);
```

<p class="lede" style="margin-top:24px;">
条件を満たさなければ、従来のslow pathへフォールバックします。
</p>

---

# フォールバックする入力

- `Symbol.species` がオーバーライドされている
- ソース配列がProxy
- サブ配列にProxyが含まれている
- 配列がFastモードでない（dictionary modeなど）
- 長さがSmiの範囲を超える
- ネストが深すぎる

---

# 明示的スタックによる反復処理

- 再帰で書くと生成コードが複雑になりすぎて、buildが失敗
- 明示的なスタックを使った反復処理に変更

```ts
// src/builtins/array-flat.tq
if (stack.length >= kMaxFlatFastStackEntries) goto Bailout;
stack.Push(currentArray);
stack.Push(nextIndex);
stack.Push(currentDepth);
```

- 1エントリは、配列参照、インデックス、深さの3要素
- 上限は3072エントリで、深さ1024まで

---

# 安全性の担保とBailout

<p class="lede">
fast pathは「楽観的だが安全」に作ります。
</p>

- 前提が揃っていれば高速なコードを実行
- 前提を満たさなくなったらslow pathへフォールバック

---

# bailoutする場所

| 場所 | 確認すること |
| --- | --- |
| fast pathの入口 | 長さがSmiの範囲内か、配列がfast modeか |
| 走査中 | `Recheck()` で配列の構造が変わっていないか |
| 第2パスの最後 | 書き込んだ要素数と、第1パスで数えた長さが一致するか |

---

# ベンチマーク結果

- d8で計測、20,000個 × 1,024要素で合計約20M要素
- depth=1、50回計測の中央値

| 配列型 | パッチ適用 (median) | main (median) | 改善倍率 |
| --- | --- | --- | --- |
| SMI (整数) | 39.32 ms | 181.06 ms | ~4.6x |
| DOUBLE (浮動小数点数) | 48.21 ms | 224.80 ms | ~4.7x |
| OBJECT (文字列) | 79.56 ms | 190.80 ms | ~2.4x |

---

<p class="lead-q">
2パス方式で最大約5倍になった <code>flat</code> を、<br>サブ配列の「バルクコピー」で<br>さらに約5倍速くしました。
</p>

<p class="lede" style="margin-top:28px;">
2つを合わせると、手を入れる前と比べて約20倍です。
</p>

---

# どこがまだ遅かったのか

- 2パス方式でも、第2パスのコピーは1個ずつ
- `[1, 2, 3]` はメモリ上に整数が3つ並んでいるだけ
- 本来はブロックごと移せば済む

---

# 1要素ごとに走る4つの確認

- 配列の構造が変わっていないかの再確認（Recheck）
- holeではないか
- Proxyではないか
- 書き込み先があふれていないか

<p class="lede" style="margin-top:20px;">
コピー本体より、この付帯チェックのほうが重いくらいです。
</p>

---

# 数値サブ配列のバルクコピー

<p class="lede">
数値だけのPackedなサブ配列は、backing storeをまるごとコピーします。
</p>

<div class="array-memory">
  <div class="array-label">サブ配列 [1, 2, 3] のメモリ</div>
  <div class="cells">
    <div class="cell copied">1</div>
    <div class="cell copied">2</div>
    <div class="cell copied">3</div>
  </div>
  <div class="copy-arrow">↓ memcpy で長さ分を一括コピー</div>
  <div class="array-label">結果配列のメモリ</div>
  <div class="cells">
    <div class="cell">書込済</div>
    <div class="cell copied">1</div>
    <div class="cell copied">2</div>
    <div class="cell copied">3</div>
    <div class="cell">未書込</div>
  </div>
</div>

---

<img class="anim" src="/flat-bulk-copy.gif" alt="バルクコピーでサブ配列ごとに一括コピーする様子" />

- 60回の個別書き込みが、6回のブロックコピーに
- 4つの確認も、サブ配列1つにつき型の確認1回だけ

---

<p class="lede">
コピーには、最終的に <code>libc</code> の <code>memcpy</code> を呼ぶ <code>TorqueCopyElements</code> を使います。
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
<code>PACKED_DOUBLE_ELEMENTS</code> も同じ要領で <code>FixedDoubleArray</code> をコピーします。
</p>

---

# 2パス方式があるから使える近道

- 第1パスで、コピー先の長さと型が確定している
- 配列を作り直す必要がない
- 要素ごとに型をそろえ直す必要もない

---

# なぜ「数値配列だけ」<br>一括コピーできるのか

- 使えるのは `PACKED_SMI_ELEMENTS` と `PACKED_DOUBLE_ELEMENTS` だけ
- `PACKED_ELEMENTS` には使えない
- 境目は「write barrier」

---

# write barrierとは何か

- V8のGCは世代別で、若い世代と古い世代を別々のタイミングで掃除する
- だからGCは、どのオブジェクトがどこを参照しているかを把握しておく必要がある
- ポインタを書き込むたびに「ここに参照ができた」とGCへ知らせる
- この通知がwrite barrier

---

# なぜmemcpyだと危ないのか

- `memcpy` はビット列を複製するだけで、write barrierを発行しない
- 中身がポインタだと、GCが新しい参照に気づけない
- まだ使われているオブジェクトを回収し、use-after-freeでクラッシュやメモリ破壊

---

# どの型なら安全か

| ElementsKind | 中身 | ポインタを含む？ | 一括コピー |
| --- | --- | --- | --- |
| `PACKED_SMI_ELEMENTS` | 小さな整数（Smi） | 含まない（値そのもの） | できる |
| `PACKED_DOUBLE_ELEMENTS` | 生の浮動小数点数 | 含まない | できる |
| `PACKED_ELEMENTS` | 文字列やオブジェクト | 含む（ポインタの配列） | 単純にはできない |

---

# hole埋めの省略

- `AllocateFixedDoubleArrayWithHoles` は、全スロットをholeを表す値で埋めてから返す
- 2パス方式なら、全スロットが第2パスで必ず埋まる
- このhole埋めは無駄
- 初期化しない `AllocateFixedArray` で確保し、`FixedDoubleArray` として扱う

---

| | 2パス方式 | バルクコピー |
| --- | --- | --- |
| 確保 | `AllocateFixedDoubleArrayWithHoles` | `AllocateFixedArray` |
| hole埋め | 全スロットを初期化 | しない |
| 正しさ | 常に安全 | 全スロットを必ず書くので安全 |

---

# レビューでどう磨かれたか

- レビューは前回に引き続きOlivier Flückigerさん
- 最初にpushした実装から、だいぶ形が変わった

---

# Recheckの巻き上げ

- `Recheck` は、配列の構造が変わっていないかの確認
- 最初の実装は、要素ごとに呼んでいた
- Olivierさん「これは巻き上げられるはず」
- 配列ごとに1回へ移動

```diff
 while (true) {
+  fastOW.Recheck() otherwise goto Bailout;
   while (index < currentLength) {
-    fastOW.Recheck() otherwise goto Bailout;
     if (index >= fastOW.Get().length) goto Bailout;
```

---

# 巻き上げても安全な理由

- 内側ループの中ではJSのコードが動かない
- 構造が変わりうる処理は、内側ループを抜けるかbailoutする
- だから配列ごとに1回の確認で足りる

---

# PACKED_ELEMENTSをどうするか

<p class="lede">
一番もめたのが、<code>PACKED_ELEMENTS</code> を一括コピーに含めるかどうかでした。
</p>

1. 最初は `PACKED_SMI_ELEMENTS` と `PACKED_ELEMENTS` の両方を一括コピー
2. Olivierさん「それはwrite barrierを飛ばすので安全でない」
3. `PACKED_ELEMENTS` はwrite barrier付きの1個ずつのストアに変更
4. Olivierさん「むしろそのケースは消した方がよい。利得もわずかに見える」

---

# PACKED_ELEMENTSをどうするか

1. それでも手元では、ループ版が約30%速い
2. Olivierさん「思ったより大きいね。その時間はどこで使われているの？」
3. 正体は `memcpy` ではなく、4つの確認を省けた分
4. 速いケースを先に片づける構造案は、読みにくいので元に戻す

<p class="lede" style="margin-top:20px;">
最終的に <code>memcpy</code> するのは数値配列の2種類だけになりました。
</p>

---

# 深さ制限の撤廃

- 最初の実装は、一括コピーを最も深い階層だけに限定
- Olivierさん「その限定も要らない」
- 数値だけのPacked配列はサブ配列を含まないので、深さに関係なくリーフ
- `[[1, 2, 3]].flat(5)` でも一括コピーできる

---

# ベンチマーク

- d8（arm64）で、V8 14.6.206とmainを比較
- 1,000個 × 1,000要素を `flat(2)`、8回計測の最小値

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
| 結果配列の確保 | 足りなくなるたびに作り直し | 長さを数えて1回だけ | 1回だけ |
| サブ配列の処理 | 再帰で降りて1個ずつ追加 | 1個ずつ直接書き込み | 数値配列は `memcpy` で一括 |
| 要素ごとの確認 | あり | あり | 数値配列ではなし |
| 速度の目安 | 1x | 約5x | 約20x |

- 大きく伸びたのは数値だけのPacked配列で、`PACKED_SMI_ELEMENTS` は約24倍
- 一括コピーの対象外の型も、1回確保のおかげで1.5倍ほど速い

---

# V8に大きな変更を<br>入れるまでの流れ

---

<ol class="journey">
  <li><span class="when">提案</span>v8-devに実装方針を投稿</li>
  <li><span class="when">合意</span>Leszek Swirskiさん「良さそうだね。パッチ出して、議論はそっちでしようか」</li>
  <li><span class="when">レビュー</span>GerritでLeszek SwirskiさんとOlivier Flückigerさんがレビュー</li>
  <li><span class="when">マージ</span>最初のコミットから約1ヶ月でV8 14.7へ</li>
  <li><span class="when">翌日</span>ClusterFuzzがバグを3件発見</li>
</ol>

---

# まずv8-devで提案する

- 大きな変更は、いきなりパッチを出さない
- 先にレビュアーと実装方針の合意を取るのが推奨
- v8-devに投稿すると、誰かしら反応してくれる

<p class="lede">
<a href="https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM">https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM</a>
</p>

---

<p class="lede">
最初のコミットから約1ヶ月、やりきりました。
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

# ClusterFuzzとの戦い

---

<p class="lede">
マージの翌日、GoogleのClusterFuzzがバグを3件発見しました。
</p>

- crbug 488366773
- crbug 488586038
- crbug 489008235

---

<p class="lede">
原因は <code>GetPackedElementsKind</code> が<br><code>HOLEY_DOUBLE_ELEMENTS</code> を <code>PACKED_DOUBLE_ELEMENTS</code> として扱っていたことです。
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

- `HOLEY_DOUBLE_ELEMENTS` はholeを含むので、`.length` と要素数が一致しない
- 第1パスの長さと、実際の要素数がずれる
- `V8_ENABLE_UNDEFINED_DOUBLE` が有効だと、FixedDoubleArrayにundefinedが入る
- 第2パスの `UnsafeCast<Number>` がundefinedに当たってクラッシュ

```ts
// src/builtins/array-flat.tq
doubleElements.values[targetIndex] =
    Convert<float64_or_undefined_or_hole>(UnsafeCast<Number>(element));
```

---

# 修正とClose

- `GetPackedElementsKind` を削除し、`source.map.elements_kind` を直接見る
- 本当にPACKEDなElementsKindだけをショートカットの対象に
- 回帰テストを足し、CLの `Bug:` にissue番号を書いてマージ
- ClusterFuzzが自動で再評価し、修正を確認するとClose

---

<p class="lead-q">
ClusterFuzzが品質を守っていることを<br>実感した瞬間でした。
</p>

---

# まとめ

- ElementsKindを使い、数値だけのPacked配列は走査そのものを省略
- 長さを先に数えて、結果配列の確保を1回に
- 数値だけのサブ配列は、write barrierが要らないので `memcpy` で一括コピー
- 最初のコミットから約1ヶ月でマージ、翌日にClusterFuzzが3件を発見

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
