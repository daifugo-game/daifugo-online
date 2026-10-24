const {load}=require('./harness');
const path=process.argv[2]||'/home/claude/daifugo-online/daifugo-cpu.html';
const N=+process.argv[3]||400;
const {api}=load(path);
const s=api.state;
function legalMoves(i){
  const raw=[...api.generateCandidates(s.players[i].hand),...api.generateJokerCombinedCandidates(s.players[i].hand)];
  return raw.filter(arr=>api.evaluateSelection(i,arr.map(c=>c.id)).ok);
}
const bots={
  ai:(i)=>api.aiChooseMove(i),
  random:(i)=>{const m=legalMoves(i); if(!m.length) return null; if(s.field&&Math.random()<0.25) return null; return m[Math.floor(Math.random()*m.length)];},
  lowest:(i)=>{ // 素直: 一番弱い合法手を出す(場が空なら最弱を出す)
    const m=legalMoves(i); if(!m.length) return null;
    m.sort((a,b)=>{const va=api.evaluateSelection(i,a.map(c=>c.id)),vb=api.evaluateSelection(i,b.map(c=>c.id));
      const sa=(a.some(c=>c.rank==='JOKER')?999:0)+(a.length>1?0:0); const sb=(b.some(c=>c.rank==='JOKER')?999:0);
      return (sa-sb)|| (rankIdx(va)-rankIdx(vb)) || (b.length-a.length);});
    return m[0];}
};
function rankIdx(v){return v.rank==='JOKER'?999:['3','4','5','6','7','8','9','10','J','Q','K','A','2'].indexOf(v.rank)*(s.revolutionCount%2?-1:1);}
function playGame(seatBots){
  s.mode='cpu';s.playerCount=seatBots.length;api.startGame();s.players.forEach(p=>p.isCPU=true);
  let n=0;
  while(s.screen!=='result'&&n++<3000){
    const i=s.currentIndex;
    const mv=bots[seatBots[i]](i);
    if(mv){const ids=mv.map(c=>c.id);api.applyPlay(i,ids,api.cpuChooseJokerAssignment(i,ids));}
    else api.passTurn();
  }
  if(n>=3000) return null;
  return {order:s.finishOrder.slice(),fouls:s.foulOrder.slice(),pts:s.players.map(p=>p.score)};
}
function matchup(label,seatBots){
  const stats=seatBots.map(()=>({games:0,rankSum:0,wins:0,fouls:0,pts:0}));
  let stuck=0;
  for(let g=0;g<N;g++){
    // 席を回してシート有利不利を打ち消す
    const rot=g%seatBots.length; const seats=seatBots.map((_,k)=>seatBots[(k+rot)%seatBots.length]);
    const r=playGame(seats); if(!r){stuck++;continue;}
    r.order.forEach((p,pos)=>{ const k=(p-0); const st=stats[(p+rot)%seatBots.length]; st.games++; st.rankSum+=pos+1; if(pos===0)st.wins++; });
    r.fouls.forEach(p=>stats[(p+rot)%seatBots.length].fouls++);
    r.pts.forEach((v,p)=>stats[(p+rot)%seatBots.length].pts+=v);
  }
  console.log('\n== '+label+' ('+N+' games, stuck '+stuck+') ==');
  stats.forEach((st,k)=>console.log(`  ${seatBots[k].padEnd(7)} avgRank=${(st.rankSum/st.games).toFixed(2)} win=${(100*st.wins/st.games).toFixed(1)}% foul=${(100*st.fouls/st.games).toFixed(1)}%`));
}
matchup('ai x1 vs random x3',['ai','random','random','random']);
matchup('ai x1 vs lowest x3',['ai','lowest','lowest','lowest']);
matchup('ai x4 (mirror)',['ai','ai','ai','ai']);
