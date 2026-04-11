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

# 知ってた？<br/>JavaScriptの"正しさ"を検証するテストが<br/>5万以上もあること(Test262)

<!--
皆さん、こんにちは！「知ってた？JavaScriptの"正しさ"を検証するテストが5万以上もあること」というタイトルで発表させていただきます。

皆さんが毎日書いているJavaScript、その裏側で一体何が起きているのか、考えたことはありますか？
今日は、JavaScriptがどのブラウザでも同じように動く、その「当たり前」を誰が守っているのかをお話しします。
-->

---

<div class="grid grid-cols-2 gap-4 items-center">
<div>

## 自己紹介

- 名前：西 悠太
- 所属：株式会社ダイニー
- TypeScriptが好きです
- V8も好きです

</div>
<div>

<img src="/icon.png" alt="プロフィール画像" class="rounded-full w-48 h-48" />

</div>
</div>

<!--
改めまして、西 悠太と申します。株式会社ダイニーでPlatform Engineerとして働いています。TypeScriptが大好きで、日々どうすればもっと良いコードが書けるか考えています。本日はどうぞよろしくお願いします。
-->

---

## 今日のゴール

JavaScriptがどのブラウザでも同じ結果になる「当たり前」を誰が守っているのか

を知って帰ってもらう

<!--
今日のゴールはシンプルです。普段私たちが書いているJavaScriptが、ChromeでもSafariでもFirefoxでも同じように動く。これって当たり前に思えますが、実は当たり前じゃないんです。その裏側にある仕組みを知って帰っていただければ大成功です。
-->

---

## JavaScript の仕様は誰が決めているのか

私たちが普段書いている JavaScript の言語仕様は、ECMAScript と呼ばれています。この仕様を制定しているのは Ecma International という標準化団体です。

Ecma International の中に TC39（Technical Committee 39）という委員会があり、ここが ECMAScript の仕様策定を担当しています。TC39 のメンバーには Google、Apple、Mozilla、Microsoft などのブラウザベンダーだけでなく、Bloomberg や Igalia といった企業、さらに招待された個人の専門家も参加しています。

つまり ECMAScript は特定の企業が単独で決めているわけではなく、複数の利害関係者が合議で策定している仕様です。この「合議」という仕組みが、後ほどお話しする Test262 の存在意義に直結しています。

<!--
まず、JavaScriptの仕様を誰が決めているのかという話からします。私たちが書いているJavaScriptの言語仕様はECMAScriptと呼ばれています。これを制定しているのはEcma Internationalという標準化団体です。その中にTC39、Technical Committee 39という委員会があって、ここがECMAScriptの仕様策定を担当しています。TC39にはGoogle、Apple、Mozilla、Microsoftといったブラウザベンダーだけでなく、BloombergやIgaliaといった企業、さらに招待された個人の専門家も参加しています。つまりECMAScriptは特定の企業が単独で決めているわけではなく、複数の利害関係者が合議で策定している仕様なんです。この「合議」という仕組みが、後ほどお話しするTest262の存在意義に直結しています。
-->

---

## 別々のエンジンが同じ結果を返すのはなぜか

私たちが書いた JavaScript は、ブラウザごとに別のエンジンが実行しています。

| Browser | Engine |
|---------|--------|
| Chrome  | V8     |
| Safari  | JavaScriptCore |
| Firefox | SpiderMonkey |

言語仕様は同じ ECMAScript ですが、実装は完全に別物です。

にもかかわらず、同じ JavaScript コードが同じ結果を返す。

これは偶然ではなく、すべてのエンジンが参照する「共通の物差し」があるからです。

<!--
TC39が仕様を策定している一方で、その仕様を実際に実装しているのはブラウザベンダーです。GoogleのV8、MozillaのSpiderMonkey、AppleのJavaScriptCore。これらはそれぞれ独立したチームがC++で開発している全く別のプログラムです。言語仕様は同じECMAScriptですが、実装は完全に別物です。にもかかわらず、同じJavaScriptコードを実行すると同じ結果が返ってくる。なぜでしょうか。それは、すべてのエンジンが参照する「共通の物差し」があるからです。
-->

