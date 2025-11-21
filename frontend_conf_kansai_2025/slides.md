---
theme: seriph
background: white
title: 最近のHTMLを改めてちゃんと学んでみた
info: |
  ## Frontend Conference Kansai 2025
  最近のHTMLを改めてちゃんと学んでみた
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

# 最近のHTMLを改めてちゃんと学んでみた

<!--
皆さん、こんにちは。「最近のHTMLを改めてちゃんと学んでみた」というタイトルで発表させていただきます。
-->

---

<div class="grid grid-cols-2 gap-4 items-center">
<div>

## 自己紹介

- 名前：西 悠太
- 所属：株式会社ダイニー
- TypeScriptが好きです

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

「へー！今のHTMLってそんなことできるんだー」

と思って帰ってもらう

<!--
今日のゴールはシンプルです。「へー！今のHTMLってそんなことできるんだー」と思って帰っていただければ大成功です。気軽に聞いてください。
-->

---

## HTML Living Standardの時代へ

2019年5月、W3CとWHATWGはHTMLとDOM標準の開発を
WHATWGが主導することで合意しました

これにより、HTMLは「HTML5」のようなバージョン番号を持つ仕様から、
継続的に更新される「HTML Living Standard」へと移行しました

<!--
2019年5月にWHATWGがHTML標準の開発を主導することで合意しました。これによりHTML5のようなバージョン番号ではなく、継続的に更新されるLiving Standardになりました。
-->

---

## HTMLの進化の方向性

この変化により、以下のような傾向が明確に現れています

**宣言的UI構築への移行**
JavaScript実装から、HTML属性による宣言的な記述へ

**ブラウザネイティブ最適化**
パフォーマンスやアクセシビリティをブラウザレベルで最適化

**開発者体験の向上**
より直感的で保守しやすいマークアップの実現

<!--
この変化で3つの傾向が出てきました。JavaScriptからHTML属性への宣言的記述への移行、ブラウザレベルでのパフォーマンスとアクセシビリティの最適化、そして開発者体験の向上です。
-->

---

## 今日紹介する機能

<div class="grid grid-cols-2 gap-4 text-sm">
<div>

1. Popover API (Baseline 2024)
2. Dialog要素 (Baseline 2022)
3. details要素のname属性 (Baseline 2024)
4. inert属性 (Baseline 2023)
5. search要素 (Baseline 2023)
6. loading属性 (Baseline 2020)

</div>
<div>

7. fetchpriority属性 (Baseline 2023)
8. blocking属性 (Baseline 2024)
9. inputmode属性 (Baseline 2018)
10. enterkeyhint属性 (Baseline 2021)
11. rel属性のSEO対応値 (2019)

</div>
</div>

<!--
今日紹介する11の機能です。2018年から2024年にかけてBaselineに追加されたものを取り上げます。
-->

---

# 1. Popover API (Baseline 2024)

## ネイティブなポップオーバー機能

<!--
まず最初はPopover APIです。これはブラウザネイティブでポップオーバーを実装できる新しい機能です。
-->

---

## ポップアップ実装で困ること

<div class="grid grid-cols-2 gap-4 items-start">
<div>

- z-indexの管理が大変
- 外側クリックで閉じる処理
- ESCキーで閉じる処理
- フォーカス管理

結局ライブラリに頼ることに...

</div>
<div>

<div style="position: relative; width: 260px; height: 200px; border: 2px solid #ddd; background: #fafafa;">
  <div style="position: absolute; top: 15px; left: 50%; transform: translateX(-50%); background: white; border: 2px solid #007bff; border-radius: 8px; padding: 20px; width: 200px; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">確認ダイアログ<br/>(z-index: 10)</div>
    <div style="font-size: 11px; color: #666; margin-bottom: 12px;">本当に削除しますか？</div>
    <div style="display: flex; gap: 8px;">
      <button style="flex: 1; padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 11px;">削除</button>
      <button style="flex: 1; padding: 6px; background: #6c757d; color: white; border: none; border-radius: 4px; font-size: 11px;">キャンセル</button>
    </div>
  </div>
  <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(51, 51, 51, 0.95); color: white; padding: 12px; z-index: 50; font-size: 12px; font-weight: bold;">
    固定ヘッダー (z-index: 50)
  </div>
  <div style="position: absolute; bottom: 10px; left: 10px; font-size: 10px; color: #dc3545; font-weight: bold;">
    ヘッダーがダイアログに重なる
  </div>
