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

<p class="lede" style="margin-top:24px;">
<code>flat(depth)</code> はネストされた配列を <code>depth</code> の深さまで平坦化します。
</p>
<p class="lede">
<code>depth</code> を省略した場合や <code>undefined</code> を渡した場合はデフォルトの1が使われます。
</p>

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

<p class="lede">
基本的なアルゴリズムは素朴で、以下のような流れです。
</p>

<ol class="flow" style="margin-top:24px;">
  <li>空の結果配列を作成</li>
  <li>ソース配列を走査し、要素が配列かつ <code>depth &gt; 0</code> なら再帰、そうでなければ結果配列に追加</li>
  <li>要素を追加するたびに結果配列に書き込む</li>
</ol>

---

<p class="lede">
まず、結果配列を長さ0で作成してから要素を1つずつ追加していくため、配列が何度も再割り当てされます。
</p>
<p class="lede">
次に、<code>flat</code> はholeを詰める仕様のため、結果配列のインデックスとソース配列のインデックスが異なります。従来の実装は汎用的なプロパティ書き込みを1要素ずつ呼んでいたため、オーバーヘッドが大きい状態でした。
</p>

---

# ElementsKindとは

<p class="lede">
V8は配列の中身を「整数だけ」「浮動小数点を含む」「Holeがある」といったElementsKindと呼ばれる内部型で追跡しており、この型情報を使うと「数値しか入っていない配列にはサブ配列が存在し得ない」ことが自明になり、走査そのものを省略できます。
</p>

---

<p class="lede">
主要なElementsKindは以下の通りです。
</p>

| | Packed（holeなし） | Holey（holeあり） |
| --- | --- | --- |
| 全要素が小さな整数（Smi） | `PACKED_SMI_ELEMENTS` | `HOLEY_SMI_ELEMENTS` |
| 浮動小数点数を含む配列 | `PACKED_DOUBLE_ELEMENTS` | `HOLEY_DOUBLE_ELEMENTS` |
| 文字列やオブジェクトを含む配列 | `PACKED_ELEMENTS` | `HOLEY_ELEMENTS` |

<p class="lede" style="margin-top:24px;">
ElementsKindの遷移は原則一方向（汎化のみ）であり、一度HOLEYになるとholeを埋めてもPACKEDには基本的に戻りません。
</p>

---

<p class="lede">
重要な性質として、<code>PACKED_SMI_ELEMENTS</code> や <code>PACKED_DOUBLE_ELEMENTS</code> の配列には数値しか入っていないことが保証されます。
</p>
<p class="lede">
つまり、これらの配列にはサブ配列もProxyも存在し得ません。この保証を最適化に活用するのが今回のパッチの肝です。
</p>

---

# メモリ割り当てを<br>1回に減らす2パス方式

---

# 最適化の戦略

<p class="lede">
V8もJSCと同様に2パス方式を採用しました。
</p>
<p class="lede">
第1パスで結果配列の正確な長さとElementsKindを事前計算し、第2パスで1回のメモリ確保と直接書き込みを行います。
</p>
<p class="lede">
参考にさせて頂いたSosuke Suzukiさんにもこの場を借りて感謝申し上げます。
</p>
<p class="lede">
<a href="https://github.com/WebKit/WebKit/pull/56035">https://github.com/WebKit/WebKit/pull/56035</a>
</p>

---

<div class="two-col">
  <div>
    <div class="col-label">旧実装</div>
    <ol class="flow">
      <li>空の結果配列を作成</li>
      <li>ソース要素を走査</li>
      <li>要素は配列？ → 再帰的にFlatten</li>
      <li>結果配列に1要素追加</li>
      <li>backing store溢れ？ → 再割り当て</li>
    </ol>
  </div>
  <div>
    <div class="col-label">新実装</div>
    <ol class="flow">
      <li>第1パス<br>長さとElementsKindを計算</li>
      <li>1回のメモリ確保</li>
      <li>第2パス<br>直接書き込み</li>
      <li>JSArrayを返却</li>
    </ol>
  </div>
</div>

---

