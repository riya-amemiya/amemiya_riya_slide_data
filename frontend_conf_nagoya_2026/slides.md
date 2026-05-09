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
    <span style="font-size:.58em;">(Test262)</span>
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
    <p><strong>西 悠太</strong> <span>(Nishi Yuta)</span></p>
    <p>株式会社ダイニー / Platform Engineer</p>
    <p style="margin-top:24px;">TypeScriptが好きです。<br>V8も好きです。</p>
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
  <h1 style="color: #243762;">
    JavaScript が<br>
    <span class="navy" style="color: #3984FD;">「どのブラウザでも同じように動く」</span><br>
    その"当たり前"を、<br>
    誰が守っているのか？
  </h1>
  <p class="lede" style="margin-top:36px; color: #243762; text-align:center;">…を知って、へー！と思って帰ってもらう。</p>
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
<strong>特定の企業ではなく、複数の関係者による合議で決まる。</strong>
</div>

<!--
私たちが書いているJavaScriptの言語仕様はECMAScriptと呼ばれています。これを制定しているのはEcma Internationalという標準化団体です。その中にTC39、Technical Committee 39という委員会があって、ここがECMAScriptの仕様策定を担当しています。TC39にはGoogle、Apple、Mozilla、Microsoftといったブラウザベンダーだけでなく、BloombergやIgaliaといった企業、さらに招待された個人の専門家も参加しています。つまりECMAScriptは特定の企業が単独で決めているわけではなく、複数の利害関係者が合議で策定している仕様なんです。
-->

---

## 早速、質問です 🙋

```js
console.log("Hello, World!");
```

<div class="prompt"><span class="ask">Q.</span> これ、皆さんのブラウザで実行したらどうなりますか？</div>

<!--
ここで一度、皆さんに質問してみたいと思います。これ、皆さんのブラウザで実行したらどうなりますか。コードはおなじみの Hello, World! です。少しだけ考えてみてください。
-->

---

```js
console.log("Hello, World!");
```

<div class="result-bar">
  <div class="b"><span class="eng">Chrome</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Safari</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Firefox</span><span class="out">Hello, World!</span></div>
</div>

<!--
正解は、もちろん全部のブラウザで Hello, World! と表示されます。当たり前のように見えますが、ここから少しずつ難しくしていきます。
-->

---

## じゃあ、これは？

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

<!--
じゃあテンプレートリテラルだとどうでしょう。バッククォートで変数を埋め込む、ES2015 で入った構文です。これも 3 つのブラウザすべてで Hello, World! と表示されます。
-->

---

## アロー関数でも

```js
const log = () => console.log("Hello, World!");
log();
```

<div class="result-bar">
  <div class="b"><span class="eng">Chrome</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Safari</span><span class="out">Hello, World!</span></div>
  <div class="b"><span class="eng">Firefox</span><span class="out">Hello, World!</span></div>
</div>

<!--
アロー関数も同じです。これも ES2015 以降に入った構文ですが、Chrome でも Safari でも Firefox でも、まったく同じ Hello, World! が出力されます。
-->

---

<div class="quote">
<span class="navy">全部のブラウザで</span><br>
同じ結果になる。<br>
<span class="navy">— これは偶然？</span>
</div>

<!--
ここで一旦立ち止まって考えてみてください。3 つのブラウザはそれぞれ別の会社が、別のコードベースで開発しています。それなのに同じ結果が返ってくる。これは、果たして偶然なのでしょうか。
-->

---

# エンジンはそれぞれ別物

<p class="lede">同じ ECMAScript を実装していても、中身は完全に独立したプロダクト。</p>

<table class="engines">
  <thead><tr><th>Browser</th><th>Engine</th><th>開発</th></tr></thead>
  <tbody>
    <tr><td class="engine">Chrome / Edge</td><td>V8</td><td>Google</td></tr>
    <tr><td class="engine">Safari</td><td>JavaScriptCore</td><td>Apple</td></tr>
    <tr><td class="engine">Firefox</td><td>SpiderMonkey</td><td>Mozilla</td></tr>
  </tbody>
</table>

<p class="lede" style="margin-top:24px">別チーム・別コードベース。なのに同じ結果を返す。</p>

