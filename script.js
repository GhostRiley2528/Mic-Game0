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

// ================= CONFIG =================
const GROUND_Y = 340;

// Player
let playerY = GROUND_Y - 36;
let velocity = 0;
let jumps = 0;
const orbRadius = 18;

// Obstacles
let obstacles = [];

// Score / difficulty
let score = 0;
let speed = 5;

// Sound
let audioCtx, analyser, dataArray;
const jumpThreshold = 40;
const doubleThreshold = 55;
let lastJump = false;
let lastDouble = false;

// ================= PARALLAX BACKGROUND =================
const bgStars = [];
for(let i=0;i<50;i++){
    bgStars.push({
        x: Math.random()*800,
        y: Math.random()*200,
        size: Math.random()*2+1,
        speed: Math.random()*0.5+0.2
    });
}
const bgGridLines = [];
for(let i=0;i<15;i++){
    bgGridLines.push({
        y: i*25
    });
}

// ================= CIRCLE-RECT COLLISION =================
function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx*dx + dy*dy) < (radius*radius);
}

// ================= PLAYER JUMP =================
function jump(){
    if(jumps >= 2) return;
    velocity = -12;
    jumps++;
}

// ================= RESET =================
function reset(){
    playerY = GROUND_Y - 36;
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
function spawnObstacle() {
    const type = Math.floor(Math.random() * 3);
    let o = { x: 800 };

    if(type === 0){ o.w = 30; o.h = 40; }
    if(type === 1){ o.w = 30; o.h = 70; }
    if(type === 2){ o.w = 50; o.h = 30; }

    o.y = GROUND_Y - o.h;
    obstacles.push(o);
}

// ================= MAIN LOOP =================
function update(){
    if(!running) return;

    // Background
    ctx.fillStyle = "#0c0032";
    ctx.fillRect(0,0,800,400);

    // Parallax stars
    for(let s of bgStars){
        s.x -= s.speed;
        if(s.x<0) s.x=800;
        ctx.fillStyle = "#b56cff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fill();
    }

    // Neon grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    for(let l of bgGridLines){
        ctx.beginPath();
        ctx.moveTo(0,l.y);
        ctx.lineTo(800,l.y);
        ctx.stroke();
    }

    // Gravity
    velocity += 0.6;
    playerY += velocity;

    if(playerY > GROUND_Y - 36){
        playerY = GROUND_Y - 36;
        velocity = 0;
        jumps = 0;
    }

    // ===== PLAYER ORB COLORS =====
// ===== PLAYER ORB COLORS =====
let orbColor="#00ffff";
if(rainbowMode){
    hue+=3;
    orbColor=`hsl(${hue%360}, 100%, 60%)`;
} else if(jumps===1) orbColor="#ff4fd8";
else if(jumps>=2) orbColor="#ff3333";


    // Outer ring
    ctx.strokeStyle=orbColor;
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(80,playerY+orbRadius,orbRadius,0,Math.PI*2);
    ctx.stroke();

    // Inner core
    ctx.fillStyle=orbColor;
    ctx.beginPath();
    ctx.arc(80,playerY+orbRadius,6,0,Math.PI*2);
    ctx.fill();

    // Spawn obstacles
    if(Math.random() < 0.015) spawnObstacle();

    // Move obstacles
    for(let i=obstacles.length-1;i>=0;i--){
        const o = obstacles[i];
        o.x -= speed;

        // Neon obstacle
        ctx.fillStyle="#b56cff";
        ctx.fillRect(o.x, o.y, o.w, o.h);

        // Fade trail behind
        ctx.fillStyle="rgba(181,108,255,0.3)";
        ctx.fillRect(o.x+10, o.y, o.w, o.h);

        // Collision
        if(circleRectCollision(80, playerY+orbRadius, orbRadius, o.x, o.y, o.w, o.h)){
            die();
            return;
        }

        // Remove + score
        if(o.x < -60){
            obstacles.splice(i,1);
            score++;
            scoreEl.innerText = score;

            if(score % 5 === 0) speed += 0.5;
        }
    }

    // Ground
    ctx.fillStyle="#222";
    ctx.fillRect(0,GROUND_Y,800,2);

    // Sound meter
    drawSoundBars();

    requestAnimationFrame(update);
}

// ================= BUTTONS =================
startBtn.onclick = async () => {
    running = true;
    status.innerText = "Running";
    startBtn.disabled = true;
    stopBtn.disabled = false;

    if(audioCtx && audioCtx.state === "suspended"){
        await audioCtx.resume();
    }

    initMic();
    update();
};

stopBtn.onclick=()=>{
    running=false;
    status.innerText="Stopped";
    startBtn.disabled=false;
    stopBtn.disabled=true;
    document.getElementById("secretPanel").style.display="block";  // ← ADD THIS
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
    try {
        audioCtx = new AudioContext();
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch(e){
        console.error("Mic error:", e);
    }
}

function getVolume(){
    if(!analyser) return 0;
    analyser.getByteFrequencyData(dataArray);
    let sum=0;
    for(let i=0;i<dataArray.length;i++) sum+=dataArray[i];
    return sum/dataArray.length;
}

function drawSoundBars(){
    const vol = getVolume();

    // Meter bg
    ctx.fillStyle="#1f1d2b";
    ctx.fillRect(10,50,20,300);

    // Volume
    ctx.fillStyle="#00ffff";
    ctx.fillRect(10,GROUND_Y-vol*2,20,vol*2);

    // Jump bar
    ctx.fillStyle="green";
    ctx.fillRect(5,GROUND_Y-jumpThreshold*2,30,2);

    // Double jump bar
    ctx.fillStyle="red";
    ctx.fillRect(5,GROUND_Y-doubleThreshold*2,30,2);

    // Trigger jumps
    if(vol > jumpThreshold && !lastJump){ jump(); lastJump=true; }
    if(vol > doubleThreshold && !lastDouble){ jump(); lastDouble=true; }
    if(vol < jumpThreshold) lastJump=false;
    if(vol < doubleThreshold) lastDouble=false;
}

let rainbowMode=false, hue=0;
document.getElementById("cheatToggle").onclick=()=>{
    let input=document.getElementById("cheatInput");
    input.style.display=input.style.display==="block"?"none":"block";
};
document.getElementById("applyCode").onclick=()=>{
    let code=document.getElementById("cheatCode").value.toUpperCase();
    if(code=="777"){score+=77;scoreEl.innerText=score;document.getElementById("cheatStatus").innerHTML="77pts! 💰"}
    if(code=="RAINBOW"){rainbowMode=!rainbowMode;document.getElementById("cheatStatus").innerHTML="🌈ORB RAINBOW "+(rainbowMode?"ON":"OFF"); hue=0;}
    document.getElementById("cheatCode").value="";
};
