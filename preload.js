const {
  ipcRenderer,
  contextBridge,
  ipcMain
} = require('electron')

const addEvent = function (el, type, fn) {
  if (el.addEventListener)
    el.addEventListener(type, fn, false);
  else
    el.attachEvent('on' + type, fn);
};

const extend = function (obj, ext) {
  for (var key in ext)
    if (ext.hasOwnProperty(key))
      obj[key] = ext[key];
  return obj;
};

const interact = require('./interact.min.js')
let state = {
  mode: 'init', // 'init', 'standard', 'edit-video'
  editVideo: {

  },
  currentScale: 1,
  translate: {
    translateX: 0,
    translateY: 0
  },
  elements: [

  ],
  workspaceRect: {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  }
}

let videoExample = {
  loopPairs: [[0, 119], [44, 56]], // can derive A, B, C & color coding from index
  activeLoopPair: 0
}
function closeEditVideo() {
  //state.editVideo.videoElement.removeEventListener('timeupdate', onPlayerProgress)
  state.mode = 'standard'
  updateScaleAndTranslate(state.editVideo.backupState.currentScale, state.editVideo.backupState.translate)
  state.editVideo.video.element.className = state.editVideo.backupState.elementClasses
  document.querySelector('#root').classList.remove('disableBorder')
  document.querySelector('#editVideoTools').classList.add('hide')
  state.editVideo = {}
}

function editVideo(video) {
  console.log('video', video)
  state.mode = 'edit-video'
  document.querySelector('#root').style.cursor = ""
  state.editVideo.video = video
  state.editVideo.backupState = {
    currentScale: state.currentScale,
    translate: Object.assign({}, state.translate),
    elementClasses: video.element.className
  }
  updateScaleAndTranslate(1, {
    translateX: 0,
    translateY: 0
  })

  video.element.className = "editVideo"
  document.querySelector('#root').classList.add('disableBorder')
  document.querySelector('#editVideoTools').classList.remove('hide')

  document.getElementById('eventTrigger').dataset.changesliders = JSON.stringify(video.loopPairs[video.activeLoopPair])

  if (video.type == 'youtube') {
    state.editVideo.videoElement = document.querySelector('.editVideo iframe').contentDocument.querySelector('video')
  } else {
    state.editVideo.videoElement = document.querySelector('.editVideo')
  }

  //state.editVideo.videoElement.addEventListener('timeupdate', onPlayerProgress)
  //

  console.log(video)
}

function onPlayerProgress(e) {
  //am i editvideo?
  //  handle edit stuff
  let sliderPositions = document.querySelectorAll('.noUi-handle')
  let leftSliderPercent = Math.min(sliderPositions[0]['ariaValueText'], sliderPositions[1]['ariaValueText'])
  let rightSliderPercent = Math.max(sliderPositions[0]['ariaValueText'], sliderPositions[1]['ariaValueText'])
  //state.editVideo.video
  let sliderElement = document.querySelector('#slider')
  let currentTimePercent = (this.currentTime / this.duration * 100)

  if (this != state.editVideo.videoElement) {

    let leftPercent = parseFloat(this.dataset.loopLeft)
    let rightPercent = parseFloat(this.dataset.loopRight)
    //console.log('im not edit video',leftPercent, rightPercent)
    if (leftPercent > currentTimePercent) {
      this.currentTime = percentToCurrentTime(leftPercent, this.duration)
      currentTimePercent = (this.currentTime / this.duration * 100)
    }
    if (rightPercent < currentTimePercent) {
      this.currentTime = percentToCurrentTime(leftPercent, this.duration)
      currentTimePercent = (this.currentTime / this.duration * 100)
    }
    return;
  }

  //console.log('im edit video')

  state.editVideo.video.loopPairs[state.editVideo.video.activeLoopPair][0] = leftSliderPercent
  state.editVideo.video.loopPairs[state.editVideo.video.activeLoopPair][1] = rightSliderPercent
  this.dataset.loopLeft = leftSliderPercent
  this.dataset.loopRight = rightSliderPercent

  //console.log(state.editVideo.video.loopPairs, leftSliderPercent, rightSliderPercent)

  if (sliderElement.classList.contains('noUi-state-drag')) {
    dragPercent = parseFloat(sliderElement.querySelector('.noUi-active')['ariaValueNow'])
    this.currentTime = percentToCurrentTime(dragPercent, this.duration)
  } else {
    if (leftSliderPercent > currentTimePercent) {
      this.currentTime = percentToCurrentTime(leftSliderPercent, this.duration)
      currentTimePercent = (this.currentTime / this.duration * 100)
    }
    if (rightSliderPercent < currentTimePercent) {
      //.noUi-state-drag
      if (sliderElement.classList.contains('noUi-state-drag')) {
        this.currentTime = percentToCurrentTime(rightSliderPercent, this.duration)
      } else
        this.currentTime = percentToCurrentTime(leftSliderPercent, this.duration)

      currentTimePercent = (this.currentTime / this.duration * 100)
    }
  }
  let progressBarWidth = sliderElement.getBoundingClientRect().width // 10

  let progressBarTimePosition = progressBarWidth * (currentTimePercent / 100) // 4
  //    transform: translateX(41.4966%);
  document.getElementById('progressbar').style.transform = `translateX(${progressBarTimePosition}px)`
  //sliderElement.style.background = `linear-gradient(90deg, rgba(78,47,102,1) 0%, rgba(91,52,122,1) ${progressBarTimePosition}px, rgba(113,80,136,1) ${progressBarTimePosition}px, rgba(121,76,157,1) 100%)`

}
function percentToCurrentTime(percent, duration) {
  if (percent >= 100) return duration
  if (percent <= 0) return 0
  let ct = (percent * duration) / 100
  console.log("percentToCurrentTime", ct)
  return ct
}