</div>

</div>
</div>

<!--
ポップアップの実装って大変ですよね。z-indexの管理、外側クリック、ESCキー、フォーカス管理...結局ライブラリに頼ることになりがちです。
-->

---

## 今はHTMLだけで解決

popovertarget属性 + popover属性を指定するだけ

→ z-index管理、外側クリック/ESCキーで閉じる、フォーカス管理を自動処理

```html
<button popovertarget="menu">メニューを開く</button>
<div popover="auto" id="menu">ポップアップの内容</div>
```

<!--
Popover APIを使うとこれだけで動きます。トップレイヤーに表示されるのでz-index不要、ESCや外側クリックで閉じる処理も全部自動です。
-->

---

## なぜz-index問題が解決するの？

トップレイヤーという新しい描画層

- DOM階層から完全に独立
- z-indexの制約を受けない
- `overflow:hidden`で切れない

従来のz-index地獄から解放

<!--
トップレイヤーはDOM階層から完全に独立した描画層です。z-indexの制約を受けず、overflow:hiddenで切れることもありません。
-->

---

## 従来の実装 vs Popover API

<div class="grid grid-cols-2 gap-4">
<div>

従来の実装<br/>管理が複雑

```html
<button onclick="togglePopup()">
  メニュー
</button>
<div id="popup" class="popup hidden">
  ...
</div>
<script>
function togglePopup() {
  // 色々な処理が必要
}
</script>
```

</div>
<div>

Popover API<br/>
トップレイヤーで独立 + 自動イベント管理

```html
<button popovertarget="menu">
  メニュー
</button>
<div popover id="menu">
  ...
</div>
```

</div>
</div>

<!--
従来の実装ではJavaScriptでイベント管理が必要でしたが、Popover APIなら宣言的に書くだけでブラウザが自動的に処理してくれます。
-->

---

## 3つのポップオーバータイプ

popovertargetaction属性を使うと、同じポップオーバーに対して
ボタンごとに異なる操作（開く・閉じる・切り替え）を指定できます

| タイプ | 排他制御 | 要素外クリックで閉じる | 適用シーン |
|--------|----------|---------------------|------------|
| auto | 他のautoを閉じる | ✅ | メニュー、ダイアログ |
| hint | 他に影響しない | ✅ | ツールチップ、通知 |
| manual | 他に影響しない | ❌ | サイドドロワー |

<!--
ポップオーバーには3つのタイプがあります。autoはメニューやダイアログ向け、hintはツールチップ向け、manualはサイドドロワーのように明示的に閉じるUI向けです。
-->

---

## popovertarget属性による宣言的関係性

属性で関係性を宣言 → 自動的に紐づけ

```html
<!-- 複数のボタンで同じポップオーバーを制御 -->
<button popovertarget="settings">設定を開く</button>
<button popovertarget="settings" popovertargetaction="hide">設定を閉じる</button>
<button popovertarget="settings" popovertargetaction="toggle">設定の切り替え</button>
<div popover="auto" id="settings">
  <h2>設定</h2>
  <p>ここに設定内容が入ります。</p>
</div>
```

適切なイベントハンドリング + アクセシビリティ属性の自動設定

<!--
popovertargetactionを使うと、開く、閉じる、トグルを明示的に指定できます。これもブラウザがイベント処理とアクセシビリティを自動で設定してくれます。
-->

---

# 2. Dialog要素 (Baseline 2022)

## ネイティブなモーダルダイアログ

<!--
次はDialog要素です。モーダルダイアログを実装するための専用要素で、フォーカストラップなどをブラウザがネイティブに処理してくれます。
-->

---

## モーダルダイアログ実装で困ること

<div class="grid grid-cols-2 gap-4 items-start">
<div>

- フォーカストラップの実装
- ESCキーで閉じる処理
- 背景の無効化
- アクセシビリティ対応

自前で全部実装するのは大変...

</div>
<div>

