const SUITS = ['♠','♥','♦','♣'];
function isRed(suit){ return suit==='♥'||suit==='♦'; }

/* ---------- tiny state ---------- */
const app = {
  screen: 'landing',       // 'landing' | 'lobby' | 'game'
  tab: 'create',           // 'create' | 'join'
  nameInput: '',
  roomCodeInput: '',
  error: '',
  me: null,                // {roomCode, playerId, token}
  server: null,            // last polled personalized state
  selected: new Set(),
  busy: false,
  pollTimer: null,
  pendingJokerChoices: null,   // [{label, assignment}] または null
  pendingJokerCardIds: null,   // 選択確定待ちのcardIds
  isChoosingJoker: false,
};

const params = new URLSearchParams(location.search);
if(params.get('room')){ app.roomCodeInput = params.get('room').toUpperCase(); app.tab='join'; }

/* ---------- API helpers ---------- */
async function apiPost(path, body){
  const r = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{})});
  return r.json();
}
async function apiGet(path){
  const r = await fetch(path);
  return r.json();
}
function actionUrl(){ return '/api/action'; }
async function apiJokerChoices(cardIds){
  if(!app.me) return [];
  const res = await apiPost('/api/jokerChoices', {roomCode:app.me.roomCode, playerId:app.me.playerId, token:app.me.token, cardIds});
  return (res && Array.isArray(res.choices)) ? res.choices : [];
}
async function sendAction(action){
  if(!app.me) return;
  app.busy = true; render();
  const res = await apiPost(actionUrl(), {roomCode:app.me.roomCode, playerId:app.me.playerId, token:app.me.token, action});
  app.busy = false;
  if(res && res.error){ app.error = describeError(res.error); }
  else { app.server = res; app.error=''; }
  render();
}
function describeError(code){
  const map = {
    not_your_turn:'あなたの番ではありません', invalid:'その組み合わせは出せません', forbidden_finish:'その組み合わせでは上がれません(禁止上がり)',
    cannot_pass:'パスできません', not_playable_now:'今は出せません', not_pending:'今は選べません', cannot_confirm:'選択枚数が違います',
    host_only:'ホストのみ操作できます', already_started:'すでに開始しています', need_more_players:'あと1人以上必要です',
    no_room:'ルームが見つかりません', bad_token:'接続情報が無効です', not_started:'まだ開始していません',
  };
  return map[code] || code;
}

/* ---------- polling ---------- */
async function poll(){
  if(!app.me) return;
  try{
    const st = await apiGet(`/api/state?roomCode=${app.me.roomCode}&playerId=${app.me.playerId}&token=${app.me.token}`);
    if(st.error){ app.error = describeError(st.error); }
    else {
      app.server = st;
      app.screen = st.phase === 'lobby' ? 'lobby' : 'game';
      clearPendingJokerChoiceIfInvalid(st);
    }
  }catch(e){ /* network hiccup, ignore and retry next tick */ }
  render();
}
function startPolling(){
  if(app.pollTimer) clearInterval(app.pollTimer);
  poll();
  app.pollTimer = setInterval(poll, 1200);
}

/* ---------- actions: room creation / joining ---------- */
async function createRoom(){
  app.error='';
  const res = await apiPost('/api/create', {name: app.nameInput.trim() || 'ホスト'});
  if(res.error){ app.error = res.error; render(); return; }
  app.me = {roomCode: res.roomCode, playerId: res.playerId, token: res.token};
  history.replaceState(null,'', '?room='+res.roomCode);
  startPolling();
}
async function joinRoom(){
  app.error='';
  const code = app.roomCodeInput.trim().toUpperCase();
  if(!code){ app.error='ルームコードを入力してください'; render(); return; }
  const res = await apiPost('/api/join', {roomCode: code, name: app.nameInput.trim() || undefined});
  if(res.error){ app.error = describeError(res.error) || res.error; render(); return; }
  app.me = {roomCode: res.roomCode, playerId: res.playerId, token: res.token};
  history.replaceState(null,'', '?room='+res.roomCode);
  startPolling();
}