---

## その物差しが Test262

TC39 が保守する ECMAScript 公式コンフォーマンステストスイートです。

2025 年 5 月時点で 50,000 以上の独立したテストファイルで構成されています。

すべての主要エンジンがこのテストを CI に組み込み、日々の開発で仕様からの退行を検出しています。

特定のベンダーに依存しない、中立的な評価基準として機能しています。

<!--
その物差しがTest262です。TC39が保守しているECMAScript公式のコンフォーマンステストスイートで、tc39/test262のREADMEによると2025年5月時点で5万件以上のテストファイルがあります。先ほどTC39は合議で仕様を策定しているとお話ししましたが、合議で決めた仕様が本当に正しく実装されているかを検証する仕組みも必要です。それがTest262なんです。特定のベンダーに依存しない中立的な評価基準として機能していて、すべての主要エンジンがこのテストをCIに組み込んでいます。
-->

---
layout: section
---

# Test262 の中身を見てみる

<!--
ではTest262の中身を詳しく見ていきましょう。どんな仕様をカバーしていて、テストファイルはどういう構造で、どうやってエンジンに統合されているのかをお話しします。
-->

---

## Test262 が対象とする仕様

Test262 は ECMA-414 Standards Suite で定義された仕様群を対象としています。

ECMA-414 は以下の 3 つの仕様を束ねる包括仕様です。

- ECMA-262: 言語コアのセマンティクス（構文、型、組み込みオブジェクト）
- ECMA-402: Intl オブジェクトなどの国際化 API
- ECMA-404: JSON のデータ交換フォーマット

HTML Standard が定義する DOM や fetch などの Web API は Test262 の対象外で、WPT（Web Platform Tests）でカバーされています。

<!--
Test262が何をテストしているのかという話ですが、対象はECMA-414 Standards Suiteで定義された仕様群です。ISO/IEC 22275としてもISO化されています。ECMA-262の言語コア、ECMA-402の国際化API、ECMA-404のJSONフォーマットの3つを束ねた包括仕様です。一方で、HTMLのDOM APIやfetchなどのWeb APIはTest262の範囲外です。これらはWPTという別のテストスイートでカバーされています。
-->

---

## 競合するベンダーが協力して始まった

Test262 は 2011 年、ES5.1 のリリースと同時に公開されました。

Google は V8 の仕様準拠検証のために開発した Sputnik テストスイート（5,000 件超）を提供しました。

Microsoft も ES5Conform テストスイートおよび追加テストを提供しました。

激しく競合していた 2 社がテストを持ち寄り、共通の評価基準を作った。

Web 標準化の歴史における重要な転換点でした。

<!--
Test262の成り立ちについてお話しします。2011年にES5.1のリリースと同時に公開されました。その基盤を構成したのは、当時激しく競合していた2社からのテスト提供です。Googleは自社のV8エンジンの仕様準拠検証のために開発したSputnikテストスイート、5,000件超を提供しました。MicrosoftもES5Conformテストスイートと追加のテストを提供しました。競合企業同士がテストを持ち寄って共通の評価基準を作ったというのは、Web標準化の歴史における大きな転換点でした。
-->

---

## テストファイルの構造

各テストはフロントマターと本文の 2 つのセクションから構成されます。

フロントマターは YAML 形式のメタデータで、本文は実際のテストロジックを記述する JavaScript です。

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

<!--
テストファイルの構造を見てみましょう。各テストはフロントマターと本文の2つのセクションから構成されます。上部のYAMLフロントマターにメタデータが記述されていて、その下にJavaScriptのテストロジックが続きます。この例ではArray.prototype.includesのテストで、配列に含まれる値と含まれない値をそれぞれ検証しています。
-->

---

## フロントマターのメタデータ

フロントマターには以下のようなキーが使われます。

`esid` は仕様書のどのセクションを検証しているかを示す識別子です。

