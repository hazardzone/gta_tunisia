const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const panel=document.getElementById('panel'), toast=document.getElementById('mission-toast'), interact=document.getElementById('interact');
const mobileMenuButton=document.getElementById('mobile-menu-button');
const mobileNav=document.getElementById('mobile-nav');
const mobileActionButton=document.getElementById('mobile-action-button');
const joystickBase=document.getElementById('joystick-base');
const joystickKnob=document.getElementById('joystick-knob');
const rotateOverlay=document.getElementById('rotate-overlay');

let W=0,H=0,keys={},last=0,gameTime=0,openPanel='journal';
const state={money:2450,critical:0,peace:62,mission:0,evidence:0,side:{uni:false,budget:false,health:false,relations:false,addiction:false,friends:false,confidence:false}};
const player={x:780,y:520,r:15,speed:185};
const world={w:2300,h:1450};
const joystickState={active:false,pointerId:null,vectorX:0,vectorY:0,maxDistance:46};

const zones=[
 {x:0,y:0,w:2300,h:1450,c:'#080d1a'},
 {x:0,y:0,w:2300,h:260,c:'#241340'},
 {x:0,y:260,w:2300,h:1190,c:'#091725'},
 {x:90,y:370,w:520,h:330,c:'#0e2030',name:'Médina'},
 {x:700,y:310,w:590,h:360,c:'#102536',name:'Centre Ville'},
 {x:1380,y:340,w:650,h:360,c:'#0c2231',name:'Lac 1'},
 {x:300,y:900,w:600,h:340,c:'#112032',name:'Manzah'},
 {x:1020,y:850,w:720,h:350,c:'#0d1d2c',name:'Les Berges'},
];
const locations=[
 {x:390,y:530,label:'MÉDINA',color:'#ff20d5'},
 {x:1010,y:470,label:'CENTRE',color:'#20d9ff'},
 {x:1650,y:500,label:'LAC',color:'#21ff78'},
 {x:560,y:1080,label:'UNIVERSITY',color:'#ffe35c'},
 {x:1370,y:1020,label:'CAFÉ',color:'#b33cff'},
];
const interactables=[
 {x:1010,y:470,title:'Street Interview',kind:'confirmed',text:'You directly heard a shop owner describe a real event.',reward:20},
 {x:390,y:530,title:'Médina Post',kind:'uncertain',text:'A viral post mixes a real photo with a dramatic caption.',reward:15},
 {x:1370,y:1020,title:'Café Regulars',kind:'unverified',text:'Three people repeat a rumor. Nobody has primary evidence.',reward:10},
 {x:560,y:1080,title:'University Noticeboard',kind:'confirmed',text:'An official notice gives a real application deadline.',reward:25},
 {x:1650,y:500,title:'News Kiosk',kind:'uncertain',text:'Two headlines cover the same event with very different framing.',reward:20},
];

function clamp(value,min,max){return Math.min(Math.max(value,min),max)}
function isTouchDevice(){return navigator.maxTouchPoints>0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);}
function isPortraitMode(){return window.innerHeight > window.innerWidth;}

function resize(){
  const viewport = window.visualViewport || {width:window.innerWidth,height:window.innerHeight};
  const width = Math.max(320, viewport.width || window.innerWidth);
  const height = Math.max(420, viewport.height || window.innerHeight);
  W = width;
  H = height;
  canvas.width = Math.round(width * devicePixelRatio);
  canvas.height = Math.round(height * devicePixelRatio);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const mobileMode = isTouchDevice() && window.innerWidth <= 768;
  document.body.classList.toggle('mobile-mode', mobileMode);
  const showPortraitOverlay = mobileMode && isPortraitMode();
  rotateOverlay.classList.toggle('show', showPortraitOverlay);
  if (mobileMode) {
    panel.classList.add('mobile-panel');
  } else {
    panel.classList.remove('mobile-panel');
  }
}

addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  keys[key]=true;
  if(['w','a','s','d','e','f','m','j','c','i','t','p','escape'].includes(key)) e.preventDefault();
  handleKey(key);
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

