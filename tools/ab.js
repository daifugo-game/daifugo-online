// A/B: 旧AI(base)と新AIを同じ卓で戦わせる。ゲーム本体はctxAで進め、旧AIの判断時だけ状態をctxBへ同期する。
const {load}=require('./harness');
const [,, pathNew, pathOld, Nstr]=process.argv; const N=+Nstr||600;
const A=load(pathNew), B=load(pathOld);
function clone(st){
  const o={};
  for(const k of Object.keys(st)){ if(k==='lang'||k==='learnedStats') continue; const v=st[k];
    o[k]= v instanceof Set ? {__set:[...v]} : JSON.parse(JSON.stringify(v===undefined?null:v)); }
  return o;
}
function sync(from,to){ const c=clone(from.api.state); for(const k of Object.keys(c)){ const v=c[k]; to.api.state[k]= (v&&v.__set)? new Set(v.__set): v; } }
const sA=A.api.state;
function play(seats){ // seats: 'new'|'old'
  sA.mode='cpu';sA.playerCount=seats.length;A.api.startGame();sA.players.forEach(p=>p.isCPU=true);
  let n=0;
  while(sA.screen!=='result'&&n++<3000){
    const i=sA.currentIndex; let mv,ja;
    if(seats[i]==='new'){ mv=A.api.aiChooseMove(i); if(mv) ja=A.api.cpuChooseJokerAssignment(i,mv.map(c=>c.id)); }
    else { sync(A,B); mv=B.api.aiChooseMove(i); if(mv) ja=B.api.cpuChooseJokerAssignment(i,mv.map(c=>c.id)); }
    if(mv) A.api.applyPlay(i,mv.map(c=>c.id),ja); else A.api.passTurn();
  }
  return n>=3000?null:{order:sA.finishOrder.slice(),fouls:sA.foulOrder.slice()};
}
const st={new:{g:0,r:0,w:0,f:0},old:{g:0,r:0,w:0,f:0}};let stuck=0;
const pattern=['new','old','new','old'];
for(let g=0;g<N;g++){
  const rot=g%4; const seats=pattern.map((_,k)=>pattern[(k+rot)%4]);
  const r=play(seats); if(!r){stuck++;continue;}
  r.order.forEach((p,pos)=>{const t=st[seats[p]];t.g++;t.r+=pos+1;if(pos===0)t.w++;});
  r.fouls.forEach(p=>st[seats[p]].f++);
}
for(const k of ['new','old']){const t=st[k];console.log(`${k}: avgRank=${(t.r/t.g).toFixed(3)} win=${(100*t.w/t.g).toFixed(1)}% foul/player=${(100*t.f/t.g).toFixed(1)}%`);}
console.log('stuck',stuck,'games',N);