<div class="mapping">
  <div class="key">メモリ割り当て</div><div>O(log n)回 → 1回</div>
  <div class="key">要素書き込みコスト</div><div>直接書き込みでオーバーヘッド激減</div>
  <div class="key">ElementsKind遷移</div><div>ゼロ</div>
</div>

---

# 数値配列のショートカット

<p class="lede">
ソース配列が <code>PACKED_SMI_ELEMENTS</code> または <code>PACKED_DOUBLE_ELEMENTS</code> の場合、全要素が数値でありholeもないことが保証されているため、要素を1つずつ走査する必要がありません。
</p>

```ts
// src/builtins/array-flat.tq
if (sourceKind == ElementsKind::PACKED_SMI_ELEMENTS ||
    sourceKind == ElementsKind::PACKED_DOUBLE_ELEMENTS) {
  return FlattenedLengthResult{length: sourceLength, targetKind: sourceKind};
}
```

<p class="lede" style="margin-top:24px;">
これだけで <code>[1, 2, 3, ..., 1024].flat()</code> のようなケースは長さ計算がO(1)になります。
</p>

---

# サブ配列に対するショートカット

<p class="lede">
サブ配列が <code>PACKED_SMI_ELEMENTS</code> や <code>PACKED_DOUBLE_ELEMENTS</code> の場合、先ほど説明したようにその中身は数値のみでありさらなるネストはあり得ません。したがって、サブ配列の場合も数値のみの配列なら走査せずに <code>.length</code> をそのまま加算できます。
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

<p class="lede">
たとえば <code>[[1,2,3], [4,5,6], [7,8,9]].flat()</code> では、外側の配列は <code>PACKED_ELEMENTS</code>（サブ配列を含むため）ですが、各サブ配列は <code>PACKED_SMI_ELEMENTS</code> です。
</p>
<p class="lede">
長さ計算では外側の3要素だけを走査し、各サブ配列の <code>.length</code> を加算するだけで済みます。サブ配列の中身（1, 2, 3, ...）を読む必要はありません。
</p>

---

# ElementsKindの追跡

<p class="lede">
長さ計算の過程で、リーフ要素（最終的に結果配列に入る値）の型を <code>seenSmi</code>、<code>seenDouble</code>、<code>seenObject</code> の3つのフラグで追跡します。
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
走査完了後、これらのフラグから結果配列の最適なElementsKindを決定します。
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
この追跡により、たとえば <code>[[1], [2], [3]].flat()</code> の結果が <code>PACKED_SMI_ELEMENTS</code> として生成されます。
</p>

---

# 結果配列のElementsKindが<br>最適化されるメリット

<p class="lede">
従来の実装では空の配列を作成してから要素を1つずつ追加していくため、追加のたびにElementsKind transitionが発生する場合がありました。
</p>
<p class="lede">
新実装では第1パスで全リーフ要素の型を把握し終えてからElementsKindを確定するため、この遷移が一切発生しません。
</p>

---

<p class="lede">
たとえば、SmiとDoubleが混在するサブ配列の <code>flat</code> 結果は <code>PACKED_DOUBLE_ELEMENTS</code> になります。
</p>

```js
// test/mjsunit/array-flat-elements-kind.js
assertSmiElementsKind([[1],[1]].flat());
assertDoubleElementsKind([[1],[1.1]].flat());
assertObjectElementsKind([["hello"]].flat());
```

<p class="lede" style="margin-top:24px;">
SmiはDoubleに包含されるため、<code>PACKED_ELEMENTS</code>（汎用型）ではなく <code>PACKED_DOUBLE_ELEMENTS</code> として生成できるのです。
</p>

---

<p class="lede">
結果配列のElementsKindが正確であることは、<code>flat</code> の後に続く処理にも好影響を与えます。
</p>
<p class="lede">
V8のJITコンパイラは、配列のElementsKindに基づいて特殊化されたコードを生成します。
</p>
<p class="lede">
たとえば <code>flat</code> の結果が <code>PACKED_SMI_ELEMENTS</code> であれば、後段のループ処理で各要素がSmiであることを前提としたコードが生成され、型チェックのオーバーヘッドが省けます。
</p>

---

# `[[1, 2, 3], [4, 5, 6]].flat()`

