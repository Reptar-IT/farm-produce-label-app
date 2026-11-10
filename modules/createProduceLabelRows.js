const FONT_5X7 = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 18, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14],
  1: [4, 12, 4, 4, 4, 4, 14],
  2: [14, 17, 1, 2, 4, 8, 31],
  3: [30, 1, 1, 14, 1, 1, 30],
  4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 16, 30, 1, 1, 30],
  6: [14, 16, 16, 30, 17, 17, 14],
  7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 1, 14],
  ":": [0, 4, 4, 0, 4, 4, 0],
  ".": [0, 0, 0, 0, 0, 6, 6],
  ",": [0, 0, 0, 0, 4, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  "/": [1, 2, 2, 4, 8, 8, 16],
  $: [4, 15, 20, 14, 5, 30, 4],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "%": [17, 2, 4, 8, 17, 0, 0],
  "?": [14, 17, 1, 2, 4, 0, 4],
};

const LABEL_WIDTH = 384;
const LABEL_BYTES_PER_ROW = LABEL_WIDTH / 8;
const LABEL_HEIGHT = 400;

const normalizeText = (text) =>
  String(text ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 :.,/$()%&+-]/g, "?");

const createLabelCanvas = () => {
  const pixels = Array.from(
    { length: LABEL_HEIGHT },
    () => new Uint8Array(LABEL_WIDTH),
  );
  const setPixel = (x, y) => {
    if (x >= 0 && x < LABEL_WIDTH && y >= 0 && y < LABEL_HEIGHT)
      pixels[y][x] = 1;
  };

  const drawText = (text, x, y, scale = 2, bold = true) => {
    const value = normalizeText(text);
    const charWidth = 6 * scale;
    for (let i = 0; i < value.length; i++) {
      const glyph = FONT_5X7[value[i]] || FONT_5X7[" "];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (!(glyph[row] & (1 << (4 - col)))) continue;
          const pixelX = x + i * charWidth + col * scale;
          const pixelY = y + row * scale;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++)
              setPixel(pixelX + sx, pixelY + sy);
            if (bold) setPixel(pixelX + scale, pixelY + sy);
          }
        }
      }
    }
    return value.length * charWidth - scale;
  };

  const drawCentered = (text, y, scale = 2, bold = true) => {
    const value = normalizeText(text);
    const textWidth = value.length * 6 * scale - scale;
    drawText(
      value,
      Math.max(4, Math.floor((LABEL_WIDTH - textWidth) / 2)),
      y,
      scale,
      bold,
    );
  };

  const drawRightAligned = (text, rightX, y, scale = 3, bold = true) => {
    const value = normalizeText(text);
    const textWidth = value.length * 6 * scale - scale;
    drawText(value, rightX - textWidth - (bold ? 1 : 0), y, scale, bold);
  };

  const drawLargeText = (text, y, scaleX, scaleY, bold = true) => {
    const value = normalizeText(text);
    const charWidth = 6 * scaleX;
    const textWidth = value.length * charWidth - scaleX;
    const startX = Math.max(4, Math.floor((LABEL_WIDTH - textWidth) / 2));
    for (let i = 0; i < value.length; i++) {
      const glyph = FONT_5X7[value[i]] || FONT_5X7[" "];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (!(glyph[row] & (1 << (4 - col)))) continue;
          const pixelX = startX + i * charWidth + col * scaleX;
          const pixelY = y + row * scaleY;
          for (let sy = 0; sy < scaleY; sy++) {
            for (let sx = 0; sx < scaleX; sx++)
              setPixel(pixelX + sx, pixelY + sy);
            if (bold) setPixel(pixelX + scaleX, pixelY + sy);
          }
        }
      }
    }
  };

  const drawLine = (x1, y, x2) => {
    for (let x = x1; x <= x2; x++) setPixel(x, y);
  };
  const drawRect = (x1, y1, x2, y2) => {
    drawLine(x1, y1, x2);
    drawLine(x1, y2, x2);
    for (let y = y1; y <= y2; y++) {
      setPixel(x1, y);
      setPixel(x2, y);
    }
  };
  return {
    pixels,
    drawText,
    drawCentered,
    drawRightAligned,
    drawLargeText,
    drawLine,
    drawRect,
  };
};

const packLabelRows = (pixels) =>
  pixels.map((row) => {
    const packed = new Uint8Array(LABEL_BYTES_PER_ROW);
    for (let x = 0; x < LABEL_WIDTH; x++)
      if (row[x]) packed[x >> 3] |= 1 << (x & 7);
    return Array.from(packed);
  });

// serialNumber is optional so older callers remain compatible.
const drawSerial = (drawCentered, serialNumber) => {
  const serial = String(serialNumber ?? "").trim();
  if (serial) drawCentered(`SERIAL: ${serial}`, 365, 1, true);
};