document.querySelectorAll('[data-panel]').forEach((button)=>{
  button.addEventListener('click',()=>{
    showPanel(button.dataset.panel);
    if (mobileNav.classList.contains('open')) mobileNav.classList.remove('open');
  });
});

mobileMenuButton.addEventListener('click',()=>{
  mobileNav.classList.toggle('open');
});
mobileActionButton.addEventListener('click',()=>interactNow());

function handleKey(k){
  if(k==='escape'){panel.classList.remove('open'); mobileNav.classList.remove('open'); return;}
  const map={j:'journal',m:'map',c:'characters',i:'inventory',t:'stats',p:'settings',f:'journal'};
  if(map[k]) showPanel(map[k]);
  if(k==='e') interactNow();
}

function showPanel(name){
  openPanel=name;
  panel.classList.add('open');
  document.querySelectorAll('nav button').forEach((button)=>button.classList.toggle('active', button.dataset.panel===name));
  const mobileButtons=document.querySelectorAll('.mobile-nav-card button');
  mobileButtons.forEach((button)=>button.classList.toggle('active', button.dataset.panel===name));
  renderPanel();
}

function renderPanel(){
  const evidenceProgress = `${state.evidence}/5`;
  let html='';
  if(openPanel==='journal') html=`<h1>MISSION 01 — <span class="neon">THE FEED</span></h1><p>Social Media is a Different Kind of Drug.</p><div class="card"><h2>WHAT HAPPENED</h2><ul><li>Woke up and checked Instagram. <span class="tag confirmed">CONFIRMED</span></li><li>Saw crime, police, scams and violence. <span class="tag confirmed">CONFIRMED</span></li><li>Nothing happened directly to you. <span class="tag confirmed">CONFIRMED</span></li><li>Spent hours scrolling and felt worse. <span class="tag confirmed">CONFIRMED</span></li></ul></div><div class="card"><h2>WHAT IT MIGHT MEAN</h2><ul><li>Real events may be only a small part of the full picture. <span class="tag uncertain">UNCERTAIN</span></li><li>Your feed may be a biased slice chosen by an algorithm. <span class="tag uncertain">UNCERTAIN</span></li><li>Fear-heavy content can be amplified by constant exposure. <span class="tag uncertain">UNCERTAIN</span></li></ul></div><div class="card"><h2>SOCIAL-MEDIA LORE</h2><ul><li>“Tunis is falling apart.” <span class="tag unverified">UNVERIFIED</span></li><li>“Police are everywhere.” <span class="tag unverified">UNVERIFIED</span></li><li>“Scams are targeting everyone.” <span class="tag unverified">UNVERIFIED</span></li></ul></div><div class="card"><h2>OBJECTIVE</h2><p>Explore Tunis, collect <b>${evidenceProgress}</b> pieces of evidence, and separate what happened from what the feed tells you it means.</p></div>`;
  if(openPanel==='missions') html=`<h1>MISSIONS</h1><div class="card"><h2>01 · THE FEED</h2><p>Collect evidence around Tunis. Interact with 5 marked locations.</p><p class="confirmed">Progress: ${evidenceProgress}</p></div><div class="card"><h2>SIDE QUESTS</h2><p>University Application · Money & Budgeting · Health & Medication · Relationships · Finding Real Friends · Rebuilding Confidence.</p></div>`;
  if(openPanel==='map') html=`<h1>MAP — TUNIS</h1><p>Walk the city and investigate marked locations.</p><div class="card" style="height:380px;position:relative;background:#071725"><div style="position:absolute;inset:15px;border:1px solid #15506b;background:radial-gradient(circle,#17334a,#07121d)">${locations.map(l=>`<div style="position:absolute;left:${(l.x/world.w)*90}%;top:${(l.y/world.h)*85}%;color:${l.color};font-weight:bold;font-size:12px">◆ ${l.label}</div>`).join('')}</div></div><p>Controls: WASD to move · E to investigate · F for journal.</p>`;
  if(openPanel==='characters') html=`<h1>CHARACTERS</h1>${[['CJ (You)','Trying to build a better future in Tunisia.'],['The Online Influencer','Posts the “truth” — or whatever gets views.'],['Café Regulars','Some are friends, some are just talking.'],['The System','Police, bureaucracy, family pressure, society.'],['The Dream','Education, freedom, financial stability.']].map(x=>`<div class="card"><h2>${x[0]}</h2><p>${x[1]}</p></div>`).join('')}`;
  if(openPanel==='inventory') html=`<h1>INVENTORY</h1><div class="card"><h2>PHONE</h2><p>Battery: 82% · Feed exposure: ${Math.max(0,100-state.critical*7)}%</p></div><div class="card"><h2>EVIDENCE</h2><p>${state.evidence} / 5 collected.</p></div><div class="card"><h2>CASH</h2><p class="confirmed">$${String(state.money).padStart(7,'0')}</p></div>`;
  if(openPanel==='stats') html=`<h1>STATS</h1><div class="card"><h2>CRITICAL THINKING</h2><p style="font-size:28px;color:#21ff78">${state.critical}</p><p>Evidence inspected.</p></div><div class="card"><h2>PEACE</h2><p style="font-size:28px;color:#ff20d5">${state.peace}%</p><p>Higher is better. Touch grass occasionally.</p></div><div class="card"><h2>MISSION STATUS</h2><p>${state.evidence===5?'MISSION COMPLETE':'IN PROGRESS'}</p></div>`;
  if(openPanel==='settings') html=`<h1>SETTINGS</h1><div class="card"><h2>ACCESSIBILITY</h2><p>Game is playable with keyboard. Panels can be closed with ESC.</p></div><div class="card"><h2>PHILOSOPHY</h2><p>Real life > feed. The game does not tell you what to believe; it asks you to inspect the evidence.</p></div>`;
  panel.innerHTML=html;
}

