// scripts/update_fund_history.mjs
// GitHub Actions で実行して data/fund_history.json を自動更新するスクリプト（依存なし）
// Node 18+（Node20推奨）で動作。fetch は組み込みを使用。

import fs from "fs";
import path from "path";

const FUNDS = [
  { name: "オルカン", fundCd: "253425" },
  { name: "S&P500", fundCd: "253266" },
  { name: "宇宙開発", fundCd: "253299" },
  { name: "NASDAQ100", fundCd: "254062" },
  { name: "純金ファンド", fundCd: "251065" },
];

// 「過去1年分」＝過去365日（カレンダー日）を走査して、取れた営業日のみを格納します
const DAYS_BACK = 365;

// 週末/祝日など「データが無い日」はAPIが取れないことがあるのでスキップします。
// 1日×ファンド数の呼び出しになるため、礼儀として軽い待ちを入れます（必要なら調整）
const SLEEP_MS_EACH_REQUEST = 60;

// 出力先
const OUT_PATH = path.join("data", "fund_history.json");

// 公式API（日付指定）
function buildDateApiUrl(fundCd, yyyymmdd) {
  return `https://developer.am.mufg.jp/fund_information_date/fund_cd/${fundCd}/base_date/${yyyymmdd}`;
}

// YYYY-MM-DD -> YYYYMMDD
function isoToYyyymmdd(isoDate) {
  return isoDate.replaceAll("-", "");
}

// Date -> "YYYY-MM-DD" (JST)
function toJstIsoDate(dateObj) {
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(dateObj); // "YYYY-MM-DD"
}

// "34,030" -> 34030
function toNumberSafe(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// APIレスポンスから datasets[0] を取り出す
function pickDataset(json) {
  if (json && Array.isArray(json.datasets) && json.datasets[0]) return json.datasets[0];
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 指定日1日分を取る（取れなかったら null）
async function fetchOneDay(fundCd, yyyymmdd) {
  const url = buildDateApiUrl(fundCd, yyyymmdd);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "kabuka-dashboard/1.0 (github-actions)",
      "Accept": "application/json",
    },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const ds = pickDataset(json);
  if (!ds) return null;

  const baseDate = ds.base_date; // "YYYYMMDD" が多い
  const nav = toNumberSafe(ds.nav);
  if (!baseDate || nav === null) return null;

  const iso = `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6, 8)}`;
  return { date: iso, price: nav };
}

function buildDateListBackFromToday(daysBack) {
  const today = new Date();
  const dates = [];

  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toJstIsoDate(d)); // "YYYY-MM-DD"
  }
  return dates;
}

async function main() {
  // 既存JSONがあれば読み込む（失敗時に空にしないための保険）
  let existing = null;
  try {
    if (fs.existsSync(OUT_PATH)) {
      existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    }
  } catch {
    existing = null;
  }

  const allData = {};
  const dateList = buildDateListBackFromToday(DAYS_BACK);

  for (const fund of FUNDS) {
    console.log(`==== ${fund.name} (fundCd=${fund.fundCd}) ====`);
    const series = [];

    for (const iso of dateList) {
      const yyyymmdd = isoToYyyymmdd(iso);
      try {
        const one = await fetchOneDay(fund.fundCd, yyyymmdd);
        if (one) series.push(one);
      } catch (e) {
        // ネットワーク一時エラーなどは無視して続行
        console.log(`WARN ${fund.name} ${iso}: ${e?.message ?? e}`);
      }
      if (SLEEP_MS_EACH_REQUEST > 0) await sleep(SLEEP_MS_EACH_REQUEST);
    }

    // 古い→新しい順（念のため）
    series.sort((a, b) => a.date.localeCompare(b.date));

    // さすがに少なすぎる時は既存値を温存（API全落ち対策）
    // 目安：1年なら営業日で200前後は取れることが多い
    if (series.length < 120 && existing && existing[fund.name]) {
      console.log(`WARN: too few points (${series.length}). Keep existing for ${fund.name}.`);
      allData[fund.name] = existing[fund.name];
    } else {
      console.log(`OK points=${series.length}`);
      allData[fund.name] = series;
    }
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(allData, null, 2) + "\n", "utf-8");
  console.log(`Wrote: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
