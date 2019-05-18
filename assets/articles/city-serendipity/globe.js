
const canvas = document.getElementById('canvas');
// const canvas = document.createElement('canvas');

// canvas.id = 'someId';
canvas.height = 400;
canvas.width = 400;

// globeSpan.appendChild(canvas);

const ctx = canvas.getContext('2d');

const image = new Image();
image.addEventListener('load', () => {
  draw();
  console.log('drawing');
});
image.src = 'https://i.ibb.co/mJc3r1H/eiffell-globe.png';
const FRAME_COUNT = 8;
const FRAME_HEIGHT = 400;
const FRAME_WIDTH = 400;

const FRAME_Y_OFFSET = 0;

let speed = 1;
let step = 0;
let pos = 0;
function draw() {
  requestAnimationFrame(draw);
  
  const destinationX = 0;
  const destinationY = 0;
  ctx.clearRect(0,0, canvas.width, canvas.height);
  ctx.drawImage(
    image, 
    FRAME_WIDTH * pos, FRAME_Y_OFFSET, 
    FRAME_WIDTH, FRAME_HEIGHT, 
    destinationX, destinationY, 
    FRAME_WIDTH, FRAME_HEIGHT
  );
  
  if (buttonsDown[0]) speed = (mousePrev.x - mouse.x) / 10;
  speed = speed * 0.98;
  step += speed;
  pos = Math.round(mod(step/8, 7));
}

function mod(a, b) {
    return ((a%b)+b)%b;
};

const buttonsDown = {};
const mouse = {
  x: -1, y: -1
};
const mousePrev = {
  x: -1, y: -1
};
const el = canvas;
el.addEventListener('mousedown', e=>{
  e.preventDefault();
  buttonsDown[e.button] = true;
});
el.addEventListener('mouseup', e=>{
  e.preventDefault();
  buttonsDown[e.button] = false;
});
el.addEventListener('mousemove', e=>{
  mousePrev.x = mouse.x;
  mousePrev.y = mouse.y;
  const {left, top} = el.getBoundingClientRect()
  mouse.x = e.clientX - left;
  mouse.y = e.clientY - top;
});