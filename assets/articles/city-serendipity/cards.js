const wrap = document.getElementById('cards');
let cardIndex = 0;

const cards = Array.from(wrap.getElementsByClassName('card'));

let startX = 0;
let pullX = 0;
let isAnimating = false;
let threshold = getThresholdValue();

function getThresholdValue() {
    const width = window.innerWidth;
    return width < 768 ? 200 : width / 4;
}


console.log(threshold);

cards.forEach(c => {
    c.addEventListener('mousedown', e => start(e));
    c.addEventListener('touchstart', e => start(e), { passive: false });
})


wrap.addEventListener('mouseup', e => stop(e));
wrap.addEventListener('touchend', e => stop(e));

wrap.addEventListener('touchmove', e => drag(e), { passive: false });
wrap.addEventListener('mousemove', e => drag(e));




function stop(ev) {
    isAnimating = false;
    startX = 0;
    cards[cardIndex].style.transform = `translateX(${0}px) rotate(${0}deg)`;
}

function start(ev) {
    isAnimating = true;
    startX = ev.x || ev.changedTouches[0].clientX;
    cards[cardIndex].classList.add('active'); 
}

function drag(ev) {
    if (isAnimating) {
        let eventX = ev.x || ev.changedTouches[0].pageX;
        pullX = eventX - startX;
        let deg = pullX / 10;
        // console.log(cards[0]);
        cards[cardIndex].style.transform = `translateX(${pullX}px) rotate(${deg}deg)`;

        if (Math.abs(pullX) > threshold) {
            isAnimating = false;
            cards[cardIndex].classList.add('gone');

            if (pullX > 0) {
                cards[cardIndex].classList.add('gone--right')
            } else {
                cards[cardIndex].classList.add('gone--left')
            }
            
            cardIndex++;
        } 
    }
}