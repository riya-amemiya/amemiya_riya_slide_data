#!/usr/bin/env bun

import { parseArgs } from "node:util";

type Severity = "warn" | "info";

type Finding = {
  readonly rule: string;
  readonly severity: Severity;
  readonly line: number;
  readonly message: string;
  readonly snippet: string;
};

type LineKind =
  | "frontmatter"
  | "fence"
  | "code"
  | "blank"
  | "heading"
  | "table"
  | "quote"
  | "markup"
  | "list"
  | "nested"
  | "text";

type Line = {
  readonly number: number;
  readonly raw: string;
  readonly kind: LineKind;
  readonly prose: string;
};

type Sentence = {
  readonly line: number;
  readonly text: string;
  readonly inBody: boolean;
};

type PatternRule = {
  readonly rule: string;
  readonly severity: Severity;
  readonly pattern: RegExp;
  readonly message: string;
};

type Metrics = {
  readonly chars: number;
  readonly boldCount: number;
  readonly boldPer1000: number;
  readonly listRatio: number;
};

type Report = {
  readonly score: number;
  readonly metrics: Metrics;
  readonly findings: readonly Finding[];
};

const EXIT_SUCCESS = 0;
const EXIT_FINDINGS = 1;
const EXIT_USAGE = 2;

const MIN_CHARS_FOR_DENSITY = 300;
const BOLD_PER_1000_LIMIT = 2;
const LIST_RATIO_LIMIT = 0.25;
const SENTENCE_END_STREAK = 3;
const PENALTY: Readonly<Record<Severity, number>> = { warn: 5, info: 2 };

