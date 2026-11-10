---
theme: seriph
background: white
title: "僕たちのエラーレスポンスは間違っている: RFC 9457で脱・オレオレJSON"
info: |
  HTTP APIを実装するとき、エラーレスポンスの構造をどのように決めていますか。独自のJSONフォーマットを定義していないでしょうか。
  こうした「オレオレJSON」は、クライアント側のエラー処理を複雑化させ、ドキュメントの形骸化や実装の属人化を招く原因になります。

  この問題に対する標準的な回答として登場したのが、RFC 9457（Problem Details for HTTP APIs）です。

  application/problem+json が定義する標準プロパティの役割と設計思想、カスタムフィールドによる安全な拡張手法、そしてフロントエンドとバックエンドの境界で運用する際のプラクティスを共有します。
  エラーレスポンスに迷う時間をゼロにし、API全体の品質を一段階引き上げるための具体的な指針をお届けします。
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
    僕たちの<span class="accent">エラーレスポンス</span>は<br>
    間違っている
  </h1>
  <p class="subtitle">RFC 9457で脱・オレオレJSON</p>
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

<p class="lead-q">
エラーレスポンスの形<br>どうやって決めていますか？
</p>

---

# オレオレJSON

<div class="shapes">
  <div class="head">エンドポイント</div><div class="head">ステータス</div><div class="head">ボディ</div>
  <div class="path mono">GET /users/42</div><div class="status mono">404</div><div class="code mono">{ "error": "User not found" }</div>
  <div class="path mono">POST /orders</div><div class="status mono">400</div><div class="code mono">{ "message": "Out of stock", "code": 1001 }</div>
  <div class="path mono">POST /signup</div><div class="status mono">200</div><div class="code mono">{ "success": false,<br>&nbsp;&nbsp;"errors": [{ "field": "email", "msg": "Invalid" }] }</div>
</div>

- APIが独自に決めたエラーレスポンスの形

---

# クライアントのエラー処理

```ts
const res = await fetch(url, init)
const body = await res.json()

if (!res.ok || body.success === false) {
  const message =
    body.error ??
    body.message ??
    body.errors?.[0]?.msg ??
    "Something went wrong"
  showToast(message)
}
```

- クライアントはエンドポイントごとの形を全部知っていないといけない
- 形が1つ増えるたびに分岐も増える
- `1001` が何を表すかはドキュメントを読むまでわからない

---

# ドキュメントの形骸化と実装の属人化

- エラーの形をエンドポイントごとにドキュメントへ書く
- 実装を変えてもドキュメントは古いまま
- エラーの形は、エンドポイントを書いた人が毎回決める

---

<p class="lead-q">
エラーの形に<br>標準はないの？
</p>

---

# RFC 9457

<p class="lede">Problem Details for HTTP APIs</p>

<div class="era-strip">
  <div class="era"><div class="date">2016年3月</div><div class="name">RFC 7807</div></div>
  <div class="era-arrow">→</div>
  <div class="era mark"><div class="date">2023年7月</div><div class="name">RFC 9457</div></div>
</div>

- エラーの詳細をプログラムが読める形でレスポンスに載せる
- APIごとにエラーの形を定義しなくて済むようにする
- JSONのメディアタイプは `application/problem+json`

---

# レスポンスの例

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
Content-Language: en

{
  "type": "https://example.com/probs/out-of-credit",
  "title": "You do not have enough credit.",
  "detail": "Your current balance is 30, but that costs 50.",
  "instance": "/account/12345/msgs/abc",
  "balance": 30,
  "accounts": ["/account/12345", "/account/67890"]
}
```

- RFC 9457にある、残高不足で購入できなかったときの例

---

# ステータスコードとボディ

<div class="roles">
  <div class="head">書く場所</div><div class="head">読む側</div><div class="head">伝えること</div>
  <div class="part mono">HTTP/1.1 403 Forbidden</div><div class="text">プロキシ、キャッシュ<br>HTTPライブラリ</div><div class="text">拒否されたこと</div>
  <div class="part mark">ボディ</div><div class="text">このAPIのクライアント</div><div class="text">拒否された理由と残高</div>
</div>

- 問題の種類はURIで識別する
- ボディに書くのはAPIの利用者に向けた詳細

---

<p class="lead-q">
それぞれのプロパティは<br>何を表している？
</p>

---

# 標準プロパティ

<div class="props">
  <div class="group two">問題の種類ごとに決まる</div>
  <div class="name mono">type</div><div class="text">問題の種類を識別するURI</div>
  <div class="name mono">title</div><div class="text">問題の種類の短い要約</div>
  <div class="group two">発生ごとに変わる</div>
  <div class="name mono">detail</div><div class="text">この発生についての説明</div>
  <div class="name mono">instance</div><div class="text">この発生を識別するURI</div>
  <div class="group">HTTPと同じ値</div>
  <div class="name mono">status</div><div class="text">HTTPのステータスコード</div>
</div>

---

# type

- httpsのURIなら、開くとその問題のドキュメントが見られる
- tag URIのような開けないURIも使える
- あとから開けるURIに変えると、typeが変わって別の種類になる
- typeを省略すると `about:blank` になる

---

# about:blank

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404
}
```

- ステータスコード以上の意味がない問題を表す
- titleはステータスコードの文言と同じにする

---

# titleとdetail

<div class="pair">
  <div class="name mono">title</div>
  <div class="value mono">"You do not have enough credit."<span class="note">種類ごとに同じ</span></div>
  <div class="name mono">detail</div>
  <div class="value mono">"Your current balance is 30, but that costs 50."<span class="note">発生ごとに変わる</span></div>
