// 📁 src/utils/astroChart.js
// ──────────────────────────────────────────────────────────
// Мини-движок: рендер «чистой» натальной карты без лишних
// квадратиков, emoji и т.д. Легенда - справа, круг чуть
// смещён влево. Файл кешируется на /tmp по uid+строке запроса
// ──────────────────────────────────────────────────────────
const { createCanvas } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");
const swe = require("swisseph");
const crypto = require("crypto");

/* где лежат *.se1 Swiss-Ephemeris */
swe.swe_set_ephe_path(path.join(require.resolve("swisseph"), "..", "ephe"));

/* планеты: тег (2-буквы), русский, цвет, код Swiss */
const PLANETS = [
  { tag: "Сл", name: "Солнце", c: "#ffcb00", code: swe.SE_SUN },
  { tag: "Лу", name: "Луна", c: "#c9c9c9", code: swe.SE_MOON },
  { tag: "Ме", name: "Меркурий", c: "#ffae5c", code: swe.SE_MERCURY },
  { tag: "Ве", name: "Венера", c: "#ff5ea2", code: swe.SE_VENUS },
  { tag: "Ма", name: "Марс", c: "#ff4136", code: swe.SE_MARS },
  { tag: "Юп", name: "Юпитер", c: "#23e0a3", code: swe.SE_JUPITER },
  { tag: "Са", name: "Сатурн", c: "#c38be4", code: swe.SE_SATURN },
  { tag: "Ур", name: "Уран", c: "#29c7f6", code: swe.SE_URANUS },
  { tag: "Нп", name: "Нептун", c: "#4274ff", code: swe.SE_NEPTUNE },
  { tag: "Пл", name: "Плутон", c: "#ff9419", code: swe.SE_PLUTO },
];

/* склонения для подписи «Солнце _в Овне_», … */
const SIGNS_PRE = [
  "в Овне",
  "в Тельце",
  "в Близнецах",
  "в Раке",
  "во Льве",
  "в Деве",
  "в Весах",
  "в Скорпионе",
  "в Стрельце",
  "в Козероге",
  "в Водолее",
  "в Рыбах",
];

const RAD = Math.PI / 180;
const pol = (cx, cy, r, deg) => {
  const a = deg * RAD - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/* ───────────── основной экспорт ───────────── */
function drawNatalChart(uid, input) {
  /* кэш */
  const h = crypto.createHash("md5").update(input).digest("hex").slice(0, 8);
  const file = `/tmp/natal_${uid}_${h}.png`;
  if (fs.existsSync(file)) return file;

  /* ── парсим ввод (01.01.2000 10:00 Москва) ── */
  const [d, m, y, hh, mm, ...cityArr] = input.split(/[:.\s]+/);
  const JD = swe.swe_julday(+y, +m, +d, +hh + +mm / 60, swe.SE_GREG_CAL);
  const city = cityArr.join(" ");

  /* координаты+знак */
  PLANETS.forEach((p) => {
    p.lon = swe.swe_calc_ut(JD, p.code, swe.SEFLG_SWIEPH).longitude;
    p.sign = Math.floor(p.lon / 30) % 12;
  });

  /* canvas */
  const W = 1600,
    H = 1000,
    CX = 520,
    CY = H / 2,
    R = 460, // круг сдвинут влево
    LX = W - 350; // легенда

  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");

  /* фон */
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#1e293b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* внешний круг и 12 радиальных линий */
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const [x, y] = pol(CX, CY, R, i * 30);
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  /* планеты */
  PLANETS.forEach((p) => {
    const [x, y] = pol(CX, CY, R - 95, p.lon);

    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.tag, x, y);
  });

  /* центр-надпись */
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.fillText("НАТАЛЬНАЯ КАРТА", CX, CY - 10);
  ctx.font = "20px Arial, sans-serif";
  ctx.fillText(
    `${d}.${m}.${y}  ${hh}:${mm.padStart(2, "0")}  ${city}`,
    CX,
    CY + 26
  );

  /* легенда */
  const top = CY - R + 60,
    step = 42;
  ctx.textAlign = "left";
  ctx.font = "24px Arial, sans-serif";
  ctx.fillText("Планеты и знаки", LX, top);

  ctx.font = "18px Arial, sans-serif";
  PLANETS.forEach((p, i) => {
    const y = top + 40 + i * step;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(LX, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillText(`${p.tag}: ${p.name} ${SIGNS_PRE[p.sign]}`, LX + 28, y + 3);
  });

  fs.writeFileSync(file, cv.toBuffer("image/png"));
  return file;
}
module.exports = { drawNatalChart };
