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

# Dateのつらいところ

- 月が0始まり
- 値をあとから書き換えられる
- 文字列の書き方で、UTCとして読むかローカル時刻として読むかが変わる

---

# 2月31日が3月3日になる

```js
> const d = new Date(2026, 0, 31)
> d.setMonth(1)
> d.toDateString()
'Tue Mar 03 2026'
```

- 0が1月、1が2月
- `setMonth` は `d` そのものを書き換える
- 存在しない2月31日は、エラーにならずに3月3日へ進む

---

# 日付だけの文字列はUTCになる

```js
> new Date("2026-10-05").getHours()
9
> new Date("2026-10-05T00:00").getHours()
0
```

- 日本時間で実行した結果
- 日付だけの形式はUTC、時刻付きの形式はローカル時刻として解釈する

---

# Temporalは用途ごとに型を分けた

| 型 | 表すもの |
| --- | --- |
| `PlainDate` | 日付 |
| `PlainTime` | 時刻 |
| `PlainDateTime` | 日付と時刻 |
| `PlainYearMonth` | 年と月 |
| `PlainMonthDay` | 月と日 |
| `ZonedDateTime` | タイムゾーン付きの日付と時刻 |
| `Instant` | 時間軸上の1点 |
| `Duration` | 期間 |

---

# 値は書き換わらない

```js
> const d = Temporal.PlainDate.from("2026-01-31")
> d.month
1
> d.add({ months: 1 }).toString()
'2026-02-28'
> d.toString()
'2026-01-31'
```

- 月は1始まり
- `add` は新しい値を返し、`d` はそのまま
- 2月31日は2月28日に丸める

---

<p class="lead-q">
Temporal 最高!
</p>

---

# でも見慣れないプロパティがある

```js
> const d = Temporal.PlainDate.from("2026-10-05")
> d.calendarId
'iso8601'
> d.monthCode
'M10'
```

- 日付を作っただけなのに、暦を表す `calendarId` がある
- `month` とは別に `monthCode` がある
- `Temporal.Calendar` は2024年6月に削除され、暦は文字列で指定する

<p class="lede">
なぜ日付のAPIに暦の指定が要るのか
</p>

---

<p class="lead-q">
調べてみたら<br>天文学と歴史が積み上げた<br>数千年分の負債が出てきた
</p>

---

# なぜ暦はずれるのか

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

# 1年に月も日も収まらない

<div class="span-fig">
  <div class="span-name">太陽年</div>
  <div class="span-track" style="--end:657px"><div class="span-bar year" style="width:657px"></div></div>
  <div class="span-note">365.24219日</div>
  <div class="span-name">12か月</div>
  <div class="span-track" style="--end:657px"><div class="span-bar moon" style="width:638px"></div><div class="span-gap" style="left:638px;width:19px"></div></div>
  <div class="span-note">354.37日で、10.88日足りない</div>
  <div class="span-name">13か月</div>
  <div class="span-track" style="--end:657px"><div class="span-bar moon" style="width:657px"></div><div class="span-bar over" style="left:657px;width:34px"></div></div>
  <div class="span-note">383.90日で、18.66日はみ出す</div>
</div>

<p class="lede">
1年を365日にしても、0.24219日余る
</p>

---

<CalendarAnimation scene="cycles" />

---

# ユリウス暦は4年に1回うるう年

- 平年は365日、4年に1回366日
- 平均すると1年は365.25日
- 太陽年より0.00781日長く、128年で1日ずれる

---

# 春分の日が10日早まった

<div class="cell-row">
  <div class="cell-row-name">325年</div>
  <div class="cells">
    <div class="cell">10</div><div class="cell">11</div><div class="cell">12</div><div class="cell">13</div><div class="cell">14</div><div class="cell">15</div><div class="cell">16</div><div class="cell">17</div><div class="cell">18</div><div class="cell">19</div><div class="cell">20</div><div class="cell mark">21</div>
  </div>
  <div class="cell-row-name">1582年</div>
  <div class="cells">
    <div class="cell">10</div><div class="cell mark">11</div><div class="cell">12</div><div class="cell">13</div><div class="cell">14</div><div class="cell">15</div><div class="cell">16</div><div class="cell">17</div><div class="cell">18</div><div class="cell">19</div><div class="cell">20</div><div class="cell">21</div>
  </div>
