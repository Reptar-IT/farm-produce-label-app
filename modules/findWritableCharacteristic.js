const findWritableCharacteristic = async (device) => {
  const services = await device.services();
  const candidates = [];

  for (const service of services) {
    const characteristics = await device.characteristicsForService(
      service.uuid,
    );

    for (const characteristic of characteristics) {
      if (
        characteristic.isWritableWithResponse ||
        characteristic.isWritableWithoutResponse
      ) {
        candidates.push({
          serviceUUID: service.uuid,
          characteristicUUID: characteristic.uuid,
          withResponse: characteristic.isWritableWithResponse,
        });
      }
    }
  }

  // Prefer the likely X6 print-data characteristic.
  const preferredOrder = [
    "0000ae01-0000-1000-8000-00805f9b34fb",
    "0000ae03-0000-1000-8000-00805f9b34fb",
    "0000ae3b-0000-1000-8000-00805f9b34fb",
    "0000ae10-0000-1000-8000-00805f9b34fb",
  ];

  candidates.sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.characteristicUUID.toLowerCase());
    const bIndex = preferredOrder.indexOf(b.characteristicUUID.toLowerCase());

    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  const target = candidates[0] || null;

  console.log("Selected X6 write target:", JSON.stringify(target));

  return target;
};

export {
    findWritableCharacteristic
};