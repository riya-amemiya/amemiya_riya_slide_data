---
theme: seriph
background: white
title: JavaScriptのNumberは1つじゃない？V8内部の型システムを覗く
info: |
  普段私たちはTypeScriptを書くとき、NumberやStringといった型で開発しています。
  型安全なコードは当たり前になりましたが、私たちがコード上で書くNumberと、JavaScriptエンジンであるV8が内部で扱う数値の表現が大きく異なることは、あまり知られていません。

  仕様上、数値はすべてNumberです。
  しかしV8の内部では、同じNumberでも一つの姿に固定されていません。
  たとえば整数の42はヒープを使わないSmiという即値として、小数の4.2はHeapNumberというヒープ上のdoubleとして持たれ、仕様の上では同じNumberでも内部では別の形になります。
  この違いは配列にも及びます。
  整数だけの配列はSmiを並べた形で、小数を含む配列はdoubleを生のビット列で並べた形で持たれ、同じ数値の並びでも格納の仕方が変わります。
  つまり一つのNumberは、単体でも配列の中でも、値しだいで内部の表現を変えています。

  本セッションでは、なぜV8がここまで数値の表現を細分化するのかを、具体例とともに解説します。
  普段書いているコードがV8上でどう解釈され最適化されているのかが見えると、言語の挙動への理解が一段深まります。
  TypeScriptの型とは一味違う、V8のディープなNumberの世界を一緒に覗いてみませんか？
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
    JavaScriptの<span class="accent">Number</span>は<br>
    1つじゃない？<br>
    <span style="font-size:.62em;">V8内部の型システムを覗く</span>
  </h1>
  <div class="byline">西 悠太 <span class="venue">/ 株式会社ダイニー</span></div>
</div>

<!--
皆さん、こんにちは。今日は「JavaScriptのNumberは1つじゃない？V8内部の型システムを覗く」というタイトルでお話しします。
普段TypeScriptを書いていると、numberはnumberとして扱いますよね。ですが、V8の中ではそのnumberが、値や置かれた場所によっていくつもの姿に変わっています。
今日はその裏側を、なるべくコードと図で見ていきます。
-->

---

<h1 style="margin-bottom:20px">自己紹介</h1>

<div class="intro-grid">
  <div class="bio">
    <p><strong>西 悠太</strong> <span>(Nishi Yuta)</span></p>
    <p>V8 Contributor</p><p>Platform Engineer at Dinii Inc.</p><p>TSKaigi Staff</p>
    <p style="margin-top:24px;">TypeScriptが好きです。<br>V8も好きです。</p>
    <div class="role">@riya-amemiya</div>
  </div>
  <img class="avatar" src="/icon.png" alt="プロフィール画像" />
</div>

<!--
改めまして、西悠太と申します。株式会社ダイニーでPlatform Engineerをしています。
TypeScriptが好きで、そこからJavaScriptエンジンの実装にも興味を持つようになりました。
今日はV8のNumber表現という、普段は意識しないけれど、知るとJavaScriptの見え方が変わる話をします。
-->

---

# 今日のゴール

<p class="lede">
<span class="blue">同じ number</span> に見える値が、<br>
V8 の中では <span class="blue">別の姿</span> で扱われることを知る。
</p>

<!--
今日のゴールは、同じnumberに見える値がV8内部では別の姿で扱われる、ということを知ることです。
ただ「内部で違います」で終わるのではなく、なぜV8がそんな面倒なことをしているのか、パフォーマンスやメモリの観点から見ていきます。
-->

---

# まずは<br>JavaScriptとしてのNumber

<!--
最初に、JavaScriptの仕様上のNumberを確認します。
-->

---

# 仕様上はシンプル

<p class="lede">
JavaScriptの数値は、基本的には <strong class="blue">Number</strong> です。
</p>

```ts
let a: number = 42
let b: number = 4.2
let c: number = NaN
let d: number = Infinity
```

