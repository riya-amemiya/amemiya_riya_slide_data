---
theme: seriph
background: white
title: IsAny はなぜ any だけを見抜けるのか
info: |
  type-challengesにanyだけをtrueにするIsAnyを作ろうという問題があります。
  一見簡単そうですが、実際解き始めるとうまくいきません。
  ですがanyの特性をうまく使うととてもスマートに書けます。
  any の面白い性質について語ります。
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
  <div class="eyebrow">TypeScript / type-challenges</div>
  <h1 class="mega">
    <span class="accent">IsAny</span> はなぜ<br>
    any だけを見抜けるのか
  </h1>
  <div class="byline">西 悠太 <span class="venue">/ 株式会社ダイニー</span></div>
</div>

<!--
皆さん、こんにちは。今日は「IsAnyはなぜanyだけを見抜けるのか」というタイトルでお話しします。
type-challengesの小さな問題を入り口に、anyの面白い性質について語ります。
-->

---

<h1 style="margin-bottom:20px">自己紹介</h1>

<div class="intro-grid">
  <div class="bio">
    <p><strong>西 悠太</strong> <span>(Nishi Yuta)</span></p>
    <p>V8 Contributor</p><p>Platform Engineer at Dinii Inc.</p><p>TSKaigi Staff</p>
    <p style="margin-top:24px;">TypeScriptが好きです。<br>型パズルも好きです。</p>
    <div class="role">@riya-amemiya</div>
  </div>
  <img class="avatar" src="/icon.png" alt="プロフィール画像" />
</div>

<!--
改めまして、西悠太と申します。株式会社ダイニーでPlatform Engineerをしています。
TypeScriptが好きで、type-challengesのような型パズルもよく解いています。
-->

---

# お題は IsAny

<p class="lede">
type-challengesに、anyだけをtrueにするIsAnyを作ろうという問題があります。
</p>

```ts
type IsAny<T> = /* ??? */

type A = IsAny<any>      // true
type B = IsAny<unknown>  // false
type C = IsAny<never>    // false
type D = IsAny<string>   // false
```

<!--
お題はこれです。type-challengesに、anyだけをtrueにするIsAnyを作ろうという問題があります。
anyを渡したときだけtrue、unknownもneverもstringもfalse。
仕様はこれだけです。
-->

---

<div class="lead-q">
  一見簡単そうですが、<br>
  実際解き始めると<span class="blue">うまくいきません</span>。
</div>

<!--
一見簡単そうですよね。ですが、実際解き始めるとうまくいきません。
まず素直な書き方から試してみます。
-->

---

# まずextends の意味をおさらい

extendsはよく説明の時にif文のように説明されますが、正確には左辺は右辺の部分集合かどうかがイメージとしては近いです。
厳密には部分集合も説明としては違いますが、ここではイメージの話なのでextendsは部分集合と説明します。

```ts
type A = 1 extends 1 ? true : false  // true
type B = 1 extends 2 ? true : false  // false
```

じゃあanyにextendsしてあげると良さそうですね。

---

# 試み① T extends any

```ts
type IsAny<T> = T extends any ? true : false

type A = IsAny<any>     // true
type D = IsAny<string>  // true  ← string でも true
```

<p class="lede" style="margin-top:24px;">
どんな型でも any には代入できるので、any 以外まで true になってしまいます。
</p>

<!--
まず素直に、T extends anyと書いてみます。
ところが、どんな型でもanyには代入できるので、stringでもtrueになってしまいます。
これでは判定になりません。ちなみにneverを渡すと、条件型の分配という別の挙動でneverが返ってきて、これも期待通りにはなりません。
-->

---

# 試み② unknown extends T

```ts
type IsAny<T> = unknown extends T ? true : false

type A = IsAny<any>      // true
type B = IsAny<unknown>  // true  ← unknown まで true
type D = IsAny<string>   // false
```