例えば `sec-array.prototype.includes` のように、仕様書の特定のアルゴリズムとテストが対応しています。

`features` はテストの実行に必要な ECMAScript 機能を宣言します。エンジン側はこの情報を参照して、未実装の機能に依存するテストをスキップできます。

`flags` はテストの実行モードを制御します。`onlyStrict` は Strict モードでのみ実行、`noStrict` は非 Strict モードでのみ実行することを意味します。指定がなければ両方のモードで実行されます。

<!--
フロントマターのメタデータについてもう少し詳しくお話しします。esidは仕様書のどのセクションを検証しているかを示す識別子です。仕様書の特定のアルゴリズムとテストが1対1で対応しています。featuresはテストの実行に必要なECMAScript機能を宣言します。エンジン側はこの情報を参照して、まだ実装していない機能に依存するテストをスキップする判断ができます。flagsはテストの実行モードを制御します。onlyStrictだとStrictモードでのみ、noStrictだと非Strictモードでのみ実行します。指定がなければ両方のモードで実行されます。
-->

---

## アサーションの種類

Test262 は独自のアサーションライブラリを提供しています。

`assert.sameValue(actual, expected)` は値の厳密な等価性を検証します。

`assert.throws(TypeError, fn)` は特定の種類の例外がスローされることを検証します。単にエラーが投げられるだけでは不十分で、仕様が TypeError を要求する箇所で ReferenceError が投げられた場合もテスト失敗になります。

```js
// null のプロパティアクセスは TypeError を投げなければならない
assert.throws(TypeError, () => {
  null.property;
});
```

エンジンが不正な操作をエラーなく通過させるバグを防ぐために、例外の種類まで厳密に検証しています。

<!--
Test262は独自のアサーションライブラリを提供しています。assert.sameValueは値の等価性を検証する基本的なアサーションです。assert.throwsは特定の種類の例外がスローされることを検証します。ここが重要なんですが、単にエラーが投げられればOKではありません。仕様がTypeErrorを要求している箇所でReferenceErrorが投げられた場合もテスト失敗です。エラーを投げずに無視して通過してしまうケースも当然テスト失敗です。こういう細かいズレがブラウザ間の非互換に繋がるので、例外の種類まで厳密に検証しています。
-->

---

## 新機能が仕様に入るにはテストが必要

TC39 のステージプロセスでは、新しい言語機能が Stage 4（仕様への最終組み込み）に進む条件として「十分な Test262 テストが統合されていること」が規定されています。（tc39/test262 README より）

テストは提案のチャンピオン（提案者）、エンジン実装者、コミュニティメンバーの誰でも書くことができます。

つまり Test262 は事後的なテストツールではなく、言語仕様の策定プロセスそのものに組み込まれています。テストが書かれていない機能は仕様に入りません。だから新しい構文がブラウザに実装された初日から相互運用性が担保されます。

<!--
Test262の特に重要な側面がTC39のステージプロセスとの関係です。ECMAScriptの新機能はStage 0からStage 4まで段階的に標準化されますが、Stage 4に進むための必須条件の一つが「十分なTest262テストが統合されていること」なんです。テストは提案者やエンジン実装者だけでなく、コミュニティメンバーの誰でも書けます。つまりTest262は事後的なテストツールではなく、言語仕様の策定プロセスそのものに組み込まれているんです。テストなしには新機能が仕様に入らない。だから新しい構文がブラウザに実装された初日から相互運用性が担保されるわけです。
-->

---

## 各エンジンが Test262 を実行する方法

すべての主要エンジンは Test262 を CI パイプラインに統合しています。

ローカルでも実行できるようになっており

例えば、V8 は `tools/run-tests.py` スクリプトで実行します。

```
./tools/run-tests.py --outdir=out/arm64.release test262
```

実行するとこんな感じ

