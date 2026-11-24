(function(){
'use strict';
var D=window.SITE_DATA||{projects:{},dev:{}}, P=D.projects, DEV=D.dev;
var $=function(s,r){return (r||document).querySelector(s);}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var css=function(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();};
var T2=320,T3=640;

/* ---------- quality tier: decided once, demotion only ---------- */
var canvasOK=(function(){try{return !!document.createElement('canvas').getContext('2d');}catch(e){return false;}})();
var TIER=(matchMedia('(prefers-reduced-motion: reduce)').matches||!canvasOK)?'static':((matchMedia('(max-width: 900px)').matches||(navigator.deviceMemory&&navigator.deviceMemory<4))?'reduced':'full');
if(TIER==='static') document.documentElement.classList.add('static');

var SECS={home:{n:0,tone:'--blue',label:'HOME'},about:{n:1,tone:'--cyan',label:'ABOUT'},projects:{n:2,tone:'--violet',label:'PROJECTS'},development:{n:3,tone:'--amber',label:'DEVELOPMENT'},contact:{n:4,tone:'--green',label:'CONTACT'},privacy:{n:4,tone:'--violet',label:'PRIVACY'},terms:{n:4,tone:'--cyan',label:'TERMS'}};
var CATS=[['music','Original music','Original catalogs written, recorded and produced in the studio.'],['video','Video productions','Music videos and motion work, cut from the song outward on the studio\'s own pipeline.'],['web','Website development','Sites for bands, studios and shops: designed, built, launched, and then looked after.']];
var STAGES=['Concept','Build','Test','Release'];
var cur={sec:null,key:null}, cat='music', activeRow=null, focusBox=null, booted=false;
var vp=$('#vp');

/* =====================================================================
   THE DOT FIELD: one canvas, one clock. Boot text, the mark, the wipe.
   ===================================================================== */
var F={mx:0,my:0,cv:$('#field'),ctx:null,W:0,H:0,dpr:1,n:0,mode:'off',ptr:{x:-9999,y:-9999},wipe:null,run:false,t0:0,typed:0,chars:0,cursor:null,mix:0,r:3,pitch:8};
var X,Y,VX,VY,TX,TY,BX,BY,CH,A,TA,Z;
function fieldSize(){
  var r=vp.getBoundingClientRect(); F.dpr=Math.min(window.devicePixelRatio||1,TIER==='full'?2:1.25);
  F.W=r.width; F.H=r.height; F.cv.width=Math.round(F.W*F.dpr); F.cv.height=Math.round(F.H*F.dpr);
  F.ctx=F.cv.getContext('2d'); F.ctx.setTransform(F.dpr,0,0,F.dpr,0,0);
}
function sampleHare(){
  var img=$('#markimg'), box=$('#markbox').getBoundingClientRect(), v=vp.getBoundingClientRect();
  /* a viewport with no size yet (a hidden or collapsed pane) has nothing to sample: return empty and let resize rebuild */
  if(!(box.height>8&&box.width>8&&img.naturalWidth)){ F.pitch=8; F.r=3; return []; }
  var rows=TIER==='full'?66:44, pitch=box.height/rows, cols=Math.max(1,Math.round(box.width/pitch));
  var c=document.createElement('canvas'); c.width=cols; c.height=rows; var x=c.getContext('2d'); x.drawImage(img,0,0,cols,rows);
  var d=x.getImageData(0,0,cols,rows).data, pts=[];
  for(var j=0;j<rows;j++)for(var i=0;i<cols;i++){ if(d[(j*cols+i)*4+3]>120) pts.push([box.left-v.left+(i+.5)*pitch, box.top-v.top+(j+.5)*pitch]); }
  F.pitch=pitch; F.r=pitch*.4; return pts;
}
function sampleText(str){
  var fs=18, c=document.createElement('canvas'), x=c.getContext('2d'); x.font='bold '+fs+'px Consolas,monospace';
  var cw=x.measureText('M').width, w=Math.ceil(cw*str.length)+2, h=fs+6; c.width=w; c.height=h;
  x=c.getContext('2d'); x.font='bold '+fs+'px Consolas,monospace'; x.textBaseline='top'; x.fillStyle='#fff'; x.fillText(str,1,2);
  var d=x.getImageData(0,0,w,h).data, pts=[], tp=Math.min(F.pitch*1.05,F.W*.82/w), ox=(F.W-w*tp)/2, oy=(F.H-h*tp)/2;
  for(var j=0;j<h;j++)for(var i=0;i<w;i++){ if(d[(j*w+i)*4+3]>105) pts.push([ox+i*tp,oy+j*tp,Math.min(str.length-1,Math.floor((i-1)/cw))]); }
  F.tr=Math.min(F.r,tp*.42); F.cursor={x:ox,y:oy+2*tp,w:cw*tp*.8,h:(fs-2)*tp,cw:cw*tp}; return pts;
}
function buildDots(withText){
  var hp=sampleHare(), tp=(withText&&hp.length)?sampleText('# ./start'):[]; F.n=hp.length; F.tn=tp.length; document.documentElement.classList.toggle('nodots',!F.n);
  X=new Float32Array(F.n);Y=new Float32Array(F.n);VX=new Float32Array(F.n);VY=new Float32Array(F.n);TX=new Float32Array(F.n);TY=new Float32Array(F.n);BX=new Float32Array(F.n);BY=new Float32Array(F.n);CH=new Int16Array(F.n);A=new Float32Array(F.n);TA=new Float32Array(F.n);Z=new Float32Array(F.n);
  /* shuffle so the text is drawn from dots spread across the whole mark */
  for(var s=hp.length-1;s>0;s--){ var q=Math.floor(Math.random()*(s+1)), tmp=hp[s]; hp[s]=hp[q]; hp[q]=tmp; }
  var cx=0,cy=0,rm=1,q2; for(q2=0;q2<hp.length;q2++){ cx+=hp[q2][0]; cy+=hp[q2][1]; } cx/=hp.length||1; cy/=hp.length||1; for(q2=0;q2<hp.length;q2++){ rm=Math.max(rm,Math.hypot(hp[q2][0]-cx,hp[q2][1]-cy)); }
  for(var i=0;i<F.n;i++){ TX[i]=hp[i][0]; TY[i]=hp[i][1]; var dd=Math.hypot(TX[i]-cx,TY[i]-cy)/rm; Z[i]=1-dd*dd; var t=tp.length?tp[i%tp.length]:null; BX[i]=t?t[0]:TX[i]; BY[i]=t?t[1]:TY[i]; CH[i]=t?t[2]:-1; X[i]=BX[i]; Y[i]=BY[i]; A[i]=0; TA[i]=0; }
}
function scatter(){ for(var i=0;i<F.n;i++){ var a=Math.random()*6.283, d=(0.25+Math.random()*.6)*Math.max(F.W,F.H)*.5; X[i]=TX[i]+Math.cos(a)*d; Y[i]=TY[i]+Math.sin(a)*d; VX[i]=VY[i]=0; A[i]=0; TA[i]=1; } }
function burst(){ for(var i=0;i<F.n;i++){ X[i]=BX[i]; Y[i]=BY[i]; var a=Math.random()*6.283, v=4+Math.random()*16; VX[i]=Math.cos(a)*v; VY[i]=Math.sin(a)*v; A[i]=i<F.tn?1:.0; TA[i]=1; } F.mode='mark'; F.mix=0; }
function start(){ if(F.run||TIER==='static')return; F.run=true; requestAnimationFrame(tick); }
function tick(now){
  if(!F.run)return;
  if(document.hidden){ F.run=false; return; }
  if(F.last){ F.slow=(now-F.last>34)?(F.slow||0)+1:0; if(F.slow>90&&TIER==='full'){ TIER='reduced'; } } F.last=now;
  var c=F.ctx, i; c.clearRect(0,0,F.W,F.H);
  if(F.mode==='boot'){
    var el=now-F.t0, typed=Math.min(F.chars,Math.floor(el/95));
    if(typed!==F.typed){ F.typed=typed; for(i=0;i<Math.min(F.n,F.tn);i++){ if(CH[i]<typed) A[i]=1; } }
    drawDots(c,now,true);
    if(Math.floor(now/420)%2===0){ c.fillStyle=css('--text'); c.globalAlpha=.9; c.fillRect(F.cursor.x+F.cursor.cw*typed+F.cursor.cw*.15,F.cursor.y,F.cursor.w,F.cursor.h); c.globalAlpha=1; }
    if(el>95*F.chars+620){ burst(); wake(); }
  } else if(F.mode==='mark'){
    F.mix=Math.min(1,F.mix+.02);
    var px=F.ptr.x, py=F.ptr.y, R=F.pitch*9, R2=R*R, phys=TIER==='full';
    for(i=0;i<F.n;i++){
      var ty=TY[i]+Math.sin(now*.0011+TX[i]*.012)*F.pitch*.16;
      VX[i]=(VX[i]+(TX[i]-X[i])*.055)*.84; VY[i]=(VY[i]+(ty-Y[i])*.055)*.84;
      if(phys){ var dx=X[i]-px, dy=Y[i]-py, d2=dx*dx+dy*dy; if(d2<R2&&d2>.01){ var d=Math.sqrt(d2), f=(1-d/R)*2.6; VX[i]+=dx/d*f; VY[i]+=dy/d*f; } }
      X[i]+=VX[i]; Y[i]+=VY[i]; A[i]+=(TA[i]-A[i])*.08;
    }
    drawDots(c,now,false);
  }
  if(F.wipe) drawWipe(c,now);
  if(F.mode==='off'&&!F.wipe){ F.run=false; c.clearRect(0,0,F.W,F.H); return; }
  requestAnimationFrame(tick);
}
var SPR={};
function sprite(col){ var key=col+'|'+F.r.toFixed(2); if(SPR[key]) return SPR[key]; var R=Math.ceil(F.r*3.2), cv=document.createElement('canvas'); cv.width=cv.height=R*2; var x=cv.getContext('2d'), g=x.createRadialGradient(R,R,0,R,R,R); g.addColorStop(0,col); g.addColorStop(.3,col); g.addColorStop(.36,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,R*2,R*2); x.globalAlpha=.22; var h=x.createRadialGradient(R,R,0,R,R,R); h.addColorStop(0,col); h.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=h; x.fillRect(0,0,R*2,R*2); SPR[key]={cv:cv,R:R}; return SPR[key]; }
function drawDotsSprite(c,boot){ var am=sprite(css('--amber')), cr=boot?sprite(css('--text')):null, i, s; c.globalCompositeOperation='lighter';
  /* a faint back plane: the same mark, deeper, moving the other way */
  if(!boot&&(F.mx||F.my)){ var bx=F.mx*F.pitch*3.4, by=F.my*F.pitch*2.4; for(i=0;i<F.n;i+=2){ if(A[i]<.5) continue; c.globalAlpha=.13; c.drawImage(am.cv,X[i]-am.R+bx,Y[i]-am.R+by); } }
  for(i=0;i<F.n;i++){ if(A[i]<.02) continue; s=(boot&&CH[i]===0&&i<F.tn)?cr:am; c.globalAlpha=Math.min(1,A[i]); c.drawImage(s.cv,X[i]-s.R+(boot?0:F.mx*(.35+Z[i])*F.pitch*-2.2),Y[i]-s.R+(boot?0:F.my*(.35+Z[i])*F.pitch*-1.6)); } c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
function drawDots(c,now,boot){ if(TIER==='full'){ drawDotsSprite(c,boot); return; }
  var amber=css('--amber'), cream=css('--text'), r=boot?F.tr:F.r, i;
  c.fillStyle=boot?amber:amber; c.beginPath();
  for(i=0;i<F.n;i++){ if(A[i]>.97&&!(boot&&CH[i]===0)){ c.moveTo(X[i]+r,Y[i]); c.arc(X[i],Y[i],r,0,6.283); } }
  c.fill();
  if(boot){ c.fillStyle=cream; c.beginPath(); for(i=0;i<Math.min(F.n,F.tn);i++){ if(A[i]>.97&&CH[i]===0){ c.moveTo(X[i]+r,Y[i]); c.arc(X[i],Y[i],r,0,6.283); } } c.fill(); }
  else { for(i=0;i<F.n;i++){ if(A[i]>.02&&A[i]<=.97){ c.globalAlpha=A[i]; c.beginPath(); c.arc(X[i],Y[i],r,0,6.283); c.fill(); } } c.globalAlpha=1; }
}
function ease(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
function drawWipe(c,now){
  var w=F.wipe, p=Math.min(1,(now-w.t0)/w.dur), x0,x1,q;
  if(p<.5){ q=ease(p*2); x0=0; x1=q*F.W; } else { if(!w.swapped){ w.swapped=true; w.mid(); } q=ease((p-.5)*2); x0=q*F.W; x1=F.W; }
  if(w.dir<0){ var mx=F.W-x1; x1=F.W-x0; x0=mx; }
  c.fillStyle=css('--black'); c.fillRect(x0,0,x1-x0,F.H);
  if(!w.pat){ var pc=document.createElement('canvas'), ps=Math.round(Math.max(9,F.pitch*1.25)); pc.width=pc.height=ps; var px2=pc.getContext('2d'); px2.fillStyle=w.color; px2.globalAlpha=.16; px2.beginPath(); px2.arc(ps/2,ps/2,ps*.22,0,6.283); px2.fill(); w.pat=c.createPattern(pc,'repeat'); w.ps=ps; }
  c.fillStyle=w.pat; c.fillRect(x0,0,x1-x0,F.H);
  /* the lit edge: a band of LED cells on the moving side of the cover */
  var pt=w.ps, lead=(p<.5)===(w.dir>0), edge=lead?x1:x0, dir=lead?-1:1, cols=30, rows=Math.ceil(F.H/pt), r=pt*.3; c.fillStyle=w.color;
  for(var k=0;k<cols;k++){ var cx=Math.round((edge+dir*k*pt)/pt)*pt+pt/2; if(cx<x0-pt||cx>x1+pt) continue; var fall=1-k/cols;
    for(var j=0;j<rows;j++){ var h=Math.sin((j*12.9898+k*78.233+Math.floor(now/70)*3.1)*43758.5453); h=h-Math.floor(h); if(h>fall*.9) continue; c.globalAlpha=fall*(.35+h*.65); c.fillRect(cx-r,j*pt+pt/2-r,r*2,r*2); } }
  c.globalAlpha=1;
  if(p>=1){ F.wipe=null; if(w.done) w.done(); }
}
function wipe(color,mid,done,dir){
  if(TIER==='static'||!booted||document.hidden){ mid(); if(done) done(); return; }
  F.wipe={t0:performance.now(),dur:T3*1.5,color:color,mid:mid,done:done,swapped:false,dir:dir||1}; start();
}
vp.addEventListener('pointermove',function(e){ var r=vp.getBoundingClientRect(); F.ptr.x=e.clientX-r.left; F.ptr.y=e.clientY-r.top; });
vp.addEventListener('pointerleave',function(){ F.ptr.x=F.ptr.y=-9999; });
document.addEventListener('visibilitychange',function(){ if(!document.hidden&&(F.mode!=='off'||F.wipe)) start(); });
var rz; addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(function(){ if(TIER==='static'||F.mode==='boot')return; fieldSize(); if(cur.sec==='home'){ buildDots(false); if(!F.n){ F.mode='off'; return; } for(var i=0;i<F.n;i++){ X[i]=TX[i]; Y[i]=TY[i]; A[i]=TA[i]=1; } F.mode='mark'; start(); } },160); });

/* ---------- the console wakes ---------- */
function wake(){
  if(booted)return; booted=true;
  try{ sessionStorage.setItem('site2','1'); }catch(e){}
  setTimeout(function(){ $('#s-home').classList.add('lit'); },TIER==='static'?0:520);
  setTimeout(function(){ document.body.classList.remove('boot'); },TIER==='static'?0:900);
}
function boot(){
  var deep=parse().sec!=='home', seen=false; try{ seen=!!sessionStorage.getItem('site2'); }catch(e){}
  if(TIER==='static'){ wake(); return; }
  fieldSize();
  if(deep){ booted=true; document.body.classList.remove('boot'); $('#s-home').classList.add('lit'); return; }
  if(seen){ document.body.classList.add('fast'); buildDots(false); if(!F.n){ F.mode='off'; wake(); return; } scatter(); F.mode='mark'; start(); wake(); return; }
  buildDots(true); if(!F.n){ document.body.classList.add('fast'); F.mode='off'; wake(); return; }
  F.mode='boot'; F.t0=performance.now(); F.chars=9; F.typed=0; start();
  var skip=function(){ if(booted)return; burst(); wake(); };
  addEventListener('keydown',skip,{once:true}); vp.addEventListener('pointerdown',skip,{once:true});
  setTimeout(function(){ if(!booted){ burst(); wake(); } },4200);
}

/* =====================================================================
   ROUTER: sections and files are real history entries
   ===================================================================== */
function parse(){ var h=(location.hash||'').replace(/^#/,'').split('/'), s=SECS[h[0]]?h[0]:'home', k=h[1]||null; if(s==='projects'&&!P[k])k=null; if(s==='development'&&!DEV[k])k=null; if(s!=='projects'&&s!=='development')k=null; return {sec:s,key:k}; }
function show(sec){
  $$('.home,.screen').forEach(function(el){ var on=el.id==='s-'+sec; el.classList.toggle('on',on); el.classList.remove('enter'); if(el.id!=='s-home') el.setAttribute('aria-hidden',on?'false':'true'); });
  var el=$('#s-'+sec), S=SECS[sec]; vp.scrollTop=0; vp.scrollLeft=0;
  document.documentElement.style.setProperty('--sec','var('+S.tone+')');
  $('#railon').style.setProperty('--y',[8,29,50,71,92][S.n]);
  $$('.seg[data-sec]').forEach(function(a){ if(a.getAttribute('data-sec')===sec) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  if(booted){ if(sec==='home') sfx.close(); else sfx.open(); }
  if(sec!=='home'){ void el.offsetWidth; el.classList.add('enter'); var sb=$('.sbody',el); if(sb) sb.scrollTop=0; if(sec==='about') countUp(); if(sec==='projects') renderIndex(); if(sec==='development') setBox(focusBox||Object.keys(DEV)[0],true); var h=$('h2',el); if(h&&booted) try{ h.focus({preventScroll:true}); }catch(e){} }
  document.title=(sec==='home'?'':S.label.charAt(0)+S.label.slice(1).toLowerCase()+' / ')+'Slow Lightning Studio';
}
function route(){
  var r=parse();
  if(r.sec!==cur.sec){
    var from=cur.sec; cur.sec=r.sec; cur.key=null;
    var mid=function(){ closeFile(true); closeLight(); show(r.sec); if(r.key) openFile(r.sec,r.key,true); cur.key=r.key;
      if(TIER!=='static'&&from!==null){ if(r.sec==='home'){ if(!F.W) fieldSize(); buildDots(false); scatter(); F.mode='mark'; } else { F.mode='off'; } } path(); };
    if(from===null){ mid(); } else { wipe(css(SECS[r.sec==='home'?from:r.sec].tone),mid,null,(r.sec!=='home'&&SECS[r.sec].n>=SECS[from].n)?1:-1); }
  } else if(r.key!==cur.key){ cur.key=r.key; closeLight(); if(r.key) openFile(r.sec,r.key); else closeFile(); path(); }
}
function path(){
  var S=SECS[cur.sec], t='<b>'+S.label+'</b>';
  if(cur.sec==='projects'){ var c=CATS.filter(function(x){return x[0]===cat;})[0]; t+=' / '+c[1].toUpperCase(); if(cur.key) t+=' / '+esc(P[cur.key].title.toUpperCase()); else t+=' / '+keysIn(cat).length+' FILES'; }
  if(cur.sec==='development'){ t+=cur.key?' / '+esc(DEV[cur.key].title.toUpperCase()):' / '+Object.keys(DEV).length+' TITLES'; }
  $('#path').innerHTML=t;
}
addEventListener('hashchange',route);

/* ---------- about ---------- */
function countUp(){ if(TIER==='static')return; $$('#s-about .nums b').forEach(function(b){ var n=parseInt(b.getAttribute('data-count'),10)||0, t0=performance.now(); (function f(){ var q=Math.min(1,(performance.now()-t0)/1100); b.textContent=Math.round(n*(1-Math.pow(1-q,3))); if(q<1) requestAnimationFrame(f); })(); }); }
function keysIn(c){ return Object.keys(P).filter(function(k){ return P[k].cat===c; }); }

/* ---------- projects ---------- */
function renderTabs(){
  $('#tabs').innerHTML=CATS.map(function(c){ return '<button type="button" role="tab" data-cat="'+c[0]+'" aria-selected="'+(c[0]===cat)+'">'+esc(c[1])+' <b>'+keysIn(c[0]).length+'</b></button>'; }).join('')+'<p id="catblurb"></p>';
}
function renderIndex(){
  var ks=keysIn(cat), c=CATS.filter(function(x){return x[0]===cat;})[0];
  $$('#tabs button').forEach(function(b){ b.setAttribute('aria-selected',String(b.getAttribute('data-cat')===cat)); });
  $('#catblurb').textContent=c[2];
  $('#index').innerHTML=ks.map(function(k,i){ var d=P[k]; return '<a class="row" href="#projects/'+k+'" data-k="'+k+'" data-in style="--i:'+Math.min(i,12)+'">'+(d.img?'<img class="th" src="'+esc(d.img)+'" alt="" loading="lazy">':'<span class="th nopic"></span>')+'<span class="n">'+(i<9?'0':'')+(i+1)+'</span><span class="nm">'+esc(d.title)+'</span><span class="meta">'+esc(d.urlLabel||d.status)+'</span><span class="bl">'+esc(d.blurb||d.lead)+'</span></a>'; }).join('');
  $('#index').classList.toggle('few',ks.length<=4); activeRow=null; setRow(ks[0]); path();
  var ix=$('#index'); ix.scrollTop=0;
}
var stFlip=false;
function setRow(k){
  if(!P[k]||k===activeRow)return; activeRow=k; var d=P[k];
  $$('#index .row').forEach(function(r){ r.classList.toggle('on',r.getAttribute('data-k')===k); });
  var a=$('#st-a'), b=$('#st-b'), none=$('#st-none'), big=(d.shots&&d.shots[0]&&d.shots[0][0])||d.cover||d.img;
  var nextEl=stFlip?a:b, prevEl=stFlip?b:a; stFlip=!stFlip;
  if(big){ nextEl.onload=function(){ nextEl.classList.add('show'); prevEl.classList.remove('show'); none.classList.remove('show'); }; nextEl.src=big; if(nextEl.complete&&nextEl.naturalWidth) nextEl.onload(); }
  else { a.classList.remove('show'); b.classList.remove('show'); none.classList.add('show'); }
  if(HT){ if(big) HT.show(big,css('--violet')); else HT.clear(); }
  var ks2=keysIn(cat), at=ks2.indexOf(k)+1; $('#st-num').innerHTML=(at<10?'0':'')+at+'<small>/ '+(ks2.length<10?'0':'')+ks2.length+'</small>'; sfx.tick();
  var sc=$('#st-scan'); sc.classList.remove('run'); void sc.offsetWidth; sc.classList.add('run');
  $('#st-blurb').textContent=d.blurb||d.lead; $('#st-status').textContent=d.status; $('#st-open').setAttribute('href','#projects/'+k);
}
$('#tabs').addEventListener('click',function(e){ var b=e.target.closest('button[data-cat]'); if(!b)return; cat=b.getAttribute('data-cat'); var ix=$('#s-projects'); ix.classList.remove('enter'); renderIndex(); void ix.offsetWidth; ix.classList.add('enter'); });
$('#index').addEventListener('pointermove',function(e){ var r=e.target.closest('.row'); if(r) setRow(r.getAttribute('data-k')); });
$('#index').addEventListener('focusin',function(e){ var r=e.target.closest('.row'); if(r) setRow(r.getAttribute('data-k')); });
$$('.make a[data-cat]').forEach(function(a){ a.addEventListener('click',function(){ cat=a.getAttribute('data-cat'); }); });

/* ---------- development: the shelf ---------- */
function renderShelf(){
  $('#shelf').innerHTML=Object.keys(DEV).map(function(k){ var d=DEV[k]; return '<a class="box" href="#development/'+k+'" data-k="'+k+'" style="--k:'+esc(d.k)+'" aria-label="'+esc(d.title)+'"><img src="assets/dev/'+k+'-art.jpg" alt=""><img class="cv" src="'+esc(d.cover)+'" alt=""><span class="spine">'+esc(d.title)+'</span><span class="mob">'+esc(STAGES[d.stage-1])+' / '+esc(d.kind)+'</span></a>'; }).join('');
}
function setBox(k,quiet){ if(!quiet&&k!==focusBox) sfx.tick();
  if(!DEV[k])return; focusBox=k; var d=DEV[k];
  var bx=$$('#shelf .box'), fi=0; bx.forEach(function(b,i){ if(b.getAttribute('data-k')===k) fi=i; }); bx.forEach(function(b,i){ b.classList.toggle('on',i===fi); b.style.setProperty('--side',i<fi?-1:(i>fi?1:0)); b.style.setProperty('--far',Math.abs(i-fi)); });
  $('#devinfo').style.setProperty('--k',d.k);
  $('#dv-kind').textContent=d.kind+' / '+d.status; $('#dv-title').textContent=d.title; $('#dv-blurb').textContent=d.blurb||d.lead; $('#dv-open').setAttribute('href','#development/'+k); $('#dv-open').style.setProperty('--c',d.k);
  $$('#dv-meter i').forEach(function(el,i){ el.className=i+1<d.stage?'on':(i+1===d.stage?'now':''); });
  $$('#dv-lab span').forEach(function(el,i){ el.className=i+1===d.stage?'now':''; });
}
$('#shelf').addEventListener('pointermove',function(e){ var b=e.target.closest('.box'); if(b&&matchMedia('(hover:hover)').matches) setBox(b.getAttribute('data-k')); });
$('#shelf').addEventListener('focusin',function(e){ var b=e.target.closest('.box'); if(b) setBox(b.getAttribute('data-k')); });
$('#shelf').addEventListener('click',function(e){ var b=e.target.closest('.box'); if(b&&!b.classList.contains('on')&&!matchMedia('(max-width:1000px)').matches){ e.preventDefault(); setBox(b.getAttribute('data-k')); } });

/* ---------- the file ---------- */
var shots=[], shotAt=0;
function openFile(sec,k,instant){
  var d=(sec==='projects'?P:DEV)[k]; if(!d)return; var f=$('#file'), label=sec==='projects'?'Projects':'Development';
  var cover=d.cover||d.img; shots=d.shots||[];
  var h='<div class="shead"><div class="lug" style="background:'+esc(d.k)+'"></div><div class="ttl"><h2 class="cond" tabindex="-1">'+esc(d.title)+'</h2><span>'+label+' / '+esc(d.tagline)+'</span></div>'+(d.url?'<a class="pillbtn ghost" style="border-radius:var(--r1)" href="'+esc(d.url)+'" target="_blank" rel="noopener">Visit '+esc(d.urlLabel||'site')+'</a>':'')+'<a class="pillbtn" style="--c:'+esc(d.k)+'" href="#'+sec+'">Back</a></div>';
  h+='<div class="sbody scroll"><div class="f-top"><div class="f-cover">'+(cover?'<img src="'+esc(cover)+'" alt="'+esc(d.title)+'">':'<div class="nopic">No picture yet</div>')+'</div><div class="f-info"><p class="tag" data-in>'+esc(d.status)+' / '+esc(d.tagline)+'</p><h3 class="cond h-l" data-in>'+esc(d.title)+'</h3><p class="lead" data-in>'+esc(d.lead)+'</p><div class="f-facts" data-in>'+d.facts.map(function(x){ return '<div class="tile"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'; }).join('')+(d.stage?'<div class="tile"><span>Progress</span><b>'+d.stage+' of 4 / '+STAGES[d.stage-1]+'</b></div>':'')+'</div></div></div>';
  h+='<div class="f-cols" data-in><div><h4 class="bar-h">About</h4>'+d.about.map(function(p){ return '<p>'+esc(p)+'</p>'; }).join('')+'</div><div>'+(d.log.length?'<h4 class="bar-h">'+esc(d.logTitle||'Development')+'</h4><ol class="log">'+d.log.map(function(l){ return '<li'+(l[2]?' class="next"':'')+'><b>'+esc(l[0])+'</b>'+esc(l[1])+'</li>'; }).join('')+'</ol>':'')+'</div></div>';
  h+='<div data-in><h4 class="bar-h">Screenshots</h4>'+(shots.length?'<div class="shots">'+shots.map(function(x,i){ return '<button type="button" data-shot="'+i+'"><img src="'+esc(x[0])+'" alt="" loading="lazy"><span>'+esc(x[1])+'</span></button>'; }).join(''):'<p class="none">'+esc(d.none||'No captures yet.')+'</p>')+'</div></div></div>';
  f.innerHTML=h; f.style.setProperty('--k',d.k); $$('[data-in]',f).forEach(function(el,i){ el.style.setProperty('--i',i); });
  f.classList.add('on'); f.classList.remove('enter'); f.setAttribute('aria-hidden','false'); void f.offsetWidth; f.classList.add('in'); f.classList.add('enter');
  if(sec==='projects'&&P[k]){ cat=P[k].cat; }
  if(!instant){ sfx.file(); flip(sec,k,cover); }
  var t=$('h2',f); if(t) try{ t.focus({preventScroll:true}); }catch(e){}
}
function closeFile(instant){ var f=$('#file'); if(!f.classList.contains('on'))return; f.classList.remove('in'); f.setAttribute('aria-hidden','true'); var end=function(){ f.classList.remove('on'); f.innerHTML=''; }; if(instant||TIER==='static') end(); else setTimeout(function(){ if(!f.classList.contains('in')) end(); },T3); if(cur.sec==='projects') renderIndex(); }
$('#file').addEventListener('click',function(e){ var b=e.target.closest('[data-shot]'); if(b) openLight(parseInt(b.getAttribute('data-shot'),10)); });
function openLight(i){ if(!shots.length)return; shotAt=(i+shots.length)%shots.length; var L=$('#light'); $('#lt-img').src=shots[shotAt][0]; $('#lt-img').alt=shots[shotAt][1]; $('#lt-cap').textContent=(shotAt+1)+' / '+shots.length+'   '+shots[shotAt][1]; L.classList.add('on'); L.setAttribute('aria-hidden','false'); var multi=shots.length>1; $('#lt-prev').style.visibility=$('#lt-next').style.visibility=multi?'visible':'hidden'; }
function closeLight(){ var L=$('#light'); if(!L.classList.contains('on'))return false; L.classList.remove('on'); L.setAttribute('aria-hidden','true'); return true; }
$('#light').addEventListener('click',function(e){ if(e.target.id==='lt-prev'){ openLight(shotAt-1); } else if(e.target.id==='lt-next'){ openLight(shotAt+1); } else closeLight(); });

/* ---------- keys: Esc steps back one level, 1 to 4 open sections, arrows move the shelf and the lightbox ---------- */
addEventListener('keydown',function(e){
  if(CMD.open){ if(e.key==='Escape') cmdClose(); return; }
  if((e.key==='k'||e.key==='K')&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); cmdOpen(); return; }
  if(e.altKey||e.ctrlKey||e.metaKey||!booted)return;
  if(e.key==='/'){ e.preventDefault(); cmdOpen(); return; }
  var lightOn=$('#light').classList.contains('on');
  if(e.key==='Escape'){ if(closeLight())return; if(cur.key){ location.hash='#'+cur.sec; return; } if(cur.sec!=='home'){ location.hash='#home'; } return; }
  if(lightOn){ if(e.key==='ArrowLeft') openLight(shotAt-1); if(e.key==='ArrowRight') openLight(shotAt+1); return; }
  if(cur.key)return;
  var n={'1':'about','2':'projects','3':'development','4':'contact','0':'home'}[e.key]; if(n){ location.hash='#'+n; return; }
  if(cur.sec==='development'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){ var ks=Object.keys(DEV), i=ks.indexOf(focusBox), j=(i+(e.key==='ArrowRight'?1:-1)+ks.length)%ks.length; setBox(ks[j]); var el=$('#shelf .box[data-k="'+ks[j]+'"]'); if(el) el.focus({preventScroll:true}); e.preventDefault(); }
  if(cur.sec==='projects'&&(e.key==='ArrowUp'||e.key==='ArrowDown')){ var rs=keysIn(cat), a=rs.indexOf(activeRow), b2=(a+(e.key==='ArrowDown'?1:-1)+rs.length)%rs.length; var row=$('#index .row[data-k="'+rs[b2]+'"]'); if(row){ row.focus(); e.preventDefault(); } }
});
var cp=$('#copy'); cp.addEventListener('click',function(){ var v=cp.getAttribute('data-copy'); try{ navigator.clipboard.writeText(v).then(function(){ cp.textContent='Copied'; setTimeout(function(){ cp.textContent='Copy the address'; },1800); }); }catch(e){ location.href='mailto:'+v; } });

/* ---------- true readouts ---------- */
function clock(){ var d=new Date(), p=function(n){return (n<10?'0':'')+n;}; $('#clk').textContent=p(d.getHours())+':'+p(d.getMinutes()); $('#day').textContent=d.toLocaleDateString('en-US',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}); }
clock(); setInterval(clock,15000);

/* =====================================================================
   v1 MODULES
   ===================================================================== */
/* ---------- sound: synthesised, off until the visitor turns it on ---------- */
var SND={on:false,ctx:null,last:0}; try{ SND.on=localStorage.getItem('site-sound')==='1'; }catch(e){}
function actx(){ if(!SND.ctx){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null; try{ SND.ctx=new C(); }catch(e){ return null; } } if(SND.ctx.state==='suspended'){ try{ SND.ctx.resume(); }catch(e){} } return SND.ctx; }
function tone(f,d,type,vol,when,slide){ if(!SND.on) return; var c=actx(); if(!c||c.state!=='running') return; var t=c.currentTime+(when||0), o=c.createOscillator(), g=c.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+d); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol||.04,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+d+.03); }
var sfx={ open:function(){ tone(660,.09,'square',.03); tone(990,.15,'square',.03,.07); }, close:function(){ tone(740,.08,'square',.028); tone(440,.15,'square',.028,.06); }, tick:function(){ var n=performance.now(); if(n-SND.last<70) return; SND.last=n; tone(1500,.03,'sine',.018); }, file:function(){ tone(523,.12,'triangle',.045); tone(784,.22,'triangle',.045,.08); }, thump:function(){ tone(150,.28,'sine',.12,0,48); }, cmd:function(){ tone(880,.05,'square',.025); tone(1320,.08,'square',.025,.04); } };
var sndBtn=$('#snd'); function sndPaint(){ sndBtn.setAttribute('aria-pressed',String(SND.on)); sndBtn.textContent=SND.on?'Sound on':'Sound off'; } sndPaint();
sndBtn.addEventListener('click',function(){ SND.on=!SND.on; try{ localStorage.setItem('site-sound',SND.on?'1':'0'); }catch(e){} sndPaint(); if(SND.on){ actx(); setTimeout(sfx.open,60); } });

/* ---------- halftone: every preview arrives as LED dots and resolves into the photograph ---------- */
function hex3(h){ h=h.replace('#',''); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]; }
function Halftone(cv){
  if(TIER!=='full') return null; var gl=null; try{ gl=cv.getContext('webgl',{antialias:false,alpha:false}); }catch(e){} if(!gl) return null;
  var VS='attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,1.-(p.y*.5+.5));gl_Position=vec4(p,0.,1.);}';
  var FS='precision mediump float;varying vec2 v;uniform sampler2D T;uniform vec2 R;uniform vec4 C;uniform float P;uniform vec3 K;'+
    'void main(){vec2 uv=v*C.xy+C.zw;vec3 real=texture2D(T,uv).rgb;float e=P*P*(3.-2.*P);float pitch=mix(R.y/44.,R.y/240.,e);vec2 px=v*R;vec2 cc=(floor(px/pitch)+.5)*pitch;'+
    'vec3 c=texture2D(T,(cc/R)*C.xy+C.zw).rgb;float lum=dot(c,vec3(.299,.587,.114));float d=length(px-cc)/pitch;float rad=.16+.36*lum;float m=smoothstep(rad,rad-.09,d);'+
    'vec3 led=mix(K*(.4+lum*1.7),c*1.25,e)*m;gl_FragColor=vec4(mix(led,real,smoothstep(.5,1.,P)),1.);}';
  function sh(t,src){ var o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); return gl.getShaderParameter(o,gl.COMPILE_STATUS)?o:null; }
  var a=sh(gl.VERTEX_SHADER,VS), b=sh(gl.FRAGMENT_SHADER,FS); if(!a||!b) return null;
  var pr=gl.createProgram(); gl.attachShader(pr,a); gl.attachShader(pr,b); gl.linkProgram(pr); if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) return null; gl.useProgram(pr);
  var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW); var loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  var U={}; ['T','R','C','P','K'].forEach(function(n){ U[n]=gl.getUniformLocation(pr,n); });
  var tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  var st={img:null,want:null,t0:0,raf:0,P:1,K:[1,.7,.33]};
  function draw(){ if(!st.img) return; var r=cv.getBoundingClientRect(), d=Math.min(window.devicePixelRatio||1,1.5), w=Math.max(2,Math.round(r.width*d)), h=Math.max(2,Math.round(r.height*d)); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } gl.viewport(0,0,w,h);
    var ac=w/h, ai=st.img.naturalWidth/st.img.naturalHeight, sx=1, sy=1, ox=0; if(ai>ac){ sx=ac/ai; ox=(1-sx)/2; } else { sy=ai/ac; }
    gl.uniform1i(U.T,0); gl.uniform2f(U.R,w,h); gl.uniform4f(U.C,sx,sy,ox,0); gl.uniform1f(U.P,st.P); gl.uniform3f(U.K,st.K[0],st.K[1],st.K[2]); gl.drawArrays(gl.TRIANGLES,0,3); }
  function frame(now){ st.P=Math.min(1,(now-st.t0)/900); draw(); st.raf=st.P<1?requestAnimationFrame(frame):0; }
  cv.addEventListener('webglcontextlost',function(e){ e.preventDefault(); cv.classList.remove('on'); HT=null; });
  return { show:function(src,col){ st.want=src; var im=new Image(); im.onload=function(){ if(st.want!==src) return; st.img=im; try{ gl.bindTexture(gl.TEXTURE_2D,tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im); }catch(e){ cv.classList.remove('on'); return; } st.K=hex3(col); st.t0=performance.now(); cv.classList.add('on'); if(!st.raf) st.raf=requestAnimationFrame(frame); }; im.src=src; },
           clear:function(){ st.want=null; cv.classList.remove('on'); }, redraw:draw };
}
var HT=Halftone($('#st-gl'));
addEventListener('resize',function(){ if(HT) HT.redraw(); });

