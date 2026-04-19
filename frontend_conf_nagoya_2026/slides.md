---
theme: seriph
background: white
title: 知ってた？JavaScriptの"正しさ"を検証するテストが5万以上もあること(Test262)
info: |
  私たちが毎日書くJavaScript
  その動作が仕様通りかどうかを検証するテストスイートが存在することをご存知ですか？ ECMAScript公式テストスイート「Test262」は、V8、SpiderMonkey、JavaScriptCoreといった主要エンジンが参照する「共通の物差し」です。
  この物差しがあるからこそ、「どのブラウザでも同じ結果になる」当たり前が実現されています。
  本トークでは、Test262の役割と必要性をわかりやすく解説します。また、私がV8のコードリーディング中に偶然見つけた「FIXME」コメントが、実はTest262の仕様準拠に関わるものであり、長年放置されていた修正のきっかけとなったエピソードも紹介します。 普段意識することのないJavaScriptの「信頼性の源泉」を覗いてみませんか？
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
  <div class="eyebrow">Frontend Conference Nagoya 2026</div>
  <h1 class="mega">
    知ってた？<br>
    JavaScriptの<span class="accent">＂正しさ＂</span>を検証する<br>
    テストが <span class="accent">5万以上</span>もあること<br>
    <span style="font-size:.58em; color:#8a95ac">(Test262)</span>
  </h1>
  <div class="byline">西 悠太 <span class="venue">/ 株式会社ダイニー</span></div>
</div>

<!--
皆さん、こんにちは！「知ってた？JavaScriptの"正しさ"を検証するテストが5万以上もあること」というタイトルで発表させていただきます。
皆さんが毎日書いているJavaScript、その裏側で一体何が起きているのか、考えたことはありますか？
今日は、JavaScriptがどのブラウザでも同じように動く、その「当たり前」を誰が守っているのかをお話しします。
-->

---

<h1 style="margin-bottom:20px">自己紹介</h1>

<div class="intro-grid">
  <div class="bio">
    <p><strong>西 悠太</strong> <span class="muted">(Nishi Yuta)</span></p>
    <p>株式会社ダイニー / Platform Engineer</p>
    <p style="margin-top:24px; color:#8a95ac;">TypeScriptが好きです。<br>V8も好きです。</p>
    <div class="role">@riya-amemiya</div>
  </div>
  <img class="avatar" src="/icon.png" alt="プロフィール画像" />
</div>

<!--
改めまして、西 悠太と申します。株式会社ダイニーでPlatform Engineerとして働いています。TypeScriptが大好きで、日々どうすればもっと良いコードが書けるか考えています。本日はどうぞよろしくお願いします。
-->

---

<div class="w-full text-center">
  <div class="pill">今日のゴール</div>
  <h1>
    JavaScript が<br>
    <span class="navy">どのブラウザでも同じように動く</span><br>
    その"当たり前"を、<br>
    誰が守っているのか？
  </h1>
  <p class="lede" style="margin-top:36px; color:#8a95ac; text-align:center;">…を知って、へー！と思って帰ってもらう。</p>
</div>

<!--
今日のゴールはシンプルです。普段私たちが書いているJavaScriptが、ChromeでもSafariでもFirefoxでも同じように動く。これって当たり前に思えますが、実は当たり前じゃないんです。その裏側にある仕組みを知って帰っていただければ大成功です。
-->

---

<div class="section-num">01</div>

# JavaScriptの仕様は<br>誰が決めているのか

<!--
まず、JavaScriptの仕様を誰が決めているのかという話から。
-->

---

# ECMAScript と TC39

<p class="lede">
私たちが書いている JavaScript の言語仕様は <strong class="blue">ECMAScript</strong>。<br>
これを制定しているのは <strong>Ecma International</strong> という標準化団体。
</p>

<p class="lede" style="margin-top:20px">
その中の <strong class="blue">TC39</strong>（Technical Committee 39）が ECMAScript の仕様策定を担当。
</p>