<div class="two-col" style="margin-top:20px;">
  <div>
    <div class="col-label">旧実装</div>
    <ol class="flow">
      <li>空の結果配列を作成</li>
      <li>[1,2,3]を発見<br>IsArrayで判定</li>
      <li>再帰して<br>1, 2, 3を個別に追加</li>
      <li>[4,5,6]を発見<br>IsArrayで判定</li>
      <li>再帰して<br>4, 5, 6を個別に追加</li>
    </ol>
  </div>
  <div>
    <div class="col-label">新実装</div>
    <ol class="flow">
      <li>外側2要素を走査<br>各サブ配列は PACKED_SMI<br>.lengthを加算 → 結果長=6</li>
      <li>長さ6のFixedArrayを<br>一度だけ確保</li>
      <li>各サブ配列の要素を<br>結果配列に直接書き込み</li>
    </ol>
  </div>
</div>

---

# holeを詰める<br>flat特有の仕様との格闘

---

<p class="lede">
<code>flat</code> はholeを詰めるという特殊な仕様を持っています。
</p>

```js
> [1, , 3].flat()
[ 1, 3 ]
> [1, , 3].map(n => n * 2)
[ 2, <1 empty item>, 6 ]
```

<p class="lede" style="margin-top:24px;">
<code>map</code> などのJS配列メソッドはholeをそのまま保持しますが、<code>flat</code> はholeをスキップして結果を詰めます。
</p>

---

<p class="lede">
これは最適化する上で少し厄介な点です。
</p>
<p class="lede">
holeがあると入力配列の <code>.length</code> と結果配列の実際の要素数が一致しないため、事前に正確な結果長を計算するにはholeを数える必要があります。
</p>

---

# HOLEY配列の扱い

<p class="lede">
HOLEY配列の場合、前述のショートカットは使えません。<code>.length</code> が10でも実際の要素数は5かもしれないからです。
</p>
<p class="lede">
HOLEYの場合は要素を1つずつ走査してholeを検出し、実際の要素数を数えます。
</p>

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

<p class="lede" style="margin-top:24px;">
<code>LoadElementNoHole</code> はholeを検出するとラベルにジャンプし、そのインデックスをスキップします。結果としてholeが詰められた配列が生成されます。
</p>
<p class="lede">
なお、HOLEY配列であっても2パス方式の恩恵（事前サイズ確保）は受けられます。
</p>

---

# V8独自言語Torqueでの実装

<div class="mapping" style="margin-top:24px;">
  <div class="key">Torque</div><div>V8の組み込み関数を書くための専用言語</div>
  <div class="key">fast path / slow path</div><div>速いが条件付きの経路と、どんな入力でも正しく処理できる経路</div>
  <div class="key">bailout</div><div>fast pathの前提が崩れたとき、slow pathへ退避すること</div>
</div>

---

<p class="lede">
V8の従来の <code>flat</code> はTorqueの <code>FlattenIntoArrayFast</code> と、そのフォールバックである <code>FlattenIntoArraySlow</code> で構成されていました。
</p>

```ts
// src/builtins/array-flat.tq
try {
  return TryFastFlat(o, len, depthSmi) otherwise SlowFastPath;
} label SlowFastPath {}

const a: JSReceiver = ArraySpeciesCreate(context, o, 0);
```

<p class="lede" style="margin-top:24px;">
fast pathの条件を満たさない場合は、従来のslow pathにフォールバックします。
</p>

---

<p class="lede">
具体的には以下のようなケースでフォールバックが発生します。
</p>

<ul class="clean" style="margin-top:24px;">
  <li><code>Symbol.species</code> がオーバーライドされている</li>
  <li>ソース配列がProxyである</li>
  <li>サブ配列にProxyが含まれている</li>
  <li>配列がFastモードでない（dictionary mode等）</li>
  <li>Smiの範囲を超える長さ</li>
  <li>深すぎるネスト</li>
</ul>

---

# 明示的スタックによる反復処理