/* ---------- smarkd element: the picture travels into the file ---------- */
function flip(sec,k,cover){
  if(TIER==='static'||!cover||matchMedia('(max-width:1000px)').matches||!document.body.animate) return;
  var src=sec==='projects'?$('#stage .pic'):$('#shelf .box.on'); if(!src) return;
  if(sec==='projects'){ var d=P[k], shown=(d.shots&&d.shots[0]&&d.shots[0][0])||d.cover||d.img; if(shown!==cover||activeRow!==k) return; }
  if(sec==='development'&&focusBox!==k) return;
  var f=$('#file'), target=$('.f-cover',f); if(!target) return;
  var v=vp.getBoundingClientRect(), a=src.getBoundingClientRect(); if(a.width<8||a.height<8) return;
  f.classList.add('flip'); var b=target.getBoundingClientRect();
  var im=document.createElement('img'); im.className='flipimg'; im.alt=''; im.src=cover; im.style.objectPosition=sec==='projects'?'top center':'center bottom'; vp.appendChild(im);
  target.style.visibility='hidden';
  var an=im.animate([{left:(a.left-v.left)+'px',top:(a.top-v.top)+'px',width:a.width+'px',height:a.height+'px'},{left:(b.left-v.left)+'px',top:(b.top-v.top)+'px',width:b.width+'px',height:b.height+'px'}],{duration:T3,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
  var end=function(){ target.style.visibility=''; if(im.parentNode) im.parentNode.removeChild(im); f.classList.remove('flip'); }; an.onfinish=end; an.oncancel=end;
}

/* ---------- home: the works ticker, the shock wave ---------- */
(function(){ var items=Object.keys(P).map(function(k){ return [P[k].title,'#projects/'+k,P[k].k]; }).concat(Object.keys(DEV).map(function(k){ return [DEV[k].title,'#development/'+k,DEV[k].k]; }));
  var half=items.map(function(x){ return '<a href="'+x[1]+'" style="--k:'+esc(x[2])+'"><i></i>'+esc(x[0])+'</a>'; }).join('');
  $('#trk').innerHTML=half+half.replace(/<a /g,'<a tabindex="-1" aria-hidden="true" '); })();
vp.addEventListener('pointerdown',function(e){ if(cur.sec!=='home'||F.mode!=='mark'||!booted||!F.n||e.target.closest('.ticker')) return; var r=vp.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top; for(var i=0;i<F.n;i++){ var dx=X[i]-px, dy=Y[i]-py, d=Math.sqrt(dx*dx+dy*dy)+1, f=Math.min(42,3000/d); VX[i]+=dx/d*f; VY[i]+=dy/d*f; } sfx.thump(); start(); });
$('#shelf').addEventListener('pointermove',function(e){ var b=e.target.closest('.box.on'); if(!b||TIER!=='full') return; var r=b.getBoundingClientRect(); b.style.setProperty('--px',((e.clientX-r.left)/r.width-.5)*2); b.style.setProperty('--py',((e.clientY-r.top)/r.height-.5)*2); });

/* ---------- the command line: the prompt is real ---------- */
var CMD={el:$('#cmd'),inp:$('#cmd-in'),list:$('#cmd-list'),all:[],hits:[],sel:0,open:false,back:null};
(function(){ var catName={music:'Original music',video:'Video productions',web:'Website development'};
  [['home','Home'],['about','About'],['projects','Projects'],['development','Development'],['contact','Contact'],['privacy','Privacy policy'],['terms','Terms of service']].forEach(function(x){ CMD.all.push({t:x[1],h:'#'+x[0],kind:'Section',k:css(SECS[x[0]].tone),x:x[0]}); });
  Object.keys(P).forEach(function(k){ var d=P[k]; CMD.all.push({t:d.title,h:'#projects/'+k,kind:catName[d.cat],k:d.k,x:k+' '+(d.urlLabel||'')+' '+d.tagline}); });
  Object.keys(DEV).forEach(function(k){ var d=DEV[k]; CMD.all.push({t:d.title,h:'#development/'+k,kind:'In development / '+d.kind,k:d.k,x:k+' '+d.tagline}); }); })();
function cmdScore(q,it){ if(!q) return 1; var s=(it.t+' '+it.x+' '+it.kind).toLowerCase(), i=s.indexOf(q); if(i>-1) return 200-i-(it.t.toLowerCase().indexOf(q)===0?-100:0); var tt=it.t.toLowerCase(), qi=0; for(var j=0;j<tt.length&&qi<q.length;j++){ if(tt.charAt(j)===q.charAt(qi)) qi++; } return qi===q.length?10:0; }
function cmdRender(){ var q=CMD.inp.value.trim().toLowerCase(); CMD.hits=CMD.all.map(function(it){ return [cmdScore(q,it),it]; }).filter(function(x){ return x[0]>0; }).filter(function(x,i,arr){ return x[0]>10||!arr.some(function(y){ return y[0]>10; }); }).sort(function(a,b){ return b[0]-a[0]; }).slice(0,9).map(function(x){ return x[1]; });
  if(CMD.sel>=CMD.hits.length) CMD.sel=Math.max(0,CMD.hits.length-1);
  CMD.list.innerHTML=CMD.hits.length?CMD.hits.map(function(it,i){ return '<li role="option" id="cmd-o'+i+'" data-i="'+i+'" aria-selected="'+(i===CMD.sel)+'" style="--k:'+esc(it.k)+'"><i></i><b>'+esc(it.t)+'</b><span>'+esc(it.kind)+'</span></li>'; }).join(''):'<li style="--k:var(--idle)"><i></i><b>No match</b><span>Try a name or a domain</span></li>';
  CMD.inp.setAttribute('aria-activedescendant',CMD.hits.length?'cmd-o'+CMD.sel:''); var cur2=$('#cmd-o'+CMD.sel); if(cur2&&cur2.scrollIntoView) cur2.scrollIntoView({block:'nearest'}); }
function cmdOpen(){ if(CMD.open||!booted) return; CMD.open=true; CMD.back=document.activeElement; CMD.sel=0; CMD.inp.value=''; CMD.el.classList.add('on'); CMD.el.setAttribute('aria-hidden','false'); cmdRender(); sfx.cmd(); setTimeout(function(){ CMD.inp.focus(); },0); }
function cmdClose(){ if(!CMD.open) return; CMD.open=false; CMD.el.classList.remove('on'); CMD.el.setAttribute('aria-hidden','true'); if(CMD.back&&CMD.back.focus) try{ CMD.back.focus({preventScroll:true}); }catch(e){} }
function cmdGo(i){ var it=CMD.hits[i]; if(!it) return; cmdClose(); if(location.hash===it.h) return; location.hash=it.h; }
CMD.inp.addEventListener('input',function(){ CMD.sel=0; cmdRender(); });
CMD.inp.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ CMD.sel=Math.min(CMD.hits.length-1,CMD.sel+1); cmdRender(); e.preventDefault(); } else if(e.key==='ArrowUp'){ CMD.sel=Math.max(0,CMD.sel-1); cmdRender(); e.preventDefault(); } else if(e.key==='Enter'){ cmdGo(CMD.sel); e.preventDefault(); } else if(e.key==='Escape'){ cmdClose(); e.preventDefault(); } e.stopPropagation(); });
CMD.list.addEventListener('click',function(e){ var li=e.target.closest('li[data-i]'); if(li) cmdGo(parseInt(li.getAttribute('data-i'),10)); });
CMD.list.addEventListener('pointermove',function(e){ var li=e.target.closest('li[data-i]'); if(li){ var i=parseInt(li.getAttribute('data-i'),10); if(i!==CMD.sel){ CMD.sel=i; cmdRender(); } } });
CMD.el.addEventListener('pointerdown',function(e){ if(e.target===CMD.el) cmdClose(); });
$('#cmdbtn').addEventListener('click',cmdOpen);
addEventListener('hashchange',cmdClose);