<!--
TC39が仕様を策定している一方で、その仕様を実際に実装しているのはブラウザベンダーです。GoogleのV8、MozillaのSpiderMonkey、AppleのJavaScriptCore。これらはそれぞれ独立したチームがC++で開発している全く別のプログラムです。言語仕様は同じECMAScriptですが、実装は完全に別物です。にもかかわらず、同じJavaScriptコードを実行すると同じ結果が返ってくる。なぜでしょうか。それは、すべてのエンジンが参照する「共通の物差し」があるからです。
-->

---

<div class="quote">
偶然じゃなくて、<br>
すべてのエンジンが参照する<br>
<span>共通の"物差し"</span>がある。
</div>

<!--
もちろん偶然ではありません。3 つのエンジンは独立して開発されているにもかかわらず、すべてのエンジンが参照する共通の物差しが存在します。これがあるからこそ、同じ JavaScript コードが同じように動くのです。
-->

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

<!--
規模感をお伝えすると、Test262 は 5 万件以上のテストファイルで構成されています。これは 2025 年 5 月時点の数字で、tc39/test262 のリポジトリで確認できます。主要エンジンはこのテストを CI に組み込んで、毎日仕様からの退行を検出しています。
-->

---

<div class="section-num">02</div>

# Test262 の中身を<br>見てみる

<!--
ここからは Test262 の中身を少し覗いてみます。
-->

---

# Test262 が対象とする仕様

<p class="lede">ECMA-414 Standards Suite にまとめられた <strong>3つの仕様</strong>。</p>

<dl class="kv" style="margin-top:24px">
  <dt>ECMA-262</dt><dd>言語コア（構文・型・組み込みオブジェクト）</dd>
  <dt>ECMA-402</dt><dd>Intl オブジェクトなどの国際化 API</dd>
  <dt>ECMA-404</dt><dd>JSON のデータ交換フォーマット</dd>
</dl>

<hr class="rule" />

<p class="lede">
DOM や fetch などの Web API は Test262 の対象<strong>外</strong>。<br>
こちらは <strong>WPT（Web Platform Tests）</strong> がカバー。
</p>

<!--
Test262が何をテストしているのかという話ですが、対象はECMA-414 Standards Suiteで定義された仕様群です。ECMA-262の言語コア、ECMA-402の国際化API、ECMA-404のJSONフォーマットの3つを束ねた包括仕様です。一方で、HTMLのDOM APIやfetchなどのWeb APIはTest262の範囲外です。これらはWPTという別のテストスイートでカバーされています。
-->

---

<div class="caption" style="margin-bottom:12px">少しだけ、歴史の話</div>

# 競合していたベンダーが<br>テストを持ち寄って始まった

<p class="lede" style="margin-top:24px">2010年夏に開発開始、ES5.1（2011年6月）と前後して整備。</p>

<!--
中身に入る前に、Test262 がどう生まれたのかを少しだけお話しします。実は、もともとは競合していたベンダーがテストを持ち寄って始まった、面白い経緯があるのです。
-->

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
<span>— Web 標準化の歴史における、競争から協調への転換点。</span>
</p>

<!--
Test262 は 2010 年夏に本格的な開発が始まり、ES5.1 が 2011 年 6 月にリリースされた前後で整備が進みました。GoogleはV8エンジンの仕様準拠検証のために開発したSputnikテストスイート、5,000件超を提供しました。MicrosoftもES5Conformテストスイートと追加のテストを提供しました。競合企業同士がテストを持ち寄って共通の評価基準を作ったというのは、Web標準化の歴史における大きな転換点でした。
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

<p class="caption" style="margin-top:12px">— 上部のコメントブロックがメタデータ。ファイル1つにつき、検証する仕様挙動は1つが原則。</p>

<!--
Test262 のテストファイルは、上半分のメタデータと下半分のテスト本体という、シンプルな 2 パート構成です。原則として、ファイル 1 つにつき検証する仕様挙動を 1 つに絞っているのが特徴です。
-->

---

# メタデータの主要キー

<dl class="kv">
  <dt>esid</dt>
  <dd>仕様書のどのセクションを検証しているかの識別子。<br><span>例: <code>sec-array.prototype.includes</code> — 仕様書のアルゴリズムと 1:1 対応。</span></dd>

  <dt>features</dt>
  <dd>テストの実行に必要な ECMAScript 機能の宣言。<br><span>未実装機能に依存するテストを、エンジン側がスキップできる。</span></dd>

  <dt>flags</dt>
  <dd>実行モードの制御（<code>onlyStrict</code> / <code>noStrict</code> など）。<br><span>指定なしなら Strict・非 Strict 両方で実行される。</span></dd>

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