<p class="lede" style="margin-top:28px;">
TypeScript で見ても、どれも <strong>number</strong> です。<br>
整数、小数、NaN、Infinity を別の型としては扱いません。
</p>

<!--
TypeScriptで数値を書くとき、型はnumberです。
42も4.2もNaNもInfinityも、言語レベルでは同じnumberとして扱われます。
もちろんBigIntは別ですが、今日扱うのはNumberの話です。
-->

---

# 早速、質問です

```js
console.log(typeof 42)
console.log(typeof 4.2)
console.log(typeof NaN)
```

<p class="lede" style="margin-top:24px;">
これは何が表示されるでしょう。
</p>

<!--
まず質問です。typeof 42、typeof 4.2、typeof NaN。これは何が表示されるでしょうか。
-->

---

```js
console.log(typeof 42)   // "number"
console.log(typeof 4.2)  // "number"
console.log(typeof NaN)  // "number"
```

<p class="lede" style="margin-top:24px;">
42 も 4.2 も NaN も、すべて <code>"number"</code> です。
</p>

<!--
答えは全部numberです。
JavaScriptから見える世界では、Numberの中をさらにSmiやdoubleのように分けることはありません。
でも、V8の中ではここから一気に話が細かくなります。
-->

---

# でも、V8から見ると？

<div class="number-split">
  <div class="number-card">
    <div class="label">42</div>
    <div class="type">Smi</div>
    <div class="desc">小さな整数です。<br>値そのものを即値として埋め込みます。</div>
  </div>
  <div class="number-card">
    <div class="label">4.2</div>
    <div class="type">HeapNumber</div>
    <div class="desc">double 値です。<br>ヒープ上のオブジェクトとして持ちます。</div>
  </div>
</div>

<p class="lede" style="margin-top:28px;">
JavaScript 上はどちらも <code>number</code> です。内部表現は違います。
</p>

<!--
V8から見ると、例えば42はSmiという小さな整数向けの即値表現で持てます。
一方、4.2のような小数はHeapNumberというヒープ上のオブジェクトとして持ちます。
JavaScript上は同じnumberなのに、内部では別の表現になっているわけです。
-->

---

# V8の値は<br>Tagged Value で表現される

<!--
では、その違いを理解するために、V8の Tagged Value の話をします。
-->

---

# Tagged Value

<p class="lede">
V8 は JavaScript の値を、内部的には <strong class="blue">Tagged Value</strong> として扱います。
</p>

<div class="tag-grid">
  <div class="tag-row">
    <div class="tag-name">Smi</div>
    <div class="tag-bits">… integer payload … <strong>0</strong></div>
  </div>
  <div class="tag-row">
    <div class="tag-name">HeapObject</div>
    <div class="tag-bits">… heap address / offset … <strong>1</strong></div>
  </div>
</div>

<p class="lede" style="margin-top:32px;">
末尾のビットをタグとして使い、<br>
小さな整数なのか、ヒープ上のオブジェクトへの参照なのかを区別します。
</p>

<!--
V8では値を Tagged Value として扱います。
末尾のビットをタグとして使い、Smi なのかヒープオブジェクトへの参照なのかを区別します。
実際のビット幅や圧縮の有無は環境によりますが、値にタグを埋め込む、という考え方です。
-->

---

# Smi: Small Integer

<div class="big-stat">
  <div class="n">42</div>
  <div class="label">ヒープに置かず、値そのものを持つ</div>
  <div class="sub">Small Integer = Smi</div>
</div>

<p class="lede" style="margin-top:32px;">
整数のたびに HeapNumber を作ると高コストです。<br>
よく出る小さな整数は、Tagged Value の中に直接埋め込みます。
</p>

<!--
SmiはSmall Integerの略です。
ループカウンタや配列の index のように、整数は JavaScript の実行中に大量に出てきます。
そのたびにヒープに HeapNumber を作っていたら、メモリも GC も大変です。
そのため、小さな整数は値そのものを Tagged Value に埋め込んで扱います。
-->

---

# HeapNumber: ヒープ上のdouble

