const SUITS = ['♠','♥','♦','♣'];
function isRed(suit){ return suit==='♥'||suit==='♦'; }

/* ---------- i18n ---------- */
const I18N = {
  ja: {
    brandKanji:'大富豪', brandEn:'ONLINE',
    tabCreate:'ルームを作る', tabJoin:'ルームに参加',
    namePlaceholder:'あなたの名前', codePlaceholder:'ルームコード(例: AB3XZ)',
    joinBtn:'参加する', hostNote:'作成すると、あなたがホスト(進行役)になります。', createBtn:'ルームを作成',
    overview:'【大富豪オンライン対戦】\n\n友達とリアルタイムで遊べる、大富豪のオンライン対戦ゲームです。\n\n順番にカードを出して、ほかのプレイヤーより早く手札をなくすことを目指します。\n\n通常の大富豪に加えて、革命・縛り・激縛り・8切り・7渡し・10捨て・Jバック・5飛び・6ロック・スペ3返し・JOKER選択などの特殊ルールがあります。\n\n詳しいルールは「詳しいルールを見る」から確認できます。',
    viewRules:'詳しいルールを見る', closeRules:'閉じる',
    enterRoomCode:'ルームコードを入力してください', defaultHostName:'ホスト',
    lobbyTitle:'ロビー', copyLink:'リンクをコピー', host:'ホスト', online:'接続中', offline:'切断', leaveRoom:'ルームを退出', confirmLeave:'ルームを退出しますか?途中経過は失われます。',
    needMorePlayers:'あと1人以上必要です', startGame:n=>`ゲームを始める(${n}人)`, waitingHost:'ホストが開始するのを待っています…',
    loading:'読み込み中…',
    roundTitle:(n,room)=>`大富豪 - ラウンド${n} (ルーム ${room})`,
    revolutionBadge:(n,mult)=>`革命×${n}(pt${mult}倍)`, tempReversedBadge:'一時反転中',
    gekiBadge:(suits,rank)=>`激縛り:${suits}${rank}かJOKER`, lockBadge:suits=>`縛り:${suits}のみ`,
    fieldEmpty:'場は空です — 好きな組み合わせで出せます',
    gekiBanner:(suits,rank,count)=>`🔒 激縛り中:次は ${suits}${rank}${count>1?`(${count}枚組)`:''} か JOKER しか出せません`,
    lockBanner:suits=>`🔒 縛り中:次は ${suits} のカードしか出せません`,
    giveLabel:'次のプレイヤーに渡すカードを選択', discardLabel:'捨てるカードを選択',
    selCount:(a,b)=>`(${a}/${b}枚)`, confirm:'決定',
    handTitle:(name,n)=>`${name}の手札(${n}枚)`, yourTurn:' — あなたの番です',
    theirTurnChoosing:name=>`${name} がカードを選んでいます…`, theirTurn:name=>`${name} の番です…`,
    selectedHint:n=>`選択中: ${n}枚 (「出す」を押すと判定します)`,
    play:'出す', pass:'パス', clearSel:'選択解除',
    jokerModalTitle:'JOKERを何として使いますか?', jokerCancel:'キャンセル(選び直す)', jokerAs:(...s)=>`JOKER→${s.join('・')}`,
    straightSuffix:'の階段', passChip:name=>`${name}: パス`,
    resultTitle:n=>`ラウンド${n} 結果`, pointsExchanged:pt=>`やり取りポイント: ${pt}pt`,
    pointsExchangedFoul:pt=>`反則Ptの合計 ${pt}pt が大富豪へ加算されました`,
    foulLine:(name,reason,amount,rate)=>`⚠️ ${name} が${reason}で反則(-${amount}pt, レート${rate}倍)`,
    rankLabels:{daifugo:'大富豪', fugo:'富豪', heimin:'平民', hinmin:'貧民', daihinmin:'大貧民'},
    totalPt:n=>`累計${n}pt`, nextRoundQ:'次のラウンドに進みますか?',
    yesNextRound:'はい、次のラウンドへ', backToLobby:'ロビーに戻る', waitingNextRound:'ホストが次のラウンドを開始するのを待っています…',
    errors:{
      not_your_turn:'あなたの番ではありません', invalid:'その組み合わせは出せません', forbidden_finish:'その組み合わせでは上がれません(禁止上がり)',
      cannot_pass:'パスできません', not_playable_now:'今は出せません', not_pending:'今は選べません', cannot_confirm:'選択枚数が違います',
      host_only:'ホストのみ操作できます', already_started:'すでに開始しています', need_more_players:'あと1人以上必要です',
      no_room:'ルームが見つかりません', bad_token:'接続情報が無効です', not_started:'まだ開始していません',
    },
    rules:{
      sec1title:'1. 基本ルール', sec2title:'2. カードの強さ', sec3title:'3. 特殊ルール', sec4title:'4. JOKER', sec5title:'5. 反則上がり', sec6title:'6. 上がった後の場',
      basics:['プレイヤーは順番にカードを出します。','基本的には、場と同じ枚数・同じ種類の組み合わせを出します。','場に出ているカードより強いカードを出す必要があります。','出せない、または出したくない場合はパスできます。','手札を最初になくしたプレイヤーから順に順位が決まります。','残っている全員がパスすると場が流れ、新しい場としてカードを出せます。','革命中はカードの強さが逆転します。','JOKERは条件に応じて他のカードの代わりとして使用できます。'],
      strengthNormalLabel:'通常時', strengthNormal:'3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < JOKER',
      strengthRevLabel:'革命時(逆転)', strengthRev:'2 < A < K < Q < J < 10 < 9 < 8 < 7 < 6 < 5 < 4 < 3 < JOKER',
      strengthNote:'JOKERは革命中でも常に最強です。Jバックの効果が発動している間(その場が流れるまで)は、その時点の強さ順がさらに一時的に反転します。革命とJバックの両方が有効な場合は、反転が打ち消し合って通常の順序に戻ります。',
      specials:[
        {n:'革命 / Revolution', d:'同じ数字を4枚以上まとめて出すと、カードの強さの順序が逆転します。以降このラウンドが終わるまで効果が続き、再度発動するとさらに逆転します(階段には適用されません)。'},
        {n:'5飛び / Five Skip', d:'5を出すと、次のプレイヤーから「出した5の枚数×2−1」人分のターンを飛ばします。飛ばす人数が残りの他プレイヤー全員以上になる場合は、場がその場で流れて自分の番に戻ります。'},
        {n:'6ロック / Six Lock', d:'6を出すと、そのプレイで使ったスートに縛られます。場が流れるまで、そのスートのカードしか出せません(JOKERは常に例外)。'},
        {n:'7渡し / Seven Give', d:'7を出すと、出した枚数分のカードを次のプレイヤーへすぐに渡す必要があります。渡すカードが足りない場合は反則上がりになります。'},
        {n:'8切り / Eight Cut', d:'8を出すと場がすぐに流れ、自分がそのまま続けて出せます(ただし8を含む上がりは常に反則上がりです)。'},
        {n:'10捨て / Ten Discard', d:'10を出すと、出した枚数分のカードをすぐに捨てる必要があります。捨てるカードが足りない場合は反則上がりになります。'},
        {n:'Jバック / Jack Back', d:'Jを出すと、その場が流れるまでの間だけ、カードの強さが一時的に反転します。1回のプレイで複数枚Jを出しても反転は1回だけです。'},
        {n:'縛り / Suit Lock', d:'同じスート・同じ枚数・同じ種類(セット/階段)の組み合わせが2回連続で出されると、そのスートに縛られます。場が流れるまで、そのスートのカードしか出せません(JOKERは例外)。'},
        {n:'激縛り / Strong Suit Lock', d:'縛りの条件に加えて、2回連続のプレイが同じ枚数の同数字セットで、数字が1つ上がっている場合に発動します。次に出せるのは、同じスート・同じ枚数で1つ上の数字のセット、またはJOKERのみです。それ以上強い数字がない場合は通常の縛りになります。激縛り中にJOKER単体で応じた場合、その次に出せるカードは♠3のみになります。'},
        {n:'スペ3返し / 3 of Spades Counter', d:'場に単体のJOKERが出ている時だけ、♠3を1枚出して打ち返せます。打ち返すと場がすぐに流れ、そのまま自分が続けて出せます。'},
      ],
      jokerTitle:'JOKER',
      joker:['JOKERは他のカードの代わりとして使用できます。','セットや階段で複数の有効な使い方がある場合、どのカードとして使うかプレイヤーが選択します。','選択可能な候補はゲーム側が合法な候補だけを表示します。','場では、JOKERが何として使われたか確認できます。','単体JOKERに対しては♠3で返せる特殊ルールがあります。','JOKERを他のカードと一緒に使用して上がった場合も、JOKERを含む上がりのため反則です。'],
      foulTitle:'反則上がり',
      foulIntro:'以下の条件で手札を0枚にすると反則上がりになります。',
      foulNormalLabel:'通常時', foulNormal:['2を含む上がり','8を含む上がり','JOKERを含む上がり'],
      foulRevLabel:'革命時', foulRev:['3を含む上がり','8を含む上がり','JOKERを含む上がり'],
      foulExceptionLabel:'例外', foulException:'場の単体JOKERに対する♠3返しで上がる場合は正常な上がりです。',
      foulOther:['7を含む最後のプレイで、7渡しに必要なカードが残っていない場合','10を含む最後のプレイで、10捨てに必要なカードが残っていない場合'],
      foulJokerCombo:'また、他のカードとJOKERを一緒に使用して手札を0枚にした場合も、JOKERを含む上がりなので反則です。\n例:5・JOKER・7 の階段で手札を0枚にする → JOKERを含むため反則上がり',
      foulPenaltyLabel:'反則時の得点', foulPenalty:['反則が発生すると、その時点のレートが2倍になります。','反則者の失点は「反則直前の手札枚数 × 100 × 2倍後のレート」で計算されます。','反則者はその時点で脱落しますが、ラウンドは残りのプレイヤーで続行します。','最終的にそのラウンドの大富豪になったプレイヤーへ、反則者が失ったPtと同額が加算されます。','複数人が反則した場合は、それぞれの反則Ptが最終的な大富豪へ合算して加算されます。'],
      afterFinish:['プレイヤーが正常に上がっても、最後に出したカードは場に残ります。','残りのプレイヤーはそのカードを基準にプレイを続けます。','残っている全員がパスした場合に場が流れ、次のプレイヤーから新しい場が始まります。'],
    },
  },
  en: {
    brandKanji:'大富豪', brandEn:'ONLINE',
    tabCreate:'Create Room', tabJoin:'Join Room',
    namePlaceholder:'Your name', codePlaceholder:'Room code (e.g. AB3XZ)',
    joinBtn:'Join', hostNote:'Creating a room makes you the host.', createBtn:'Create Room',
    overview:'【Online Daifugo】\n\nA real-time online version of Daifugo (also known as President) that you can play with friends.\n\nTake turns playing cards and try to get rid of your entire hand before the other players.\n\nThis version includes special rules such as Revolution, Suit Lock, Strong Suit Lock, Eight Cut, Seven Give, Ten Discard, Jack Back, Five Skip, Six Lock, the 3 of Spades counter, and Joker selection.\n\nSee "View Detailed Rules" for the complete rules.',
    viewRules:'View Detailed Rules', closeRules:'Close',
    enterRoomCode:'Please enter a room code', defaultHostName:'Host',
    lobbyTitle:'Lobby', copyLink:'Copy Link', host:'Host', online:'Online', offline:'Offline', leaveRoom:'Leave Room', confirmLeave:'Leave this room? Your progress will be lost.',
    needMorePlayers:'Need at least 1 more player', startGame:n=>`Start Game (${n} players)`, waitingHost:'Waiting for the host to start…',
    loading:'Loading…',
    roundTitle:(n,room)=>`Daifugo - Round ${n} (Room ${room})`,
    revolutionBadge:(n,mult)=>`Revolution×${n} (${mult}× points)`, tempReversedBadge:'Temporarily Reversed',
    gekiBadge:(suits,rank)=>`Strong Lock: ${suits}${rank} or JOKER`, lockBadge:suits=>`Suit Lock: ${suits} only`,
    fieldEmpty:'The table is empty — play any combination to lead',
    gekiBanner:(suits,rank,count)=>`🔒 Strong Suit Lock: only ${suits}${rank}${count>1?` (×${count})`:''} or JOKER can be played`,
    lockBanner:suits=>`🔒 Suit Lock: only ${suits} cards can be played`,
    giveLabel:'Choose cards to give to the next player', discardLabel:'Choose cards to discard',
    selCount:(a,b)=>`(${a}/${b})`, confirm:'Confirm',
    handTitle:(name,n)=>`${name}'s hand (${n})`, yourTurn:' — Your turn',
    theirTurnChoosing:name=>`${name} is choosing cards…`, theirTurn:name=>`${name}'s turn…`,
    selectedHint:n=>`Selected: ${n} card(s) (press "Play" to submit)`,
    play:'Play', pass:'Pass', clearSel:'Clear Selection',
    jokerModalTitle:'What should the Joker represent?', jokerCancel:'Cancel (choose again)', jokerAs:(...s)=>`JOKER→${s.join('・')}`,
    straightSuffix:' straight', passChip:name=>`${name}: Pass`,
    resultTitle:n=>`Round ${n} Results`, pointsExchanged:pt=>`Points exchanged: ${pt}pt`,
    pointsExchangedFoul:pt=>`A total of ${pt}pt from illegal finishes was added to the President`,
    foulLine:(name,reason,amount,rate)=>`⚠️ ${name} committed an illegal finish (${reason}) — -${amount}pt (rate ×${rate})`,
    rankLabels:{daifugo:'President', fugo:'Vice President', heimin:'Citizen', hinmin:'Poor', daihinmin:'Beggar'},
    totalPt:n=>`Total: ${n}pt`, nextRoundQ:'Proceed to the next round?',
    yesNextRound:'Yes, Next Round', backToLobby:'Back to Lobby', waitingNextRound:'Waiting for the host to start the next round…',
    errors:{
      not_your_turn:"It's not your turn", invalid:"That combination can't be played", forbidden_finish:"You can't finish with that combination (illegal finish)",
      cannot_pass:"You can't pass right now", not_playable_now:"You can't play right now", not_pending:'Nothing to choose right now', cannot_confirm:"That's not the right number of cards",
      host_only:'Only the host can do that', already_started:'The game has already started', need_more_players:'Need at least 1 more player',
      no_room:'Room not found', bad_token:'Invalid connection info', not_started:"The game hasn't started yet",
    },
    rules:{
      sec1title:'1. Basic Rules', sec2title:'2. Card Strength', sec3title:'3. Special Rules', sec4title:'4. Joker', sec5title:'5. Illegal Finishes', sec6title:'6. The Table After a Finish',
      basics:['Players take turns playing cards.','Normally, your play must match the number and type of cards currently on the table.','Your play must beat the current play.','You may pass if you cannot or do not want to play.','Rankings are determined by the order in which players get rid of all their cards.','Once every remaining player has passed, the table clears and a new play can be started.','During a Revolution, card strength is reversed.','A Joker may substitute for another card when allowed by the play.'],
      strengthNormalLabel:'Normal', strengthNormal:'3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < JOKER',
      strengthRevLabel:'During Revolution (reversed)', strengthRev:'2 < A < K < Q < J < 10 < 9 < 8 < 7 < 6 < 5 < 4 < 3 < JOKER',
      strengthNote:"The Joker is always the strongest card, even during a Revolution. While Jack Back is in effect (until the current field clears), the current strength order is temporarily flipped again. If both Revolution and Jack Back are active at the same time, the two reversals cancel out and the order returns to normal for that field.",
      specials:[
        {n:'Revolution', d:'Playing 4 or more cards of the same rank at once reverses card strength for the rest of the round. Playing another Revolution flips it again. (Straights do not trigger this.)'},
        {n:'Five Skip', d:'Playing one or more 5s skips (2 × number of 5s played − 1) players starting from the next player. If that would skip every other remaining player, the table clears immediately and it becomes your turn again.'},
        {n:'Six Lock', d:'Playing a 6 locks the table to the suit(s) used in that play. Until the table clears, only that suit can be played (the Joker is always exempt).'},
        {n:'Seven Give', d:'Playing one or more 7s requires you to immediately give that many cards (your choice) to the next player. If you don\u2019t have enough cards left to give, it\u2019s an illegal finish.'},
        {n:'Eight Cut', d:'Playing an 8 clears the table immediately and you lead again right away. (Finishing your hand with an 8 is always an illegal finish.)'},
        {n:'Ten Discard', d:'Playing one or more 10s requires you to immediately discard that many cards from your hand. If you don\u2019t have enough cards left to discard, it\u2019s an illegal finish.'},
        {n:'Jack Back', d:'Playing a J temporarily reverses card strength until the current field clears. Playing multiple Js in one play still only flips it once.'},
        {n:'Suit Lock', d:'If two plays in a row use the same suit(s), the same count, and the same type (set/straight), the suit becomes locked — only that suit can be played until the table clears (Joker exempt).'},
        {n:'Strong Suit Lock', d:'Triggers when those two consecutive plays are same-rank sets of the same count with the rank increasing by one. The next play must be the same suit(s), same count, exactly one rank higher — or a Joker. If there\u2019s no higher rank, it downgrades to a normal Suit Lock. If a single Joker is played in response to a Strong Suit Lock, the following play is then restricted to the 3 of Spades only.'},
        {n:'3 of Spades Counter', d:'When a single Joker is on the table, you may counter it by playing the 3 of Spades alone. This clears the table immediately and you lead again.'},
      ],
      jokerTitle:'Joker',
      joker:['A Joker can be used in place of another card.','If a set or straight has more than one valid way to use the Joker, you choose which card it represents.','Only legal candidates are shown for you to choose from.','The table shows what the Joker was used as.','A single Joker on the table can be countered with the 3 of Spades.','Finishing with a Joker is illegal even when the Joker is played together with other cards as part of a set or straight.'],
      foulTitle:'Illegal Finishes',
      foulIntro:'Finishing your hand under any of the following conditions is an illegal finish.',
      foulNormalLabel:'During normal play', foulNormal:['Finishing with a 2','Finishing with an 8','Finishing with a Joker'],
      foulRevLabel:'During Revolution', foulRev:['Finishing with a 3','Finishing with an 8','Finishing with a Joker'],
      foulExceptionLabel:'Exception', foulException:'Finishing with the 3 of Spades as a direct counter to a single Joker on the table is allowed.',
      foulOther:['Your final play contains a 7, but you have no remaining cards available to complete Seven Give.','Your final play contains a 10, but you have no remaining cards available to complete Ten Discard.'],
      foulJokerCombo:'It is also an illegal finish if you use a Joker together with other cards to empty your hand, since the play still contains a Joker.\nExample: Finishing with a 5–Joker–7 straight is illegal because the final play contains a Joker.',
      foulPenaltyLabel:'Scoring when a foul occurs', foulPenalty:['When an illegal finish happens, the current rate doubles immediately.','The offending player loses: number of cards held right before that play × 100 × the rate after doubling.','The offending player is eliminated at that point, but the round continues with the remaining players.','Once the round\u2019s eventual President is decided, they receive the same amount the offender lost.','If more than one player fouls in the same round, each foul\u2019s points are added together and given to the eventual President.'],
      afterFinish:['When a player finishes their hand normally, the last card(s) they played stay on the table.','The remaining players continue playing against that card.','Once everyone still in the round has passed, the table clears and a new play starts from the next player.'],
    },
  },
};
function loadLang(){
  try{ const v = localStorage.getItem('daifugoLang'); if(v==='ja'||v==='en') return v; }catch(e){}
  return 'ja';
}
function setLang(l){
  app.lang = l;
  try{ localStorage.setItem('daifugoLang', l); }catch(e){}
  render();
}
function t(key, ...args){
  const dict = I18N[app.lang] || I18N.ja;
  const v = dict[key];
  if(typeof v === 'function') return v(...args);
  return v!==undefined ? v : (I18N.ja[key]!==undefined ? I18N.ja[key] : key);
}
function tErr(code){
  const dict = I18N[app.lang] || I18N.ja;
  return (dict.errors && dict.errors[code]) || code;
}

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
  lang: 'ja',
  showRules: false,
};
app.lang = loadLang();