```
❯ ./tools/run-tests.py --outdir=out/arm64.release test262/language/expressions/call/eval-spread
>>> Statusfile variables:
DEBUG_defined=False, all_arm64_features=False, arch=arm64, asan=False, atomic_object_field_writes=True, byteorder=little, cet_shadow_stack=False, cfi=False, clang=True, clang_coverage=False, code_comments=False, component_build=False, concurrent_marking=True, current_cpu=arm64, dcheck_always_on=False, debug_code=False, debugging_features=False, deopt_fuzzer=False, device_type=None, dict_property_const_tracking=False, direct_handle=False, disassembler=True, dumpling=False, endurance_fuzzer=False, full_debug=False, gc_fuzzer=False, gc_stress=False, gdbjit=False, has_jitless=False, has_maglev=True, has_turbofan=True, has_wasm_interpreter=False, has_webassembly=True, i18n=True, interrupt_fuzzer=False, is_android=False, is_ios=False, isolates=False, js_shared_memory=True, lite_mode=False, local_off_stack_check=False, lower_limits_mode=False, memory_corruption_api=False, mips_arch_variant=, mips_use_msa=False, mode=release, msan=False, no_harness=False, no_simd_hardware=False, novfp3=False, official_build=False, optimize_for_size=False, pointer_compression=True, pointer_compression_shared_cage=True, runtime_call_stats=True, sandbox=True, sandbox_hardware_support=False, simd_mips=False, simulator_run=False, single_generation=False, slow_dchecks=False, system=macos, target_cpu=arm64, temporal=True, tsan=False, ubsan=False, use_sanitizer=False, v8_cfi=False, v8_current_cpu=arm64, v8_target_cpu=arm64, verification_features=False, verify_csa=False, verify_heap=True, verify_predictable=False, wasm_random_fuzzers=True
>>> Running tests for arm64.release
>>> Running with test processors
[00:25|%   0|+   2|-   0]: Done
>>> 56610 base tests produced 2 (0%) non-filtered tests
>>> 2 tests ran
```

<!--
各エンジンがどうやってTest262を実行しているのかについてお話しします。V8はtools/run-tests.pyというスクリプトで、d8という軽量なコマンドラインシェル上でテストを走らせます。SpiderMonkeyはmach jstestsコマンドで仕様準拠を監視しています。JIT最適化のテストはmach jit-testという別系統で実行するので、仕様準拠のテストと内部最適化のテストは分かれています。JavaScriptCoreはWebKitのJSTestsインフラを使っています。どのエンジンも、フロントマターに書かれたflagsやfeaturesを解釈して、適切なモードでテストを繰り返し実行しています。
-->

---

## test262.status — エンジンが管理する「既知の失敗」

エンジンの実装が仕様と乖離している場合、対応する Test262 テストは当然失敗します。

しかし CI でテストが失敗するとビルドが壊れてしまいます。

V8 は `test262.status` というファイルで、失敗することが分かっているテストをリスト管理しています。

```python
# https://bugs.chromium.org/p/v8/issues/detail?id=5690
'language/expressions/call/eval-spread': [FAIL],
```

ここに登録されたテストが失敗しても「想定通りの失敗」として CI を通過させます。

つまり test262.status は、エンジンの技術的負債の一覧表です。

将来修正されるべき仕様との乖離が、ここに記録されています。

<!--
エンジンの実装が仕様と合っていない場合、対応するTest262テストは当然失敗します。でもCIでテストが失敗するとビルドが壊れてしまう。そこでV8はtest262.statusというファイルで、失敗することが分かっているテストをリスト管理しています。ここに登録されたテストが失敗しても「想定通りの失敗」としてCIを通過させます。SpiderMonkeyやJavaScriptCoreにも同様の仕組みがあります。つまりtest262.statusは、エンジンの技術的負債の一覧表なんです。将来修正されるべき仕様との乖離がここに記録されています。
-->

---

## test262.fyi — 日次で公開される準拠状況

各エンジンの Test262 準拠状況は https://test262.fyi で日次公開されています。

ナイトリービルドに対して毎日 Test262 を実行し、エンジン間の機能サポートの差異を可視化しています。

