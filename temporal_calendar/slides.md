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

# 暦の3つの種類

| 合わせるもの | calendarId |
| --- | --- |
| 季節（太陽暦） | `iso8601`、`gregory`、`buddhist`、`japanese`、`indian`、`coptic`、`ethiopic`、`ethioaa` |
| 月の満ち欠け（太陰暦） | `islamic-umalqura`、`islamic-civil`、`islamic-tbla` |
| 両方（太陰太陽暦） | `chinese`、`dangi`、`hebrew` |

---

# グレゴリオ暦

| 年 | 4で割り切れる | 100で割り切れる | 400で割り切れる | 判定 |
| --- | --- | --- | --- | --- |
| 2024 | ○ | × | × | うるう年 |
| 1900 | ○ | ○ | × | 平年 |
| 2000 | ○ | ○ | ○ | うるう年 |

- 1582年にローマ教皇グレゴリウス13世が定めた太陽暦
- 400年に97回うるう年を入れて、平均すると1年は365.2425日
- `iso8601` と `gregory` はどちらもこのグレゴリオ暦

---

# タイの仏滅紀元

- 月日はグレゴリオ暦と同じ
- 年は西暦に543を足して数える

---

# 和暦

<div class="era-strip">
  <div class="era"><div class="date">1989年1月7日まで</div><div class="name">昭和64年</div></div>
  <div class="era mark"><div class="date">1989年1月8日から</div><div class="name">平成元年</div></div>
  <div class="era"><div class="date">2019年4月30日まで</div><div class="name">平成31年</div></div>
  <div class="era mark"><div class="date">2019年5月1日から</div><div class="name">令和元年</div></div>
</div>

- 月日はグレゴリオ暦と同じ
- 年は元号で数える
- 元号法では皇位の継承があったときだけ元号を改める

---

# インド国定暦

<div class="cell-row">
  <div class="cell-row-name">月</div>
  <div class="cells tight">
    <div class="cell">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div><div class="cell">10</div><div class="cell">11</div><div class="cell">12</div>
  </div>
  <div class="cell-row-name">日数</div>
  <div class="cells tight">
    <div class="cell mark leap">30か31</div><div class="cell">31</div><div class="cell">31</div><div class="cell">31</div><div class="cell">31</div><div class="cell">31</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div><div class="cell">30</div>
  </div>
</div>

- サカ紀元を使う太陽暦
- 西暦から78を引いた年で数える
- 新年は3月22日で、うるう年だけ3月21日

---

# コプト暦とエチオピア暦

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

- どちらも新年は9月11日、年によって9月12日
- 元年はコプト暦が西暦284年、エチオピア暦が西暦8年

---

# イスラム暦

- 月の満ち欠けだけに合わせる太陰暦
- 1年は12か月で354日か355日
- 西暦622年が元年
- 季節とのずれは直さない
- 同じ月が毎年約11日ずつ早く来る

---

<CalendarAnimation scene="ramadan" />

---

# イスラム暦の計算方法

| calendarId | 決め方 |
| --- | --- |
| `islamic-umalqura` | サウジアラビアが行政で使う方式 |
| `islamic-civil` | 30年に11回うるう年を入れる表で計算し、金曜日を元年の初日にする |
| `islamic-tbla` | `islamic-civil` と同じ表で、木曜日を元年の初日にする |

<p class="lede" style="margin-top:24px;">
多くのイスラム教国では日没後に三日月が見えた日から月を始める<br>だから実際の日付は地域で変わる
</p>

---

# 中国暦と韓国の旧暦

- どちらも月を満ち欠けに合わせる太陰太陽暦
- 季節とずれてきたらうるう月を入れる
- 2025年は6月のあとにうるう6月が入って13か月
- 中国と韓国で計算に使うデータが違う
- 2027年の旧正月は中国で2月6日、韓国で2月7日

---

# ヘブライ暦

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

- 月を満ち欠けに合わせる太陰太陽暦
- 新年は秋で、グレゴリオ暦の9月か10月
- うるう年は5番目の月のあとにうるう月を足して13か月
- 19年の6939.60日と235か月の6939.69日がほぼ同じ
- 19年たつと日付と季節がまた合う

---

<p class="lead-q">
これだけバラバラな暦を<br>Temporalはどう吸収してるのか？
</p>

---

# 2026年10月5日をそれぞれの暦で表す

```js
Temporal.PlainDate.from("2026-10-05").withCalendar(calendarId)
```

<div class="table-sm">

| calendarId | 年月日 |
| --- | --- |
| `gregory` | 2026年10月5日 |
| `buddhist` | 2569年10月5日 |
| `japanese` | 令和8年10月5日 |
| `indian` | 1948年7月13日 |
| `coptic` | 1743年1月25日 |
| `ethiopic` | 2019年1月25日 |
| `islamic-umalqura` | 1448年4月24日 |
| `chinese` | 2026年8月25日 |
| `dangi` | 2026年8月25日 |
| `hebrew` | 5787年1月24日 |

</div>

---

# `PlainDate` の中身

```js
> const d = Temporal.PlainDate.from("2026-10-05")
> const h = d.withCalendar("hebrew")
> [h.year, h.month, h.day]
[ 5787, 1, 24 ]
> Temporal.PlainDate.compare(d, h)
0
```

- `PlainDate` が持つのはISO 8601の年月日と暦の2つ
- `year` や `month` はISO 8601の年月日から暦に従って計算する

---

# `month` と `monthCode`

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

- 5786年は平年、5787年はうるう年
- 5787年は6番目がうるう月で、`M06` の月は7番目にずれる
- `month` が同じ6でも別の月
- `monthCode` は同じ月ならどの年でも同じで、うるう月は `M05L`

---

# うるう月の1年後

```js
> const d = Temporal.PlainDate.from({ calendar: "hebrew", year: 5787, monthCode: "M05L", day: 1 })
> d.add({ years: 1 }).monthCode
'M06'
> d.add({ years: 1 }, { overflow: "reject" })
Uncaught RangeError
```

- 5788年は平年なので `M05L` の月がない
- 既定の `"constrain"` では `M06` に丸める

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
  <li>e-Gov法令検索: <a href="https://laws.e-gov.go.jp/law/354AC0000000043">元号法</a></li>
</ul>

---

# ご清聴ありがとうございました
