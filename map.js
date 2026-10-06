(() => {
'use strict';
const $=id=>document.getElementById(id);let renderer,scene,camera,world,initialized=false,flat=false,failed=false,callback,done=[],angle=-.08,zoom=1,drag=null,islands=[],labels=[],sparkles,wizard,ghost,raf;
const positions=[[-4.1,0,3.5],[.2,.25,4],[4,.65,.4],[1.9,1,-3.8],[-3,.75,-3.3]];
const flatPositions=[[19,37],[50,45],[27,64],[79,31],[51,22]];
const texCache={};
function texture(name){if(texCache[name])return texCache[name];const t=new THREE.TextureLoader().load(`assets/textures/${name}.webp`);t.colorSpace=THREE.SRGBColorSpace;texCache[name]=t;return t;}
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.93,...extra});}
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,230,161,1)');g.addColorStop(.2,'rgba(255,217,128,.7)');g.addColorStop(1,'rgba(255,204,128,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
function tree(parent,x,z,scale=1){const t=new THREE.Group();t.position.set(x,.2,z);t.scale.setScalar(scale);parent.add(t);mesh(new THREE.CylinderGeometry(.06,.11,.7,6),mat('#7b6351'),t,0,.35,0);[.75,1.06,1.3].forEach((y,i)=>mesh(new THREE.ConeGeometry(.5-i*.11,.65,7),mat(['#365a50','#426b59','#56745f'][i]),t,0,y,0));}
function init(cb,d){callback=cb;done=d;if(initialized)return;initialized=true;createLabels();try{
 const T=THREE;scene=new T.Scene();scene.fog=new T.FogExp2('#18343c',.025);camera=new T.PerspectiveCamera(35,1,.1,100);renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x142e35,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setSize(800,530);$('map-canvas').appendChild(renderer.domElement);scene.add(new T.HemisphereLight('#f4efd2','#33434d',2.3));let sun=new T.DirectionalLight('#ffdeb0',3);sun.position.set(-4,12,7);scene.add(sun);let rim=new T.DirectionalLight('#a4b5ef',2);rim.position.set(5,5,-9);scene.add(rim);world=new T.Group();scene.add(world);
 const glow=glowTexture();
 positions.forEach(([x,y,z],i)=>{const group=new T.Group();group.position.set(x,y,z);group.userData.index=i;world.add(group);
 mesh(new T.CylinderGeometry(1.85,1.12,1.35,7),mat('#64726a'),group,0,-.67,0);
 mesh(new T.ConeGeometry(1.13,1.8,7),mat('#536366'),group,0,-2.1,0).rotation.z=Math.PI;
 mesh(new T.CylinderGeometry(1.88,1.88,.18,40),mat('#889179'),group,0,.08,0);
 const ring=mesh(new T.TorusGeometry(1.74,.025,5,64),new T.MeshBasicMaterial({color:'#d8bd7a'}),group,0,.2,0);ring.rotation.x=-Math.PI/2;
 mesh(new T.BoxGeometry(2.5,2.25,.26),mat('#8f8b7b'),group,0,1.42,-.44);
 let picture=mesh(new T.PlaneGeometry(2.3,2.18),new T.MeshBasicMaterial({map:texture(C.levels[i].scene),side:T.DoubleSide}),group,0,1.45,-.285);picture.userData.index=i;
 for(const side of [-1,1]){mesh(new T.CylinderGeometry(.28,.34,2.5,9),mat('#8a8a7c'),group,side*1.32,1.43,-.35);mesh(new T.ConeGeometry(.45,1.1,9),mat(i%2?'#686178':'#376574'),group,side*1.32,3.23,-.35);mesh(new T.SphereGeometry(.075,8,8),mat('#e2ba66',{emissive:'#937333'}),group,side*1.32,3.83,-.35);}
 const roof=mesh(new T.ConeGeometry(1.9,1.1,4),mat(i%2?'#726880':'#446b77'),group,0,3.06,-.35);roof.rotation.y=Math.PI/4;roof.scale.z=.58;
 for(let k=0;k<3;k++)mesh(new T.BoxGeometry(1.6,.16,.5),mat('#aa9d82'),group,0,.18+k*.13,.85-k*.3);
 tree(group,-1.3,.6,.7);tree(group,1.15,1,.45);
 let lantern=mesh(new T.OctahedronGeometry(.15),new T.MeshStandardMaterial({color:'#f4d087',emissive:'#e5b254',emissiveIntensity:2}),group,-.95,.65,1.15);
 let glowSprite=new T.Sprite(new T.SpriteMaterial({map:glow,transparent:true,depthWrite:false}));glowSprite.position.copy(lantern.position);glowSprite.scale.set(1,1,1);group.add(glowSprite);
 islands.push({group,ring,picture,lantern,glow:glowSprite});
 });
 for(let i=0;i<4;i++){const a=new T.Vector3(...positions[i]),b=new T.Vector3(...positions[i+1]);a.y+=.05;b.y+=.05;const direction=b.clone().sub(a),length=direction.length();for(let j=0;j<14;j++){let t=j/13;if(t<.24||t>.76)continue;let p=a.clone().lerp(b,t);p.y+=Math.sin(t*Math.PI)*.26;let step=mesh(new T.BoxGeometry(.7,.13,length/14*.8),mat('#af9d77'),world,p.x,p.y,p.z);step.rotation.y=Math.atan2(direction.x,direction.z);}}
 wizard=new T.Sprite(new T.SpriteMaterial({map:texture('wizard'),transparent:true,depthWrite:false}));wizard.scale.set(1.6,1.6,1);world.add(wizard);
 ghost=new T.Sprite(new T.SpriteMaterial({map:texture('ghost'),transparent:true,depthWrite:false}));ghost.scale.set(1.15,1.15,1);ghost.position.set(0,4,-1);world.add(ghost);
 const pts=new Float32Array(160*3);for(let i=0;i<160;i++){pts[i*3]=(Math.random()-.5)*22;pts[i*3+1]=Math.random()*9-2;pts[i*3+2]=(Math.random()-.5)*18;}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pts,3));sparkles=new T.Points(geometry,new T.PointsMaterial({color:'#efd899',size:.075,map:glow,transparent:true,depthWrite:false}));scene.add(sparkles);
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,start:angle,moved:false,pointer:e.pointerId};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag){let dx=e.clientX-drag.x;if(Math.abs(dx)>6)drag.moved=true;angle=drag.start+dx*.006;}});canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(),mouse=new T.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1),ray=new T.Raycaster();ray.setFromCamera(mouse,camera);let hits=ray.intersectObjects(islands.map(i=>i.group),true);if(hits.length){let o=hits[0].object;while(o&&o.userData.index===undefined)o=o.parent;if(o)callback(o.userData.index);}}drag=null;});
 window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('map-stage'));update(done);resize();animate();
 }catch(e){failed=true;flat=true;$('map-canvas').classList.add('hidden');$('map-flat').classList.remove('hidden');$('map-instruction').textContent='目前使用繪本地圖 · 點選標記進入關卡';$('view-btn').textContent='繪本地圖模式';$('view-btn').disabled=true;positionLabels();}
 $('view-btn').onclick=()=>{flat=!flat;$('map-canvas').classList.toggle('hidden',flat);$('map-flat').classList.toggle('hidden',!flat);$('view-btn').textContent=flat?'切換 3D 地圖':'切換繪本地圖';$('map-instruction').textContent=flat?'點選關卡標記，進入下一道試煉':'拖曳旋轉地圖 · 點選發光關卡';positionLabels();};$('reset-camera').onclick=()=>{angle=-.08;zoom=1;resize();};$('zoom-in').onclick=()=>{zoom=Math.min(1.45,zoom+.12);resize();};$('zoom-out').onclick=()=>{zoom=Math.max(.75,zoom-.12);resize();};
}
const C=window.GAME_CONTENT;
function createLabels(){labels=C.levels.map((l,i)=>{const b=document.createElement('button');b.className='map-label';b.onclick=()=>callback(i);$('map-labels').appendChild(b);return b;});update(done);}
function update(d){done=[...d];labels.forEach((b,i)=>{b.textContent=`${done.includes(i)?'✓':String(i+1).padStart(2,'0')}　${C.levels[i].name}`;b.disabled=i>done.length;b.classList.toggle('available',i===done.length);b.classList.toggle('done',done.includes(i));});islands.forEach((is,i)=>{is.ring.material.color.set(done.includes(i)?'#9fcda4':i===done.length?'#ffde85':'#5f8284');is.glow.visible=i<=done.length;});if(wizard){let p=positions[Math.min(4,done.length)];wizard.position.set(p[0]+.9,p[1]+1,p[2]+1.6);}}
function resize(){if(!renderer||!camera)return;const w=$('map-stage').clientWidth,h=$('map-stage').clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;const dist=(w/h<1?25:20)/zoom;camera.position.set(dist*.45,dist*.65,dist*.83);camera.lookAt(0,.4,0);camera.updateProjectionMatrix();positionLabels();}
function positionLabels(){const w=$('map-stage').clientWidth,h=$('map-stage').clientHeight;labels.forEach((b,i)=>{if(flat||failed){b.style.left=flatPositions[i][0]+'%';b.style.top=flatPositions[i][1]+'%';}else if(camera&&islands[i]){const v=islands[i].group.localToWorld(new THREE.Vector3(0,-.12,1.3));v.project(camera);b.style.left=Math.max(70,Math.min(w-70,(v.x*.5+.5)*w))+'px';b.style.top=Math.max(30,Math.min(h-50,(-v.y*.5+.5)*h))+'px';}});}
function animate(time=0){raf=requestAnimationFrame(animate);if(document.hidden||$('adventure').classList.contains('hidden')||flat)return;world.rotation.y=angle;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){ghost.position.y=4+Math.sin(time*.001)*.35;sparkles.rotation.y=time*.000015;islands.forEach((is,i)=>is.lantern.rotation.y=time*.001+i);}world.updateMatrixWorld();positionLabels();renderer.render(scene,camera);}
window.AcademyMap={init,update,resize};
})();