function notify(title,text){
  toast.innerHTML=`<b>${title}</b><div style="margin-top:6px">${text}</div>`;
  toast.classList.remove('hidden');
  clearTimeout(notify.t);
  notify.t=setTimeout(()=>toast.classList.add('hidden'),3800);
}

function interactNow(){
  const n=nearest();
  if(!n) return;
  if(!n.done){
    n.done=true;
    state.evidence++;
    state.critical+=1;
    state.money+=n.reward;
    state.peace=Math.min(100,state.peace+3);
    notify('EVIDENCE LOGGED',`${n.title}: ${n.text} <span class="tag ${n.kind}">${n.kind.toUpperCase()}</span>`);
    if(state.evidence===5){
      state.money+=250;
      notify('MISSION COMPLETE','THE FEED complete. Reward: +10 Critical Thinking · +$250');
    }
  } else {
    notify('ALREADY INVESTIGATED','You already logged this location. Look for another marker.');
  }
  renderPanel();
  updateHud();
  updateInteractionPrompt();
}

function nearest(){
  let best=null;
  let d=75;
  for(const n of interactables){
    const dd=Math.hypot(player.x-n.x,player.y-n.y);
    if(dd<d){best=n;d=dd;}
  }
  return best;
}

function getMovementInput(){
  const keyboardX=(keys.d?1:0)-(keys.a?1:0);
  const keyboardY=(keys.s?1:0)-(keys.w?1:0);
  const x=keyboardX + joystickState.vectorX;
  const y=keyboardY + joystickState.vectorY;
  const length=Math.hypot(x,y);
  if(length>1){
    return {x:x/length,y:y/length};
  }
  return {x:x||0,y:y||0};
}

function update(dt){
  const movement=getMovementInput();
  const hasMovement = movement.x || movement.y;
  if(hasMovement){
    const length=Math.hypot(movement.x,movement.y) || 1;
    const moveX=movement.x/length;
    const moveY=movement.y/length;
    player.x += moveX * player.speed * dt;
    player.y += moveY * player.speed * dt;
    player.x = clamp(player.x,30,world.w-30);
    player.y = clamp(player.y,300,world.h-30);
    state.peace = Math.max(0, state.peace - dt * 0.35);
  }

  gameTime += dt;
  updateHud();
  updateInteractionPrompt();
}

