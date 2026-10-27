// 大富豪 オンライン対戦サーバー(依存パッケージなし)
// 起動: node server.js  (デフォルトで http://localhost:3000)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const engine = require('./engine');

const PORT = process.env.PORT || 3000;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6時間操作がなければルームを自動破棄

/** @type {Object<string, Room>} */
const rooms = {};

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字(0,O,1,I)を除外
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}
function makeToken() { return crypto.randomBytes(16).toString('hex'); }

/* ============================================================
   オンラインマッチング(ルームコードなし)
   - 4人そろったら即開始 / 2人以上で一定時間待ったらその人数で開始
   - ロビーで放置(pollが止まった)プレイヤーは自動で外れる
   ============================================================ */
const MATCH_SIZE = 4;
const MATCH_WAIT_MS = 20000;   // 2人以上そろってからの最大待ち時間
const LOBBY_STALE_MS = 8000;   // この時間pollが無ければロビーから外す

function createRoom() {
  const code = makeRoomCode();
  const room = {
    code,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    phase: 'lobby', // 'lobby' | 'playing'
    players: [],
    readyAt: null,  // 2人以上になった時刻
    gs: null,
    rules: engine.normalizeRules(null), // マッチングでは標準ルール(全ON)固定
  };
  rooms[code] = room;
  return room;
}
function renumber(room) { room.players.forEach((p, i) => { p.id = i; }); }
function findOpenRoom() {
  tickAllLobbies();
  return Object.values(rooms).find(r => r.phase === 'lobby' && r.players.length < MATCH_SIZE) || null;
}
function enqueue(name) {
  const room = findOpenRoom() || createRoom();
  const id = room.players.length;
  const token = makeToken();
  let base = name || `Player`, uniq = base, k = 2;
  while (room.players.some(p => p.name === uniq)) uniq = `${base} ${k++}`;
  name = uniq;
  room.players.push({ id, token, name, connected: true, lastPoll: Date.now() });
  room.lastActivity = Date.now();
  tickLobby(room);
  return { room, id, token };
}
function findPlayer(room, token) {
  return room.players.find(p => p.token === token) || null;
}
function removePlayer(room, player) {
  room.players = room.players.filter(p => p !== player);
  renumber(room);
  if (room.players.length === 0 && room.phase === 'lobby') delete rooms[room.code];
}
function tickLobby(room) {
  if (room.phase !== 'lobby') return;
  const now = Date.now();
  room.players.filter(p => now - p.lastPoll > LOBBY_STALE_MS).forEach(p => removePlayer(room, p));
  if (!rooms[room.code]) return;
  if (room.players.length >= 2) { if (!room.readyAt) room.readyAt = now; } else room.readyAt = null;
  const full = room.players.length >= MATCH_SIZE;
  const waited = room.readyAt && now - room.readyAt >= MATCH_WAIT_MS;
  if (full || waited) {
    room.phase = 'playing';
    room.gs = engine.createGameState(room.players.map(p => ({ name: p.name })), room.rules);
  }
}
function tickAllLobbies() {
  Object.values(rooms).forEach(r => { if (r.phase === 'lobby') tickLobby(r); });
}
setInterval(tickAllLobbies, 3000);

/* ============================================================
   接続状態の管理・AFK(放置)自動進行
   ============================================================ */
const POLL_STALE_MS = 6000;   // これだけpollが来なければ「切断」とみなして表示する
const AFK_TIMEOUT_MS = 20000; // これだけ操作がなければ、そのプレイヤーの手番を自動で進める

function updateConnectionStatus(room) {
  const now = Date.now();
  room.players.forEach(p => { p.connected = (now - p.lastPoll) < POLL_STALE_MS; });
}

// 手番のプレイヤーが長時間操作していない場合、ゲームが止まったままにならないよう自動で進める。
// パスできる場面ではパス、リード(場が空)の場面では出せる中で最も弱い手を出す。
function autoAdvanceIfAfk(room) {
  if (room.phase !== 'playing' || !room.gs) return;
  updateConnectionStatus(room);
  const gs = room.gs;
  const now = Date.now();
  const isAfk = (idx) => {
    const p = room.players[idx];
    return p && (now - p.lastPoll) >= AFK_TIMEOUT_MS;
  };

  let guard = 0; // 連続してAFK進行が起きても無限ループにならないようにする安全弁
  while (guard < 20) {
    guard++;
    if (gs.phase === 'playing') {
      const idx = gs.currentIndex;
      if (!isAfk(idx)) break;
      if (gs.field !== null) {
        engine.passTurn(gs, idx);
      } else {
        const hand = gs.players[idx].hand;
        let played = false;
        for (const c of hand) {
          if (engine.playCards(gs, idx, [c.id]).ok) { played = true; break; }
        }
        if (!played) {
          const candidates = engine.generateCandidates(hand);
          for (const arr of candidates) {
            if (engine.playCards(gs, idx, arr.map(c => c.id)).ok) { played = true; break; }
          }
        }
        if (!played) break; // 万一出せる手が見つからない場合は何もしない(通常起こらない)
      }
    } else if (gs.phase === 'give' || gs.phase === 'discard') {
      const idx = gs.pendingActor;
      if (!isAfk(idx)) break;
      const need = gs.pendingCount;
      const ids = gs.players[idx].hand.slice(0, need).map(c => c.id);
      engine.confirmGiveDiscard(gs, idx, ids);
    } else {
      break; // 'result' 等はAFK進行の対象外
    }
    if (gs.phase === 'result') break;
  }
}