<div style="position: relative; width: 260px; height: 180px; border: 2px solid #ddd; background: #f5f5f5;">
  <div style="position: absolute; top: 10px; left: 10px; right: 10px; background: white; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    <div style="font-size: 11px; color: #666; margin-bottom: 6px;">ページコンテンツ</div>
    <input type="text" style="width: 100%; padding: 4px; font-size: 10px; margin-bottom: 4px;" placeholder="入力欄1">
    <button style="padding: 4px 8px; font-size: 10px; background: #007bff; color: white; border: none; border-radius: 3px;">送信</button>
  </div>
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 2px solid #dc3545; border-radius: 6px; padding: 15px; width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">モーダル</div>
    <div style="font-size: 10px; color: #666; margin-bottom: 8px;">削除しますか？</div>
    <button style="padding: 4px 8px; font-size: 10px; background: #dc3545; color: white; border: none; border-radius: 3px;">削除</button>
  </div>
  <div style="position: absolute; bottom: 8px; left: 8px; font-size: 9px; color: #dc3545;">
    背景がクリック可能...
  </div>
</div>

</div>
</div>

<!--
モーダルダイアログの実装って大変ですよね。フォーカストラップ、ESCキー、背景無効化、アクセシビリティ...全部自分で実装するのは大変です。
-->

---

## 今はDialog要素で解決

Dialog要素で以下を自動処理：

フォーカストラップ、ESCキーで閉じる、背景の無効化、アクセシビリティ対応

<!--
Dialog要素を使えば、フォーカストラップなど全部ブラウザがやってくれます。2022年3月からすべての主要ブラウザで使えます。
-->

---

## モーダルダイアログの実装

```html
<dialog id="my-dialog">
  <h2>ダイアログタイトル</h2>
  <p>ダイアログの内容がここに入ります。</p>
  <button id="close-dialog">閉じる</button>
</dialog>

<button id="open-dialog">ダイアログを開く</button>

<script>
  const dialog = document.getElementById('my-dialog');
  document.getElementById('open-dialog').addEventListener('click', () => {
    dialog.showModal(); // モーダルダイアログとして表示
  });
  document.getElementById('close-dialog').addEventListener('click', () => {
    dialog.close();
  });
</script>
```

<!--
Dialog要素の基本的な使い方です。showModal()でモーダルとして表示し、close()で閉じます。JavaScriptは必要ですが、フォーカストラップは自動で処理されます。
-->

---

## showModal()とshow()の違い

showModal()
→ モーダル表示 + `::backdrop`で背景を覆う + フォーカストラップ自動実装

show()
→ 非モーダル表示、背景の要素も操作可能

<!--
showModal()は背景を覆ってフォーカストラップを実装し、show()は非モーダルで背景も操作可能です。用途に応じて使い分けてください。
-->

---

## form要素との統合

`method="dialog"`指定 → 送信時にダイアログを自動で閉じる + ボタンのvalueを`dialog.returnValue`に設定

```html
<dialog id="confirm-dialog">
  <form method="dialog">
    <h2>削除の確認</h2>
    <p>この操作は取り消せません。</p>
    <button value="cancel">キャンセル</button>
    <button value="confirm">削除</button>
  </form>
</dialog>
```

<!--
method="dialog"を使うと、フォーム送信時に自動的にダイアログが閉じて、ボタンのvalue値がdialog.returnValueに設定されます。確認ダイアログに便利です。
-->

---

## DialogとPopoverの使い分け

| 特性 | Dialog | Popover |
|------|--------|---------|
| フォーカストラップ | ✅ 自動（モーダル時） | ❌ なし |
| 背景の無効化 | ✅ ::backdrop擬似要素 | ❌ 手動実装必要 |
| ESCキーで閉じる | ✅ 自動 | ✅ 自動 |
| form統合 | ✅ method="dialog" | ❌ なし |
| 用途 | 確認、入力が必要 | 情報表示、メニュー |

<!--
DialogとPopoverの使い分けは、ユーザーの操作を求める場合はDialog、単なる情報表示やメニューはPopoverと覚えてください。
-->

---

# 3. details要素のname属性 (Baseline 2024)

## ネイティブなアコーディオン

<!--
3番目はdetails要素のname属性です。これでネイティブなアコーディオンが実現できます。
-->

---

## アコーディオン実装で困ること

