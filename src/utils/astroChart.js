// 📁 src/utils/astroChart.js
const { createCanvas } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");
const swe = require("swisseph");

// путь к  *.se1  (у вас уже лежат 18-21)
swe.swe_set_ephe_path(path.join(require.resolve("swisseph"), "..", "ephe"));

const PLANETS = [
  { sym: "☉", code: swe.SE_SUN },
  { sym: "☾", code: swe.SE_MOON },
  { sym: "☿", code: swe.SE_MERCURY },
  { sym: "♀", code: swe.SE_VENUS },
  { sym: "♂", code: swe.SE_MARS },
  { sym: "♃", code: swe.SE_JUPITER },
  { sym: "♄", code: swe.SE_SATURN },
];

const RAD = Math.PI / 180;
const toPolar = (cx, cy, r, deg) => {
  const a = deg * RAD - Math.PI / 2; // 0° вверх
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/**
 * Рисует PNG и возвращает путь, всегда пересоздаёт картинку.
 * @param {number} uid   — id Telegram-пользователя
 * @param {string} dtStr — «DD.MM.YYYY HH:MM Город»
 */
function drawNatalChart(uid, dtStr) {
  const filePath = path.join("/tmp", `natal_${uid}.png`);

  /* ── дата → JD ─────────────────── */
  const [d, m, y, hh, mm] = dtStr
    .split(/[.\s:]+/)
    .slice(0, 5)
    .map(Number);
  const jd = swe.swe_julday(y, m, d, hh + mm / 60, swe.SE_GREG_CAL);

  /* ── координаты планет ─────────── */
  PLANETS.forEach((p) => {
    const res = swe.swe_calc_ut(jd, p.code, swe.SEFLG_SWIEPH);
    p.lon = res.longitude; // нужное поле!
  });

  /* ── canvas ────────────────────── */
  const C = createCanvas(800, 800);
  const ctx = C.getContext("2d");

  ctx.fillStyle = "#1b2538";
  ctx.fillRect(0, 0, 800, 800);

  // окружность
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(400, 400, 330, 0, Math.PI * 2);
  ctx.stroke();

  // 12 секторов
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const [x, y] = toPolar(400, 400, 330, i * 30);
    ctx.beginPath();
    ctx.moveTo(400, 400);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // планеты
  PLANETS.forEach(({ sym, lon }) => {
    const [x, y] = toPolar(400, 400, 280, lon);
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sym, x, y + 4);
  });

  // подпись
  ctx.fillStyle = "#fff";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Натальная карта", 400, 385);

  fs.writeFileSync(filePath, C.toBuffer("image/png"));
  return filePath;
}

module.exports = { drawNatalChart };
