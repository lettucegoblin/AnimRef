const {
    BrowserWindow,
    Menu,
    MenuItem,
    ipcMain,
    app,
    screen
  } = require('electron')
const path = require('path')

const menu = new Menu()
//menu.append(new MenuItem({ label: 'Hello 👋' }))
//menu.append(new MenuItem({ type: 'separator' }))
menu.append(new MenuItem({ 
  label: 'Close',
  click: (menuItem, browserWindow, event) => {
    browserWindow.close()
  }
}))
//menu.append(new MenuItem({ label: 'Electron', type: 'checkbox', checked: true }))

let width = 400;
let height = 300;

function createWindow () {
  const win = new BrowserWindow({
    backgroundColor: "#202020",
    width: width,
    height: height,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
    }
  })

  win.loadFile('index.html')
  return win;
}
console.log('hey')
app.whenReady().then(() => {
  const mainWin = createWindow()
  //mainWin.webContents.openDevTools()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
  app.on('browser-window-created', (event, win) => {
    win.webContents.on('context-menu', (e, params) => {
      menu.popup(win, params.x, params.y)
    })
  })
  ipcMain.on('show-context-menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    menu.popup(win)
  })
  let dragState = {
      dragging: false
  }
 
  ipcMain.on('record-window-size', (event, w, h) => {
    width = mainWin.getSize()[0]
    height = mainWin.getSize()[1]
  })
  ipcMain.on('move-electron-window', (event, x, y, initPos) => {
    //var display =  screen.getDisplayNearestPoint({x: x, y: y})
    //var dpiRespected = screen.dipToScreenPoint({x: x, y: y})
    //mainWin.setPosition(x,y)
    mainWin.setBounds({
        width: width,
        height: height,
        x: x - initPos.x,
        y: y - initPos.y
    });
    //win.setSize(width, height)
    //mainWin.setPosition(Math.round(x / 1.25) - Math.round(initPos.x / 1.25), Math.round(y / 1.25) - Math.round(initPos.y / 1.25))
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})