/* ---------- the reticle: fine pointers only ---------- */
(function(){ if(TIER!=='full'||!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  var ret=$('#ret'), dot=$('#retdot'), lab=$('#retlab'), rx=0, ry=0, tx=0, ty=0, run=false, seen=false; document.body.classList.add('hascur');
  function loop(){ rx+=(tx-rx)*.24; ry+=(ty-ry)*.24; ret.style.transform='translate('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px)'; if(Math.abs(tx-rx)+Math.abs(ty-ry)>.3) requestAnimationFrame(loop); else run=false; }
  addEventListener('pointermove',function(e){ if(e.pointerType&&e.pointerType!=='mouse') return; tx=e.clientX; ty=e.clientY; if(!seen){ seen=true; rx=tx; ry=ty; } dot.style.transform='translate('+tx+'px,'+ty+'px)'; ret.style.opacity=dot.style.opacity='1';
    var t=e.target&&e.target.closest?e.target.closest('a,button,li[data-i]'):null; ret.classList.toggle('hot',!!t);
    var say=''; if(t) say=t.getAttribute('data-cur')||(t.hasAttribute('data-shot')?'Zoom':(t.getAttribute('target')==='_blank'?'Visit':(t.getAttribute('href')&&t.getAttribute('href').indexOf('mailto:')===0?'Email':'')));
    ret.classList.toggle('say',!!say); if(say) lab.textContent=say;
    if(!run){ run=true; requestAnimationFrame(loop); } });
  document.addEventListener('pointerleave',function(){ ret.style.opacity=dot.style.opacity='0'; });
  addEventListener('blur',function(){ ret.style.opacity=dot.style.opacity='0'; });
})();

/* ---------- depth: one pointer, two smoothed values, every screen ---------- */
(function(){ if(TIER!=='full'||!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  document.documentElement.classList.add('p3d'); var mx=0,my=0,tx=0,ty=0,run=false;
  function loop(){ mx+=(tx-mx)*.075; my+=(ty-my)*.075; F.mx=mx; F.my=my; vp.style.setProperty('--mx',mx.toFixed(4)); vp.style.setProperty('--my',my.toFixed(4)); if(TIER!=='full'){ vp.style.setProperty('--mx','0'); vp.style.setProperty('--my','0'); F.mx=F.my=0; document.documentElement.classList.remove('p3d'); run=false; return; } if(Math.abs(tx-mx)+Math.abs(ty-my)>.0015) requestAnimationFrame(loop); else run=false; }
  function kick(){ if(!run){ run=true; requestAnimationFrame(loop); } }
  vp.addEventListener('pointermove',function(e){ if(e.pointerType&&e.pointerType!=='mouse') return; var r=vp.getBoundingClientRect(); tx=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2)); ty=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2)); kick(); });
  vp.addEventListener('pointerleave',function(){ tx=ty=0; kick(); });
})();