<div class="callout" style="margin-top:32px">
Google・Apple・Mozilla・Microsoft といったブラウザベンダーに加え、<br>
Bloomberg・Igalia などの企業、招待された個人の専門家も参加。<br>
<strong>特定企業ではなく、複数の利害関係者の"合議"で決まる。</strong>
</div>

<!--
私たちが書いているJavaScriptの言語仕様はECMAScriptと呼ばれています。これを制定しているのはEcma Internationalという標準化団体です。その中にTC39、Technical Committee 39という委員会があって、ここがECMAScriptの仕様策定を担当しています。TC39にはGoogle、Apple、Mozilla、Microsoftといったブラウザベンダーだけでなく、BloombergやIgaliaといった企業、さらに招待された個人の専門家も参加しています。つまりECMAScriptは特定の企業が単独で決めているわけではなく、複数の利害関係者が合議で策定している仕様なんです。
-->

---

<div class="caption" style="text-align:center; margin-bottom:20px">早速、質問です 🙋</div>

```js
console.log("Hello, World!");
```

<div class="prompt"><span class="ask">Q.</span> これ、皆さんのブラウザで実行したらどうなりますか？</div>

---

```js
console.log("Hello, World!");
```

<div class="result-bar">
  <div class="b"><span class="eng">Chrome</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Safari</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Firefox</span><span class="out">Hello, World!</span></div>
</div>

---

<div class="caption" style="text-align:center; margin-bottom:20px">じゃあ、これは？</div>

```js
const hello = "Hello";
const world = "World";
console.log(`${hello}, ${world}!`);
```

<div class="result-bar">
  <div class="b"><span class="eng">Chrome</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Safari</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Firefox</span><span class="out">Hello, World!</span></div>
</div>

---

<div class="caption" style="text-align:center; margin-bottom:20px">アロー関数でも</div>

```js
const log = () => console.log("Hello, World!");
log();
```

<div class="result-bar">
  <div class="b"><span class="eng">Chrome</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Safari</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Firefox</span><span class="out">Hello, World!</span></div>
</div>

---

<div class="quote">
<span class="navy">全部のブラウザで</span><br>
同じ結果になる。<br>
<span class="navy">— これは偶然？</span>
</div>

---

# エンジンはそれぞれ別物

<p class="lede">同じ ECMAScript を実装していても、中身は完全に独立したプロダクト。</p>

<table class="engines">
  <thead><tr><th>Browser</th><th>Engine</th><th>開発</th></tr></thead>
  <tbody>
    <tr><td class="engine">Chrome / Edge</td><td>V8</td><td class="muted">Google</td></tr>
    <tr><td class="engine">Safari</td><td>JavaScriptCore</td><td class="muted">Apple</td></tr>
    <tr><td class="engine">Firefox</td><td>SpiderMonkey</td><td class="muted">Mozilla</td></tr>
    <tr><td class="engine">Ladybird</td><td>LibJS</td><td class="muted">Ladybird project</td></tr>
  </tbody>
</table>

<p class="lede muted" style="margin-top:24px">別チーム・別コードベース。なのに同じ結果を返す。</p>

<!--
TC39が仕様を策定している一方で、その仕様を実際に実装しているのはブラウザベンダーです。GoogleのV8、MozillaのSpiderMonkey、AppleのJavaScriptCore。これらはそれぞれ独立したチームがC++で開発している全く別のプログラムです。言語仕様は同じECMAScriptですが、実装は完全に別物です。にもかかわらず、同じJavaScriptコードを実行すると同じ結果が返ってくる。なぜでしょうか。それは、すべてのエンジンが参照する「共通の物差し」があるからです。
-->

---

<div class="quote">
偶然じゃなくて、<br>
すべてのエンジンが参照する<br>
<span>共通の"物差し"</span>がある。
</div>

---

<div class="w-full text-center">
  <div class="pill">その物差しが</div>
  <h1 style="font-size:120px; letter-spacing:-.02em">Test262</h1>
  <p class="lede" style="margin-top:24px; text-align:center">TC39 が保守する ECMAScript 公式コンフォーマンステストスイート。</p>
</div>

