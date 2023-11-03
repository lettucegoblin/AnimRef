const {
  BrowserWindow,
  Menu,
  MenuItem,
  ipcMain,
  app,
  clipboard,
  screen,
  globalShortcut,
  dialog
} = require('electron')
const path = require('path')
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();
//store.clear()

//menu.append(new MenuItem({ label: 'Electron', type: 'checkbox', checked: true }))

let width = 400;
let height = 300;

function createWindow() {
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
  win.setAlwaysOnTop(true);

  win.loadFile('index.html')
  return win;
}
app.commandLine.appendSwitch('disable-site-isolation-trials');
const contextMenu = new Menu()
const recentSubmenu = new Menu()
app.whenReady().then(() => {
  const mainWin = createWindow()

  contextMenu.append(new MenuItem({
    id: "close-edit-video", label: 'Close Edit Video', visible: false,
    click: (menuItem, browserWindow, event) => {
      //mainWin.setAlwaysOnTop(menuItem.checked);
      mainWin.webContents.send('close-edit-video')
    }
  }));

  contextMenu.append(new MenuItem({
    id: "edit-video", label: 'Edit Video', visible: false,
    click: (menuItem, browserWindow, event) => {
      //mainWin.setAlwaysOnTop(menuItem.checked);
      mainWin.webContents.send('edit-video')
    }
  }));
  contextMenu.append(new MenuItem({
    label: 'Paste',
    accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V',
    click: (menuItem, browserWindow, event) => {
      console.log('click paste')

      handlePaste();
    }
  }));
  contextMenu.append(new MenuItem({ type: 'separator' }))

  contextMenu.append(new MenuItem({
    label: 'Always on Top', type: 'checkbox', checked: true,
    click: (menuItem, browserWindow, event) => {
      mainWin.setAlwaysOnTop(menuItem.checked);
    }
  }));
  globalShortcut.register('Control+Shift+I', () => {
    mainWin.webContents.openDevTools()
  });
  //globalShortcut.register('CommandOrControl+V', handlePaste)

  function handlePaste() {
    console.log('handlePaste')

    let payload = {}
    ///strimg = JSON.stringify(img)
    var formats = clipboard.availableFormats();
    var rawFilePath = clipboard.read('FileNameW');

    if (rawFilePath) {
      var filePath = rawFilePath.replace(new RegExp(String.fromCharCode(0), 'g'), '');
      payload.type = 'filePath'
      payload.filePath = filePath
      console.log(filePath)

    } else if (formats.indexOf('image/png') > -1) {
      img = clipboard.readImage();
      payload.type = 'dataURL'
      payload.dataURL = img.toDataURL().replace('png', 'gif')
    } else if (formats.indexOf('text/plain') > -1) {
      //potential link
      var potentialUrl = clipboard.readText()
      console.log("potentialUrl", potentialUrl)
      if (validateUrl(potentialUrl)) {
        payload.type = 'filePath'
        payload.filePath = potentialUrl
      } else {
        console.log('not a url')
        return
      }
    }

    console.log(formats)
    //console.log(payload)
    mainWin.webContents.send('clipboard', JSON.stringify(payload)) // send to web page
  }
  function addToRecent(filePath) {
    var recent = JSON.parse(store.get('recent') || "[]")
    console.log("addToRecent", store.get('recent'), filePath)
    let index = recent.indexOf(filePath)
    let exists = index != -1
    if (exists) {
      recent.splice(index, 1)
    }
    recent.push(filePath)
    store.set('recent', JSON.stringify(recent));
    console.log("addedToRecent", store.get('recent'), filePath)
    if (!exists) {
      recentSubmenu.append(new MenuItem({
        label: filePath,
        click: (menuItem, browserWindow, event) => {
          readAndLoadFilePath(menuItem.label)
        }
      }))
    }
  }
  function populateRecent() {
    var recent = JSON.parse(store.get('recent') || "[]")
    console.log("populateRecent", store.get('recent'))
    for (recentfile of recent) {
      recentSubmenu.append(new MenuItem({
        label: recentfile,
        click: (menuItem, browserWindow, event) => {
          readAndLoadFilePath(menuItem.label)
        }
      }))
    }
  }
  function loadMostRecent() {
    var recent = JSON.parse(store.get('recent') || "[]")
    if (recent.length > 0)
      readAndLoadFilePath(recent[recent.length - 1])
  }

  contextMenu.append(new MenuItem({ type: 'separator' }))

  function readAndLoadFilePath(filePath) {
    fs.readFile(filePath, (err, data) => {
      if (err) throw err;
      let newState = JSON.parse(data);
      mainWin.webContents.send('load-scene', newState, filePath)
    });
  }

  contextMenu.append(new MenuItem({
    label: "Recent", type: 'submenu',
    submenu: recentSubmenu
  }))
  populateRecent()
  contextMenu.append(new MenuItem({
    label: 'Load',
    click: (menuItem, browserWindow, event) => {
      dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'PurRef Gif Scene', extensions: ['purgif'] }
        ]
      }).then(result => {
        console.log(result.canceled)
        console.log("result.filePaths", result.filePaths)
        if (!result.canceled) {
          readAndLoadFilePath(result.filePaths[0])
        }
      }).catch(err => {
        console.log(err)
      })
    }
  }));
  contextMenu.append(new MenuItem({
    label: 'Save',
    click: (menuItem, browserWindow, event) => {
      dialog.showSaveDialog({
        defaultPath: 'scene.purgif',
        filters: [
          { name: 'PurRef Gif Scene', extensions: ['purgif'] }
        ]
      }).then(result => {
        console.log(result.canceled)
        console.log(result.filePath)
        if (!result.canceled) {
          mainWin.webContents.send('save-scene', result.filePath)
          addToRecent(result.filePath)
        }
      }).catch(err => {
        console.log(err)
      })
    }
  }));
  contextMenu.append(new MenuItem({
    label: 'New Scene',
    click: (menuItem, browserWindow, event) => {
      mainWin.webContents.send('new-scene')
    }
  }));
  contextMenu.append(new MenuItem({
    label: 'Close',
    click: (menuItem, browserWindow, event) => {
      browserWindow.close()
    }
  }));

  Menu.setApplicationMenu(contextMenu)

  if (process.argv.indexOf("debug") > -1)
    mainWin.webContents.openDevTools()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()

    }
  })

  app.on('browser-window-created', (event, win) => {
    win.webContents.on('context-menu', (e, params) => {
      //menu.popup(win, params.x, params.y)
    })
  })
  ipcMain.on('ready', (event, menuType) => {
    loadMostRecent()
  });
  ipcMain.on('show-context-menu', (event, menuType) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    console.log(menuType)
    contextMenu.getMenuItemById("edit-video").visible = false;
    contextMenu.getMenuItemById("close-edit-video").visible = false;
    if (menuType == 'youtube' || menuType == 'video') {
      contextMenu.getMenuItemById("edit-video").visible = true;
    } else if (menuType == 'edit-video') {
      contextMenu.getMenuItemById("close-edit-video").visible = true;
    }
    contextMenu.popup(win)
  })
  ipcMain.on('save-scene', (event, filePath, stateCopy) => {
    console.log('save', filePath, stateCopy)
    let data = JSON.stringify(stateCopy);
    fs.writeFileSync(filePath, data);
    //const win = BrowserWindow.fromWebContents(event.sender)
    //menu.popup(win)
  })
  let dragState = {
    dragging: false
  }
  ipcMain.on('handle-paste', (event, w, h) => {
    handlePaste()
  })
  ipcMain.on('loaded-state', (event, filePath) => {
    addToRecent(filePath)
  })
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

function validateUrl(value) {
  return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}