const sounds = document.getElementById('sounds');
const soundsText = document.getElementById('sounds-text');

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

const audioElement = sounds.querySelector('audio');
const playImg = sounds.querySelector('#play');
const pauseImg = sounds.querySelector('#pause');

const track = audioContext.createMediaElementSource(audioElement);
track.connect(audioContext.destination);

audioElement.loop = true;

sounds.addEventListener('click',  ()=> {
     if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (sounds.dataset.playing === 'false') {
       play();
    } else if (sounds.dataset.playing === 'true') {
        pause();
    }
});

function play() {
    audioElement.play();
    sounds.dataset.playing = 'true';
    playImg.style.display = 'none';
    pauseImg.style.display = 'block';
    soundsText.innerText = 'Pause';
}


function pause() {
    audioElement.pause();
    sounds.dataset.playing = 'false';
    pauseImg.style.display = 'none';
    playImg.style.display = 'block';
    soundsText.innerText = 'Play';
}