function newScene() {
  document.getElementById('itemHolder').innerHTML = ''
  updateScaleAndTranslate(1, {
    translateX: 0,
    translateY: 0
  });
  initWorkspace()
  refreshWorkspace()

  state.elements = []
  document.querySelector('#welcome').classList.remove("hide")
}

function loadState(loadedState, filePath) {
  // file stuff

  if (state.mode == 'init')
    init();


  newScene()
  updateScaleAndTranslate(loadedState.currentScale, loadedState.translate)

  setTimeout(function () {
    for (var i in loadedState.elements) {
      addMediaWithPath(loadedState.elements[i].path, loadedState.elements[i].type, loadedState.elements[i])
    }
    ipcRenderer.send('loaded-state', filePath)
  }, 1000);
}

document.addEventListener('keydown', evt => {
  mouseObj.keys[evt.key] = true


  if (evt.key === 'Delete') {

    console.log('delete selected')
    deleteSelected()
  } else if (evt.key === 'v' && evt.ctrlKey) {
    ipcRenderer.send('handle-paste')
    console.log('Ctrl+V was pressed');
  } else if (evt.key === ' ' && evt.ctrlKey) {
    mouseObj.ctrlSpace = true;
    console.log('Ctrl+space was pressed');
  } else if (evt.key === ' ') {
    mouseObj.space = true;
  }
});

document.addEventListener('keyup', evt => {
  mouseObj.keys[evt.key] = false
  console.log('keyup', evt.key);
  if (evt.key === ' ' || evt.key == 'Control') {
    mouseObj.ctrlSpace = false;
    console.log('Ctrl+space was released');
    if (evt.key === ' ') {
      mouseObj.space = false;
    }
  }

})