function serializeForPlayer(room, viewerId) {
  const base = {
    roomCode: room.code,
    phase: room.phase,
    lobbyPlayers: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    youId: viewerId,
    rules: room.rules,
    matchSize: MATCH_SIZE,
    matchSecondsLeft: (room.phase === 'lobby' && room.readyAt) ? Math.max(0, Math.ceil((MATCH_WAIT_MS - (Date.now() - room.readyAt)) / 1000)) : null,
  };
  if (room.phase === 'lobby' || !room.gs) return base;
  const gs = room.gs;
  base.roundNumber = gs.roundNumber;
  base.currentIndex = gs.currentIndex;
  base.field = gs.field;
  base.lockSuits = gs.lockSuits;
  base.lockSeq = gs.lockSeq;
  base.revolutionCount = gs.revolutionCount;
  base.tempReversed = gs.tempReversed;
  base.direction = gs.direction;
  base.log = gs.log;
  base.trickHistory = gs.trickHistory;
  base.finishOrder = gs.finishOrder;
  base.lastRoundPoints = gs.lastRoundPoints;
  base.foulPenalty = gs.foulPenalty;
  base.foulRateMultiplier = gs.foulRateMultiplier;
  base.pendingFoulPenalties = gs.pendingFoulPenalties;
  base.gamePhase = gs.phase; // 'playing' | 'give' | 'discard' | 'result'
  base.pendingAction = gs.pendingAction;
  base.pendingCount = gs.pendingCount;
  base.pendingActor = gs.pendingActor;
  base.players = gs.players.map((p, i) => ({
    name: p.name,
    score: p.score,
    finished: p.finished,
    fouled: p.fouled,
    handCount: p.hand.length,
    hand: i === viewerId ? p.hand : undefined,
    connected: room.players[i] ? room.players[i].connected : true,
  }));
  return base;
}

function touchRoom(room) { room.lastActivity = Date.now(); }

function cleanupOldRooms() {
  const now = Date.now();
  Object.keys(rooms).forEach(code => {
    if (now - rooms[code].lastActivity > ROOM_TTL_MS) delete rooms[code];
  });
}
setInterval(cleanupOldRooms, 30 * 60 * 1000);

