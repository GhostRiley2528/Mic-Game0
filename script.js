const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

const scoreEl = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const restartBtn = document.getElementById("restartBtn");
const overlay = document.getElementById("overlay");
const status = document.getElementById("status");

let running = false;
let gameOver = false;

// Player
let playerY = 300;
let velocity = 0;
let jumps = 0;

// Obstacles
let obstacles = [];

// Score / difficulty
let score = 0;
let speed = 5;

// Sound
let audioCtx, analyser, dataArray;
const jumpThreshold = 48;
const doubleThreshold = 75;
let lastJump = false;
let lastDouble = false;

// ================= PLAYER =================

function jump(){
if(jumps >= 2) return;
velocity = -12;
jumps++;
}

// ================= RESET =================

function reset(){
playerY = 300;
velocity = 0;
jumps = 0;
score = 0;
speed = 5;
obstacles = [];
gameOver = false;
overlay.style.display = "none";
scoreEl.innerText = 0;
}

// ================= DEATH =================

function die(){
if(gameOver) return;
gameOver = true;
running = false;
overlay.style.display = "flex";
status.innerText = "Game Over";
stopBtn.disabled = true;
startBtn.disabled = false;
}

// ================= OBSTACLES =================

function spawnObstacle(){

const type = Math.floor(Math.random()*3);

let o = { x:800, w:30, h:40 };

if(type===0){ o.h=40; }
if(type===1){ o.h=70; }
if(type===2){ o.w=50; o.h=30; }

obstacles.push(o);
}

// ================= MAIN LOOP =================

function update(){

if(!running) return;

ctx.clearRect(0,0,800,400);

// Gravity
velocity += 0.6;
playerY += velocity;

if(playerY > 300){
playerY = 300;
velocity = 0;
jumps = 0;
}

// ===== PLAYER ORB COLORS =====

let orbColor="#00ffff";
if(jumps===1) orbColor="#ff4fd8";
if(jumps>=2) orbColor="#ff3333";

// Outer ring
ctx.strokeStyle=orbColor;
ctx.lineWidth=3;
ctx.beginPath();
ctx.arc(80,playerY+18,18,0,Math.PI*2);
ctx.stroke();

// Inner core
ctx.fillStyle=orbColor;
ctx.beginPath();
ctx.arc(80,playerY+18,6,0,Math.PI*2);
ctx.fill();

// Spawn obstacles
if(Math.random()<0.015) spawnObstacle();

// Move obstacles
for(let i=obstacles.length-1;i>=0;i--){

const o=obstacles[i];
o.x-=speed;

// Neon obstacle
ctx.fillStyle="#b56cff";
ctx.fillRect(o.x,300-(o.h-40),o.w,o.h);

// Fade trail
ctx.fillStyle="rgba(181,108,255,0.3)";
ctx.fillRect(o.x+10,300-(o.h-40),o.w,o.h);

// Collision
if(
80 < o.x+o.w &&
80+36 > o.x &&
playerY+36 > 300-(o.h-40)
){
die();
return;
}

// Remove + score
if(o.x<-60){
obstacles.splice(i,1);
score++;
scoreEl.innerText=score;

// Difficulty scaling
if(score%5===0) speed+=0.5;
}

}

// Ground
ctx.fillStyle="#444";
ctx.fillRect(0,340,800,2);

// Sound meter
drawSoundBars();

requestAnimationFrame(update);
}

// ================= BUTTONS =================

startBtn.onclick=()=>{
running=true;
status.innerText="Running";
startBtn.disabled=true;
stopBtn.disabled=false;
initMic();
update();
};

stopBtn.onclick=()=>{
running=false;
status.innerText="Stopped";
startBtn.disabled=false;
stopBtn.disabled=true;
};

restartBtn.onclick=()=>{
reset();
running=true;
status.innerText="Running";
startBtn.disabled=true;
stopBtn.disabled=false;
update();
};

// ================= SOUND =================

async function initMic(){

audioCtx=new AudioContext();

const stream=await navigator.mediaDevices.getUserMedia({audio:true});
const source=audioCtx.createMediaStreamSource(stream);

analyser=audioCtx.createAnalyser();
analyser.fftSize=256;

source.connect(analyser);

dataArray=new Uint8Array(analyser.frequencyBinCount);
}

function getVolume(){

if(!analyser) return 0;

analyser.getByteFrequencyData(dataArray);

let sum=0;
for(let i=0;i<dataArray.length;i++) sum+=dataArray[i];

return sum/dataArray.length;
}

function drawSoundBars(){

const vol=getVolume();

// Meter bg
ctx.fillStyle="#222";
ctx.fillRect(10,50,20,300);

// Volume
ctx.fillStyle="#00ffff";
ctx.fillRect(10,350-vol*3,20,vol*3);

// Jump bar
ctx.fillStyle="green";
ctx.fillRect(5,350-jumpThreshold*3,30,2);

// Double jump bar
ctx.fillStyle="red";
ctx.fillRect(5,350-doubleThreshold*3,30,2);

// Trigger jumps (edge detection)

if(vol>jumpThreshold&&!lastJump){
jump();
lastJump=true;
}

if(vol>doubleThreshold&&!lastDouble){
jump();
lastDouble=true;
}

if(vol<jumpThreshold) lastJump=false;
if(vol<doubleThreshold) lastDouble=false;
}