function getSelected() {
  if (document.querySelector('.editVideo')) return { type: 'edit-video' }
  let lastIndex = state.elements.length - 1
  if (!state.elements[lastIndex] || !state.elements[lastIndex].element.classList.contains('selectedItem')) return null

  return state.elements[lastIndex]
}
document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  console.log(state)
  if (mouseObj.dragging) {
    mouseObj.dragging = false;
    return;
  }


})
let mouseObj = {
  initPos: null,
  initClientPos: null,
  dragging: false,
  ctrlSpace: false,
  space: false,
  keys: new Object(),
  //time dragging & distance dragged
}
document.addEventListener('mousedown', (e) => {
  mouseObj.initPos = { x: e.clientX, y: e.clientY }
  mouseObj.initClientPos = { x: e.screenX, y: e.screenY }
  mouseObj.initTranslate = { x: (parseFloat(document.body.dataset.translateX) || 0), y: (parseFloat(document.body.dataset.translateY) || 0) }
  ipcRenderer.send('record-window-size', window.innerHeight, window.innerHeight)
  mouseObj.dragging = false
})
document.addEventListener('mousemove', (e) => {

  // ctrl + space + mouse drag = zoom 
  if (e.buttons == 1 && mouseObj.keys[' '] && mouseObj.keys['Control']) {
    //console.log(`handleZoom(${e.movementX})`);
    handleZoom(e.movementX, mouseObj.initPos.x, mouseObj.initPos.y)
    e.preventDefault()
  } else if (e.buttons == 1 && mouseObj.space) {
    handleMove(e.movementX, e.movementY)
  } else if (e.buttons == 4) { // middle mouse drag = move
    handleMove(e.movementX, e.movementY)
  } else if (e.buttons == 2) {
    ipcRenderer.send('move-electron-window', e.screenX, e.screenY, mouseObj.initPos)
    mouseObj.dragging = true;

  }

})
function handleMove(dX, dY) {
  currentScale = parseFloat(document.body.dataset.currentScale) || 1


  let translateX = (parseFloat(document.body.dataset.translateX) || 0);
  let translateY = (parseFloat(document.body.dataset.translateY) || 0);//(parseFloat(document.body.dataset.translateY) || 0);
  translateX += dX
  translateY += dY //- mouseObj.initTranslate.y 

  updateScaleAndTranslate(currentScale, { translateX, translateY })
}