<!--
その物差しがTest262です。TC39が保守しているECMAScript公式のコンフォーマンステストスイートで、tc39/test262のREADMEによると2025年5月時点で5万件以上のテストファイルがあります。
-->

---

<h1 style="margin-bottom:16px">規模感</h1>

<div class="big-stat">
  <div class="n">50,000<span class="plus">+</span></div>
  <div class="label">個別のテストファイル</div>
  <div class="sub">As of May 2025 · tc39/test262</div>
</div>

<p class="lede" style="margin-top:24px">
主要エンジンはすべてこのテストを CI に組み込み、<br>
日々の開発で<strong>仕様からの退行を検出</strong>している。
</p>

---

<div class="section-num">02</div>

# Test262 の中身を<br>見てみる

---

# Test262 が対象とする仕様

<p class="lede">ECMA-414 Standards Suite にまとめられた <strong>3つの仕様</strong>。</p>

<dl class="kv" style="margin-top:24px">
  <dt>ECMA-262</dt><dd>言語コア（構文・型・組み込みオブジェクト）</dd>
  <dt>ECMA-402</dt><dd>Intl オブジェクトなどの国際化 API</dd>
  <dt>ECMA-404</dt><dd>JSON のデータ交換フォーマット</dd>
</dl>

<hr class="rule" />

<p class="lede muted">
DOM や fetch などの Web API は Test262 の対象<strong>外</strong>。<br>
こちらは <strong>WPT（Web Platform Tests）</strong> がカバー。
</p>

<!--
Test262が何をテストしているのかという話ですが、対象はECMA-414 Standards Suiteで定義された仕様群です。ECMA-262の言語コア、ECMA-402の国際化API、ECMA-404のJSONフォーマットの3つを束ねた包括仕様です。一方で、HTMLのDOM APIやfetchなどのWeb APIはTest262の範囲外です。これらはWPTという別のテストスイートでカバーされています。
-->

---

<div class="caption" style="margin-bottom:12px">少しだけ、歴史の話</div>

# 競合していたベンダーが<br>テストを持ち寄って始まった

<p class="lede" style="margin-top:24px">2011年、ES5.1 リリースと同時に Test262 公開。</p>

---

# Test262 の源流

<div class="two-col wide">
  <div>
    <div class="col-label">Google</div>
    <p class="lede">V8 の仕様準拠検証用に開発していた<br><strong>Sputnik テストスイート</strong>（5,000件超）を提供。</p>
  </div>
  <div>
    <div class="col-label">Microsoft</div>
    <p class="lede">自社の <strong>ES5Conform テストスイート</strong>と、<br>追加テスト群を提供。</p>
  </div>
</div>

<hr class="rule" style="margin-top:24px" />

<p class="lede">
熾烈に競合していた2社が自社のテスト資産を持ち寄り、<strong>共通の評価基準</strong>を作った。<br>
<span class="muted">— Web 標準化の歴史における、競争から協調への転換点。</span>
</p>

<!--
2011年にES5.1のリリースと同時に公開されました。GoogleはV8エンジンの仕様準拠検証のために開発したSputnikテストスイート、5,000件超を提供しました。MicrosoftもES5Conformテストスイートと追加のテストを提供しました。競合企業同士がテストを持ち寄って共通の評価基準を作ったというのは、Web標準化の歴史における大きな転換点でした。
-->

---

# テストファイルの構造

<p class="lede">各テストは <strong>メタデータ</strong> と <strong>テスト本体</strong> の2パート構成。</p>

```js
/*---
esid: sec-array.prototype.includes
description: Array.prototype.includes should find the target value
features: [Array.prototype.includes]
---*/

var arr = [1, 2, 3];

assert.sameValue(arr.includes(2), true);
assert.sameValue(arr.includes(4), false);
```

<p class="caption" style="margin-top:12px">— 上部のコメントブロックがメタデータ。ファイル1つにつき、仕様挙動1つが原則。</p>

---

# メタデータの主要キー