/* ---------- init ---------- */
$('#n-sites').setAttribute('data-count',keysIn('web').length); $('#n-sites').textContent=keysIn('web').length;
$('#n-dev').setAttribute('data-count',Object.keys(DEV).length); $('#n-dev').textContent=Object.keys(DEV).length;
$('#wall').innerHTML=['assets/cards/harbor-lights.jpg','assets/cards/tidepool.jpg','assets/cards/the-lantern.jpg','assets/cards/atlas-cycles.jpg','assets/cards/saltwater.jpg','assets/cards/north-pier.jpg','assets/cards/paper-moons.jpg','assets/cards/foxglove.jpg','assets/cards/signal-fire.jpg'].map(function(u,i){ return '<i style="--i:'+i+';background-image:url('+u+')"></i>'; }).join('');
$$('.screen').forEach(function(s){ $$('[data-in]',s).forEach(function(el,i){ el.style.setProperty('--i',Math.min(i,12)); }); });
renderTabs(); renderShelf();
var hi=$('#markimg'), go=function(){ boot(); route(); };
var ready=function(){ (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go,go); };
if(hi.complete&&hi.naturalWidth) ready(); else { hi.addEventListener('load',ready,{once:true}); hi.addEventListener('error',function(){ TIER='static'; document.documentElement.classList.add('static'); go(); },{once:true}); }
})();
