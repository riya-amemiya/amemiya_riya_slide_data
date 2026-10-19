---
theme: seriph
background: white
title: Temporal 最高!でも改めて「日付」について調べたら人類の負債すぎる件
info: |
  JavaScriptのTemporalを触っていると、calendarIdやmonthCodeといった見慣れないプロパティが出てきます。
  なぜ日付のAPIに暦の指定が必要なのかを調べると、天文学の周期と数千年分の改暦の歴史に行き着きました。
  暦がずれる理由と、Temporalがその違いをどう扱っているかを紹介します。
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
    <span class="accent">Temporal</span> 最高!<br>
    でも改めて「日付」について調べたら<br>
    人類の負債すぎる件
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

# Temporalが対応している主な暦

<div class="table-sm">

| calendarId | 暦 |
| --- | --- |
| `iso8601` | 拡張ISO 8601暦（デフォルト） |
| `gregory` | グレゴリオ暦 |
| `buddhist` | 仏滅紀元（タイなど） |
| `japanese` | 日本の和暦（令和、平成など） |
| `chinese` | 中国暦（旧暦） |
| `dangi` | 韓国の旧暦 |
| `hebrew` | ヘブライ暦（ユダヤ暦） |
| `islamic-umalqura` / `islamic-civil` / `islamic-tbla` | イスラム暦（ヒジュラ暦） |
| `indian` | インド国定暦 |
| `coptic` | コプト暦 |
| `ethiopic` / `ethioaa` | エチオピア暦 |

</div>

---

<p class="lead-q">
なんでこんなに種類があるんだっけ？
</p>

---

# 暦の元になる3つの周期

| | 何で決まるか | 長さ |
| --- | --- | --- |
| 1日 | 地球の自転 | 約24時間 |
| 1か月 | 新月から次の新月まで（朔望月） | 約29.53059日 |
| 1年 | 春分から次の春分まで（太陽年） | 約365.24219日 |

<p class="lede" style="margin-top:24px;">
どれもほかの周期の整数倍にならない
</p>

---

<CalendarAnimation scene="cycles" />

---

# 何に合わせるかで3つに分かれる

| 合わせるもの | calendarId |
| --- | --- |
| 季節（太陽暦） | `iso8601`、`gregory`、`buddhist`、`japanese`、`indian`、`coptic`、`ethiopic`、`ethioaa` |
| 月の満ち欠け（太陰暦） | `islamic-umalqura`、`islamic-civil`、`islamic-tbla` |
| 両方（太陰太陽暦） | `hebrew`、`chinese`、`dangi` |

---

# グレゴリオ暦はうるう年で季節に合わせる

```js
const isLeapYear = (year) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
```

| 年 | 4で割り切れる | 100で割り切れる | 400で割り切れる | 判定 |
| --- | --- | --- | --- | --- |
| 2024 | ○ | × | × | うるう年 |
| 1900 | ○ | ○ | × | 平年 |
| 2000 | ○ | ○ | ○ | うるう年 |

<p class="lede">
400年に97回うるう年を入れて、平均すると1年は365.2425日
</p>

---

# 月日は同じで、年の数え方が違う

```js
> const d = Temporal.PlainDate.from("2026-10-05")
> const b = d.withCalendar("buddhist")
> [b.era, b.eraYear, b.month, b.day]
[ 'be', 2569, 10, 5 ]
> const j = d.withCalendar("japanese")
> [j.era, j.eraYear, j.year, j.month, j.day]
[ 'reiwa', 8, 2026, 10, 5 ]
```

- `gregory` は `iso8601` とほぼ同じで、紀元がある
- `buddhist` は西暦に543を足して数える
- `japanese` の `year` は西暦のままで、元号の年は `eraYear` に入る
- `japanese` でも、1872年12月31日までは西暦と同じ紀元と年を使う

---

# 月の分け方から違う太陽暦