<p class="lede">
ネストされたサブ配列を処理する際、素朴に実装するなら再帰呼び出しを使います。
</p>
<p class="lede">
しかし、再帰での実装は生成されるコードがあまりにも複雑になり、buildが失敗してしまったため、今回のパッチでは明示的なスタックを使った反復処理を採用しました。
</p>

---

```ts
// src/builtins/array-flat.tq
if (stack.length >= kMaxFlatFastStackEntries) goto Bailout;
stack.Push(currentArray);
stack.Push(nextIndex);
stack.Push(currentDepth);
```

<p class="lede" style="margin-top:24px;">
1エントリあたり3要素（配列参照、インデックス、深さ）をpushし、サブ配列の処理が終わったらpopして親の状態を復元します。
</p>
<p class="lede">
深さの上限は <code>kMaxFlatFastStackEntries = 3072</code>（1エントリ3要素で実質深さ1024まで）で、超過した場合はslow pathにフォールバックします。
</p>

---

# 安全性の担保とBailout<br>（フォールバック）の仕組み

<p class="lede">
fast pathは「楽観的だが安全」という方針で設計されています。
</p>
<p class="lede">
全ての前提条件が満たされていると仮定して高速なコードを実行しますが、前提が崩れた瞬間にslow pathへフォールバックします。
</p>

---

<p class="lede">
bailoutポイントは大きく3つのカテゴリに分けられます。
</p>

<div class="col-label" style="margin-top:24px;">fast pathの入口での検証</div>
<p class="lede">
<code>TryFastFlat</code> が呼ばれた直後、配列の長さがSmi範囲内か、配列がfast mode（dense backing store、標準プロトタイプ）かを検証します。
</p>

<div class="col-label" style="margin-top:20px;">走査中の不変条件チェック</div>
<p class="lede">
各イテレーションの先頭で <code>Recheck()</code> を呼び、配列の構造が変わっていないこと（mapの一致やプロトタイプチェーン上に要素が追加されていないこと）を確認します。
</p>

<div class="col-label" style="margin-top:20px;">2パス間の整合性検証</div>
<p class="lede">
第2パスの完了時に、実際にコピーした要素数と第1パスで計算した長さが一致するかを検証します。
</p>

---

# ベンチマーク結果

<p class="lede">
d8で実測したベンチマーク結果です。outer=20,000、chunk=1,024（合計約20M要素）、depth=1、50回計測のmedian値で比較しています。
</p>

| 配列型 | パッチ適用 (median) | main (median) | 改善倍率 |
| --- | --- | --- | --- |
| SMI (整数) | 39.32 ms | 181.06 ms | ~4.6x |
| DOUBLE (浮動小数点数) | 48.21 ms | 224.80 ms | ~4.7x |
| OBJECT (文字列) | 79.56 ms | 190.80 ms | ~2.4x |

---

<p class="lead-q">
2パス方式で最大約5倍になった <code>flat</code> を、サブ配列の「バルクコピー」でさらに約5倍速くしました。
</p>

<p class="lede" style="margin-top:28px;">
2つの最適化を合わせると、何も手を入れていなかった頃と比べて約20倍になります。
</p>

---

# どこがまだ遅かったのか

<p class="lede">
2パス方式でも、第2パスのコピーは1個ずつのままでした。
</p>
<p class="lede">
<code>[[1, 2, 3], [4, 5, 6]].flat()</code> を例にします。サブ配列 <code>[1, 2, 3]</code> は数値だけなので、メモリ上では整数が3つ連続して並んでいるだけです。
</p>
<p class="lede">
本来なら、その並びを結果配列へブロックごと移せば済みます。
</p>

---

<p class="lede">
ところが第2パスは、サブ配列の中へ降りて <code>1</code>、<code>2</code>、<code>3</code> を1個ずつ読み書きしていました。しかも1要素ごとに、毎回4つの確認が走ります。
</p>

<ul class="clean" style="margin-top:24px;">
  <li>配列の構造が変わっていないかの再確認（Recheck）</li>
  <li>holeではないかのチェック</li>
  <li>Proxyではないかのチェック</li>
  <li>書き込み先があふれていないかの範囲チェック</li>
</ul>

<p class="lede" style="margin-top:12px;">
コピー本体より、この付帯チェックのほうが重いくらいです。
</p>

