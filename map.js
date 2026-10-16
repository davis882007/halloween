(() => {
'use strict';
const $=id=>document.getElementById(id),C=window.GAME_CONTENT;
// Hotspots follow the illustration's intrinsic proportions, never a cropped background.
const spots=[{x:20,y:34,w:29,h:23},{x:52,y:46,w:23,h:16},{x:28,y:65,w:34,h:23},{x:83,y:31,w:28,h:37},{x:52,y:20,w:27,h:27}];
let renderer,scene,camera,walker,body,legs=[],arms=[],hat,labels=[],done=[],callback,ready=false,travel=null,last=0,position={x:63,y:75},pending=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.88});}
function add(geo,color,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);parent.add(m);return m;}
function makeWizard(){const T=THREE;walker=new T.Group();scene.add(walker);body=new T.Group();walker.add(body);
 for(let i=0;i<7;i++){const a=i*2.4;const ornament=add(new T.OctahedronGeometry(.075),'#e3c071',body,Math.sin(a)*.44,1.3+i*.12,Math.cos(a)*.48);ornament.scale.z=.35;}
 const shadow=add(new T.CircleGeometry(1.05,32),'#253b34',walker,0,.02,0);shadow.rotation.x=-Math.PI/2;shadow.material.transparent=true;shadow.material.opacity=.22;
 add(new T.ConeGeometry(.69,1.6,20),'#254b6b',body,0,1.6,0); // dimensional robe
 add(new T.ConeGeometry(.77,1.45,20,1,true),'#294c76',body,0,1.75,-.14);
 add(new T.CylinderGeometry(.43,.46,.16,16),'#d5b366',body,0,1.35,0);
 add(new T.SphereGeometry(.51,24,16),'#f4d1ad',body,0,2.65,0);
 const hair=add(new T.SphereGeometry(.53,24,16,0,Math.PI*2,0,Math.PI*.53),'#714930',body,0,2.71,0);
 for(const x of [-.18,.18]){add(new T.SphereGeometry(.048,12,8),'#243438',body,x,2.68,.47);add(new T.SphereGeometry(.085,12,8),'#e4a795',body,x*1.5,2.5,.42);}
 hat=new T.Group();hat.position.set(0,3.05,0);body.add(hat);
 add(new T.CylinderGeometry(.96,.96,.075,28),'#254966',hat);
 const top=add(new T.ConeGeometry(.62,1.45,24),'#315978',hat,-.08,.66,0);top.rotation.z=.16;
 add(new T.CylinderGeometry(.59,.65,.14,24),'#c9a35c',hat,0,.1,0);
 add(new T.OctahedronGeometry(.13),'#ffe1a0',hat,0,.25,.53);
 for(const side of [-1,1]){
  const leg=new T.Group();leg.position.set(side*.27,1.02,0);body.add(leg);legs.push(leg);
  add(new T.CylinderGeometry(.15,.13,.65,12),'#796047',leg,0,-.25,0);
  const boot=add(new T.SphereGeometry(.23,16,10),'#634533',leg,0,-.58,.11);boot.scale.set(.85,.8,1.55);
  const arm=new T.Group();arm.position.set(side*.48,2.16,0);body.add(arm);arms.push(arm);
  const sleeve=add(new T.CylinderGeometry(.23,.15,.68,12),'#e9d9ad',arm,side*.14,-.23,0);sleeve.rotation.z=side*.25;
  add(new T.SphereGeometry(.16,16,10),'#f4d1ad',arm,side*.22,-.55,.03);
 }
 const lantern=new T.Group();lantern.position.set(-.22,-.95,.1);arms[0].add(lantern);
 const ring=add(new T.TorusGeometry(.16,.035,8,16),'#d3a652',lantern,0,.35,0);
 const gem=add(new T.OctahedronGeometry(.32),'#ffe5a0',lantern);gem.material.emissive.set('#ffce62');gem.material.emissiveIntensity=1.4;
 const frame=new T.LineSegments(new T.EdgesGeometry(new T.OctahedronGeometry(.36)),new T.LineBasicMaterial({color:'#a37d39'}));lantern.add(frame);
 lantern.add(new T.PointLight('#ffcc77',2,7));
 walker.scale.setScalar(3);walker.rotation.y=.25;
}
function choose(i){
 if(travel)pending=null;
 const end={x:spots[i].x,y:spots[i].y+spots[i].h/2-1};
 if(!renderer||reduced()){position=end;callback(i);return;}
 const distance=Math.hypot(end.x-position.x,end.y-position.y);
 travel={from:{...position},to:end,start:performance.now(),duration:Math.max(700,Math.min(2400,distance*45)),index:i};
 $('map-instruction').textContent='星燈小魔法師正在前往'+C.levels[i].name+'…';
}
function init(cb,d){callback=cb;done=d;if(ready)return;ready=true;
 $('map-flat').classList.remove('hidden');
 labels=spots.map((s,i)=>{const b=document.createElement('button');b.className='academy-hotspot';b.dataset.room=i;b.style.cssText=`left:${s.x}%;top:${s.y}%;width:${s.w}%;height:${s.h}%`;b.innerHTML=`<span class="hotspot-label"></span>`;b.onclick=()=>choose(i);$('map-labels').appendChild(b);return b;});update(done);
 try{const T=THREE;renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;$('map-canvas').appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');scene=new T.Scene();camera=new T.OrthographicCamera(-50,50,50,-50,.1,300);camera.position.set(0,90,120);camera.lookAt(0,0,0);scene.add(new T.HemisphereLight('#fff1ce','#60758b',2.7));const light=new T.DirectionalLight('#fff1d0',3);light.position.set(-20,80,70);scene.add(light);makeWizard();resize();requestAnimationFrame(tick);
 }catch(e){renderer=null;$('map-canvas').innerHTML='<img class="fallback-wizard" src="assets/characters/wizard.webp" alt="提燈的小魔法師">';}
 new ResizeObserver(resize).observe($('map-stage'));window.addEventListener('resize',resize);
}
function update(d){done=[...d];labels.forEach((b,i)=>{b.classList.toggle('done',done.includes(i));b.setAttribute('aria-label',`${C.levels[i].name}${done.includes(i)?'，已完成':'，開始挑戰'}`);b.querySelector('span').textContent=`${done.includes(i)?'✓':String(i+1).padStart(2,'0')} ${C.levels[i].name}`;});}
function resize(){if(!renderer)return;const w=$('map-stage').clientWidth,h=$('map-stage').clientHeight;if(!w||!h)return;renderer.setSize(w,h);if(walker)walker.scale.setScalar(w<500?3.7:3);camera.left=-50;camera.right=50;camera.top=50*h/w;camera.bottom=-50*h/w;camera.updateProjectionMatrix();}
function tick(t){requestAnimationFrame(tick);if(document.hidden||$('adventure').classList.contains('hidden'))return;
 let walking=!!travel;
 if(travel){const k=Math.min(1,(t-travel.start)/travel.duration);position.x=travel.from.x+(travel.to.x-travel.from.x)*k;position.y=travel.from.y+(travel.to.y-travel.from.y)*k;walker.rotation.y=Math.atan2(travel.to.x-travel.from.x,(travel.to.y-travel.from.y)*1.25);if(k===1){pending=travel.index;travel=null;walking=false;}}
 // Unproject image coordinates onto a plane facing the camera, with feet on the illustration.
 const v=new THREE.Vector3(position.x/50-1,1-position.y/50,0).unproject(camera);walker.position.copy(v);
 const phase=t*.012;legs.forEach((l,i)=>l.rotation.x=walking?Math.sin(phase+i*Math.PI)*.65:0);arms.forEach((a,i)=>a.rotation.x=walking?Math.sin(phase+i*Math.PI+Math.PI)*.38:0);body.position.y=walking?Math.abs(Math.sin(phase))*.12:0;hat.rotation.z=walking?Math.sin(phase)*.035:0;
 renderer.render(scene,camera);
 if(pending!==null){const i=pending;pending=null;$('map-instruction').textContent='自由選關 · 點選建築，跟著星燈出發';callback(i);}
}
window.AcademyMap={init,update,resize};
})();