const createProduceLabelRows = ({
  produceName,
  farmName,
  weightKg,
  weightLb,
  pricePerLb,
  pricePerKg,
  totalPrice,
  date,
  serialNumber,
}) => {
  const {
    pixels,
    drawText,
    drawCentered,
    drawRightAligned,
    drawLine,
    drawRect,
  } = createLabelCanvas();
  drawRect(10, 6, 373, 383);
  drawCentered(
    String(farmName ?? "")
      .trim()
      .slice(0, 30),
    88,
    2,
    true,
  );
  drawLine(18, 43, 365);
  drawCentered(
    String(produceName ?? "")
      .trim()
      .slice(0, 22),
    56,
    3,
    true,
  );
  drawLine(18, 116, 365);
  drawText("WEIGHT KG", 22, 132, 2, true);
  drawText(`${Number(weightKg).toFixed(2)} KG`, 224, 132, 2, true);
  drawText("WEIGHT LB", 22, 163, 2, true);
  drawText(`${Number(weightLb).toFixed(2)} LB`, 224, 163, 2, true);
  drawText("PRICE PER LB", 22, 194, 2, true);
  drawText(`$${Number(pricePerLb).toFixed(2)}`, 260, 194, 2, true);
  drawText("PRICE PER KG", 22, 225, 2, true);
  drawText(`$${Number(pricePerKg).toFixed(2)}`, 260, 225, 2, true);
  drawLine(18, 257, 365);
  drawText("TOTAL", 22, 276, 3, true);
  drawRightAligned(`$${Number(totalPrice).toFixed(2)}`, 360, 276, 3, true);
  drawCentered(`DATE: ${date}`, 330, 2, true);
  drawSerial(drawCentered, serialNumber);
  return packLabelRows(pixels);
};

const createProduceWeightStickerRows = ({
  produceName,
  farmName,
  weightKg,
  weightLb,
  date,
  serialNumber,
}) => {
  const { pixels, drawCentered, drawLargeText, drawLine, drawRect } =
    createLabelCanvas();
  drawRect(10, 6, 373, 383);
  const origin = String(farmName ?? "")
    .trim()
    .slice(0, 36);
  if (origin) drawCentered(origin, 43, 2, true);
  drawCentered(
    String(produceName ?? "")
      .trim()
      .slice(0, 22) || "FRESH PRODUCE",
    15,
    3,
    true,
  );
  drawLine(18, 70, 365);
  const weightText = Number(weightKg).toFixed(2);
  const scaleX = Math.max(
    2,
    Math.min(12, Math.floor(340 / (weightText.length * 6 - 1))),
  );
  drawLargeText(weightText, 80, scaleX, 19, true);
  drawCentered("KG", 226, 4, true);
  drawCentered(`${Number(weightLb).toFixed(2)} LB`, 282, 2, true);
  drawCentered(`DATE: ${date}`, 330, 2, true);
  drawSerial(drawCentered, serialNumber);
  return packLabelRows(pixels);
};

// Identifier labels deliberately do not display serial numbers.
const createIdentifierLabelRows = ({ identifier }) => {
  const value = String(identifier ?? "")
    .trim()
    .toUpperCase();
  if (!value) throw new Error("An identifier is required.");
  if (value.length > 20)
    throw new Error("Identifier cannot exceed 20 characters.");
  const { pixels, drawRect } = createLabelCanvas();
  drawRect(8, 8, LABEL_WIDTH - 9, LABEL_HEIGHT - 9);
  const charWidth = 5,
    charGap = 1,
    maxScale = 12;
  const scale = Math.max(
    1,
    Math.min(
      maxScale,
      Math.floor(
        (LABEL_WIDTH - 40) / (value.length * (charWidth + charGap) - charGap),
      ),
      Math.floor((LABEL_HEIGHT - 40) / 7),
    ),
  );
  const scaledCharWidth = charWidth * scale,
    scaledGap = charGap * scale;
  const textWidth =
    value.length * scaledCharWidth + (value.length - 1) * scaledGap;
  const textHeight = 7 * scale;
  const startX = Math.floor((LABEL_WIDTH - textWidth) / 2);
  const startY = Math.floor((LABEL_HEIGHT - textHeight) / 2);
  for (let i = 0; i < value.length; i++) {
    const glyph = FONT_5X7[value[i]] || FONT_5X7["?"];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++) {
        if (!(glyph[row] & (1 << (4 - col)))) continue;
        const pixelX = startX + i * (scaledCharWidth + scaledGap) + col * scale;
        const pixelY = startY + row * scale;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const x = pixelX + dx,
              y = pixelY + dy;
            if (x >= 0 && x < LABEL_WIDTH && y >= 0 && y < LABEL_HEIGHT)
              pixels[y][x] = 1;
          }
      }
  }
  return packLabelRows(pixels);
};

export {
  createProduceLabelRows,
  createProduceWeightStickerRows,
  createIdentifierLabelRows,
};