/* ---------- DOM helpers ---------- */
function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') e.className=v;
    else if(k==='text') e.textContent=v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if(v!==null && v!==undefined) e.setAttribute(k, v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>{ if(c) e.appendChild(c); });
  return e;
}
function cardFace(card){
  const cls=['card']; if(isRed(card.suit)) cls.push('red'); if(card.rank==='JOKER') cls.push('joker');
  const c = el('div',{class:cls.join(' ')});
  const corner = el('div',{class:'corner'});
  if(card.rank==='JOKER'){ corner.appendChild(el('div',{class:'r',text:'JO'})); corner.appendChild(el('div',{class:'s',text:'★'})); }
  else { corner.appendChild(el('div',{class:'r',text:card.rank})); corner.appendChild(el('div',{class:'s',text:card.suit})); }
  c.appendChild(corner);
  c.appendChild(el('div',{class:'center-suit', text: card.rank==='JOKER'?'★':card.suit}));
  return c;
}
function cardEl(card, {selected=false, onClick=null}={}){
  const c = cardFace(card);
  if(selected) c.classList.add('selected');
  if(onClick) c.addEventListener('click', onClick);
  return c;
}
function buildFanRow(cards, optsFn){
  const row = el('div',{class:'hand-row-fan'});
  const n = cards.length;
  const cardWidth = 50;
  const targetWidth = Math.min(window.innerWidth - 40, 640);
  const MIN_W=32, VISIBLE_RATIO=0.46, GAP=6;
  let width=cardWidth, marginLeft=GAP;
  if(n>1){
    const naturalTotal = n*cardWidth + (n-1)*GAP;
    if(naturalTotal>targetWidth){
      const maxOverlap = cardWidth - cardWidth*VISIBLE_RATIO;
      const neededOverlap = (cardWidth*n - targetWidth)/(n-1);
      if(neededOverlap<=maxOverlap){ width=cardWidth; marginLeft=-neededOverlap; }
      else { width=Math.max(MIN_W, targetWidth/(1+(n-1)*VISIBLE_RATIO)); marginLeft=-(width-width*VISIBLE_RATIO); }
    }
  }
  cards.forEach((card,i)=>{
    const c = cardEl(card, optsFn(card));
    c.style.width = width+'px'; c.style.height = Math.round(width*1.42)+'px';
    if(i>0) c.style.marginLeft = marginLeft+'px';
    c.style.zIndex = String(i);
    row.appendChild(c);
  });
  return row;
}
function seededRand(seed){ const x=Math.sin(seed*12.9898)*43758.5453; return x-Math.floor(x); }
function pileCluster(entry, idx, activeIdx){
  const seed=idx*17+3;
  const baseX=(seededRand(seed)-0.5)*150;
  const baseY=(seededRand(seed+1)-0.5)*70;
  const baseRot=(seededRand(seed+2)-0.5)*22;
  const isActive=idx===activeIdx;
  const wrap=el('div',{class:'pile-cluster'+(isActive?' active':'')});
  wrap.style.left=`calc(50% + ${baseX}px)`;
  wrap.style.top=`calc(50% + ${baseY}px)`;
  wrap.style.transform=`translate(-50%,-50%) rotate(${baseRot}deg)`;
  wrap.style.zIndex=idx+1;
  let tagText = entry.name;
  if(entry.jokerAssignment && entry.jokerAssignment.length>0){
    tagText += ' ('+entry.jokerAssignment.map(a => a.rank==='JOKER' ? 'JOKER' : `JOKER→${(a.suit||'')}${a.rank}`).join('・')+')';
  }
  wrap.appendChild(el('div',{class:'pile-tag',text:tagText}));
  const cardsWrap=el('div',{class:'pile-cards'});
  entry.cards.forEach(card=>{
    const c=el('div',{class:'pile-card'+(isRed(card.suit)?' red':'')+(card.rank==='JOKER'?' joker':'')});
    if(card.rank==='JOKER'){ c.appendChild(el('div',{class:'rj',text:'JOKER'})); c.appendChild(el('div',{class:'s',text:'★'})); }
    else { c.appendChild(el('div',{class:'r',text:card.rank})); c.appendChild(el('div',{class:'s',text:card.suit})); }
    cardsWrap.appendChild(c);
  });
  wrap.appendChild(cardsWrap);
  return wrap;
}
function describePlayLike(entry){
  const base = entry.type==='straight' ? `${entry.suitsUsed[0]}${entry.straightRanks.join('-')}の階段` :
    (entry.rank==='JOKER' ? 'JOKER' : entry.rank) + (entry.count===1 ? '' : `×${entry.count}`);
  if(entry.jokerAssignment && entry.jokerAssignment.length>0){
    const jokerLabel = entry.jokerAssignment.map(a => a.rank==='JOKER' ? 'JOKER' : `JOKER→${(a.suit||'')}${a.rank}`).join('・');
    return `${base}(${jokerLabel})`;
  }
  return base;
}
function miniHandFan(count){
  const wrap=el('div',{class:'mini-fan'});
  const shown=Math.min(count,7);
  for(let i=0;i<shown;i++){
    const b=el('div',{class:'mini-back'});
    b.style.left=(i*8)+'px'; b.style.zIndex=i;
    wrap.appendChild(b);
  }
  wrap.appendChild(el('div',{class:'mini-count-badge',text:count+'枚'}));
  return wrap;
}
function rankLabels(n){
  if(n<=1) return ['大富豪'];
  if(n===2) return ['大富豪','大貧民'];
  if(n===3) return ['大富豪','平民','大貧民'];
  const labels=['大富豪','富豪'];
  for(let i=0;i<n-4;i++) labels.push('平民');
  labels.push('貧民','大貧民');
  return labels;
}
function seatSlotForIndex(idx,n){
  if(n<=4) return ['tl','tr','br','bl'][idx];
  return ['tl','tc','tr','bl','br'][idx];
}

