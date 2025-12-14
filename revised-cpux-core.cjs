// cpux_core.js
// CPUX core (updated): Gatekeeper pass-area + immediate absorption into CPUX-Field.
// Mirrors the terminology in your CPUX manual: Visitor, Gatekeeper, CPUX-Field, Object-Field, synctest, pickup area.
// CommonJS exports.

const fs = require('fs').promises;
const crypto = require('crypto');

function normalizeKey(k){ return String(k||'').trim().replace(/\s+/g,' ').replace(/[^a-zA-Z0-9 _-]/g,''); }
function syncHash(obj){
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj||{}, Object.keys(obj||{}).sort());
  try { return crypto.createHash('sha256').update(s).digest('hex'); } catch(e){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return String(h); }
}

class Pulse {
  constructor(prompt, responses = [], tv = 'UN', source = null) {
    this.prompt = normalizeKey(prompt);
    this.responses = Array.isArray(responses) ? responses : [responses];
    this.tv = tv;
    this.source = source;
    this.ts = Date.now();
  }
}
class Signal {
  constructor(id = null, pulses = []) {
    this.id = id || `sig_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    this.pulses = new Map();
    for (const p of pulses) {
      if (p && p.prompt) this.pulses.set(p.prompt, p);
    }
    this.hash = this.computeHash();
  }
  computeHash(){
    const obj = {};
    for (const [k,p] of [...this.pulses.entries()].sort()) obj[k] = { responses: p.responses, tv: p.tv };
    return syncHash(obj);
  }
  contains(other){
    if (!(other instanceof Signal)) return false;
    for (const [k,pOther] of other.pulses){
      const pThis = this.pulses.get(k);
      if (!pThis) return false;
      if (pThis.tv !== pOther.tv) return false;
      if (!pOther.responses.some(r => pThis.responses.includes(r))) return false;
    }
    return true;
  }
}

class Field {
  constructor(){
    this.intentionSet = new Set();
    this.pulseMap = new Map(); // prompt -> [Pulse,...]
  }
  absorbSignal(intentionName, signal){
    if (intentionName) this.intentionSet.add(intentionName);
    if (signal instanceof Signal){
      for (const [k,p] of signal.pulses){
        const arr = this.pulseMap.get(k) || [];
        arr.push(p);
        this.pulseMap.set(k, arr);
      }
    }
  }
  toSignal(){
    const pulses = [];
    for (const [k, arr] of this.pulseMap.entries()){
      const last = arr[arr.length-1];
      if (last) pulses.push(last);
    }
    return new Signal(null, pulses);
  }
  snapshotObject(){
    const out = {};
    for (const [k, arr] of this.pulseMap.entries()){
      out[k] = arr.map(p => ({ responses: p.responses, tv: p.tv, src: p.source, ts: p.ts }));
    }
    return out;
  }
}

class Visitor {
  constructor(){ this.FIS = new Set(); this.FPS = new Map(); this.PIS = new Map(); }
  pickupFromEmissions(emissions){
    for (const em of emissions){
      if (em.signal instanceof Signal){
        for (const [k,p] of em.signal.pulses) this.PIS.set(k,p);
      }
      if (em.intention) this.FIS.add(em.intention);
    }
  }
  emptyPickup(){ const m = new Map(this.PIS); this.PIS.clear(); return m; }
}

/* ---------- Gatekeeper (pass-area) ---------- */
class Gatekeeper {
  constructor(cpux) {
    // cpux: parent CPUX instance (to access cpux.cpuxField and objRegistry)
    this.cpux = cpux;
    // passArea holds emitted emissions for an object (so the visitor can pick them up).
    // instanceId -> [emission,...]
    this.passArea = new Map();
    // history for debugging
    this.history = {};
    this.seenEmit = new Set();
  }

  // record emission for target instance. Immediately absorb into CPUX-Field (unless emission.final)
  emit(targetInstanceId, emission, opts = {}) {
    const key = `${targetInstanceId}|${emission.emitNonce}`;
    if (this.seenEmit.has(key)) return false;
    this.seenEmit.add(key);

    // record into pass area (so visitor can pick up and empty into object-field on object visit)
    const arr = this.passArea.get(targetInstanceId) || [];
    arr.push(emission);
    this.passArea.set(targetInstanceId, arr);

    // immediate absorption into CPUX-Field unless explicitly marked final (final emissions are CPUX out-emit)
    if (!emission.final) {
      // cpuXField is authoritative "CPUX-Field" used for synctests (pulse-first model)
      this.cpux.cpuxField.absorbSignal(emission.intention || null, emission.signal);
    }

    // history log for debugging/trace
    (this.history[targetInstanceId] = this.history[targetInstanceId] || []).push({ emission, ts: Date.now(), opts });
    return true;
  }

  // When visitor arrives at an object instance, transfer pass-area emissions for that instance
  // into the Visitor pickup area and clear pass area for that instance.
  transferToVisitor(instanceId, visitor) {
    const arr = this.passArea.get(instanceId) || [];
    if (!arr.length) return 0;
    visitor.pickupFromEmissions(arr);
    this.passArea.set(instanceId, []); // emptied into visitor pickup area
    return arr.length;
  }

  // utility to inspect pending
  pendingFor(instanceId) {
    return (this.passArea.get(instanceId) || []).length;
  }
}

/* DNStub: wraps a user-provided async function */
class DNStub {
  constructor(id, seqIndex, boundObjectInstanceId, gate=null, fn=null){
    this.id = id; this.seqIndex = seqIndex; this.boundObjectInstanceId = boundObjectInstanceId; this.gate = gate; this.fn = fn || (async()=>({emitted:[]})); this.busy=false;
  }
  async execute(txnCtx, cpuXFieldSignal){
    if (this.busy) throw new Error(`${this.id} busy`);
    this.busy = true;
    try {
      const res = await this.fn(txnCtx, null, null, cpuXFieldSignal);
      return res || { emitted: [] };
    } finally { this.busy = false; }
  }
}

class ObjectInstance {
  constructor(objectId, seqIndex){
    this.objectId = objectId; this.seqIndex = seqIndex; this.instanceId = `${objectId}@${seqIndex}`; this.field = new Field();
  }
  absorbPickup(pickupMap){
    if (!(pickupMap instanceof Map)) return;
    const pulses = [];
    for (const [k,p] of pickupMap.entries()) pulses.push(p);
    const sig = new Signal(null, pulses);
    this.field.absorbSignal(null, sig);
  }
  mapAndReflect(pickup){ return []; }
}

/* simple gate matcher (supports 'always', 'hasPrompt', 'responsesExistence', 'exact') */
function buildSignalFromSpec(spec){
  if (!spec) return new Signal(null, []);
  const pulses = (spec.pulses || []).map(p => new Pulse(p.prompt, p.responses || [], p.tv || 'UN', null));
  return new Signal(null, pulses);
}
function gateMatches(cpuxSignal, gate){
  if (!gate) return true;
  if (gate.matchMode === 'always') return true;
  const gateSignal = buildSignalFromSpec(gate.signal);
  for (const [prompt, pGate] of gateSignal.pulses){
    const pField = cpuxSignal.pulses.get(prompt);
    if (!pField) return false;
    if (gate.matchMode === 'hasPrompt') continue;
    if (gate.matchMode === 'responsesExistence'){
      if (!pField.responses || pField.responses.length === 0) return false;
      continue;
    }
    if (gate.matchMode === 'exact') return cpuxSignal.contains(gateSignal);
    // fallback responsesExistence
    if (!pField.responses || pField.responses.length === 0) return false;
  }
  return true;
}

/* CPUX runtime (interleaved visit model) */
class CPUX {
  constructor(spec={}, { dnFns = {}, txnCtx = {} } = {}){
    this.spec = spec; this.txnCtx = txnCtx; this.dnRegistry = {}; this.objRegistry = {}; this.sequence = [];
    // emission bins removed in favor of Gatekeeper + immediate absorption into cpuxField
    this.lastSeenEmitNonces = new Set();
    this.passNumber = 0; this.visitor = new Visitor(); this.snapshotHistory = [];
    this.maxSnapshotRepeat = spec.maxSnapshotRepeat || 2; this.maxPasses = spec.maxPasses || 50;
    // cpuXField is the authoritative CPUX-Field used by gatekeeper and synctest.
    this.cpuxField = new Field();
    // gatekeeper manages pass-area and immediate absorption
    this.gatekeeper = new Gatekeeper(this);
    this._loadSpec(spec, dnFns);
  }
  _loadSpec(spec, dnFns){
    const seq = spec.designSequence || [];
    for (const m of seq){
      if (m.type === 'Object'){
        const inst = new ObjectInstance(m.id, m.seqIndex);
        this.objRegistry[inst.instanceId] = inst;
        // object-level markers for tracing
        inst._emissionHistory = [];
        inst._seenEmitNonces = new Set();
      }
    }
    this.sequence = seq.slice().sort((a,b)=>a.seqIndex-b.seqIndex).map(m=>{
      if (m.type === 'DN'){
        const boundInst = `${m.boundObject}@${m.boundSeqIndex !== undefined ? m.boundSeqIndex : m.seqIndex}`;
        const fn = (dnFns && dnFns[m.id]) || (async()=>({emitted:[]}));
        const gate = m.gate || null;
        const dn = new DNStub(`${m.id}@${m.seqIndex}`, m.seqIndex, boundInst, gate, fn);
        this.dnRegistry[dn.id] = dn;
        return { kind:'DN', id: dn.id, seqIndex: m.seqIndex, dn};
      } else {
        const instId = `${m.id}@${m.seqIndex}`;
        const obj = this.objRegistry[instId];
        return { kind:'Object', id: instId, seqIndex: m.seqIndex, obj };
      }
    });
    for (const e of this.sequence) if (e.kind === 'DN') {
      if (!this.objRegistry[e.dn.boundObjectInstanceId]) throw new Error(`Spec invalid: DN ${e.dn.id} bound to missing ${e.dn.boundObjectInstanceId}`);
    }
  }

  _aggregateCPUxFieldSignal(){
    // The cpuXField already represents the authoritative collected CPUX pulses.
    // Additionally merge visitor pickup FPS (if any) so synctest sees in-flight pickup pulses.
    const merged = new Signal(null, []);
    // copy cpuXField pulses
    for (const [k,p] of this.cpuxField.toSignal().pulses) merged.pulses.set(k,p);
    // overlay visitor FPS (fresh pickups)
    for (const [k,p] of this.visitor.FPS.entries()) merged.pulses.set(k,p);
    return merged;
  }

  _makeEmitNonce(srcId, localCounter){ return syncHash({ srcId, pass: this.passNumber, localCounter, tx: this.txnCtx.txId || null }); }

  async _onePassInterleaved(){
    let localCounter = 0;
    for (const member of this.sequence){
      // Before interacting with a member, gatekeeper may have pass-area emissions for that member.
      // Transfer any pass-area emissions into visitor pickup area.
      if (member.kind === 'DN') {
        // Gatekeeper's pass-area for DN (if any) should be moved to visitor so DN can see pickups.
        this.gatekeeper.transferToVisitor(member.dn.boundObjectInstanceId, this.visitor);
      } else if (member.kind === 'Object') {
        // transfer for object instance id (object receives prior DN emissions into visitor pickup)
        this.gatekeeper.transferToVisitor(member.id, this.visitor);
      }
      const cpuxSnapshot = this._aggregateCPUxFieldSignal();

      if (member.kind === 'DN'){
        const dn = member.dn;
        const gateOk = gateMatches(cpuxSnapshot, dn.gate);
        if (!gateOk) continue;
        let result;
        try {
          result = await dn.execute(this.txnCtx, cpuxSnapshot);
        } catch(err) {
          console.error('DN exec error:', err && err.message);
          result = { emitted: [] };
        }
        const emitted = (result && result.emitted) || [];
        if (emitted.length){
          for (const em of emitted){
            localCounter += 1;
            const emitNonce = this._makeEmitNonce(dn.id, localCounter);
            const wrapped = {
              intention: em.intention || null,
              signal: em.signal instanceof Signal ? em.signal : new Signal(null, (em.signal && em.signal.pulses) || []),
              emitNonce, src: dn.id, order: localCounter, ts: Date.now(), final: !!em.final
            };
            const target = dn.boundObjectInstanceId;
            const dedupeKey = `${target}|${wrapped.emitNonce}`;
            if (this.lastSeenEmitNonces.has(dedupeKey)) continue;
            this.lastSeenEmitNonces.add(dedupeKey);

            // Gatekeeper: record emission into pass-area and immediately absorb into CPUX-Field (pulse-first)
            this.gatekeeper.emit(target, wrapped, { fromSeqIndex: dn.seqIndex, targetSeqIndex: parseInt(target.split('@')[1],10) || 0 });
            // track per-object history
            const obj = this.objRegistry[target];
            if (obj) { obj._emissionHistory.push({ wrapped }); obj._seenEmitNonces.add(wrapped.emitNonce); }
          }
        }
      } else if (member.kind === 'Object'){
        const obj = member.obj; const instId = obj.instanceId;
        // When visitor reaches an Object, the gatekeeper should have already transferred pass-area emissions
        // into the visitor pickup area above. Now empty pickup into object-field.
        const pickup = this.visitor.emptyPickup();
        if (pickup && pickup.size) {
          obj.absorbPickup(pickup);
          // IMPORTANT: by design we also reflect absorption into CPUX-Field (so pulses become visible to downstream DNs)
          // Object.absorbPickup already updates object.field; reflect that into cpuxField as well:
          const sig = obj.field.toSignal();
          // absorb all pulses from object into cpuXField (pulse-first)
          this.cpuxField.absorbSignal(null, sig);
        }
        // synchronous mapAndReflect on object - default returns []
        let reflections = [];
        try { reflections = obj.mapAndReflect ? obj.mapAndReflect() : []; } catch(e){ reflections = []; }
        let localOrder = 0;
        for (const r of reflections){
          localOrder += 1;
          const env = { targetInstanceId: r.targetInstanceId, intention: r.intention || null, signal: r.signal instanceof Signal ? r.signal : new Signal(null, []), emitNonce: syncHash({ src: obj.instanceId, ts: Date.now(), order: localOrder }), src: obj.instanceId, order: localOrder, ts: Date.now(), final: !!r.final };
          const dedupeKey = `${env.targetInstanceId}|${env.emitNonce}`;
          if (this.lastSeenEmitNonces.has(dedupeKey)) continue;
          this.lastSeenEmitNonces.add(dedupeKey);
          // reflections are treated same as emissions: they go through gatekeeper and become part of cpuxField (unless final)
          this.gatekeeper.emit(env.targetInstanceId, env, { fromSeqIndex: obj.seqIndex, targetSeqIndex: parseInt(env.targetInstanceId.split('@')[1],10) || 0 });
        }
      }
    }
  }

  _rotateEmissionBins(){
    // rotation not required for immediate absorption model, but keep lastSeenEmitNonces clearing between passes
    this.lastSeenEmitNonces.clear();
  }

  _computeSnapshotHash(){
    const big = {};
    // include CPUX field snapshot (authoritative), plus each object snapshot for traceability
    big['cpuxField'] = this.cpuxField.snapshotObject();
    for (const [instId, obj] of Object.entries(this.objRegistry)) big[instId] = obj.field.snapshotObject();
    return syncHash(big);
  }

  async run({ maxPasses = this.maxPasses } = {}){
    this.passNumber = 0;
    let stableRepeats = 0; let lastSnapshot = null;
    while (true){
      this.passNumber += 1;
      console.log('========== PASS', this.passNumber, '==========');
      await this._onePassInterleaved();
      this._rotateEmissionBins();
      const snap = this._computeSnapshotHash();
      console.log(`Snapshot hash after pass ${this.passNumber}: ${snap}`);
      if (snap === lastSnapshot) stableRepeats += 1; else stableRepeats = 0;
      lastSnapshot = snap;
      this.snapshotHistory.push({ pass: this.passNumber, snap });
      const noPending = Object.keys(this.objRegistry).every(id => this.gatekeeper.pendingFor(id) === 0);
      if (noPending && stableRepeats >= this.maxSnapshotRepeat) { console.log('golden pass reached'); return { status: 'golden_pass', passes: this.passNumber, snapshot: snap }; }
      if (this.passNumber >= maxPasses) { console.log('max passes reached'); return { status: 'max_passes', passes: this.passNumber, snapshot: snap }; }
    }
  }
}

module.exports = { Pulse, Signal, Field, Visitor, DNStub, ObjectInstance, Gatekeeper, CPUX };
