import { StyleSheet } from "react-native";

export const C = {
  green: "#245c35",
  ok: "#27834a",
  danger: "#b42318",
  muted: "#647067",
  bg: "#f3f6f3",
  line: "#dce4dc",
  white: "#fff",
  ink: "#1f2937",
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  container: { padding: 18, paddingTop: 40, paddingBottom: 36 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: C.green,
  },

  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 14,
    elevation: 1,
  },
  toolbarItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
    gap: 4,
  },
  toolbarText: { fontSize: 12, color: C.green, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: -7,
    right: -10,
    backgroundColor: C.green,
    color: C.white,
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 5,
    fontSize: 10,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flex: { flex: 1 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.white,
    marginBottom: 8,
  },
  calc: {
    textAlign: "center",
    fontWeight: "700",
    color: C.green,
    marginTop: 7,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 3,
    borderRadius: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.line,
  },
  typeButtonSelected: {
    backgroundColor: "#e8f1e8",
    borderColor: C.green,
  },
  typeText: { fontSize: 11, color: C.muted, fontWeight: "600" },
  typeTextSelected: { color: C.green },

  preview: {
    marginVertical: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: C.green,
    borderRadius: 12,
    alignItems: "stretch",
    minHeight: 230,
  },
  previewFarm: {
    textAlign: "center",
    color: C.green,
    fontSize: 13,
    fontWeight: "700",
  },
  previewProduce: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    color: C.ink,
    marginVertical: 8,
  },
  divider: {
    borderTopWidth: 1,
    borderColor: C.line,
    marginVertical: 10,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  bold: { fontWeight: "800", color: C.ink },
  total: { fontSize: 18, fontWeight: "900", color: C.green },

  previewDate: {
    textAlign: "center",
    color: C.muted,
    fontSize: 11,
    marginTop: 12,
  },
  serialPreview: {
    textAlign: "center",
    color: C.ink,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },

  bigWeight: {
    fontSize: 58,
    fontWeight: "900",
    textAlign: "center",
    color: C.ink,
  },
  kg: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: C.green,
  },
  pounds: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    color: C.muted,
  },

  previewCaption: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: C.green,
    textAlign: "center",
  },
  identifier: {
    fontSize: 44,
    fontWeight: "900",
    textAlign: "center",
    color: C.ink,
    marginVertical: 20,
  },

  modalContent: {
    flex: 1,
    minHeight: 0,
    paddingTop: 12,
  },

  sheet: {
    height: "88%",
    backgroundColor: C.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  // Object identifier counter: centered row with compact bordered buttons.
  identifierCounterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 12,
    marginTop: 18,
  },
  counterButton: {
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 9,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    fontSize: 18,
    fontWeight: "800",
    minWidth: 35,
    textAlign: "center",
  },

  button: {
    backgroundColor: C.green,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  buttonText: { color: C.white, fontWeight: "800" },
  secondaryButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.green,
  },
  secondaryButtonText: { color: C.green },
  secondaryAction: { backgroundColor: "#3f6d9c" },
  disabled: { opacity: 0.55 },

  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  muted: { color: C.muted, fontSize: 12, marginTop: 5 },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },

  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.35)",
  },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: "88%",
    backgroundColor: C.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#cbd5cb",
    alignSelf: "center",
    marginVertical: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: C.ink },
  modalContent: { paddingTop: 12 },

  printerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 12,
  },
  helper: { fontSize: 12, color: C.muted, marginVertical: 8 },

  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: C.line,
  },

  historyCard: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  status: { fontSize: 10, fontWeight: "800" },
  statusOk: { color: C.ok },
  statusFail: { color: C.danger },
  errorText: { color: C.danger, fontSize: 11, marginTop: 5 },

  reprintButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    padding: 8,
    marginTop: 9,
  },
  reprintText: {
    color: C.green,
    fontWeight: "700",
    fontSize: 12,
  },
});

export default s;
