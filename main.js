const {
    BrowserWindow,
    Menu,
    MenuItem,
    ipcMain,
    app,
    clipboard,
    screen,
    globalShortcut
  } = require('electron')
const path = require('path')

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
  win.setAlwaysOnTop(true);

  win.loadFile('index.html')
  return win;
}
console.log('hey')
app.whenReady().then(() => {
  const mainWin = createWindow()

  const menu = new Menu()
  menu.append(new MenuItem({ label: 'Always on Top', type: 'checkbox', checked: true, 
    click: (menuItem, browserWindow, event) => {
      mainWin.setAlwaysOnTop(menuItem.checked);
    } 
  }));

  //globalShortcut.register('CommandOrControl+V', handlePaste)

  function handlePaste(){
    console.log('handlePaste')

    let payload = {}
      ///strimg = JSON.stringify(img)
      var formats = clipboard.availableFormats();
      var rawFilePath = clipboard.read('FileNameW');

      if(rawFilePath) {
        var filePath = rawFilePath.replace(new RegExp(String.fromCharCode(0), 'g'), '');
        payload.type = 'filePath'
        payload.filePath = filePath
        console.log(filePath)
        
      } else if(formats.indexOf('image/png') > -1) {
        img = clipboard.readImage();
        payload.type = 'dataURL'
        payload.dataURL = img.toDataURL().replace('png','gif')
      } else if(formats.indexOf('text/plain') > -1) {
        //potential link
        var potentialUrl = clipboard.readText()
        console.log("potentialUrl", potentialUrl)
        if(validateUrl(potentialUrl)){
          payload.type = 'filePath'
          payload.filePath = potentialUrl
        }
      }

      console.log(formats)
      //console.log(payload)
      mainWin.webContents.send('clipboard', JSON.stringify(payload)) // send to web page
  }

  menu.append(new MenuItem({ label: 'Paste',
  accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V',
    click: (menuItem, browserWindow, event) => {
      console.log('click paste')
      
      handlePaste();
    } 
  }));
  
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ 
    label: 'Close',
    click: (menuItem, browserWindow, event) => {
      browserWindow.close()
    }
  }));

  Menu.setApplicationMenu(menu)

  mainWin.webContents.openDevTools()
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
  ipcMain.on('handle-paste', (event, w, h) => {
    handlePaste()
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