<div class="heap-number">
  <div class="tagged-ref">Tagged Value<br><span>HeapObjectへの参照</span></div>
  <div class="arrow">→</div>
  <div class="heap-box">
    <div class="heap-title">HeapNumber</div>
    <div class="heap-body">IEEE 754 double<br><strong>4.2</strong></div>
  </div>
</div>

<p class="lede" style="margin-top:36px;">
小数、NaN、Infinity、Smi に収まらない整数は、<br>
HeapNumber として表現されます。
</p>

<!--
一方、4.2のような小数はSmiにはできません。
そこで、HeapNumberというヒープ上のオブジェクトを作り、その中にIEEE 754 doubleの値を持ちます。
NaNやInfinity、Smiの範囲に収まらない整数もこちら側になります。
-->

---

# なぜ分けるのか

<div class="two-col wide">
  <div>
    <p><strong>Smi にできると嬉しい</strong></p>
    <ul class="clean">
      <li>ヒープ割り当てがいらない</li>
      <li>GC 対象が増えない</li>
      <li>整数演算として扱いやすい</li>
    </ul>
  </div>
  <div>
    <p><strong>HeapNumber が必要な理由</strong></p>
    <ul class="clean">
      <li>小数を表現できる</li>
      <li>NaN、Infinity、-0 を表現できる</li>
      <li>Number 仕様の広い範囲をカバーできる</li>
    </ul>
  </div>
</div>

<p class="lede" style="margin-top:36px;">
速く、小さく扱える値は Smi に載せ、<br>
それでは足りない値は HeapNumber にします。
</p>

<!--
なぜ分けるのかというと、Smi にできる値は扱いやすいからです。
ヒープ割り当てが不要で、GC 対象も増えません。
一方で、JavaScript の Number は小数や NaN、Infinity、-0 も表現する必要があります。
そのため、Smi で扱えるものは Smi、それ以外は HeapNumber という分担になります。
-->

---

# 配列に入ると<br>さらに姿が変わる

<!--
ここから配列の話に入ります。Number 単体でも表現が分かれますが、配列に入るとさらに変わります。
-->

---

# V8は配列の中身も見ている

```js
const a = [1, 2, 3]
const b = [1, 2, 3.14]
const c = [1, 2, "3"]
```

<p class="lede" style="margin-top:28px;">
JavaScript から見ると、どれもただの <code>Array</code> です。<br>
V8 は配列の要素に応じて <strong class="blue">Elements Kind</strong> を変えます。
</p>

<!--
V8は配列の中身も見ています。
JavaScript から見るとどれも Array ですが、中身が小さな整数だけなのか、小数を含むのか、文字列のような任意の値を含むのかで Elements Kind が変わります。
-->

---

# Elements Kind

<div class="kind-list">
  <div class="kind-card fast">
    <div class="kind-name">PACKED_SMI_ELEMENTS</div>
    <div class="kind-code">[1, 2, 3]</div>
    <div class="kind-desc">Smi だけです。かなり特化できます。</div>
  </div>
  <div class="kind-card mid">
    <div class="kind-name">PACKED_DOUBLE_ELEMENTS</div>
    <div class="kind-code">[1, 2, 3.14]</div>
    <div class="kind-desc">double を生の値として並べられます。</div>
  </div>
  <div class="kind-card slow">
    <div class="kind-name">PACKED_ELEMENTS</div>
    <div class="kind-code">[1, 2, "3"]</div>
    <div class="kind-desc">任意の JS 値です。数値は HeapNumber 参照になりえます。</div>
  </div>
</div>

<!--
代表的なElements Kindを3つ挙げると、SmiだけのPACKED_SMI_ELEMENTS、小数を含むPACKED_DOUBLE_ELEMENTS、任意のJS値を含むPACKED_ELEMENTSがあります。
ここが今日の中心です。
同じNumberでも、配列の中ではSmiとして並ぶこともあれば、doubleの生のビット列として並ぶこともあります。
-->

