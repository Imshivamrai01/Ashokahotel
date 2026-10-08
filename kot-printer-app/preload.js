const { contextBridge, ipcRenderer } = require("electron");

// Bridge a small, explicit API to the dashboard. No nodeIntegration.
contextBridge.exposeInMainWorld("agent", {
  // queries / actions
  getState: () => ipcRenderer.invoke("get-state"),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (c) => ipcRenderer.invoke("save-config", c),
  testBill: () => ipcRenderer.invoke("test-bill"),
  scanLan: () => ipcRenderer.invoke("scan-lan"),
  listUsb: () => ipcRenderer.invoke("list-usb"),
  autodetect: () => ipcRenderer.invoke("autodetect"),
  setKotEnabled: (id, enabled) => ipcRenderer.invoke("set-kot-enabled", id, enabled),
  testPrint: () => ipcRenderer.invoke("test-print"),
  printNow: () => ipcRenderer.invoke("print-now"),
  reprint: (kotNumber) => ipcRenderer.invoke("reprint", kotNumber),
  getOfflineMenu: () => ipcRenderer.invoke("get-offline-menu"),
  getOfflineLocations: () => ipcRenderer.invoke("get-offline-locations"),
  placeOfflineOrder: (orderData) => ipcRenderer.invoke("place-offline-order", orderData),
  // live streams
  onStatus: (cb) => ipcRenderer.on("status", (_e, s) => cb(s)),
  onActivity: (cb) => ipcRenderer.on("activity", (_e, a) => cb(a)),
  onState: (cb) => ipcRenderer.on("state", (_e, s) => cb(s)),
});