function handleZoom(_delta, clientX, clientY) {
  if (document.querySelector('.editVideo')) return;
  currentScale = parseFloat(document.body.dataset.currentScale) || 1
  let delta = _delta / 60

  const nextScale = Math.max(currentScale + delta * (currentScale / 2), 0.01)
  const ratio = 1 - nextScale / currentScale
  let translateX = (parseFloat(document.body.dataset.translateX) || 0);
  let translateY = (parseFloat(document.body.dataset.translateY) || 0);

  translateX += (clientX - translateX) * ratio
  translateY += (clientY - translateY) * ratio

  currentScale = nextScale
  updateScaleAndTranslate(currentScale, { translateX, translateY })
  //zoom(nextScale, e)
}
document.addEventListener('mouseup', (e) => {
  console.log(e.button, mouseObj.dragging)
  if (e.button == 2) {
    if (mouseObj.dragging) {

      distance = Math.sqrt(
        Math.pow(e.screenX - mouseObj.initClientPos.x, 2)
        +
        Math.pow(e.screenY - mouseObj.initClientPos.y, 2));
      console.log(distance)
      if (distance < 4) {

        ipcRenderer.send('show-context-menu', getSelected()?.type || "void")
      }
      mouseObj.dragging = false;

    } else {
      ipcRenderer.send('show-context-menu', getSelected()?.type || "void")
    }
  }
})
ipcRenderer.on('close-edit-video', (event, newState) => {
  closeEditVideo()
})
ipcRenderer.on('edit-video', (event, newState) => {
  editVideo(getSelected())
})
ipcRenderer.on('new-scene', (event) => {
  newScene()
})
ipcRenderer.on('load-scene', (event, newState, filePath) => {
  loadState(newState, filePath)
})
ipcRenderer.on('save-scene', (event, filePath) => {
  var stateCopy = JSON.parse(JSON.stringify(state));
  for (var i = 0; i < stateCopy.elements.length; i++) {
    //stateCopy.elements.push()
    delete stateCopy.elements[i].element;
  }
  console.log(stateCopy)
  ipcRenderer.send('save-scene', filePath, stateCopy)
})
ipcRenderer.on('clipboard', (event, msg) => {
  let payload = JSON.parse(msg);
  console.log(payload)
  if (/youtube.com\/.*v=([^\?]*)/.test(payload[payload.type])) {
    addMediaWithPath(payload[payload.type], "youtube")
  } else
    addMediaWithPath(payload[payload.type], payload.type)
})
function getCenterOfWindowScaled() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const widthScaled = (width / 2) / state.currentScale;
  const heightScaled = (height / 2) / state.currentScale;
  return {
    centerX: (-state.translate.translateX / state.currentScale) + widthScaled,
    centerY: (-state.translate.translateY / state.currentScale) + heightScaled
  };
}
function addMediaWithPath(path, type = 'img', loadedState) {
  isNewElement = loadedState == null
  let centerWin = getCenterOfWindowScaled();
  loadedState = loadedState || { x: centerWin.centerX, y: centerWin.centerY, width: null, height: null }
  if (state.mode == 'init') init();
  if (!document.querySelector('#welcome').classList.contains("hide"))
    document.querySelector('#welcome').classList.add("hide");
  let itemHolder = document.getElementById('itemHolder')

  let mediaElement = undefined
  if (type == 'img' || type == 'dataURL' || type == 'filePath') {
    mediaElement = document.createElement('img')
    if (isNewElement)
      mediaElement.style.opacity = 0;
    mediaElement.addEventListener('load', function loaded() {
      let { x, y, width, height } = this.getClientRects()[0]
      if (isNewElement) {

        //loadedState.x = centerWin.centerX - width / 2
        //loadedState.y = centerWin.centerY - height / 2
        mediaElement.style.opacity = 1;
        setTransformForElement(mediaElement.dataset.zIndex, -width / 2, -height / 2, width, height)
      }
      resizeWorkspaceToFitObj(loadedState.x, loadedState.y, width, height)

    })
    mediaElement.src = path;
  } else if (type == 'video') {
    mediaElement = document.createElement('video')
    mediaElement.autoplay = true;
    mediaElement.loop = true;
    mediaElement.muted = true;

    let srcElement = document.createElement('source')
    srcElement.src = path;
    mediaElement.appendChild(srcElement)
  } else if (type == 'youtube') {
    //mediaElement = document.createElement('iframe')
    if (/youtube.com\/.*v=([^\?]*)/.test(path)) {

      var code = extractYoutubeId(path)
      if (code == null) return;
      mediaElement = document.createElement('div')
      mediaElement.classList.add('youtubePlayer')
      mediaElement.classList.add('playerNeedsSetup')
      mediaElement.dataset.idcode = code

      mediaElement.style.width = (loadedState.width || 640) + "px";
      mediaElement.style.height = (loadedState.height || 360) + "px";

      //mediaElement.style.background = 'red'
      var iframeDiv = document.createElement('div')
      iframeDiv.classList.add('iframeDiv')
      mediaElement.appendChild(iframeDiv)
      document.getElementById('eventTrigger').dataset.youtubetrigger = Date.now()
      /*
      mediaElement.src = 
      `https://www.youtube.com/embed/${code}?` +//&autoplay=1` +
      `&controls=0&disablekb=1&enablejsapi=1&fs=0&loop=1` +
      `&origin=${window.location.href}`
      mediaElement.frameBorder = "0"
      mediaElement.allowFullscreen = false;
      */
    }
  } else if (type == "text") {
    mediaElement = document.createElement('div')
    mediaElement.classList.add('textElement')
    mediaElement.innerText = path

    console.log("isNewElement", isNewElement)
    if (isNewElement) {
      /*
      mediaElement.style.fontSize = '1ch' // 1ch is the width of the 0 character
      mediaElement.style.opacity = 0
      document.body.appendChild(mediaElement)
      let { x, y, width: widthOnDom, height: heightOnDom } = mediaElement.getClientRects()[0]

      document.body.removeChild(mediaElement)
      const windowWidth = window.innerWidth

      const fontScaleFactor = windowWidth / widthOnDom
      newWidth = windowWidth / state.currentScale
      newHeight = (heightOnDom * (windowWidth / widthOnDom)) / state.currentScale

      mediaElement.style.opacity = 1
      mediaElement.style.fontSize = fontScaleFactor + "ch"
      mediaElement.style.width = newWidth + "px";
      mediaElement.style.height = newHeight + "px";
      */
      
      const { width: newWidth, height: newHeight } = adjustFontSize2(mediaElement, path)
      loadedState.x = centerWin.centerX - (newWidth / state.currentScale / 2)
      loadedState.y = centerWin.centerY - (newHeight / state.currentScale / 2)

      loadedState.width = newWidth
      loadedState.height = newHeight
    } else {
      //debugger;
      const { width: newWidth, height: newHeight } = adjustFontSize2(mediaElement, path, loadedState.width)
      oldRatio = loadedState.width / loadedState.height
      console.log("oldRatio", oldRatio, "newRatio", newWidth / newHeight)
      mediaElement.style.width = loadedState.width + "px";
      mediaElement.style.height = newHeight + "px";
      loadedState.width = newWidth
      loadedState.height = newHeight
    }
    mediaElement.width = loadedState.width
    mediaElement.height = loadedState.height

  } else {
    alert('unsupported media type')
    return;
  }
  mediaElement.classList.add('draggable')

  zIndex = state.elements.length;
  mediaElement.style.zIndex = zIndex
  mediaElement.dataset.zIndex = zIndex
  mediaElement.dataset.x = loadedState.x
  mediaElement.dataset.y = loadedState.y
  if (loadedState.width != null && loadedState.height != null) {
    mediaElement.width = loadedState.width
    mediaElement.height = loadedState.height
  }
  let mediaObj = {
    path: path,
    type: type,
    element: mediaElement,
    width: loadedState.width,
    height: loadedState.height
  }
  if (type == 'youtube' || type == 'video') {
    mediaObj.loopPairs = loadedState.loopPairs || [[0, 100]] // 0% & 100% positions for loop
    mediaObj.activeLoopPair = loadedState.activeLoopPair || 0
  }

  state.elements.push(mediaObj)
  if (type == 'video') {
    mediaObj.element.dataset.loopLeft = mediaObj.loopPairs[mediaObj.activeLoopPair][0]
    mediaObj.element.dataset.loopRight = mediaObj.loopPairs[mediaObj.activeLoopPair][1]
    mediaObj.element.addEventListener('timeupdate', onPlayerProgress)
  }

  itemHolder.appendChild(mediaElement)

  //debugger;
  if (type == 'text') {
    //setTransformForElement(zIndex, 0, 0, loadedState.width, loadedState.height)
    console.log("loadedState", loadedState, mediaElement)
    setTransformForElement(zIndex)

    //adjustFontSize2(mediaElement, path, loadedState.width)
  } else
    setTransformForElement(zIndex)
}
function adjustFontSize2(mediaElement, text, maxWidth = window.innerWidth) {
  temp = document.createElement('div')
  temp.style.fontSize = '1ch' // 1ch is the width of the 0 character
  temp.style.position = 'absolute'
  temp.style.opacity = 0
  temp.style.color = "white"
  temp.style.whiteSpace = "nowrap"
  temp.innerText = text
  document.getElementById('hiddenTextTester').appendChild(temp)
  let { x, y, width: widthOnDom, height: heightOnDom } = temp.getClientRects()[0]

  newRatio = widthOnDom / heightOnDom
  console.log("widthOnDom", widthOnDom, "HeightOnDom", heightOnDom, temp.clientWidth, temp.clientHeight, newRatio)
  document.getElementById('hiddenTextTester').removeChild(temp)
  const windowWidth = maxWidth

  const fontScaleFactor = (maxWidth / widthOnDom) //* state.currentScale
  //const fontScaleFactorScaled = fontScaleFactor / state.currentScale
  newWidth = maxWidth
  //newWidthScaled = newWidth / state.currentScale
  newHeight = (heightOnDom * fontScaleFactor)
  //newHeightScaled = newHeight / state.currentScale
  console.log("Adjustfont2", fontScaleFactor, state.currentScale)
  mediaElement.style.opacity = 1
  mediaElement.style.fontSize = fontScaleFactor * state.currentScale + "ch"
  mediaElement.style.width = newWidth + "px";
  mediaElement.style.height = newHeight + "px";

  return { width: newWidth, height: newHeight }
}

