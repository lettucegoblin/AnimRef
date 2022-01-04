
const factor = 0.1
document.documentElement.addEventListener("wheel", (e) => {
    if(document.querySelector('.editVideo')) return;
    currentScale = parseFloat(document.body.dataset.currentScale) || 1
    let delta = event.wheelDelta/120
    
    const nextScale = Math.max(currentScale + delta * (currentScale / 2), 0.01)
    console.log(delta, currentScale, nextScale)
    zoom(nextScale, e)

})
const zoom = (nextScale, event) => {
    currentScale = parseFloat(document.body.dataset.currentScale) || 1

    const ratio = 1 - nextScale / currentScale

    const {
    clientX,
    clientY
    } = event

    let translateX = (parseFloat(document.body.dataset.translateX) || 0);
    let translateY = (parseFloat(document.body.dataset.translateY) || 0);

    translateX += (clientX - translateX) * ratio
    translateY += (clientY - translateY) * ratio

    
    currentScale = nextScale
    myAPI.updateScaleAndTranslate(currentScale, {translateX, translateY})
}

/**
 * Youtube Embed Section
 */
    
var player;
function onYouTubeIframeAPIReady() {} // idk why it breaks without this

function onPlayerReady(event) {
    event.target.setVolume(0);
    event.target.mute();

    
    event.target.getIframe().contentDocument.body.appendChild(player.getIframe().contentDocument.querySelector('video'))

    event.target.playVideo();
}


var done = false;
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    //setTimeout(stopVideo, 6000);
    event.target.getIframe().contentDocument.querySelector('video').loop = true
    let videoWidth = event.target.getIframe().contentDocument.querySelector('video').videoWidth
    let videoHeight = event.target.getIframe().contentDocument.querySelector('video').videoHeight
    console.log(videoWidth, videoHeight)
    let idcode = event.target.getIframe().parentElement.dataset.idcode
    myAPI.updateYoutubeOriginalSize(idcode, videoWidth, videoHeight)
    //event.target.getIframe().parentElement.style.width = videoWidth + 'px'
    //event.target.getIframe().parentElement.style.height = videoHeight + 'px'
    done = true;
  }
}
function stopVideo() {
  player.stopVideo();
}
const targetNode = document.getElementById('eventTrigger');
const config = { attributes: true};
const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
        }
        else if (mutation.type === 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
            embedYoutubeVideo()
        }
    }
};
const observer = new MutationObserver(callback);
// Start observing the target node for configured mutations
observer.observe(targetNode, config);
function embedYoutubeVideo(){
    var playerNeedsSetup = document.querySelector('.playerNeedsSetup');
    var iframediv = playerNeedsSetup.querySelector('.iframeDiv')
    var code = playerNeedsSetup.dataset.idcode
    playerNeedsSetup.classList.remove('playerNeedsSetup')
    //document.querySelector()
    player = new YT.Player(iframediv, {
        videoId: code,
        playerVars: {
        //'playsinline': 1
        'controls': 0,
        'disablekb': 1,
        'enablejsapi': 1,
        'fs': 0,
        'loop': 1
        },
        events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
        }
    });
}