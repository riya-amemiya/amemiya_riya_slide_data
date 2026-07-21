---
theme: seriph
background: white
title: V8のTorqueを語りたい
info: |
  「V8はC++で書かれている」とよく言われます。確かにほとんどの実装はC++です。
  ですが、builtinsをのぞいてみると、そこにあるのはC++でもJavaScriptでもない、Torqueという見慣れない言語です。
  なぜGoogleは、V8専用の言語をわざわざ開発したのでしょうか。

  このトークは、その素朴な疑問を入り口に、V8特有の問題と、それを解くために生まれたTorqueを見ていきます。
  かつてV8のbuiltinsは、CodeStubAssembler(CSA)という記法で手書きされていました。
  CSAは高速な反面、型の保証が弱く、型の取り違えが起こりやすく、それがクラッシュや深刻な脆弱性の原因になっていました。
  安全で速いコードをCSAで書くには、多くの専門知識が求められていました。
  Torqueは、この状況を変えるために生まれた、静的型付きの言語です。
  ECMAScriptの仕様アルゴリズムの手順と対応づけて書ける構文を持ちながら、コンパイルでCSAを使うコードに変換されるため、速さを犠牲にしません。

  本トークでは、実際のTorqueコードなどを交えながら、なぜこの言語が必要だったのか、TorqueがV8の安全性と速度をどう支えているのかを、V8初心者の方にも追える形で紹介します。
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
    V8の<span class="accent">Torque</span>を<br>
    語りたい<br>
  </h1>
  <div class="byline">西 悠太 <span class="venue">/ 株式会社ダイニー</span></div>
</div>

<!--
皆さん、こんにちは。今日は「V8のTorqueを語りたい」というタイトルでお話しします。
V8はC++で書かれているとよく言われますが、その内側にはTorqueという、あまり知られていない専用言語があります。
なぜこの言語が生まれたのか、という素朴な疑問から一緒に見ていきます。
-->

---

<h1 style="margin-bottom:20px">自己紹介</h1>

<div class="intro-grid">
  <div class="bio">
    <p><strong>西 悠太</strong> <span>(Nishi Yuta)</span></p>
    <p>V8 Contributor</p><p>Platform Engineer at Dinii Inc.</p><p>TSKaigi Staff</p>
    <p style="margin-top:24px;">TypeScriptが好きです。<br>V8の中身をのぞくのも好きです。</p>
    <div class="role">(実は21歳)</div>
  </div>
  <img class="avatar" src="/icon.png" alt="プロフィール画像" />
</div>

<!--
改めまして、西悠太と申します。株式会社ダイニーでPlatform Engineerをしています。
TypeScriptが好きで、そこからJavaScriptエンジンの実装にも興味を持つようになりました。
今日はV8のbuiltinsを支えるTorqueという言語の話をします。
-->

---

# V8とは？

V型8気筒（ブイがたはちきとう）は、レシプロエンジン等のシリンダー配列形式の一つで、直列4気筒2組がV字様に配置されている形式を指す。当記事では専らピストン式内燃機関のそれについて述べる[注釈 1]。V8（ブイはち）と略されることが多い。