---

# 整数だけの配列

```js
const xs = [1, 2, 3]
```

<div class="array-memory">
  <div class="array-label">PACKED_SMI_ELEMENTS</div>
  <div class="cells">
    <div class="cell smi">Smi 1</div>
    <div class="cell smi">Smi 2</div>
    <div class="cell smi">Smi 3</div>
  </div>
</div>

<p class="lede" style="margin-top:32px;">
小さな整数だけなら、要素は Smi として扱えます。<br>
要素ごとに HeapNumber を作る必要がありません。
</p>

<!--
整数だけの配列は、PACKED_SMI_ELEMENTSになります。
要素はSmiとして並びます。
数値ごとにHeapNumberを作る必要がないので、メモリ効率がよく、V8もこの前提で最適化できます。
-->

---

# 小数が入った配列

```js
const xs = [1, 2, 3]
xs.push(4.2)
```

<div class="array-memory">
  <div class="array-label">PACKED_DOUBLE_ELEMENTS</div>
  <div class="cells">
    <div class="cell dbl">1.0</div>
    <div class="cell dbl">2.0</div>
    <div class="cell dbl">3.0</div>
    <div class="cell dbl">4.2</div>
  </div>
</div>

<p class="lede" style="margin-top:32px;">
小数が混ざると、Smi 配列から double 配列へ移ります。<br>
この場合、配列の backing store には double 値を直接並べられます。
</p>

<!--
そこに4.2のような小数をpushすると、PACKED_DOUBLE_ELEMENTSへ遷移します。
配列内では HeapNumber への参照を並べるのではなく、double 値を直接並べる表現が使われます。
「小数は常に HeapNumber」と言い切ると雑で、配列の中では double の生値として持てるケースがあります。
-->

---

# 文字列が入った配列

```js
const xs = [1, 2, 3]
xs.push(4.2)
xs.push("5")
```

<div class="array-memory">
  <div class="array-label">PACKED_ELEMENTS</div>
  <div class="cells">
    <div class="cell obj">Smi 1</div>
    <div class="cell obj">Smi 2</div>
    <div class="cell obj">Smi 3</div>
    <div class="cell obj">HeapNumber*</div>
    <div class="cell obj">String*</div>
  </div>
</div>

<p class="lede" style="margin-top:32px;">
任意の JS 値が混ざると、より一般的な要素表現へ移ります。<br>
数値も、HeapNumber への参照として扱われる場面が出てきます。
</p>

<!--
さらに文字列のような別の種類の値が入ると、PACKED_ELEMENTSになります。
この世界では任意のJavaScript値を入れる必要があるので、Smiやヒープオブジェクトへの参照を並べる形になります。
小数はHeapNumberとして参照されます。
-->

---

# 遷移は基本、一方向

<div class="lattice">
  <div class="node top">PACKED_SMI_ELEMENTS</div>
  <div class="down">↓ 小数を追加</div>
  <div class="node mid">PACKED_DOUBLE_ELEMENTS</div>
  <div class="down">↓ オブジェクトや文字列を追加</div>
  <div class="node bottom">PACKED_ELEMENTS</div>
</div>

<p class="lede" style="margin-top:28px;">
一度より一般的な Elements Kind へ遷移すると、<br>
同じ配列インスタンスでは基本的に元の特化表現へ戻りません。
</p>

<!--
Elements Kindの遷移は基本的に一方向です。
Smiだけの配列に小数を入れるとdoubleへ。そこに文字列を入れるとelementsへ。
あとから小数や文字列を消しても、同じ配列インスタンスが元のPACKED_SMI_ELEMENTSに戻るわけではありません。
補足として、近年Array.prototype.fillに例外的な最適化が入っていますが、原則は一方向と考えると理解しやすいです。
-->

---

