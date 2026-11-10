
import { fromByteArray } from "base64-js";
import { writeToPrinter } from "./writeToPrinter";

const X6_ROW_DELAY_MS = 10;

// X6h print settings.
// Energy is a 16-bit little-endian value.
const X6_PRINT_QUALITY = 0x35;
const X6_PRINT_ENERGY = 0x5000;
const X6_PRINT_SPEED = 0x19;

const x6Crc8 = (bytes) => {
  let crc = 0;

  for (const byte of bytes) {
    crc ^= byte;

    for (let i = 0; i < 8; i++) {
      crc =
        crc & 0x80
          ? ((crc << 1) ^ 0x07) & 0xff
          : (crc << 1) & 0xff;
    }
  }

  return crc;
};

const buildX6Packet = (command, payload) => {
  const packet = [
    0x51,
    0x78,
    command,
    0x00,
    payload.length & 0xff,
    (payload.length >> 8) & 0xff,
    ...payload,
    x6Crc8(payload),
    0xff,
  ];

  return fromByteArray(Uint8Array.from(packet));
};

const sendX6Command = async (device, target, command, payload) => {
  await writeToPrinter(
    device,
    target,
    buildX6Packet(command, payload),
  );
};

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const prepareX6Printing = async (device, target) => {
  // Set print quality.
  await sendX6Command(device, target, 0xa4, [
    X6_PRINT_QUALITY,
  ]);

  // Set thermal energy (16-bit little-endian).
  await sendX6Command(device, target, 0xaf, [
    X6_PRINT_ENERGY & 0xff,
    (X6_PRINT_ENERGY >> 8) & 0xff,
  ]);

  // Configure feed/print speed.
  await sendX6Command(device, target, 0xbd, [
    X6_PRINT_SPEED,
  ]);

  // Start monochrome image mode.
  await sendX6Command(device, target, 0xbe, [0x00]);

  await delay(100);
};

const printX6TestImage = async (device, target) => {
  await prepareX6Printing(device, target);

  for (let y = 0; y < 48; y++) {
    const row = new Uint8Array(48);

    if (y > 0 && y < 47) {
      for (let x = 12; x < 372; x++) {
        if (x === 12 || x === 371 || y === 24) {
          const byteIndex = Math.floor(x / 8);
          const bitIndex = x % 8;

          row[byteIndex] |= 1 << bitIndex;
        }
      }
    }

    await sendX6Command(device, target, 0xa2, [
      ...row,
    ]);

    await delay(X6_ROW_DELAY_MS);
  }

  await sendX6Command(device, target, 0xa1, [
    0x30,
    0x00,
  ]);
};

const printX6LabelImage = async (device, target, labelData) => {
  if (!Array.isArray(labelData) || labelData.length === 0) {
    throw new Error("No X6 label image rows were provided.");
  }

  for (let y = 0; y < labelData.length; y++) {
    if (!labelData[y] || labelData[y].length !== 48) {
      throw new Error(
        `Invalid X6 bitmap row ${y}: expected 48 bytes.`,
      );
    }
  }

  console.log("X6 print settings:", {
    quality: X6_PRINT_QUALITY,
    energy: X6_PRINT_ENERGY,
    speed: X6_PRINT_SPEED,
    rows: labelData.length,
  });

  await prepareX6Printing(device, target);

  // Blank lead row helps prevent startup artifacts.
  await sendX6Command(
    device,
    target,
    0xa2,
    new Array(48).fill(0),
  );

  await delay(X6_ROW_DELAY_MS);

  for (let y = 0; y < labelData.length; y++) {
    await sendX6Command(
      device,
      target,
      0xa2,
      Array.from(labelData[y]),
    );

    await delay(X6_ROW_DELAY_MS);
  }

  await sendX6Command(device, target, 0xa1, [
    0x60,
    0x00,
  ]);
};

export {
  printX6TestImage,
  printX6LabelImage,
};