</div>

- ニカイア公会議（325年）は春分を3月21日とした
- 1582年には、春分が3月11日ごろに来ていた

---

<CalendarAnimation scene="drift" />

---

# 1582年10月、10日間を消した

<div class="month-grid">
  <div class="dow">日</div><div class="dow">月</div><div class="dow">火</div><div class="dow">水</div><div class="dow">木</div><div class="dow">金</div><div class="dow">土</div>
  <div class="day blank"></div><div class="day">1</div><div class="day">2</div><div class="day">3</div><div class="day mark">4</div><div class="day mark">15</div><div class="day">16</div>
  <div class="day">17</div><div class="day">18</div><div class="day">19</div><div class="day">20</div><div class="day">21</div><div class="day">22</div><div class="day">23</div>
  <div class="day">24</div><div class="day">25</div><div class="day">26</div><div class="day">27</div><div class="day">28</div><div class="day">29</div><div class="day">30</div>
  <div class="day">31</div>
</div>

<p class="lede">
春分を3月21日に戻すため、グレゴリウス13世が改暦した
</p>

---

# グレゴリオ暦のうるう年

```js
const isLeapYear = (year) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
```

| 年 | 4で割り切れる | 100で割り切れる | 400で割り切れる | 判定 |
| --- | --- | --- | --- | --- |
| 2024 | ○ | × | × | うるう年 |
| 1900 | ○ | ○ | × | 平年 |
| 2000 | ○ | ○ | ○ | うるう年 |

---

# 400年に97回

- 400年は146,097日
- 平均すると1年は365.2425日
- 太陽年より0.00031日長い

---

<p class="lead-q">
うるう年の条件を3つ重ねても<br>約3,200年で1日ずれる
</p>

---

# JavaScriptでは1582年10月5日も作れる

```js
> new Date(1582, 9, 5).toDateString()
'Tue Oct 05 1582'
> Temporal.PlainDate.from("1582-10-05").toString()
'1582-10-05'
```

- 1582年10月5日から14日は、その年に改暦した国には存在しない
- DateもTemporalも、グレゴリオ暦を1582年より前にも当てはめるので、エラーにならない

---

# グレゴリオ暦の外側

---

# 暦は何に合わせるかで分かれる

| 合わせるもの | 暦の例 | calendarId |
| --- | --- | --- |
| 季節（太陽暦） | グレゴリオ暦、ペルシャ暦 | `gregory`, `persian` |
| 月の満ち欠け（太陰暦） | イスラム暦 | `islamic-umalqura` など |
| 両方（太陰太陽暦） | ヘブライ暦、中国暦 | `hebrew`, `chinese` |
| 元号で年を数える | 和暦 | `japanese` |

<p class="lede" style="margin-top:24px;">
Intlに対応した処理系では、16種類の暦を指定できる
</p>

---

# 太陽暦は季節に合わせる

```js
> const d = Temporal.PlainDate.from("2026-03-21").withCalendar("persian")
> [d.year, d.month, d.day]
[ 1405, 1, 1 ]
```

- ペルシャ暦は春分のころに年が変わる
- 2026年3月21日がペルシャ暦1405年の元日

---

# 太陰暦は月の満ち欠けだけに合わせる

```js
> const d = Temporal.PlainDate.from("2026-10-05").withCalendar("islamic-umalqura")
> [d.year, d.month, d.day, d.daysInYear]
[ 1448, 4, 24, 355 ]
```

- イスラム暦（ヒジュラ暦）は12か月で1年
- 1年は354日か355日で、太陽年より約11日短い
- 季節とのずれを直さないので、同じ月が来る時期が毎年約11日ずつ早まる

