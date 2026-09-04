---
theme: seriph
background: white
title: V8コントリビュート超入門
info: |
  GitHubで検索すると v8/v8 が出てきますが、あれは公式ミラーです。
  本体は chromium.googlesource.com にあり、GitHub側にPull Requestを送ることはできません。

  V8のコードレビューは、Chromiumと同じGerritで行われます。
  単位はPull RequestではなくCLで、ブランチを積んで送るのではなく、1つのコミットを1つのCLとして送ります。
  レビューが通ったあとは、Commit Queueがtry botを回して、全部緑なら自動でコミットされます。

  このLTでは、ソースを取るところから最初のCLが取り込まれるまでを、実際のコマンドで一通りたどります。
  V8の中身の話ではなく、V8に1行を届けるまでの道のりの話です。
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
    <span class="accent">V8</span>コントリビュート<br>
    超入門
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
    <p style="margin-top:24px;">TypeScriptが好きです。<br>V8にパッチを送るのも好きです。</p>
    <div class="role">@riya-amemiya</div>
  </div>
  <img class="avatar" src="/icon.png" alt="プロフィール画像" />
</div>

---

# 今日のゴール

<p class="lede">
V8にコントリビュートする方法を覚える
</p>

---

# V8とは？

V型8気筒（ブイがたはちきとう）は、レシプロエンジン等のシリンダー配列形式の一つで、直列4気筒2組がV字様に配置されている形式を指す。当記事では専らピストン式内燃機関のそれについて述べる[注釈 1]。V8（ブイはち）と略されることが多い。