<div class="grid grid-cols-2 gap-4 items-start">
<div>

一度に1つだけ開くアコーディオン

従来のdetails要素は独立動作 → JavaScriptで状態管理が必要

</div>
<div>

<div style="width: 240px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; font-size: 11px;">
  <details open style="border-bottom: 1px solid #ddd; padding: 8px; background: #f8f9fa;">
    <summary style="cursor: pointer; font-weight: bold;">質問1</summary>
    <div style="padding: 8px 0; color: #666;">回答1の内容</div>
  </details>
  <details open style="border-bottom: 1px solid #ddd; padding: 8px; background: #f8f9fa;">
    <summary style="cursor: pointer; font-weight: bold;">質問2</summary>
    <div style="padding: 8px 0; color: #666;">回答2の内容</div>
  </details>
  <details style="padding: 8px; background: #f8f9fa;">
    <summary style="cursor: pointer; font-weight: bold;">質問3</summary>
    <div style="padding: 8px 0; color: #666;">回答3の内容</div>
  </details>
</div>
<div style="font-size: 9px; color: #dc3545; margin-top: 4px;">複数が同時に開いてしまう</div>

</div>
</div>

<!--
アコーディオンで一度に1つだけ開く実装、JavaScriptで状態管理してませんか？従来のdetails要素は独立して動作するので、JavaScriptが必須でした。
-->

---

## 今はname属性で解決

同じname値を持つdetails要素 → 自動で排他制御、JavaScript不要

<!--
name属性を追加するだけで、ブラウザが自動的に排他制御してくれます。JavaScriptは不要です。
-->

---

## アコーディオンの実装例

```html
<!-- FAQセクション：一度に1つの質問だけ開く -->
<details name="faq">
  <summary>返品は可能ですか？</summary>
  <p>商品到着後14日以内であれば返品可能です。</p>
</details>

<details name="faq">
  <summary>送料はいくらですか？</summary>
  <p>5,000円以上のご購入で送料無料です。</p>
</details>

<details name="faq">
  <summary>支払い方法は？</summary>
  <p>クレジットカード、銀行振込、代金引換をご利用いただけます。</p>
</details>
```

JavaScriptゼロ行

<!--
FAQセクションの例です。すべてのdetails要素に同じname="faq"を指定するだけで、一度に1つだけ開くアコーディオンになります。JavaScriptは不要です。
-->

---

# 4. inert属性 (Baseline 2023)

## 包括的な要素の無効化

<!--
4番目はinert属性です。要素とその子要素を完全に無効化できる強力な属性です。
-->

---

## 非表示スライド内のリンクを無効化したい時

<div class="grid grid-cols-2 gap-4 items-start">
<div>

カルーセルUIで前後のスライドも操作可能になってしまう

従来の`disabled`属性はフォーム要素のみ

→ inert属性でリンクやコンテンツも含めて無効化可能

無効化される範囲：

- フォーカス
- クリック/タップ
- アクセシビリティツリー

</div>
<div>

<div style="position: relative; width: 260px; height: 140px; overflow: hidden;">
  <div style="display: flex; gap: 10px; transform: translateX(-70px); height: 100%;">
    <div style="flex-shrink: 0; width: 100px; padding: 12px; background: #f5f5f5; border-radius: 8px; opacity: 0.5;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">スライド1</div>
      <a href="#" style="color: #007bff; font-size: 9px; text-decoration: underline; display: block; margin-bottom: 4px;">リンク →</a>
      <button style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; font-size: 9px;">詳細</button>
    </div>
    <div style="flex-shrink: 0; width: 170px; padding: 16px; background: white; border: 2px solid #28a745; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #28a745;">スライド2（メイン）</div>
      <a href="#" style="color: #007bff; font-size: 9px; text-decoration: underline; display: block; margin-bottom: 6px;">リンク →</a>
      <button style="padding: 4px 10px; background: #28a745; color: white; border: none; border-radius: 3px; font-size: 9px;">詳細</button>
    </div>
    <div style="flex-shrink: 0; width: 100px; padding: 12px; background: #f5f5f5; border-radius: 8px; opacity: 0.5;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">スライド3</div>
      <a href="#" style="color: #007bff; font-size: 9px; text-decoration: underline; display: block; margin-bottom: 4px;">リンク →</a>
      <button style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; font-size: 9px;">詳細</button>
    </div>
  </div>
  <div style="position: absolute; bottom: 8px; left: 8px; font-size: 8px; color: #dc3545; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px;">
    前後のリンクもフォーカス可能
  </div>