多気筒レシプロエンジンとして広く用いられるエンジン形式の一つであり、自動車用としては特に大排気量車の多かったアメリカ合衆国で発達してきた。ガソリンエンジン、ディーゼルエンジン双方あるも､現代では大型乗用車用のエンジン形式として普及している。 引用: [V型8気筒 - Wikipedia](https://ja.wikipedia.org/wiki/V%E5%9E%8B8%E6%B0%97%E7%AD%92)

---

# V8とは？

V8は、Googleが開発するオープンソースのJIT仮想マシン型のJavaScriptエンジンである[3]。この名前は同じく「V8」と略されるV型8気筒エンジンに由来している[4]。Google ChromeなどのChromiumベースのブラウザや、Node.jsなどで採用されている。

概要<br>
ECMAScript (ECMA-262) 準拠で、C++で記述されている。スタンドアローンでの実行が可能なほか、C++で書かれたアプリケーションの一部として動作させることもできる。

引用: [V8 (JavaScriptエンジン) - Wikipedia](https://ja.wikipedia.org/wiki/V8_(JavaScript%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%B3))

---

<div class="lead-q">
  「V8は<span class="blue">C++</span>で書かれている」
</div>

<p class="lede" style="margin-top:36px;">
確かにほとんどの実装はC++です。
</p>

<!--
まず、よく聞く話から始めます。V8はC++で書かれている。これはその通りで、大部分はC++です。
ただ、組み込み関数の実装をのぞくと、少し違う景色が見えます。
-->

---

<p class="lede">
builtinsをのぞいてみると、そこにあるのは<br>
C++でもJavaScriptでもない、見慣れない言語。
</p>

<div class="torque-name">Torque</div>

<!--
builtinsは、Array.prototype.forEachのような組み込み関数の実装です。
そこをのぞいてみると、出てくるのはC++でもJavaScriptでもない見慣れない言語です。
これがTorqueで、V8のためだけにGoogleが作った専用言語です。
-->

---

# これがTorqueです

```ts
// src/builtins/array-foreach.tq より抜粋
transitioning javascript builtin ArrayForEach(
    js-implicit context: NativeContext, receiver: JSAny)(
    ...arguments): JSAny {
  const o: JSReceiver = ToObject_Inline(context, receiver);
  const len: Number = GetLengthProperty(o);
  const callbackfn = Cast<Callable>(arguments[0])
      otherwise TypeError;
  // ...
}
```

<!--
実際のTorqueコードがこれです。Array.prototype.forEachの実装の冒頭部分です。
ToObjectして、lengthを取って、callableでなければTypeErrorへ。仕様に出てくる操作が同じ順序で並んでいます。
JavaScriptにもC++にも似ていて、でもどちらとも違う。これがTorqueの見た目です。
-->

---

<div class="lead-q">
  なぜGoogleは、<br>
  <span class="blue">V8専用の言語</span>を<br>
  わざわざ作ったのか？
</div>

<!--
ここで素朴な疑問が湧きます。
言語を設計して、コンパイラを作って、保守し続ける。相応のコストです。
それでも専用言語を作った理由を、これから見ていきます。
-->

---

# Torque以前<br>CSAの時代

<!--
その理由を理解するために、Torqueが生まれる前の話をします。
-->

---

# builtinsは手書きされていた

<p class="lede">
かつてV8のbuiltinsは、<strong class="blue">CodeStubAssembler</strong>（CSA）という<br>
C++ベースの低水準な記法で手書きされていました。
</p>

<!--
かつてV8のbuiltinsは、CodeStubAssembler、略してCSAというC++ベースの低水準な記法で手書きされていました。
C++のAPIで低水準の命令列を組み立てると、そこから各CPU向けの機械語が生成されます。
さらに昔はアセンブリやJavaScript自身で書かれた時代もあり、そこからCSAへ移ってきました。
-->

---

# CSAは速い。けれど…

<div class="two-col wide">
  <div>
    <p><strong>CSAの強み</strong></p>
    <ul class="clean">
      <li>関数呼び出しの余計なコストを避けられる</li>
      <li>機械語レベルで攻めた最適化ができる</li>
      <li>1つの記述で全アーキ向けに生成できる</li>
    </ul>
  </div>
  <div>
    <p><strong>CSAの弱み</strong></p>
    <ul class="clean">
      <li>型の保証が弱い</li>
      <li>制御フローが手続き的で読みにくい</li>
      <li>正しく書くのに深い専門知識が要る</li>
    </ul>
  </div>
</div>

<!--
CSAは速さの面ではとても優秀でした。
関数呼び出しの余計なコストを避けられて、機械語レベルの最適化ができて、1つの記述で全アーキ向けに生成できます。
一方で弱みもありました。型の保証が弱いこと、制御フローが読みにくいこと、正しく書くのに深い専門知識が要ることです。
-->

---

# 一番の問題は、型の保証が弱いこと

```cpp
TNode<Object> elem = LoadFixedArrayElement(elements, index);

TNode<JSArray> arr = UncheckedCast<JSArray>(elem);
```

<p class="lede" style="margin-top:24px;">
CSAにも <code>TNode&lt;T&gt;</code> という型はあります。<br>
ただ無検査のキャストが通るため、<code>elem</code> が本当に JSArray かまでは保証されません。
</p>

<!--
一番の問題は、型の保証が弱いことでした。
CSAにもTNodeという型はあります。でも、上のように取り出した値をUncheckedCastで狭い型へ落とせてしまいます。
このelemが本当にJSArrayなのかは、誰も保証してくれません。思い込みが外れても、コンパイルは通ります。
-->

---

# 取り違えは、脆弱性になる

<p class="lede">
型の取り違えが容易に起こり、しかもそれが<br>
クラッシュや深刻な脆弱性の原因になっていました。
</p>

<p class="lede" style="margin-top:28px;">
型ごとにメモリ上の配置が違うため、誤った型として読むと、<br>
無関係な領域をフィールドとして読み書きしてしまうためです。
</p>

<!--
この取り違えは、単なるバグでは済みません。
V8では型ごとにメモリ上の配置が違います。Stringのつもりで別の型を読むと、無関係な領域をフィールドとして読み書きしてしまいます。
これがtype confusionで、メモリ安全性の問題、つまり脆弱性に直結します。
実際にCSA手書きの時期には、型の取り違えに起因する問題がChromiumのバグ追跡に記録されています。
-->

---

# つまり、こういう状況

<p class="lede">
安全で速いコードをCSAで書くには、<br>
<strong class="blue">多くの専門知識</strong>が求められていました。
</p>

<!--
まとめると、こういう状況でした。
速いコードは書けるけれど、安全で速いコードをCSAで書くには、多くの専門知識が求められていました。
この状況を変えるために生まれたのがTorqueです。
-->

---

# Torqueの登場<br>型のある世界へ

<!--
ここからが本題、Torqueです。
-->

---

# Torque = 静的型付きのDSL

<div class="versus">
  <div class="card old">
    <div class="title">CSA</div>
    <ul>
      <li>型の保証が弱い</li>
      <li>無検査キャストで取り違えが起きうる</li>
      <li>専門知識が前提</li>
    </ul>
  </div>
  <div class="card new">
    <div class="title">Torque</div>
    <ul>
      <li>V8の値に静的な型が付く</li>
      <li>取り違えをコンパイル時に検出しやすい</li>
      <li>仕様に近い書き方ができる</li>
    </ul>
  </div>
</div>

<!--
Torqueは、CSAの上に型システムと構造化された制御フローを載せた、静的型付きのDSLです。
V8の値に静的な型が付き、取り違えをコンパイル時に検出しやすくなります。そして、仕様に近い読みやすい書き方ができます。
一つずつ見ていきます。
-->

---

# 仕様の手順と対応づけて書ける

<div class="spec-map">
  <div>
    <p><strong>ECMAScript 仕様 (forEach)</strong></p>
    <ol class="spec">
      <li>Let <code>O</code> be ? ToObject(this value).</li>
      <li>Let <code>len</code> be ? LengthOfArrayLike(O).</li>
      <li>If IsCallable(callbackfn) is false, throw a <strong>TypeError</strong> exception.</li>
    </ol>
  </div>
  <div>
    <p><strong>Torque</strong></p>

```ts
const o: JSReceiver =
    ToObject_Inline(context, receiver);
const len: Number =
    GetLengthProperty(o);
const callbackfn =
    Cast<Callable>(arguments[0])
    otherwise TypeError;
```

  </div>
</div>

<!--
これが個人的に一番好きなところです。
左が仕様のforEachの手順、右がTorqueの実装です。
オブジェクト化、長さの取得、呼び出し可能かの検査。仕様の手順が、同じ順序でコードに並びます。
仕様と実装が近いと、仕様通りかどうかを追いやすくなります。実際の実装には高速化のための経路も加わりますが、背骨は仕様と同じ形です。
-->

---

# 失敗経路を、コンパイル時に強制

```ts
const arr = Cast<JSArray>(obj) otherwise Bailout;

const n: Number = x;
typeswitch (n) {
  case (s: Smi): { ... }
  case (h: HeapNumber): { ... }
}
```

<p class="lede" style="margin-top:22px;">
<code>Cast</code> は実行時に型を検査し、<strong class="blue">失敗経路を書かないとコンパイルが通りません</strong>。<br>
<code>typeswitch</code> は共用型を型ごとに分け、網羅性まで検査されます。
</p>

<!--
TorqueのCastは実行時に型を検査します。失敗しうるCastには、otherwiseで失敗時の行き先を書かないとコンパイルが通りません。
CSAのUncheckedCastとの違いがここです。なおUnsafeCastは残っており、検査はdebugビルドのdcheckに限られます。握りつぶしが一切できない、ではありません。
typeswitchは共用型を型ごとに分岐します。nがNumberならcase SmiとHeapNumberで、網羅性まで検査されます。
こうして、取り違えをコンパイル時に検出しやすくなります。
-->

---

# でも、<br>速さはどうなる？

<!--
ここで当然の疑問が出ます。型を付けて、読みやすくして、速さは犠牲になっていないのか。
-->

---

# Torqueはコンパイルされる

<div class="pipeline">
  <div class="stage first">
    <div class="st-name">Torque</div>
  </div>
  <div class="p-arrow">→</div>
  <div class="stage">
    <div class="st-name">C++</div>
  </div>
  <div class="p-arrow">→</div>
  <div class="stage last">
    <div class="st-name">機械語</div>
  </div>
</div>

<p class="lede" style="margin-top:32px;">
Torqueは実行時に解釈される言語ではありません。<br>
<strong class="blue">CSA を使う C++</strong> にコンパイルされ、最終的に機械語になります。
</p>

<!--
Torqueは実行時に解釈される言語ではありません。
.tqファイルはコンパイルされ、CSAを使うC++になります。人が手書きしていたCSAを、Torqueが代わりに出します。
そのC++から最終的に機械語になります。近年はTurboshaft側の生成もあります。
-->

---

# だから、速さを犠牲にしない

<p class="lede">
Torqueは<strong class="blue">読みやすさ</strong>と<strong class="blue">型安全</strong>を足しながら、<br>
CSAの性能を引き継ぎます。
</p>

<!--
TorqueはCSAと同じ低水準の基盤の上で動きます。
だから、読みやすさと型安全を足しながら、CSAの性能を引き継げます。
安全で速いコードを書くための専門知識の一部を、型と構文が肩代わりします。これがTorqueの狙いです。
-->

---

# では、Torqueの強さはどこまでか

<!--
ここまでは読みやすさ、型安全、コンパイルで速さを残す、という設計の話でした。
最後に2点見ます。extern macroでCSAの操作に届くことと、最適化後の実行との関係です。
-->

---

# CSA の操作を、extern macro で呼ぶ

```ts
// src/builtins/js-array.tq
extern macro MoveElements(
    FixedArray|FixedDoubleArray, Smi, Smi, Smi): void;
```

<p class="lede" style="margin-top:22px;">
<code>extern macro</code> は、CSA 側の実装を Torque から呼ぶ宣言です。<br>
<code>MoveElements</code> の実体は CodeStubAssembler にあります。
</p>

<p class="lede" style="margin-top:18px;">
同じ処理を CSA で手書きし直す必要がありません。<br>
<strong class="blue">Runtime を経由せず、生成コード側で完結させられます。</strong>
</p>

<!--
一つめです。extern macroでCSAの操作をTorqueから呼べます。
MoveElementsはjs-array.tqでextern macroとして宣言され、実装はcode-stub-assembler.ccにあります。
呼び出し側のTorqueマクロ（DoMoveElementsなど）はラッパーで、CSA操作そのものではありません。
MoveElementsは常にmemmoveではありません。FixedDoubleArrayの場合やwrite barrierを省ける場合にmemmoveし、tagged要素ではbarrier付きの要素ごとコピーになります。
-->

---

# 最適化後も、Torque builtin が使われる

<p class="lede">
V8 では、Maglev や TurboFan が生成するコードからも<br>
Torque で書いた builtin を呼ぶことがあります。
</p>

<p class="lede" style="margin-top:22px;">
一方で、TurboFan が forEach をインライン展開するように、<br>
<strong class="blue">最適化側が別経路を持つ場合もあります。</strong>
</p>

<p class="lede" style="margin-top:18px;">
それでも、Torque で書いた builtin は<br>
インタプリタ実行や、インライン化されない呼び出しの土台になります。
</p>

<!--
二つめです。V8の話です。
MaglevやTurboFanが生成するコードからも、Torqueのbuiltinを呼ぶことは多いです。
ただし無条件ではありません。forEachはTurboFanがインライン展開し、array-foreach.tqにはoptimized forEach用のdeopt continuation builtinもあります。
「別実装を一切足さなくてよい」とは言い切れません。Torque builtinは、インタプリタ実行や、最適化でインライン化されない呼び出しの土台として効きます。
-->

---

# まとめ

<!--
最後にまとめます。
-->

---

# Torqueが同時に狙ったもの

<div class="two-col" style="grid-template-columns:1fr 1fr 1fr; gap:28px;">
  <div>
    <div class="col-label">読みやすさ</div>
    <p class="lede" style="font-size:0.95em;">仕様の手順と対応づけて書ける</p>
  </div>
  <div>
    <div class="col-label">安全性</div>
    <p class="lede" style="font-size:0.95em;">型の取り違えをコンパイル時に検出しやすい</p>
  </div>
  <div>
    <div class="col-label">速度</div>
    <p class="lede" style="font-size:0.95em;">CSA の性能を Torque から使える</p>
  </div>
</div>

<p class="lede" style="margin-top:36px;">
この3つを同時に満たすために、Googleは専用言語という重い選択をしました。
</p>

<!--
Torqueが狙ったのは、読みやすさ、安全性、速度の3つです。
仕様の手順と対応づけて書けて、型の取り違えをコンパイル時に検出しやすくて、CSAの性能をTorqueから使える。
この3つを同時に満たすために、Googleは専用言語を作るという重い選択をしました。
-->

---

# 今日覚えて帰ってほしいこと

<ul class="clean">
  <li>V8 の builtins の多くは <strong>Torque</strong> という専用言語で書かれている</li>
  <li>CSA の手書きは速いが、<strong>型の保証が弱かった</strong></li>
  <li>Torque は静的型付きで、<strong>取り違えをコンパイル時に検出しやすい</strong></li>
  <li>CSA を使う C++ にコンパイルされるため、<strong>速さを犠牲にしない</strong></li>
  <li><code>extern macro</code> で CSA の操作を呼べる</li>
  <li>最適化後も Torque builtin が使われることが多い（インライン化など例外あり）</li>
</ul>

<!--
今日覚えて帰ってほしいことです。
V8のbuiltinsの多くはTorqueという専用言語で書かれていること。
CSAの手書きは速いけれど、型の保証が弱かったこと。
Torqueは静的型付きで、取り違えをコンパイル時に検出しやすいこと。
CSAを使うC++にコンパイルされるため、速さを犠牲にしないこと。
extern macroでCSAの操作を呼べること。
最適化後もTorque builtinが使われることが多いが、forEachのようにインライン化される例外もあること。
-->

---

# 参考資料

<ul class="refs">
  <li>V8 Docs: <a href="https://v8.dev/docs/torque">Torque user manual</a></li>
  <li>V8 Docs: <a href="https://v8.dev/docs/torque-builtins">Torque builtins</a></li>
  <li>V8 Blog: <a href="https://v8.dev/blog/csa">Taming architecture complexity in V8 — the CodeStubAssembler</a></li>
</ul>


<!--
参考資料です。Torqueのuser manualと、CSAについてのブログ記事がおすすめです。
V8の内部実装はバージョンや環境で変わるので、このスライドは代表的な概念に絞っています。
-->

---

# ご清聴ありがとうございました

<div class="thanks">
  <div>「V8はC++で書かれている」。</div>
  <strong>その内側には、Torqueがいる。</strong>
</div>

<!--
ご清聴ありがとうございました。
V8はC++で書かれている、とよく言われますが、その内側にはbuiltinsを支えるTorqueがいます。
この話が、V8の中身をのぞいてみるきっかけになれば嬉しいです。
-->