Ladybird の LibJS のような新しいエンジンも test262.fyi に掲載されており、仕様への準拠度をプロジェクトの進捗指標として活用しています。

Test262 の準拠状況が可視化されることで、エンジン間の健全な開発競争が促され、Web 全体の相互運用性が底上げされています。

<!--
各エンジンのTest262準拠状況はtest262.fyiというサイトで日次公開されています。ナイトリービルドに対して毎日Test262を実行し、エンジン間の機能サポートの差異を可視化しています。V8、SpiderMonkey、JavaScriptCoreだけでなく、LadybirdのLibJSのような新しいエンジンも掲載されていて、仕様への準拠度をプロジェクトの進捗指標として活用しています。こうして準拠状況が可視化されることで、エンジン間の健全な開発競争が促されて、Web全体の相互運用性が底上げされています。興味がある方はぜひtest262.fyiを見てみてください。
-->

---
layout: section
---

# 私が V8 で見つけたバグの話

<!--
ここからは、Test262とエンジンの実装がどう繋がっているかを、私自身の体験を通してお話しします。V8のソースコードを読んでいて見つけたバグの話です。
-->

---

## 直接 eval と間接 eval

JavaScript の eval は呼び出し方によって 2 つの挙動があります。

`eval` という名前で直接呼び出す「直接 eval」は、呼び出し元のスコープにアクセスできます。

一度変数に代入してから呼び出す「間接 eval」は、グローバルスコープで実行されます。

```js
function f() {
  const x = 10;
  eval("console.log(x)");      // 直接 eval — x が見える（10 が出力される）
}

function g() {
  const x = 10;
  const e = eval;
  e("console.log(x)");         // 間接 eval — x が見えない（ReferenceError）
}
```

この区別は ECMAScript 仕様で明確に定義されています。

<!--
まず前提知識として、JavaScriptのevalには2種類あることをお話しします。evalという名前で直接呼び出す「直接eval」は呼び出し元のスコープにアクセスできます。上の例ではxが見えるので10が出力されます。一方、一度変数に代入してから呼び出す「間接eval」はグローバルスコープで実行されるので、xが見えずにReferenceErrorになります。この区別はECMAScript仕様で明確に定義されていて、エンジンは正しく判定する必要があります。
-->

---

## V8 で eval(...args) が壊れていた

V8 では、末尾にスプレッドがある eval 呼び出しだけ、直接 eval として認識されていませんでした。

```js
const args = ["1 + 2"];
eval(...args);    // 仕様上は直接 eval だが、V8 では間接 eval として実行されていた
```

V8 のソースコード（bytecode-generator.cc）には、このバグについてのコメントが残されていました。

```cpp
// FIXME(v8:5690): Support final spreads for eval.
```

そして先ほど説明した test262.status には、このバグに対応する Test262 テストが FAIL として登録されていました。

<https://chromium-review.googlesource.com/q/7274587>

<!--
ここで本題です。V8のbytecode-generator.ccというファイルをコードリーディングしていた時、あるバグを見つけました。eval(...args)のように末尾にスプレッドがある呼び出しだけ、直接evalとして認識されていなかったんです。ソースコードには「FIXME: Support final spreads for eval.」というコメントが残されていました。そして先ほど説明したtest262.statusには、このバグに対応するTest262テスト、language/expressions/call/eval-spreadがFAILとして登録されていました。ソースコードのFIXMEとtest262.statusのFAIL、まさに技術的負債の表裏一体です。
-->

---

## Test262 が果たした役割

この体験で重要なのは V8 の内部実装ではなく、Test262 が果たした役割です。

仕様と実装のギャップを「テストの失敗」という形で可視化していたのは Test262 です。

test262.status に FAIL が登録されていたからこそ、どのテストが仕様に違反しているかが明確に分かりました。

Test262 テストの通過が、仕様準拠の証明になります。

ソースコードの不整合の発見 → 修正 → Test262 による仕様準拠の証明。

