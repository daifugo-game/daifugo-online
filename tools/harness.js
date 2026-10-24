// CPU対戦ヘッドレスハーネス: HTMLの<script>をvmで読み込み、実際のゲームロジックとAIをそのまま使う
const fs=require('fs'),vm=require('vm');
function load(htmlPath){
  const html=fs.readFileSync(htmlPath,'utf8');
  const m=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
  const src=m.replace(/\nrender\(\);\s*$/,'\n');
  const store={};
  const ctx={console,Math,JSON,Set,Map,Array,Object,Number,String,Date,
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    document:{getElementById:()=>null,addEventListener(){},createElement:()=>({}),body:{}},
    window:{addEventListener(){}},navigator:{},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},alert(){}};
  ctx.window.localStorage=ctx.localStorage;
  vm.createContext(ctx);
  vm.runInContext(src+'\n;this.__api={state,startGame,dealRound,aiChooseMove,cpuChooseJokerAssignment,applyPlay,passTurn,evaluateSelection,generateCandidates,generateJokerCombinedCandidates};',ctx);
  const api=ctx.__api;
  vm.runInContext('render=function(){};',ctx);
  return {ctx,api};
}
module.exports={load};
