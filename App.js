import React, { useEffect, useRef, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import s, { C } from "./styles";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager, State } from "react-native-ble-plx";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { findWritableCharacteristic } from "./modules/findWritableCharacteristic";
import {
  createProduceLabelRows,
  createIdentifierLabelRows,
  createProduceWeightStickerRows,
} from "./modules/createProduceLabelRows";
import { printX6LabelImage } from "./modules/x6Modules";

import {
  findMxw01Targets,
  printMxw01LabelImage,
} from "./modules/C17Mxw01Modules";

const TEMPLATES_KEY = "@produce_label_templates";
const PRINT_HISTORY_KEY = "@produce_label_print_history";
const PRINTER_NAME = "X6h-3B92";
const MXW01_PRINTER_NAME = "MXW01";
const PRINTER_SERVICE_UUID = "0000ae30-0000-1000-8000-00805f9b34fb";
const PRINTER_NOTIFICATION_UUID = "0000ae02-0000-1000-8000-00805f9b34fb";

export default function App() {
  const priceConfirmationOpen = useRef(false);
  const bleManagerRef = useRef(null);
  const printerDeviceIdRef = useRef(null);
  const disconnectSubscriptionRef = useRef(null);
  const notificationSubscriptionRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const connectionAttemptRef = useRef(false);

  const [produceName, setProduceName] = useState("StrawBerry");
  const [farmName, setFarmName] = useState("RD Automated Farming");
  const [labelType, setLabelType] = useState("price");
  const [identifierPrefix, setIdentifierPrefix] = useState("A");
  const [identifierStartNumber, setIdentifierStartNumber] = useState("1");
  const [identifierCurrentNumber, setIdentifierCurrentNumber] = useState(1);
  const [activeIdentifierTemplateId, setActiveIdentifierTemplateId] =
    useState(null);
  const [serialPrefix, setSerialPrefix] = useState("P-");
  const [serialStartNumber, setSerialStartNumber] = useState("1");
  const [serialCurrentNumber, setSerialCurrentNumber] = useState(1);
  const [activeSerialTemplateId, setActiveSerialTemplateId] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [scanningPrinter, setScanningPrinter] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerStatus, setPrinterStatus] = useState("Printer not connected");
  const [printerDevice, setPrinterDevice] = useState(null);
  const [printerWriteTarget, setPrinterWriteTarget] = useState(null);
  const [printerProtocol, setPrinterProtocol] = useState("x6");
  const [printingLabel, setPrintingLabel] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [pricePerLb, setPricePerLb] = useState(0);
  const [priceDraft, setPriceDraft] = useState("0");
  const [templates, setTemplates] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [printHistory, setPrintHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [currentDate] = useState(() => new Date());

  const weightKgNumber = Number.parseFloat(weightKg) || 0;
  const weightLb = weightKgNumber * 2.20462;
  const pricePerKg = pricePerLb * 2.20462;
  const totalPrice = weightLb * pricePerLb;
  const formattedDate = currentDate.toLocaleDateString();
  const currentIdentifier = `${identifierPrefix.trim()}${identifierCurrentNumber}`;
  const currentSerial = `${serialPrefix.trim()}${serialCurrentNumber}`;

  const clearScanTimeout = () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = null;
  };

  const clearPrinterConnection = (status = "Disconnected") => {
    disconnectSubscriptionRef.current?.remove();
    disconnectSubscriptionRef.current = null;

    notificationSubscriptionRef.current?.remove();
    notificationSubscriptionRef.current = null;

    printerDeviceIdRef.current = null;

    setPrinterConnected(false);
    setPrinterDevice(null);
    setPrinterWriteTarget(null);
    setPrinterProtocol("x6");
    setPrinterStatus(status);
  };

  useEffect(() => {
    try {
      const manager = new BleManager();
      bleManagerRef.current = manager;
      return () => {
        clearScanTimeout();
        disconnectSubscriptionRef.current?.remove();
        notificationSubscriptionRef.current?.remove();
        manager.stopDeviceScan();
        manager.destroy();
        bleManagerRef.current = null;
      };
    } catch (error) {
      console.error("BLE initialization error:", error);
      setPrinterStatus("Bluetooth initialization failed");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            setTemplates(
              parsed.map((t) => ({
                ...t,
                pricePerLb: Number(t.pricePerLb ?? 0),
              })),
            );
        }
      } catch (error) {
        console.error("Could not load templates:", error);
        Alert.alert("Error", "Could not load your saved templates.");
      } finally {
        setTemplatesLoaded(true);
      }
    })();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PRINT_HISTORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setPrintHistory(parsed);
        }
      } catch (error) {
        console.error("Could not load print history:", error);
        Alert.alert("History error", "Could not load saved print history.");
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (templatesLoaded)
      AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)).catch(
        (e) => console.error("Could not save templates:", e),
      );
  }, [templates, templatesLoaded]);
  useEffect(() => {
    if (historyLoaded) {
      AsyncStorage.setItem(
        PRINT_HISTORY_KEY,
        JSON.stringify(printHistory),
      ).catch((error) => console.error("Could not save print history:", error));
    }
  }, [printHistory, historyLoaded]);

  const addHistoryEntry = (entry) =>
    setPrintHistory((previous) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...entry,
      },
      ...previous,
    ]);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS !== "android") return true;
    const version = Number(Platform.Version);
    const permissions =
      version >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    const ok = permissions.every(
      (p) => results[p] === PermissionsAndroid.RESULTS.GRANTED,
    );
    if (!ok)
      Alert.alert(
        "Bluetooth permission required",
        "Allow Bluetooth permissions so the app can find and connect to your printer.",
      );
    return ok;
  };

  const connectToPrinter = async () => {
    const manager = bleManagerRef.current;

    if (
      !manager ||
      scanningPrinter ||
      printerConnected ||
      connectionAttemptRef.current
    ) {
      return;
    }

    connectionAttemptRef.current = true;
    let scanActive = false;

    try {
      if (!(await requestBluetoothPermissions())) return;

      if ((await manager.state()) !== State.PoweredOn) {
        setPrinterStatus("Bluetooth is turned off");

        Alert.alert(
          "Bluetooth unavailable",
          "Turn on Bluetooth on your phone and try again.",
        );

        return;
      }

      setScanningPrinter(true);
      setPrinterConnected(false);
      setPrinterStatus("Searching for X6h-3B92 or MXW01...");

      let connectionStarted = false;

      scanTimeoutRef.current = setTimeout(() => {
        scanTimeoutRef.current = null;

        if (connectionStarted) return;

        manager.stopDeviceScan();
        scanActive = false;

        setScanningPrinter(false);
        setPrinterStatus("Printer not found");

        Alert.alert(
          "Printer not found",
          "Make sure your X6h-3B92 or MXW01 printer is switched on, nearby, and not connected to another device.",
        );
      }, 12000);

      scanActive = true;

      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearScanTimeout();
          scanActive = false;
          manager.stopDeviceScan();

          setScanningPrinter(false);
          setPrinterStatus("Bluetooth scan failed");

          Alert.alert("Bluetooth error", error.message);
          return;
        }

        if (!device || connectionStarted) return;

        const name = device.name || device.localName || "";
        const normalizedName = name.trim().toLowerCase();

        const isMxw01 = normalizedName === MXW01_PRINTER_NAME.toLowerCase();

        const isX6 = normalizedName === PRINTER_NAME.toLowerCase();

        if (!isX6 && !isMxw01) return;

        connectionStarted = true;
        clearScanTimeout();

        manager.stopDeviceScan();
        scanActive = false;

        setPrinterStatus(
          `Found ${isMxw01 ? MXW01_PRINTER_NAME : PRINTER_NAME}. Connecting...`,
        );

        device
          .connect({ timeout: 10000 })
          .then(async (connected) => {
            printerDeviceIdRef.current = connected.id;

            disconnectSubscriptionRef.current?.remove();

            disconnectSubscriptionRef.current = manager.onDeviceDisconnected(
              connected.id,
              (err, disconnected) => {
                if (
                  printerDeviceIdRef.current !==
                  (disconnected?.id || connected.id)
                ) {
                  return;
                }

                clearScanTimeout();
                setScanningPrinter(false);

                clearPrinterConnection(
                  err ? "Printer connection lost" : "Printer disconnected",
                );
              },
            );

            let connectedDevice = connected;

            if (Platform.OS === "android") {
              try {
                connectedDevice = await connected.requestMTU(247);

                console.log("MXW01 negotiated BLE MTU:", connectedDevice.mtu);
              } catch (error) {
                console.warn(
                  "Could not negotiate BLE MTU; using default:",
                  error.message,
                );
              }
            }

            const discovered =
              await connectedDevice.discoverAllServicesAndCharacteristics();

            notificationSubscriptionRef.current =
              discovered.monitorCharacteristicForService(
                PRINTER_SERVICE_UUID,
                PRINTER_NOTIFICATION_UUID,
                (err, characteristic) => {
                  if (err) {
                    console.log(
                      `${isMxw01 ? "MXW01" : "X6"} notification error:`,
                      err.message,
                    );
                  } else if (characteristic?.value) {
                    console.log(
                      `${isMxw01 ? "MXW01" : "X6"} response received:`,
                      characteristic.value,
                    );
                  }
                },
              );

            let target;

            if (isMxw01) {
              // MXW01 requires separate AE01 control and AE03 data targets.
              target = await findMxw01Targets(discovered);
            } else {
              // Preserve the existing X6 characteristic selection.
              target = await findWritableCharacteristic(discovered);

              if (!target) {
                throw new Error(
                  "No writable BLE characteristic was found on the X6 printer.",
                );
              }
            }

            if (!(await manager.isDeviceConnected(discovered.id))) {
              throw new Error(
                "The printer disconnected during setup. Try connecting again.",
              );
            }

            setPrinterDevice(discovered);
            setPrinterWriteTarget(target);
            setPrinterProtocol(isMxw01 ? "mxw01" : "x6");
            setPrinterConnected(true);

            setPrinterStatus(
              `Connected to ${discovered.name || (isMxw01 ? MXW01_PRINTER_NAME : PRINTER_NAME)}`,
            );
          })
          .catch(async (error) => {
            console.error("Printer connection/setup error:", error);

            const id = printerDeviceIdRef.current;

            clearPrinterConnection("Connection or printer setup failed");

            if (id) {
              try {
                await manager.cancelDeviceConnection(id);
              } catch (cleanupError) {
                console.log(
                  "Cleanup after connection failure:",
                  cleanupError.message,
                );
              }
            }

            Alert.alert(
              "Printer error",
              `${error.message}\n\nCheck that the printer is switched on and supports the expected BLE characteristics.`,
            );
          })
          .finally(() => {
            setScanningPrinter(false);
          });
      });
    } catch (error) {
      clearScanTimeout();

      if (scanActive) {
        manager.stopDeviceScan();
      }

      setScanningPrinter(false);
      clearPrinterConnection("Connection failed");

      console.error("Bluetooth connection error:", error);

      Alert.alert(
        "Bluetooth error",
        error.message || "Could not connect to the printer.",
      );
    } finally {
      connectionAttemptRef.current = false;
    }
  };

  const disconnectPrinter = async () => {
    const manager = bleManagerRef.current;
    const id = printerDeviceIdRef.current;
    clearScanTimeout();
    manager?.stopDeviceScan();
    setScanningPrinter(false);
    if (!id) {
      clearPrinterConnection("Printer not connected");
      return;
    }
    setPrinterStatus("Disconnecting printer...");
    try {
      if (manager) await manager.cancelDeviceConnection(id);
    } catch (error) {
      console.log("Printer disconnect error:", error.message);
    } finally {
      clearPrinterConnection("Printer disconnected");
    }
  };

  const handlePriceEndEditing = (entered) => {
    const text = String(entered ?? priceDraft).trim();
    const next = Number.parseFloat(text);
    if (text === "" || !Number.isFinite(next) || next < 0) {
      Alert.alert(
        "Invalid price",
        "Enter a valid price per pound of zero or more.",
      );
      setPriceDraft(String(pricePerLb));
      return;
    }
    if (next === pricePerLb) {
      setPriceDraft(String(pricePerLb));
      return;
    }
    if (priceConfirmationOpen.current) return;
    priceConfirmationOpen.current = true;
    Alert.alert(
      "Confirm price change",
      `Change the price per pound from $${pricePerLb.toFixed(2)} to $${next.toFixed(2)}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setPriceDraft(String(pricePerLb));
            priceConfirmationOpen.current = false;
          },
        },
        {
          text: "Confirm",
          onPress: () => {
            setPricePerLb(next);
            setPriceDraft(String(next));
            priceConfirmationOpen.current = false;
          },
        },
      ],
      {
        cancelable: false,
        onDismiss: () => {
          setPriceDraft(String(pricePerLb));
          priceConfirmationOpen.current = false;
        },
      },
    );
  };

  const saveTemplate = () => {
    if (!produceName.trim() || !farmName.trim()) {
      Alert.alert(
        "Missing information",
        "Enter both the produce name and farm name before saving a template.",
      );
      return;
    }
    if (
      !serialPrefix.trim() ||
      !/^\d+$/.test(serialStartNumber.trim()) ||
      !Number.isSafeInteger(Number(serialStartNumber)) ||
      Number(serialStartNumber) < 0
    ) {
      Alert.alert(
        "Invalid serial sequence",
        "Enter a serial prefix and a whole starting number of zero or greater.",
      );
      return;
    }
    const template = {
      id: `${Date.now()}`,
      produceName: produceName.trim(),
      farmName: farmName.trim(),
      pricePerLb,
      serialPrefix: serialPrefix.trim(),
      serialStartNumber: Number(serialStartNumber),
      serialCurrentNumber,
    };
    setTemplates((p) => [...p, template]);
    setActiveSerialTemplateId(template.id);
    Alert.alert(
      "Template saved",
      `Saved with a price of $${pricePerLb.toFixed(2)} per pound and serial ${template.serialPrefix}${serialCurrentNumber}.`,
    );
  };

  const saveIdentifierTemplate = () => {
    const prefix = identifierPrefix.trim();
    const start = Number(identifierStartNumber);
    if (!prefix) {
      Alert.alert("Missing prefix", "Enter a prefix such as A, BOX, or ROW-.");
      return;
    }
    if (
      !/^\d+$/.test(identifierStartNumber.trim()) ||
      !Number.isSafeInteger(start) ||
      start < 0
    ) {
      Alert.alert(
        "Invalid starting number",
        "Enter a whole number of zero or greater.",
      );
      return;
    }
    const template = {
      id: `identifier-${Date.now()}`,
      type: "identifier",
      identifierPrefix: prefix,
      identifierStartNumber: start,
      currentNumber: start,
    };
    setTemplates((p) => [...p, template]);
    setIdentifierPrefix(prefix);
    setIdentifierCurrentNumber(start);
    setActiveIdentifierTemplateId(template.id);
    Alert.alert(
      "Template saved",
      `Identifier sequence ${prefix}${start} saved.`,
    );
  };

  const selectTemplate = (template) => {
    if (template.type === "identifier") {
      const current = Number(
        template.currentNumber ?? template.identifierStartNumber ?? 1,
      );
      setLabelType("identifier");
      setIdentifierPrefix(String(template.identifierPrefix ?? "A"));
      setIdentifierStartNumber(
        String(template.identifierStartNumber ?? current),
      );
      setIdentifierCurrentNumber(Number.isFinite(current) ? current : 1);
      setActiveIdentifierTemplateId(template.id);
      return;
    }
    const price = Number(template.pricePerLb ?? 0);
    setLabelType("price");
    setActiveIdentifierTemplateId(null);
    setProduceName(template.produceName ?? "");
    setFarmName(template.farmName ?? "");
    setPricePerLb(price);
    setPriceDraft(String(price));
    setSerialPrefix(template.serialPrefix ?? "P-");
    setSerialStartNumber(String(template.serialStartNumber ?? 1));
    setSerialCurrentNumber(
      Number(template.serialCurrentNumber ?? template.serialStartNumber ?? 1),
    );
    setActiveSerialTemplateId(template.id);
  };

  const deleteTemplate = (template) => {
    const name =
      template.type === "identifier"
        ? `${template.identifierPrefix}${template.currentNumber ?? template.identifierStartNumber}`
        : template.produceName;
    Alert.alert("Delete template", `Delete the \"${name}\" template?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          setTemplates((p) => p.filter((t) => t.id !== template.id)),
      },
    ]);
  };

  const buildLabelRowsFromSnapshot = (snapshot) => {
    if (snapshot.labelType === "identifier")
      return createIdentifierLabelRows({ identifier: snapshot.identifier });
    if (snapshot.labelType === "weight")
      return createProduceWeightStickerRows({
        produceName: snapshot.produceName,
        farmName: snapshot.farmName,
        weightKg: snapshot.weightKg,
        weightLb: snapshot.weightLb,
        date: snapshot.date,
        serialNumber: snapshot.serialNumber,
      });
    return createProduceLabelRows({
      produceName: snapshot.produceName,
      farmName: snapshot.farmName,
      weightKg: snapshot.weightKg,
      weightLb: snapshot.weightLb,
      pricePerLb: snapshot.pricePerLb,
      pricePerKg: snapshot.pricePerKg,
      totalPrice: snapshot.totalPrice,
      date: snapshot.date,
      serialNumber: snapshot.serialNumber,
    });
  };

  const sendSnapshotToPrinter = async (
    snapshot,
    { isReprint = false, historyId = null } = {},
  ) => {
    if (!printerDevice || !printerWriteTarget || !printerConnected) {
      Alert.alert(
        "Printer not connected",
        "Connect to your X6 or MXW01 printer first.",
      );
      return false;
    }
    try {
      setPrintingLabel(true);
      setPrinterStatus("Preparing label...");
      const rows = buildLabelRowsFromSnapshot(snapshot);
      if (
        !Array.isArray(rows) ||
        !rows.length ||
        rows.some((row) => !Array.isArray(row) || row.length !== 48)
      )
        throw new Error(
          "Invalid label bitmap: each row must contain 48 bytes.",
        );
      setPrinterStatus(`Sending ${rows.length} rows to printer...`);
      if (printerProtocol === "mxw01") {
        setPrinterStatus("Sending label to MXW01...");

        await printMxw01LabelImage(printerDevice, printerWriteTarget, rows);
      } else {
        setPrinterStatus("Sending label to X6...");

        await printX6LabelImage(printerDevice, printerWriteTarget, rows);
      }
      if (isReprint && historyId) {
        const priorEntry = printHistory.find((entry) => entry.id === historyId);
        setPrintHistory((p) =>
          p.map((entry) =>
            entry.id === historyId
              ? {
                  ...entry,
                  status:
                    entry.status === "send_failed"
                      ? "sent_to_printer"
                      : entry.status,
                  lastReprintAt: new Date().toISOString(),
                  reprintCount: (entry.reprintCount || 0) + 1,
                  lastAttemptStatus: "sent_to_printer",
                  lastAttemptError: null,
                }
              : entry,
          ),
        );
        if (
          priorEntry?.status === "send_failed" &&
          (snapshot.labelType === "price" || snapshot.labelType === "weight") &&
          Number(snapshot.serialNumberValue) === serialCurrentNumber
        ) {
          const next = Number(snapshot.serialNumberValue) + 1;
          setSerialCurrentNumber(next);
          if (activeSerialTemplateId)
            setTemplates((p) =>
              p.map((t) =>
                t.id === activeSerialTemplateId
                  ? { ...t, serialCurrentNumber: next }
                  : t,
              ),
            );
        }
      } else {
        addHistoryEntry({
          ...snapshot,
          status: "sent_to_printer",
          lastAttemptStatus: "sent_to_printer",
          createdAt: new Date().toISOString(),
          reprintCount: 0,
        });
        if (snapshot.labelType === "identifier") {
          const next = Number(snapshot.identifierNumberValue) + 1;

          setIdentifierCurrentNumber(next);

          if (activeIdentifierTemplateId) {
            setTemplates((previous) =>
              previous.map((template) =>
                template.id === activeIdentifierTemplateId
                  ? { ...template, currentNumber: next }
                  : template,
              ),
            );
          }
        }
        if (snapshot.labelType === "price" || snapshot.labelType === "weight") {
          const next = Number(snapshot.serialNumberValue) + 1;
          setSerialCurrentNumber(next);
          if (activeSerialTemplateId)
            setTemplates((p) =>
              p.map((t) =>
                t.id === activeSerialTemplateId
                  ? { ...t, serialCurrentNumber: next }
                  : t,
              ),
            );
        }
      }
      setPrinterStatus("Label data sent");
      Alert.alert(
        isReprint ? "Reprint data sent" : "Print data sent",
        "The data was sent to the printer. Check the physical label; BLE confirmation cannot guarantee that paper was printed.",
      );
      return true;
    } catch (error) {
      console.error("Bluetooth print error:", error);
      setPrinterStatus("Printing failed");
      if (isReprint && historyId)
        setPrintHistory((p) =>
          p.map((entry) =>
            entry.id === historyId
              ? {
                  ...entry,
                  lastAttemptStatus: "send_failed",
                  lastAttemptError: error.message || "Unknown error",
                }
              : entry,
          ),
        );
      else
        addHistoryEntry({
          ...snapshot,
          status: "send_failed",
          lastAttemptStatus: "send_failed",
          error: error.message || "Unknown printing error",
          createdAt: new Date().toISOString(),
          reprintCount: 0,
        });
      Alert.alert(
        "Print send failed",
        `${error.message || "Unknown printing error"}\n\nThe serial counter was not advanced. You can retry this same label from History. If the printer received some data before disconnecting, inspect the printer before retrying to avoid a duplicate.`,
      );
      return false;
    } finally {
      setPrintingLabel(false);
    }
  };

  const printLabel = async () => {
    if (labelType === "identifier") {
      if (!identifierPrefix.trim()) {
        Alert.alert("Missing prefix", "Enter an identifier prefix first.");
        return;
      }
    } else {
      if (!produceName.trim() || !farmName.trim()) {
        Alert.alert("Missing information", "Enter the produce and farm names.");
        return;
      }
      if (
        weightKg.trim() === "" ||
        !Number.isFinite(Number(weightKg)) ||
        Number(weightKg) <= 0
      ) {
        Alert.alert("Invalid weight", "Enter a weight greater than zero.");
        return;
      }
      if (!Number.isFinite(pricePerLb) || pricePerLb < 0) {
        Alert.alert("Invalid price", "Enter a valid price per pound.");
        return;
      }
      if (!serialPrefix.trim() || !/^\d+$/.test(String(serialCurrentNumber))) {
        Alert.alert("Invalid serial", "Set a valid serial prefix and number.");
        return;
      }
    }
    const snapshot = {
      labelType,
      produceName: produceName.trim(),
      farmName: farmName.trim(),
      weightKg: weightKgNumber,
      weightLb,
      pricePerLb,
      pricePerKg,
      totalPrice,
      date: formattedDate,
      identifier: currentIdentifier,
      identifierNumberValue: identifierCurrentNumber,
      serialNumber: labelType === "identifier" ? null : currentSerial,
      serialPrefix: serialPrefix.trim(),
      serialNumberValue: serialCurrentNumber,
    };
    await sendSnapshotToPrinter(snapshot);
  };

  const reprintHistoryEntry = (entry) => {
    Alert.alert(
      "Reprint label",
      `Send ${entry.labelType === "identifier" ? entry.identifier : entry.serialNumber || entry.produceName} to the printer again?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reprint",
          onPress: () =>
            sendSnapshotToPrinter(entry, {
              isReprint: true,
              historyId: entry.id,
            }),
        },
      ],
    );
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const htmlLabelTemplate = () => {
    if (labelType === "identifier")
      return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>@page{margin:0;size:100mm 60mm}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial}.label{width:100%;height:60mm;border:2px solid #2e6b3f;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4mm}.caption{color:#2e6b3f;font-size:13px;font-weight:bold;letter-spacing:2px;margin-bottom:4mm}.identifier{font-size:52px;font-weight:900;overflow-wrap:anywhere;text-align:center}</style></head><body><div class="label"><div class="caption">IDENTIFIER</div><div class="identifier">${escapeHtml(currentIdentifier)}</div></div></body></html>`;
    if (labelType === "weight")
      return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>@page{margin:0;size:100mm 105mm}*{box-sizing:border-box}body{margin:0;padding:5mm;font-family:Arial;color:#111}.label{min-height:95mm;border:2px solid #2e6b3f;border-radius:8px;padding:5mm 3mm;display:flex;flex-direction:column;align-items:center;text-align:center}.produce{font-size:17px;font-weight:bold;text-transform:uppercase;overflow-wrap:anywhere}.divider{width:100%;border-top:1px solid #9ca3af;margin:4mm 0}.weight{font-size:76px;font-weight:900;line-height:1}.unit{font-size:30px;font-weight:bold;margin-top:2mm}.pounds{font-size:15px;margin-top:5mm}.date{font-size:12px;color:#4b5563;margin-top:auto;padding-top:6mm}.serial{font-size:11px;margin-top:3mm}</style></head><body><div class="label"><div class="produce">${escapeHtml(produceName)}</div><div class="divider"></div><div class="weight">${weightKgNumber.toFixed(2)}</div><div class="unit">KG</div><div class="pounds">${weightLb.toFixed(2)} LB</div><div class="divider"></div><div class="date">${escapeHtml(formattedDate)}</div><div class="serial">SERIAL: ${escapeHtml(currentSerial)}</div></div></body></html>`;
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>*{box-sizing:border-box}body{font-family:Arial;margin:0;padding:20px;color:#1f2937}.label{max-width:420px;margin:0 auto;border:2px solid #2e6b3f;border-radius:12px;padding:24px}.brand{text-align:center;color:#2e6b3f;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase}h1{text-align:center;font-size:26px;margin:12px 0 6px;overflow-wrap:anywhere}.farm{text-align:center;color:#4b5563;font-size:15px;margin-bottom:22px}.divider{border-top:1px solid #d1d5db;margin:14px 0}.row{display:flex;justify-content:space-between;gap:12px;margin:12px 0;font-size:14px}.value{font-weight:bold;text-align:right}.total{font-size:21px;color:#2e6b3f}.date{text-align:center;color:#6b7280;font-size:11px;margin-top:20px}.serial{text-align:center;font-size:11px;margin-top:10px}</style></head><body><div class="label"><div class="brand">Fresh Produce</div><h1>${escapeHtml(produceName)}</h1><div class="farm">${escapeHtml(farmName)}</div><div class="divider"></div><div class="row"><span>Weight (kg)</span><span class="value">${weightKgNumber.toFixed(2)} kg</span></div><div class="row"><span>Weight (lb)</span><span class="value">${weightLb.toFixed(2)} lb</span></div><div class="row"><span>Price per lb</span><span class="value">$${pricePerLb.toFixed(2)}</span></div><div class="row"><span>Price per kg</span><span class="value">$${pricePerKg.toFixed(2)}</span></div><div class="divider"></div><div class="row total"><span>Total</span><span class="value">$${totalPrice.toFixed(2)}</span></div><div class="date">Date: ${escapeHtml(formattedDate)}</div><div class="serial">SERIAL: ${escapeHtml(currentSerial)}</div></div></body></html>`;
  };

  const generateAndSharePdf = async () => {
    if (
      labelType !== "identifier" &&
      (!produceName.trim() || !farmName.trim())
    ) {
      Alert.alert(
        "Missing information",
        "Enter the produce name and farm name before generating the label.",
      );
      return;
    }
    if (
      labelType !== "identifier" &&
      (weightKg.trim() === "" ||
        !Number.isFinite(Number(weightKg)) ||
        weightKgNumber <= 0)
    ) {
      Alert.alert("Invalid weight", "Enter a weight greater than zero.");
      return;
    }
    if (
      labelType !== "identifier" &&
      (!Number.isFinite(pricePerLb) || pricePerLb < 0)
    ) {
      Alert.alert("Invalid price", "Enter a valid price per pound.");
      return;
    }
    try {
      setGeneratingPdf(true);
      const file = await Print.printToFileAsync({ html: htmlLabelTemplate() });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Produce Label",
          UTI: "com.adobe.pdf",
        });
      else Alert.alert("PDF created", `The PDF was saved to:\n${file.uri}`);
    } catch (error) {
      console.error("PDF generation error:", error);
      Alert.alert("Error", "Could not generate the PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const panelTitle =
    activePanel === "printer"
      ? "Bluetooth Printer"
      : activePanel === "details"
        ? labelType === "identifier"
          ? "Identifier Details"
          : "Produce Details"
        : activePanel === "templates"
          ? "Saved Templates"
          : activePanel === "history"
            ? "Print History"
            : "";
  const field = (label, value, onChangeText, props = {}) => (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </>
  );
  const action = (title, onPress, icon = "checkmark", secondary = false) => (
    <Pressable
      style={[s.button, secondary && s.secondaryButton]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={19} color={secondary ? C.green : "#fff"} />
      <Text style={[s.buttonText, secondary && s.secondaryButtonText]}>
        {title}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#f3f6f3" />
      <SafeAreaView edges={["top", "bottom"]} style={s.screen}>
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* <View style={s.header}>
            <Ionicons name="leaf" size={26} color={C.green} />
          </View> */}
          <View style={s.toolbar}>
            {[
              ["details", "add-circle-outline", "Details"],
              ["templates", "albums-outline", "Templates"],
              ["printer", "print-outline", "Printer"],
              ["history", "time-outline", "History"],
            ].map(([panel, icon, label]) => (
              <Pressable
                key={panel}
                style={s.toolbarItem}
                onPress={() => setActivePanel(panel)}
              >
                <Ionicons
                  name={icon}
                  size={22}
                  color={
                    panel === "printer" && printerConnected ? C.ok : C.green
                  }
                />
                <Text style={s.toolbarText}>{label}</Text>
                {panel === "templates" && templates.length > 0 ? (
                  <Text style={s.badge}>{templates.length}</Text>
                ) : null}
                {panel === "history" && printHistory.length > 0 ? (
                  <Text style={s.badge}>{printHistory.length}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.flex}>
                <Text style={s.label}>Weight (kg)</Text>
                <TextInput
                  style={s.input}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              <View style={s.flex}>
                <Text style={s.label}>Price / lb ($)</Text>
                <TextInput
                  style={s.input}
                  value={priceDraft}
                  onChangeText={setPriceDraft}
                  onEndEditing={({ nativeEvent }) =>
                    handlePriceEndEditing(nativeEvent.text)
                  }
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text style={s.calc}>
              {weightLb.toFixed(2)} lb · ${totalPrice.toFixed(2)} total
            </Text>
          </View>
          <View style={s.card}>
            <View style={s.row}>
              {[
                ["price", "Price Label"],
                ["weight", "Weight Sticker"],
                ["identifier", "Identifier"],
              ].map(([type, title]) => (
                <Pressable
                  key={type}
                  onPress={() => setLabelType(type)}
                  style={[
                    s.typeButton,
                    labelType === type && s.typeButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      s.typeText,
                      labelType === type && s.typeTextSelected,
                    ]}
                  >
                    {title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.preview}>
              {labelType === "identifier" ? (
                <>
                  <Text style={s.previewCaption}>OBJECT IDENTIFIER</Text>
                  <Text style={s.identifier}>{currentIdentifier}</Text>
                  <View style={s.identifierCounterRow}>
                    <Pressable
                      style={s.counterButton}
                      onPress={() =>
                        setIdentifierCurrentNumber((n) => Math.max(0, n - 1))
                      }
                    >
                      <Ionicons name="remove" size={23} color={C.green} />
                    </Pressable>
                    <Text style={s.counter}>{identifierCurrentNumber}</Text>
                    <Pressable
                      style={s.identifierCounterButton}
                      onPress={() => setIdentifierCurrentNumber((n) => n + 1)}
                    >
                      <Ionicons name="add" size={23} color={C.green} />
                    </Pressable>
                  </View>
                </>
              ) : labelType === "weight" ? (
                <>
                  <Text style={s.previewFarm}>{farmName}</Text>
                  <Text style={s.previewProduce}>{produceName}</Text>
                  <View style={s.divider} />
                  <Text style={s.bigWeight}>{weightKgNumber.toFixed(2)}</Text>
                  <Text style={s.kg}>KG</Text>
                  <Text style={s.pounds}>{weightLb.toFixed(2)} LB</Text>
                  <View style={s.divider} />
                  <Text style={s.previewDate}>{formattedDate}</Text>
                  <Text style={s.serialPreview}>SERIAL: {currentSerial}</Text>
                </>
              ) : (
                <>
                  <Text style={s.previewFarm}>{farmName}</Text>
                  <Text style={s.previewProduce}>{produceName}</Text>
                  <View style={s.divider} />
                  {[
                    ["Weight (kg)", `${weightKgNumber.toFixed(2)} kg`],
                    ["Weight (lb)", `${weightLb.toFixed(2)} lb`],
                    ["Price per lb", `$${pricePerLb.toFixed(2)}`],
                    ["Price per kg", `$${pricePerKg.toFixed(2)}`],
                  ].map(([a, b]) => (
                    <View key={a} style={s.previewRow}>
                      <Text>{a}</Text>
                      <Text style={s.bold}>{b}</Text>
                    </View>
                  ))}
                  <View style={s.divider} />
                  <View style={s.previewRow}>
                    <Text style={s.total}>Total</Text>
                    <Text style={s.total}>${totalPrice.toFixed(2)}</Text>
                  </View>
                  <Text style={s.previewDate}>{formattedDate}</Text>
                  <Text style={s.serialPreview}>SERIAL: {currentSerial}</Text>
                </>
              )}
            </View>
            <View style={s.row}>
              <Pressable
                style={[
                  s.button,
                  s.flex,
                  (!printerConnected || printingLabel) && s.disabled,
                ]}
                onPress={printLabel}
                disabled={!printerConnected || printingLabel}
              >
                {printingLabel ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="print-outline" size={22} color="#fff" />
                )}
                <Text style={s.buttonText}>Print</Text>
              </Pressable>
              <Pressable
                style={[
                  s.button,
                  s.secondaryAction,
                  s.flex,
                  generatingPdf && s.disabled,
                ]}
                onPress={generateAndSharePdf}
                disabled={generatingPdf}
              >
                {generatingPdf ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="share-outline" size={22} color="#fff" />
                )}
                <Text style={s.buttonText}>Share PDF</Text>
              </Pressable>
            </View>
            {!printerConnected && (
              <Pressable
                style={s.hint}
                onPress={() => setActivePanel("printer")}
              >
                <Ionicons name="bluetooth-outline" size={17} color={C.muted} />
                <Text style={s.muted}>
                  Connect your X6 or MXW01 printer to print labels
                </Text>
              </Pressable>
            )}
          </View>
          <Text style={s.footer}>
            RD Automated Farming · Saved on this device
          </Text>
        </ScrollView>
        <Modal
          visible={activePanel !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActivePanel(null)}
        >
          <View style={s.backdrop}>
            <Pressable style={s.dismiss} onPress={() => setActivePanel(null)} />
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{panelTitle}</Text>
                <Pressable onPress={() => setActivePanel(null)}>
                  <Ionicons name="close-circle" size={27} color={C.muted} />
                </Pressable>
              </View>
              {activePanel === "printer" && (
                <View style={s.modalContent}>
                  <View style={s.printerRow}>
                    <Ionicons
                      name="bluetooth"
                      size={27}
                      color={printerConnected ? C.ok : C.green}
                    />
                    <View style={s.flex}>
                      <Text style={s.bold}>
                        {printerDevice?.name ||
                          (printerProtocol === "mxw01"
                            ? MXW01_PRINTER_NAME
                            : PRINTER_NAME)}
                      </Text>
                      <Text style={s.muted}>{printerStatus}</Text>
                    </View>
                  </View>
                  {action(
                    scanningPrinter
                      ? "Searching..."
                      : printerConnected
                        ? "Disconnect Printer"
                        : "Scan & Connect",
                    () =>
                      printerConnected
                        ? disconnectPrinter()
                        : connectToPrinter(),
                    "bluetooth",
                  )}
                  <Text style={s.muted}>
                    Make sure the printer is powered on and nearby before
                    connecting.
                  </Text>
                </View>
              )}
              {activePanel === "details" && (
                <ScrollView
                  style={s.modalContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {labelType === "identifier" ? (
                    <>
                      {field(
                        "Identifier prefix",
                        identifierPrefix,
                        setIdentifierPrefix,
                        {
                          placeholder: "A, BOX-, ROW-",
                          autoCapitalize: "characters",
                        },
                      )}
                      {field(
                        "Starting number",
                        identifierStartNumber,
                        (v) => {
                          setIdentifierStartNumber(v);
                          if (/^\d+$/.test(v.trim()))
                            setIdentifierCurrentNumber(Number(v));
                        },
                        { keyboardType: "number-pad" },
                      )}
                      {action(
                        "Save Identifier Template",
                        saveIdentifierTemplate,
                        "bookmark-outline",
                      )}
                    </>
                  ) : (
                    <>
                      {field("Produce name", produceName, setProduceName, {
                        placeholder: "e.g. Strawberry",
                      })}
                      {field("Farm / origin name", farmName, setFarmName, {
                        placeholder: "e.g. RD Automated Farming",
                      })}
                      {field("Serial prefix", serialPrefix, setSerialPrefix, {
                        placeholder: "e.g. P-, LOT-",
                        autoCapitalize: "characters",
                      })}
                      {field(
                        "Serial starting number",
                        serialStartNumber,
                        setSerialStartNumber,
                        { keyboardType: "number-pad", placeholder: "1" },
                      )}
                      <Text style={s.helper}>
                        Next serial to print: {currentSerial}. The counter
                        advances after the printer send call succeeds.
                      </Text>
                      {action(
                        "Save Produce Template",
                        saveTemplate,
                        "bookmark-outline",
                      )}
                    </>
                  )}
                </ScrollView>
              )}
              {activePanel === "templates" && (
                <ScrollView style={s.modalContent}>
                  {!templatesLoaded ? (
                    <ActivityIndicator />
                  ) : templates.length === 0 ? (
                    <Text style={s.muted}>
                      No saved templates yet. Add details and save a template to
                      reuse them.
                    </Text>
                  ) : (
                    templates.map((t) => (
                      <View key={t.id} style={s.templateRow}>
                        <Pressable
                          style={s.flex}
                          onPress={() => {
                            selectTemplate(t);
                            setActivePanel(null);
                          }}
                        >
                          <Text style={s.bold}>
                            {t.type === "identifier"
                              ? `${t.identifierPrefix}${t.currentNumber ?? t.identifierStartNumber}`
                              : t.produceName}
                          </Text>
                          <Text style={s.muted}>
                            {t.type === "identifier"
                              ? "Identifier sequence"
                              : t.farmName}
                          </Text>
                          <Text style={s.muted}>
                            {t.type === "identifier"
                              ? `Starts at ${t.identifierStartNumber}`
                              : `$${Number(t.pricePerLb || 0).toFixed(2)} / lb · ${t.serialPrefix || "P-"}${t.serialCurrentNumber ?? t.serialStartNumber ?? 1}`}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => deleteTemplate(t)}>
                          <Ionicons
                            name="trash-outline"
                            size={21}
                            color={C.danger}
                          />
                        </Pressable>
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
              {activePanel === "history" && (
                <ScrollView style={s.modalContent}>
                  {!historyLoaded ? (
                    <ActivityIndicator />
                  ) : printHistory.length === 0 ? (
                    <Text style={s.muted}>
                      No print attempts yet. Each print attempt will be saved
                      here.
                    </Text>
                  ) : (
                    <>
                      {action(
                        "Clear History",
                        () =>
                          Alert.alert(
                            "Clear print history?",
                            "This permanently removes saved print attempts.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Clear",
                                style: "destructive",
                                onPress: () => setPrintHistory([]),
                              },
                            ],
                          ),
                        "trash-outline",
                        true,
                      )}
                      {printHistory.map((entry) => (
                        <View key={entry.id} style={s.historyCard}>
                          <View style={s.historyTop}>
                            <Text style={s.bold}>
                              {entry.labelType === "identifier"
                                ? entry.identifier
                                : entry.serialNumber || entry.produceName}
                            </Text>
                            <Text
                              style={[
                                s.status,
                                entry.lastAttemptStatus === "send_failed" ||
                                entry.status === "send_failed"
                                  ? s.statusFail
                                  : s.statusOk,
                              ]}
                            >
                              {entry.lastAttemptStatus || entry.status}
                            </Text>
                          </View>
                          <Text style={s.muted}>
                            {entry.labelType} ·{" "}
                            {entry.produceName || "Identifier"} ·{" "}
                            {new Date(entry.createdAt).toLocaleString()}
                          </Text>
                          {entry.error || entry.lastAttemptError ? (
                            <Text style={s.errorText}>
                              {entry.lastAttemptError || entry.error}
                            </Text>
                          ) : null}
                          <Text style={s.muted}>
                            Reprints: {entry.reprintCount || 0}
                          </Text>
                          <Pressable
                            style={s.reprintButton}
                            onPress={() => reprintHistoryEntry(entry)}
                            disabled={printingLabel}
                          >
                            <Ionicons
                              name="refresh-outline"
                              size={18}
                              color={C.green}
                            />
                            <Text style={s.reprintText}>
                              Reprint same label
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