</div>

- titleを変えてよいのはAccept-Languageに合わせた翻訳だけ
- detailにはクライアントが問題を直すための説明を書く

---

# instance

```json
"instance": "/account/12345/msgs/abc"
```

- 問い合わせを受けたとき、どの発生の話かを特定できる
- 開けるURIなら、この発生の詳細を取得できる
- 開けないURIなら、サーバーだけが意味を知るIDとして使う

---

# status

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://example.com/probs/out-of-credit",
  "status": 403
}
```

- 実際のステータスコードと必ず同じ値にする
- 中継やキャッシュでステータスコードが変わっても元の値がわかる
- ボディだけを保存しても元の値がわかる

---

<p class="lead-q">
残高や入金先のような情報は<br>どこに入れる？
</p>

---

# 拡張メンバー

```json {6,7}
{
  "type": "https://example.com/probs/out-of-credit",
  "title": "You do not have enough credit.",
  "detail": "Your current balance is 30, but that costs 50.",
  "instance": "/account/12345/msgs/abc",
  "balance": 30,
  "accounts": ["/account/12345", "/account/67890"]
}
```

- 標準プロパティのほかに、問題の種類ごとに足すプロパティ
- `balance` は残高、`accounts` は入金できる口座へのリンク
- クライアントはdetailを解析せずに値を受け取れる

---

# 安全な拡張

<div class="cell-row">
  <div class="cell-row-name">レスポンス</div>
  <div class="cells">
    <div class="cell mono">type</div><div class="cell mono">title</div><div class="cell mono">detail</div><div class="cell mono">balance</div><div class="cell mono">accounts</div><div class="cell new">新しいメンバー</div>
  </div>
  <div class="cell-row-name">古いクライアント</div>
  <div class="cells">
    <div class="cell mark">読む</div><div class="cell mark">読む</div><div class="cell mark">読む</div><div class="cell mark">読む</div><div class="cell mark">読む</div><div class="cell">無視</div>
  </div>
</div>

- クライアントは知らない拡張メンバーを必ず無視する
- 名前は英字で始め、英数字と `_` で3文字以上にする

---

# 複数のエラー

<div class="code-pair code-sm">
<div class="head">リクエスト</div>
<div class="head">レスポンス 422</div>

```json
{
  "age": 42.3,
  "profile": {
    "color": "yellow"
  }
}
```

```json
{
  "type": "https://example.net/validation-error",
  "title": "Your request is not valid.",
  "errors": [
    {
      "detail": "must be a positive integer",
      "pointer": "#/age"
    },
    {
      "detail": "must be 'green', 'red' or 'blue'",
      "pointer": "#/profile/color"
    }
  ]
}
```

</div>

- 同じ種類の問題は `errors` にまとめる
- `pointer` はリクエストの中の場所をJSON Pointerで指す
- 種類が違う問題が重なったら、一番急ぎか重要な1つだけ返す

---

# 新しい問題の種類を作るとき

- PUTへの403のように、ステータスコードで足りるなら作らない
- IANAのレジストリに合う種類があれば、それを使う
- type URI、title、ステータスコードを必ずドキュメントに書く
- type URIの先に、解決方法を説明するHTMLを置く

---

<p class="lead-q">
フロントエンドとバックエンドの境界で<br>どう運用する？
</p>

---

# バックエンドの実装

```ts
type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  [extension: string]: unknown
}

const problem = (body: ProblemDetails & { status: number }) =>
  new Response(JSON.stringify(body), {
    status: body.status,
    headers: { "Content-Type": "application/problem+json" },
  })
```

- ステータスコードと `status` を同じ値から作る

---

# バックエンドで守ること

- スタックトレースのような実装の内部情報を返さない
- typeとinstanceは絶対URIで書く
- 既存のAPIはAcceptヘッダーを見て新旧の形を返し分ける

---

# フロントエンドで守ること

- Content-Typeが `application/problem+json` か確かめてから読む
- typeで分岐し、titleやdetailの文字列では分岐しない
- 知らないtypeと `about:blank` はステータスコードで扱う
- typeのURIを自動で開きに行かない
- 入力エラーは `errors` の `pointer` でフォームの項目に対応づける

---

# フロントエンドの実装

<div class="code-sm">

```ts
const res = await fetch("/purchase", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, application/problem+json",
  },
  body: JSON.stringify({ item: 123456, quantity: 2 }),
})

if (res.headers.get("Content-Type")?.startsWith("application/problem+json")) {
  const problem: ProblemDetails = await res.json()
  switch (problem.type ?? "about:blank") {
    case "https://example.com/probs/out-of-credit":
      showTopUp(problem)
      break
    default:
      showErrorFor(res.status)
  }
}
```

</div>

---

<p class="lead-q">
次に作るエラーレスポンスは<br>application/problem+jsonで返そう
</p>

---

# 参考資料

<ul class="refs">
  <li>RFC 9457: <a href="https://www.rfc-editor.org/rfc/rfc9457">Problem Details for HTTP APIs</a></li>
  <li>RFC 7807: <a href="https://www.rfc-editor.org/rfc/rfc7807">Problem Details for HTTP APIs</a></li>
  <li>IANA: <a href="https://www.iana.org/assignments/http-problem-types">HTTP Problem Types</a></li>
  <li>RFC 9110: <a href="https://www.rfc-editor.org/rfc/rfc9110">HTTP Semantics</a></li>
  <li>RFC 6901: <a href="https://www.rfc-editor.org/rfc/rfc6901">JavaScript Object Notation (JSON) Pointer</a></li>
</ul>

---

# ご清聴ありがとうございました