/* ---------- render: landing ---------- */
function renderLanding(root){
  const wrap = el('div',{class:'landing-wrap'});
  const card = el('div',{class:'landing-card'});
  const brand = el('div',{class:'brand'});
  brand.appendChild(el('div',{class:'kanji',text:'大富豪'}));
  brand.appendChild(el('span',{class:'en',text:'Online'}));
  brand.appendChild(el('div',{class:'suits',text:'♠ ♥ ♦ ♣'}));
  card.appendChild(brand);

  const tabs = el('div',{class:'tab-row'});
  tabs.appendChild(el('button',{class:'tab-btn'+(app.tab==='create'?' active':''), text:'ルームを作る', onclick:()=>{app.tab='create'; render();}}));
  tabs.appendChild(el('button',{class:'tab-btn'+(app.tab==='join'?' active':''), text:'ルームに参加', onclick:()=>{app.tab='join'; render();}}));
  card.appendChild(tabs);

  const nameInput = el('input',{class:'field-input', type:'text', placeholder:'あなたの名前', value:app.nameInput});
  nameInput.addEventListener('input', e=>{ app.nameInput = e.target.value; });
  card.appendChild(nameInput);

  if(app.tab==='join'){
    const codeInput = el('input',{class:'field-input', type:'text', placeholder:'ルームコード(例: AB3XZ)', value:app.roomCodeInput});
    codeInput.addEventListener('input', e=>{ app.roomCodeInput = e.target.value.toUpperCase(); });
    card.appendChild(codeInput);
    card.appendChild(el('button',{class:'start-btn', text:'参加する', onclick:joinRoom}));
  } else {
    card.appendChild(el('div',{class:'setup-label', text:'作成すると、あなたがホスト(進行役)になります。'}));
    card.appendChild(el('button',{class:'start-btn', text:'ルームを作成', onclick:createRoom}));
  }
  if(app.error) card.appendChild(el('div',{class:'error-msg', text:app.error}));
  wrap.appendChild(card); root.appendChild(wrap);
}

/* ---------- render: lobby ---------- */
function renderLobby(root){
  const wrap = el('div',{class:'landing-wrap'});
  const card = el('div',{class:'landing-card'});
  card.appendChild(el('div',{class:'brand'},[el('div',{class:'kanji',text:'大富豪'}),el('span',{class:'en',text:'ロビー'})]));

  const box = el('div',{class:'room-code-box'});
  box.appendChild(el('div',{class:'code', text: app.me.roomCode}));
  const link = location.origin + location.pathname + '?room=' + app.me.roomCode;
  box.appendChild(el('div',{class:'link', text: link}));
  box.appendChild(el('button',{class:'copy-btn', text:'リンクをコピー', onclick: async ()=>{
    try{ await navigator.clipboard.writeText(link); }catch(e){}
  }}));
  card.appendChild(box);

  const list = el('div',{class:'lobby-list'});
  (app.server ? app.server.lobbyPlayers : []).forEach((p,i)=>{
    const row = el('div',{class:'lobby-row'});
    row.appendChild(el('div',{class:'lname', text:p.name}));
    if(i===0) row.appendChild(el('div',{class:'lhost', text:'ホスト'}));
    row.appendChild(el('div',{class:'conn-badge '+(p.connected?'online':'offline'), text:p.connected?'接続中':'切断'}));
    list.appendChild(row);
  });
  card.appendChild(list);

  const n = app.server ? app.server.lobbyPlayers.length : 1;
  if(app.server && app.server.isHost){
    card.appendChild(el('button',{class:'start-btn', text: n<2 ? 'あと1人以上必要です' : `ゲームを始める(${n}人)`,
      disabled: n<2?'disabled':null, onclick: ()=>sendAction({type:'start'})}));
  } else {
    card.appendChild(el('div',{class:'waiting-msg', text:'ホストが開始するのを待っています…'}));
  }
  if(app.error) card.appendChild(el('div',{class:'error-msg', text:app.error}));
  wrap.appendChild(card); root.appendChild(wrap);
}

