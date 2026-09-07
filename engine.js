// 大富豪 ゲームエンジン(純粋なゲームロジックのみ)
// サーバー固有の処理(HTTP・ルーム管理など)は一切含みません。server.js から require して使います。
'use strict';

/* ============================================================
   基本定義
   ============================================================ */
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const EFFECT_RANKS = ['5', '6', '7', '10', 'J']; // 8は別扱い(cutFlag)

function buildDeck() {
  const d = [];
  SUITS.forEach(s => RANKS.forEach(r => d.push({ suit: s, rank: r, id: s + r })));
  d.push({ suit: null, rank: 'JOKER', id: 'JOKER-A' });
  d.push({ suit: null, rank: 'JOKER', id: 'JOKER-B' });
  return d;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sortHand(hand) {
  return hand.slice().sort((a, b) => {
    const ai = a.rank === 'JOKER' ? 999 : RANKS.indexOf(a.rank);
    const bi = b.rank === 'JOKER' ? 999 : RANKS.indexOf(b.rank);
    if (ai !== bi) return ai - bi;
    return SUITS.indexOf(a.suit || '') - SUITS.indexOf(b.suit || '');
  });
}
function isRed(suit) { return suit === '♥' || suit === '♦'; }

function effectiveReversed(gs) { return (gs.revolutionCount % 2 === 1) !== gs.tempReversed; }
function currentStrength(gs, rank) {
  if (rank === 'JOKER') return 999;
  const idx = RANKS.indexOf(rank);
  return effectiveReversed(gs) ? (RANKS.length - 1 - idx) : idx;
}
function strengthWithReversal(rank, reversed) {
  if (rank === 'JOKER') return 999;
  const idx = RANKS.indexOf(rank);
  return reversed ? (RANKS.length - 1 - idx) : idx;
}
function nextStrongerRank(gs, rank) {
  const idx = RANKS.indexOf(rank);
  if (effectiveReversed(gs)) return idx > 0 ? RANKS[idx - 1] : null;
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}
function activePlayers(gs) { return gs.players.filter(p => !p.finished); }
function nextActiveRaw(gs, i) {
  const n = gs.players.length; let j = i;
  do { j = (j + 1) % n; } while (gs.players[j].finished);
  return j;
}

/* ============================================================
   JOKER: 階段窓の列挙、自動決定、組み合わせ
   ============================================================ */
function enumerateStraightWindows(realCards, jokerCount) {
  if (realCards.length === 0) return [];
  const suit = realCards[0].suit;
  const realIdxs = [...new Set(realCards.map(c => RANKS.indexOf(c.rank)))].sort((a, b) => a - b);
  if (realIdxs.length !== realCards.length) return [];
  const total = realCards.length + jokerCount;
  if (total < 3) return [];
  const minReal = realIdxs[0], maxReal = realIdxs[realIdxs.length - 1];
  const lowerBound = Math.max(0, maxReal - total + 1);
  const upperBound = Math.min(minReal, RANKS.length - total);
  const results = [];
  for (let start = lowerBound; start <= upperBound; start++) {
    const end = start + total - 1;
    const windowRanks = [];
    for (let i = start; i <= end; i++) windowRanks.push(RANKS[i]);
    const jokerRanks = windowRanks.filter(r => !realCards.some(c => c.rank === r));
    results.push({ suit, straightRanks: windowRanks, jokerRanks });
  }
  return results;
}
function tryBuildStraightWithJokers(realCards, jokerCount) {
  const windows = enumerateStraightWindows(realCards, jokerCount);
  if (windows.length === 0) return null;
  const w = windows[windows.length - 1];
  return { suit: w.suit, straightRanks: w.straightRanks };
}
function kCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = kCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = kCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/* ============================================================
   JOKER assignment 検証(唯一の判定元。候補生成・実プレイどちらもここを通す)
   ============================================================ */
function validateJokerAssignment(selectedJokers, jokerAssignment) {
  if (jokerAssignment === undefined || jokerAssignment === null) return { ok: true, provided: false };
  if (!Array.isArray(jokerAssignment)) return { ok: false };
  if (jokerAssignment.length === 0) return { ok: true, provided: false };
  if (jokerAssignment.some(a => !a || typeof a !== 'object' || typeof a.id !== 'string' || typeof a.rank !== 'string' || (a.suit !== null && typeof a.suit !== 'string'))) return { ok: false };
  const selectedIds = selectedJokers.map(j => j.id);
  const assignIds = jokerAssignment.map(a => a.id);
  if (assignIds.length !== selectedIds.length) return { ok: false };
  if (new Set(assignIds).size !== assignIds.length) return { ok: false };
  for (const id of assignIds) { if (!selectedIds.includes(id)) return { ok: false }; }
  for (const id of selectedIds) { if (!assignIds.includes(id)) return { ok: false }; }
  return { ok: true, provided: true };
}
function validateSetJokerSuits(jokerSuits, realCards) {
  if (jokerSuits.some(s => !SUITS.includes(s))) return false;
  if (jokerSuits.some(s => realCards.some(c => c.suit === s))) return false;
  if (new Set(jokerSuits).size !== jokerSuits.length) return false;
  return true;
}
function validateStraightJokerAssignment(jokerRanksChosen, jokerSuitsChosen, realCards, straightSuit) {
  if (jokerRanksChosen.some(r => !RANKS.includes(r))) return false;
  if (jokerSuitsChosen.some(s => s !== null && s !== undefined && !SUITS.includes(s))) return false;
  if (jokerSuitsChosen.some(s => s !== null && s !== undefined && s !== straightSuit)) return false;
  if (new Set(jokerRanksChosen).size !== jokerRanksChosen.length) return false;
  if (jokerRanksChosen.some(r => realCards.some(c => c.rank === r))) return false;
  return true;
}

/* ============================================================
   合法性判定(唯一の判定元)。禁止上がりの内容による拒否はここでは行わない。
   ============================================================ */
function evaluateSelection(gs, playerIndex, cardIds, jokerAssignment) {
  const player = gs.players[playerIndex];
  const cards = player.hand.filter(c => cardIds.includes(c.id));
  if (cards.length === 0) return { ok: false };
  const jokers = cards.filter(c => c.rank === 'JOKER');
  const realCards = cards.filter(c => c.rank !== 'JOKER');
  const jaCheck = validateJokerAssignment(jokers, jokerAssignment);
  if (!jaCheck.ok) return { ok: false };
  const jaProvided = jaCheck.provided;
  let type, rank, suitsUsed, straightRanks = null;
  let effectiveJokerAssignment = null;

  if (realCards.length === 0) {
    type = 'set'; rank = 'JOKER'; suitsUsed = [];
    if (jokers.length > 0) effectiveJokerAssignment = jokers.map(j => ({ id: j.id, rank: 'JOKER', suit: null }));
  } else {
    const realRanksArr = realCards.map(c => c.rank);
    const allSameRank = realRanksArr.every(r => r === realRanksArr[0]);
    if (allSameRank) {
      type = 'set'; rank = realRanksArr[0];
      let jokerSuits;
      if (jaProvided) {
        jokerSuits = jokers.map(j => jokerAssignment.find(x => x.id === j.id).suit);
        const jokerRanksForCheck = jokers.map(j => jokerAssignment.find(x => x.id === j.id).rank);
        if (jokerRanksForCheck.some(r => r !== realRanksArr[0])) return { ok: false };
        if (!validateSetJokerSuits(jokerSuits, realCards)) return { ok: false };
      } else {
        const usedSuits = realCards.map(c => c.suit);
        const availableSuits = SUITS.filter(s => !usedSuits.includes(s));
        jokerSuits = jokers.map((j, i) => availableSuits[i]);
        if (jokerSuits.some(s => !s)) return { ok: false };
      }
      suitsUsed = [...new Set([...realCards.map(c => c.suit), ...jokerSuits])];
      if (jokers.length > 0) effectiveJokerAssignment = jokers.map((j, i) => ({ id: j.id, rank: realRanksArr[0], suit: jokerSuits[i] }));
    } else {
      const suits = realCards.map(c => c.suit);
      if (!suits.every(s => s === suits[0])) return { ok: false };
      let chosenSuit, chosenRanks, jokerRanksChosen;
      if (jaProvided) {
        jokerRanksChosen = jokers.map(j => jokerAssignment.find(x => x.id === j.id).rank);
        const jokerSuitsChosen = jokers.map(j => jokerAssignment.find(x => x.id === j.id).suit);
        if (!validateStraightJokerAssignment(jokerRanksChosen, jokerSuitsChosen, realCards, suits[0])) return { ok: false };
        const allIdxs = [...realCards.map(c => RANKS.indexOf(c.rank)), ...jokerRanksChosen.map(r => RANKS.indexOf(r))].sort((a, b) => a - b);
        for (let i = 1; i < allIdxs.length; i++) { if (allIdxs[i] !== allIdxs[i - 1] + 1) return { ok: false }; }
        chosenSuit = suits[0];
        chosenRanks = allIdxs.map(i => RANKS[i]);
      } else {
        const built = tryBuildStraightWithJokers(realCards, jokers.length);
        if (!built) return { ok: false };
        chosenSuit = built.suit; chosenRanks = built.straightRanks;
        jokerRanksChosen = chosenRanks.filter(r => !realCards.some(c => c.rank === r));
      }
      type = 'straight'; suitsUsed = [chosenSuit]; straightRanks = chosenRanks;
      rank = straightRanks[straightRanks.length - 1];
      if (jokers.length > 0) effectiveJokerAssignment = jokers.map((j, i) => ({ id: j.id, rank: jokerRanksChosen[i], suit: chosenSuit }));
    }
  }
  const count = cards.length;
  const isSpade3Counter = !!(gs.field && gs.field.count === 1 && gs.field.cards[0].rank === 'JOKER' &&
    count === 1 && cards[0].suit === '♠' && cards[0].rank === '3');
  const isAllJoker = realCards.length === 0;

  if (!isSpade3Counter) {
    if (gs.lockSeq) {
      const okJoker = isAllJoker;
      if (!okJoker && !(count === gs.lockSeq.count && rank === gs.lockSeq.rank && cards.every(c => c.suit && gs.lockSeq.suits.includes(c.suit)))) return { ok: false };
    } else if (gs.lockSuits) {
      if (!isAllJoker && !cards.every(c => c.suit ? gs.lockSuits.includes(c.suit) : true)) return { ok: false };
    }
    if (gs.field !== null) {
      if (gs.field.type !== type) return { ok: false };
      if (gs.field.count !== count) return { ok: false };
      if (currentStrength(gs, rank) <= currentStrength(gs, gs.field.rank)) return { ok: false };
    }
  }

  return { ok: true, type, rank, count, cards, suitsUsed, straightRanks, isSpade3Counter, effectiveJokerAssignment };
}

function evaluateFoulFinish(gs, v, handBeforePlay) {
  const wouldFinish = v.count === handBeforePlay.length;
  if (!wouldFinish) return { isFoul: false, reasons: [] };
  if (v.isSpade3Counter) return { isFoul: false, reasons: [] };
  const reasons = [];
  const ranksInvolved = v.type === 'straight' ? v.straightRanks : [v.rank];
  const containsJokerPhysical = v.cards.some(c => c.rank === 'JOKER');
  if (containsJokerPhysical) reasons.push('joker_finish');
  if (ranksInvolved.includes('8')) reasons.push('eight_finish');
  const revActive = gs.revolutionCount % 2 === 1;
  if (!revActive && ranksInvolved.includes('2')) reasons.push('normal_2_finish');
  if (revActive && ranksInvolved.includes('3')) reasons.push('revolution_3_finish');
  return { isFoul: reasons.length > 0, reasons };
}

/* ============================================================
   縛り・激縛りチェーン
   ============================================================ */
function updateSuitChain(gs, v, reversedAtValidation) {
  let track = null;
  if (v.type === 'straight') track = { kind: 'straight', suits: [v.suitsUsed[0]], rank: v.rank, count: v.count };
  else if (v.type === 'set' && v.suitsUsed.length > 0) track = { kind: 'set', suits: v.suitsUsed.slice().sort(), rank: v.rank, count: v.count };

  const isPureJokerSingle = v.type === 'set' && v.rank === 'JOKER' && v.count === 1;
  if (isPureJokerSingle && gs.lockSeq) {
    gs.lockSeq = { suits: ['♠'], rank: '3', count: 1 };
    gs.lockSuits = ['♠'];
    gs.log += '(JOKERで激縛りを継続!次は♠3のみ)';
    gs.prevTrack = null;
    return;
  }

  if (track && gs.prevTrack && gs.prevTrack.kind === track.kind && gs.prevTrack.count === track.count &&
    gs.prevTrack.suits.join('') === track.suits.join('')) {
    const sequential = track.kind === 'set' &&
      strengthWithReversal(track.rank, reversedAtValidation) === strengthWithReversal(gs.prevTrack.rank, reversedAtValidation) + 1;
    const suitLabel = track.suits.join('');
    if (sequential) {
      const nextRank = nextStrongerRank(gs, track.rank);
      if (nextRank) {
        gs.lockSeq = { suits: track.suits, rank: nextRank, count: track.count };
        gs.lockSuits = track.suits.slice();
        const shape = track.count > 1 ? `の${track.count}枚組` : '';
        gs.log += `(激縛り発動!次は${suitLabel}${nextRank}${shape}かJOKERしか出せません)`;
      } else { gs.lockSuits = track.suits.slice(); gs.lockSeq = null; gs.log += `(マーク縛り発動!次は${suitLabel}のみ)`; }
    } else if (!gs.lockSeq) { gs.lockSuits = track.suits.slice(); gs.log += `(マーク縛り発動!次は${suitLabel}のみ)`; }
  }
  gs.prevTrack = track;
}

function clearFieldStateKeepScore(gs) {
  gs.field = null; gs.fieldOwner = null;
  gs.lockSuits = null; gs.lockSeq = null; gs.prevTrack = null;
  gs.passedThisField = new Set();
  gs.tempReversed = false;
  gs.trickHistory = [];
}

function advance(gs, fromIndex, { tobiSteps = 1 } = {}) {
  let i = fromIndex;
  for (let s = 0; s < tobiSteps; s++) i = nextActiveRaw(gs, i);
  const owner = gs.fieldOwner;
  const ownerActive = owner !== null && owner !== undefined && !gs.players[owner].finished;
  // 場の所有者以外に、まだこのトリックへ応答していないアクティブプレイヤーがいるか
  // (所有者自身が上がり/反則で非アクティブになっていても正しく判定できる形にする)
  const othersStillToAct = gs.players.some((p, idx) => !p.finished && idx !== owner && !gs.passedThisField.has(idx));
  if (!othersStillToAct) {
    clearFieldStateKeepScore(gs);
    gs.currentIndex = ownerActive ? owner : i;
  } else {
    while (i !== owner && gs.passedThisField.has(i)) i = nextActiveRaw(gs, i);
    gs.currentIndex = i;
  }
  gs.selected = [];
}

function currentRate(gs) { return Math.pow(2, gs.revolutionCount) * gs.foulRateMultiplier; }

// ラウンド終了判定: アクティブ(未上がり・未反則)なプレイヤーが1人以下になったら終了。
// 反則者が出たこと自体はラウンド終了理由にならない(呼び出し元がこの関数を都度呼んで判定する)。
function finalizeRoundIfEnded(gs) {
  const remaining = activePlayers(gs);
  if (remaining.length > 1) return false;
  if (remaining.length === 1) {
    const idx = gs.players.indexOf(remaining[0]);
    gs.players[idx].finished = true;
    gs.finishOrder.push(idx);
  }
  // 反則者は最下位側(finishOrderの末尾)へ。先に反則したプレイヤーほど下位になるよう、発生順を逆にして追加する。
  gs.foulOrder.slice().reverse().forEach(idx => gs.finishOrder.push(idx));
  if (gs.pendingFoulPenalties.length > 0) {
    applyPendingFoulPenaltiesToWinner(gs);
  } else {
    calculateRoundScore(gs);
  }
  gs.phase = 'result';
  return true;
}
function calculateRoundScore(gs) {
  const n = gs.players.length;
  const winnerIdx = gs.finishOrder[0];
  const loserIdx = gs.finishOrder[n - 1];
  const loserHand = gs.players[loserIdx].hand.length;
  const multiplier = Math.pow(2, gs.revolutionCount);
  const points = loserHand * 100 * multiplier;
  gs.players[loserIdx].score -= points;
  gs.players[winnerIdx].score += points;
  gs.lastRoundPoints = points;
}
// 反則者ごとに直前に減点した分と同額を、そのラウンドの最終的な勝者(finishOrder[0])へ合算して加算する。
// pendingFoulPenaltiesはラウンド終了時に一度だけ消費され、二重精算はしない。
function applyPendingFoulPenaltiesToWinner(gs) {
  const winnerIdx = gs.finishOrder[0];
  let total = 0;
  gs.pendingFoulPenalties.forEach(p => { total += p.penaltyPoints; });
  gs.players[winnerIdx].score += total;
  gs.lastRoundPoints = total;
}

// 反則者を即座に脱落させ、その時点のレートを2倍にしたうえで反則Ptを減点する。
// ラウンドは終了しない(finalizeRoundIfEndedがアクティブ人数を見て判断する)。戻り値: ラウンドが終了したか。
function commitFoulPenalty(gs, actorIndex, reasonText, foulCardCountAtFoul) {
  gs.effectQueue = [];
  gs.pendingAfterQueue = null;
  const rateBefore = currentRate(gs);
  gs.foulRateMultiplier *= 2;
  const rateAfter = currentRate(gs);
  const penaltyPoints = foulCardCountAtFoul * 100 * rateAfter;
  gs.players[actorIndex].score -= penaltyPoints;
  gs.players[actorIndex].finished = true;
  gs.players[actorIndex].fouled = true;
  gs.foulOrder.push(actorIndex);
  gs.pendingFoulPenalties.push({ playerId: actorIndex, reason: reasonText, cardCountAtFoul: foulCardCountAtFoul, rateBefore, rateAfter, penaltyPoints });
  gs.foulPenalty = { name: gs.players[actorIndex].name, amount: penaltyPoints, reason: reasonText, cardCount: foulCardCountAtFoul, rate: rateAfter };
  gs.log = `⚠️ ${gs.players[actorIndex].name} が${reasonText}で反則!(-${penaltyPoints}pt, レート${rateAfter}倍) ラウンドは継続します`;
  return finalizeRoundIfEnded(gs);
}

/* ============================================================
   プレイの適用
   ============================================================ */
function applyPlay(gs, playerIndex, cardIds, jokerAssignment) {
  const v = evaluateSelection(gs, playerIndex, cardIds, jokerAssignment);
  if (!v.ok) return false;
  const player = gs.players[playerIndex];
  const handBeforePlay = player.hand.slice();
  const reversedAtValidation = effectiveReversed(gs);
  player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  gs.field = { type: v.type, rank: v.rank, count: v.count, cards: v.cards, suitsUsed: v.suitsUsed, jokerAssignment: v.effectiveJokerAssignment || null };
  gs.fieldOwner = playerIndex;
  gs.selected = [];
  gs.trickHistory.push({
    type: v.type, rank: v.rank, count: v.count, cards: v.cards, suitsUsed: v.suitsUsed, jokerAssignment: v.effectiveJokerAssignment || null,
    straightRanks: v.straightRanks, name: player.name, playerIndex, kind: 'play'
  });

  let logMsg = `${player.name} が ${describePlay(v)} を出した`;
  let effects = [];
  if (v.type === 'set') effects.push({ rank: v.rank, count: v.count });
  else v.straightRanks.forEach(r => { if (EFFECT_RANKS.includes(r) || r === '8') effects.push({ rank: r, count: 1 }); });

  if (v.count >= 4) {
    gs.revolutionCount++;
    logMsg += `(革命!累計${gs.revolutionCount}回)`;
  }

  let cutFlag = false, tobiSteps = 0;
  const queue = [];
  ['6', 'J', '7', '10', '5', '8'].forEach(r => {
    const e = effects.find(x => x.rank === r);
    if (!e) return;
    if (r === '6') { gs.lockSuits = v.suitsUsed.slice(); gs.lockSeq = null; logMsg += `(6ロック発動!次は${gs.lockSuits.join('/')}のみ)`; }
    if (r === 'J') { gs.tempReversed = !gs.tempReversed; logMsg += '(強さ反転)'; }
    if (r === '7') { queue.push({ type: 'give', n: e.count }); }
    if (r === '10') { queue.push({ type: 'discard', n: e.count }); }
    if (r === '5') {
      const skipAmount = 2 * e.count - 1;
      const otherActiveCount = gs.players.filter((p, i) => i !== playerIndex && !p.finished).length;
      if (skipAmount >= otherActiveCount) { cutFlag = true; logMsg += '(5飛び!全員飛ばされたので場が流れます)'; }
      else { tobiSteps += skipAmount + 1; logMsg += '(5飛び)'; }
    }
    if (r === '8') { cutFlag = true; logMsg += '(8切り)'; }
  });
  if (v.isSpade3Counter) { cutFlag = true; tobiSteps = 0; logMsg += '(スペ3でジョーカーを撃破!ターン終了)'; }
  updateSuitChain(gs, v, reversedAtValidation);

  const finishedNow = player.hand.length === 0;
  if (finishedNow) {
    const contentFoul = evaluateFoulFinish(gs, v, handBeforePlay);
    const unfulfillableGiveDiscard = queue.length > 0;
    const foulReasons = [...contentFoul.reasons];
    if (unfulfillableGiveDiscard) foulReasons.push(...queue.map(q => q.type === 'give' ? 'seven_unfulfilled' : 'ten_unfulfilled'));
    if (foulReasons.length > 0) {
      gs.log = logMsg;
      const reasonText = foulReasons.includes('seven_unfulfilled') || foulReasons.includes('ten_unfulfilled')
        ? queue.map(q => q.type === 'give' ? '7渡し' : '10捨て').join('・')
        : '禁止上がり(' + foulReasons.join('・') + ')';
      const roundEnded = commitFoulPenalty(gs, playerIndex, reasonText, v.count);
      if (!roundEnded) advance(gs, playerIndex, { tobiSteps: 1 }); // 反則者を除外して残りプレイヤーで続行
      return true;
    }
    player.finished = true; gs.finishOrder.push(playerIndex);
    logMsg += ` → ${player.name}が上がりました!`;
  }
  gs.log = logMsg;

  gs.pendingFoulPlayCount = v.count;

  if (finishedNow) {
    if (finalizeRoundIfEnded(gs)) return true;
    advance(gs, playerIndex, { tobiSteps: 1 }); // 上がったカードは場に残したまま、次のアクティブプレイヤーへ
    return true;
  }

  if (cutFlag) gs.pendingAfterQueue = { mode: 'cut', owner: playerIndex };
  else if (tobiSteps > 0) gs.pendingAfterQueue = { mode: 'tobi', from: playerIndex, steps: tobiSteps };
  else gs.pendingAfterQueue = { mode: 'normal', from: playerIndex };

  gs.effectQueue = queue;
  processNextQueueItem(gs, playerIndex);
  return true;
}

function resolveTurnFlow(gs) {
  const paq = gs.pendingAfterQueue; gs.pendingAfterQueue = null;
  if (!paq) return;
  if (paq.mode === 'cut') { clearFieldStateKeepScore(gs); gs.currentIndex = paq.owner; gs.selected = []; }
  else if (paq.mode === 'tobi') advance(gs, paq.from, { tobiSteps: paq.steps });
  else advance(gs, paq.from, { tobiSteps: 1 });
}
function processNextQueueItem(gs, actorIndex) {
  if (gs.effectQueue.length === 0) { resolveTurnFlow(gs); return; }
  const item = gs.effectQueue.shift();
  const player = gs.players[actorIndex];
  if (player.hand.length < item.n) {
    const roundEnded = commitFoulPenalty(gs, actorIndex, item.type === 'give' ? '7渡し' : '10捨て', gs.pendingFoulPlayCount);
    if (!roundEnded) advance(gs, actorIndex, { tobiSteps: 1 });
    return;
  }
  gs.pendingAction = item.type; gs.pendingCount = item.n; gs.pendingActor = actorIndex;
  gs.selected = [];
  gs.phase = item.type;
}
function resolveGiveDiscardCore(gs, actorIndex, type, ids) {
  const player = gs.players[actorIndex];
  const chosen = player.hand.filter(c => ids.includes(c.id));
  player.hand = player.hand.filter(c => !ids.includes(c.id));
  if (type === 'give') {
    const nextIdx = nextActiveRaw(gs, actorIndex);
    gs.players[nextIdx].hand = gs.players[nextIdx].hand.concat(chosen);
    gs.log += ` / ${player.name}が${chosen.length}枚渡した`;
  } else {
    gs.log += ` / ${player.name}が${chosen.length}枚捨てた`;
  }
  gs.pendingAction = null; gs.pendingCount = 0; gs.pendingActor = null; gs.selected = [];
  if (player.hand.length === 0 && !player.finished) {
    player.finished = true; gs.finishOrder.push(actorIndex);
    gs.log += ` → ${player.name}が上がりました!`;
    if (finalizeRoundIfEnded(gs)) return true;
    gs.effectQueue = [];
    gs.pendingAfterQueue = null;
    gs.phase = 'playing';
    advance(gs, actorIndex, { tobiSteps: 1 }); // 上がったカードは場に残したまま、次のアクティブプレイヤーへ
    return true;
  }
  gs.phase = 'playing';
  return false;
}
function confirmGiveDiscard(gs, actorIndex, ids) {
  if (gs.pendingActor !== actorIndex) return false;
  if (ids.length !== gs.pendingCount) return false;
  const type = gs.pendingAction;
  const finished = resolveGiveDiscardCore(gs, actorIndex, type, ids);
  if (!finished) processNextQueueItem(gs, actorIndex);
  if (gs.phase !== 'result' && gs.phase !== 'give' && gs.phase !== 'discard') gs.phase = 'playing';
  return true;
}
function passTurn(gs, idx) {
  if (gs.field === null) return false;
  if (gs.currentIndex !== idx) return false;
  gs.passedThisField.add(idx);
  gs.log = `${gs.players[idx].name} がパス`;
  gs.trickHistory.push({ kind: 'pass', name: gs.players[idx].name, playerIndex: idx });
  advance(gs, idx, { tobiSteps: 1 });
  return true;
}
function playCards(gs, idx, cardIds, jokerAssignment) {
  if (gs.currentIndex !== idx) return { ok: false, error: 'not_your_turn' };
  const v = evaluateSelection(gs, idx, cardIds, jokerAssignment);
  if (!v.ok) return { ok: false, error: v.reason || 'invalid' };
  applyPlay(gs, idx, cardIds, jokerAssignment);
  return { ok: true };
}
function describePlay(v) {
  if (v.type === 'straight') return `${v.suitsUsed[0]}${v.straightRanks.join('-')}の階段`;
  const label = v.rank === 'JOKER' ? 'JOKER' : v.rank;
  return v.count === 1 ? label : `${label}×${v.count}`;
}

/* ============================================================
   候補生成
   ============================================================ */
function generateCandidates(hand) {
  const candidates = [];
  const byRank = {};
  hand.forEach(c => { (byRank[c.rank] = byRank[c.rank] || []).push(c); });
  Object.values(byRank).forEach(group => { for (let k = 1; k <= group.length; k++) candidates.push(group.slice(0, k)); });
  const bySuit = {};
  hand.forEach(c => { if (c.suit) (bySuit[c.suit] = bySuit[c.suit] || []).push(c); });
  Object.values(bySuit).forEach(cards => {
    const sorted = cards.slice().sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
    let run = [sorted[0]];
    const flush = (run) => { if (run.length >= 3) { for (let len = 3; len <= run.length; len++) for (let start = 0; start + len <= run.length; start++) candidates.push(run.slice(start, start + len)); } };
    for (let i = 1; i < sorted.length; i++) {
      if (RANKS.indexOf(sorted[i].rank) === RANKS.indexOf(sorted[i - 1].rank) + 1) run.push(sorted[i]);
      else { flush(run); run = [sorted[i]]; }
    }
    flush(run);
  });
  return candidates;
}

/* ============================================================
   JOKER代替候補: 責務ごとに分離
   ============================================================ */
function enumerateRawJokerCandidates(hand, cardIds) {
  const cards = hand.filter(c => cardIds.includes(c.id));
  const jokers = cards.filter(c => c.rank === 'JOKER');
  const realCards = cards.filter(c => c.rank !== 'JOKER');
  if (jokers.length === 0 || realCards.length === 0) return [];
  const realRanksArr = realCards.map(c => c.rank);
  const allSameRank = realRanksArr.every(r => r === realRanksArr[0]);
  const raw = [];
  if (allSameRank) {
    const usedSuits = realCards.map(c => c.suit);
    const availableSuits = SUITS.filter(s => !usedSuits.includes(s));
    const combos = kCombinations(availableSuits, jokers.length);
    combos.forEach(comboSuits => {
      const assignment = jokers.map((j, i) => ({ id: j.id, suit: comboSuits[i], rank: realRanksArr[0] }));
      raw.push({ type: 'set', assignment, previewSuitsUsed: [...new Set([...usedSuits, ...comboSuits])].sort(), previewRank: realRanksArr[0] });
    });
  } else {
    const suits = realCards.map(c => c.suit);
    if (!suits.every(s => s === suits[0])) return [];
    const windows = enumerateStraightWindows(realCards, jokers.length);
    windows.forEach(w => {
      const assignment = jokers.map((j, i) => ({ id: j.id, suit: w.suit, rank: w.jokerRanks[i] }));
      raw.push({ type: 'straight', assignment, previewSuitsUsed: [w.suit], previewRank: w.straightRanks[w.straightRanks.length - 1], previewStraightRanks: w.straightRanks });
    });
  }
  return raw;
}
function candidateSignature(cand) {
  if (cand.type === 'straight') return `straight:${cand.previewSuitsUsed[0]}:${cand.previewStraightRanks.join('-')}`;
  return `set:${cand.previewRank}:${cand.previewSuitsUsed.slice().sort().join(',')}`;
}
function dedupeCandidates(rawList) {
  const seen = new Set();
  const out = [];
  rawList.forEach(c => {
    const sig = candidateSignature(c);
    if (!seen.has(sig)) { seen.add(sig); out.push(c); }
  });
  return out;
}
function filterLegalCandidates(gs, playerIndex, cardIds, candidates) {
  return candidates
    .map(c => ({ ...c, evalResult: evaluateSelection(gs, playerIndex, cardIds, c.assignment) }))
    .filter(c => c.evalResult.ok);
}
function labelForCandidate(cand) {
  if (cand.type === 'straight') {
    const jokerRanksLabel = cand.assignment.map(a => a.suit + a.rank).join('・');
    return `JOKERを${jokerRanksLabel}として使う(完成形: ${cand.previewSuitsUsed[0]}${cand.previewStraightRanks.join('-')})`;
  }
  const jokerLabel = cand.assignment.map(a => a.suit + a.rank).join('・');
  return `JOKERを${jokerLabel}として使う`;
}
function getJokerChoices(gs, playerIndex, cardIds) {
  const player = gs.players[playerIndex];
  const raw = enumerateRawJokerCandidates(player.hand, cardIds);
  if (raw.length === 0) return null;
  const deduped = dedupeCandidates(raw);
  const legal = filterLegalCandidates(gs, playerIndex, cardIds, deduped);
  if (legal.length <= 1) return null;
  return legal.map(c => ({ label: labelForCandidate(c), assignment: c.assignment }));
}
function cpuChooseJokerAssignment(gs, playerIndex, cardIds) {
  const player = gs.players[playerIndex];
  const raw = dedupeCandidates(enumerateRawJokerCandidates(player.hand, cardIds));
  const legal = filterLegalCandidates(gs, playerIndex, cardIds, raw);
  if (legal.length === 0) return null;
  const remainingAfterPlay = player.hand.filter(c => !cardIds.includes(c.id));
  const suitCounts = {}; SUITS.forEach(s => suitCounts[s] = 0);
  remainingAfterPlay.forEach(c => { if (c.suit) suitCounts[c.suit]++; });
  let best = null, bestScore = Infinity;
  legal.forEach(cand => {
    const v = cand.evalResult;
    let score = currentStrength(gs, v.rank);
    const suitPenalty = cand.assignment.reduce((s, a) => s + (suitCounts[a.suit] || 0), 0);
    score += suitPenalty * 0.01;
    if (score < bestScore) { bestScore = score; best = cand; }
  });
  return best ? best.assignment : null;
}

/* ============================================================
   ラウンド管理
   ============================================================ */
function rankLabels(n) {
  if (n <= 1) return ['大富豪'];
  if (n === 2) return ['大富豪', '大貧民'];
  if (n === 3) return ['大富豪', '平民', '大貧民'];
  const labels = ['大富豪', '富豪'];
  for (let i = 0; i < n - 4; i++) labels.push('平民');
  labels.push('貧民', '大貧民');
  return labels;
}
function dealRound(gs) {
  const deck = shuffle(buildDeck());
  const n = gs.players.length;
  gs.players.forEach(p => { p.hand = []; p.finished = false; p.fouled = false; });
  deck.forEach((c, i) => gs.players[i % n].hand.push(c));
  gs.players.forEach(p => p.hand = sortHand(p.hand));
  let starter = 0;
  gs.players.forEach((p, i) => { if (p.hand.some(c => c.suit === '♦' && c.rank === '3')) starter = i; });
  gs.currentIndex = starter;
  gs.field = null; gs.fieldOwner = null;
  gs.lockSuits = null; gs.lockSeq = null; gs.prevTrack = null;
  gs.passedThisField = new Set();
  gs.revolutionCount = 0; gs.tempReversed = false;
  gs.finishOrder = []; gs.selected = [];
  gs.trickHistory = [];
  gs.log = `ダイヤの3を持つ ${gs.players[starter].name} から開始`;
  gs.pendingAction = null; gs.pendingCount = 0; gs.pendingActor = null; gs.effectQueue = []; gs.pendingAfterQueue = null;
  gs.foulPenalty = null;
  gs.foulRateMultiplier = 1;
  gs.pendingFoulPenalties = [];
  gs.foulOrder = [];
  gs.phase = 'playing';
}
function createGameState(playersMeta) {
  const gs = {
    phase: 'playing',
    roundNumber: 1,
    players: playersMeta.map(p => ({ name: p.name, hand: [], finished: false, fouled: false, score: 0 })),
    currentIndex: 0, field: null, fieldOwner: null,
    lockSuits: null, lockSeq: null, prevTrack: null,
    passedThisField: new Set(),
    revolutionCount: 0, tempReversed: false,
    finishOrder: [], selected: [], log: '',
    pendingAction: null, pendingCount: 0, pendingActor: null, effectQueue: [], pendingAfterQueue: null,
    lastRoundPoints: 0, trickHistory: [], foulPenalty: null,
    pendingFoulPlayCount: 0,
    foulRateMultiplier: 1, pendingFoulPenalties: [], foulOrder: [],
  };
  dealRound(gs);
  return gs;
}

module.exports = {
  buildDeck, shuffle, sortHand, isRed, RANKS, SUITS,
  evaluateSelection, evaluateFoulFinish, describePlay, playCards, passTurn, confirmGiveDiscard,
  dealRound, createGameState, rankLabels, calculateRoundScore,
  getJokerChoices, cpuChooseJokerAssignment, generateCandidates,
};
