const {
  ipcRenderer, 
  contextBridge 
} = require('electron')

const interact = require('./interact.min.js')
let state = {
  init: false,
  currentScale: 1,
  translate: {
    translateX: 0,
    translateY: 0
  },
  elements: [

  ]
}

function loadState(loadedState){
  // file stuff

  if(!state.init)
    init();
  document.getElementById('itemHolder').innerHTML = ''

  updateScaleAndTranslate(loadedState.currentScale, loadedState.translate)

  state.elements = []
  for(var i in loadedState.elements){
    addMediaWithPath(loadedState.elements[i].path, loadedState.elements[i].type, loadedState.elements[i])
  }
}

document.addEventListener('keydown', evt => {
  if(evt.key === 'Delete'){
    
    console.log('delete selected')
    deleteSelected()
  } else if (evt.key === 'v' && evt.ctrlKey) {
    ipcRenderer.send('handle-paste')
    console.log('Ctrl+V was pressed');
  }
});

document.addEventListener('contextmenu', () => {
  if(mouseObj.dragToggle) {
    mouseObj.dragToggle = false; 
    return;
  }
  
    ipcRenderer.send('show-context-menu')
})
let mouseObj = {
  initPos: null,
  initClientPos: null,
  dragToggle: false,
  //time dragging & distance dragged
}
document.addEventListener('mousedown', (e) => {
  mouseObj.initPos = {x: e.clientX, y: e.clientY}
  mouseObj.initClientPos = {x: e.screenX, y: e.screenY}
  ipcRenderer.send('record-window-size', window.innerHeight, window.innerHeight)
  mouseObj.dragToggle = false
})
document.addEventListener('mousemove', (e) => {
  if(e.buttons == 2){
      ipcRenderer.send('move-electron-window', e.screenX, e.screenY, mouseObj.initPos)
      mouseObj.dragToggle = true;
      
  }
})
document.addEventListener('mouseup', (e) => {
  if(mouseObj.dragToggle){
    distance = Math.sqrt(
                Math.pow(e.screenX - mouseObj.initClientPos.x, 2) 
                +
                Math.pow(e.screenY - mouseObj.initClientPos.y, 2) );

    if(distance < 4){ 
      mouseObj.dragToggle = false;
    }

  }
})
ipcRenderer.on('load-scene', (event, newState) =>{
  loadState(newState)
})
ipcRenderer.on('save-scene', (event, filePath) =>{
  var stateCopy = JSON.parse(JSON.stringify(state));
  for(var i = 0; i < stateCopy.elements.length; i++){
    //stateCopy.elements.push()
    delete stateCopy.elements[i].element;
  }
  console.log(stateCopy)
  ipcRenderer.send('save-scene', filePath, stateCopy)
})
ipcRenderer.on('clipboard', (event, msg) => {
  let payload = JSON.parse(msg);
  console.log(payload)
  if(/youtube.com\/.*v=([^\?]*)/.test(payload[payload.type])){
    addMediaWithPath(payload[payload.type], "youtube")
  }else
    addMediaWithPath(payload[payload.type])
  /*
  if(payload.type == 'filePath'){
    addMediaWithPath(payload.filePath)
    //addImageWithPath(payload.filePath)
  }
  if(payload.type == 'dataURL'){
    addMediaWithPath(payload.filePath)
    //addImageWithPath(payload[payload.type])
    //URL.createObjectURL(object)
  }
  */
})

function addMediaWithPath(path, type = 'img', loadedState={ x: 0, y: 0, width: null, height: null}){
  if(!state.init) init();
  document.querySelector('#welcome') && document.querySelector('#welcome').remove()
  let itemHolder = document.getElementById('itemHolder')

  let mediaElement = undefined
  if(type =='img'){
    mediaElement = document.createElement('img')
    mediaElement.src = path;
  } else if(type == 'video'){
    mediaElement = document.createElement('video')
    mediaElement.autoplay = true;
    mediaElement.loop = true;
    mediaElement.muted = true;
    let srcElement = document.createElement('source')
    srcElement.src = path;
    mediaElement.appendChild(srcElement)
  } else if(type == 'youtube') {
    //mediaElement = document.createElement('iframe')
    if(/youtube.com\/.*v=([^\?]*)/.test(path)){

      var code = extractYoutubeId(path)
      if(code == null) return;
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
      document.getElementById('eventTrigger').dataset.trigger = Date.now()
      /*
      mediaElement.src = 
      `https://www.youtube.com/embed/${code}?` +//&autoplay=1` +
      `&controls=0&disablekb=1&enablejsapi=1&fs=0&loop=1` +
      `&origin=${window.location.href}`
      mediaElement.frameBorder = "0"
      mediaElement.allowFullscreen = false;
      */
    }
  } else{
    alert('unsupported media type')
    return;
  }
  mediaElement.classList.add('draggable')

  zIndex = state.elements.length;
  mediaElement.style.zIndex = zIndex
  mediaElement.dataset.zIndex = zIndex
  mediaElement.dataset.x = loadedState.x
  mediaElement.dataset.y = loadedState.y
  if(loadedState.width != null && loadedState.height != null){
    mediaElement.width = loadedState.width
    mediaElement.height = loadedState.height
  }
  state.elements.push({
    path: path,
    type: type,
    element: mediaElement,
    width: loadedState.width,
    height: loadedState.height
  })

  itemHolder.appendChild(mediaElement)

  setTransformForElement(zIndex)
}