---

# ラマダンの時期が毎年早まる

| ヒジュラ暦 | ラマダンの初日 |
| --- | --- |
| 1445年 | 2024年3月11日 |
| 1446年 | 2025年3月1日 |
| 1447年 | 2026年2月18日 |
| 1448年 | 2027年2月8日 |

<p class="lede">
<code>islamic-umalqura</code> で計算した日付
</p>

---

<CalendarAnimation scene="ramadan" />

---

# イスラム暦にも種類がある

| calendarId | 決め方 | 2026年10月5日 |
| --- | --- | --- |
| `islamic-umalqura` | サウジアラビアが行政に使う計算方式 | 1448年4月24日 |
| `islamic-civil` | 30年に11回うるう年を入れる表で計算し、金曜日を起点にする | 1448年4月22日 |
| `islamic-tbla` | 同じ表で、木曜日を起点にする | 1448年4月23日 |

<p class="lede" style="margin-top:24px;">
多くのイスラム教国では、日没後に三日月が見えた日から月を始める<br>だから実際の日付は地域で変わる
</p>

---

# 太陰太陽暦はうるう月を入れる

- ヘブライ暦と中国暦は、月を満ち欠けに合わせる
- 季節とずれてきたら1か月まるごと足して、13か月の年にする

---

# ヘブライ暦は19年に7回

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

- 12か月 × 12年 + 13か月 × 7年 = 235か月
- 235朔望月は6939.69日、19太陽年は6939.60日

---

<CalendarAnimation scene="metonic" />

---

# 和暦は改元で年が1に戻る

<div class="era-strip">
  <div class="era"><div class="date">1989年1月7日まで</div><div class="name">昭和64年</div></div>
  <div class="era mark"><div class="date">1989年1月8日から</div><div class="name">平成元年</div></div>
  <div class="era"><div class="date">2019年4月30日まで</div><div class="name">平成31年</div></div>
  <div class="era mark"><div class="date">2019年5月1日から</div><div class="name">令和元年</div></div>
</div>

```js
> const d = Temporal.PlainDate.from("2019-05-01").withCalendar("japanese")
> [d.era, d.eraYear]
[ 'reiwa', 1 ]
```

- 月日はグレゴリオ暦と同じで、年だけ元号で数える
- 元号法では、元号は皇位の継承があったときに限り改める

---

# Temporalは暦をどう扱うか

---

# 日付の実体はISO 8601の年月日

- `PlainDate` が持つのは、ISO 8601の年月日と暦の2つ
- `year` や `month` は、ISO 8601の年月日から暦に従って計算する

| calendarId | year | month | monthCode | day |
| --- | --- | --- | --- | --- |
| `iso8601` | 2026 | 10 | `M10` | 5 |
| `hebrew` | 5787 | 1 | `M01` | 24 |
| `chinese` | 2026 | 8 | `M08` | 25 |
| `islamic-umalqura` | 1448 | 4 | `M04` | 24 |
| `persian` | 1405 | 7 | `M07` | 13 |

---

# 暦を変えても同じ日

```js
> const d = Temporal.PlainDate.from("2026-10-05")
> const h = d.withCalendar("hebrew")
> [h.year, h.month, h.day]
[ 5787, 1, 24 ]
> Temporal.PlainDate.compare(d, h)
0
```

- `withCalendar` は暦だけを差し替える
- `compare` はISO 8601の年月日で比べる

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

---

<CalendarAnimation scene="leapmonth" />

---

# monthCodeの決まり

- 普通の月は `M01` から `M12`
- うるう月は、直前の月のコードに `L` を付ける
- ヘブライ暦のアダル1は `M05L`、アダル2は `M06`

```js
> Temporal.PlainDate.from({ calendar: "hebrew", year: 5786, month: 6, day: 1 }).monthCode
'M06'
> Temporal.PlainDate.from({ calendar: "hebrew", year: 5787, month: 6, day: 1 }).monthCode
'M05L'
```

