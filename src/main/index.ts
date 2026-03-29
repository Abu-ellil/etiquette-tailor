import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initializeSchema } from '../db';

// Initialize database schema
initializeSchema();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools only in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Import database functions for IPC handlers
import * as db from '../db';

// Customer IPC handlers
ipcMain.handle('db:getAllCustomers', () => db.getAllCustomers());
ipcMain.handle('db:getCustomer', (_, id: number) => db.getCustomer(id));
ipcMain.handle('db:createCustomer', (_, data: any) => db.createCustomer(data));
ipcMain.handle('db:updateCustomer', (_, id: number, data: any) => db.updateCustomer(id, data));
ipcMain.handle('db:deleteCustomer', (_, id: number) => db.deleteCustomer(id));

// Worker IPC handlers
ipcMain.handle('db:getAllWorkers', () => db.getAllWorkers());
ipcMain.handle('db:getWorker', (_, id: number) => db.getWorker(id));
ipcMain.handle('db:createWorker', (_, data: any) => db.createWorker(data));
ipcMain.handle('db:updateWorker', (_, id: number, data: any) => db.updateWorker(id, data));
ipcMain.handle('db:deleteWorker', (_, id: number) => db.deleteWorker(id));

// Order IPC handlers
ipcMain.handle('db:getAllOrders', () => db.getAllOrders());
ipcMain.handle('db:getOrder', (_, id: number) => db.getOrder(id));
ipcMain.handle('db:createOrder', (_, data: any) => db.createOrder(data));
ipcMain.handle('db:updateOrder', (_, id: number, data: any) => db.updateOrder(id, data));
ipcMain.handle('db:deleteOrder', (_, id: number) => db.deleteOrder(id));

