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
3. 要素が配列なら、再帰呼び出しでその中を見る
4. 配列でなければ、結果配列の末尾に1個追加する

---

# どこが遅かったのか

- 容量が足りなくなるたびに確保し直してコピー
- 汎用のプロパティ書き込みで1個ずつ追加
- サブ配列ごとに再帰呼び出し

---

<FlatAnimation scene="old" />

<p class="lede">新しい容量 = 必要な長さ + 必要な長さの半分 + 16</p>

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
<code>PACKED_SMI_ELEMENTS</code> と <code>PACKED_DOUBLE_ELEMENTS</code> には、サブ配列もProxyもholeも入らない<br>
この保証を使って最適化する
</p>

---

# メモリ割り当てを<br>1回に減らす2パス方式

---

# 最適化前と2パス方式

<div class="ba">
  <div>
    <div class="ba-col-title">最適化前</div>
    <div class="ba-steps">
      <div class="ba-step">長さ0の配列を作る</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">要素を1個ずつ見る<br>配列なら再帰呼び出しで中を見る</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">結果配列の末尾に1個追加</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">容量が足りなければ<br>確保し直してコピー</div>
    </div>
    <div class="ba-loop">↑ 要素の数だけくり返す</div>
  </div>
  <div>
    <div class="ba-col-title">2パス方式</div>
    <div class="ba-steps">
      <div class="ba-step">第1パスで長さと型を数える</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step win">その長さで1回だけ確保</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">第2パスで直接書き込む</div>
    </div>
  </div>
</div>

<p class="lede" style="margin-top:20px;">
JSCでSosuke Suzukiさんが実装した2パス方式を参考にした<br>
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

<FlatAnimation scene="compare-twopass" />

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

# `[[1,2,3], [4,5,6], [7,8,9]].flat()`

<p class="lede">数値だけのサブ配列は、中を読まずに <code>.length</code> を足す</p>

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

<FlatAnimation scene="kinds" />

---

# 第2パスはまだ1個ずつコピーしていた

<div class="ba">
  <div>
    <div class="ba-col-title">2パス方式の第2パス</div>
    <div class="ba-steps">
      <div class="ba-step">サブ配列の中へ入る</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">要素を1個読む</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step cost">4つの確認<br>構造の変化、hole、Proxy、書き込み先の範囲</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step">結果配列に1個書く</div>
    </div>
    <div class="ba-loop">↑ 要素の数だけくり返す</div>
  </div>
  <div>
    <div class="ba-col-title">バルクコピー</div>
    <div class="ba-steps">
      <div class="ba-step">サブ配列の型を1回だけ確認</div>
      <div class="ba-arrow">↓</div>
      <div class="ba-step win">memcpyでまとめてコピー</div>
    </div>
  </div>
</div>

---

# 数値のサブ配列はまとめてコピー

<p class="lede">第1パスで長さと型が決まっているので、ブロックごと流し込める</p>

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

<FlatAnimation scene="compare-bulk" />

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

# memcpyできるのは数値配列だけ

| ElementsKind | 中身 | ポインタ | memcpy |
| --- | --- | --- | --- |
| `PACKED_SMI_ELEMENTS` | 小さな整数そのもの | なし | できる |
| `PACKED_DOUBLE_ELEMENTS` | 生のdouble | なし | できる |
| `PACKED_ELEMENTS` | 文字列やオブジェクトへの参照 | あり | できない |

<p class="lede" style="margin-top:20px;">分かれ目はwrite barrier</p>

---

# write barrier

- V8のGCは世代別なので、どのオブジェクトがどこを指しているかを知っておく必要がある
- ポインタを書くたびにGCへ知らせる仕組みがwrite barrier
- `memcpy` はGCに知らせないので、ポインタを運ぶと使用中のオブジェクトが回収されてuse-after-freeになる

---

<FlatAnimation scene="barrier" />

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

<p class="lede">HOLEY配列は1個ずつ見て、hole以外を数える</p>

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
- HOLEYなサブ配列は `memcpy` できず、1個ずつコピー
- HOLEY配列でも確保は1回だけ