document.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  // Todo check if file is valid


  for (const f of event.dataTransfer.files) {
    // Using the path attribute to get absolute file path
    console.log('File Path of dragged files: ', f.path, state)

    if (f.path.endsWith('.mp4')) {
      addMediaWithPath(f.path, 'video')
    } else
      addMediaWithPath(f.path)
  }
});
function init() {
  document.documentElement.addEventListener('mousedown', (event) => {
    var target = event.target
    //console.log('click', target)

    if (target.id == 'root' || target.id == 'workspaceBox') {
      console.log('background click')
      clearAllSelected()
    }
  })
  state.mode = 'standard'
}

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});
function extractYoutubeId(path) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
  var capture = path.match(regExp)//path.match(/v=([^\?]*)/);

  return capture[7]
}

function clampWorkspaceTranslate(ratio, newTranslate) {
  let { translateX, translateY } = newTranslate

  let windowElement = document.getElementById('root')
  let windowWidth = windowElement.clientWidth
  let windowHeight = windowElement.clientHeight

  if (-(translateX) > state.workspaceRect.x2 * ratio) { //workspace off screen to left
    console.log('workspace off screen to left')
    translateX = -(state.workspaceRect.x2 * ratio)
  }
  else if ((translateX) + (state.workspaceRect.x1 * ratio) > windowWidth) { // workspace off screen to right
    console.log('workspace off screen to right')
    translateX = windowWidth - (state.workspaceRect.x1 * ratio)
  }

  if (-(translateY) > state.workspaceRect.y2 * ratio) { // workspace off screen to top
    console.log('workspace off screen to top')
    translateY = -(state.workspaceRect.y2 * ratio)
  }
  else if ((translateY) + (state.workspaceRect.y1 * ratio) > windowHeight) { // workspace off screen to bottom
    console.log('workspace off screen to bottom')
    translateY = windowHeight - (state.workspaceRect.y1 * ratio)
  }
  return { translateX: translateX, translateY: translateY }
}