const JAPANESE = "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\u30FC]";
const HAS_JAPANESE = new RegExp(JAPANESE, "u");
const SPACED = new RegExp(`${JAPANESE} +[A-Za-z0-9]|[A-Za-z0-9] +${JAPANESE}`, "gu");
const TIGHT = new RegExp(`${JAPANESE}[A-Za-z0-9]|[A-Za-z0-9]${JAPANESE}`, "gu");
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/gu;
const BOLD = /\*\*[^*]+\*\*/g;
const FENCE = /^(`{3,}|~{3,})/;
const HEADING = /^#{1,6}\s+/;
const LIST_MARKER = /^([-*+]|\d+\.)\s+/;
const LINK_ONLY_ITEM = /^([-*+]|\d+\.)\s+\[[^\]]*\]\(https?:\/\/[^)]*\)\s*$/;
const SENTENCE_BREAK = /(?<=[。！？])(?![」』）)])/u;
const TERMINATED = /[。！？][」』）)]*$/u;
const TRAILING_CLOSERS = /[。！？」』）)\s]+$/u;
const TRAILING_COLON = /[：:]$/;
const SENTENCE_ENDINGS: readonly string[] = ["でした", "ました", "である", "だろう", "です", "ます", "だ"];
const PROSE_KINDS: ReadonlySet<LineKind> = new Set(["text", "list", "nested"]);
const SPACING_KINDS: ReadonlySet<LineKind> = new Set(["text", "list", "nested", "heading"]);
const VISIBLE_KINDS: ReadonlySet<LineKind> = new Set([
  "heading",
  "table",
  "quote",
  "markup",
  "list",
  "nested",
  "text",
]);

const METAPHOR_VERBS: readonly RegExp[] = [
  /(地味に|じわじわ|じわりと)効|効いてく/u,
  /静かに(壊れ|落ち|失敗|沈黙|止ま)/u,
  /黙って(無視|捨て|スキップ|破棄|握りつぶ)/u,
  /側に倒[さしすせそ]/u,
  /(時間|一日|半日|日|週間?)を?溶か/u,
  /ずつ潰[さしすせそ]/u,
  /まで踏み込[まみむめも]/u,
  /ながら引き返/u,
  /に収斂[しす]/u,
  /した瞬間/u,
  /(前提|土台|基盤)が崩れ/u,
  /(文化|プロセス)が(醸成|定着)/u,
];

const AI_VOCABULARY: readonly string[] = [
  "手触り",
  "肌感",
  "温度感",
  "熱量",
  "血の通った",
  "泥臭",
  "解像度",
  "腹落ち",
  "メンタルモデル",
  "地に足のついた",
  "等身大",
  "本質的",
  "体温",
  "真理",
  "虚飾",
  "境地",
  "美学",
  "深淵",
  "極致",
  "宿命",
  "冷徹",
  "禁欲的",
  "優美",
  "落とし穴",
  "羅針盤",
  "起爆剤",
  "触媒",
  "意思決定OS",
  "意思決定 OS",
  "正本",
];

const SENTENCE_RULES: readonly PatternRule[] = [
  ...METAPHOR_VERBS.map(
    (pattern): PatternRule => ({
      rule: "metaphor-verb",
      severity: "warn",
      pattern,
      message: "Metaphorical verb; write the concrete operation or state change.",
    }),
  ),
  {
    rule: "opening-filler",
    severity: "warn",
    pattern:
      /^(まず|ここで)?(重要なのは|大切なのは|ポイントは|結論から言うと|正直に言うと|避けたいのは|注目すべきは|注目したいのは)/u,
    message: "Opening filler; start from the point itself.",
  },
  {
    rule: "stock-closing",
    severity: "warn",
    pattern:
      /いかがでした(でしょう)?か|ぜひ(参考|試し|活用)(に)?して(みて)?ください|参考になれば幸いです|というわけです|に他な(りません|らない)|と言えるでしょう|面白いのはここです/u,
    message: "Stock closing or self-labeling phrase; end on the content itself.",
  },
  {
    rule: "negative-contrast",
    severity: "info",
    pattern: /(?<!だけ)ではなく/u,
    message: "Not-A-but-B contrast; state B directly unless a likely misreading needs correcting.",
  },
];

const HELP_TEXT = `Usage: slop-lint.ts [options] [file]

Flags patterns typical of AI-generated Japanese prose in a Markdown file
and prints a 0-100 score (5 points off per warning, 2 per info finding).

Arguments:
  [file]      Markdown file to check (reads stdin when omitted)

Options:
  --json      Output the report as JSON
  --strict    Exit with 1 when any warning is found
  --help      Print this help text

Exit codes:
  0  Success
  1  Warnings found under --strict
  2  Usage / input error

Examples:
  bun scripts/slop-lint.ts draft.md
  bun scripts/slop-lint.ts --strict --json draft.md
  cat draft.md | bun scripts/slop-lint.ts`;

const log = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const countMatches = (text: string, pattern: RegExp): number => [...text.matchAll(pattern)].length;

const round = (value: number): number => Math.round(value * 10) / 10;

const kindOf = (raw: string): LineKind => {
  const trimmed = raw.trim();
  if (trimmed === "") return "blank";
  if (HEADING.test(trimmed)) return "heading";
  if (trimmed.startsWith("|")) return "table";
  if (trimmed.startsWith(">")) return "quote";
  if (/^(<|!\[|\[!\[)/.test(trimmed)) return "markup";
  if (LIST_MARKER.test(trimmed)) return "list";
  if (/^\s/.test(raw)) return "nested";
  return "text";
};

const toProse = (raw: string): string =>
  raw
    .trim()
    .replace(HEADING, "")
    .replace(LIST_MARKER, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|\*/g, "")
    .trim();

const classify = (source: string): readonly Line[] => {
  const rawLines = source.split(/\r?\n/);
  const frontmatterEnd =
    rawLines[0]?.trim() === "---"
      ? rawLines.findIndex((raw, index) => index > 0 && raw.trim() === "---")
      : -1;
  return rawLines.reduce<{ readonly fence: string | null; readonly lines: readonly Line[] }>(
    (state, raw, index) => {
      const marker = raw.trim().match(FENCE)?.[1];
      const closesFence = state.fence !== null && marker !== undefined && marker.startsWith(state.fence);
      const opensFence = state.fence === null && marker !== undefined;
      const kind: LineKind =
        index <= frontmatterEnd
          ? "frontmatter"
          : opensFence || closesFence
            ? "fence"
            : state.fence !== null
              ? "code"
              : kindOf(raw);
      const prose = SPACING_KINDS.has(kind) ? toProse(raw) : "";
      return {
        fence: opensFence && marker !== undefined ? marker : closesFence ? null : state.fence,
        lines: [...state.lines, { number: index + 1, raw, kind, prose }],
      };
    },
    { fence: null, lines: [] },
  ).lines;
};

const splitSentences = (text: string): readonly string[] =>
  text
    .split(SENTENCE_BREAK)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const sentencesOf = (lines: readonly Line[]): readonly Sentence[] => {
  const final = lines.reduce<{
    readonly pending: Sentence | null;
    readonly sentences: readonly Sentence[];
  }>(
    (state, line) => {
      if (line.kind !== "text") {
        const flushed = state.pending === null ? [] : [state.pending];
        const own = PROSE_KINDS.has(line.kind)
          ? splitSentences(line.prose).map((text) => ({ line: line.number, text, inBody: false }))
          : [];
        return { pending: null, sentences: [...state.sentences, ...flushed, ...own] };
      }
      const startLine = state.pending?.line ?? line.number;
      const parts = splitSentences(`${state.pending?.text ?? ""}${line.prose}`);
      const last = parts.at(-1);
      const carried = last !== undefined && !TERMINATED.test(last) ? last : null;
      const complete = carried === null ? parts : parts.slice(0, -1);
      const lineOf = (index: number): number => (index === 0 ? startLine : line.number);
      return {
        pending:
          carried === null ? null : { line: lineOf(complete.length), text: carried, inBody: true },
        sentences: [
          ...state.sentences,
          ...complete.map((text, index) => ({ line: lineOf(index), text, inBody: true })),
        ],
      };
    },
    { pending: null, sentences: [] },
  );
  return final.pending === null ? final.sentences : [...final.sentences, final.pending];
};

const endingOf = (text: string): string | null => {
  const stripped = text.replace(TRAILING_CLOSERS, "");
  return SENTENCE_ENDINGS.find((ending) => stripped.endsWith(ending)) ?? null;
};

const checkSentenceEndStreaks = (sentences: readonly Sentence[]): readonly Finding[] =>
  sentences.reduce<{
    readonly ending: string | null;
    readonly count: number;
    readonly findings: readonly Finding[];
  }>(
    (state, sentence) => {
      const ending = sentence.inBody ? endingOf(sentence.text) : null;
      const count = ending !== null && ending === state.ending ? state.count + 1 : 1;
      const found: readonly Finding[] =
        ending !== null && count === SENTENCE_END_STREAK
          ? [
              {
                rule: "sentence-end-streak",
                severity: "warn",
                line: sentence.line,
                message: `${SENTENCE_END_STREAK} sentences in a row end with ${ending}; vary the endings.`,
                snippet: sentence.text,
              },
            ]
          : [];
      return { ending, count, findings: [...state.findings, ...found] };
    },
    { ending: null, count: 0, findings: [] },
  ).findings;

const checkSentencePatterns = (sentences: readonly Sentence[]): readonly Finding[] =>
  sentences.flatMap((sentence) => [
    ...SENTENCE_RULES.filter((rule) => rule.pattern.test(sentence.text)).map(
      (rule): Finding => ({
        rule: rule.rule,
        severity: rule.severity,
        line: sentence.line,
        message: rule.message,
        snippet: sentence.text,
      }),
    ),
    ...AI_VOCABULARY.filter((word) => sentence.text.includes(word)).map(
      (word): Finding => ({
        rule: "ai-vocabulary",
        severity: "warn",
        line: sentence.line,
        message: `Word overused by AI (${word}); keep it only as a legitimate term of the field.`,
        snippet: sentence.text,
      }),
    ),
  ]);

const checkLines = (lines: readonly Line[]): readonly Finding[] =>
  lines.flatMap((line): readonly Finding[] => {
    const emoji = VISIBLE_KINDS.has(line.kind) ? [...line.raw.matchAll(EMOJI)].map((match) => match[0]) : [];
    const trailingColon =
      SPACING_KINDS.has(line.kind) && TRAILING_COLON.test(line.prose) && HAS_JAPANESE.test(line.prose);
    const emojiFindings: readonly Finding[] =
      emoji.length === 0
        ? []
        : [
            {
              rule: "emoji",
              severity: "warn",
              line: line.number,
              message: `Emoji (${emoji.join(" ")}); write plain text.`,
              snippet: line.raw.trim(),
            },
          ];
    const colonFindings: readonly Finding[] = trailingColon
      ? [
          {
            rule: "trailing-colon",
            severity: "warn",
            line: line.number,
            message: "Line ends with a colon; close it with a full stop or drop the lead-in.",
            snippet: line.raw.trim(),
          },
        ]
      : [];
    return [...emojiFindings, ...colonFindings];
  });

const checkSpacing = (lines: readonly Line[]): readonly Finding[] => {
  const counted = lines
    .filter((line) => SPACING_KINDS.has(line.kind))
    .map((line) => ({
      line,
      spaced: countMatches(line.prose, SPACED),
      tight: countMatches(line.prose, TIGHT),
    }));
  const spacedTotal = counted.reduce((total, entry) => total + entry.spaced, 0);
  const tightTotal = counted.reduce((total, entry) => total + entry.tight, 0);
  if (spacedTotal === 0) return [];
  if (tightTotal === 0) {
    const first = counted.find((entry) => entry.spaced > 0);
    return first === undefined
      ? []
      : [
          {
            rule: "ja-alnum-spacing",
            severity: "info",
            line: first.line.number,
            message:
              "The document consistently spaces Japanese and alphanumerics; keep it only when it is the existing manuscript's convention.",
            snippet: first.line.prose,
          },
        ];
  }
  const minorityIsSpaced = spacedTotal <= tightTotal;
  return counted
    .filter((entry) => (minorityIsSpaced ? entry.spaced : entry.tight) > 0)
    .map(
      (entry): Finding => ({
        rule: "ja-alnum-spacing",
        severity: "warn",
        line: entry.line.number,
        message: minorityIsSpaced
          ? "Space between Japanese and alphanumerics, while most of the document has none."
          : "No space between Japanese and alphanumerics, while most of the document has one.",
        snippet: entry.line.prose,
      }),
    );
};

const measure = (lines: readonly Line[]): Metrics => {
  const prose = lines.filter((line) => PROSE_KINDS.has(line.kind));
  const chars = prose.reduce((total, line) => total + line.prose.replace(/\s/g, "").length, 0);
  const boldCount = prose.reduce((total, line) => total + countMatches(line.raw, BOLD), 0);
  const listLines = prose.filter(
    (line) => line.kind === "list" && !LINK_ONLY_ITEM.test(line.raw.trim()),
  ).length;
  return {
    chars,
    boldCount,
    boldPer1000: chars === 0 ? 0 : (boldCount / chars) * 1000,
    listRatio: prose.length === 0 ? 0 : listLines / prose.length,
  };
};

const checkDensity = (metrics: Metrics, lines: readonly Line[]): readonly Finding[] => {
  if (metrics.chars < MIN_CHARS_FOR_DENSITY) return [];
  const firstBold = lines.find((line) => PROSE_KINDS.has(line.kind) && countMatches(line.raw, BOLD) > 0);
  const firstList = lines.find((line) => line.kind === "list");
  const boldFindings: readonly Finding[] =
    metrics.boldPer1000 > BOLD_PER_1000_LIMIT
      ? [
          {
            rule: "bold-density",
            severity: "warn",
            line: firstBold?.number ?? 1,
            message: `${metrics.boldCount} bold spans in ${metrics.chars} characters (${round(metrics.boldPer1000)} per 1,000, limit ${BOLD_PER_1000_LIMIT}); keep bold for the few points that prevent misreading.`,
            snippet: "",
          },
        ]
      : [];
  const listFindings: readonly Finding[] =
    metrics.listRatio > LIST_RATIO_LIMIT
      ? [
          {
            rule: "list-ratio",
            severity: "warn",
            line: firstList?.number ?? 1,
            message: `${round(metrics.listRatio * 100)}% of prose lines are list items (limit ${LIST_RATIO_LIMIT * 100}%); write reasoning as paragraphs and keep lists for parallel data.`,
            snippet: "",
          },
        ]
      : [];
  return [...boldFindings, ...listFindings];
};

const lint = (source: string): Report => {
  const lines = classify(source);
  const sentences = sentencesOf(lines);
  const metrics = measure(lines);
  const findings = [
    ...checkLines(lines),
    ...checkSpacing(lines),
    ...checkDensity(metrics, lines),
    ...checkSentenceEndStreaks(sentences),
    ...checkSentencePatterns(sentences),
  ].toSorted((a, b) => a.line - b.line);
  const penalty = findings.reduce((total, finding) => total + PENALTY[finding.severity], 0);
  return { score: Math.max(0, 100 - penalty), metrics, findings };
};

const renderText = (report: Report): string => {
  const { metrics } = report;
  const header = [
    `score ${report.score}/100`,
    `characters ${metrics.chars}, bold ${round(metrics.boldPer1000)} per 1,000, list lines ${round(metrics.listRatio * 100)}%`,
  ];
  const body =
    report.findings.length === 0
      ? ["no findings"]
      : report.findings.flatMap((finding) => [
          `L${finding.line} ${finding.severity} ${finding.rule} ${finding.message}`,
          ...(finding.snippet === "" ? [] : [`  > ${finding.snippet}`]),
        ]);
  return [...header, "", ...body].join("\n");
};

const readInput = async (file: string | undefined): Promise<string | null> => {
  if (file === undefined) return process.stdin.isTTY ? null : Bun.stdin.text();
  const handle = Bun.file(file);
  return (await handle.exists()) ? handle.text() : null;
};

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      json: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    log(HELP_TEXT);
    process.exit(EXIT_SUCCESS);
  }

  const file = positionals[0];
  const source = await readInput(file);
  if (source === null) {
    log(file === undefined ? "Error: pass a file or pipe text on stdin" : `Error: cannot read ${file}`);
    log(HELP_TEXT);
    process.exit(EXIT_USAGE);
  }

  const report = lint(source);
  process.stdout.write(`${values.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
  process.exit(
    values.strict && report.findings.some((finding) => finding.severity === "warn")
      ? EXIT_FINDINGS
      : EXIT_SUCCESS,
  );
};

main().catch((error: unknown) => {
  log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  log(HELP_TEXT);
  process.exit(EXIT_USAGE);
});