このサイクルが「どのブラウザでも同じ結果になる」を維持している仕組みです。

<!--
この体験で一番伝えたいのは、V8の内部実装の話ではなく、Test262が果たした役割です。仕様と実装のギャップを「テストの失敗」という形で可視化していたのはTest262です。test262.statusにFAILが登録されていたからこそ、どのテストが仕様に違反しているかが明確に分かりました。そして修正後の検証もTest262が担いました。C++のコードを変更して「正しくなった」と主張するには根拠が必要です。Test262テストの通過が仕様準拠の証明になるんです。ソースコードの不整合を発見して、修正して、Test262で仕様準拠を証明する。このサイクルが、JavaScriptの「どのブラウザでも同じ結果になる」という信頼性を維持している仕組みそのものです。一個人がエンジンのコードを読んで見つけたバグ修正でも、5万以上のテストという検証システムを通じて仕様準拠が証明される。Test262はこのプロセスの中核にあります。
-->

---
layout: section
---

# まとめ

<!--
最後にまとめです。
-->

---

## JavaScript の「当たり前」を支える仕組み

JavaScript がどのブラウザでも同じように動く。

その裏側には、TC39 の標準化プロセスと、50,000 件以上のテストを日々保守するコミュニティと、仕様準拠を目指すエンジン開発者たちがいます。

Test262 は単なるテストツールではなく、競合するベンダーが同一の仕様を正しく実装するための合意形成の基盤です。

<!--
JavaScriptがどのブラウザでも同じように動く。その裏側にはTC39の標準化プロセスと、5万件以上のテストを日々保守するコミュニティと、仕様準拠を目指すエンジン開発者たちがいます。Test262は単なるテストツールではなく、競合するベンダーが同じ仕様を正しく実装するための合意形成の基盤です。新機能がStage 4に進むにはテストが必要で、各エンジンは毎日そのテストを実行して仕様からの退行を防いでいます。
-->

---

## Test262 は誰にでも開かれている

Test262 へのテスト追加も、エンジンの FIXME 修正も、特別な権限は必要ありません。

Proposal に対してテストを書くこと、エンジンのコードリーディングで仕様と実装のギャップを見つけること。

これらは Web の未来の「当たり前」を創り出す直接的な貢献です。

普段意識することのない JavaScript の「信頼性の源泉」に、ぜひ触れてみてください。

<!--
そしてこの仕組みは誰にでも開かれています。Test262へのテスト追加も、エンジンのFIXME修正も、特別な権限は必要ありません。新しいProposalに対してテストを書くことも、エンジンのコードリーディングで仕様と実装のギャップを見つけることもできます。普段意識することのないJavaScriptの「信頼性の源泉」に、ぜひ触れてみてください。
-->

---

## ご清聴ありがとうございました

本日のスライドは下記のリポジトリで公開しています。<br>
内容の修正・改善など、お気軽にPull Requestをお送りください。<br>
11/30の関西のフロントエンドカンファレンスでも登壇するので、そこでもお会いしましょう！

<https://github.com/riya-amemiya/amemiya_riya_slide_data/tree/main/frontend_conf_tokyo_2025>

- XやGitHubなど: <https://riya-amemiya-links.tokidux.com/>

<div class="flex justify-center">
<img src="/link.png" alt="リンク集" class="w-48 h-48" />
</div>

<hr>

<div class="text-sm">

このスライドは **CC BY-SA 4.0** でライセンスされています。<br>
**より自由な翻訳を可能にするため**、翻訳は例外的に **CC BY 4.0** での配布が許可されています。<br>
Required Attribution: Riya Amemiya (<https://github.com/riya-amemiya>)

</div>

<!--
これで私の発表を終わります。
本日のスライドはGitHubで公開していますので、ぜひご覧ください。Pull Requestもお待ちしております。
また、11月30日に関西で開催されるフロントエンドカンファレンスでも登壇しますので、そちらでもお会いできるのを楽しみにしています。

ご清聴いただき、ありがとうございました。
-->