</div>

</div>
</div>

<!--
inert属性はフォーカス、イベント応答、アクセシビリティツリーからの除外など、ブラウザの要素処理全般を無効化します。モーダル表示時の背景無効化などに最適です。
-->

---

## 各無効化手法の比較

| 特性 | `aria-hidden` | `inert` | `disabled` |
|------|-------------|-------|-----------
| 対象範囲 | アクセシビリティツリーのみ | 視覚・操作・アクセシビリティ | フォーム要素のみ |
| マウス操作 | 操作可能 | 操作不可 | 操作不可（フォーム要素） |
| フォーカス | 可能 | 不可 | 不可（フォーム要素） |
| 適用可能要素 | すべて | すべて | フォーム要素のみ |

従来の`disabled`属性はフォーム要素にしか使えませんでしたが、
`inert`属性はあらゆるHTML要素に適用できるので、より柔軟に無効化できます

<!--
aria-hidden、inert、disabledの違いをまとめました。inertはすべての要素に適用でき、視覚・操作・アクセシビリティを一括で無効化できる点が特徴です。
-->

---

## モーダル表示時の活用例

```javascript
// モーダルを開く際にメインコンテンツを無効化
document.getElementById('main-content').inert = true;
```

inert属性をtrueに設定するだけで、
その要素とすべての子要素がフォーカス不可・クリック不可・アクセシビリティツリーから除外されます

<!--
実際の使用例として、モーダルを開く際にメインコンテンツにinert=trueを設定すると、背景の操作を完全に防げます。
-->

---

# 5. search要素 (Baseline 2023)

## 検索UIの標準化

<!--
5番目はsearch要素です。検索UIをセマンティックにマークアップできる新しい要素です。
-->

---

## 検索UIのマークアップ

従来：`role="search"`でアクセシビリティ確保

今は：`<search>`要素で包むだけ → スクリーンリーダーが自動で検索機能を認識

<!--
従来はrole="search"を付けていましたが、search要素を使えばより明確なマークアップができます。スクリーンリーダーが検索機能を自動認識します。
-->

---

## 使用例

```html
<!-- サイト内検索 -->
<search>
  <form action="/search" method="get">
    <label for="site-search">サイト内を検索:</label>
    <input type="search" id="site-search" name="q" required>
    <button type="submit">検索</button>
  </form>
</search>
```

アクセシビリティツリーで`search`ランドマークとして認識 → スクリーンリーダーユーザーが検索機能を素早く発見

<!--
search要素はブラウザのアクセシビリティツリーでsearchランドマークとして認識されます。アクセシビリティの向上に貢献します。
-->

---

# 6. loading属性 (Baseline 2020)

## リソース読み込み制御

<!--
6番目はloading属性です。画像やiframeの読み込みタイミングを制御できます。
-->

---

## 画像の遅延読み込み

従来：Intersection Observer APIでゴリゴリ実装

今は：`loading="lazy"`を付けるだけ → 最適なタイミングで自動読み込み

```html
<!-- ファーストビューの重要な画像 -->
<img src="hero-image.jpg" loading="eager" alt="メインビジュアル">

<!-- スクロール後に表示される画像 -->
<img src="product-1.jpg" loading="lazy" alt="商品画像1">
<img src="product-2.jpg" loading="lazy" alt="商品画像2">

<!-- 外部コンテンツの遅延読み込み -->
<iframe src="video-player.html" loading="lazy" title="動画プレイヤー"></iframe>
```

<!--
ファーストビューの重要な画像はeager、スクロール後の画像はlazyを指定します。iframeも同様に使えます。
-->

---

## 使い分け

| 値 | 動作 | 使用場面 |
|----|------|----------|
| lazy | ビューポート接近時に読み込み | フォールド下の画像 |
| eager | 即座に読み込み | ファーストビューの画像 |

<!--
lazyはスクロール後に表示される画像に、eagerはファーストビューの重要な画像に使います。
-->

