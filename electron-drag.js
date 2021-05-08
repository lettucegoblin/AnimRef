var tryRequire = require('try-require')
var $ = require('dombo')

var electron = tryRequire('electron')
var remote = electron ? electron.remote : tryRequire('remote')

var mouseConstructor = tryRequire('osx-mouse') || tryRequire('win-mouse')

var supported = !!mouseConstructor
var noop = function () { return noop }

var drag = function (element) {
  element = $(element)

  var offset = null
  var mouse = mouseConstructor()

  var onmousedown = function (e) {
    offset = [e.clientX, e.clientY]
  }

  element.on('mousedown', onmousedown)
  let lastSend = Date.now()
  mouse.on('left-drag', function (x, y) {
    if (!offset) return
    //if(Date.now() - lastSend < 500) return;

    x = Math.round(x - offset[0])
    y = Math.round(y - offset[1])

    // setPosition throws error if called with -0
    ipcRenderer.send('move-electron-window', x + 0, y + 0)
    
    //.setPosition(x + 0, y + 0)
  })

  mouse.on('left-up', function () {
    offset = null
  })

  return function () {
    element.off('mousedown', onmousedown)
    mouse.destroy()
  }
}

drag.supported = supported
module.exports = supported ? drag : noop