# こんな粒度でテストされている

<p class="lede">同じ「配列内の検索」でも、内部で使う等価判定アルゴリズムが違う。</p>

```js
// SameValueZero — Array.prototype.includes
[NaN].includes(NaN)   // → true

// Strict Equality (===) — Array.prototype.indexOf
[NaN].indexOf(NaN)    // → -1
```

<p class="lede" style="margin-top:16px">
仕様アルゴリズム単位でテストファイルが分かれている。<br>
<code>built-ins/Array/prototype/includes/samevaluezero.js</code> と<br>
<code>built-ins/Array/prototype/indexOf/15.4.4.14-5-13.js</code> は<strong>別物</strong>。
</p>

<p class="caption" style="margin-top:12px">— エンジンが片方を実装ミスしたら、ピンポイントでそのテストだけが落ちる。</p>

<!--
配列内の検索を例にすると、Array.prototype.includes は SameValueZero というアルゴリズムを使うので NaN を見つけられます。一方で Array.prototype.indexOf は Strict Equality を使うので NaN を見つけられません。Test262 はこの仕様アルゴリズム単位でテストファイルを分けているので、もしエンジンがどちらかの実装をミスしたら、ピンポイントでそのテストだけが落ちます。仕様の粒度がそのままテストの粒度になっているのです。
-->

---

# 月またぎや繰り上がりまで<br>仕様で決まっている

<p class="lede">エンジンが"勝手に"挙動を決められない代表例が <code>Date</code>。</p>

```js
// 2 月 30 日 → 仕様は "3 月 2 日に繰り上げる" と決めている
new Date(2025, 1, 30).toDateString()
// → "Sun Mar 02 2025"

// 不正な月 → Invalid Date
new Date("2025-13-01").getTime()  // → NaN

// NaN を渡せば NaN が返る、ということまで仕様が指定
new Date(NaN).getTime()           // → NaN
```

<!--
Date は仕様で MakeDay、MakeDate、TimeClip という抽象アルゴリズムが厳密に定義されています。たとえば 2 月 30 日のような存在しない日付を渡したとき、エンジンは勝手にエラーにしたり 0 を返したりはできません。仕様が「3 月 2 日として処理する」と決めているので、Test262 はその通りに処理しているかを 1 ステップずつ検証します。Date がどのブラウザでも同じ繰り上がりをするのは、こういうテストの積み重ねがあるからです。
-->

---

# Temporal は<br><span class="navy">使える暦まで</span>仕様で決めている

<p class="lede">ECMA-402 の Era and MonthCode Proposal が、<strong>14 種類の暦</strong>を列挙している。</p>

<div class="callout" style="margin-top:24px">
gregory ・ japanese ・ hebrew ・ chinese ・ dangi ・ persian<br>
islamic-civil ・ islamic-tbla ・ islamic-umalqura<br>
buddhist ・ coptic ・ ethioaa ・ ethiopic ・ indian ・ roc<br>
<strong>+ iso8601</strong>（ECMA-262 で必須）
</div>

<p class="lede" style="margin-top:24px">
それぞれの暦の <strong>era ・ 閏月 ・ 閏年規則</strong>までが仕様で決まっていて、<br>
Test262 はそのすべてに対して個別のテストを持っている。
</p>

<p class="caption" style="margin-top:12px">— ECMA-402 Era and MonthCode Proposal · Stage 4 Draft (March 19, 2026)</p>

<!--
Temporal がいよいよ仕様に入りました。Temporal は日付を扱う新しい組み込みオブジェクトですが、特徴的なのは使える暦まで ECMA-402 で 14 種類が列挙されている点です。グレゴリオ暦や ISO 8601 だけでなく、和暦、ヘブライ暦、イスラム暦、中国暦まで含まれています。それぞれの暦の era、閏月、閏年規則までが仕様で決まっていて、Test262 はそのすべてに対して個別のテストを持っています。
-->

---

# Hebrew の閏月まで <span class="navy">Test262 が見ている</span>