---

# 数値サブ配列のバルクコピー

<p class="lede">
サブ配列が数値だけのPacked配列なら、backing storeをまるごとコピーするようにしました。
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

<p class="lede" style="margin-top:24px;">
<code>[[1, 2, 3], [4, 5, 6]]</code> なら、6回の個別書き込みが2回のブロックコピーにまとまります。
</p>
<p class="lede">
4つの確認も、サブ配列1つにつき型の確認1回だけになります。
</p>

---

<p class="lede">
コピーには、最終的に <code>libc</code> の <code>memcpy</code> を呼ぶV8の <code>TorqueCopyElements</code> を使います。
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
<code>PACKED_DOUBLE_ELEMENTS</code> のサブ配列も、同じ要領で <code>FixedDoubleArray</code> をコピーします。
</p>

---

<p class="lede">
この近道が踏めるのは、前回の2パス方式のおかげです。
</p>
<p class="lede">
第1パスでコピー先の長さと型を確定させてあるので、第2パスでは配列を作り直す必要も、要素ごとに型をそろえ直す必要もありません。
</p>

---

# なぜ「数値配列だけ」<br>一括コピーできるのか

<p class="lede">
一括コピーが使えるのは <code>PACKED_SMI_ELEMENTS</code> と <code>PACKED_DOUBLE_ELEMENTS</code> だけで、<code>PACKED_ELEMENTS</code> には使えません。
</p>
<p class="lede">
その境目が「write barrier」です。
</p>

---

# write barrierとは何か

<p class="lede">
V8のGC（ガベージコレクタ）は世代別です。新しく作られたオブジェクトはまず若い世代に置かれ、生き残ったものだけが古い世代へ移ります。
</p>
<p class="lede">
若い世代と古い世代は別々のタイミングで掃除されるので、GCはどのオブジェクトがどのオブジェクトを参照しているかを取りこぼさず把握しておく必要があります。
</p>

---

<p class="lede">
そこで、あるオブジェクトのスロットに別のオブジェクトへのポインタを書き込むたび、GCへ「ここに参照ができた」と知らせます。
</p>
<p class="lede">
この通知が「write barrier」で、コンパイラがポインタ書き込みの直後に小さな記録処理を自動で挟みます。
</p>

---

# なぜmemcpyだと危ないのか

<p class="lede">
<code>memcpy</code> はビット列をそのまま複製するだけで、write barrierを発行しません。
</p>
<p class="lede">
中身がポインタだと、GCは新しくできた参照に気づけません。
</p>
<p class="lede">
その結果、まだ使われているオブジェクトを回収し、解放済みメモリへのアクセス（use-after-free）でクラッシュやメモリ破壊を招きます。
</p>

---

# どの型なら安全か

| ElementsKind | 中身 | ポインタを含む？ | 一括コピー |
| --- | --- | --- | --- |
| `PACKED_SMI_ELEMENTS` | 小さな整数（Smi） | 含まない（値そのもの） | できる |
| `PACKED_DOUBLE_ELEMENTS` | 生の浮動小数点数 | 含まない | できる |
| `PACKED_ELEMENTS` | 文字列やオブジェクト | 含む（ポインタの配列） | 単純にはできない |

---

# hole埋めの省略

<p class="lede">
前回は <code>AllocateFixedDoubleArrayWithHoles</code> で結果配列を確保していました。これは全スロットを、holeを表す特別な値で埋めてから返します。
</p>
<p class="lede">
ところが2パス方式では、第1パスで長さを正確に数えているので、全スロットが第2パスで必ず埋まります。このhole埋めは完全に無駄でした。
</p>

---

<p class="lede">
そこで、初期化しない <code>AllocateFixedArray</code> で同じサイズのバッファだけ確保し、<code>FixedDoubleArray</code> として扱うようにしました。
</p>

| | 前回 | 今回 |
| --- | --- | --- |
| 確保 | `AllocateFixedDoubleArrayWithHoles` | `AllocateFixedArray` |
| hole埋め | 全スロットを初期化 | しない |
| 正しさ | 常に安全 | 全スロットを必ず書くので安全 |