function updateHud(){
  document.getElementById('clock').textContent = gameClock();
  document.getElementById('cash').textContent = '$' + String(state.money).padStart(7,'0');
  document.getElementById('mobile-time').textContent = gameClock();
  document.getElementById('mobile-cash').textContent = '$' + String(state.money).padStart(7,'0');
  document.getElementById('mobile-mission').textContent = `${state.evidence}/5`;
}

function updateInteractionPrompt(){
  const n=nearest();
  const panelOpen = panel.classList.contains('open');
  const touchMode = isTouchDevice() && window.innerWidth <= 768;

  if(touchMode){
    interact.classList.add('hidden');
    if(n && !panelOpen){
      mobileActionButton.textContent = 'INVESTIGATE';
      mobileActionButton.setAttribute('aria-label', `Investigate ${n.title}`);
      mobileActionButton.classList.remove('hidden');
    } else {
      mobileActionButton.classList.add('hidden');
    }
    return;
  }

  mobileActionButton.classList.add('hidden');
  if(n && !panelOpen){
    interact.textContent = `E · ${n.title}`;
    interact.classList.remove('hidden');
  } else {
    interact.classList.add('hidden');
  }
}

function gameClock(){
  const h=(22+Math.floor(gameTime/35))%24;
  const m=Math.floor((47+(gameTime%35)*1.7))%60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}

function draw(){
  ctx.clearRect(0,0,W,H);
  const sx = clamp(player.x - W*0.48,0,world.w - W);
  const sy = clamp(player.y - H*0.52,0,world.h - H);
  ctx.save();
  ctx.translate(-sx,-sy);
  drawWorld();
  drawPlayer();
  ctx.restore();
  drawMiniGlow();
}