/* ============================================================
   HTTPハンドラ
   ============================================================ */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // ---- API ----
  if (url.pathname === '/api/match' && req.method === 'POST') {
    try {
      const { name } = await readBody(req);
      const result = enqueue(String(name || '').trim().slice(0, 20));
      return sendJson(res, 200, { roomCode: result.room.code, playerId: result.id, token: result.token });
    } catch (e) { return sendJson(res, 400, { error: 'bad_request' }); }
  }

  if (url.pathname === '/api/leave' && req.method === 'POST') {
    try {
      const { roomCode, token } = await readBody(req);
      const room = rooms[(roomCode || '').toUpperCase()];
      const player = room && findPlayer(room, token);
      if (room && player) {
        if (room.phase === 'lobby') removePlayer(room, player);
        else player.lastPoll = 0; // ゲーム中の退出は放置扱い(AFK自動進行に任せる)
      }
      return sendJson(res, 200, { ok: true });
    } catch (e) { return sendJson(res, 400, { error: 'bad_request' }); }
  }

  if (url.pathname === '/api/state' && req.method === 'GET') {
    const roomCode = (url.searchParams.get('roomCode') || '').toUpperCase();
    const token = url.searchParams.get('token');
    const room = rooms[roomCode];
    if (!room) return sendJson(res, 404, { error: 'no_room' });
    const player = findPlayer(room, token);
    if (!player) return sendJson(res, 403, { error: 'bad_token' });
    player.connected = true; player.lastPoll = Date.now();
    tickLobby(room);
    autoAdvanceIfAfk(room);
    return sendJson(res, 200, serializeForPlayer(room, player.id));
  }

  if (url.pathname === '/api/jokerChoices' && req.method === 'POST') {
    try {
      const { roomCode, token, cardIds } = await readBody(req);
      const room = rooms[(roomCode || '').toUpperCase()];
      if (!room) return sendJson(res, 404, { error: 'no_room' });
      const player = findPlayer(room, token);
      if (!player) return sendJson(res, 403, { error: 'bad_token' });
      const playerId = player.id;
      if (!room.gs) return sendJson(res, 400, { error: 'not_started' });
      if (room.gs.currentIndex !== playerId) return sendJson(res, 400, { error: 'not_your_turn' });
      const ids = Array.isArray(cardIds) ? cardIds.filter(x => typeof x === 'string') : [];
      const hand = room.gs.players[playerId] ? room.gs.players[playerId].hand : [];
      const ownsAll = ids.length > 0 && ids.every(id => hand.some(c => c.id === id));
      if (!ownsAll) return sendJson(res, 200, { choices: [] });
      // 読み取り専用: engine.getJokerChoices のみを使用し、状態は一切変更しない
      const choices = engine.getJokerChoices(room.gs, playerId, ids) || [];
      return sendJson(res, 200, { choices });
    } catch (e) { return sendJson(res, 400, { error: 'bad_request' }); }
  }

  if (url.pathname === '/api/action' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { roomCode, token, action } = body;
      const room = rooms[(roomCode || '').toUpperCase()];
      if (!room) return sendJson(res, 404, { error: 'no_room' });
      const player = findPlayer(room, token);
      if (!player) return sendJson(res, 403, { error: 'bad_token' });
      const playerId = player.id;
      touchRoom(room);
      player.connected = true; player.lastPoll = Date.now();
      autoAdvanceIfAfk(room); // 自分より前に他の誰かがAFKで止まっていないか、先に進めておく

      const result = handleAction(room, playerId, action || {});
      if (result && result.error) return sendJson(res, 400, { error: result.error });
      autoAdvanceIfAfk(room); // 自分のアクションの結果、次の手番がAFKなら続けて進める
      return sendJson(res, 200, serializeForPlayer(room, playerId));
    } catch (e) {
      return sendJson(res, 500, { error: 'server_error', detail: String(e && e.message || e) });
    }
  }

  // ---- static files ----
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, 'public', filePath);
  if (!filePath.startsWith(path.join(__dirname, 'public'))) { res.writeHead(403); return res.end(); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

function handleAction(room, playerId, action) {
  if (!room.gs) return { error: 'not_started' };
  const gs = room.gs;

  if (action.type === 'play') {
    if (gs.phase !== 'playing') return { error: 'not_playable_now' };
    const cardIds = Array.isArray(action.cardIds) ? action.cardIds.filter(x => typeof x === 'string') : [];
    let jokerAssignment;
    if (action.jokerAssignment !== undefined && action.jokerAssignment !== null) {
      if (!Array.isArray(action.jokerAssignment)) return { error: 'invalid' };
      const clean = [];
      for (const a of action.jokerAssignment) {
        if (!a || typeof a !== 'object') return { error: 'invalid' };
        if (typeof a.id !== 'string' || typeof a.rank !== 'string') return { error: 'invalid' };
        if (a.suit !== null && typeof a.suit !== 'string') return { error: 'invalid' };
        clean.push({ id: a.id, rank: a.rank, suit: a.suit });
      }
      jokerAssignment = clean;
    }
    // engine.playCards(→evaluateSelection)が唯一の合法性判定の場。ここでJOKER判定を重複実装しない。
    const r = engine.playCards(gs, playerId, cardIds, jokerAssignment);
    return r.ok ? { ok: true } : { error: r.error };
  }
  if (action.type === 'pass') {
    if (gs.phase !== 'playing') return { error: 'not_playable_now' };
    const ok = engine.passTurn(gs, playerId);
    return ok ? { ok: true } : { error: 'cannot_pass' };
  }
  if (action.type === 'giveDiscard') {
    if (gs.phase !== 'give' && gs.phase !== 'discard') return { error: 'not_pending' };
    const ok = engine.confirmGiveDiscard(gs, playerId, action.cardIds || []);
    return ok ? { ok: true } : { error: 'cannot_confirm' };
  }
  if (action.type === 'nextRound') {
    if (gs.phase !== 'result') return { error: 'not_result' };
    gs.roundNumber++;
    engine.dealRound(gs);
    return { ok: true };
  }
  return { error: 'unknown_action' };
}

server.listen(PORT, () => {
  console.log(`大富豪オンラインサーバー起動: http://localhost:${PORT}`);
});