多気筒レシプロエンジンとして広く用いられるエンジン形式の一つであり、自動車用としては特に大排気量車の多かったアメリカ合衆国で発達してきた。ガソリンエンジン、ディーゼルエンジン双方あるも､現代では大型乗用車用のエンジン形式として普及している。 引用: [V型8気筒 - Wikipedia](https://ja.wikipedia.org/wiki/V%E5%9E%8B8%E6%B0%97%E7%AD%92)

---

<img src="/car.jpeg" alt="プロフィール画像" />

---

# V8とは？

V8は、Googleが開発するオープンソースのJIT仮想マシン型のJavaScriptエンジンである[3]。この名前は同じく「V8」と略されるV型8気筒エンジンに由来している[4]。Google ChromeなどのChromiumベースのブラウザや、Node.jsなどで採用されている。

概要<br>
ECMAScript (ECMA-262) 準拠で、C++で記述されている。スタンドアローンでの実行が可能なほか、C++で書かれたアプリケーションの一部として動作させることもできる。

引用: [V8 (JavaScriptエンジン) - Wikipedia](https://ja.wikipedia.org/wiki/V8_(JavaScript%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%B3))

---

# リポジトリはGitHubではありません

```
https://chromium.googlesource.com/v8/v8.git   本体
https://github.com/v8/v8                      公式ミラー
```

<p class="lede" style="margin-top:28px;">
GitHubで検索すると <code>v8/v8</code> が出てきますが、あれは公式ミラーです。
</p>

---

# ミラーにPull Requestは送れません

<ul class="clean">
  <li>GitHub側の Issues は開いていません</li>
  <li>Pull Request も受け付けていません</li>
</ul>

---

<p class="lede">
V8のコードレビューは、Chromiumと同じGerritで行われます。
</p>

<div class="big-word">Gerrit</div>

<p class="lede" style="margin-top:28px;">
chromium-review.googlesource.com
</p>

---

# 言葉の対応

<div class="mapping">
  <div>Pull Request</div><div class="to">→</div><div class="to">CL (Change List)</div>
  <div>Merge ボタン</div><div class="to">→</div><div class="to">Commit Queue</div>
  <div>CI</div><div class="to">→</div><div class="to">try bot</div>
</div>

---

# 全体の流れ

<ol class="flow">
  <li>depot_tools を入れる</li>
  <li>ソースを取る</li>
  <li>ビルドする</li>
  <li>直して、テストを足す</li>
  <li>CLを送る</li>
  <li>レビューを受けて、Commit Queueに載せる</li>
</ol>

---

# depot_tools

<p class="lede">
Chromium と V8 の開発には depot_tools が必須です。
</p>
<p class="lede">
git clone して、パスを通します。
</p>

```bash
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH="$(pwd)/depot_tools:$PATH"
```

---

# 1. ソースを取る

```bash
fetch v8
cd v8
```

<p class="lede" style="margin-top:28px;">
<code>fetch</code> は depot_tools に入っています。
</p>
<p class="lede">
取得のあと、意図的に detached HEAD になります。
</p>

Gerritの設定&mainにswitchします。

```bash
git config --local gerrit.host true
git switch main # or checkout main
```

---

# 2. 依存取得&ビルド

```bash
git pull origin main
gclient sync
```

```bash
./tools/dev/gm.py arm64.release
```

<p class="lede" style="margin-top:28px;">
<code>gm.py</code> でビルドします。<br>
Macbook ProのM4 Proで1時間ぐらいかかります
</p>

---

# 3. 直して、テストを足す

<p class="lede">
初めてのときは、AUTHORS に名前とメールを追記します。最初のパッチに含めます。
</p>
<p class="lede">
変更にはテストが必要です。
</p>

<ul class="clean" style="margin-top:24px;">
  <li>JavaScriptから見える変更は <code>test/mjsunit/</code></li>
  <li>C++の単体テストは <code>test/unittests/</code></li>
  <li>バグ修正の回帰テストは <code>test/mjsunit/regress/</code></li>
</ul>

---

# 回帰テストのファイル名

```
test/mjsunit/regress/regress-crbug-1000094.js
```

<p class="lede" style="margin-top:28px;">
<code>regress-crbug-</code> のあとにバグ番号を付けます。
</p>

---

# 4. CLを送る

まずブランチを作ります。

```bash
git new-branch mychange
# ~コードを編集したり、テストを書いたりする~
```

<p class="lede" style="margin-top:28px;">
<code>git checkout -b</code> でも問題ありませんが、公式では <code>git new-branch</code> が推奨されています。
</p>

---

# コミットメッセージ

```
[component] Fix various typos in comments

Bug: v8:12345
```

---

# Gerritのアカウント

<p class="lede">
chromium-review.googlesource.com に、コミットに使う Google アカウントでログインします。
</p>
<p class="lede">
コミットのメールアドレスと、Google アカウントのメールアドレスを一致させます。
</p>

---

# 初回だけ、CLAを出します

```
https://cla.developers.google.com/
```

<p class="lede" style="margin-top:28px;">
GoogleのContributor License Agreementに署名します。
</p>

---

# Uploadする

```bash
git cl format
git cl presubmit
git cl upload
```

<p class="lede" style="margin-top:28px;">
<code>git cl upload</code> を打つと、Gerrit 上に CL ができます。
</p>

---

# 5. レビューとCommit Queue

```bash
git cl owners
```

<ul class="clean" style="margin-top:24px;">
  <li>変更したディレクトリの <strong>OWNERS</strong> から承認をもらいます</li>
  <li><strong>Commit-Queue +1</strong> は、コミットせずに try bot だけ回します</li>
  <li><strong>Commit-Queue +2</strong> で、try botが全部緑なら自動でコミットされます</li>
  <li>(CQを押す権限はcommitterにのみあります)</li>
</ul>

---

<div style="text-align:center; font-size:24px;">Commit-Queue +2されてから<br/>約30分待ったらマージされます🎉</div>

---

# 今日覚えて帰ってほしいこと

<ul class="takeaways">
  <li>V8の本体はchromium.googlesource.comにあり、GitHubの <code>v8/v8</code> はミラー</li>
  <li>変更は、GerritにCLとして送る</li>
  <li>depot_tools を入れてから <code>fetch v8</code> でソースを取り、<code>tools/dev/gm.py</code> でビルドする</li>
  <li>挙動が変わる変更には、テストを付ける</li>
  <li>OWNERSの承認が付いてCommit Queueを通ると、自動でコミットされる</li>
</ul>

---

# 参考資料

<ul class="refs">
  <li>V8 Docs: <a href="https://v8.dev/docs/contribute">Contributing</a></li>
  <li>depot_tools: <a href="https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up">Setting up</a></li>
  <li>V8 Docs: <a href="https://v8.dev/docs/source-code">Checking out the V8 source code</a></li>
  <li>V8 Docs: <a href="https://v8.dev/docs/build">Building V8 from source</a></li>
  <li>Chromium Docs: <a href="https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md">Contributing to Chromium</a></li>
</ul>

---

# ご清聴ありがとうございました
