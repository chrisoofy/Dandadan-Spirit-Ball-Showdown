(() => {
"use strict";
const FIGHTERS = [
 {id:"momo",name:"Momo Ayase",short:"桃",color:"#ff5a9b",weapon:"Psychic rings",power:"Psychokinesis",hp:200,damage:13,speed:2.5,reach:1.05,special:"psychic"},
 {id:"okarun",name:"Okarun",short:"速",color:"#5de5ff",weapon:"Turbo kick",power:"Turbo Burst",hp:200,damage:10,speed:3.5,reach:.9,special:"turbo"},
 {id:"aira",name:"Aira Shiratori",short:"愛",color:"#ffca59",weapon:"Acro hair",power:"Crimson Halo",hp:200,damage:11,speed:2.8,reach:1.3,special:"hair"},
 {id:"jiji",name:"Jiji",short:"邪",color:"#a987ff",weapon:"Evil Eye",power:"Evil Eye Surge",hp:200,damage:15,speed:2.2,reach:1.15,special:"evil"}
];
const $=id=>document.getElementById(id);
const canvas=$("arena"),ctx=canvas.getContext("2d");
let mode="1v1", lineup=["momo","okarun","aira","jiji"],selected=new Set(["momo","okarun"]);
let fighters=[],running=false,paused=false,over=false,raf=0,countdownTimer=0,battleToken=0,last=0,elapsed=0,speed=1,sound=false,audioCtx=null,particles=[],floating=[],arenaStyle="neon",messageTimer=0,matchNumber=0;

const style=document.createElement("style");
style.textContent=".matchup-picker{padding:13px;background:#0b101b;border:1px solid #343b53;border-radius:5px}.matchup-title{font:700 11px Orbitron,sans-serif;letter-spacing:1px;color:#52e5ff;margin-bottom:5px}.matchup-help{font-size:12px;color:#9ca6bd;margin-bottom:10px}.matchup-slots{display:grid;grid-template-columns:1fr 1fr;gap:9px}.matchup-slot label{font-size:12px!important;color:#bfc8dc!important}.matchup-slot select{margin-top:4px!important}.fighter-card{cursor:default}.fighter-card .select-mark{font-size:9px}@media(max-width:520px){.matchup-slots{grid-template-columns:1fr}}";
document.head.appendChild(style);
const modeSelect=$("modeSelect");
const picker=document.createElement("div");picker.className="matchup-picker";
picker.innerHTML='<div class="matchup-title">CHOOSE THE MATCHUP</div><p class="matchup-help">Choose the exact fighters. A fighter can only be selected once.</p><div id="matchupSlots" class="matchup-slots"></div>';
modeSelect.parentElement.insertAdjacentElement("afterend",picker);

function renderSelection(){
 const grid=$("fighterGrid");grid.innerHTML="";
 FIGHTERS.forEach(f=>{
  const card=document.createElement("div");card.className="fighter-card"+(selected.has(f.id)?" selected":"");card.style.setProperty("--accent",f.color);
  card.innerHTML='<span class="fighter-orb">'+f.short+'</span><span class="fighter-info"><strong>'+f.name+'</strong><small>'+f.weapon+'</small><small class="power-name">'+f.power+'</small></span><span class="select-mark">'+(selected.has(f.id)?"IN MATCH":"AVAILABLE")+'</span>';
  grid.appendChild(card);
 });
}
function syncSelection(){
 const vals=[...$("matchupSlots").querySelectorAll("select")].map(s=>s.value);
 selected=new Set(vals);
 if(mode!=="1v1")lineup=vals.concat(lineup.slice(vals.length));
}
function refreshOptions(){
 const selects=[...$("matchupSlots").querySelectorAll("select")];
 selects.forEach(current=>{
  const used=new Set(selects.filter(s=>s!==current).map(s=>s.value));
  [...current.options].forEach(o=>o.disabled=used.has(o.value));
 });
}
function renderMatchup(){
 const count=mode==="1v1"?2:4;
 const labels=mode==="1v1"?["Fighter 1","Fighter 2"]:mode==="2v2"?["TEAM A · Fighter 1","TEAM A · Fighter 2","TEAM B · Fighter 1","TEAM B · Fighter 2"]:["Fighter 1","Fighter 2","Fighter 3","Fighter 4"];
 const defaults=mode==="1v1"?["momo","okarun"]:lineup;
 const slots=$("matchupSlots");slots.innerHTML="";
 for(let i=0;i<count;i++){
  const wrap=document.createElement("div");wrap.className="matchup-slot";
  const label=document.createElement("label");label.textContent=labels[i];
  const select=document.createElement("select");select.setAttribute("aria-label",labels[i]);
  FIGHTERS.forEach(f=>{const o=document.createElement("option");o.value=f.id;o.textContent=f.name;select.appendChild(o)});
  select.value=defaults[i]||FIGHTERS[i].id;
  select.addEventListener("change",()=>{syncSelection();refreshOptions();renderSelection()});
  label.appendChild(select);wrap.appendChild(label);slots.appendChild(wrap);
 }
 syncSelection();refreshOptions();renderSelection();
}
modeSelect.addEventListener("change",()=>{mode=modeSelect.value;renderMatchup()});
$("healthInput").addEventListener("input",e=>$("healthOut").textContent=e.target.value+" HP");
$("soundBtn").addEventListener("click",()=>{sound=!sound;$("soundBtn").textContent="♫ SOUND: "+(sound?"ON":"OFF");$("soundBtn").setAttribute("aria-pressed",String(sound));if(sound)beep(440,.05)});

function createFighter(def,index,health){
 const angle=Math.PI*2*index/selected.size-Math.PI/2;
 return {...def,x:550+Math.cos(angle)*245,y:310+Math.sin(angle)*190,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,r:29,hp:health,maxHp:health,rotation:Math.random()*6.28,spin:.09,attackCd:0,specialCd:2+index*.5,flash:0,alive:true,damageDone:0,hits:0,team:mode==="2v2"?(index<2?0:1):index};
}
function startBattle(){
 clearTimeout(countdownTimer);cancelAnimationFrame(raf);const token=++battleToken;running=false;
 mode=modeSelect.value;syncSelection();
 const required=mode==="1v1"?2:4;
 if(selected.size!==required){alert("Choose a different fighter in every matchup slot.");return}
 speed=Number($("speedSelect").value);arenaStyle=$("arenaSelect").value;over=false;paused=false;elapsed=0;particles=[];floating=[];matchNumber++;
 const health=Number($("healthInput").value),roster=[...selected].map(id=>FIGHTERS.find(f=>f.id===id));
 if(roster.length!==required||roster.some(f=>!f)){alert("Please choose every fighter.");return}
 fighters=roster.map((f,i)=>createFighter(f,i,health));
 $("setupPanel").classList.add("hidden");$("battlePanel").classList.remove("hidden");$("resultOverlay").classList.add("hidden");$("countdown").classList.remove("hidden");$("pauseBtn").textContent="Ⅱ PAUSE";
 $("matchTitle").textContent=mode==="1v1"?"ONE-ON-ONE DUEL":mode==="2v2"?"2V2 TEAM CLASH":"FOUR-WAY FREE FOR ALL";
 renderStatus();drawArena();let count=3;$("countdown").textContent=count;
 const tick=()=>{if(token!==battleToken)return;if(count>1){count--;$("countdown").textContent=count;countdownTimer=setTimeout(tick,650)}else{$("countdown").classList.add("hidden");running=true;last=performance.now();raf=requestAnimationFrame(loop)}};
 countdownTimer=setTimeout(tick,650);
}
function alive(){return fighters.filter(f=>f.alive)}
function enemiesOf(f){return alive().filter(o=>o!==f&&(mode!=="2v2"||o.team!==f.team))}
function nearest(f){return enemiesOf(f).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0]}
function loop(now){
 if(!running||paused||over)return;
 const dt=Math.min((now-last)/16.67,2.2)*speed;last=now;elapsed+=dt/60;update(dt);drawArena();
 if(mode==="2v2"?new Set(alive().map(f=>f.team)).size<=1:alive().length<=1){finishBattle();return}
 raf=requestAnimationFrame(loop);
}
function update(dt){
 fighters.forEach(f=>{
  if(!f.alive)return;
  f.attackCd-=dt/60;f.specialCd-=dt/60;f.flash=Math.max(0,f.flash-dt/60);f.rotation+=f.spin*dt;
  const target=nearest(f);if(!target)return;
  let dx=target.x-f.x,dy=target.y-f.y,dist=Math.hypot(dx,dy)||1,ux=dx/dist,uy=dy/dist;
  f.vx+=ux*.075*dt;f.vy+=uy*.075*dt;
  const max=f.speed*1.55,v=Math.hypot(f.vx,f.vy);if(v>max){f.vx=f.vx/v*max;f.vy=f.vy/v*max}
  f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<f.r+22){f.x=f.r+22;f.vx=Math.abs(f.vx)*.92;burst(f.x,f.y,f.color,5)}
  if(f.x>canvas.width-f.r-22){f.x=canvas.width-f.r-22;f.vx=-Math.abs(f.vx)*.92;burst(f.x,f.y,f.color,5)}
  if(f.y<f.r+22){f.y=f.r+22;f.vy=Math.abs(f.vy)*.92;burst(f.x,f.y,f.color,5)}
  if(f.y>canvas.height-f.r-22){f.y=canvas.height-f.r-22;f.vy=-Math.abs(f.vy)*.92;burst(f.x,f.y,f.color,5)}
  f.spin=Math.min(.28,f.spin+.000015*dt);
  if(dist<f.r+target.r+f.reach*23&&f.attackCd<=0)attack(f,target,false);
  if(f.specialCd<=0)special(f,target);
 });
 for(let i=0;i<fighters.length;i++)for(let j=i+1;j<fighters.length;j++){
  const a=fighters[i],b=fighters[j];if(!a.alive||!b.alive)continue;
  let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=a.r+b.r+2;
  if(d<min){let nx=dx/d,ny=dy/d,overlap=min-d;a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;let rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){a.vx+=nx*rel*.72;b.vx-=nx*rel*.72;a.vy+=ny*rel*.72;b.vy-=ny*rel*.72}}
 }
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=.025*dt;p.vx*=.985;p.vy*=.985});particles=particles.filter(p=>p.life>0);
 floating.forEach(p=>{p.y-=.7*dt;p.life-=.018*dt});floating=floating.filter(p=>p.life>0);
 if(messageTimer>0)messageTimer-=dt/60;else $("battleMessage").textContent="The fighters are reading each other's moves...";
 if(Math.floor(elapsed*2)!==Math.floor((elapsed-dt/60)*2))renderStatus();
}
function attack(a,b,isSpecial){
 const base=a.damage*(1+Math.min(.45,a.hits*.018))*(isSpecial?1.8:1),damage=Math.round(base*(.85+Math.random()*.3));
 b.hp=Math.max(0,b.hp-damage);b.flash=.16;const d=Math.hypot(b.x-a.x,b.y-a.y)||1;b.vx+=(b.x-a.x)/d*(isSpecial?8:4);b.vy+=(b.y-a.y)/d*(isSpecial?8:4);
 a.damageDone+=damage;a.hits++;a.attackCd=isSpecial?.5:.42;a.spin=Math.min(.28,a.spin+.002);
 burst((a.x+b.x)/2,(a.y+b.y)/2,isSpecial?"#fff":a.color,isSpecial?25:12);floating.push({x:b.x,y:b.y-32,text:"-"+damage,life:1,color:isSpecial?"#fff":a.color});
 if(sound)beep(isSpecial?760:280,.045);
 if(b.hp<=0){b.alive=false;burst(b.x,b.y,b.color,42);announce(b.name+" has been knocked out!")}
 if(isSpecial)announce(a.name+": "+a.power+"!");
}
function special(f,target){
 f.specialCd=8+Math.random()*2;
 if(f.special==="psychic"){fighters.filter(o=>o.alive&&o!==f&&(mode!=="2v2"||o.team!==f.team)&&Math.hypot(o.x-f.x,o.y-f.y)<235).forEach(o=>{attack(f,o,true);o.vx+=(o.x-f.x)*.035;o.vy+=(o.y-f.y)*.035});burst(f.x,f.y,"#ff9bc2",55)}
 else if(f.special==="turbo"){const d=Math.hypot(target.x-f.x,target.y-f.y)||1;f.vx+=(target.x-f.x)/d*12;f.vy+=(target.y-f.y)/d*12;f.spin=Math.min(.3,f.spin+.07);attack(f,target,true);burst(f.x,f.y,"#5de5ff",35)}
 else if(f.special==="hair"){fighters.filter(o=>o.alive&&o!==f&&(mode!=="2v2"||o.team!==f.team)&&Math.hypot(o.x-f.x,o.y-f.y)<170).forEach(o=>attack(f,o,true));burst(f.x,f.y,"#ffca59",48)}
 else{const d=Math.hypot(target.x-f.x,target.y-f.y)||1;f.vx+=(target.x-f.x)/d*6;f.vy+=(target.y-f.y)/d*6;attack(f,target,true);target.flash=.3;burst(target.x,target.y,"#a987ff",50)}
}
function announce(text){$("battleMessage").textContent=text;messageTimer=2.4}
function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.6,color,r:1+Math.random()*3})}}
function drawArena(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,arenaStyle==="cosmic"?"#11102e":arenaStyle==="school"?"#111522":"#10182b");bg.addColorStop(1,"#060812");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.strokeStyle=arenaStyle==="cosmic"?"#7868d633":arenaStyle==="school"?"#69a6a633":"#50dff233";ctx.lineWidth=1;
 for(let x=22;x<w;x+=44){ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x,h-20);ctx.stroke()}for(let y=22;y<h;y+=44){ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(w-20,y);ctx.stroke()}
 ctx.strokeStyle="#64dff277";ctx.lineWidth=3;ctx.strokeRect(18,18,w-36,h-36);ctx.shadowBlur=20;ctx.shadowColor="#50dfff";ctx.strokeRect(18,18,w-36,h-36);ctx.restore();
 ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle="#d5c4ff";ctx.lineWidth=2;for(let r=80;r<360;r+=70){ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);ctx.stroke()}ctx.restore();
 fighters.forEach(f=>{if(f.alive)drawFighter(f)});
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
 floating.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.font="900 20px Orbitron";ctx.textAlign="center";ctx.shadowBlur=12;ctx.shadowColor=p.color;ctx.fillText(p.text,p.x,p.y);ctx.shadowBlur=0});ctx.globalAlpha=1;
 ctx.textAlign="left";ctx.fillStyle="#ffffff55";ctx.font="700 11px Orbitron";ctx.fillText("SPIRIT ARENA // MATCH "+String(matchNumber).padStart(3,"0"),32,h-30);
}
function drawFighter(f){
 const c=ctx;c.save();c.translate(f.x,f.y);c.shadowBlur=24;c.shadowColor=f.color;c.fillStyle=f.color;c.globalAlpha=.16;c.beginPath();c.arc(0,0,f.r+13,0,Math.PI*2);c.fill();c.globalAlpha=1;c.shadowBlur=0;
 c.save();c.rotate(f.rotation);c.strokeStyle=f.color;c.lineWidth=7;c.lineCap="round";c.shadowBlur=15;c.shadowColor=f.color;c.beginPath();c.arc(0,0,f.r+12,-.95,1.05);c.stroke();c.fillStyle="#fff";c.beginPath();c.arc(f.r+12,0,5,0,Math.PI*2);c.fill();c.restore();
 const g=c.createRadialGradient(-10,-12,2,0,0,f.r+2);g.addColorStop(0,"#fff");g.addColorStop(.18,f.flash?"#fff":f.color);g.addColorStop(1,"#151522");c.fillStyle=g;c.beginPath();c.arc(0,0,f.r,0,Math.PI*2);c.fill();c.lineWidth=3;c.strokeStyle=f.color;c.stroke();c.fillStyle="#10121b";c.font="900 20px Orbitron";c.textAlign="center";c.textBaseline="middle";c.fillText(f.short,0,1);c.restore();
}
function renderStatus(){
 $("fighterStatus").innerHTML=fighters.map(f=>'<div class="status-card"><div class="status-head"><span style="color:'+f.color+'">'+f.name+'</span><span>'+Math.ceil(f.hp)+' / '+f.maxHp+'</span></div><div class="hp-track"><div class="hp-fill" style="width:'+Math.max(0,f.hp/f.maxHp*100)+'%;background:'+f.color+'"></div></div><div class="status-meta"><span>'+(f.alive?"IN THE FIGHT":"KNOCKED OUT")+'</span><span>'+f.damageDone+' DMG</span></div></div>').join("");
}
function finishBattle(){
 running=false;over=true;cancelAnimationFrame(raf);const survivors=alive();let winner=survivors[0];
 if(mode==="2v2"&&survivors.length>1)winner={...survivors[0],name:"TEAM "+(survivors[0].team===0?"A":"B")};
 $("winnerText").textContent=winner?winner.name+" WINS!":"DRAW!";$("winnerText").style.color=winner?winner.color:"#fff";
 $("resultSub").textContent=winner?survivors[0].damageDone+" total damage dealt · "+Math.ceil(survivors[0].hp)+" HP remaining":"Everyone went down in the same clash.";
 $("resultOverlay").classList.remove("hidden");renderStatus();if(sound)beep(880,.2);
}
function beep(freq,duration){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="sawtooth";g.gain.value=.025;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(e){}}
$("startBtn").addEventListener("click",startBattle);
$("pauseBtn").addEventListener("click",()=>{if(over)return;paused=!paused;if(paused){running=false;cancelAnimationFrame(raf);$("pauseBtn").textContent="▶ RESUME"}else{running=true;last=performance.now();$("pauseBtn").textContent="Ⅱ PAUSE";raf=requestAnimationFrame(loop)}});
$("restartBtn").addEventListener("click",startBattle);$("againBtn").addEventListener("click",startBattle);
$("changeBtn").addEventListener("click",()=>{battleToken++;clearTimeout(countdownTimer);running=false;cancelAnimationFrame(raf);$("battlePanel").classList.add("hidden");$("setupPanel").classList.remove("hidden");$("resultOverlay").classList.add("hidden")});
$("fullBtn").addEventListener("click",()=>{const el=$("battlePanel");if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.()});
renderMatchup();drawArena();
})();