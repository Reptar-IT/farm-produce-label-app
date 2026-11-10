const writeToPrinter = async (device, target, dataBase64) => {
  if (target.withResponse) {
    await device.writeCharacteristicWithResponseForService(
      target.serviceUUID,
      target.characteristicUUID,
      dataBase64,
    );
  } else {
    await device.writeCharacteristicWithoutResponseForService(
      target.serviceUUID,
      target.characteristicUUID,
      dataBase64,
    );
  }
};

export {
    writeToPrinter
};