---

# 7. fetchpriority属性 (Baseline 2023)

## リソース優先度制御

<!--
7番目はfetchpriority属性です。リソースの取得優先度を明示的に指定してCore Web Vitalsを最適化できます。
-->

---

## LCPが改善しない時

LCP画像を優先的に読み込みたいのに、ブラウザの優先度判断が意図と違う...

**→ 今はfetchpriority属性でLCP改善が可能**

- ヒーロー画像 → `high`
- 分析スクリプト → `low`

特にLCP改善に効果的です

<!--
fetchpriority属性を使うと、リソースの優先度を明示的に指定できます。特にLCPの改善に効果的です。
-->

---

## 使用例

```html
<!-- LCP要素となるヒーロー画像を最優先 -->
<img src="hero-banner.jpg" fetchpriority="high" alt="メインビジュアル">

<!-- 重要なスタイルシート -->
<link rel="stylesheet" href="critical.css" fetchpriority="high">

<!-- 優先度の低い装飾画像 -->
<img src="decoration.png" fetchpriority="low" loading="lazy" alt="装飾">

<!-- 分析スクリプトは低優先度 -->
<script src="analytics.js" fetchpriority="low" async></script>
```

<!--
LCP画像やクリティカルCSSはhigh、分析スクリプトなどはlowを指定します。画像、スタイルシート、スクリプトに使えます。
-->

---

## 優先度の使い分け

| 優先度 | 対象リソース | 効果 |
|--------|------------|------|
| high | LCP画像、クリティカルCSS、重要なフォント | より早く読み込まれる |
| low | 装飾画像、分析スクリプト、非表示コンテンツ | 他のリソースを優先 |
| auto | その他の一般的なリソース | ブラウザのデフォルト動作 |

<!--
優先度の使い分けをまとめました。high、low、autoの3つがあります。特に指定しなければブラウザのデフォルト動作になります。
-->

---

# 8. blocking属性 (Baseline 2024)

## レンダリング制御

<!--
8番目はblocking属性です。レンダリングをブロックするかどうかを明示的に制御できます。
-->

---

## フォント読み込みでチラつく問題

フォントが読み込まれる前にテキストが表示されてチラつく

従来は暗黙的にレンダリングをブロック、明示的に制御不可

→ 今はblocking属性でチラつきを防止可能

必要なリソースが読み込まれてから表示

<!--
blocking属性を使うと、スクリプトやスタイルシートがレンダリングをブロックするかを明示的に制御できます。
-->

---

## 使用例

```html
<!-- 通常のスクリプトはレンダリングを停止 -->
<script src="library.js"></script>

<!-- deferはDOM構築完了後に実行 -->
<script src="framework.js" defer></script>

<!-- preload + blocking="render"でレンダリングを停止 -->
<link rel="preload"
      href="critical-font.woff2"
      as="font"
      blocking="render"
      crossorigin>
```

初期表示に必要不可欠なリソース vs 後から適用可能なリソースを明確に区別

<!--
この例ではクリティカルなフォントをblocking="render"で指定し、レンダリングをブロックしています。必要不可欠なリソースと後から適用できるリソースを区別できます。
-->

---

# 9. inputmode属性 (Baseline 2018)

## 仮想キーボード最適化

<!--
9番目はinputmode属性です。モバイルデバイスの仮想キーボードのタイプを制御できます。
-->

---

## 仮想キーボードの最適化

<div class="grid grid-cols-2 gap-4 items-start">
<div>

郵便番号入力で数値専用キーボードを出したいのに文字キーボードが表示されてしまう

→ inputmode属性で数値専用キーボードを表示可能

</div>
<div>

<div style="width: 220px; font-size: 10px;">
  <div style="margin-bottom: 8px;">
    <div style="background: #f0f0f0; padding: 6px; border-radius: 3px; margin-bottom: 4px;">
      <input type="text" placeholder="郵便番号" style="width: 100%; padding: 4px; font-size: 10px; border: 1px solid #ccc; border-radius: 2px;">
    </div>
    <div style="background: white; border: 1px solid #ccc; padding: 6px; border-radius: 3px; display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px;">
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">Q</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">W</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">E</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">R</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">T</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">Y</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">U</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">I</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">O</div>
      <div style="background: #e0e0e0; padding: 4px; text-align: center; border-radius: 2px; font-size: 8px;">P</div>
    </div>
    <div style="font-size: 8px; color: #dc3545; margin-top: 2px;">文字キーボード...</div>
  </div>