---

<FlatAnimation scene="hole" />

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

<FlatAnimation scene="stack" />

---

# どこでbailoutするか

<p class="lede">前提がそろっている間だけ速いコードで進み、崩れたらその場でslow pathへ</p>

| 場所 | 確認すること |
| --- | --- |
| fast pathの入口 | 長さがSmiの範囲内か、配列がfast modeか、`Symbol.species` が標準か |
| 走査中 | `Recheck()` で配列の構造が変わっていないか、Proxyがないか |
| 第2パスの最後 | 書き込んだ要素数と、第1パスで数えた長さが一致するか |

---

# ベンチマーク

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

<table class="ba-table">
  <tr><th></th><th>最適化前</th><th>2パス方式</th><th>バルクコピー</th></tr>
  <tr><td>結果配列の確保</td><td class="bad">足りなくなるたびに作り直す</td><td class="good">長さを数えて1回だけ</td><td class="good">1回だけ</td></tr>
  <tr><td>サブ配列の処理</td><td class="bad">再帰で中へ入り1個ずつ追加</td><td class="bad">1個ずつ直接書く</td><td class="good">数値配列は <code>memcpy</code> でまとめて</td></tr>
  <tr><td>要素ごとの確認</td><td class="bad">ある</td><td class="bad">ある</td><td class="good">数値配列ではない</td></tr>
  <tr><td>速度の目安</td><td class="bad">1x</td><td>約5x</td><td class="good">約20x</td></tr>
</table>

---

# V8に大きな変更を<br>入れるまでの流れ

---

# まずv8-devで提案する

- 大きな変更は、いきなりパッチを出さない
- 先にレビュアーと方針をすり合わせる
- v8-devに投稿すると、誰かが反応してくれる

<p class="lede">
Leszek Swirskiさんの返信<br>
「良さそうだね、パッチ出して、議論はそっちでしようか」<br>
<a href="https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM">https://groups.google.com/g/v8-dev/c/8ROaTLSDXkM</a>
</p>

---

# GerritにCLを出す

- GerritにCLをアップロード
- レビュアーには、変更したファイルのオーナーであるLeszekさんを入れる
- 最初の版はC++のruntime関数で書いていた

---

# 最初の指摘

- Leszekさん「このfast pathはruntime関数ではなく、Torque/CSAで実装するのがよい」
- runtimeの呼び出しコストを払わずに済む
- V8では普通、fast pathはTorqueかCSAで書き、runtimeを呼ぶのはslow pathだけ
- パッチセット2でTorqueに書き直す

---

# マージまで

- マージには2人の `Code-Review+1` が要る
- 私にはtry jobもCQも動かす権限がないので、レビュアーに頼む

| ラベル | 動き |
| --- | --- |
| `Commit-Queue+1` | try botでテストだけ回す（dry run） |
| `Commit-Queue+2` | テストが通ったらそのままマージ |

---

<p class="lede">
Chrome 147（V8 14.7）でリリース
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
マージの翌日、GoogleのClusterFuzzがバグを3件発見<br>
buganizer-systemからメールが届く
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

# 修正とClose

- `GetPackedElementsKind` を消し、`source.map.elements_kind` を直接見る
- ショートカットは本当にPACKEDなときだけ
- 回帰テストを足し、CLの `Bug:` にissue番号を書く
- マージ後、ClusterFuzzが自動で再評価してClose

---

# まとめ

- 従来のflatは、結果配列を確保し直しながら1個ずつ追加していた
- 2パス方式で長さと型を先に求め、確保を1回にした
- 数値だけのサブ配列はwrite barrierが要らないので、`memcpy` でまとめてコピー
- holeは第1パスで数えて、第2パスで飛ばす
- Torqueの `TryFastFlat` で実装し、前提が崩れたらslow pathへ
- v8-devで方針を合わせてからGerritに出し、2人の `Code-Review+1` とCQでマージ
- マージ翌日にClusterFuzzが見つけたバグは、回帰テストを足して修正

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