<p class="lede" style="margin-top:24px;">
unknown を受け取れるのは any と unknown だけ。
<br> 惜しいところまで来ますが、unknown を除外できません。
<br>IsAnyはanyだけをtrueにしたいので、これもダメです。
</p>

<!--
次に向きを変えて、unknown extends Tと書いてみます。
unknownを受け取れる型はanyとunknownの2つだけなので、かなり惜しいところまで来ます。
でも、そのunknown自身を除外できません。ここで手が止まります。
-->

---

<div class="lead-q">
  ですが<span class="blue">anyの特性</span>をうまく使うと<br>
  とてもスマートに書けます。
</div>

<!--
ですが、anyの特性をうまく使うと、とてもスマートに書けます。
答えを先に見せます。
-->

---

# 答えは、この1行

```ts
type IsAny<T> = 0 extends 1 & T ? true : false
// 0と1の部分は絶対に重ならない2つのリテラル型ならなんでもいいです
```

<!--
答えはこの1行です。0 extends 1 & T。
0と1という、絶対に重ならない2つのリテラル型が鍵です。
なぜこれでanyだけを見抜けるのか、分解して見ていきます。
-->

---

# 交差型について考えてみる

交差型はAとBの両方を満たす型を作れる演算子です。<br>
基本的には狭い方を優先します。<br>
先ほどの例を簡単に表現すると

```ts
type IsAny<T> = 0 extends 1 & T ? true : false
```

は「Tは1と交差可能で、かつ0の部分集合になる型である」と言い換えられるのではないでしょうか。<br>
1はnumberより狭い型なので、普通に考えるとこれを満たす型はないはずです。

---

# 分解① 1 & T

```ts
type T1 = 1 & number   // 1
type T2 = 1 & string   // never
type T3 = 1 & unknown  // 1
type T4 = 1 & never    // never
type T5 = 1 & any      // any
```

<p class="lede" style="margin-top:24px;">
anyだけは全ての型と交差可能で、その交差の結果はanyになります。
</p>

<!--
まず右側の1 & Tです。
1とnumberの交差は1、1とstringは重ならないのでnever、unknownは交差の単位元なので1のまま、neverと交わせばnever。
つまりany以外を入れても、結果は1かneverにしかなりません。
ところがanyだけは、交差を丸ごと飲み込んでanyになります。
-->

---

# 分解② 0 extends 1

```ts
type R1 = 0 extends 1     ? true : false  // false
type R2 = 0 extends never ? true : false  // false
type R3 = 0 extends any   ? true : false  // true
```

<p class="lede" style="margin-top:24px;">
0 は 1 にも never にも代入できないので、<code>0 extends 1 & T</code> は本来「絶対に false」の式です<br>
それを true にできる唯一の抜け道が any です。
</p>

<!--
次に左側です。0は1にも代入できないし、neverにも代入できません。
つまり0 extends 1 & Tは、本来なら絶対にfalseになる式です。
その絶対falseをtrueにできる唯一の抜け道が、何でも受け取るanyです。
0と1でなくてもよくて、互いに代入できない2つの型なら同じ仕掛けが成立します。
-->

---

# 評価を追う

```
IsAny<string>   0 extends 1 & string   →  0 extends never   →  false
IsAny<number>   0 extends 1 & number   →  0 extends 1       →  false
IsAny<unknown>  0 extends 1 & unknown  →  0 extends 1       →  false
IsAny<any>      0 extends 1 & any      →  0 extends any     →  true
```

<p class="lede" style="margin-top:24px;">
前述の2つの性質を同時に持つ型は any しかありません
</p>

<!--
流れを通しで追うとこうなります。
stringなら交差がneverになってfalse、numberとunknownなら1が残ってfalse。
anyのときだけ交差がanyに化けて、0 extends anyでtrueです。
交差を飲み込む性質と、何でも受け取る性質。この2つを同時に持つ型はanyしかありません。
-->