function updateScaleAndTranslate(newScale, newTranslate) {
  if (newScale > 2) {
    state.currentScale = 2
    return;
  }

  newTranslate = clampWorkspaceTranslate(newScale, newTranslate)
  state.currentScale = newScale
  state.translate = newTranslate
  document.body.style.transform = `translate(${state.translate.translateX}px, ${state.translate.translateY}px) scale(${state.currentScale})`
  document.body.dataset.currentScale = state.currentScale
  document.body.dataset.translateX = state.translate.translateX
  document.body.dataset.translateY = state.translate.translateY
  const ROOTCSS = document.querySelector(':root');
  ROOTCSS.style.setProperty('--scale', newScale);
  //window.currentScale = state.currentScale;
}

let objPlayground = { hi: 'yo' };
contextBridge.exposeInMainWorld('myAPI', {
  updateScaleAndTranslate: updateScaleAndTranslate,
  updateYoutubeOriginalSize: (idcode, w, h) => {
    for (var i in state.elements) {
      if (state.elements[i].type == 'youtube' && extractYoutubeId(state.elements[i].path) == idcode) {

        state.elements[i].width = state.elements[i].width || w;
        state.elements[i].height = state.elements[i].height || h;

        state.elements[i].element.style.width = state.elements[i].width
        state.elements[i].element.style.height = state.elements[i].height

        let videoElement = state.elements[i].element.querySelector('iframe').contentDocument.querySelector('video');
        videoElement.dataset.loopLeft = state.elements[i].loopPairs[state.elements[i].activeLoopPair][0]
        videoElement.dataset.loopRight = state.elements[i].loopPairs[state.elements[i].activeLoopPair][1]
        videoElement.addEventListener('timeupdate', onPlayerProgress)
        console.log(state.elements[i])
      }
    }

  },
  objPlayground: objPlayground

})

interact('.draggable')
  .draggable({
    listeners: { move: dragMoveListener },
    inertia: false,
  }).on('tap', function (event) {
    var target = event.target

    handleSelected(target)
    //
    event.preventDefault()
  })
function isMouseInBlockingState() {
  if (mouseObj.keys[' '] && mouseObj.keys['Control']) {
    return true
  } else if (mouseObj.keys[' ']) {
    return true
  }
  return false
}
interact('.selectedItem').resizable({
  // resize from all edges and corners
  //allowFrom: '.selectedItem',
  edges: { left: true, right: true, bottom: true, top: true },
  ratio: 1,
  enabled: true,
  margin: 4,
  listeners: [{
    move(event) {
      if (isMouseInBlockingState()) return;
      var target = event.target
      //handleSelected(target, true)
      console.log('resize')

      if (target.classList.contains('textElement')) {
        adjustFontSize2(target, target.innerText, event.rect.width)
      }
      setTransformForElement(target.dataset.zIndex, event.deltaRect.left, event.deltaRect.top, event.rect.width, event.rect.height)
      forceRedraw()
    }
  }],
  modifiers: [
    interact.modifiers.aspectRatio({
      // make sure the width is always double the height
      ratio: 'preserve',
      // also restrict the size by nesting another modifier
    }),
    // minimum size
    interact.modifiers.restrictSize({
      min: { width: 10 }
    })
  ],
  inertia: true
}).draggable({
  listeners: { move: dragMoveListener },
  inertia: false
}).on('tap', function (event) {

  var target = event.target
  handleSelected(target)
  //
  event.preventDefault()
})