```js
// test/intl402/Temporal/PlainDate/prototype/monthCode/
//   leap-months-hebrew.js
const commonMonths = ["M01","M02","M03","M04","M05",       "M06","M07","M08","M09","M10","M11","M12"];
const leapMonths   = ["M01","M02","M03","M04","M05","M05L","M06","M07","M08","M09","M10","M11","M12"];

for (var year = 5730; year < 5735; year++) {
  const at = (m) => Temporal.PlainDate.from(
    { year, month: m, calendar: "hebrew", day: 1 });
  const monthsInYear = at(1).monthsInYear;
  for (var month = 1; month < monthsInYear; month++) {
    const expected = at(month).inLeapYear ? leapMonths : commonMonths;
    assert.sameValue(at(month).monthCode, expected[month - 1]);
  }
}
```

<p class="caption" style="margin-top:12px">— Hebrew 暦の閏年は <code>M05L</code> (Adar I) が 5 月と 6 月の間に挿入される。年ごとに 5 年分、月コードの並びを丸ごと検証している。</p>

<!--
これは Test262 にある Temporal のテストの一例です。ヘブライ暦は閏年に 13 ヶ月になり、5 ヶ月目と 6 ヶ月目の間に M05L、つまり Adar I という閏月が挿入されます。Test262 はそれを年ごとに 5 年分、月コードが正しい順で並んでいるかまで検証しています。仕様で決まっている挙動は、エンジンが勝手に変えられないということです。
-->

---

# 新機能が仕様に入るには<br><span class="navy">テストが必要</span>

<p class="lede" style="margin-top:16px">
TC39 のステージプロセスでは、<strong>Stage 2.7</strong> でテスト執筆が本格化し、
<strong>Stage 4</strong> への進行条件に「<strong>2つの互換な実装</strong>が Test262 acceptance tests を通過していること」が含まれる。
</p>

<div class="flow" style="margin-top:28px">
  <div class="step"><div class="n">STAGE 0–2</div><h3>Proposal / Draft</h3><p>問題定義から解法の下書きへ。</p></div>
  <div class="arrow">→</div>
  <div class="step" style="border-color:#3984FD; border-width:3px"><div class="n" style="color:#3984FD">STAGE 2.7</div><h3>Validation</h3><p><strong>Test262 テストを執筆・マージ。</strong>設計を実装で検証する段階。</p></div>
  <div class="arrow">→</div>
  <div class="step"><div class="n">STAGE 3</div><h3>Candidate</h3><p>実装経験を積み Web 互換性を検証。</p></div>
  <div class="arrow">→</div>
  <div class="step"><div class="n">STAGE 4</div><h3>Finished</h3><p>2つの実装が Test262 を通過し、仕様へ組み込まれる。</p></div>
</div>

<p class="lede" style="margin-top:24px">
テストは <strong>提案者・実装者・コミュニティの誰でも</strong>書ける。
</p>

<!--
TC39のステージプロセスは、提案が Stage 0 から Stage 4 まで段階的に進んでいく仕組みです。Test262 と特に深く関わるのが 2024 年に追加された Stage 2.7 と、最終形である Stage 4 です。Stage 2.7 では仕様テキストが完成していて、設計を検証するために Test262 テストを PR で提出・マージします。そして Stage 4 に進むには「2つの互換な実装がその Test262 テストを通過している」ことが求められます。つまり Test262 はゴール地点の試験ではなく、Stage 2.7 から実装者へのフィードバックを引き出すための基盤として機能しています。
-->

---

# Stage 2.7 — <span class="navy">テストで設計を検証する</span>

<p class="lede">
Stage 2.7 は <strong>2024 年に TC39 プロセスに正式導入</strong>された比較的新しいステージ。<br>
「設計は原則承認された。あとはテスト・実装・利用からのフィードバックで詰めるのみ」という宣言。
</p>

<dl class="kv" style="margin-top:28px">
  <dt>入る条件</dt>
  <dd>完全な仕様テキスト／指定レビュアーと editor group の sign-off が揃った状態。</dd>

  <dt>ここでやること</dt>
  <dd><strong>包括的な Test262 テストの作成</strong>と、実装可能性を検証する仕様準拠プロトタイプの開発。</dd>

  <dt>Stage 3 との違い</dt>
  <dd>Stage 3 は実装経験を積む段階。2.7 はその<strong>前提</strong>として、実装者が頼りにできるテストを用意する段階。</dd>
</dl>

<p class="lede" style="margin-top:24px">
<span class="blue">テストを書く</span> → <span class="blue">実装者がそれを頼りに実装する</span> → <span class="blue">2つの実装が通れば Stage 4</span>
</p>

