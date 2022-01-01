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
    addImageWithPath(loadedState.elements[i].path, loadedState.elements[i].x, loadedState.elements[i].y, loadedState.elements[i].width, loadedState.elements[i].height)
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
  if(payload.type == 'filePath'){
    addImageWithPath(payload.filePath)
  }
  if(payload.type == 'dataURL'){
    addImageWithPath(payload[payload.type])
    //URL.createObjectURL(object)
  }
})
function addVideoWithPath(path){
  var elementObj = {
    path: path,
    type: undefined,
    element: undefined
  }
  let vidElement = document.createElement('video')
  vidElement.autoplay = true;
  vidElement.muted = true;
  vidElement.classList.add('draggable')
  let srcElement = document.createElement('source')
  srcElement.src = path;
  vidElement.appendChild(srcElement)
  
  elementObj.type = 'video'
  elementObj.element = vidElement

  state.elements.push(elementObj)
  

  itemHolder.appendChild(elementObj.element)
}
function addImageWithPath(path, x = 0, y = 0, width = -1, height = -1){
  document.querySelector('#welcome') && document.querySelector('#welcome').remove()
  let itemHolder = document.getElementById('itemHolder')
  let newImg = document.createElement('img')
  newImg.src = path;
  newImg.classList.add('draggable')
  zIndex = state.elements.length;
  newImg.style.zIndex = zIndex
  newImg.dataset.zIndex = zIndex
  newImg.dataset.x = x
  newImg.dataset.y = y
  if(width != -1 && height != -1){
    newImg.width = width
    newImg.height = height
  }
  state.elements.push({
    path: path,
    type: 'img',
    element: newImg,
    width: width,
    height: height
  })

  itemHolder.appendChild(newImg)

  setTransformForElement(zIndex)
}

document.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  if(!state.init) init();
  // Todo check if file is valid
  
  
  for (const f of event.dataTransfer.files) {
      // Using the path attribute to get absolute file path
      console.log('File Path of dragged files: ', f.path, state)
      if(f.path.endsWith('.mp4')){
        addVideoWithPath(f.path)
      } else
        addImageWithPath(f.path)
    }
});
function init(){
  document.documentElement.addEventListener('click', (event) => {
    var target = event.target
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

function updateScaleAndTranslate(newScale, newTranslate){
  state.currentScale = newScale
  state.translate = newTranslate
  document.body.style.transform = `translate(${state.translate.translateX}px, ${state.translate.translateY}px) scale(${state.currentScale})`
  document.body.dataset.currentScale = state.currentScale
  document.body.dataset.translateX = state.translate.translateX
  document.body.dataset.translateY = state.translate.translateY

  //window.currentScale = state.currentScale;
}

contextBridge.exposeInMainWorld('myAPI', {
  updateScaleAndTranslate: updateScaleAndTranslate
})

interact('.draggable')
  .draggable({
    listeners: { move: dragMoveListener },
    inertia: false
  }).on('tap', function (event) {
    var target = event.target
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
  }
  
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

function setTransformForElement(elementIndex, dx = 0, dy = 0, width = -1, height = -1){
  let elementObj = state.elements[elementIndex]
  let x = (parseFloat(elementObj.element.dataset.x) || 0) + (dx / state.currentScale)
  let y = (parseFloat(elementObj.element.dataset.y) || 0) + (dy / state.currentScale)
  elementObj.element.setAttribute('data-x', x)
  elementObj.element.setAttribute('data-y', y)
  elementObj.x = x
  elementObj.y = y

  if(width != -1 && height != -1){
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
