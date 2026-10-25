// Random-play simulation for every rule toggle (usage: node tools/rules-sim.js)
const E = require('../engine');
function playGame(rules) {
  const gs = E.createGameState([{name:'A'},{name:'B'},{name:'C'},{name:'D'}], rules);
  let steps = 0;
  while (gs.phase !== 'roundEnd' && gs.phase !== 'result' && steps++ < 4000) {
    if (gs.phase === 'give' || gs.phase === 'discard') {
      const p = gs.players[gs.pendingActor];
      E.confirmGiveDiscard(gs, gs.pendingActor, p.hand.slice(0, gs.pendingCount).map(c => c.id)); continue;
    }
    if (gs.phase !== 'playing') break;
    const i = gs.currentIndex, hand = gs.players[i].hand;
    const legal = [];
    E.generateCandidates(hand).forEach(cs => {
      const ids = cs.map(c => c.id);
      const jc = E.getJokerChoices(gs, i, ids);
      const asg = jc ? jc[0].assignment : null;
      const r = E.evaluateSelection(gs, i, ids, asg);
      if (r.ok) legal.push({ ids, asg });
    });
    if (legal.length && Math.random() < 0.85) { const m = legal[Math.floor(Math.random() * legal.length)]; E.playCards(gs, i, m.ids, m.asg); }
    else if (gs.field) E.passTurn(gs, i);
    else if (legal.length) { const m = legal[0]; E.playCards(gs, i, m.ids, m.asg); }
  }
  return { done: steps < 4000, gs };
}
function run(label, rules, n) {
  let ok = 0, bad = 0, jokers = 0;
  for (let g = 0; g < n; g++) { const r = playGame(rules); if (r.done) ok++; else bad++; jokers += r.gs.players.reduce((s,p)=>s,0); }
  console.log(label.padEnd(14), 'finished', ok + '/' + n);
  return bad;
}
let bad = run('all-on', {}, 200);
for (const r of E.RULE_DEFS) bad += run('off:' + r.id, { [r.id]: false }, 100);
bad += run('all-off', Object.fromEntries(E.RULE_DEFS.map(r => [r.id, false])), 100);
// targeted checks
const gs = E.createGameState([{name:'A'},{name:'B'},{name:'C'}], { joker: false });
console.log('no-joker deck cards:', gs.players.reduce((s,p)=>s+p.hand.length,0));
process.exit(bad ? 1 : 0);