document.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  //if(!state.init) init();
  // Todo check if file is valid
  
  
  for (const f of event.dataTransfer.files) {
      // Using the path attribute to get absolute file path
      console.log('File Path of dragged files: ', f.path, state)
      
      if(f.path.endsWith('.mp4')){
        addMediaWithPath(f.path, 'video')
      } else
        addMediaWithPath(f.path)
    }
});
function init(){
  document.documentElement.addEventListener('mousedown', (event) => {
    var target = event.target
    //console.log('click', target)
    
    if(target.id == 'root'){
      console.log('background click')
      clearAllSelected()
    }
  })
}

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});
function extractYoutubeId(path){
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
  var capture = path.match(regExp)//path.match(/v=([^\?]*)/);

  return capture[7]
}

function updateScaleAndTranslate(newScale, newTranslate){
  state.currentScale = newScale
  state.translate = newTranslate
  document.body.style.transform = `translate(${state.translate.translateX}px, ${state.translate.translateY}px) scale(${state.currentScale})`
  document.body.dataset.currentScale = state.currentScale
  document.body.dataset.translateX = state.translate.translateX
  document.body.dataset.translateY = state.translate.translateY

  //window.currentScale = state.currentScale;
}
let objPlayground = {hi:'yo'};
contextBridge.exposeInMainWorld('myAPI', {
  updateScaleAndTranslate: updateScaleAndTranslate,
  updateYoutubeOriginalSize: (idcode, w, h) => {
    for(var i in state.elements){
      if(state.elements[i].type == 'youtube' && extractYoutubeId(state.elements[i].path) == idcode){
        state.elements[i].width = state.elements[i].width || w;
        state.elements[i].height = state.elements[i].height || h;
        
        state.elements[i].element.style.width = state.elements[i].width
        state.elements[i].element.style.height = state.elements[i].height
        console.log(state.elements[i])
      }
    }
    
  },
  objPlayground: objPlayground

})

interact('.draggable')
  .draggable({
    listeners: { move: dragMoveListener },
    inertia: false
  }).on('tap', function (event) {
    var target = event.target
    console.log(objPlayground)
    handleSelected(target)
    //
    event.preventDefault()
  })

interact('.selectedItem').resizable({
  // resize from all edges and corners
  //allowFrom: '.selectedItem',
  edges: { left: true, right: true, bottom: true, top: true },
  ratio: 1,
  enabled: true,
  listeners: [{
    move (event) {
      var target = event.target
      //handleSelected(target, true)
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

function deleteSelected(){
  if(state.elements.length == 0) return
  
  if(!state.elements[state.elements.length - 1].element.classList.contains('selectedItem')) return

  state.elements[state.elements.length - 1].element.remove();
  //delete state.elements[state.elements.length - 1].element
  state.elements.pop();
  clearAllSelected()
}

function clearAllSelected(){
  document.querySelectorAll('.selectedItem').forEach((elm)=>{
    elm.classList.remove('selectedItem')
    elm.classList.add('draggable')
  })
}
function handleSelected(target, dragging = false){
  /*
  var isSelected = target.classList.contains('selectedItem')
  
  if(!dragging){
    clearAllSelected()
  }
  if(!isSelected){
    if(dragging){
      clearAllSelected()
      
    }
    target.classList.remove('draggable')
    target.classList.add('selectedItem')
  }*/
  clearAllSelected()
  target.classList.remove('draggable')
  target.classList.add('selectedItem')
  
  if(state.elements.length > 1){
    let targetIndex = target.dataset.zIndex;
    state.elements.push(state.elements.splice(targetIndex, 1)[0]);
    for(var i = targetIndex; i < state.elements.length; i++){ // i can start at targetIndex
      state.elements[i].element.style.zIndex = i;
      state.elements[i].element.dataset.zIndex = i;
    }
  }
}

function dragMoveListener (event) {
  var target = event.target
  handleSelected(target, true)
  setTransformForElement(target.dataset.zIndex, event.dx, event.dy)
  /*
  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + (event.dx / state.currentScale) //+ (state.translate.translateX / state.currentScale)
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + (event.dy / state.currentScale) //+ (state.translate.translateY / state.currentScale)
  //x = x / state.currentScale
  //y = y / state.currentScale

  // translate the element
  target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

  // update the posiion attributes
  target.setAttribute('data-x', x)
  target.setAttribute('data-y', y)
  state.elements[target.dataset.zIndex].x = x
  state.elements[target.dataset.zIndex].y = y
  */
  forceRedraw()
}

function setTransformForElement(elementIndex, dx = 0, dy = 0, width = null, height = null){
  let elementObj = state.elements[elementIndex]
  let x = (parseFloat(elementObj.element.dataset.x) || 0) + (dx / state.currentScale)
  let y = (parseFloat(elementObj.element.dataset.y) || 0) + (dy / state.currentScale)
  elementObj.element.setAttribute('data-x', x)
  elementObj.element.setAttribute('data-y', y)
  elementObj.x = x
  elementObj.y = y

  if(width != null && height != null){
    elementObj.width = width / state.currentScale
    elementObj.height = height / state.currentScale
    elementObj.element.style.width = width / state.currentScale + 'px'
    elementObj.element.style.height = height / state.currentScale + 'px'
  }

  elementObj.element.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
}

function forceRedraw(){
  if(document.body.parentElement.style.backgroundColor == ''){
    document.body.parentElement.style.backgroundColor = '#04040400'
  } else{
    document.body.parentElement.style.backgroundColor = ''
  }
}