<!--
Stage 2.7 は比較的新しく、2024 年に TC39 プロセスに正式導入されました。それまでは Stage 3 に進んでから実装と並行してテストを書くことが多かったのですが、テストの不備が実装者へのフィードバックを遅らせる問題がありました。そこで、仕様テキストが完成した段階で一度立ち止まってテストをマージする Stage 2.7 が設けられました。ここで書かれた Test262 テストが、Stage 3 で実装者が仕様準拠を確かめるための土台になり、最終的に Stage 4 で「2つの互換な実装が Test262 に通っている」ことを示す根拠になります。
-->

---

<div class="quote">
Test262 は<br>
<span class="navy">事後的なテストツールではなく、</span><br>
言語仕様の策定プロセス<br>
<span class="navy">そのもの</span>に組み込まれている。
</div>

<!--
ここまでお話ししたように、Test262 は実装ができてからチェックするためのものではなく、仕様策定のプロセスそのものに組み込まれています。仕様の正確さを担保する基盤として機能しています。
-->

---

<div class="section-num">03</div>

# 各エンジンは<br>どう動かしているか

<!--
ここからは、実際に各エンジンがどうやって Test262 を回しているのかを見ていきます。
-->

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
各エンジンの Test262 準拠状況は <strong>https://test262.fyi</strong> で毎日公開されている。<br>
ナイトリービルドに対してテストを走らせ、機能サポートの差分を可視化するサイト。
</p>

<ul class="clean" style="margin-top:24px">
  <li>V8 / SpiderMonkey / JavaScriptCore の相互比較</li>
  <li>Ladybird の LibJS のような新興エンジンも掲載</li>
  <li>準拠度を<strong>プロジェクトの進捗指標</strong>として活用</li>
</ul>

<p class="lede" style="margin-top:24px">
可視化 → エンジン間の<strong>健全な競争</strong> → Web 全体の相互運用性の底上げ。
</p>

<!--
各エンジンの準拠状況は test262.fyi というサイトで毎日公開されています。V8、SpiderMonkey、JavaScriptCore の相互比較に加えて、Ladybird に搭載されている LibJS のような新しいエンジンの数値も載っています。可視化があるからこそ、健全な競争が生まれ、Web 全体の相互運用性が底上げされていきます。
-->

---

<div class="section-num">04</div>

# おまけ：<br>V8 で見つけたバグの話

<!--
ここからは少し違う話で、私自身が V8 のコードリーディング中に偶然見つけたバグの話をします。
-->

---

# 直接 eval と 間接 eval

<p class="lede">eval は呼び出し方で挙動が変わる、という前提の話。</p>

直接 eval — ローカルスコープが見える

```js
function f() {
  const x = 10;
  eval("console.log(x)");
  // → 10
}
```

間接 eval — グローバルスコープで実行

```js
function g() {
  const x = 10;
  const e = eval;
  e("console.log(x)");
  // → ReferenceError
}
```

<p class="lede" style="margin-top:16px">ECMAScript 仕様で明確に定義されている挙動。エンジンは正しく判定する義務がある。</p>

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

<!--
具体的には、末尾にスプレッドがある eval 呼び出しだけが直接 eval として認識されていませんでした。仕様上は直接 eval として実行されるはずなのに、V8 では間接 eval として扱われていたのです。
-->

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

# 直したパッチの中身

<p class="lede">
末尾スプレッドの <code>eval(...iter)</code> も <code>%reflect_apply</code> ルートに通し、<br>
第 1 引数を取り出して直接 eval として解決できるようにする。
</p>

```diff
- // FIXME(v8:5690): Support final spreads for eval.
- if (spread_position == Call::kHasNonFinalSpread) {
+ // For direct eval calls with a final spread like eval(...iter), we
+ // also use %reflect_apply so we can extract the first argument
+ // for ResolvePossiblyDirectEval.
+ const bool eval_with_final_spread =
+     spread_position == Call::kHasFinalSpread &&
+     expr->is_possibly_eval() && expr->arguments()->length() > 0;
+ const bool use_reflect_apply =
+     spread_position == Call::kHasNonFinalSpread || eval_with_final_spread;
+ if (use_reflect_apply) {
```

<p class="caption" style="margin-top:12px">— v8/src/interpreter/bytecode-generator.cc</p>

<!--
ではどう直したか。それまではeval呼び出しの末尾にスプレッドがあるとき CallWithSpread バイトコードで処理していたのを、%reflect_apply 経由に切り替えました。これによって第 1 引数を取り出せるようになり、ResolvePossiblyDirectEval で直接 eval かどうかを正しく判定できるようになります。仕様の挙動を満たすために、コード生成の経路そのものを変える必要があったわけです。
-->