---

# 中国暦の閏6月

```js
> const d = Temporal.PlainDate.from({ calendar: "chinese", year: 2025, monthCode: "M06L", day: 1 })
> d.toString()
'2025-07-25[u-ca=chinese]'
> d.month
7
```

- 2025年は6月のあとに閏6月が入った
- 閏6月は7番目の月なので、`month` は7

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

# overflowで丸めるか、エラーにするかを選ぶ

| `overflow` | 存在しない日付を指定したとき |
| --- | --- |
| `"constrain"`（既定） | 月と日を有効な範囲に収める |
| `"reject"` | RangeErrorを投げる |

```js
> Temporal.PlainDate.from({ year: 2026, month: 2, day: 31 }).toString()
'2026-02-28'
> Temporal.PlainDate.from({ year: 2026, month: 2, day: 31 }, { overflow: "reject" })
Uncaught RangeError
```

<p class="lede">
Dateの <code>setMonth</code> は、2月31日をエラーなしで3月3日にしていた
</p>

---

# 存在しない時刻はdisambiguationで扱う

```js
> const s = "2026-03-08T02:30[America/New_York]"
> Temporal.ZonedDateTime.from(s).toString()
'2026-03-08T03:30:00-04:00[America/New_York]'
> Temporal.ZonedDateTime.from(s, { disambiguation: "reject" })
Uncaught RangeError
```

- ニューヨークでは、夏時間が始まる日に2時台がなく、終わる日に1時台が2回ある
- `disambiguation` は `"compatible"`（既定）、`"earlier"`、`"later"`、`"reject"` から選ぶ

---

# まとめ

- 1日と1か月と1年の周期が互いに割り切れないので、暦はずれる
- うるう年も1582年の10日間の削除も、ずれを直すための補正
- イスラム暦は季節を追わず、ヘブライ暦と中国暦はうるう月を入れ、和暦は改元で年が1に戻る
- Temporalは日付をISO 8601の年月日で持ち、暦は計算するときに当てはめる
- うるう月は `monthCode`、存在しない日付は `overflow` で扱う

---

<p class="lead-q">
人類の負債に怯えず<br>Temporalを使おう
</p>

---

# 参考資料

<ul class="refs">
  <li>Temporal: <a href="https://tc39.es/proposal-temporal/">tc39.es/proposal-temporal</a></li>
  <li>Intl era and monthCode: <a href="https://tc39.es/proposal-intl-era-monthcode/">tc39.es/proposal-intl-era-monthcode</a></li>
  <li>ECMA-262 Date: <a href="https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-time-values-and-time-range">Time Values and Time Range</a></li>
  <li>Temporal polyfill 0.5.0: <a href="https://github.com/js-temporal/temporal-polyfill/blob/main/CHANGELOG.md">CHANGELOG</a></li>
  <li>British Astronomical Association: <a href="https://britastro.org/computing/data.html">Astronomical &amp; physical constants</a></li>
  <li>Inter gravissimas: <a href="https://en.wikisource.org/wiki/Translation:Inter_gravissimas">Wikisource</a></li>
  <li>CLDR: <a href="https://cldr.unicode.org/development/development-process/design-proposals/islamic-calendar-types">Islamic Calendar Types</a></li>
  <li>My Jewish Learning: <a href="https://www.myjewishlearning.com/article/the-jewish-leap-year-explained/">The Jewish Leap Year Explained</a></li>
  <li>e-Gov法令検索: <a href="https://laws.e-gov.go.jp/law/354AC0000000043">元号法</a></li>
  <li>Fondation Napoléon: <a href="https://www.napoleon.org/histoire-des-2-empires/calendrier-republicain">Le calendrier républicain</a></li>
  <li>Calendrical Calculations: <a href="https://www.cambridge.org/core/books/calendrical-calculations/balinese-pawukon-calendar/AE3E7D55A609FFA3017A40C70A15A758">The Balinese Pawukon Calendar</a></li>
  <li>Library and Archives Canada: <a href="https://thediscoverblog.com/2024/02/29/no-leap-of-faith/">No Leap of Faith</a></li>
  <li>NASA GISS: <a href="https://www.giss.nasa.gov/tools/mars24/help/notes.html">Mars24 Technical Notes</a></li>