function drawWorld(){
  ctx.fillStyle='#07111b';
  ctx.fillRect(0,0,world.w,world.h);
  zones.forEach((z)=>{
    ctx.fillStyle=z.c;
    ctx.fillRect(z.x,z.y,z.w,z.h);
    if(z.name){
      ctx.strokeStyle='#16384c';
      ctx.strokeRect(z.x,z.y,z.w,z.h);
      ctx.fillStyle='#426276';
      ctx.font='700 18px Orbitron';
      ctx.fillText(z.name,z.x+20,z.y+32);
    }
  });
  ctx.fillStyle='#1a3141';
  for(let x=40;x<world.w;x+=150){ctx.fillRect(x,760,95,18)}
  for(let y=340;y<world.h;y+=115){ctx.fillRect(620,y,18,75);ctx.fillRect(1290,y,18,75)}
  ctx.fillStyle='#071d2b';
  ctx.fillRect(0,0,world.w,190);
  for(let x=0;x<world.w;x+=80){ctx.strokeStyle='rgba(32,217,255,.16)';ctx.beginPath();ctx.moveTo(x,180);ctx.lineTo(x+35,180);ctx.stroke();}
  for(let x=80;x<2100;x+=90){let h=35+((x*17)%85);ctx.fillStyle='#0e1b2a';ctx.fillRect(x,190-h,55,h);ctx.fillStyle='#ffcc73';for(let yy=200-h;yy<195;yy+=14)ctx.fillRect(x+10,yy,5,5)}
  ctx.strokeStyle='#152b3b';ctx.lineWidth=42;ctx.beginPath();ctx.moveTo(0,800);ctx.lineTo(world.w,800);ctx.moveTo(650,250);ctx.lineTo(650,world.h);ctx.moveTo(1320,220);ctx.lineTo(1320,world.h);ctx.stroke();ctx.strokeStyle='#25485a';ctx.lineWidth=2;for(let x=0;x<world.w;x+=70){ctx.beginPath();ctx.moveTo(x,800);ctx.lineTo(x+30,800);ctx.stroke();}
  for(let x=140;x<2050;x+=260){ctx.strokeStyle='#10101c';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(x,310);ctx.lineTo(x,220);ctx.stroke();ctx.fillStyle='#141124';for(let a=0;a<8;a++){ctx.beginPath();ctx.ellipse(x+Math.cos(a)*28,215+Math.sin(a)*10,40,7,a*.8,0,Math.PI*2);ctx.fill();}}
  for(const l of locations){ctx.fillStyle=l.color;ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(l.x,l.y,34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=l.color;ctx.beginPath();ctx.arc(l.x,l.y,22,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 11px Rajdhani';ctx.fillText(l.label,l.x-28,l.y+42)}
  for(const n of interactables){
    const pulse=4+Math.sin(gameTime*4+n.x)*3;
    ctx.strokeStyle=n.done ? '#4b6370' : '#ff20d5';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(n.x,n.y,16+pulse,0,Math.PI*2);
    ctx.stroke();
    ctx.fillStyle=n.done ? '#617887' : '#ff20d5';
    ctx.beginPath();
    ctx.arc(n.x,n.y,6,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#dff';
    ctx.font='700 10px Rajdhani';
    ctx.fillText(n.done ? 'LOGGED' : 'EVIDENCE', n.x-25, n.y-24);
  }
}

function drawPlayer(){
  ctx.shadowBlur=20;
  ctx.shadowColor='#20d9ff';
  ctx.fillStyle='#20d9ff';
  ctx.beginPath();
  ctx.arc(player.x,player.y,15,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#05101a';
  ctx.beginPath();
  ctx.arc(player.x,player.y-5,5,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#fff';
  ctx.stroke();
}

function drawMiniGlow(){
  const g=ctx.createRadialGradient(W*.55,H*.45,0,W*.55,H*.45,420);
  g.addColorStop(0,'rgba(255,25,205,.03)');
  g.addColorStop(1,'rgba(0,0,0,.5)');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
}

function resetJoystick(){
  joystickState.active=false;
  joystickState.pointerId=null;
  joystickState.vectorX=0;
  joystickState.vectorY=0;
  joystickKnob.style.transform='translate(-50%, -50%)';
}

function updateJoystick(event){
  const rect=joystickBase.getBoundingClientRect();
  const centerX=rect.left + rect.width / 2;
  const centerY=rect.top + rect.height / 2;
  const dx=event.clientX - centerX;
  const dy=event.clientY - centerY;
  const distance=Math.hypot(dx,dy);
  const maxDistance=Math.min(joystickState.maxDistance, rect.width * 0.38);
  const clampedDistance = Math.min(distance, maxDistance);
  const angle=Math.atan2(dy,dx);
  const offsetX=Math.cos(angle) * clampedDistance;
  const offsetY=Math.sin(angle) * clampedDistance;

  joystickKnob.style.transform=`translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  joystickState.vectorX = distance > 0 ? (offsetX / maxDistance) : 0;
  joystickState.vectorY = distance > 0 ? (offsetY / maxDistance) : 0;
}

joystickBase.addEventListener('pointerdown',(event)=>{
  if(!isTouchDevice()) return;
  joystickState.active=true;
  joystickState.pointerId=event.pointerId;
  joystickBase.setPointerCapture(event.pointerId);
  updateJoystick(event);
});

joystickBase.addEventListener('pointermove',(event)=>{
  if(!joystickState.active || event.pointerId !== joystickState.pointerId) return;
  updateJoystick(event);
});

joystickBase.addEventListener('pointerup',(event)=>{
  if(event.pointerId === joystickState.pointerId) resetJoystick();
});

joystickBase.addEventListener('pointercancel',(event)=>{
  if(event.pointerId === joystickState.pointerId) resetJoystick();
});

function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);
  last=t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

renderPanel();
updateHud();
updateInteractionPrompt();
requestAnimationFrame(loop);