<div class="cell-row">
  <div class="cell-row-name">月</div>
  <div class="cells tight">
    <div class="cell">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div><div class="cell">10</div><div class="cell">11</div><div class="cell">12</div><div class="cell mark">13</div>
  </div>
  <div class="cell-row-name">日数</div>
  <div class="cells tight">
    <div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell mark leap">5か6</div>
  </div>
</div>

- `coptic` と `ethiopic` は30日の月を12か月並べ、13番目の月を5日か6日にする
- 2026年はどちらも9月11日に年が変わる
- `ethiopic` と `ethioaa` は年の数え始めが違い、2026年10月5日は2019年と7519年
- `indian` は12か月の暦で、2026年は3月22日に年が変わって1948年になった

---

# イスラム暦は月の満ち欠けだけに合わせる

```js
> const d = Temporal.PlainDate.from("2026-10-05").withCalendar("islamic-umalqura")
> [d.year, d.month, d.day, d.daysInYear]
[ 1448, 4, 24, 355 ]
```

- イスラム暦（ヒジュラ暦）は12か月で1年
- 1年は354日か355日で、太陽年より約11日短い
- 季節とのずれを直さないので、同じ月が来る時期が毎年約11日ずつ早まる

---

<CalendarAnimation scene="ramadan" />

---

# イスラム暦は計算方法ごとにIDが分かれる

| calendarId | 決め方 | 2026年10月5日 |
| --- | --- | --- |
| `islamic-umalqura` | サウジアラビアが行政に使う計算方式 | 1448年4月24日 |
| `islamic-civil` | 30年に11回うるう年を入れる表で計算し、金曜日を起点にする | 1448年4月22日 |
| `islamic-tbla` | 同じ表で、木曜日を起点にする | 1448年4月23日 |

<p class="lede" style="margin-top:24px;">
多くのイスラム教国では、日没後に三日月が見えた日から月を始める<br>だから実際の日付は地域で変わる
</p>

---

# ヘブライ暦は19年に7回うるう月を入れる

<div class="cell-row">
  <div class="cell-row-name">年目</div>
  <div class="cells tight">
    <div class="cell">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div><div class="cell">10</div><div class="cell">11</div><div class="cell">12</div><div class="cell">13</div><div class="cell">14</div><div class="cell">15</div><div class="cell">16</div><div class="cell">17</div><div class="cell">18</div><div class="cell">19</div>
  </div>
  <div class="cell-row-name">月の数</div>
  <div class="cells tight">
    <div class="cell">12</div><div class="cell">12</div><div class="cell leap">13</div><div class="cell">12</div><div class="cell">12</div><div class="cell leap">13</div><div class="cell">12</div><div class="cell leap">13</div><div class="cell">12</div><div class="cell">12</div><div class="cell leap">13</div><div class="cell">12</div><div class="cell">12</div><div class="cell leap">13</div><div class="cell">12</div><div class="cell">12</div><div class="cell leap">13</div><div class="cell">12</div><div class="cell leap">13</div>
  </div>
</div>

- 月を満ち欠けに合わせ、季節とずれてきたら1か月まるごと足す
- 12か月 × 12年 + 13か月 × 7年 = 235か月
- 235朔望月は6939.69日、19太陽年は6939.60日

---

<CalendarAnimation scene="metonic" />

---

# 中国暦と韓国の旧暦で旧正月がずれる

```js
> Temporal.PlainDate.from({ calendar: "chinese", year: 2027, month: 1, day: 1 }).toString()
'2027-02-06[u-ca=chinese]'
> Temporal.PlainDate.from({ calendar: "dangi", year: 2027, month: 1, day: 1 }).toString()
'2027-02-07[u-ca=dangi]'
```

- どちらも月の満ち欠けと季節の両方に合わせる太陰太陽暦
- `chinese` は紫金山天文台、`dangi` は韓国天文研究院のデータで計算する
- 2026年10月10日も、`chinese` では9月1日、`dangi` では8月30日

---

# Temporalは日付をISO 8601の年月日で持つ