---

# レビューでどう磨かれたか

<p class="lede">
レビューは前回に引き続きOlivier Flückigerさんが担当してくれました。
</p>
<p class="lede">
最初にpushした実装は、レビューでだいぶ形を変えました。
</p>

---

# Recheckの巻き上げ

<p class="lede">
走査ループの先頭では、配列の構造が変わっていないかを <code>Recheck</code> で確認します。最初の実装は、これを要素ごとに呼んでいました。
</p>
<p class="lede">
Olivierさんは「これは巻き上げられるはず」と指摘しました。そこで、確認を配列ごとに1回へ移しました。
</p>

```diff
 while (true) {
+  fastOW.Recheck() otherwise goto Bailout;
   while (index < currentLength) {
-    fastOW.Recheck() otherwise goto Bailout;
     if (index >= fastOW.Get().length) goto Bailout;
```

---

<p class="lede">
安全なのは、内側ループの中でJSのコードが動かないからです。
</p>
<p class="lede">
サブ配列への降下やProxyの検出など、配列の構造が変わりうる処理は、いずれも内側ループを抜けるかbailoutします。
</p>
<p class="lede">
構造が変わるのはループを抜けたときだけなので、配列ごとに1回だけ確認すれば足ります。
</p>

---

# PACKED_ELEMENTSをどうするか

<p class="lede">
一番もめたのが、<code>PACKED_ELEMENTS</code>（オブジェクトの配列）を一括コピーの対象に含めるかどうかでした。
</p>
<p class="lede">
最初の実装は <code>PACKED_SMI_ELEMENTS</code> と <code>PACKED_ELEMENTS</code> の両方を対象にしていました。しかし後者はポインタの配列です。Olivierさんは「それはwrite barrierを飛ばすので安全でない」と指摘しました。
</p>

---

<p class="lede">
そこで、<code>PACKED_SMI_ELEMENTS</code> は一括のまま残し、<code>PACKED_ELEMENTS</code> はwrite barrier付きの1個ずつのストアへ変えました。これにOlivierさんは「むしろそのケースは消した方がよい。利得もわずかに見える」と返しました。
</p>
<p class="lede">
それでも手元では、<code>PACKED_ELEMENTS</code> のループ版が約30%速くなりました。その数字を伝えると、Olivierさんは「思ったより大きいね。その時間はどこで使われているの？」と尋ねました。
</p>

---

<p class="lede">
調べてみると、速くなった正体は <code>memcpy</code> ではありませんでした。降下パスが要素ごとに走らせていた4つの確認を、省けた分でした。
</p>
<p class="lede">
ここでOlivierさんは、速いケースを前半のループで先に片づける構造案を出しました。一度はそれで書き換えました。しかし両方を並べたOlivierさんは「自分の案はかなり読みにくい。前の形の方がよかった」と判断し、元のネストループへ戻しました。
</p>
<p class="lede">
最終的に、<code>memcpy</code> するのは数値配列の2種類だけにし、<code>PACKED_ELEMENTS</code> は従来通り1個ずつのパスへ流すことに決まりました。
</p>

---

# 深さ制限の撤廃

<p class="lede">
最初の実装は、一括コピーを最も深い階層だけに限定していました。
</p>
<p class="lede">
Olivierさんは「その限定も要らない。数値だけのPacked配列はサブ配列を含まないので、残りの深さに関係なくリーフだと保証される」と指摘しました。
</p>
<p class="lede">
おかげで <code>[[1, 2, 3]].flat(5)</code> のように深さ指定が大きくても、一括コピーが効きます。
</p>

---

# ベンチマーク

<p class="lede">
d8（arm64）で、最適化前のV8（14.6.206）と最適化後（main）を比べました。
</p>
<p class="lede">
以下の数値は合計100万要素（1000要素のサブ配列が1000個）の配列を <code>flat(2)</code> で平坦化し、ウォームアップ後に8回の計測での最小値です。
</p>