<div class="ph-compare">
  <h1 class="ph-title">PACKED と HOLEY</h1>
  <div class="ph-col">
    <p class="ph-h">PACKED</p>
    <pre class="code-sample">const xs = [1, 2, 3]</pre>
    <p class="lede">隙間がありません。<br>V8 が攻めた最適化をしやすいです。</p>
  </div>
  <div class="ph-col">
    <p class="ph-h">HOLEY</p>
    <pre class="code-sample">const xs = [1, , 3]
xs[9] = 10</pre>
    <p class="lede">穴があります。<br>追加チェックやプロトタイプ探索が必要になります。</p>
  </div>
</div>


<!--
Elements KindにはSmi、double、elementsという分類に加えて、PACKEDとHOLEYという分類があります。
PACKEDは隙間のない密な配列です。
HOLEY は穴がある疎な配列です。穴があると、単に undefined を返せばいいとは限らず、プロトタイプチェーンの探索も絡むので、最適化しにくくなります。
-->

---

# -0 や NaN も double 配列へ移す

```js
const xs = [1, 2, 3] // PACKED_SMI_ELEMENTS

xs.push(-0)       // ここで PACKED_DOUBLE_ELEMENTS へ
xs.push(NaN)      // すでに double 配列
xs.push(Infinity) // すでに double 配列
```

<p class="lede" style="margin-top:28px;">
見た目は整数に近くても、<br>
Smi では表現できない Number は double 扱いになります。
</p>

<!--
もう一つ大事なのが、-0、NaN、Infinityです。
-0は見た目には0ですが、JavaScriptでは+0と区別される場面があります。
こういった値はSmiでは表現できないので、配列に入るとdoubleのElements Kindへ遷移します。
遷移が起きるのは最初の push(-0) だけです。その後の NaN と Infinity は、すでに double 配列のうえでの追加です。
-->

---

# 実際に<br>V8の中を覗いてみる

<!--
ここからは、実際にV8のデバッグ機能で中を覗く方法を紹介します。
-->

---

# DebugPrint

<p class="lede">
V8の <code>d8</code> では、デバッグ用の内部関数で<br>
オブジェクトの内部表現を確認できます。
</p>

```bash
d8 --allow-natives-syntax
```

```js
const xs = [1, 2, 3]
%DebugPrint(xs)
```

<p class="lede" style="margin-top:28px;">
出力の <code>elements</code> に、<br>
<code>PACKED_SMI_ELEMENTS</code> のような Elements Kind が表示されます。
</p>

<!--
V8のd8というシェルでは、allow-natives-syntaxを付けると%DebugPrintのような内部関数を使えます。
配列をDebugPrintすると、elementsのところにPACKED_SMI_ELEMENTSのような情報が出てきます。
-->

---

# trace-elements-transitions

```js
const xs = [1, 2, 3]
xs.push(4.2)
xs.push("5")
```

```bash
d8 --trace-elements-transitions example.js
```

<p class="lede" style="margin-top:28px;">
Elements Kind が変わったタイミングをログで追えます。<br>
配列の表現が途中で変わる瞬間が見えます。
</p>

<!--
さらに、trace-elements-transitionsというフラグを使うと、Elements Kindの遷移がログとして出ます。
Smiからdoubleへ、doubleからelementsへ、という変化を実際に見ることができます。
-->

---

# TypeScriptの型とは違うレイヤー

<div class="layer-stack">
  <div class="layer ts">TypeScript<br><span>number</span></div>
  <div class="layer js">ECMAScript<br><span>Number</span></div>
  <div class="layer v8">V8 Runtime<br><span>Smi / HeapNumber / Elements Kind</span></div>
  <div class="layer machine">Machine Representation<br><span>tagged value / double / pointer</span></div>
</div>

<!--
ここで大事なのは、TypeScriptの型とV8の内部表現は違うレイヤーだということです。
TypeScriptではnumber、ECMAScript仕様上はNumber。
でもV8ランタイムではSmi、HeapNumber、Elements Kindのような分類があり、さらに機械表現としてtagged valueやdoubleやpointerがあります。
どれが正しいというより、見ているレイヤーが違います。
-->

---