</div>

</div>
</div>

```html
<!-- 数値専用キーボード -->
<input type="text" inputmode="numeric" pattern="[0-9]*"
       placeholder="郵便番号（ハイフンなし）">

<!-- 電話番号用キーボード -->
<input type="tel" inputmode="tel" placeholder="090-1234-5678">

<!-- URL入力用キーボード -->
<input type="url" inputmode="url" placeholder="https://example.com">

<!-- メールアドレス用キーボード -->
<input type="email" inputmode="email" placeholder="user@example.com">
```

<!--
inputmodeを指定すると、入力内容に適したキーボードが表示されます。数字、電話番号、URL、メールアドレスなど、入力に最適化されたキーボードが出てきます。
-->

---

## inputmodeの種類

| inputmode | 表示されるキーボード | 適した用途 |
|-----------|-------------------|------------|
| numeric | 0-9の数字のみ | 認証コード、郵便番号 |
| tel | 電話番号用（+や-を含む） | 電話番号 |
| decimal | 数字と小数点 | 価格、数量 |
| email | @や.comキーを含む | メールアドレス |
| url | /や.comキーを含む | URL入力 |
| search | 検索ボタン付き | 検索フィールド |

<!--
inputmodeには6種類あります。numeric、tel、decimal、email、url、searchです。用途に応じて使い分けることでユーザー体験が向上します。
-->

---

# 10. enterkeyhint属性 (Baseline 2021)

## Enterキー表示の最適化

<!--
10番目はenterkeyhint属性です。仮想キーボードのEnterキー表示をコンテキストに応じて最適化できます。
-->

---

## Enterキー表示の最適化

<div class="grid grid-cols-2 gap-4 items-start">
<div>

検索フィールドなのにEnterキーが「改行」と表示されてしまう

→ enterkeyhint属性でユーザーに次のアクションを直感的に示せる

</div>
<div>

<div style="width: 220px; font-size: 10px;">
  <div style="background: #f0f0f0; padding: 6px; border-radius: 3px; margin-bottom: 4px;">
    <input type="search" placeholder="検索..." style="width: 100%; padding: 4px; font-size: 10px; border: 1px solid #ccc; border-radius: 2px;">
  </div>
  <div style="background: white; border: 1px solid #ccc; padding: 8px; border-radius: 3px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px;">
    <div style="background: #e0e0e0; padding: 6px; text-align: center; border-radius: 2px; font-size: 8px;">1</div>
    <div style="background: #e0e0e0; padding: 6px; text-align: center; border-radius: 2px; font-size: 8px;">2</div>
    <div style="background: #e0e0e0; padding: 6px; text-align: center; border-radius: 2px; font-size: 8px;">3</div>
    <div style="background: #e0e0e0; padding: 6px; text-align: center; border-radius: 2px; font-size: 8px; grid-column: span 2;">スペース</div>
    <div style="background: #dc3545; color: white; padding: 6px; text-align: center; border-radius: 2px; font-size: 8px;">改行</div>
  </div>
  <div style="font-size: 8px; color: #dc3545; margin-top: 2px;">「検索」ではなく「改行」...</div>
</div>

</div>
</div>

```html
<!-- 検索フィールド -->
<input type="search" enterkeyhint="search" placeholder="サイト内を検索">

<!-- 複数ステップフォーム -->
<input type="text" enterkeyhint="next" placeholder="お名前">

<!-- フォームの最終項目 -->
<textarea enterkeyhint="done" placeholder="コメント"></textarea>

<!-- チャットアプリ -->
<input type="text" enterkeyhint="send" placeholder="メッセージを入力">
```

<!--
検索フィールドではsearch、フォームの途中ではnext、最終項目ではdone、チャットではsendを指定します。ユーザーの次のアクションを直感的に示せます。
-->

---

## enterkeyhintの種類