<dl class="kv">
  <dt>esid</dt>
  <dd>仕様書のどのセクションを検証しているかの識別子。<br><span class="note">例: <code>sec-array.prototype.includes</code> — 仕様書のアルゴリズムと 1:1 対応。</span></dd>

  <dt>features</dt>
  <dd>テストの実行に必要な ECMAScript 機能の宣言。<br><span class="note">未実装機能に依存するテストを、エンジン側がスキップできる。</span></dd>

  <dt>flags</dt>
  <dd>実行モードの制御（<code>onlyStrict</code> / <code>noStrict</code> など）。<br><span class="note">指定なしなら Strict・非 Strict 両方で実行される。</span></dd>

  <dt>description</dt>
  <dd>人間向けの短い説明。</dd>
</dl>

<!--
esidは仕様書のどのセクションを検証しているかを示す識別子です。仕様書の特定のアルゴリズムとテストが1対1で対応しています。featuresはテストの実行に必要なECMAScript機能を宣言します。flagsはテストの実行モードを制御します。
-->

---

# アサーション

<p class="lede">Test262 は独自の小さなアサーションライブラリを提供。</p>

```js
// 値の厳密な等価性
assert.sameValue(actual, expected);

// 特定の例外型のスローを検証（種類まで厳密にチェック）
assert.throws(TypeError, () => {
  null.property;   // TypeError でなければ失敗
});
```

<div class="callout" style="margin-top:24px">
<strong>「エラーが投げられれば OK」ではない。</strong><br>
仕様が TypeError を要求する箇所で ReferenceError が出たら、それは<span class="blue">テスト失敗</span>。
</div>

<!--
Test262は独自のアサーションライブラリを提供しています。assert.sameValueは値の等価性を検証する基本的なアサーションです。assert.throwsは特定の種類の例外がスローされることを検証します。単にエラーが投げられればOKではなく、仕様がTypeErrorを要求している箇所でReferenceErrorが投げられた場合もテスト失敗です。
-->

---

# 新機能が仕様に入るには<br><span class="navy">テストが必要</span>

<p class="lede" style="margin-top:16px">
TC39 のステージプロセスでは、提案が <strong>Stage 4</strong>（仕様への最終組み込み）に進む条件として
「十分な Test262 テストが統合されていること」が規定されている。
</p>

<div class="flow" style="margin-top:28px">
  <div class="step"><div class="n">STAGE 0–1</div><h3>Strawperson / Proposal</h3><p>アイデア・初期仕様の議論。</p></div>
  <div class="arrow">→</div>
  <div class="step"><div class="n">STAGE 2–3</div><h3>Draft / Candidate</h3><p>仕様文書と実装が進む。</p></div>
  <div class="arrow">→</div>
  <div class="step" style="border-color:#3984FD; border-width:3px"><div class="n" style="color:#3984FD">STAGE 4</div><h3>Finished</h3><p><strong>Test262 テスト必須。</strong><br>仕様に正式組み込み。</p></div>
</div>

<p class="lede" style="margin-top:24px">
テストは <strong>提案者・実装者・コミュニティの誰でも</strong>書ける。
</p>

---

<div class="quote">
Test262 は<br>
<span class="navy">事後的なテストツールではなく、</span><br>
言語仕様の策定プロセス<br>
<span class="navy">そのもの</span>に組み込まれている。
</div>

---

<div class="section-num">03</div>

# 各エンジンは<br>どう動かしているか

---

# 各エンジンが Test262 を実行する方法

<p class="lede">すべての主要エンジンが CI に統合。ローカルでも実行できる。</p>

```bash
$ ./tools/run-tests.py --outdir=out/arm64.release \
    test262/language/expressions/call/eval-spread

>>> Running tests for arm64.release
>>> Running with test processors
[00:25|%   0|+   2|-   0]: Done
>>> 56610 base tests produced 2 (0%) non-filtered tests
>>> 2 tests ran
```

<p class="caption" style="margin-top:12px">— V8 の <code>tools/run-tests.py</code>。d8（軽量 JS シェル）上でテストを回す。</p>