/* ---------- セッション永続化(リロード後の再接続) ---------- */
function saveSession(){
  try{
    if(app.me) localStorage.setItem('daifugoSession', JSON.stringify(app.me));
  }catch(e){}
}
function loadSession(){
  try{
    const v = localStorage.getItem('daifugoSession');
    if(!v) return null;
    const parsed = JSON.parse(v);
    if(parsed && parsed.roomCode && parsed.token && typeof parsed.playerId==='number') return parsed;
  }catch(e){}
  return null;
}
function clearSession(){
  try{ localStorage.removeItem('daifugoSession'); }catch(e){}
}

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
  return tErr(code);
}

/* ---------- polling ---------- */
async function poll(){
  if(!app.me) return;
  try{
    const st = await apiGet(`/api/state?roomCode=${app.me.roomCode}&playerId=${app.me.playerId}&token=${app.me.token}`);
    if(st.error){
      app.error = describeError(st.error);
      if(st.error==='no_room' || st.error==='bad_token'){
        // ルームが失効/無効化された場合は、詰まらないようセッションを破棄してトップ画面へ戻す
        clearSession();
        if(app.pollTimer) clearInterval(app.pollTimer);
        app.me = null; app.server = null; app.screen = 'landing';
      }
    }
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
  const res = await apiPost('/api/create', {name: app.nameInput.trim() || t('defaultHostName')});
  if(res.error){ app.error = res.error; render(); return; }
  app.me = {roomCode: res.roomCode, playerId: res.playerId, token: res.token};
  saveSession();
  history.replaceState(null,'', '?room='+res.roomCode);
  startPolling();
}
async function joinRoom(){
  app.error='';
  const code = app.roomCodeInput.trim().toUpperCase();
  if(!code){ app.error=t('enterRoomCode'); render(); return; }
  const res = await apiPost('/api/join', {roomCode: code, name: app.nameInput.trim() || undefined});
  if(res.error){ app.error = describeError(res.error) || res.error; render(); return; }
  app.me = {roomCode: res.roomCode, playerId: res.playerId, token: res.token};
  saveSession();
  history.replaceState(null,'', '?room='+res.roomCode);
  startPolling();
}
function leaveRoom(){
  if(app.pollTimer) clearInterval(app.pollTimer);
  clearSession();
  app.me = null; app.server = null; app.screen = 'landing'; app.error='';
  history.replaceState(null,'', location.pathname);
  render();
}

/* ---------- 起動時の自動復帰 ---------- */
(function tryRestoreSession(){
  const saved = loadSession();
  if(saved){
    app.me = saved;
    app.screen = 'game'; // stateが届くまでの暫定画面。pollが最新phaseへ補正する
    startPolling();
  }
})();

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
  if(card.rank==='JOKER'){ corner.appendChild(el('div',{class:'r',text:'JOKER'})); corner.appendChild(el('div',{class:'s',text:'★'})); }
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
function currentCardWidth(){
  const w=(typeof window!=='undefined'?window.innerWidth:400);
  return w>=1000?72 : w>=700?64 : w>=420?60 : 56;
}
function applyCardSize(){
  try{
    const cw=currentCardWidth();
    document.documentElement.style.setProperty('--cw',cw+'px');
    document.documentElement.style.setProperty('--pw',Math.round(cw*0.9)+'px');
    document.documentElement.style.setProperty('--pw-base',Math.round(cw*0.9)+'px');
  }catch(e){}
}
function buildFanRow(cards, optsFn){
  const n=cards.length;
  const cw=currentCardWidth();
  const avail=Math.min((typeof window!=='undefined'?window.innerWidth:400)-32, 980);
  const minVisible=Math.max(20,Math.round(cw*0.38)); // 隣のカードに重なっても数字とマークが読める最小幅(できるだけ1列に収める)
  // 1段で収まらない場合は2段・3段に分けて、重なりを最小限にする
  let rows=1;
  while(rows<4 && cw+(Math.ceil(n/rows)-1)*minVisible>avail) rows++;
  const perRow=Math.ceil(n/rows);
  const wrap=el('div',{class:'hand-rows'});
  for(let r=0;r<rows;r++){
    const slice=cards.slice(r*perRow,(r+1)*perRow);
    if(slice.length===0) continue;
    const row=el('div',{class:'hand-row-fan'});
    const m=slice.length;
    let overlap=0;
    if(m>1){
      overlap=Math.max(0,(cw*m-avail)/(m-1));
      overlap=Math.min(overlap,cw-minVisible);
    }
    row.style.setProperty('--vis',(cw-overlap)+'px'); // 重なった後に見えている幅(数字とマークの大きさの基準)
    slice.forEach((card,i)=>{
      const c=cardEl(card, optsFn(card));
      if(i>0) c.style.marginLeft=(-overlap)+'px';
      c.style.zIndex=String(r*perRow+i);
      row.appendChild(c);
    });
    wrap.appendChild(row);
  }
  return wrap;
}

function launchConfetti(){
  try{
    const layer=document.createElement('div'); layer.className='confetti-layer';
    const glyphs=['♠','♥','♦','♣','★'];
    for(let i=0;i<26;i++){
      const s=document.createElement('span'); s.className='confetti-piece';
      s.textContent=glyphs[i%glyphs.length];
      s.style.left=(Math.random()*100)+'vw';
      s.style.color=(i%2? '#e8cf7a':'#f4efe0');
      if(i%4===1) s.style.color='#e0654f';
      s.style.animationDelay=(Math.random()*0.9)+'s';
      s.style.fontSize=(16+Math.random()*16)+'px';
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(()=>{ if(layer.parentNode) layer.parentNode.removeChild(layer); },4800);
  }catch(e){}
}
let __enterDir=null;
const ENTER_DIRS={tl:[-130,-90],tr:[130,-90],bl:[-130,70],br:[130,70],tc:[0,-110],self:[0,150]};
function seededRand(seed){ const x=Math.sin(seed*12.9898)*43758.5453; return x-Math.floor(x); }
function pileCluster(entry, idx, activeIdx){
  const seed=idx*17+3;
  const isActive=idx===activeIdx;
  const side=(seededRand(seed)<0.5?-1:1);
  const back = (activeIdx-idx); // 1=ひとつ前, 2=ふたつ前
  const baseX= isActive ? 0 : (back===1 ? -1 : 1)*96;
  const baseY= isActive ? 8 : -14;
  const baseRot= isActive ? 0 : (back===1 ? -9 : 9);
  const wrap=el('div',{class:'pile-cluster'+(isActive?' active':'')});
  wrap.style.left=`calc(50% + ${baseX}px)`;
  wrap.style.top=`calc(50% + ${baseY}px)`;
  wrap.style.transform=`translate(-50%,-50%) rotate(${baseRot}deg)`;
  wrap.style.zIndex=idx+1;
  let tagText = entry.name;
  if(entry.jokerAssignment && entry.jokerAssignment.length>0){
    tagText += ' ('+t('jokerAs', ...entry.jokerAssignment.map(a => a.rank==='JOKER' ? 'JOKER' : `${(a.suit||'')}${a.rank}`))+')';
  }
  wrap.appendChild(el('div',{class:'pile-tag',text:tagText}));
  const cardsWrap=el('div',{class:'pile-cards'});
  entry.cards.forEach(card=>{
    const c=el('div',{class:'pile-card'+(isRed(card.suit)?' red':'')+(card.rank==='JOKER'?' joker':'')});
    if(card.rank==='JOKER'){ c.appendChild(el('div',{class:'rj',text:'JOKER'})); c.appendChild(el('div',{class:'s',text:'★'})); }
    else { c.appendChild(el('div',{class:'r',text:card.rank})); c.appendChild(el('div',{class:'s',text:card.suit})); }
    cardsWrap.appendChild(c);
  });
  if(isActive && __enterDir){ const d=ENTER_DIRS[__enterDir]||[0,0]; cardsWrap.classList.add('enter'); cardsWrap.style.setProperty('--fx',d[0]+'px'); cardsWrap.style.setProperty('--fy',d[1]+'px'); }
  wrap.appendChild(cardsWrap);
  return wrap;
}
function describePlayLike(entry){
  const base = entry.type==='straight' ? `${entry.suitsUsed[0]}${entry.straightRanks.join('-')}${t('straightSuffix')}` :
    (entry.rank==='JOKER' ? 'JOKER' : entry.rank) + (entry.count===1 ? '' : `×${entry.count}`);
  if(entry.jokerAssignment && entry.jokerAssignment.length>0){
    const jokerLabel = t('jokerAs', ...entry.jokerAssignment.map(a => a.rank==='JOKER' ? 'JOKER' : `${(a.suit||'')}${a.rank}`));
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
  wrap.appendChild(el('div',{class:'mini-count-badge'+(count<=2?' few':''),text:count+'枚'}));
  return wrap;
}
function rankLabels(n){
  const L = t('rankLabels');
  if(n<=1) return [L.daifugo];
  if(n===2) return [L.daifugo,L.daihinmin];
  if(n===3) return [L.daifugo,L.heimin,L.daihinmin];
  const labels=[L.daifugo,L.fugo];
  for(let i=0;i<n-4;i++) labels.push(L.heimin);
  labels.push(L.hinmin,L.daihinmin);
  return labels;
}
function seatSlotForIndex(idx,n){
  if(n<=4) return ['tl','tr','br','bl'][idx];
  return ['tl','tc','tr','bl','br'][idx];
}
function buildLangSwitch(cls){
  const row = el('div',{class:cls||'lang-switch'});
  row.appendChild(el('button',{class:'lang-btn'+(app.lang==='ja'?' active':''), text:'日本語', onclick:()=>setLang('ja')}));
  row.appendChild(el('button',{class:'lang-btn'+(app.lang==='en'?' active':''), text:'English', onclick:()=>setLang('en')}));
  return row;
}

/* ---------- render: landing ---------- */
function renderLanding(root){
  const wrap = el('div',{class:'landing-wrap'});
  const card = el('div',{class:'landing-card'});
  card.appendChild(buildLangSwitch());
  const brand = el('div',{class:'brand'});
  brand.appendChild(el('div',{class:'kanji',text:t('brandKanji')}));
  brand.appendChild(el('span',{class:'en',text:t('brandEn')}));
  brand.appendChild(el('div',{class:'suits',text:'♠ ♥ ♦ ♣'}));
  card.appendChild(brand);

  card.appendChild(el('div',{class:'overview-text',text:t('overview')}));

  const tabs = el('div',{class:'tab-row'});
  tabs.appendChild(el('button',{class:'tab-btn'+(app.tab==='create'?' active':''), text:t('tabCreate'), onclick:()=>{app.tab='create'; render();}}));
  tabs.appendChild(el('button',{class:'tab-btn'+(app.tab==='join'?' active':''), text:t('tabJoin'), onclick:()=>{app.tab='join'; render();}}));
  card.appendChild(tabs);

  const nameInput = el('input',{class:'field-input', type:'text', placeholder:t('namePlaceholder'), value:app.nameInput});
  nameInput.addEventListener('input', e=>{ app.nameInput = e.target.value; });
  card.appendChild(nameInput);

  if(app.tab==='join'){
    const codeInput = el('input',{class:'field-input', type:'text', placeholder:t('codePlaceholder'), value:app.roomCodeInput});
    codeInput.addEventListener('input', e=>{ app.roomCodeInput = e.target.value.toUpperCase(); });
    card.appendChild(codeInput);
    card.appendChild(el('button',{class:'start-btn', text:t('joinBtn'), onclick:joinRoom}));
  } else {
    card.appendChild(el('div',{class:'setup-label', text:t('hostNote')}));
    card.appendChild(el('button',{class:'start-btn', text:t('createBtn'), onclick:createRoom}));
  }
  if(app.error) card.appendChild(el('div',{class:'error-msg', text:app.error}));
  card.appendChild(el('button',{class:'rules-link-btn', text:t('viewRules'), onclick:()=>{ app.showRules=true; render(); }}));
  wrap.appendChild(card); root.appendChild(wrap);
}

/* ---------- render: lobby ---------- */
function renderLobby(root){
  const wrap = el('div',{class:'landing-wrap'});
  const card = el('div',{class:'landing-card'});
  card.appendChild(el('div',{class:'brand'},[el('div',{class:'kanji',text:t('brandKanji')}),el('span',{class:'en',text:t('lobbyTitle')})]));

  const box = el('div',{class:'room-code-box'});
  box.appendChild(el('div',{class:'code', text: app.me.roomCode}));
  const link = location.origin + location.pathname + '?room=' + app.me.roomCode;
  box.appendChild(el('div',{class:'link', text: link}));
  box.appendChild(el('button',{class:'copy-btn', text:t('copyLink'), onclick: async ()=>{
    try{ await navigator.clipboard.writeText(link); }catch(e){}
  }}));
  card.appendChild(box);

  const list = el('div',{class:'lobby-list'});
  (app.server ? app.server.lobbyPlayers : []).forEach((p,i)=>{
    const row = el('div',{class:'lobby-row'});
    row.appendChild(el('div',{class:'lname', text:p.name}));
    if(i===0) row.appendChild(el('div',{class:'lhost', text:t('host')}));
    row.appendChild(el('div',{class:'conn-badge '+(p.connected?'online':'offline'), text:p.connected?t('online'):t('offline')}));
    list.appendChild(row);
  });
  card.appendChild(list);

  const n = app.server ? app.server.lobbyPlayers.length : 1;
  if(app.server && app.server.isHost){
    card.appendChild(el('button',{class:'start-btn', text: n<2 ? t('needMorePlayers') : t('startGame', n),
      disabled: n<2?'disabled':null, onclick: ()=>sendAction({type:'start'})}));
  } else {
    card.appendChild(el('div',{class:'waiting-msg', text:t('waitingHost')}));
  }
  if(app.error) card.appendChild(el('div',{class:'error-msg', text:app.error}));
  card.appendChild(el('button',{class:'rules-link-btn', text:t('viewRules'), onclick:()=>{ app.showRules=true; render(); }}));
  card.appendChild(el('button',{class:'rules-link-btn', text:t('leaveRoom'), onclick:()=>{ if(confirm(t('confirmLeave'))) leaveRoom(); }}));
  wrap.appendChild(card); root.appendChild(wrap);
}

/* ---------- render: game ---------- */
function renderGame(root){
  const st = app.server;
  if(!st){ root.appendChild(el('div',{class:'landing-wrap'},[el('div',{class:'waiting-msg',text:t('loading')})])); return; }
  const n = st.players.length;
  const myId = app.me.playerId;

  if(st.gamePhase === 'result'){ renderResult(root, st); return; }

  const topbar = el('div',{class:'topbar'});
  topbar.appendChild(el('div',{class:'title', text:t('roundTitle', st.roundNumber, st.roomCode)}));
  const badges = el('div',{class:'badge-row'});
  if(st.revolutionCount>0) badges.appendChild(el('div',{class:'badge gold', text:t('revolutionBadge', st.revolutionCount, Math.pow(2,st.revolutionCount))}));
  if(st.tempReversed) badges.appendChild(el('div',{class:'badge on', text:t('tempReversedBadge')}));
  if(st.lockSeq) badges.appendChild(el('div',{class:'badge on', text:t('gekiBadge', st.lockSeq.suits.join(''), st.lockSeq.rank)}));
  else if(st.lockSuits) badges.appendChild(el('div',{class:'badge on', text:t('lockBadge', st.lockSuits.join(''))}));
  badges.appendChild(buildLangSwitch());
  topbar.appendChild(badges);
  root.appendChild(topbar);

  const arena = el('div',{class:'arena'});
  st.players.forEach((p,i)=>{
    if(i===myId) return;
    const pos = seatSlotForIndex(i,n);
    const cls = ['seat',pos]; if(p.finished) cls.push('done'); if(i===st.currentIndex && !p.finished) cls.push('current');
    const seat = el('div',{class:cls.join(' ')});
    const faceEl=el('div',{class:'face',text:p.name.slice(0,1)});
    faceEl.style.background=`linear-gradient(160deg,hsl(${[160,28,205,300,50][i%5]},45%,42%),hsl(${[160,28,205,300,50][i%5]},50%,26%))`;
    seat.appendChild(faceEl);
    const nameRow = el('div',{class:'sname'});
    nameRow.appendChild(el('span',{text:p.name}));
    if(p.connected===false && !p.finished) nameRow.appendChild(el('span',{class:'disconnected-mark', text:' 💤', title:t('offline')}));
    seat.appendChild(nameRow);
    if(p.finished){
      const pos2 = st.finishOrder.indexOf(i);
      seat.appendChild(el('div',{class:'srank', text: rankLabels(n)[pos2] || '完了'}));
    } else {
      seat.appendChild(miniHandFan(p.handCount));
    }
    seat.appendChild(el('div',{class:'sscore', text:p.score+'pt'}));
    arena.appendChild(seat);
  });

  { const th=st.trickHistory||[], lastH=th[th.length-1], key=st.roundNumber+':'+th.length;
    if(lastH && lastH.kind==='play' && key!==app.__animKey && lastH.playerIndex!==undefined){
      __enterDir = lastH.playerIndex===myId ? 'self' : seatSlotForIndex(lastH.playerIndex,n);
    } else __enterDir=null;
    app.__animKey=key; }
  const fieldZone = el('div',{class:'field-zone'});
  let lockStrip=null;
  if(st.lockSeq) lockStrip=el('div',{class:'lock-banner lock-strip', text:t('gekiBanner', st.lockSeq.suits.join(''), st.lockSeq.rank, st.lockSeq.count)});
  else if(st.lockSuits) lockStrip=el('div',{class:'lock-banner lock-strip', text:t('lockBanner', st.lockSuits.join('/'))});

  if(st.field===null){
    fieldZone.appendChild(el('div',{class:'field-empty', text:t('fieldEmpty')}));
  } else {
    const fc = el('div',{class:'field-cards'});
    const playEntries = (st.trickHistory||[]).filter(h=>h.kind==='play');
    const visible = playEntries.slice(-3);
    const activeIdx = visible.length-1;
    visible.forEach((entry,i)=>fc.appendChild(pileCluster(entry,i,activeIdx)));
    fieldZone.appendChild(fc);
    if(st.trickHistory && st.trickHistory.length){
      const logRow = el('div',{class:'trick-log'});
      st.trickHistory.slice(-3).forEach(h=>{
        const label = h.kind==='pass' ? t('passChip', h.name) : `${h.name}: ${describePlayLike(h)}`;
        logRow.appendChild(el('div',{class:'trick-chip'+(h.kind==='pass'?' pass':''), text:label}));
      });
      fieldZone.appendChild(logRow);
    }
  }
  fieldZone.appendChild(el('div',{class:'log-line', text: st.log || ''}));
  arena.appendChild(fieldZone);
  if(lockStrip) root.appendChild(lockStrip);
  root.appendChild(arena);

  const panel = el('div',{class:'hand-panel'+((st.gamePhase!=='give'&&st.gamePhase!=='discard'&&st.currentIndex===myId)?' myturn':'')});
  const me = st.players[myId];

  if(st.gamePhase==='give' || st.gamePhase==='discard'){
    if(st.pendingActor===myId){
      const label = st.gamePhase==='give' ? t('giveLabel') : t('discardLabel');
      panel.appendChild(el('div',{class:'hint-line', text:`${label}${t('selCount', app.selected.size, st.pendingCount)}`}));
      const hrow = buildFanRow(me.hand||[], card=>({selected:app.selected.has(card.id), onClick:()=>{ toggleSelect(card.id); }}));
      panel.appendChild(hrow);
      const ar = el('div',{class:'action-row'});
      ar.appendChild(el('button',{class:'btn play', text:t('confirm'), disabled: (app.selected.size===st.pendingCount && !app.busy)?null:'disabled',
        onclick: ()=>{ sendAction({type:'giveDiscard', cardIds:[...app.selected]}); app.selected=new Set(); }}));
      panel.appendChild(ar);
    } else {
      panel.appendChild(el('div',{class:'hand-head'},[el('div',{class:'htitle',text:t('handTitle', me.name, me.handCount)}),el('div',{class:'hscore',text:me.score+'pt'})]));
      if(me.hand) panel.appendChild(buildFanRow(me.hand, ()=>({})));
      panel.appendChild(el('div',{class:'hint-line', text:t('theirTurnChoosing', st.players[st.pendingActor].name)}));
    }
  } else {
    const head = el('div',{class:'hand-head'});
    const isMyTurn = st.currentIndex===myId;
    head.appendChild(el('div',{class:'htitle', text: t('handTitle', me.name, me.handCount) + (isMyTurn?t('yourTurn'):'')}));
    head.appendChild(el('div',{class:'hscore', text: me.score+'pt'}));
    panel.appendChild(head);
    const hrow = buildFanRow(me.hand||[], card=>({selected:app.selected.has(card.id), onClick: isMyTurn ? ()=>toggleSelect(card.id) : null}));
    panel.appendChild(hrow);

    if(isMyTurn){
      let hint='';
      if(app.selected.size>0) hint = t('selectedHint', app.selected.size);
      panel.appendChild(el('div',{class:'hint-line', text:hint}));
      const ar = el('div',{class:'action-row'});
      ar.appendChild(el('button',{class:'btn play', text:t('play'), disabled:(app.selected.size===0||app.busy)?'disabled':null,
        onclick: ()=>{ handlePlayClick([...app.selected]); }}));
      ar.appendChild(el('button',{class:'btn pass', text:t('pass'), disabled:(st.field===null||app.busy)?'disabled':null,
        onclick: ()=>sendAction({type:'pass'})}));
      ar.appendChild(el('button',{class:'btn clear', text:t('clearSel'), onclick:()=>{ app.selected=new Set(); render(); }}));
      panel.appendChild(ar);
    } else {
      panel.appendChild(el('div',{class:'hint-line', text:t('theirTurn', st.players[st.currentIndex].name)}));
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
function buildJokerChoiceLabel(choice){
  const parts = choice.assignment.map(a => a.rank==='JOKER' ? 'JOKER' : `${a.suit||''}${a.rank}`);
  return t('jokerAs', ...parts);
}
function renderJokerChoiceModal(root){
  const overlay = el('div',{class:'joker-modal-overlay'});
  const modal = el('div',{class:'joker-modal'});
  modal.appendChild(el('h3',{class:'joker-modal-title', text:t('jokerModalTitle')}));
  const list = el('div',{class:'joker-choice-list'});
  app.pendingJokerChoices.forEach(choice=>{
    list.appendChild(el('button',{class:'joker-choice-btn', text:buildJokerChoiceLabel(choice), onclick:()=>confirmJokerChoice(choice)}));
  });
  modal.appendChild(list);
  modal.appendChild(el('button',{class:'btn pass joker-cancel-btn', text:t('jokerCancel'), onclick:cancelJokerChoice}));
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

function translateFoulReason(reason){
  if(app.lang!=='en' || !reason) return reason;
  const known = {
    '7渡し':'Seven Give', '10捨て':'Ten Discard',
    'joker_finish':'finishing with a Joker', 'eight_finish':'finishing with an 8',
    'normal_2_finish':'finishing with a 2', 'revolution_3_finish':'finishing with a 3',
    '禁止上がり':'illegal finish',
  };
  let s = reason;
  Object.keys(known).forEach(k=>{ s = s.split(k).join(known[k]); });
  return s.split('・').join(', ');
}
function renderResult(root, st){
  const wrap = el('div',{class:'result-wrap'});
  const card = el('div',{class:'result-card'});
  card.appendChild(buildLangSwitch());
  card.appendChild(el('h2',{text:t('resultTitle', st.roundNumber)}));
  const hasFouls = st.pendingFoulPenalties && st.pendingFoulPenalties.length>0;
  if(hasFouls){
    card.appendChild(el('div',{class:'result-sub', text:t('pointsExchangedFoul', st.lastRoundPoints)}));
    st.pendingFoulPenalties.forEach(fp=>{
      const name = st.players[fp.playerId].name;
      card.appendChild(el('div',{class:'result-sub', text:t('foulLine', name, translateFoulReason(fp.reason), fp.penaltyPoints, fp.rateAfter), style:'color:#e08a8a;'}));
    });
  } else {
    card.appendChild(el('div',{class:'result-sub', text:t('pointsExchanged', st.lastRoundPoints)}));
  }
  const list = el('div',{class:'rank-list'});
  const labels = rankLabels(st.players.length);
  // 反則者ごとのPtを直接引けるようマップ化(反則者本人の損失=その額そのまま。合算や折半は行わない)
  const foulPtByPlayer = {};
  if(hasFouls) st.pendingFoulPenalties.forEach(fp=>{ foulPtByPlayer[fp.playerId]=fp.penaltyPoints; });
  st.finishOrder.forEach((idx,pos)=>{
    const p = st.players[idx];
    const row = el('div',{class:'rank-row r'+(pos+1)+(pos===0?' first':'')+((pos===st.finishOrder.length-1&&pos>0)?' last':'')});
    row.style.setProperty('--i',pos);
    row.appendChild(el('div',{class:'num', text:String(pos+1)}));
    row.appendChild(el('div',{class:'rname', text:p.name}));
    row.appendChild(el('div',{class:'rtitle', text:labels[pos]}));
    let pt=0;
    if(foulPtByPlayer[idx]!==undefined){
      pt=-foulPtByPlayer[idx]; // 反則者本人はその反則Ptをそのままマイナス表示(合算・折半なし)
    } else if(pos===0){
      pt=st.lastRoundPoints; // 大富豪: 通常勝利分、または反則Pt合計の加算分をそのまま表示
    } else if(!hasFouls && pos===st.finishOrder.length-1){
      pt=-st.lastRoundPoints; // 反則が絡まない通常ラウンドの最下位のみマイナス
    }
    const ptEl = el('div',{class:'rpt '+(pt>0?'pos':pt<0?'neg':'')}); ptEl.textContent=(pt>0?'+':'')+pt;
    row.appendChild(ptEl);
    row.appendChild(el('div',{class:'rtotal', text:t('totalPt', p.score)}));
    list.appendChild(row);
  });
  card.appendChild(list);
  if(app.server.isHost){
    card.appendChild(el('div',{class:'result-sub', text:t('nextRoundQ'), style:'margin-top:18px;margin-bottom:0;'}));
    const btns = el('div',{class:'result-btns'});
    btns.appendChild(el('button',{class:'btn play', text:t('yesNextRound'), onclick:()=>sendAction({type:'nextRound'})}));
    btns.appendChild(el('button',{class:'btn pass', text:t('backToLobby'), onclick:()=>sendAction({type:'backToLobby'})}));
    card.appendChild(btns);
  } else {
    card.appendChild(el('div',{class:'waiting-msg', text:t('waitingNextRound')}));
  }
  wrap.appendChild(card); root.appendChild(wrap);
  if(st.finishOrder[0]===app.me.playerId && app.__confettiRound!==st.roundNumber && !(st.pendingFoulPenalties&&st.pendingFoulPenalties.some(f=>f.playerId===app.me.playerId))){ app.__confettiRound=st.roundNumber; launchConfetti(); }
}

function renderRulesModal(root){
  const overlay = el('div',{class:'rules-modal-overlay'});
  const box = el('div',{class:'rules-modal-box'});
  const header = el('div',{class:'rules-modal-header'});
  header.appendChild(buildLangSwitch());
  header.appendChild(el('button',{class:'rules-close-btn', text:t('closeRules'), onclick:()=>{ app.showRules=false; render(); }}));
  box.appendChild(header);

  const R = t('rules');

  // 1. 基本ルール
  const s1 = el('div',{class:'rules-section'});
  s1.appendChild(el('h3',{text:R.sec1title}));
  const ul1 = el('ul');
  R.basics.forEach(x=>ul1.appendChild(el('li',{text:x})));
  s1.appendChild(ul1);
  box.appendChild(s1);

  // 2. カードの強さ
  const s2 = el('div',{class:'rules-section'});
  s2.appendChild(el('h3',{text:R.sec2title}));
  s2.appendChild(el('h4',{text:R.strengthNormalLabel}));
  s2.appendChild(el('div',{class:'rules-strength-row', text:R.strengthNormal}));
  s2.appendChild(el('h4',{text:R.strengthRevLabel}));
  s2.appendChild(el('div',{class:'rules-strength-row', text:R.strengthRev}));
  s2.appendChild(el('p',{text:R.strengthNote}));
  box.appendChild(s2);

  // 3. 特殊ルール
  const s3 = el('div',{class:'rules-section'});
  s3.appendChild(el('h3',{text:R.sec3title}));
  R.specials.forEach(sp=>{
    const item = el('div',{class:'rules-rule-item'});
    item.appendChild(el('div',{class:'rname', text:sp.n}));
    item.appendChild(el('div',{text:sp.d}));
    s3.appendChild(item);
  });
  box.appendChild(s3);

  // 4. JOKER
  const s4 = el('div',{class:'rules-section'});
  s4.appendChild(el('h3',{text:R.sec4title}));
  const ul4 = el('ul');
  R.joker.forEach(x=>ul4.appendChild(el('li',{text:x})));
  s4.appendChild(ul4);
  box.appendChild(s4);

  // 5. 反則上がり
  const s5 = el('div',{class:'rules-section'});
  s5.appendChild(el('h3',{text:R.sec5title}));
  s5.appendChild(el('p',{text:R.foulIntro}));
  s5.appendChild(el('h4',{text:R.foulNormalLabel}));
  const ulN = el('ul'); R.foulNormal.forEach(x=>ulN.appendChild(el('li',{text:x}))); s5.appendChild(ulN);
  s5.appendChild(el('h4',{text:R.foulRevLabel}));
  const ulR = el('ul'); R.foulRev.forEach(x=>ulR.appendChild(el('li',{text:x}))); s5.appendChild(ulR);
  s5.appendChild(el('h4',{text:R.foulExceptionLabel}));
  s5.appendChild(el('p',{text:R.foulException}));
  const ulO = el('ul'); R.foulOther.forEach(x=>ulO.appendChild(el('li',{text:x}))); s5.appendChild(ulO);
  s5.appendChild(el('p',{text:R.foulJokerCombo}));
  s5.appendChild(el('h4',{text:R.foulPenaltyLabel}));
  const ulP = el('ul'); R.foulPenalty.forEach(x=>ulP.appendChild(el('li',{text:x}))); s5.appendChild(ulP);
  box.appendChild(s5);

  // 6. 上がった後の場
  const s6 = el('div',{class:'rules-section'});
  s6.appendChild(el('h3',{text:R.sec6title}));
  const ulAF = el('ul'); R.afterFinish.forEach(x=>ulAF.appendChild(el('li',{text:x}))); s6.appendChild(ulAF);
  box.appendChild(s6);

  box.appendChild(el('button',{class:'rules-close-btn', text:t('closeRules'), onclick:()=>{ app.showRules=false; render(); }, style:'width:100%;box-sizing:border-box;margin-top:8px;'}));

  overlay.appendChild(box);
  root.appendChild(overlay);
}

/* ---------- root render ---------- */
function render(){
  applyCardSize();
  const root = document.getElementById('app');
  root.innerHTML = '';
  if(app.screen==='landing') renderLanding(root);
  else if(app.screen==='lobby') renderLobby(root);
  else renderGame(root);
  if(app.isChoosingJoker && app.pendingJokerChoices) renderJokerChoiceModal(root);
  if(app.showRules) renderRulesModal(root);
}
render();