---

# any は、上でも下でもある

<div class="two-col" style="grid-template-columns:1fr 1fr 1fr; gap:28px;">
  <div>
    <div class="col-label">unknown</div>
    <p class="lede" style="font-size:0.95em;">何でも受け取れるが、他の型には入れない</p>
  </div>
  <div>
    <div class="col-label">never</div>
    <p class="lede" style="font-size:0.95em;">どの型にも入れるが、何も受け取れない</p>
  </div>
  <div>
    <div class="col-label">any</div>
    <p class="lede" style="font-size:0.95em;">両方できる。型の階層の外にいる</p>
  </div>
</div>

<p class="lede" style="margin-top:36px;">
any は「型チェックをやめる」ための型なので、代入の階層に縛られません。<br>
IsAny は、この階層の外にいる性質そのものを検出しています。
</p>

<!--
なぜanyだけがこう振る舞えるのか。
unknownは何でも受け取れますが、他の型には入れません。上端の型です。
neverはどの型にも入れますが、何も受け取れません。下端の型です。
anyは両方できます。型チェックをやめるための型なので、代入の階層に縛られていません。
IsAnyが検出しているのは、まさにこの「階層の外にいる」という性質そのものです。
-->

---

# おまけ① 条件型は両方の枝を返す

```ts
type X = any extends string ? 1 : 2   // 1 | 2
```

<p class="lede" style="margin-top:24px;">
判定される側に any を置くと、true とも false とも決められないので、<br>
両方の枝のユニオンが返ってきます。
</p>

<!--
おまけとして、anyの面白い性質をもう2つ紹介します。
条件型の判定される側にanyを置くと、trueともfalseとも決められないので、両方の枝のユニオンが返ってきます。
1か2ではなく、1または2です。初見だとかなり驚く挙動です。
-->

---

# おまけ② any が唯一入れない場所

```ts
declare const a: any

const s: string = a  // OK
const n: never = a   // Error: Type 'any' is not assignable to type 'never'
```

<p class="lede" style="margin-top:24px;">
何にでも代入できる any が、唯一 never にだけは入れません。
</p>

<!--
もう1つ。何にでも代入できるanyですが、唯一neverにだけは入れません。
neverは値が存在しないことを表す型なので、ここだけは型チェックをやめる型でも通してもらえません。
-->

---

# 今日覚えて帰ってほしいこと

<ul class="takeaways">
  <li>IsAny は <code>0 extends 1 & T</code> の1行で書ける</li>
  <li>交差型を丸ごと飲み込むのは any だけ</li>
  <li>「絶対に false」の代入を true にできるのも any だけ</li>
  <li>any は上にも下にも振る舞う、型の階層の外の型</li>
</ul>

<!--
今日覚えて帰ってほしいことは4つです。
IsAnyは0 extends 1 & Tの1行で書けること。
交差型を丸ごと飲み込むのはanyだけであること。
絶対にfalseの代入をtrueにできるのもanyだけであること。
そして、anyは上にも下にも振る舞う、型の階層の外の型だということです。
-->

---

# 参考資料

<ul class="refs">
  <li>GitHub: <a href="https://github.com/type-challenges/type-challenges">type-challenges/type-challenges</a></li>
  <li>TypeScript Handbook: <a href="https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any">Everyday Types — any</a></li>
</ul>

<!--
参考資料です。type-challengesはこのIsAny以外にも面白い問題が揃っているので、型パズルに興味が湧いたらぜひ。
-->

---

# ご清聴ありがとうございました

<div class="thanks">
  <div>0 extends 1 & T。</div>
  <strong>この1行に、any のすべてが詰まっている。</strong>
</div>

<!--
ご清聴ありがとうございました。
0 extends 1 & T。この1行に、anyのすべてが詰まっています。
次にanyを見かけたら、階層の外にいるあの型か、と思い出してもらえたら嬉しいです。
-->