<!--
V8はtools/run-tests.pyというスクリプトで、d8という軽量なコマンドラインシェル上でテストを走らせます。SpiderMonkeyはmach jstestsコマンドで仕様準拠を監視しています。JavaScriptCoreはWebKitのJSTestsインフラを使っています。
-->

---

# <code>test262.status</code> — 既知の失敗リスト

<p class="lede">実装が仕様に追いついていない箇所は、対応する Test262 テストが落ちる。</p>
<p class="lede" style="margin-top:8px">→ <strong>失敗が分かっているテスト</strong>は明示的に登録して CI を通す。</p>

```python
# https://bugs.chromium.org/p/v8/issues/detail?id=5690
'language/expressions/call/eval-spread': [FAIL],
```

<div class="callout" style="margin-top:24px">
<code>test262.status</code> は、<strong>エンジンの技術的負債の一覧表</strong>。<br>
将来修正されるべき仕様との乖離が、ここに記録されている。
</div>

<!--
エンジンの実装が仕様と合っていない場合、対応するTest262テストは当然失敗します。V8はtest262.statusというファイルで、失敗することが分かっているテストをリスト管理しています。ここに登録されたテストが失敗しても「想定通りの失敗」としてCIを通過させます。
-->

---

# test262.fyi — 日次で公開される準拠状況

<p class="lede">
各エンジンの Test262 準拠状況は <strong>https://test262.fyi</strong> で毎日公開。<br>
ナイトリービルドに対してテストを走らせ、機能サポートの差分を可視化。
</p>

<ul class="clean" style="margin-top:24px">
  <li>V8 / SpiderMonkey / JavaScriptCore の相互比較</li>
  <li>Ladybird の LibJS のような新興エンジンも掲載</li>
  <li>準拠度を<strong>プロジェクトの進捗指標</strong>として活用</li>
</ul>

<p class="lede" style="margin-top:24px">
可視化 → エンジン間の<strong>健全な競争</strong> → Web 全体の相互運用性の底上げ。
</p>

---

<div class="section-num">04</div>

# おまけ：<br>V8 で見つけたバグの話

---

# 直接 eval と 間接 eval

<p class="lede">eval は呼び出し方で挙動が変わる、という前提の話。</p>

<div class="two-col" style="margin-top:20px">
  <div>
    <div class="col-label">直接 eval — ローカルスコープが見える</div>

```js
function f() {
  const x = 10;
  eval("console.log(x)");
  // → 10
}
```

  </div>
  <div>
    <div class="col-label">間接 eval — グローバルスコープで実行</div>

```js
function g() {
  const x = 10;
  const e = eval;
  e("console.log(x)");
  // → ReferenceError
}
```

  </div>
</div>

<p class="lede muted" style="margin-top:16px">ECMAScript 仕様で明確に定義されている挙動。エンジンは正しく判定する義務がある。</p>

<!--
JavaScriptのevalには2種類あります。evalという名前で直接呼び出す「直接eval」は呼び出し元のスコープにアクセスできます。一方、一度変数に代入してから呼び出す「間接eval」はグローバルスコープで実行されます。この区別はECMAScript仕様で明確に定義されていて、エンジンは正しく判定する必要があります。
-->

---

# <code>eval(...args)</code> が壊れていた

<p class="lede">V8 では、<strong>末尾にスプレッド</strong>がある eval 呼び出しだけ、直接 eval として認識されていなかった。</p>

```js
const args = ["1 + 2"];
eval(...args);
// 仕様上は直接 eval のはず
// → V8 は間接 eval として実行していた
```

<p class="lede muted" style="margin-top:24px">つまり、スプレッド1個分だけ挙動が仕様からズレていた。</p>

---

# ソースコードには<br>FIXME が残っていた

<p class="caption" style="margin-bottom:12px">v8/src/interpreter/bytecode-generator.cc</p>

<div class="fixme">
<span class="tag">// FIXME(v8:5690):</span> Support final spreads for eval.
</div>

<p class="lede" style="margin-top:28px">
そして先ほどの <code>test262.status</code> には、同じバグ番号でテストが FAIL として登録されていた。
</p>

