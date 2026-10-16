(() => {
'use strict';
const $=id=>document.getElementById(id), C=window.GAME_CONTENT, KEY='duskwood-adventure-v1';
let state={done:[],hints:[0,0,0,0,0],drafts:['','','','',''],finished:false,name:'',completedAt:''}, storageOK=true;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){for(let i=0;i<5;i++){if(Array.isArray(saved.done)&&saved.done.includes(i))state.done.push(i);}state.hints=C.levels.map((_,i)=>Math.min(3,Math.max(0,Number(saved.hints?.[i])||0)));state.drafts=C.levels.map((_,i)=>typeof saved.drafts?.[i]==='string'?saved.drafts[i]:'');state.finished=state.done.length===5&&!!saved.finished;state.name=typeof saved.name==='string'?saved.name.slice(0,20):'';state.completedAt=typeof saved.completedAt==='string'?saved.completedAt:'';}}catch(e){storageOK=false;}
let current=0,angle=0,seenWords={},filter='all',overlay=false,sound=false,audioCtx,endingTimers=[],magic=[],mapReady=false;
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){storageOK=false;toast('這個瀏覽器無法儲存進度，請保留目前分頁繼續遊玩。');}}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),4000);}
// 背景音樂在使用者操作後啟動，同一個播放器跨關卡持續循環。
const backgroundMusic=$('background-music');
let musicEnabled=true;
backgroundMusic.volume=.3;
function renderMusicButton(){const playing=!backgroundMusic.paused&&!backgroundMusic.ended;$('music-btn').textContent=`音樂：${playing?'開':'關'}`;$('music-btn').setAttribute('aria-pressed',String(playing));$('music-btn').setAttribute('aria-label',playing?'暫停背景音樂':'開啟背景音樂');}
function playBackgroundMusic(){if(!musicEnabled)return;const pending=backgroundMusic.play();if(pending)pending.catch(error=>{renderMusicButton();if(error.name!=='AbortError')toast(error.name==='NotAllowedError'?'請點右上角「音樂」按鈕，開啟背景音樂。':'音樂暫時無法播放，請確認 assets/audio 中的音樂檔案仍在。');});}
backgroundMusic.addEventListener('playing',renderMusicButton);
backgroundMusic.addEventListener('pause',renderMusicButton);
$('music-btn').onclick=()=>{if(backgroundMusic.paused){musicEnabled=true;playBackgroundMusic();}else{musicEnabled=false;backgroundMusic.pause();}};
function chime(success=false){if(!sound)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();(success?[523.25,659.25,783.99,1046.5]:[587.33]).forEach((hz,i)=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.15;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.065,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.55);o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+.6);});}catch(e){sound=false;}}
function openDialog(id){$(id).showModal();document.body.classList.add('no-scroll');}
function closeDialog(id){$(id).close();if(!document.querySelector('dialog[open]'))document.body.classList.remove('no-scroll');}
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('no-scroll');if(d.id==='final-dialog')clearEnding();}));
function renderProgress(){
 const n=state.done.length;
 $('teacher-btn').disabled=n<5;$('teacher-lock-note').textContent=n<5?`點亮五盞燈後開啟（${n} / 5）`:'五盞燈已點亮，教師筆記已開放';
 $('start-btn').innerHTML=(n?'繼續星光旅程':'提起星燈，開始冒險')+' <span>↗</span>';
 $('save-note').textContent=storageOK?(n?`已找回 ${n} / 5 枚靈魂之光 · 進度已儲存`:'五個關卡 · 自動記錄進度 · 不限時間'):'目前無法儲存進度 · 請保持此分頁開啟';
 $('chapter-cards').innerHTML=C.levels.map((l,i)=>`<button class="chapter-card ${state.done.includes(i)?'done':''}" data-level="${i}" aria-label="第${i+1}關 ${l.name}"><span class="chapter-no">0${i+1}${state.done.includes(i)?' · 已點亮':''}</span><b>${l.name}</b><small>${l.short}</small></button>`).join('');
 $('chapter-cards').querySelectorAll('button').forEach(b=>b.onclick=()=>enterRoom(+b.dataset.level));
 $('inventory').innerHTML=C.levels.map(l=>l.letter).map(letter=>{let earned=state.done.some(i=>C.levels[i].letter===letter);return `<span class="soul ${earned?'earned':''}" aria-label="${letter} ${earned?'已獲得':'尚未獲得'}">${earned?letter:'·'}</span>`;}).join('');
 $('progress-text').textContent=`${n} / 5`;
 $('next-title').textContent=n<5?'你的冒險，由你決定':'五道光，已經聚齊';
 $('next-copy').textContent=n<5?'五個房間都已開放。點選地圖上的建築，挑戰你最感興趣的謎題。':'將五枚靈魂之光排成代表「魔法」的英文單字，打開通往星空的大門。';
 $('next-btn').innerHTML=n<5?'挑戰一道未解的謎題 <span>→</span>':'前往終章 <span>→</span>';
 $('final-btn').disabled=n<5;$('final-btn').textContent=n<5?'集齊五枚，開啟終章':state.finished?'再次開啟終章':'五光聚齊，開啟終章';
 if(window.AcademyMap)window.AcademyMap.update(state.done);
}
function start(){ const name=$('player-name').value.trim();if(!name){$('welcome').classList.remove('hidden');$('adventure').classList.add('hidden');$('player-name').focus();$('player-name').reportValidity();toast('請先輸入勇者的姓名或暱稱。');return false;}state.name=name;save();$('toast').classList.add('hidden');playBackgroundMusic();$('welcome').classList.add('hidden');$('adventure').classList.remove('hidden');if(!mapReady){mapReady=true;window.AcademyMap?.init(enterRoom,state.done);}window.AcademyMap?.resize();window.scrollTo({top:0,behavior:'smooth'});return true;}
$('player-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();start();}});
$('start-btn').onclick=start;$('next-btn').onclick=()=>state.done.length<5?enterRoom(C.levels.findIndex((_,i)=>!state.done.includes(i))):openFinal();
$('home').onclick=e=>{e.preventDefault();window.AcademyMap?.cancelTravel();$('welcome').classList.remove('hidden');$('adventure').classList.add('hidden');window.scrollTo(0,0);};
$('sound-btn').onclick=()=>{sound=!sound;$('sound-btn').textContent=`音效：${sound?'開':'關'}`;$('sound-btn').setAttribute('aria-pressed',sound);chime();};
$('close-room').onclick=()=>closeDialog('room-dialog');$('close-info').onclick=()=>closeDialog('info-dialog');$('close-final').onclick=()=>closeDialog('final-dialog');
function info(html){$('info-body').innerHTML=html;openDialog('info-dialog');}
function showIntroduction(){info(`<p class="eyebrow">AN INVITATION FROM DUSKWOOD</p><h2>萬聖夜，故事開始了</h2><img class="intro-window-art" src="assets/backgrounds/academy-map.webp" alt="星光下的暮夜學院"><h3>萬聖節的由來</h3><p>萬聖節（Halloween）的起源，與古老凱爾特人的薩溫節（Samhain）有關。人們在秋收結束、冬季將至時舉行慶典；傳說在這個時節，人間與靈界的界線變得薄弱，因此會燃起營火、穿戴特殊裝扮。</p><p>後來，這些習俗與基督宗教的諸聖節前夕融合，逐漸演變成今天的萬聖節。如今，人們在 10 月 31 日裝扮角色、製作南瓜燈，也玩「不給糖就搗蛋」和各種闖關遊戲。</p><h3>暮夜學院的故事</h3><p>${C.intro}</p><p>你與朋友踏進學院，古老的大門在身後輕輕闔上。一位幽靈學者留下謎語：「五個空間，五道試煉。唯有集齊靈魂之光，方可打開離去之門。」</p><p>提起星燈，自由挑選想挑戰的房間。這場冒險沒有倒數催促，只有觀察、推理與勇氣；思考的時間，也是一種魔法。</p><button class="primary" id="story-start">收下邀請函，準備出發 <span>→</span></button>`);}
$('story-btn').onclick=showIntroduction;
$('restart-btn').onclick=()=>{window.AcademyMap?.cancelTravel();infoReset();};
$('info-body').addEventListener('click',e=>{if(e.target.closest('#story-start')){closeDialog('info-dialog');$('player-name').focus();}if(e.target.closest('#cancel-reset'))closeDialog('info-dialog');if(e.target.closest('#confirm-reset')){clearEnding();window.AcademyMap?.cancelTravel();state={done:[],hints:[0,0,0,0,0],drafts:['','','','',''],finished:false,name:'',completedAt:''};save();renderProgress();closeDialog('info-dialog');$('player-name').value='';$('home').click();toast('請為新的冒險輸入姓名。');}if(e.target.closest('#reset-request')){infoReset();}});
$('help-btn').onclick=()=>info('<p class="eyebrow">HOW TO EXPLORE</p><h2>一盞星燈，就能出發</h2><ol><li>點選「開始冒險」，再點地圖上的發光關卡。</li><li>五個關卡可以任意挑選。點選地圖建築，小魔法師會提燈走向目的地；也可以直接用下方關卡卡片進入。</li><li>每關都有三段提示。答錯可以再試，沒有時間限制，也不扣分。</li><li>通關後獲得一枚靈魂之光；冒險手札會記錄解題方法。</li><li>五關完成後，依序點選碎片排成代表「魔法」的英文單字，觀看最後的結局動畫。</li></ol><p>進度儲存在目前的瀏覽器。更換裝置或清除瀏覽資料不會保留進度。若使用私密模式，請在關閉分頁前完成。</p><p>電腦也可以用 Tab 選按鈕、Enter 確認、Esc 關閉視窗。背景音樂會在開始冒險後持續循環播放，可用右上角「音樂」按鈕暫停或繼續。音效另外控制，預設關閉。</p>');
$('journal-btn').onclick=()=>info(`<p class="eyebrow">YOUR FIELD NOTES</p><h2>冒險手札</h2><p>已找到 ${state.done.length} / 5 枚靈魂之光。</p>${C.levels.map((l,i)=>`<div class="journal-entry"><h3>0${i+1}　${l.name}</h3><p>${state.done.includes(i)?`靈魂之光 ${l.letter} 已點亮。<br>${l.explanation}`:'這一頁還在等待你的發現。'}</p></div>`).join('')}`);
$('teacher-btn').onclick=()=>{if(state.done.length<5){toast('點亮五盞燈後，才能開啟教師筆記。');return;}info(`<p class="eyebrow">TEACHER'S NOTE</p><h2>陪孩子一起，找到規律</h2><p>依上傳的五關資料製作。第二關顯示四個角度，0°、90°、180° 可操作，270° 由玩家推理；第五關保留同色篩選，只有紅色提供疊合觀察。獎勵順序為 I、C、G、M、A，最後由玩家排列出魔法單字。</p>${C.levels.map((l,i)=>`<details><summary>第 ${i+1} 關｜${l.short}・展開解答</summary><p>${l.explanation}</p></details>`).join('')}<details><summary>角色與美術設定</summary><p>星燈小魔法師：藍綠尖帽、金色星紋披風、星形提燈。幽靈伙伴：象牙白身體、淡紫圍巾。全套以繪圖模型繪製彩鉛奇幻素材。</p><img class="design-sheet" src="assets/characters/character-design.webp" alt="角色設定圖"></details><p><small>題目與數值保留可編輯文字；素材已套用於遊戲。3D 地圖採用 Three.js。</small></p><div class="reset-warning"><p>清除目前瀏覽器的闖關記錄，重新開始。</p><button id="reset-request" class="quiet">重設遊戲進度</button></div>`);};
function infoReset(){
 $('info-body').innerHTML='<p class="eyebrow">START A NEW JOURNEY</p><h2>重新開始這場冒險？</h2><p>將清除這個瀏覽器的姓名、五關記錄、提示與靈魂之光，回到首頁重新輸入姓名。若已有證書，請先保存圖片。</p><div class="restart-actions"><button id="cancel-reset" class="quiet">保留進度，繼續遊戲</button><button id="confirm-reset" class="primary">確定重新開始</button></div>';
 if(!$('info-dialog').open)openDialog('info-dialog');
}
function enterRoom(i){if(!state.name||!$('welcome').classList.contains('hidden')){if(!start())return;}current=i;angle=0;seenWords={};filter='all';overlay=false;const l=C.levels[i];
 $('room-background').src=`assets/backgrounds/${l.scene}.webp`;$('room-background').alt=l.name+'的彩鉛奇幻場景';$('room-number').textContent=`CHAPTER 0${i+1} / FIVE TRIALS`;$('room-name').textContent=l.name;$('room-story').textContent=l.story;$('puzzle-kicker').textContent=`TRIAL 0${i+1} · 靈魂之光 ${l.letter}`;$('puzzle-title').textContent=l.short;$('puzzle-task').textContent=l.task;
 $('answer-input').value=state.drafts[i];$('answer-input').placeholder=l.placeholder;$('answer-input').inputMode=[0,2,4].includes(i)?'numeric':'text';$('answer-input').maxLength=i===1?40:20;$('answer-input').setAttribute('aria-label',l.placeholder);$('answer-feedback').textContent='';$('answer-feedback').classList.remove('correct');$('success-box').classList.add('hidden');$('answer-form').classList.remove('hidden');
 renderPuzzle();renderHint();if(state.done.includes(i))showSuccess(false);if(!$('room-dialog').open)openDialog('room-dialog');$('room-dialog').scrollTop=0;setTimeout(()=>$('close-room').focus({preventScroll:true}),30);
}
const cards=ns=>ns.map(n=>`<span class="playing-card" aria-label="紅心 ${n}"><span>${n===1?'A':n}</span><span aria-hidden="true">♥</span></span>`).join('');
function renderPuzzle(){const l=C.levels[current],body=$('puzzle-body');
 if(current===0){body.innerHTML=`<div class="segment-demo"><div class="cards-examples">${l.examples.map(([ns,v])=>`<div class="cards-line">${cards(ns)}<span class="equals">＝</span><span class="mini-display" role="img" aria-label="七段顯示器數字 ${v}"><span class="segments">${[1,2,3,4,5,6,7].map(n=>`<span class="seg ${[3,4,5].includes(n)?'h':'v'} s${n} ${ns.includes(n)?'on':'off'}"></span>`).join('')}</span></span></div>`).join('')}</div><div class="segments" aria-label="七段顯示器，七段全亮為8">${[1,2,3,4,5,6,7].map(n=>`<span class="seg ${[3,4,5].includes(n)?'h':'v'} s${n} on"></span>`).join('')}</div></div><div class="card-puzzles">${l.queries.map((ns,i)=>`<div><p class="puzzle-caption">${i===0?'左邊':'右邊'}的數字</p><div class="cards-line">${cards(ns)}<span class="equals">＝ ?</span></div></div>`).join('')}</div>`;}
 if(current===1){body.innerHTML='<div class="rotate-wrap"><div id="letter-grid" class="letter-grid" aria-live="polite"></div><div><span class="field-label">轉動鏤空石板</span><div class="rotation-buttons">'+[0,90,180,270].map(a=>`<button type="button" data-angle="${a}" aria-label="${a===270?'270 度，請自行推理':'查看 '+a+' 度'}">${a}°</button>`).join('')+'</div><div id="rotation-readout" class="rotation-readout"></div></div></div><div id="word-notes" class="word-notes"></div>';body.querySelectorAll('[data-angle]').forEach(b=>b.onclick=()=>{const next=+b.dataset.angle;if(next===270)return;angle=next;renderRotation();chime();});renderRotation();}
 if(current===2){body.innerHTML='<div class="shapes-grid">'+l.examples.map(([outer,inner,code])=>`<div class="shape-clue"><svg viewBox="0 0 100 100" role="img" aria-label="${shapeNames[outer]}外框，${shapeNames[inner]}內框">${shapeSVG(outer,44)}${shapeSVG(inner,24)}</svg><b>${code}</b></div>`).join('')+'</div>';}
 if(current===3){body.innerHTML='<div class="crosses">'+l.crosses.map(c=>`<div class="word-cross" aria-label="${c.top}、空格、${c.bottom}；${c.left}、空格、${c.right}"><span class="top">${c.top}</span><span class="left">${c.left}</span><span class="center ${c.color}">?</span><span class="right">${c.right}</span><span class="bottom">${c.bottom}</span></div>`).join('')+'</div><p class="puzzle-caption" style="text-align:center;margin-top:20px">閱讀方向：橫向 →　直向 ↓</p>';}
 if(current===4){body.innerHTML='<div id="color-grids" class="color-grids"></div><div class="color-controls">'+[['all','全部'],['R','紅色'],['B','藍色'],['G','綠色']].map(([v,t])=>`<button type="button" data-color="${v}">${t}</button>`).join('')+'<button type="button" id="overlay-btn" class="hidden">疊合觀察</button></div><div id="overlay-result" class="overlay-result hidden"></div>';body.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{filter=b.dataset.color;if(filter!=='R')overlay=false;renderColors();});$('overlay-btn').onclick=()=>{if(filter!=='R')return;overlay=!overlay;renderColors();};renderColors();}
}
const shapeNames={circle:'圓形',square:'正方形',triangle:'三角形',pentagon:'五邊形',hexagon:'六邊形'};
function shapeSVG(type,r){let a='fill="none" stroke="#365154" stroke-width="3" stroke-linejoin="round"';if(type==='circle')return `<circle cx="50" cy="50" r="${r}" ${a}/>`;if(type==='square')return `<rect x="${50-r*.8}" y="${50-r*.8}" width="${r*1.6}" height="${r*1.6}" ${a}/>`;let n={triangle:3,pentagon:5,hexagon:6}[type],p=Array.from({length:n},(_,i)=>`${50+r*Math.cos(-Math.PI/2+i*2*Math.PI/n)},${50+r*Math.sin(-Math.PI/2+i*2*Math.PI/n)}`).join(' ');return `<polygon points="${p}" ${a}/>`;}
function rotatedHoles(deg){let h=C.levels[1].holes.map(x=>[...x]);for(let t=0;t<deg/90;t++)h=h.map(([r,c])=>[c,3-r]);return h.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);}
function renderRotation(){const l=C.levels[1],holes=rotatedHoles(angle),word=holes.map(([r,c])=>l.grid[r][c]).join('');seenWords[angle]=word;$('letter-grid').innerHTML=l.grid.flatMap((row,r)=>row.split('').map((ch,c)=>`<span class="letter-cell ${holes.some(([rr,cc])=>rr===r&&cc===c)?'lit':''}" aria-label="第${r+1}列第${c+1}欄 ${ch}${holes.some(([rr,cc])=>rr===r&&cc===c)?'，鏤空':''}">${ch}</span>`)).join('');document.querySelectorAll('[data-angle]').forEach(b=>{b.classList.toggle('selected',+b.dataset.angle===angle);b.setAttribute('aria-pressed',+b.dataset.angle===angle);});$('rotation-readout').textContent=`目前角度 ${angle}°`;$('word-notes').innerHTML=[0,90,180,270].map(a=>`<span>${a}°<b class="${a===270?'inference':''}">${a===270?'請自行推理出答案':seenWords[a]||'· · · ·'}</b></span>`).join('');}
function gridHTML(rows,selected){return '<div class="color-grid">'+rows.flatMap((row,r)=>row.split('').map((ch,c)=>`<span class="tile ${ch} ${selected!=='all'&&selected!==ch?'dim':''}" aria-label="第${r+1}列第${c+1}欄${({R:'紅',B:'藍',G:'綠',Y:'黃'})[ch]||'空白'}"></span>`)).join('')+'</div>';}
function renderColors(){const grids=C.levels[4].grids;$('color-grids').innerHTML=grids.map(g=>gridHTML(g,filter)).join('');document.querySelectorAll('[data-color]').forEach(b=>{b.classList.toggle('selected',b.dataset.color===filter);b.setAttribute('aria-pressed',b.dataset.color===filter);});const overlayBtn=$('overlay-btn');overlayBtn.classList.toggle('hidden',filter!=='R');overlayBtn.textContent=overlay?'收起疊合':'疊合觀察';const result=$('overlay-result');result.classList.toggle('hidden',!overlay||filter!=='R');if(overlay&&filter==='R'){const rows=Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>grids.some(g=>g[r][c]===filter)?filter:'_').join(''));result.innerHTML=gridHTML(rows,'all')+'<p>已將三面石板的紅色格子疊在原本的位置。<br>藍色與綠色請你自己視覺轉移。</p>';}}
function renderHint(){const count=state.hints[current];$('hint-stars').innerHTML=[0,1,2].map(i=>`<svg viewBox="0 0 24 24" class="hint-star ${i<count?'lit':''}" aria-hidden="true"><path d="M12 2 15 8.5 22 9.5 17 14.5 18 22 12 18.5 6 22 7 14.5 2 9.5 9 8.5Z"/></svg>`).join('');$('hint-stars').setAttribute('aria-label',`已使用 ${count} 顆星光提示，共三顆`);$('hint-count').textContent=`提示 ${count} / 3`;$('hint-text').classList.toggle('hidden',count===0);$('hint-text').textContent=C.levels[current].hints[Math.max(0,count-1)];$('hint-btn').disabled=count>=3;$('hint-btn').textContent=count>=3?'三道提示都已點亮':count?'再給我一點提示':'需要一點星光？查看提示';}
$('hint-btn').onclick=()=>{if(state.hints[current]<3){state.hints[current]++;save();renderHint();}};
function normalized(s){return s.normalize('NFKC').toUpperCase().replace(/[\s,，、.。\-／/]/g,'');}
$('answer-input').addEventListener('input',()=>{state.drafts[current]=$('answer-input').value;save();});
$('answer-form').onsubmit=e=>{e.preventDefault();const value=$('answer-input').value;if(normalized(value)===normalized(C.levels[current].answer)){if(!state.done.includes(current)){state.done.push(current);state.done.sort((a,b)=>a-b);}save();renderProgress();showSuccess(true);chime(true);}else{$('answer-feedback').textContent='封印輕輕閃了一下，還差一點。再看看線索，也可以點開提示。';$('answer-feedback').classList.remove('correct');$('answer-input').setAttribute('aria-invalid','true');$('answer-input').focus();}};
function showSuccess(fresh){const l=C.levels[current];$('answer-input').removeAttribute('aria-invalid');$('answer-form').classList.add('hidden');$('answer-feedback').textContent=fresh?'封印解開了！靈魂之光已放進你的手札。':'這道試煉已完成，可以再次查看解題方法。';$('answer-feedback').classList.add('correct');$('success-box').innerHTML=`<div class="reward-row"><div class="reward-gem">${l.letter}</div><div><p class="eyebrow">SOUL LIGHT FOUND</p><h3>你找到了靈魂之光 ${l.letter}</h3></div></div><p>${l.explanation}</p><button id="continue-btn" class="primary">${state.done.length===5?'帶著五道光，前往終章':'回到地圖，繼續探索'} <span>→</span></button>`;$('success-box').classList.remove('hidden');$('continue-btn').onclick=()=>{closeDialog('room-dialog');if(state.done.length===5)openFinal();};if(fresh)setTimeout(()=>$('success-box').scrollIntoView({behavior:'smooth',block:'nearest'}),80);}
$('final-btn').onclick=openFinal;
function openFinal(){if(state.done.length<5){toast('集齊五枚靈魂之光後，才能開啟結局。');return;}clearEnding();magic=[];$('certificate').classList.add('hidden');$('assemble').classList.remove('hidden');$('ending').classList.add('hidden');renderMagic();openDialog('final-dialog');}
function renderMagic(){ $('magic-slots').innerHTML=Array.from({length:5},(_,i)=>`<span class="magic-slot" aria-label="第${i+1}格${magic[i]||'空白'}">${magic[i]||'·'}</span>`).join('');$('magic-pool').innerHTML=C.levels.map(l=>`<button ${magic.includes(l.letter)?'disabled':''} data-letter="${l.letter}" aria-label="選擇靈魂之光 ${l.letter}">${l.letter}</button>`).join('');$('magic-pool').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(magic.length<5){magic.push(b.dataset.letter);chime();renderMagic();}});const correct=magic.join('')==='MAGIC';$('unlock-ending').disabled=!correct;$('magic-feedback').textContent=magic.length===5?(correct?'MAGIC！五道光正在共鳴。':'順序似乎還不對。重新排列，找出「魔法」的英文單字。'):'';}
$('clear-magic').onclick=()=>{magic=[];renderMagic();};$('unlock-ending').onclick=()=>{if(magic.join('')==='MAGIC')playEnding();};
function clearEnding(){endingTimers.forEach(clearTimeout);endingTimers=[];}
function endingLater(fn,t){endingTimers.push(setTimeout(fn,t));}
function playEnding(){clearEnding();$('final-dialog').scrollTop=0;$('certificate').classList.add('hidden');$('assemble').classList.add('hidden');$('ending').classList.remove('hidden','open');$('ending-actions').classList.add('hidden');$('skip-ending').classList.remove('hidden');$('ending-title').textContent=C.ending[0];$('ending-text').textContent='暮夜學院的大門，正在為你打開。';chime(true);const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;endingLater(()=>$('ending').classList.add('open'),reduce?0:500);endingLater(()=>{$('ending-title').textContent=C.ending[1];$('ending-text').textContent=C.ending[2];chime(true);},reduce?100:4000);endingLater(finishEnding,reduce?200:11000);}
function finishEnding(){clearEnding();$('ending').classList.add('open');$('ending-title').textContent='你就是，傳說中的解咒者。';$('ending-text').textContent=C.ending[3];$('ending-actions').classList.remove('hidden');$('skip-ending').classList.add('hidden');state.finished=true;state.completedAt||=new Date().toISOString();save();renderProgress();endingLater(showCertificate,8000);}
function showCertificate(){
 $('certificate-name').textContent=state.name;
 $('certificate-hints').textContent=`本次旅程共使用 ${state.hints.reduce((a,b)=>a+b,0)} 顆星光提示（五關共 15 顆）`;
 $('certificate-date').textContent='完成日期：'+new Date(state.completedAt).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'});
 $('certificate').classList.remove('hidden');
 $('certificate-preview').classList.add('hidden');$('certificate-image').removeAttribute('src');
 prepareCertificateImage();
 $('certificate').scrollIntoView({behavior:'smooth',block:'start'});
}
async function prepareCertificateImage(){
 try{
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1100;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f7f2e4';ctx.fillRect(0,0,1600,1100);
 ctx.strokeStyle='#b28a40';ctx.lineWidth=4;ctx.strokeRect(42,42,1516,1016);ctx.lineWidth=1;ctx.strokeRect(58,58,1484,984);
 ctx.textAlign='center';ctx.fillStyle='#294a4b';
 const line=(text,y,size=30)=>{ctx.font=`${size}px "PingFang TC","Microsoft JhengHei",sans-serif`;ctx.fillText(text,800,y,1400);};
 line('DUSKWOOD ACADEMY',130,24);line('靈魂試煉・闖關成功證書',235,64);
 line('授予勇敢而充滿智慧的',330,28);line(state.name,430,72);
 line('你已解開五道封印，集齊靈魂之光，',540,34);line('帶領暮夜學院的伙伴們重返星空。',600,34);
 line($('certificate-hints').textContent,700,30);line($('certificate-date').textContent,760,26);
 line('真正的魔法，是智慧與勇氣的結合。',875,34);
 line('《小益老師教你玩數學解謎》',980,26);
 const seal=document.querySelector('.certificate-seal');await seal.decode().catch(()=>{});if(seal.complete&&seal.naturalWidth)ctx.drawImage(seal,1260,80,160,160);
 const dataURL=canvas.toDataURL('image/png');$('certificate-image').src=dataURL;$('certificate-preview').classList.remove('hidden');$('certificate-status').textContent='證書圖片已準備好，可以下載或長按下方圖片儲存。';return dataURL;
 }catch(e){$('certificate-status').textContent='圖片暫時無法產生，請再按一次下載，或將畫面上的證書截圖保存。';return null;}
}
$('download-certificate').onclick=async()=>{
 const url=$('certificate-image').getAttribute('src')||await prepareCertificateImage();if(!url)return;
 const a=document.createElement('a');a.href=url;a.download='暮夜學院-闖關成功證書.png';a.click();
 $('certificate-status').textContent='已開始下載。手機、平板也可以長按下方證書圖片儲存。';
 $('certificate-preview').scrollIntoView({behavior:'smooth',block:'start'});
};
$('skip-ending').onclick=finishEnding;$('replay-ending').onclick=playEnding;$('finish-ending').onclick=()=>closeDialog('final-dialog');
$('player-name').value=state.name;
renderProgress();
showIntroduction();
})();