/* ---------- render: game ---------- */
function renderGame(root){
  const st = app.server;
  if(!st){ root.appendChild(el('div',{class:'landing-wrap'},[el('div',{class:'waiting-msg',text:'読み込み中…'})])); return; }
  const n = st.players.length;
  const myId = app.me.playerId;

  if(st.gamePhase === 'result'){ renderResult(root, st); return; }

  const topbar = el('div',{class:'topbar'});
  topbar.appendChild(el('div',{class:'title', text:`大富豪 - ラウンド${st.roundNumber} (ルーム ${st.roomCode})`}));
  const badges = el('div',{class:'badge-row'});
  if(st.revolutionCount>0) badges.appendChild(el('div',{class:'badge gold', text:`革命×${st.revolutionCount}(pt${Math.pow(2,st.revolutionCount)}倍)`}));
  if(st.tempReversed) badges.appendChild(el('div',{class:'badge on', text:'一時反転中'}));
  if(st.lockSeq) badges.appendChild(el('div',{class:'badge on', text:`激縛り:${st.lockSeq.suits.join('')}${st.lockSeq.rank}かJOKER`}));
  else if(st.lockSuits) badges.appendChild(el('div',{class:'badge on', text:`縛り:${st.lockSuits.join('')}のみ`}));
  topbar.appendChild(badges);
  root.appendChild(topbar);

  const arena = el('div',{class:'arena'});
  st.players.forEach((p,i)=>{
    if(i===myId) return;
    const pos = seatSlotForIndex(i,n);
    const cls = ['seat',pos]; if(p.finished) cls.push('done'); if(i===st.currentIndex && !p.finished) cls.push('current');
    const seat = el('div',{class:cls.join(' ')});
    seat.appendChild(el('div',{class:'face', text:p.name.slice(0,1)}));
    seat.appendChild(el('div',{class:'sname', text:p.name}));
    if(p.finished){
      const pos2 = st.finishOrder.indexOf(i);
      seat.appendChild(el('div',{class:'srank', text: rankLabels(n)[pos2] || '完了'}));
    } else {
      seat.appendChild(miniHandFan(p.handCount));
    }
    seat.appendChild(el('div',{class:'sscore', text:p.score+'pt'}));
    arena.appendChild(seat);
  });

  const fieldZone = el('div',{class:'field-zone'});
  if(st.lockSeq) fieldZone.appendChild(el('div',{class:'lock-banner', text:`🔒 激縛り中:次は ${st.lockSeq.suits.join('')}${st.lockSeq.rank}${st.lockSeq.count>1?`(${st.lockSeq.count}枚組)`:''} か JOKER しか出せません`}));
  else if(st.lockSuits) fieldZone.appendChild(el('div',{class:'lock-banner', text:`🔒 縛り中:次は ${st.lockSuits.join('/')} のカードしか出せません`}));

  if(st.field===null){
    fieldZone.appendChild(el('div',{class:'field-empty', text:'場は空です — 好きな組み合わせで出せます'}));
  } else {
    const fc = el('div',{class:'field-cards'});
    const playEntries = (st.trickHistory||[]).filter(h=>h.kind==='play');
    const visible = playEntries.slice(-8);
    const activeIdx = visible.length-1;
    visible.forEach((entry,i)=>fc.appendChild(pileCluster(entry,i,activeIdx)));
    fieldZone.appendChild(fc);
    if(st.trickHistory && st.trickHistory.length){
      const logRow = el('div',{class:'trick-log'});
      st.trickHistory.forEach(h=>{
        const label = h.kind==='pass' ? `${h.name}: パス` : `${h.name}: ${describePlayLike(h)}`;
        logRow.appendChild(el('div',{class:'trick-chip'+(h.kind==='pass'?' pass':''), text:label}));
      });
      fieldZone.appendChild(logRow);
    }
  }
  fieldZone.appendChild(el('div',{class:'log-line', text: st.log || ''}));
  arena.appendChild(fieldZone);
  root.appendChild(arena);

  const panel = el('div',{class:'hand-panel'});
  const me = st.players[myId];

  if(st.gamePhase==='give' || st.gamePhase==='discard'){
    if(st.pendingActor===myId){
      const label = st.gamePhase==='give' ? '次のプレイヤーに渡すカードを選択' : '捨てるカードを選択';
      panel.appendChild(el('div',{class:'hint-line', text:`${label}(${app.selected.size}/${st.pendingCount}枚)`}));
      const hrow = buildFanRow(me.hand||[], card=>({selected:app.selected.has(card.id), onClick:()=>{ toggleSelect(card.id); }}));
      panel.appendChild(hrow);
      const ar = el('div',{class:'action-row'});
      ar.appendChild(el('button',{class:'btn play', text:'決定', disabled: (app.selected.size===st.pendingCount && !app.busy)?null:'disabled',
        onclick: ()=>{ sendAction({type:'giveDiscard', cardIds:[...app.selected]}); app.selected=new Set(); }}));
      panel.appendChild(ar);
    } else {
      panel.appendChild(el('div',{class:'hand-head'},[el('div',{class:'htitle',text:`${me.name}の手札(${me.handCount}枚)`}),el('div',{class:'hscore',text:me.score+'pt'})]));
      if(me.hand) panel.appendChild(buildFanRow(me.hand, ()=>({})));
      panel.appendChild(el('div',{class:'hint-line', text:`${st.players[st.pendingActor].name} がカードを選んでいます…`}));
    }
  } else {
    const head = el('div',{class:'hand-head'});
    const isMyTurn = st.currentIndex===myId;
    head.appendChild(el('div',{class:'htitle', text: `${me.name}の手札(${me.handCount}枚)` + (isMyTurn?' — あなたの番です':'')}));
    head.appendChild(el('div',{class:'hscore', text: me.score+'pt'}));
    panel.appendChild(head);
    const hrow = buildFanRow(me.hand||[], card=>({selected:app.selected.has(card.id), onClick: isMyTurn ? ()=>toggleSelect(card.id) : null}));
    panel.appendChild(hrow);

    if(isMyTurn){
      let hint='';
      if(app.selected.size>0) hint = '選択中: '+app.selected.size+'枚 (「出す」を押すと判定します)';
      panel.appendChild(el('div',{class:'hint-line', text:hint}));
      const ar = el('div',{class:'action-row'});
      ar.appendChild(el('button',{class:'btn play', text:'出す', disabled:(app.selected.size===0||app.busy)?'disabled':null,
        onclick: ()=>{ handlePlayClick([...app.selected]); }}));
      ar.appendChild(el('button',{class:'btn pass', text:'パス', disabled:(st.field===null||app.busy)?'disabled':null,
        onclick: ()=>sendAction({type:'pass'})}));
      ar.appendChild(el('button',{class:'btn clear', text:'選択解除', onclick:()=>{ app.selected=new Set(); render(); }}));
      panel.appendChild(ar);
    } else {
      panel.appendChild(el('div',{class:'hint-line', text:`${st.players[st.currentIndex].name} の番です…`}));
    }
  }
  if(app.error) panel.appendChild(el('div',{class:'error-msg', text:app.error}));
  root.appendChild(panel);
}
function toggleSelect(id){ if(app.selected.has(id)) app.selected.delete(id); else app.selected.add(id); render(); }