function deleteSelected() {
  if (state.elements.length == 0) return

  if (!state.elements[state.elements.length - 1].element.classList.contains('selectedItem')) return

  state.elements[state.elements.length - 1].element.remove();
  //delete state.elements[state.elements.length - 1].element
  state.elements.pop();
  clearAllSelected()
}

function clearAllSelected() {
  document.querySelectorAll('.selectedItem').forEach((elm) => {
    elm.classList.remove('selectedItem')
    elm.classList.add('draggable')
  })
}

function handleSelected(target, dragging = false) {
  if (isMouseInBlockingState()) return;

  clearAllSelected()
  target.classList.remove('draggable')
  target.classList.add('selectedItem')

  if (state.elements.length > 1) {
    let targetIndex = parseInt(target.dataset.zIndex);

    state.elements.push(state.elements.splice(targetIndex, 1)[0]);
    for (var i = targetIndex; i < state.elements.length; i++) { // i can start at targetIndex
      state.elements[i].element.style.zIndex = i;
      state.elements[i].element.dataset.zIndex = i;
    }
  }
}

function dragMoveListener(event) {
  if (isMouseInBlockingState()) return;
  var target = event.target
  handleSelected(target, true)
  setTransformForElement(target.dataset.zIndex, event.dx, event.dy)
  forceRedraw()
}

function resizeWorkspaceToFitObj(x, y, width, height) {
  if (width == 0 || height == 0) return
  state.workspaceRect.x1 = Math.min(x, state.workspaceRect.x1)
  state.workspaceRect.y1 = Math.min(y, state.workspaceRect.y1)

  state.workspaceRect.x2 = Math.max(x + width, state.workspaceRect.x2)
  state.workspaceRect.y2 = Math.max(y + height, state.workspaceRect.y2)
  refreshWorkspace()
}

function initWorkspace() {
  state.workspaceRect = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  }
}

function refreshWorkspace() {
  const element = document.getElementById('workspaceBox');
  element.style.left = state.workspaceRect.x1 + "px";
  element.style.top = state.workspaceRect.y1 + "px";
  element.style.width = (state.workspaceRect.x2 - state.workspaceRect.x1) + "px"
  element.style.height = (state.workspaceRect.y2 - state.workspaceRect.y1) + "px"

}

function setTransformForElement(elementIndex, dx = 0, dy = 0, width = null, height = null) {
  let elementObj = state.elements[elementIndex]
  let x = (parseFloat(elementObj.element.dataset.x) || 0) + (dx / state.currentScale)
  let y = (parseFloat(elementObj.element.dataset.y) || 0) + (dy / state.currentScale)

  elementObj.element.setAttribute('data-x', x)
  elementObj.element.setAttribute('data-y', y)
  elementObj.x = x
  elementObj.y = y

  if (width != null && height != null) {
    elementObj.width = width / state.currentScale
    elementObj.height = height / state.currentScale
    elementObj.element.style.width = width / state.currentScale + 'px'
    elementObj.element.style.height = height / state.currentScale + 'px'
  }

  resizeWorkspaceToFitObj(x, y, elementObj.width || elementObj.element.width, elementObj.height || elementObj.element.height)

  elementObj.element.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
}

function forceRedraw() {
  if (document.body.parentElement.style.backgroundColor == '') {
    document.body.parentElement.style.backgroundColor = '#04040400'
  } else {
    document.body.parentElement.style.backgroundColor = ''
  }
}


window.addEventListener('load', (event) => {
  setTimeout(function () {
    console.log('page is fully loaded');
    ipcRenderer.send('ready')
  }, 2000);

});
