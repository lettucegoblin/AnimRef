
const sliderElement = document.querySelector('#slider')
noUiSlider.create(sliderElement, {
    start: [00, 100],
    connect: true,
    behaviour: 'unconstrained-tap',
    range: {
        'min': 0,
        'max': 100
    }
});
slider.noUiSlider.on('start', function () { 

});

const factor = 0.1
document.documentElement.addEventListener("wheel", (e) => {
    if(document.querySelector('.editVideo')) return;
    currentScale = parseFloat(document.body.dataset.currentScale) || 1
    let delta = e.wheelDelta/120
    
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

    // lifts youtube video to last element at the root of body 
    event.target.getIframe().contentDocument.body.appendChild(player.getIframe().contentDocument.querySelector('video'))

    event.target.playVideo();
}


var done = false;
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    //setTimeout(stopVideo, 6000);
    let videoElement = event.target.getIframe().contentDocument.querySelector('video')
    videoElement.loop = true
    /*
    videoElement.addEventListener('timeupdate', function(){
        //if im the editvideo
        if(document.querySelector(`.editVideo[data-idcode="${this.dataset.idcode}"]`)){
            onPlayerProgress.apply(this, arguments)
        }
    })*/

    let videoWidth = videoElement.videoWidth
    let videoHeight = videoElement.videoHeight
    //console.log('inside onPlayerStateChange', videoWidth, videoHeight)
    let idcode = event.target.getIframe().parentElement.dataset.idcode
    
    videoElement.dataset.idcode = idcode
    //console.log('after onPlayerStateChange', videoElement.dataset.idcode, videoWidth, videoHeight)
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
            if(mutation.attributeName == 'data-youtubetrigger'){
                embedYoutubeVideo()
            } else if(mutation.attributeName == 'data-changesliders'){
                //console.log(mutation)
                //
                let changesliders = JSON.parse(mutation.target.dataset.changesliders)
                slider.noUiSlider.set(changesliders);
            }
            
        }
    }
};
const observer = new MutationObserver(callback);
// Start observing the target node for configured mutations
observer.observe(targetNode, config);
function embedYoutubeVideo(){
    var playerNeedsSetup = document.querySelector('.playerNeedsSetup');
    if(!playerNeedsSetup) {
        console.error('embedYoutubeVideo called without player div to setup')
    };
    playerNeedsSetup.classList.remove('playerNeedsSetup')
    var iframediv = playerNeedsSetup.querySelector('.iframeDiv')
    var code = playerNeedsSetup.dataset.idcode
    
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