```python
# https://bugs.chromium.org/p/v8/issues/detail?id=5690
'language/expressions/call/eval-spread': [FAIL],
```

<p class="caption" style="margin-top:16px">— FIXME と test262.status の FAIL。技術的負債の<strong>両側からの記録</strong>。</p>

<!--
V8のbytecode-generator.ccというファイルをコードリーディングしていた時、あるバグを見つけました。eval(...args)のように末尾にスプレッドがある呼び出しだけ、直接evalとして認識されていなかったんです。ソースコードには「FIXME: Support final spreads for eval.」というコメントが残されていました。そしてtest262.statusには、このバグに対応するTest262テスト、language/expressions/call/eval-spreadがFAILとして登録されていました。
-->

---

# Test262 が果たした役割

<p class="lede">
この話で大事なのは、V8 の内部実装ではなく <strong>Test262 の役割</strong>です。
</p>

<ul class="clean" style="margin-top:20px">
  <li>仕様と実装のギャップを <strong>"テストの失敗"</strong> という形で可視化していた</li>
  <li><code>test262.status</code> に FAIL があったから、<strong>どの仕様に違反しているか</strong>が明確だった</li>
  <li>修正後も、Test262 テストの通過が <strong>仕様準拠の証明</strong>になった</li>
</ul>

<hr class="rule" />

<p class="lede">
<span class="blue"><strong>発見</strong></span>
<span class="muted"> → </span>
<span class="blue"><strong>修正</strong></span>
<span class="muted"> → </span>
<span class="blue"><strong>Test262 で証明</strong></span>
<br>
<span class="muted">このサイクルが「どのブラウザでも同じ結果になる」を支えている。</span>
</p>

---

<div class="section-num">05</div>

# まとめ

---

# JavaScript の"当たり前"を<br>支える仕組み

<ul class="clean" style="margin-top:12px">
  <li><strong>TC39</strong> の合議による仕様策定</li>
  <li><strong>5万件以上のテスト</strong>を日々保守するコミュニティ</li>
  <li>仕様準拠を目指す<strong>エンジン開発者たち</strong></li>
</ul>

<hr class="rule" style="margin:32px 0" />

<p class="lede">
<strong>Test262 は単なるテストツールではない。</strong><br>
競合するベンダーが同一の仕様を正しく実装するための、<br>
<span class="blue">合意形成の基盤</span>。
</p>

---

<div class="quote">
Test262 は、<br>
<span class="navy">誰にでも開かれている。</span>
</div>

<p class="lede" style="margin-top:32px">
テスト追加も、エンジンの FIXME 修正も、特別な権限はいりません。<br>
<span class="muted">Proposal にテストを書く。コードリーディングでギャップを見つける。それは Web の未来の"当たり前"を作る直接的な貢献です。</span>
</p>

---

<div class="w-full text-center">

# ご清聴ありがとうございました

<div class="flex justify-center">
<img src="/link.png" alt="リンク集" class="w-48 h-48" style="border-radius:12px; margin:16px auto" />
</div>

<div style="margin-top:8px">
スライド: <a href="https://github.com/riya-amemiya/amemiya_riya_slide_data">github.com/riya-amemiya/amemiya_riya_slide_data</a><br>
リンクまとめ: <a href="https://riya-amemiya-links.tokidux.com/">riya-amemiya-links.tokidux.com</a>
</div>

<div class="text-sm" style="margin-top:24px; color:#8a95ac; border-top:1px solid #e6e8ef; padding-top:16px; max-width:900px; margin-left:auto; margin-right:auto">
このスライドは <strong>CC BY-SA 4.0</strong> でライセンスされています。<br>
より自由な翻訳を可能にするため、翻訳は例外的に <strong>CC BY 4.0</strong> での配布が許可されています。<br>
Required Attribution: Riya Amemiya (https://github.com/riya-amemiya)
</div>

</div>

<!--
これで私の発表を終わります。本日のスライドはGitHubで公開していますので、ぜひご覧ください。Pull Requestもお待ちしております。ご清聴いただき、ありがとうございました。
-->