```js
> const d = Temporal.PlainDate.from("2026-10-05")
> const h = d.withCalendar("hebrew")
> [h.year, h.month, h.day]
[ 5787, 1, 24 ]
> Temporal.PlainDate.compare(d, h)
0
```

- `PlainDate` が持つのは、ISO 8601の年月日と暦の2つ
- `year` や `month` は、ISO 8601の年月日から暦に従って計算する
- `withCalendar` は暦だけを差し替えるので、比べると同じ日

---

<CalendarAnimation scene="convert" />

---

# monthだけでは区別できない

<div class="cell-row">
  <div class="cell-row-name">5786年</div>
  <div class="cells">
    <div class="cell">1<span class="sub">M01</span></div><div class="cell">2<span class="sub">M02</span></div><div class="cell">3<span class="sub">M03</span></div><div class="cell">4<span class="sub">M04</span></div><div class="cell">5<span class="sub">M05</span></div><div class="cell mark">6<span class="sub">M06</span></div><div class="cell">7<span class="sub">M07</span></div><div class="cell">8<span class="sub">M08</span></div><div class="cell">9<span class="sub">M09</span></div><div class="cell">10<span class="sub">M10</span></div><div class="cell">11<span class="sub">M11</span></div><div class="cell">12<span class="sub">M12</span></div>
  </div>
  <div class="cell-row-name">5787年</div>
  <div class="cells">
    <div class="cell">1<span class="sub">M01</span></div><div class="cell">2<span class="sub">M02</span></div><div class="cell">3<span class="sub">M03</span></div><div class="cell">4<span class="sub">M04</span></div><div class="cell">5<span class="sub">M05</span></div><div class="cell mark leap">6<span class="sub">M05L</span></div><div class="cell">7<span class="sub">M06</span></div><div class="cell">8<span class="sub">M07</span></div><div class="cell">9<span class="sub">M08</span></div><div class="cell">10<span class="sub">M09</span></div><div class="cell">11<span class="sub">M10</span></div><div class="cell">12<span class="sub">M11</span></div><div class="cell">13<span class="sub">M12</span></div>
  </div>
</div>

- ヘブライ暦の5787年（2026年9月から）は13か月
- 5786年の6番目の月はアダル、5787年の6番目の月はアダル1
- うるう月は直前の月のコードに `L` を付けた `monthCode` で区別する

---

# 1年後に同じ月がない

```js
> const d = Temporal.PlainDate.from({ calendar: "hebrew", year: 5787, monthCode: "M05L", day: 1 })
> d.add({ years: 1 }).monthCode
'M06'
> d.add({ years: 1 }, { overflow: "reject" })
Uncaught RangeError
```

- 5788年は12か月の年なので、アダル1がない
- 既定の `"constrain"` では、アダル（`M06`）に丸める
- `"reject"` ではRangeErrorを投げる

---

<CalendarAnimation scene="addyear" />

---

<p class="lead-q">
人類の負債を吸収して<br>いい感じに返してくれる<br>Temporal、すごい
</p>

---

# 参考資料

<ul class="refs">
  <li>Temporal: <a href="https://tc39.es/proposal-temporal/">tc39.es/proposal-temporal</a></li>
  <li>Intl era and monthCode: <a href="https://tc39.es/proposal-intl-era-monthcode/">tc39.es/proposal-intl-era-monthcode</a></li>
  <li>British Astronomical Association: <a href="https://britastro.org/computing/data.html">Astronomical &amp; physical constants</a></li>
  <li>Inter gravissimas: <a href="https://en.wikisource.org/wiki/Translation:Inter_gravissimas">Wikisource</a></li>
  <li>CLDR: <a href="https://cldr.unicode.org/development/development-process/design-proposals/islamic-calendar-types">Islamic Calendar Types</a></li>
  <li>My Jewish Learning: <a href="https://www.myjewishlearning.com/article/the-jewish-leap-year-explained/">The Jewish Leap Year Explained</a></li>
</ul>

---

# ご清聴ありがとうございました