| サブ配列の型 | 最適化前 | 最適化後 | 速度比 |
| --- | --- | --- | --- |
| `PACKED_SMI_ELEMENTS` | 6.09 ms | 0.26 ms | 約24x |
| `PACKED_DOUBLE_ELEMENTS` | 7.56 ms | 0.53 ms | 約14x |
| `PACKED_ELEMENTS` | 5.92 ms | 3.87 ms | 約1.5x |
| `HOLEY_SMI_ELEMENTS` | 5.91 ms | 3.45 ms | 約1.7x |
| `HOLEY_DOUBLE_ELEMENTS` | 7.49 ms | 4.66 ms | 約1.6x |
| `HOLEY_ELEMENTS` | 6.12 ms | 3.85 ms | 約1.6x |

---

<p class="lede">
大きく伸びたのは、数値だけのPacked配列です。<code>PACKED_SMI_ELEMENTS</code> で約24倍、<code>PACKED_DOUBLE_ELEMENTS</code> で約14倍になりました。
</p>
<p class="lede">
一括コピーの対象外である残りの型も、2パス方式の1回確保で1.5倍ほど速くなっています。
</p>

---

# V8に大きな変更を<br>入れるまでの流れ

---

<p class="lede">
まず、このような大きな変更をV8に入れる場合、いきなりパッチを出すのではなく、事前にレビュアーと実装方針の合意を取ることが推奨されています。
</p>
<p class="lede">
V8にはdiscussionの場があり、そこに提案を投稿すると誰かしら反応してくれます。
</p>
<p class="lede">
<a href="https://groups.google.com/g/v8-dev">https://groups.google.com/g/v8-dev</a>
</p>

---

<p class="lede">
自分のケースではLeszek Swirskiさんが反応してくれて、「良さそうだね。パッチ出して、議論はそっちでしようか」と言っていただいたのでGerritにパッチを出しました。
</p>
<p class="lede">
レビューはLeszek SwirskiさんとOlivier Flückigerさんが担当してくれました。
</p>
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
メインパッチがマージされた翌日、GoogleのClusterFuzz（自動バグ検知システム）が3件のバグを発見しました（crbug 488366773, 488586038, 489008235）。
</p>

---

<p class="lede">
原因は、初期実装にあった <code>GetPackedElementsKind</code> マクロが <code>HOLEY_DOUBLE_ELEMENTS</code> を <code>PACKED_DOUBLE_ELEMENTS</code> として扱っていたことでした。
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

<p class="lede">
<code>HOLEY_DOUBLE_ELEMENTS</code> の配列はholeを含む可能性があり、<code>.length</code> が実際の要素数と一致しません。
</p>
<p class="lede">
そのため第1パスで計算した長さと実際の要素数にずれが生じ、第2パスで <code>UnsafeCast&lt;Number&gt;</code> がundefined値（<code>V8_ENABLE_UNDEFINED_DOUBLE</code> が有効な場合にFixedDoubleArrayに格納される）に対して実行されクラッシュしていました。
</p>

```ts
// src/builtins/array-flat.tq
doubleElements.values[targetIndex] =
    Convert<float64_or_undefined_or_hole>(UnsafeCast<Number>(element));
```

---

<p class="lede">
修正では <code>GetPackedElementsKind</code> マクロを完全に削除し、<code>source.map.elements_kind</code> を直接参照して真にPACKEDなElementsKindのみをショートカット対象とするようにしました。
</p>
<p class="lede">
buganizer-systemからメールが届くので、回帰テストとCLにissue番号を <code>Bug:</code> として記載してマージすると自動で再評価が行われ、修正が確認されたらCloseされます。
</p>
<p class="lede">
迅速にレビューしていただき、翌日にはマージされました。
</p>

---

<p class="lead-q">
ClusterFuzzが品質を守っていることを実感した瞬間でした。
</p>

---

# まとめ

<p class="lede">
ElementsKindの情報を活用してPacked数値配列では走査自体を省略するショートカットや、配列の事前確保などを行いました。
</p>
<p class="lede">
2パス方式で最大約5倍になった <code>flat</code> を、サブ配列の「バルクコピー」でさらに約5倍速くしました。
</p>
<p class="lede">
中身が数値だと型レベルで保証されているからこそ、write barrierを気にせず丸ごと運べます。
</p>

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