| 値 | Enterキー表示 | 使用場面 |
|----|---------------|----------|
| search | 検索 | 検索フィールド |
| next | 次へ | フォームの途中フィールド |
| done | 完了 | フォームの最終フィールド |
| go | 移動 | URL入力フィールド |
| send | 送信 | メッセージ入力フィールド |

<!--
enterkeyhintには5種類あります。search、next、done、go、sendです。フォームやチャットなど、用途に合わせて設定してください。
-->

---

# 11. rel属性のSEO対応値 (2019)

## リンク性質の明確化

<!--
最後の11番目はrel属性のSEO対応値です。リンクの性質を検索エンジンに伝えるための新しい値が追加されました。
-->

---

## 広告リンクとユーザー投稿リンクの区別

全部`nofollow`で一括りにしてませんか？

2019年9月にGoogleが発表した新しい`rel`属性値でリンクの性質を詳細に伝達

- `sponsored`：広告やアフィリエイトリンク
- `ugc`：ユーザー生成コンテンツ内のリンク

検索エンジンがリンクの文脈を正確に理解 → PageRankの評価を適切に調整

---

## 使用例

```html
<!-- 有料広告やスポンサーリンク -->
<a href="https://sponsor.com" rel="sponsored">スポンサーリンク</a>

<!-- ユーザー生成コンテンツ内のリンク -->
<a href="https://user-content.com" rel="ugc">ユーザー投稿のリンク</a>

<!-- 複数の値を組み合わせる -->
<a href="https://untrusted-site.com" rel="nofollow sponsored">
  有料の外部リンク
</a>
```

<!--
sponsoredは広告やアフィリエイトリンク、ugcはユーザー生成コンテンツ内のリンクに使います。複数の値を組み合わせることもできます。
-->

---

## rel属性の値

| 値 | 説明 | 使用場面 |
|----|------|----------|
| sponsored | 広告、スポンサーシップ、金銭的対価のあるリンク | アフィリエイトリンク、記事広告など |
| ugc | ユーザー生成コンテンツ内のリンク | ブログコメント欄、フォーラム投稿内のリンク |

検索エンジンがリンクの文脈を正確に理解 → PageRank評価を適切に調整

<!--
sponsoredとugcの2つが主要な値です。これらを使うことで検索エンジンがリンクの文脈を正確に理解し、PageRankの評価を適切に調整してくれます。
-->

---

## まとめ

2019年から現在にかけて、HTMLは要素間の関係性を宣言するだけで複雑なUI動作を実現できる言語へ進化

UI・インタラクション：Popover API、Dialog要素、details要素のname属性、inert属性

セマンティクス・アクセシビリティ：search要素、rel属性のSEO対応値

<!--
まとめです。今日紹介した11の機能は大きく4つのカテゴリに分けられます。UI・インタラクション、セマンティクス・アクセシビリティ、パフォーマンス最適化、モバイルUXです。
-->

---

パフォーマンス最適化：loading属性、fetchpriority属性、blocking属性

モバイルUX：inputmode属性、enterkeyhint属性

Popover APIやdetails要素のname属性などでJavaScript依存から脱却、HTMLだけで多くのUIパターンを実現

<!--
特にPopover APIやdetails要素のname属性などを使えば、JavaScriptなしでUIパターンを実現できます。HTMLの進化によって、より宣言的で保守しやすいコードが書けるようになりました。
-->

---

## 注意

ブラウザの対応状況によってはまだ使用できない場合あり

詳細は以下を参照

<div class="text-sm">

- <https://developer.mozilla.org/ja/docs/Web/API/Popover_API>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Element/dialog>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Element/details>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/inert>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Element/search>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Element/img#loading>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Element/img#fetchpriority>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Element/script#blocking>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/inputmode>
- <https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/enterkeyhint>

</div>

<!--
今回紹介した機能はブラウザの対応状況によってはまだ使えない場合があります。詳細はMDNのドキュメントを参照してください。実際に使う際は必ず対応状況を確認してください。
-->

---

## ご清聴ありがとうございました

本日のスライドは下記のリポジトリで公開しています。<br>
内容の修正・改善など、お気軽にPull Requestをお送りください。<br>

<https://github.com/riya-amemiya/amemiya_riya_slide_data/tree/main/frontend_conf_kansai_2025>

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
ご清聴いただき、誠にありがとうございました。
-->