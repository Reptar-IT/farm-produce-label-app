
import { fromByteArray, toByteArray } from "base64-js";
import { writeToPrinter } from "./writeToPrinter";

const MXW01_SERVICE = "0000ae30-0000-1000-8000-00805f9b34fb";
const MXW01_CONTROL = "0000ae01-0000-1000-8000-00805f9b34fb";
const MXW01_DATA = "0000ae03-0000-1000-8000-00805f9b34fb";
const MXW01_NOTIFY = "0000ae02-0000-1000-8000-00805f9b34fb";

const ROW_BYTES = 48;
const MIN_IMAGE_BYTES = 4320;
const MAX_ROWS_PER_CHUNK = 4;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mxw01Crc8 = (bytes) => {
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

const buildMxw01Packet = (command, payload) =>
  fromByteArray(
    Uint8Array.from([
      0x22,
      0x21,
      command,
      0x00,
      payload.length & 0xff,
      (payload.length >> 8) & 0xff,
      ...payload,
      mxw01Crc8(payload),
      0xff,
    ]),
  );

const sendMxw01Command = async (device, target, command, payload) => {
  await writeToPrinter(device, target, buildMxw01Packet(command, payload));
};

const findMxw01Targets = async (device) => {
  const services = await device.services();

  const service = services.find(
    (item) => item.uuid.toLowerCase() === MXW01_SERVICE,
  );

  if (!service) {
    throw new Error("MXW01 service AE30 was not found.");
  }

  const characteristics = await device.characteristicsForService(service.uuid);

  const findWritable = (uuid) =>
    characteristics.find(
      (item) =>
        item.uuid.toLowerCase() === uuid && item.isWritableWithoutResponse,
    );

  const control = findWritable(MXW01_CONTROL);
  const data = findWritable(MXW01_DATA);

  if (!control || !data) {
    throw new Error("MXW01 requires writable AE01 and AE03 characteristics.");
  }

  return {
    control: {
      serviceUUID: service.uuid,
      characteristicUUID: control.uuid,
      withResponse: false,
    },
    data: {
      serviceUUID: service.uuid,
      characteristicUUID: data.uuid,
      withResponse: false,
    },
  };
};

const waitForMxw01Notification = (device, commandId, timeoutMs) =>
  new Promise((resolve, reject) => {
    let settled = false;
    let subscription;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();

      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => {
      finish(
        new Error(
          `Timed out waiting for MXW01 response 0x${commandId
            .toString(16)
            .toUpperCase()}.`,
        ),
      );
    }, timeoutMs);

    subscription = device.monitorCharacteristicForService(
      MXW01_SERVICE,
      MXW01_NOTIFY,
      (error, characteristic) => {
        if (error) {
          finish(error);
          return;
        }

        if (!characteristic?.value) return;

        let bytes;

        try {
          bytes = Array.from(toByteArray(characteristic.value));
        } catch {
          return;
        }

        if (
          bytes.length < 7 ||
          bytes[0] !== 0x22 ||
          bytes[1] !== 0x21 ||
          bytes[2] !== commandId
        ) {
          return;
        }

        const payloadLength = bytes[4] | (bytes[5] << 8);

        if (bytes.length < 6 + payloadLength) return;

        finish(null, bytes.slice(6, 6 + payloadLength));
      },
    );
  });

const sendCommandAndWait = async (
  device,
  target,
  command,
  payload,
  timeoutMs = 5000,
) => {
  const responsePromise = waitForMxw01Notification(
    device,
    command,
    timeoutMs,
  );

  try {
    await sendMxw01Command(device, target, command, payload);
  } catch (error) {
    responsePromise.catch(() => {});
    throw error;
  }

  return responsePromise;
};

const printMxw01LabelImage = async (
  device,
  targets,
  labelRows,
  intensity = 0x5d,
) => {
  if (!device || !targets?.control || !targets?.data) {
    throw new Error("MXW01 is not connected or its targets are missing.");
  }

  if (!Array.isArray(labelRows) || labelRows.length === 0) {
    throw new Error("No label image rows were provided.");
  }

  for (let i = 0; i < labelRows.length; i++) {
    if (!Array.isArray(labelRows[i]) || labelRows[i].length !== ROW_BYTES) {
      throw new Error(`Invalid bitmap row ${i}: expected 48 bytes.`);
    }
  }

  const image = [];

  for (const row of labelRows) {
    image.push(...row);
  }

  // Keep the minimum buffer requirement documented for this printer family.
  while (image.length < MIN_IMAGE_BYTES) {
    image.push(0);
  }

  const lineCount = image.length / ROW_BYTES;

  if (!Number.isInteger(lineCount) || lineCount > 0xffff) {
    throw new Error("Invalid MXW01 image height.");
  }

  const mtu = Number(device.mtu) || 23;
  const maxWriteBytes = Math.max(20, mtu - 3);

  // Use complete 48-byte rows when the negotiated MTU permits it.
  // At the default MTU, retain a conservative write size.
  const rowsPerChunk =
    maxWriteBytes >= ROW_BYTES
      ? Math.max(
          1,
          Math.min(
            Math.floor(maxWriteBytes / ROW_BYTES),
            MAX_ROWS_PER_CHUNK,
          ),
        )
      : 0;

  const chunkSize =
    rowsPerChunk > 0 ? rowsPerChunk * ROW_BYTES : maxWriteBytes;

  console.log("MXW01 print job:", {
    width: 384,
    height: lineCount,
    bytes: image.length,
    mtu,
    maxWriteBytes,
    chunkSize,
    totalChunks: Math.ceil(image.length / chunkSize),
  });

  await sendMxw01Command(device, targets.control, 0xa2, [
    Math.max(0, Math.min(255, intensity)),
  ]);

  await delay(100);

  const acknowledgment = await sendCommandAndWait(
    device,
    targets.control,
    0xa9,
    [lineCount & 0xff, (lineCount >> 8) & 0xff, 0x30, 0x00],
    5000,
  );

  console.log("MXW01 print acknowledgment:", acknowledgment);

  if (acknowledgment.length > 0 && acknowledgment[0] !== 0x00) {
    throw new Error(
      `MXW01 rejected the print request: status ${acknowledgment[0]}.`,
    );
  }

  for (let offset = 0; offset < image.length; offset += chunkSize) {
    const chunk = image.slice(
      offset,
      Math.min(offset + chunkSize, image.length),
    );

    await writeToPrinter(
      device,
      targets.data,
      fromByteArray(Uint8Array.from(chunk)),
    );

    await delay(15);
  }

  await sendMxw01Command(device, targets.control, 0xad, [0x00]);

  console.log("MXW01 image data flushed.");

  try {
    const completion = await waitForMxw01Notification(device, 0xaa, 20000);
    console.log("MXW01 print completion:", completion);
  } catch (error) {
    console.warn("MXW01 completion was not confirmed:", error.message);

    throw new Error(
      "Image data was sent, but the printer's completion notification was not received. Check the printer before retrying.",
    );
  }

  console.log("MXW01 print completed.");
};

export {
  findMxw01Targets,
  printMxw01LabelImage,
  MXW01_SERVICE,
  MXW01_CONTROL,
  MXW01_DATA,
};