async function handlePlayClick(ids){
  const st = app.server;
  const me = st.players[app.me.playerId];
  const hasJoker = (me.hand||[]).some(c => ids.includes(c.id) && c.rank==='JOKER');
  app.selected = new Set();
  if(!hasJoker){
    sendAction({type:'play', cardIds:ids});
    return;
  }
  app.busy = true; render();
  const choices = await apiJokerChoices(ids);
  app.busy = false;
  if(choices.length >= 2){
    app.pendingJokerChoices = choices;
    app.pendingJokerCardIds = ids;
    app.isChoosingJoker = true;
    render();
  } else {
    // 候補0/1件: UIを出さずengine側の自動選択に任せる
    sendAction({type:'play', cardIds:ids});
  }
}
function confirmJokerChoice(choice){
  const ids = app.pendingJokerCardIds;
  app.pendingJokerChoices = null; app.pendingJokerCardIds = null; app.isChoosingJoker = false;
  sendAction({type:'play', cardIds:ids, jokerAssignment:choice.assignment});
}
function cancelJokerChoice(){
  app.pendingJokerChoices = null; app.pendingJokerCardIds = null; app.isChoosingJoker = false;
  render();
}
function clearPendingJokerChoiceIfInvalid(st){
  if(!app.isChoosingJoker) return;
  const myId = app.me ? app.me.playerId : null;
  let invalid = false;
  if(!st || myId===null) invalid = true;
  else if(st.gamePhase !== 'playing') invalid = true;
  else if(st.currentIndex !== myId) invalid = true;
  else {
    const me = st.players[myId];
    const hand = (me && me.hand) || [];
    if(!app.pendingJokerCardIds || !app.pendingJokerCardIds.every(id => hand.some(c=>c.id===id))) invalid = true;
  }
  if(invalid){ app.pendingJokerChoices = null; app.pendingJokerCardIds = null; app.isChoosingJoker = false; }
}
function renderJokerChoiceModal(root){
  const overlay = el('div',{class:'joker-modal-overlay'});
  const modal = el('div',{class:'joker-modal'});
  modal.appendChild(el('h3',{class:'joker-modal-title', text:'JOKERを何として使いますか?'}));
  const list = el('div',{class:'joker-choice-list'});
  app.pendingJokerChoices.forEach(choice=>{
    list.appendChild(el('button',{class:'joker-choice-btn', text:choice.label, onclick:()=>confirmJokerChoice(choice)}));
  });
  modal.appendChild(list);
  modal.appendChild(el('button',{class:'btn pass joker-cancel-btn', text:'キャンセル(選び直す)', onclick:cancelJokerChoice}));
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

function renderResult(root, st){
  const wrap = el('div',{class:'result-wrap'});
  const card = el('div',{class:'result-card'});
  card.appendChild(el('h2',{text:`ラウンド${st.roundNumber} 結果`}));
  card.appendChild(el('div',{class:'result-sub', text:`やり取りポイント: ${st.lastRoundPoints}pt`}));
  if(st.foulPenalty){
    card.appendChild(el('div',{class:'result-sub', text:`⚠️ ${st.foulPenalty.name} が${st.foulPenalty.reason}を果たせず反則負け(追加で-${st.foulPenalty.amount}pt)`, style:'color:#e08a8a;'}));
  }
  const list = el('div',{class:'rank-list'});
  const labels = rankLabels(st.players.length);
  st.finishOrder.forEach((idx,pos)=>{
    const p = st.players[idx];
    const row = el('div',{class:'rank-row'});
    row.appendChild(el('div',{class:'num', text:(pos+1)+'.'}));
    row.appendChild(el('div',{class:'rname', text:p.name}));
    row.appendChild(el('div',{class:'rtitle', text:labels[pos]}));
    let pt=0;
    if(pos===0) pt=st.lastRoundPoints;
    else if(pos===st.finishOrder.length-1){ pt=-st.lastRoundPoints; if(st.foulPenalty && st.foulPenalty.name===p.name) pt-=st.foulPenalty.amount; }
    const ptEl = el('div',{class:'rpt '+(pt>0?'pos':pt<0?'neg':'')}); ptEl.textContent=(pt>0?'+':'')+pt;
    row.appendChild(ptEl);
    row.appendChild(el('div',{class:'rtotal', text:'累計'+p.score+'pt'}));
    list.appendChild(row);
  });
  card.appendChild(list);
  if(app.server.isHost){
    card.appendChild(el('div',{class:'result-sub', text:'次のラウンドに進みますか?', style:'margin-top:18px;margin-bottom:0;'}));
    const btns = el('div',{class:'result-btns'});
    btns.appendChild(el('button',{class:'btn play', text:'はい、次のラウンドへ', onclick:()=>sendAction({type:'nextRound'})}));
    btns.appendChild(el('button',{class:'btn pass', text:'ロビーに戻る', onclick:()=>sendAction({type:'backToLobby'})}));
    card.appendChild(btns);
  } else {
    card.appendChild(el('div',{class:'waiting-msg', text:'ホストが次のラウンドを開始するのを待っています…'}));
  }
  wrap.appendChild(card); root.appendChild(wrap);
}

/* ---------- root render ---------- */
function render(){
  const root = document.getElementById('app');
  root.innerHTML = '';
  if(app.screen==='landing') renderLanding(root);
  else if(app.screen==='lobby') renderLobby(root);
  else renderGame(root);
  if(app.isChoosingJoker && app.pendingJokerChoices) renderJokerChoiceModal(root);
}
render();