</ul>

---

# ご清聴ありがとうございました

---

# Temporalにない暦

---

# Temporalで使える暦は組み込みのものだけ

- 2024年6月に、独自の暦を定義する機能が削除された
- ここから先の暦は、Temporalでは扱えない

---

# フランス革命暦

<div class="cell-row">
  <div class="cell-row-name">1デカード目</div>
  <div class="cells tight">
    <div class="cell">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div><div class="cell">7</div><div class="cell">8</div><div class="cell">9</div><div class="cell">10</div>
  </div>
  <div class="cell-row-name">2デカード目</div>
  <div class="cells tight">
    <div class="cell">11</div><div class="cell">12</div><div class="cell">13</div><div class="cell">14</div><div class="cell">15</div><div class="cell">16</div><div class="cell">17</div><div class="cell">18</div><div class="cell">19</div><div class="cell">20</div>
  </div>
  <div class="cell-row-name">3デカード目</div>
  <div class="cells tight">
    <div class="cell">21</div><div class="cell">22</div><div class="cell">23</div><div class="cell">24</div><div class="cell">25</div><div class="cell">26</div><div class="cell">27</div><div class="cell">28</div><div class="cell">29</div><div class="cell">30</div>
  </div>
</div>

- 1793年10月5日に国民公会が導入を決め、1792年9月22日を起点にした
- 30日の月を12か月並べ、年末に5日か6日を足す
- 7日の週をやめて、10日のデカードにした
- 1806年1月1日にグレゴリオ暦へ戻った

---

# 時刻も10進法にした

- 1日10時間、1時間100分、1分100秒
- 1795年4月7日に、国民公会が十進時刻を無期限に停止した

---

# バリ島のパウコン暦

- 1日から10日まで、長さの違う10種類の週が同時に進む
- 基本は5日、6日、7日の週で、210日はその最小公倍数
- ほかの週は、日を繰り返すなどして210日に合わせる
- 5日の週のKliwonと7日の週のSaniscaraが重なる日がTumpekで、35日ごとに来る

---

<CalendarAnimation scene="pawukon" />

---

# 国際固定暦

<div class="month-grid">
  <div class="dow">日</div><div class="dow">月</div><div class="dow">火</div><div class="dow">水</div><div class="dow">木</div><div class="dow">金</div><div class="dow">土</div>
  <div class="day">1</div><div class="day">2</div><div class="day">3</div><div class="day">4</div><div class="day">5</div><div class="day">6</div><div class="day">7</div>
  <div class="day">8</div><div class="day">9</div><div class="day">10</div><div class="day">11</div><div class="day">12</div><div class="day mark">13</div><div class="day">14</div>
  <div class="day">15</div><div class="day">16</div><div class="day">17</div><div class="day">18</div><div class="day">19</div><div class="day">20</div><div class="day">21</div>
  <div class="day">22</div><div class="day">23</div><div class="day">24</div><div class="day">25</div><div class="day">26</div><div class="day">27</div><div class="day">28</div>
</div>

- Moses B. Cotsworthの案で、28日の月が13か月
- 13番目の月Solは6月と7月のあいだ
- 毎月1日が日曜日なので、13日はいつも金曜日
- コダックは1989年まで、社内会計に13か月暦を使っていた

---

# 火星の暦

| | 地球 | 火星 |
| --- | --- | --- |
| 1日 | 24時間 | 24時間39分35.244秒（1ソル） |
| 1年 | 約365.24日 | 約668.6ソル |

- Thomas Gangaleのダリアン暦は、1年を24か月に分ける
- 地球の1日と1年を前提にした日付のAPIは、そのままでは使えない