# じゃあ普段のコードで<br>何を意識する？

<!--
最後に、普段のコードでどう考えるとよいかをまとめます。
-->

---

# まず、普通に書けばいい

<p class="lede">
V8 のために、無理なマイクロ最適化はしません。
</p>

<p class="lede" style="margin-top:28px;">
V8 はかなり賢いです。<br>
内部表現を知る目的は、普段のコードを全部 Smi に寄せることではありません。
</p>

<!--
まず最初に言っておきたいのは、V8のために無理なマイクロ最適化をしなくていい、ということです。
V8はかなり賢いです。
内部表現を知る目的は、普段のコードを全部Smiに寄せることではなく、なぜ特定のコードが遅くなることがあるのかを理解することです。
-->

---

# ただし、大量データでは性能に効く

<div class="two-col wide">
  <div>
    <p><strong>避けたい揺れ</strong></p>
    <ul class="clean">
      <li>数値配列に突然文字列を混ぜる</li>
      <li>密な配列を不用意に疎にする</li>
      <li>NaN や Infinity が大量に混ざる前提を放置する</li>
    </ul>
  </div>
  <div>
    <p><strong>安定しやすい形</strong></p>
    <ul class="clean">
      <li>同じ意味の値は同じ表現に寄せる</li>
      <li>配列はできるだけ密に保つ</li>
      <li>数値の大量処理なら TypedArray も検討する</li>
    </ul>
  </div>
</div>

<!--
ただし、大量データを扱う場面では効いてきます。
数値配列に突然文字列を混ぜる、密な配列を不用意に疎にする、NaNやInfinityが大量に混ざる前提を放置する、こういった揺れはV8の最適化を難しくします。
数値を大量に処理するなら、TypedArrayを検討するのも有効です。
-->

---

# 今日覚えて帰ってほしいこと

<ul class="takeaways">
  <li><strong>JavaScript上はNumber</strong>でも、V8内部では表現が分かれる</li>
  <li><strong>小さな整数は Smi</strong>、小数などは HeapNumber になりうる</li>
  <li>配列では <strong>Elements Kind</strong> によって格納方法が変わる</li>
  <li>V8は「速く扱える形」を選ぶために、内部で細かく分類している</li>
</ul>

<!--
今日覚えて帰ってほしいことは4つです。
JavaScript上はNumberでも、V8内部では表現が分かれること。
小さな整数はSmi、小数などはHeapNumberになりうること。
配列ではElements Kindによって格納方法が変わること。
そして、V8は速く扱える形を選ぶために、内部で細かく分類しているということです。
-->

---

# 参考資料

<ul class="refs">
  <li>V8 Blog: <a href="https://v8.dev/blog/elements-kinds">Elements kinds in V8</a></li>
  <li>V8 Blog: <a href="https://v8.dev/blog/pointer-compression">Pointer Compression in V8</a></li>
  <li>V8 Blog: <a href="https://v8.dev/blog/fast-properties">Fast properties in V8</a></li>
  <li>V8 Blog: <a href="https://v8.dev/blog/react-cliff">The story of a V8 performance cliff in React</a></li>
</ul>

<p class="lede" style="margin-top:28px;">
V8 の内部実装はバージョンやビルド設定、アーキテクチャによって変わります。<br>
このスライドでは、代表的な概念に絞って説明しています。
</p>

<!--
参考資料です。特にElements kinds in V8は、今日の配列の話を理解する上でとても良い記事です。
V8の内部実装はバージョンや環境によって変わるので、このスライドでは代表的な概念に絞っています。
-->

---

# ご清聴ありがとうございました

<div class="thanks">
  <div>JavaScriptのNumberは、</div>
  <strong>V8の中でいくつもの姿に変わる。</strong>
</div>

<!--
ご清聴ありがとうございました。
普段はただのnumberとして見ている値も、V8の中ではいくつもの姿に変わっています。
この話が、皆さんがJavaScriptをもう一段深く理解するきっかけになれば嬉しいです。
-->