---

# Test262 が果たした役割

<p class="lede">
ここで見ていただきたいのは、V8 の内部実装の詳細ではなく、<strong>その裏で Test262 が何をしていたか</strong>の方です。
</p>

<ul class="clean" style="margin-top:20px">
  <li>仕様と実装のギャップが、<strong>「テストの失敗」</strong>という形で可視化されている</li>
  <li><code>test262.status</code> に FAIL が並んでいるから、<strong>どの仕様に違反しているか</strong>が一目でわかる</li>
  <li>修正したあとは、Test262 テストが通ること自体が <strong>仕様準拠の証明</strong>になる</li>
</ul>

<hr class="rule" />

<p class="lede">
<span class="blue"><strong>発見</strong></span>
<span> → </span>
<span class="blue"><strong>修正</strong></span>
<span> → </span>
<span class="blue"><strong>Test262 で証明</strong></span>
<br>
<span>このサイクルが、JavaScript の「どのブラウザでも同じ結果になる」を支えている。</span>
</p>

<!--
ここで見ていただきたいのは、V8 の内部実装の詳細ではなく、その裏で Test262 が何をしていたかの方です。仕様と実装のギャップが「テストの失敗」として可視化されていて、test262.status に FAIL が並んでいるから、どの仕様に違反しているかが一目でわかります。修正したあとは、Test262 テストが通ること自体が仕様準拠の証明になります。発見・修正・Test262 で証明、というこのサイクルが、JavaScript の「どのブラウザでも同じ結果になる」を支えているのです。
-->

---
layout: image
image: /post.png
backgroundSize: contain
---

<!-- post 画像をスライド枠に contain 表示 -->

---

<div class="section-num">05</div>

# まとめ

<!--
最後に、今日の内容をまとめます。
-->

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
<span class="blue">合意形成の基盤</span>
</p>

<!--
JavaScript がどのブラウザでも同じように動くという当たり前は、TC39 の合議による仕様策定、5 万件以上のテストを保守するコミュニティ、そして仕様準拠を目指すエンジン開発者たちによって支えられています。Test262 は単なるテストツールではなく、競合するベンダー同士が同じ仕様を正しく実装するための合意形成の基盤なのです。
-->

---

<div class="quote">
Test262 は、<br>
<span class="navy">誰にでも開かれている。</span>
</div>

<p class="lede" style="margin-top:32px">
テスト追加も、エンジンの FIXME 修正も、特別な権限はいりません。<br>
<span>Proposal にテストを書く。コードリーディングでギャップを見つける。<br>それは Web の未来の"当たり前"を作る直接的な貢献です。</span>
</p>

<!--
そして Test262 は誰にでも開かれています。テストの追加もエンジンの FIXME 修正も、特別な権限は必要ありません。Proposal にテストを書く、コードリーディングでギャップを見つける。そういう小さな貢献の積み重ねが、Web の未来の当たり前を作っていきます。
-->

---

<div class="w-full text-center">

# ご清聴ありがとうございました

<div class="flex justify-center">
<img src="/link.png" alt="リンク集" class="w-48 h-48" style="border-radius:12px; margin:16px auto" />
</div>

<div style="margin-top:8px">
スライド: <a href="https://github.com/riya-amemiya/amemiya_riya_slide_data/tree/main/frontend_conf_nagoya_2026">github.com/riya-amemiya/amemiya_riya_slide_data</a><br>
SNS等: <a href="https://riya-amemiya-links.tokidux.com/">riya-amemiya-links.tokidux.com</a>
</div>

<div class="text-sm" style="margin-top:24px; border-top:1px solid #e6e8ef; padding-top:16px; max-width:900px; margin-left:auto; margin-right:auto">
このスライドは <strong>CC BY-SA 4.0</strong> でライセンスされています。<br>
より自由な翻訳を可能にするため、翻訳は例外的に <strong>CC BY 4.0</strong> での配布が許可されています。<br>
Required Attribution: Riya Amemiya (https://github.com/riya-amemiya)
</div>

</div>

<!--
これで私の発表を終わります。本日のスライドはGitHubで公開していますので、ぜひご覧ください。Pull Requestもお待ちしております。ご清聴いただき、ありがとうございました。
-->
