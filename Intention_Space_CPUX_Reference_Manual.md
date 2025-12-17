# Intention Space CPUX Runtime Reference Manual
**Version 1.0 | Comprehensive Implementation Guide**
Authors _ Intentix Lab , D Das , S Behera, M Subudhi
---

## Table of Contents

1. [Core Concepts & Definitions](#1-core-concepts--definitions)
2. [Runtime Entities & Structures](#2-runtime-entities--structures)
3. [CPUX Execution Model](#3-cpux-execution-model)
4. [Algebraic Operators](#4-algebraic-operators)
5. [Implementation Mapping](#5-implementation-mapping)
6. [Missing Concepts Analysis](#6-missing-concepts-analysis)

---

## 1. Core Concepts & Definitions

### 1.1 Intention Space (IS)

**Definition**: A computational universe uniquely identified by `ISn` (where n = 1, 2, ..., any integer) containing a fixed set of uniquely identified entities.

**Key Properties**:
- Contains fixed number of: Objects (O), Intentions (I), Pulses, Design Nodes (DN), CPUX
- All entities uniquely identified within the space
- Users identified by unique UIDs
- Entity names serve as runtime instance names within execution context
- No duplicate entity names of same type within execution context
- Execution contexts have unique addresses at DN and Object granularity

**Implementation Class**: `IntentionSpace`

---

### 1.2 CPUX (Computational Processing Unit eXtended)

**Definition**: A sequence of Objects and DNs with directed Intentions between them, forming a computational execution chain.

**Structural Constraints**:
- **Alternation Rule**: No two DNs without interim Object; no two Objects without interim DN
- **Intention Requirement**: Every adjacent pair requires Intention between them
- **Start Member**: Always a DN (the "starter")
- **End Member**: Always an Object (the "ending Object") with optional reflected Intention-Signal
- **Trigger Requirement**: Must have one or more unique trigger Intention+Signal pairs
- **Final Emission**: May have zero or more final emission Intentions

**Pattern Example**:
```
I1(s1) -> [DN1, I3(s3), O1, I4(s4), DN2, I5(s5), O2, I6(s6)]
```

**Implementation Class**: `CPUX`, `CPUXChainOrchestrator`

---

### 1.3 Design Node (DN)

**Definition**: A black-box computation unit that absorbs Intention+Signal and emits Intention+Signal.

**Characteristics**:
- Absorbs designated incoming Intention+Signal via gatekeeper
- Emits any Intention+Signal (runtime determined, though designed)
- Executes asynchronously
- Has three states: Ready, Busy/Executing, Stopped
- Allocated a Gatekeeper area with designated input/output Intention+Signal pairs
- Can render UI models using GridLookout convention

**Execution Unit Pattern**: `I1 - DN - I* - O`
- `I1`: Absorbed intention to start DN
- `I*`: Any emitted intention from DN (runtime variable)
- `O`: Object that absorbs emitted intention

**Implementation Class**: `DesignNode`, `DN_*` (specific implementations)

---

### 1.4 Object (O)

**Definition**: A reflector of Intentions with field-based state, acting as valve or pass-through.

**Characteristics**:
- **Empty Object**: Reflects what it receives (pass-through)
- **Non-empty Object**: Acts as valve, controlling what it reflects
- Provides persistence during execution cycle
- Enables rollback and compensation
- Absorbs any incoming Intention unconditionally
- Reflects configured Intention only when internal conditions match
- Has Object-Field (OIS: Object Intention Set, OPS: Object Pulse Set)

**Execution Unit Pattern**: `I* - O - I2`
- `I*`: Any intention emitted by prior member (absorbed unconditionally)
- `I2`: Configured reflected intention (emitted conditionally)

**Implementation Class**: `Object`, `ObjectField`, `O_*` (specific implementations)

---

### 1.5 Intention (I)

**Definition**: A directed signal carrier that enables data movement in Intention Space.

**Properties**:
- Always paired with Signal (Intention+Signal)
- Uniquely identified within Intention Space
- Has signal hash for identification
- Direction: Emission (DN→O, O→O) or Absorption (O→DN)
- Trigger Intentions: Start CPUX execution
- Reflected Intentions: Emitted by Objects

**Types**:
- **Trigger Intention**: Initiates CPUX
- **Emitted Intention**: From DN to Object
- **Reflected Intention**: From Object to Field or DN
- **Final Emission Intention**: Exit from CPUX

**Implementation Class**: `Intention`, `IntentionRouter`

---

### 1.6 Signal (S)

**Definition**: A collection of Pulses forming the data payload of an Intention.

**Characteristics**:
- Subset of all Pulses defined in Intention Space
- Signal = Collection of {Pulse₁, Pulse₂, ..., Pulseₙ}
- Each Signal has unique hash (Signal Hash / IS#)
- Design-time Signal must match runtime Signal structure
- Runtime responses may differ from design-time responses
- ** an intention can pickup - the same signal at various hops. 
**Signal Hash Registry (SHR)**:
- Maps Intention phrases to hash values
- Example: `'I_login': 0x0001`, `'I_auth': 0x0002`

**Implementation Class**: `Signal`, `SignalDefinition`

---

### 1.7 Pulse

**Definition**: Atomic data unit with prompt, trivalence, and optional responses.

**Structure**:
```javascript
Pulse = {
  id: string,
  phrase: string,
  trivalence: 'Y' | 'N' | 'UN',
  responses: string[]  // Array of response values
}
```

**Trivalence (TV) Values**:
- **'Y'** (Yes): Editable, interactive (color: #4CAF50)
- **'N'** (No): Read-only, non-interactive (color: #F44336)
- **'UN'** (Unknown): Action/button, interactive (color: #FF9800)

**UI Mapping**:
- 1 Pulse = 1 Cell in GridLookout
- Editable if TV = 'Y'
- Display-only if TV = 'N'
- Action/button if TV = 'UN'

**Implementation Class**: `Pulse`, `PulseDefinition`

---

### 1.8 Field

**Definition**: State container for Intentions and Pulses during CPUX execution.

**Types**:

#### CPUX-Field (Visitor Field)
- Carried by Visitor throughout CPUX execution
- **FIS**: Field Intention Set
- **FPS**: Field Pulse Set
- Absorbs emitted/reflected Intentions during execution
- Source for synctest validation

#### Object-Field
- Internal to each Object
- **OIS**: Object Intention Set
- **OPS**: Object Pulse Set
- Accumulates absorbed Intentions over multiple visitor passes
- Used for reflection validation and CPUX triggering

**Implementation Class**: `Field`, `FieldState`, `CPUXField`, `ObjectField`

---

### 1.9 Visitor

**Definition**: Mobile execution controller that traverses CPUX members, carrying Field and managing state transfer.

**Structure**:
```javascript
Visitor = {
  cpux_field: {
    FIS: Set<Intention>,  // Field Intention Set
    FPS: Set<Pulse>       // Field Pulse Set
  },
  pickup_area: {
    PIS: Array<{intention, signal}>  // Pickup Intention+Signal pairs
  }
}
```

**Behavior**:
- Constructed at CPUX start with trigger Intention+Signal in Field
- Pickup area empty at start
- Traverses CPUX members sequentially
- At DN: Receives emitted Intention+Signal into pickup area
- At Object: Empties pickup area into Object-Field
- Continues passes until Golden Pass (termination condition)
- Pickup area always empty when visiting DN
- Pickup area populated only after DN visit

**Implementation Class**: `Visitor`, `CPUXVisitor`

---

### 1.10 Gatekeeper

**Definition**: Conditional controller for Intention+Signal absorption/emission at DN and Object boundaries.

**Types**:

#### DN Gatekeeper
- Controls absorption from CPUX-Field into DN
- Manages DN state (Ready/Busy/Stopped)
- Has Pass-Area containing:
  - Designated Input Intention+Signal
  - Output Intention+Signal (after DN execution)
- Validates via synctest before DN execution
- Transfers emitted Intention+Signal to Visitor pickup area

#### Object Gatekeeper
- Controls reflection from Object-Field
- Manages Object internal state
- Validates incoming Intention+Signal against Object-Field
- Applies configured mappings
- Controls reflection to CPUX-Field
- Triggers new CPUX for non-designated Intentions

**Synctest Logic**:
1. Check if designated Intention exists in Field/Object-Field
2. Verify designated Signal is subset of Field Pulses
3. For Objects: Apply mapping and validate reflected Intention+Signal

**Implementation Class**: `Gatekeeper`, `DNGatekeeper`, `ObjectGatekeeper`

---

### 1.11 Link

**Definition**: Design-time configuration connecting two DNs through Object intermediaries.

**Pattern**:
```
I1 - DN1 - I* - O - I2 - (O2 - Iy - O3 - Iz) - DN2 - I*
```

**Characteristics**:
- Combination of two DN execution units
- Interim Object execution units between DNs
- Allows black-box DN emission to be absorbed by forward Object
- Enables DN-to-DN communication

**Implementation Class**: `Link`, `DNLink`

---

### 1.12 Execution Point

**Definition**: Any DN or Object within a CPUX that serves as discrete execution location.

**Properties**:
- Unique address within execution context
- Provides granularity for context identification
- Enables rollback/compensation at specific points

**Implementation Class**: Part of `CPUX` sequence management

---

### 1.13 GridLookout

**Definition**: UI rendering framework using cell-based spatial layout within Intention Space.

**Cell Specification**:
```javascript
Cell = {
  pulse: Pulse,              // 1 Pulse = 1 Cell
  coordinates: {
    row: number,             // Start row
    col: number,             // Start column
    layer: number,           // Z-index layer
    rowspan: number,         // Number of rows
    colspan: number          // Number of columns
  },
  viewport: {
    rows: number,            // Total viewport rows
    cols: number,            // Total viewport columns
    width: number,           // Viewport width (px)
    height: number           // Viewport height (px)
  },
  editable: boolean,         // Based on Pulse.trivalence
  customAttributes: object   // Custom cell properties
}
```

**Rendering Convention**:
1. DN emits Intention with Signal
2. Object reflects to Grid Cells (1 cell per pulse)
3. Cell editability determined by Pulse TV:
   - TV='Y': Editable (multi-row for array responses)  <--- should be the other way
   - TV='N': Display-only
   - TV='UN': Action button
4. Action configured to emit Intention+Signal to Object

**Implementation Class**: `GridLookout`, `GridLookoutIntentionSpace`, `CellRenderer`

---

### 1.14 Intention Signal Hash (IS#)

**Definition**: Unique identifier for Intention+Signal combination.

**Calculation**:
```javascript
IS# = hash(Intention.id + Signal.pulseIds.sort().join())
```

**Usage**:
- Identifies trigger Intentions uniquely
- Validates design-time vs runtime matching
- Enables IPTP routing
- Differentiates multiple triggers for same Intention with different Signals

**Implementation Class**: `SignalHashRegistry`, `calculateSignalHash()`

---

### 1.15 Golden Pass

**Definition**: Termination condition for CPUX execution.

**Conditions for Golden Pass**:
- No member emits or reflects Intention during pass
- No DN triggered or in execution state
- No state changes across entire CPUX sequence

**When Detected**:
- Visitor pass/CPUX loop stops
- CPUX execution terminates

**Implementation Class**: `detectGoldenPass()`, part of `CPUX` execution loop

---

## 2. Runtime Entities & Structures

### 2.1 DN State Model

**States**:
```javascript
DNState = 'Ready' | 'Busy' | 'Stopped'
```

**State Transitions**:
- **Ready**: Awaiting incoming Intention+Signal, not executing
- **Busy/Executing**: Async process running
- **Stopped**: Completed execution, no further processing

**State Management**:
```javascript
class DNStateManager {
  state: DNState
  setState(newState: DNState): void
  canAcceptIntention(): boolean  // true if Ready or Stopped
  isBusy(): boolean              // true if Busy
}
```

---

### 2.2 Gatekeeper Pass-Area Structure

**DN Pass-Area**:
```javascript
DNPassArea = {
  designated_input: {
    intention: Intention,
    signal: Signal
  },
  emitted_outputs: Array<{
    intention: Intention,
    signal: Signal
  }>
}
```

**Object Pass-Area**:
```javascript
ObjectPassArea = {
  designated_incoming: {
    intention: Intention,
    signal: Signal
  },
  mapping_rules: Array<MappingRule>,
  reflected: {
    intention: Intention,
    signal: Signal
  }
}
```

---

### 2.3 Visitor Pickup Area

**Structure**:
```javascript
PickupArea = {
  PIS: Array<{
    intention: Intention,
    signal: Signal
  }>
}
```

**Lifecycle**:
1. Empty at CPUX start
2. Empty when visiting DN
3. Populated when DN gatekeeper transfers emitted Intention+Signal
4. Emptied into Object-Field at Object visit
5. Cycle repeats

---

### 2.4 Field State Structures

**CPUX-Field**:
```javascript
CPUXField = {
  FIS: Set<Intention>,      // Field Intention Set
  FPS: Set<Pulse>,          // Field Pulse Set
  syncInterval: number,     // Optional sync timing
  lastSync: timestamp
}
```

**Object-Field**:
```javascript
ObjectField = {
  OIS: Set<Intention>,      // Object Intention Set
  OPS: Set<Pulse>,          // Object Pulse Set
  accumulationHistory: Array<{
    pass: number,
    absorbed: {intention, signal},
    timestamp: timestamp
  }>
}
```

---

### 2.5 Synctest Mechanism

**Definition**: Validation mechanism ensuring designated Intention+Signal matches Field/Object-Field state.

**Algorithm**:
```javascript
function synctest(
  designated_intention: Intention,
  designated_signal: Signal,
  field: Field  // CPUX-Field or Object-Field
): boolean {
  // Step 1: Check Intention presence
  if (!field.FIS.has(designated_intention.id)) {
    return false
  }
  
  // Step 2: Check Signal is subset
  const fieldPulseIds = new Set(field.FPS.map(p => p.id))
  const requiredPulseIds = designated_signal.pulses.map(p => p.id)
  
  for (const pulseId of requiredPulseIds) {
    if (!fieldPulseIds.has(pulseId)) {
      return false
    }
  }
  
  return true  // Both Intention and Signal match
}
```

**Synctest Variants**:
- **DN Synctest**: Source = CPUX-Field (Visitor)
- **Object Incoming Synctest**: Source = Object-Field
- **Object Reflection Synctest**: Source = Object-Field (after mapping)
- **CPUX Trigger Synctest**: Source = Object-Field, matches against IS trigger definitions

**Implementation Function**: `synctest()`, `validateFieldGating()`

---

### 2.6 Mapping Rules (Object)

**Purpose**: Transform Object-Field before reflection validation.

**Structure**:
```javascript
MappingRule = {
  source_pulses: Array<PulseId>,
  target_pulses: Array<PulseId>,
  transformation: Function  // (sourcePulses) => targetPulses
}
```

**Application**:
1. Object absorbs incoming Intention+Signal
2. Synctest passes for incoming
3. Apply mapping rules to Object-Field
4. Synctest for reflected Intention+Signal
5. If passes, reflect to CPUX-Field

---

## 3. CPUX Execution Model

### 3.1 CPUX Start

**Trigger**:
- Trigger Intention+Signal arrives
- Matches one of CPUX's defined trigger Intention+Signal combinations

**Initialization**:
```javascript
// Visitor construction
visitor = new Visitor({
  cpux_field: {
    FIS: new Set([trigger_intention]),
    FPS: new Set(trigger_signal.pulses)
  },
  pickup_area: {
    PIS: []  // Empty at start
  }
})

// CPUX state
cpux_state = {
  current_pass: 0,
  current_member_index: 0,  // Always starts at DN (index 0)
  execution_status: 'Running'
}
```

**Implementation Method**: `startCPUX()`, `initializeVisitor()`

---

### 3.2 DN Visit Sequence

**When Visitor visits DN**:

```javascript
function visitDN(dn, visitor, gatekeeper) {
  // 1. Check DN state
  const dnState = gatekeeper.getDNState()
  
  if (dnState === 'Busy') {
    // DN busy, move to next member (Object)
    visitor.moveToNext()
    return  // Pickup area remains empty
  }
  
  // 2. DN is Ready or Stopped
  // Transfer any emitted Intention+Signal from pass-area to visitor pickup
  if (gatekeeper.passArea.emitted_outputs.length > 0) {
    visitor.pickupArea.PIS.push(...gatekeeper.passArea.emitted_outputs)
    gatekeeper.passArea.emitted_outputs = []  // Clear after transfer
  }
  
  // 3. Synctest: Check if CPUX-Field has designated incoming Intention+Signal
  const designated = gatekeeper.passArea.designated_input
  const synctestPassed = synctest(
    designated.intention,
    designated.signal,
    visitor.cpux_field
  )
  
  if (synctestPassed) {
    // 4. Start DN async execution
    dn.executeAsync(designated.intention, designated.signal)
    gatekeeper.setDNState('Busy')
  }
  
  // 5. Move to next member (Object)
  visitor.moveToNext()
}
```

**State Changes**:
- DN state: Ready → Busy (if synctest passes)
- Visitor pickup: Populated with DN's emitted Intention+Signal
- CPUX-Field: Unchanged

**Implementation Method**: `visitDN()`, `executeDN()`

---

### 3.3 Object Visit Sequence

**When Visitor visits Object**:

```javascript
function visitObject(object, visitor, gatekeeper) {
  // 1. Empty visitor pickup area into Object-Field
  for (const {intention, signal} of visitor.pickupArea.PIS) {
    object.objectField.OIS.add(intention)
    for (const pulse of signal.pulses) {
      object.objectField.OPS.add(pulse)
    }
  }
  visitor.pickupArea.PIS = []  // Clear pickup area
  
  // 2. Check for designated incoming Intention+Signal in Object-Field
  const designated_incoming = gatekeeper.passArea.designated_incoming
  const incomingSynctest = synctest(
    designated_incoming.intention,
    designated_incoming.signal,
    object.objectField
  )
  
  if (!incomingSynctest) {
    // Incoming synctest failed, check for CPUX triggers
    checkAndTriggerNewCPUX(object.objectField, gatekeeper)
    visitor.moveToNext()
    return
  }
  
  // 3. Apply mapping rules (if configured)
  if (gatekeeper.passArea.mapping_rules.length > 0) {
    applyMappingRules(object.objectField, gatekeeper.passArea.mapping_rules)
  }
  
  // 4. Synctest for reflection
  const designated_reflected = gatekeeper.passArea.reflected
  const reflectionSynctest = synctest(
    designated_reflected.intention,
    designated_reflected.signal,
    object.objectField
  )
  
  if (reflectionSynctest) {
    // 5. Reflect Intention+Signal to CPUX-Field
    visitor.cpux_field.FIS.add(designated_reflected.intention)
    for (const pulse of designated_reflected.signal.pulses) {
      visitor.cpux_field.FPS.add(pulse)
    }
    
    // 6. Remove reflected Intention+Signal from Object-Field (optional, config)
    if (gatekeeper.config.removeAfterReflection) {
      object.objectField.OIS.delete(designated_reflected.intention)
      // Remove signal pulses if not used elsewhere
    }
  }
  
  // 7. Check for CPUX triggers with non-designated Intentions
  checkAndTriggerNewCPUX(object.objectField, gatekeeper)
  
  // 8. Move to next member
  visitor.moveToNext()
}
```

**State Changes**:
- Object-Field: Accumulates from visitor pickup area
- CPUX-Field: Absorbs reflected Intention+Signal
- Visitor pickup: Emptied
- New CPUX: May be triggered asynchronously

**Implementation Method**: `visitObject()`, `reflectIntention()`

---

### 3.4 New CPUX Triggering from Object

**Trigger Detection**:
```javascript
function checkAndTriggerNewCPUX(objectField, gatekeeper) {
  // Get all Intentions in Object-Field
  for (const intention of objectField.OIS) {
    // Skip designated incoming and reflected Intentions
    if (intention === gatekeeper.passArea.designated_incoming.intention ||
        intention === gatekeeper.passArea.reflected.intention) {
      continue
    }
    
    // Extract Signal from Object-Field for this Intention
    const signal = extractSignalFromObjectField(intention, objectField)
    
    // Check against all registered CPUX triggers in Intention Space
    const matchingCPUX = findCPUXByTrigger(intention, signal)
    
    if (matchingCPUX) {
      // Trigger new CPUX (async by configuration)
      if (gatekeeper.config.asyncCPUXTrigger) {
        triggerCPUXAsync(matchingCPUX, intention, signal, objectField)
      } else {
        triggerCPUXSync(matchingCPUX, intention, signal, objectField)
      }
    }
  }
}
```

**Characteristics**:
- Triggers from non-designated Intentions in Object-Field
- Uses Object-CPUX as source in synctest
- Can trigger multiple CPUX if multiple matches
- Async execution by configuration
- Object remains in current CPUX while new CPUX runs <-- This shows a CPUX 'transaction' can be started at an Object  state ;  

**Implementation Method**: `triggerCPUXFromObject()`, `checkTriggerConditions()`

---

### 3.5 Visitor Pass Cycle

**Pass Definition**: One complete traversal of all CPUX members from start DN to end Object.

**Pass Algorithm**:
```javascript
function executeCPUXPass(cpux, visitor) {
  const pass_state = {
    pass_number: visitor.current_pass++,
    any_emission: false,
    any_reflection: false,
    any_dn_triggered: false,
    any_dn_executing: false
  }
  
  // Traverse all members
  for (let i = 0; i < cpux.members.length; i++) {
    const member = cpux.members[i]
    
    if (member.type === 'DN') {
      const result = visitDN(member, visitor, member.gatekeeper)
      if (result.dn_started) pass_state.any_dn_triggered = true
      if (result.dn_executing) pass_state.any_dn_executing = true
      if (result.emissions_transferred) pass_state.any_emission = true
    } 
    else if (member.type === 'Object') {
      const result = visitObject(member, visitor, member.gatekeeper)
      if (result.reflected) pass_state.any_reflection = true
      if (result.cpux_triggered) pass_state.any_dn_triggered = true
    }
  }
  
  // Check for Golden Pass
  const is_golden_pass = (
    !pass_state.any_emission &&
    !pass_state.any_reflection &&
    !pass_state.any_dn_triggered &&
    !pass_state.any_dn_executing
  )
  
  return {
    pass_state,
    is_golden_pass,
    continue_execution: !is_golden_pass
  }
}
```

**Pass Termination**:
- Golden Pass detected → Stop execution
- Maximum passes reached (safety limit) → Stop with warning
- External stop signal → Stop execution

**Implementation Method**: `executeCPUXPass()`, `visitNextMember()`

---

### 3.6 Final Member (End Object) Handling

**Special Behavior**:
- End Object is last member in CPUX sequence
- Reflected Intention+Signal treated as **Final Emission**
- Final Emission **does NOT** add to Visitor's CPUX-Field
- Final Emission exits CPUX entirely
- Can be consumed by external system or trigger another CPUX

**Algorithm**:
```javascript
function visitEndObject(endObject, visitor, gatekeeper) {
  // Steps 1-4: Same as regular Object visit
  // (Empty pickup, synctest incoming, apply mapping, synctest reflection)
  
  // Step 5: Handle reflection differently
  if (reflectionSynctest) {
    // Do NOT add to CPUX-Field
    // Instead, emit as final emission
    const final_emission = {
      intention: designated_reflected.intention,
      signal: designated_reflected.signal,
      source_cpux: cpux.id,
      timestamp: now()
    }
    
    // Emit to external handler or CPUX registry
    emitFinalIntention(final_emission)
    
    // Remove from Object-Field
    if (gatekeeper.config.removeAfterReflection) {
      endObject.objectField.OIS.delete(designated_reflected.intention)
    }
  }
  
  // Step 6: Check for new CPUX triggers (same as regular Object)
  checkAndTriggerNewCPUX(endObject.objectField, gatekeeper)
  
  // Step 7: Return to start member for next pass
  visitor.current_member_index = 0
}
```

**Implementation Method**: `visitEndObject()`, `emitFinalIntention()`

---

### 3.7 CPUX Termination

**Termination Conditions**:

1. **Golden Pass**: No state changes across entire pass
2. **All DNs Stopped**: All DNs in Stopped state, no more work
3. **Maximum Passes**: Safety limit reached (indicates potential infinite loop)
4. **External Stop**: Manual termination signal

**Termination Algorithm**:
```javascript
function checkTermination(cpux, visitor, pass_result) {
  // Condition 1: Golden Pass
  if (pass_result.is_golden_pass) {
    return {
      terminated: true,
      reason: 'golden_pass',
      status: 'completed'
    }
  }
  
  // Condition 2: All DNs Stopped
  const all_dns_stopped = cpux.members
    .filter(m => m.type === 'DN')
    .every(dn => dn.gatekeeper.getDNState() === 'Stopped')
  
  if (all_dns_stopped) {
    return {
      terminated: true,
      reason: 'all_dns_stopped',
      status: 'completed'
    }
  }
  
  // Condition 3: Maximum passes
  if (visitor.current_pass >= cpux.config.max_passes) {
    return {
      terminated: true,
      reason: 'max_passes_exceeded',
      status: 'warning'
    }
  }
  
  // Continue execution
  return {
    terminated: false
  }
}
```

**Implementation Method**: `checkTermination()`, `terminateCPUX()`

---

## 4. Algebraic Operators

### 4.1 Core Field Operators

#### Absorption Operator: Field ⊕ Signal
```javascript
/**
 * F₁ = F₀ ⊕ S₁
 * Field absorbs Signal (Intention + Pulses)
 */
function absorb(field, intention, signal) {
  field.FIS.add(intention)
  for (const pulse of signal.pulses) {
    field.FPS.add(pulse)
  }
  return field
}
```

#### Matching Operator: M(S, F) → Boolean
```javascript
/**
 * Validates if Signal exists in Field
 */
function match(signal, field) {
  const fieldPulseIds = new Set(field.FPS.map(p => p.id))
  return signal.pulses.every(p => fieldPulseIds.has(p.id))
}
```

#### Evolution Operator: F_{n+1} = F_n ⊕ E(N)
```javascript
/**
 * Field evolves through emission from Node N
 */
function evolve(field, node_emission) {
  return absorb(field, node_emission.intention, node_emission.signal)
}
```

---

### 4.2 Multi-CPUX Operators

#### UMP: Multi-CPUX Participation
```javascript
/**
 * UMP(S, C₁, C₂, ..., Cₙ) → ServerState
 * Enables server to participate in multiple CPUX
 */
function UMP(serverId, cpuxList) {
  const serverState = {
    serverId,
    participatingCPUX: new Map(),
    routingTables: new Map(),
    fieldStateCaches: new Map(),
    crossSpaceBridges: new Set()
  }
  
  for (const cpux of cpuxList) {
    // Register participation
    serverState.participatingCPUX.set(cpux.cpuxId, {
      cpuxId: cpux.cpuxId,
      spaceId: cpux.spaceId,
      endpoints: cpux.endpoints,
      fieldState: initializeFieldState(cpux)
    })
    
    // Build routing table
    serverState.routingTables.set(cpux.cpuxId, {
      spaceId: cpux.spaceId,
      intentionEndpoint: cpux.endpoints.intentions,
      objectEndpoint: cpux.endpoints.objects
    })
  }
  
  // Enable cross-space bridging if multiple CPUX
  if (serverState.participatingCPUX.size > 1) {
    serverState.crossSpaceBridges.add('inter_cpux_routing')
    serverState.crossSpaceBridges.add('pulse_federation')
  }
  
  return serverState
}
```

#### IRT: Intention Routing (IPTP-based)
```javascript
/**
 * IRT(I, H_iptp) → TargetServer
 * Routes intentions using IPTP headers (NOT field gating)
 */
function IRT(intention, iptpHeader) {
  const routingDecision = {
    routingMethod: 'iptp_header_based',
    targetServer: null,
    targetCPUX: null,
    routingPath: []
  }
  
  // Priority 1: Route by target CPUX in IPTP header
  if (iptpHeader.targetCPUX) {
    const participation = getParticipation(iptpHeader.targetCPUX)
    if (participation) {
      routingDecision.targetCPUX = iptpHeader.targetCPUX
      routingDecision.targetServer = participation.serverId
      return routingDecision
    }
  }
  
  // Priority 2: Route by signal hash
  if (iptpHeader.signalHash) {
    const registry = resolveSignalHashToCPUX(iptpHeader.signalHash)
    routingDecision.targetCPUX = registry.cpuxId
    routingDecision.targetServer = registry.serverId
  }
  
  return routingDecision
}
```

#### ICT: Inter-CPUX Transfer (Cross-space, NOT field gating)
```javascript
/**
 * ICT(I, C₁, C₂) → CrossSpaceTransfer
 * Transfer between different CPUX using intention routing
 * CRITICAL: Does NOT use field gating
 */
function ICT(intention, sourceCPUX, targetCPUX) {
  const transfer = {
    transferType: 'inter_cpux',
    sourceCPUX,
    targetCPUX,
    method: 'intention_routing',
    useFieldGating: false,  // CRITICAL
    iptpHeader: {
      targetCPUX,
      sourceCPUX,
      signalHash: calculateSignalHash(intention)
    }
  }
  
  // Route using IPTP, bypass field gating
  const routingDecision = IRT(intention, transfer.iptpHeader)
  transfer.routingDecision = routingDecision
  
  // Execute cross-space transfer
  executeInterCPUXTransfer(transfer)
  
  return transfer
}
```

#### ACT: Intra-CPUX Transfer (Within CPUX, USES field gating)
```javascript
/**
 * ACT(O, DN, F) → InternalTransfer
 * Transfer within single CPUX using field gating
 * CRITICAL: Uses field gating and signal hash matching
 */
function ACT(fromNode, toNode, fieldState) {
  const transfer = {
    transferType: 'intra_cpux',
    method: 'field_gating',
    useFieldGating: true,  // CRITICAL
    fromNode,
    toNode,
    fieldState
  }
  
  // Validate field gating
  const gatingResult = validateFieldGating(fromNode, toNode, fieldState)
  transfer.signalHashMatch = gatingResult.hashMatch
  transfer.fieldStateValid = gatingResult.stateValid
  
  if (gatingResult.canTransfer) {
    executeIntraCPUXTransfer(transfer)
    transfer.success = true
  } else {
    transfer.success = false
  }
  
  return transfer
}
```

#### PFO: Praxis Federation
```javascript
/**
 * PFO(Domain, PulseSet) → FederatedCollaboration
 * Enables specialists to work independently while sharing pulses
 */
function PFO(domainId, pulseSet) {
  const federation = {
    domainId,
    sharedPulses: new Set(pulseSet),
    privatePulses: new Set(),
    collaborators: new Map(),
    autonomyLevel: 'domain_sovereign'
  }
  
  // Enable pulse sharing while maintaining domain autonomy
  federation.federationProtocol = {
    shareRule: 'explicit_pulse_whitelist',
    privacyRule: 'domain_exclusive_by_default',
    collaborationMode: 'pulse_federation'
  }
  
  return federation
}
```

---

### 4.3 Loop & State Operators

#### Loop Operator: NextPosition(pos) = (pos + 1) mod |CPUX|
```javascript
/**
 * Cyclic progression through CPUX members
 */
function nextPosition(currentPos, cpuxLength) {
  return (currentPos + 1) % cpuxLength
}
```

#### State Operator: State(N) ∈ {Ready, Executing, Stopped}
```javascript
/**
 * Node lifecycle states
 */
class NodeState {
  state: 'Ready' | 'Executing' | 'Stopped'
  
  transition(newState) {
    const validTransitions = {
      'Ready': ['Executing', 'Stopped'],
      'Executing': ['Ready', 'Stopped'],
      'Stopped': []  // Terminal state
    }
    
    if (validTransitions[this.state].includes(newState)) {
      this.state = newState
    }
  }
}
```

---

### 4.4 Termination Condition Operators

#### CanContinue: ∃N ∈ Nodes : State(N) = Executing
```javascript
function canContinue(cpux) {
  return cpux.members.some(n => n.state === 'Executing')
}
```

#### PreHalt: (∀N : State(N) ≠ Executing) ∧ (∃N : State(N) = Ready)
```javascript
function preHalt(cpux) {
  const noneExecuting = cpux.members.every(n => n.state !== 'Executing')
  const someReady = cpux.members.some(n => n.state === 'Ready')
  return noneExecuting && someReady
}
```

#### Terminate: ∀N : State(N) ∈ {Stopped}
```javascript
function shouldTerminate(cpux) {
  return cpux.members.every(n => n.state === 'Stopped')
}
```

#### Deadlock: PreHalt(CPUX) ∧ (∀N : A(N,F) = False)
```javascript
function detectDeadlock(cpux, field) {
  if (!preHalt(cpux)) return false
  
  // Check if any node can absorb from field
  const anyCanAbsorb = cpux.members.some(n => {
    return synctest(n.designatedIntention, n.designatedSignal, field)
  })
  
  return !anyCanAbsorb  // Deadlock if none can absorb
}
```

#### Complete: (pos = |CPUX|-1) ∧ (∀N : State(N) = Stopped)
```javascript
function isComplete(cpux, currentPos) {
  const atEndPosition = (currentPos === cpux.members.length - 1)
  const allStopped = cpux.members.every(n => n.state === 'Stopped')
  return atEndPosition && allStopped
}
```

---

### 4.5 Field Gating Operator

```javascript
/**
 * Signal(I) ⊆ Field@Container ∧ Gate(m)=open
 * Validates field gating for Intention absorption
 */
function fieldGatingOperator(intention, containerField, containerId) {
  const requiredPulses = getSignalDefinition(intention.phrase)
  const fieldPulseIds = Object.keys(containerField)
  
  // Hash validation
  const expectedHash = getSHR(intention.phrase)
  if (intention.hash !== expectedHash) {
    return { passed: false, reason: 'hash_mismatch' }
  }
  
  // Subset check: Signal(I) ⊆ Field@Container
  const hasRequiredPulses = requiredPulses.every(p => 
    fieldPulseIds.includes(p)
  )
  
  if (!hasRequiredPulses) {
    return { passed: false, reason: 'missing_pulses' }
  }
  
  // Gate validation
  const gateOpen = checkGateState(containerId)
  if (!gateOpen) {
    return { passed: false, reason: 'gate_closed' }
  }
  
  return { passed: true }
}
```

---

## 5. Implementation Mapping

### 5.1 Core Class Hierarchy

```typescript
// Root namespace
namespace IntentionSpace {
  
  // Core entities
  class IntentionSpace {
    id: string
    pulses: Map<PulseId, Pulse>
    intentions: Map<IntentionId, Intention>
    objects: Map<ObjectId, Object>
    designNodes: Map<DNId, DesignNode>
    cpuxDefinitions: Map<CPUXId, CPUX>
    users: Map<UserId, User>
    
    registerPulse(pulse: Pulse): void
    registerIntention(intention: Intention): void
    registerObject(object: Object): void
    registerDesignNode(dn: DesignNode): void
    registerCPUX(cpux: CPUX): void
    
    findCPUXByTrigger(intention: Intention, signal: Signal): CPUX | null
    getSignalHashRegistry(): SignalHashRegistry
  }
  
  // CPUX definition and execution
  class CPUX {
    id: CPUXId
    spaceId: IntentionSpaceId
    members: Array<DN | Object>  // Alternating sequence
    triggerIntentions: Array<{intention: Intention, signal: Signal}>
    finalEmissions: Array<{intention: Intention, signal: Signal}>
    config: CPUXConfig
    
    start(triggerIntention: Intention, triggerSignal: Signal): CPUXExecution
    validateStructure(): ValidationResult  // Check alternation rules
  }
  
  class CPUXExecution {
    cpux: CPUX
    visitor: Visitor
    currentPass: number
    executionStatus: 'Running' | 'Completed' | 'Terminated'
    
    executePass(): PassResult
    checkTermination(): TerminationResult
    getCurrentMember(): DN | Object
    moveToNextMember(): void
  }
  
  // Visitor
  class Visitor {
    cpux: CPUX
    cpuxField: CPUXField
    pickupArea: PickupArea
    currentMemberIndex: number
    currentPass: number
    
    visitDN(dn: DesignNode): VisitResult
    visitObject(object: Object): VisitResult
    moveToNext(): void
    emptypickupToObjectField(objectField: ObjectField): void
  }
  
  // Fields
  class CPUXField {
    FIS: Set<Intention>  // Field Intention Set
    FPS: Set<Pulse>      // Field Pulse Set
    
    absorb(intention: Intention, signal: Signal): void
    hasIntention(intentionId: IntentionId): boolean
    hasSignal(signal: Signal): boolean
  }
  
  class ObjectField {
    OIS: Set<Intention>  // Object Intention Set
    OPS: Set<Pulse>      // Object Pulse Set
    history: Array<AbsorptionRecord>
    
    absorb(intention: Intention, signal: Signal): void
    applyMapping(rules: Array<MappingRule>): void
    hasIntention(intentionId: IntentionId): boolean
    hasSignal(signal: Signal): boolean
  }
  
  class PickupArea {
    PIS: Array<{intention: Intention, signal: Signal}>
    
    add(intention: Intention, signal: Signal): void
    clear(): Array<{intention: Intention, signal: Signal}>
    isEmpty(): boolean
  }
  
  // Gatekeeper
  abstract class Gatekeeper {
    abstract synctest(
      intention: Intention, 
      signal: Signal, 
      field: Field
    ): boolean
  }
  
  class DNGatekeeper extends Gatekeeper {
    dn: DesignNode
    passArea: DNPassArea
    
    checkDNState(): DNState
    transferEmissionsToVisitor(visitor: Visitor): void
    synctest(intention: Intention, signal: Signal, field: CPUXField): boolean
    startDN(intention: Intention, signal: Signal): void
  }
  
  class ObjectGatekeeper extends Gatekeeper {
    object: Object
    passArea: ObjectPassArea
    
    synctestIncoming(objectField: ObjectField): boolean
    applyMappingRules(objectField: ObjectField): void
    synctestReflection(objectField: ObjectField): boolean
    reflectToField(cpuxField: CPUXField): void
    checkTriggers(objectField: ObjectField): Array<CPUXTrigger>
  }
  
  // Design Node
  class DesignNode {
    id: DNId
    spaceId: IntentionSpaceId
    gatekeeper: DNGatekeeper
    state: DNState  // 'Ready' | 'Busy' | 'Stopped'
    
    executeAsync(intention: Intention, signal: Signal): Promise<EmissionResult>
    emit(intention: Intention, signal: Signal): void
    setState(state: DNState): void
  }
  
  enum DNState {
    Ready = 'Ready',
    Busy = 'Busy',
    Stopped = 'Stopped'
  }
  
  // Object
  class Object {
    id: ObjectId
    spaceId: IntentionSpaceId
    gatekeeper: ObjectGatekeeper
    objectField: ObjectField
    isEmpty: boolean
    
    absorb(intention: Intention, signal: Signal): void
    reflect(cpuxField: CPUXField): ReflectionResult
    checkAndTriggerCPUX(): Array<CPUXTrigger>
  }
  
  // Intention & Signal
  class Intention {
    id: IntentionId
    spaceId: IntentionSpaceId
    phrase: string
    hash: number  // From SHR
    direction: 'Emission' | 'Absorption' | 'Reflection'
  }
  
  class Signal {
    pulses: Array<Pulse>
    hash: string  // IS# - Intention Signal Hash
    
    calculateHash(): string
    isSubsetOf(field: Field): boolean
  }
  
  class Pulse {
    id: PulseId
    phrase: string
    trivalence: 'Y' | 'N' | 'UN'
    responses: Array<string>
    
    isEditable(): boolean  // TV === 'Y'
    isReadOnly(): boolean  // TV === 'N'
    isAction(): boolean    // TV === 'UN'
  }
  
  // Algebraic operators
  class AlgebraicOperators {
    // Field operators
    static absorb(field: Field, intention: Intention, signal: Signal): Field
    static match(signal: Signal, field: Field): boolean
    static evolve(field: Field, emission: Emission): Field
    
    // Multi-CPUX operators
    static UMP(serverId: string, cpuxList: Array<CPUX>): ServerState
    static IRT(intention: Intention, iptpHeader: IPTPHeader): RoutingDecision
    static ICT(intention: Intention, sourceCPUX: string, targetCPUX: string): Transfer
    static ACT(fromNode: Node, toNode: Node, fieldState: Field): Transfer
    static PFO(domainId: string, pulseSet: Array<Pulse>): Federation
    
    // Loop & state operators
    static nextPosition(pos: number, cpuxLength: number): number
    
    // Termination operators
    static canContinue(cpux: CPUX): boolean
    static preHalt(cpux: CPUX): boolean
    static shouldTerminate(cpux: CPUX): boolean
    static detectDeadlock(cpux: CPUX, field: Field): boolean
    static isComplete(cpux: CPUX, currentPos: number): boolean
    
    // Field gating
    static fieldGatingOperator(
      intention: Intention, 
      containerField: Field, 
      containerId: string
    ): GatingResult
    
    // Synctest
    static synctest(
      intention: Intention, 
      signal: Signal, 
      field: Field
    ): boolean
  }
  
  // GridLookout
  class GridLookout {
    config: GridConfig
    cells: Map<CellId, Cell>
    pulseToCell: Map<PulseId, CellId>  // 1 Pulse = 1 Cell
    
    renderCell(pulse: Pulse, coords: CellCoordinates): Cell
    updateCell(cellId: CellId, newValue: any): void
    emitIntentionFromCell(cellId: CellId): {intention: Intention, signal: Signal}
  }
  
  class Cell {
    id: CellId
    pulse: Pulse
    coordinates: CellCoordinates
    editable: boolean  // From pulse.trivalence
    customAttributes: object
    
    render(platform: 'web' | 'mobile' | 'terminal'): RenderedCell
    handleUserInput(value: any): void
  }
  
  // Signal Hash Registry
  class SignalHashRegistry {
    registry: Map<string, number>  // phrase -> hash
    
    register(phrase: string, hash: number): void
    lookup(phrase: string): number | null
    reverseLookuphash(hash: number): string | null
  }
}
```

---

### 5.2 Key Method Signatures

```typescript
// CPUX execution
interface CPUXExecutor {
  startCPUX(
    cpux: CPUX, 
    triggerIntention: Intention, 
    triggerSignal: Signal
  ): CPUXExecution
  
  executeCPUXPass(execution: CPUXExecution): PassResult
  
  visitDN(
    dn: DesignNode, 
    visitor: Visitor, 
    gatekeeper: DNGatekeeper
  ): VisitResult
  
  visitObject(
    object: Object, 
    visitor: Visitor, 
    gatekeeper: ObjectGatekeeper
  ): VisitResult
  
  checkTermination(execution: CPUXExecution): TerminationResult
  
  detectGoldenPass(passResult: PassResult): boolean
}

// Synctest validation
interface SynctestValidator {
  synctest(
    designatedIntention: Intention,
    designatedSignal: Signal,
    sourceField: Field
  ): boolean
  
  validateFieldGating(
    fromNode: Node,
    toNode: Node,
    fieldState: Field
  ): GatingResult
  
  calculateSignalHash(intention: Intention, signal: Signal): string
  
  matchSignalHash(
    runtimeHash: string,
    designTimeHash: string
  ): boolean
}

// Field operations
interface FieldOperations {
  absorbIntention(field: Field, intention: Intention): void
  
  absorbSignal(field: Field, signal: Signal): void
  
  reflectIntention(
    objectField: ObjectField,
    cpuxField: CPUXField,
    intention: Intention,
    signal: Signal
  ): void
  
  applyMappingRules(
    objectField: ObjectField,
    rules: Array<MappingRule>
  ): ObjectField
  
  extractSignal(
    field: Field,
    intention: Intention
  ): Signal
}

// CPUX triggering
interface CPUXTriggerManager {
  checkTriggerConditions(
    objectField: ObjectField,
    intentionSpace: IntentionSpace
  ): Array<CPUXTrigger>
  
  triggerCPUXAsync(
    cpux: CPUX,
    triggerIntention: Intention,
    triggerSignal: Signal,
    sourceObject: Object
  ): Promise<CPUXExecution>
  
  triggerCPUXSync(
    cpux: CPUX,
    triggerIntention: Intention,
    triggerSignal: Signal,
    sourceObject: Object
  ): CPUXExecution
}

// DN execution
interface DNExecutor {
  executeAsync(
    dn: DesignNode,
    incomingIntention: Intention,
    incomingSignal: Signal
  ): Promise<Array<{intention: Intention, signal: Signal}>>
  
  emitIntention(
    dn: DesignNode,
    intention: Intention,
    signal: Signal
  ): void
  
  updateDNState(dn: DesignNode, newState: DNState): void
}

// Object reflection
interface ObjectReflector {
  reflectIntention(
    object: Object,
    cpuxField: CPUXField
  ): ReflectionResult
  
  validateReflection(
    objectField: ObjectField,
    designatedReflection: {intention: Intention, signal: Signal}
  ): boolean
  
  removeReflectedFromField(
    objectField: ObjectField,
    reflected: {intention: Intention, signal: Signal}
  ): void
}

// GridLookout rendering
interface GridLookoutRenderer {
  renderGrid(
    intention: Intention,
    signal: Signal,
    viewport: ViewportConfig
  ): Grid
  
  renderCell(
    pulse: Pulse,
    coordinates: CellCoordinates,
    platform: 'web' | 'mobile' | 'terminal'
  ): RenderedCell
  
  handleCellInteraction(
    cell: Cell,
    userInput: any
  ): {intention: Intention, signal: Signal}
  
  updateCellValue(
    cellId: CellId,
    newValue: any
  ): void
}

// Multi-CPUX coordination
interface MultiCPUXCoordinator {
  registerCPUXParticipation(
    serverId: string,
    cpux: CPUX
  ): ParticipationRecord
  
  routeIntention(
    intention: Intention,
    iptpHeader: IPTPHeader
  ): RoutingDecision
  
  transferInterCPUX(
    intention: Intention,
    sourceCPUX: CPUXId,
    targetCPUX: CPUXId
  ): TransferResult
  
  transferIntraCPUX(
    fromNode: Node,
    toNode: Node,
    fieldState: Field
  ): TransferResult
  
  federatePulses(
    domainId: string,
    pulseSet: Array<Pulse>
  ): FederationState
}
```

---

### 5.3 Data Structure Definitions

```typescript
// Core types
type IntentionSpaceId = string
type CPUXId = string
type DNId = string
type ObjectId = string
type IntentionId = string
type PulseId = string
type SignalHash = string
type UserId = string
type CellId = string

// Configuration types
interface CPUXConfig {
  max_passes: number
  async_dn_execution: boolean
  async_cpux_trigger: boolean
  remove_after_reflection: boolean
}

interface GridConfig {
  rows: number
  cols: number
  viewportWidth: number
  viewportHeight: number
  cellWidth: number
  cellHeight: number
  padding: number
  layers: number
}

interface ViewportConfig {
  width: number
  height: number
  rows: number
  cols: number
}

// Pass area structures
interface DNPassArea {
  designated_input: {
    intention: Intention
    signal: Signal
  }
  emitted_outputs: Array<{
    intention: Intention
    signal: Signal
  }>
}

interface ObjectPassArea {
  designated_incoming: {
    intention: Intention
    signal: Signal
  }
  mapping_rules: Array<MappingRule>
  reflected: {
    intention: Intention
    signal: Signal
  }
}

// Mapping
interface MappingRule {
  source_pulses: Array<PulseId>
  target_pulses: Array<PulseId>
  transformation: (sourcePulses: Array<Pulse>) => Array<Pulse>
}

// Result types
interface VisitResult {
  member_type: 'DN' | 'Object'
  dn_started?: boolean
  dn_executing?: boolean
  emissions_transferred?: boolean
  reflected?: boolean
  cpux_triggered?: boolean
  new_cpux_instances?: Array<CPUXExecution>
}

interface PassResult {
  pass_number: number
  any_emission: boolean
  any_reflection: boolean
  any_dn_triggered: boolean
  any_dn_executing: boolean
  is_golden_pass: boolean
}

interface TerminationResult {
  terminated: boolean
  reason?: 'golden_pass' | 'all_dns_stopped' | 'max_passes_exceeded' | 'external_stop'
  status: 'completed' | 'warning' | 'error'
}

interface GatingResult {
  passed: boolean
  reason?: string
  hashMatch?: boolean
  signalMatch?: boolean
  stateValid?: boolean
}

interface ReflectionResult {
  reflected: boolean
  intention?: Intention
  signal?: Signal
  removed_from_field: boolean
}

interface CPUXTrigger {
  cpux: CPUX
  triggerIntention: Intention
  triggerSignal: Signal
  sourceObject: Object
  async: boolean
}

// Cell structures
interface CellCoordinates {
  row: number
  col: number
  layer: number
  rowspan: number
  colspan: number
}

interface RenderedCell {
  id: CellId
  pulse: Pulse
  coordinates: CellCoordinates
  value: any
  editable: boolean
  platform: 'web' | 'mobile' | 'terminal'
  html?: string
  nativeComponent?: any
}

// Multi-CPUX structures
interface ServerState {
  serverId: string
  participatingCPUX: Map<CPUXId, ParticipationRecord>
  routingTables: Map<CPUXId, RoutingEntry>
  fieldStateCaches: Map<CPUXId, Map<any, any>>
  crossSpaceBridges: Set<string>
}

interface ParticipationRecord {
  cpuxId: CPUXId
  spaceId: IntentionSpaceId
  endpoints: {
    intentions: string
    objects: string
    designNodes: string
  }
  fieldState: {
    cache: Map<any, any>
    syncInterval: number
    lastSync: number
  }
  capabilities: Set<string>
}

interface RoutingEntry {
  spaceId: IntentionSpaceId
  intentionEndpoint: string
  objectEndpoint: string
  designNodeEndpoint: string
}

interface IPTPHeader {
  version: string
  targetCPUX: CPUXId
  sourceCPUX: CPUXId
  signalHash: SignalHash
  transferType: 'inter_cpux' | 'intra_cpux'
  timestamp: number
}

interface RoutingDecision {
  intention: Intention
  routingMethod: 'iptp_header_based' | 'field_gating'
  targetServer: string | null
  targetCPUX: CPUXId | null
  routingPath: Array<{
    step: string
    match: any
    action: string
  }>
  timestamp: number
}

interface Transfer {
  transferId: string
  transferType: 'inter_cpux' | 'intra_cpux'
  sourceCPUX?: CPUXId
  targetCPUX?: CPUXId
  fromNode?: Node
  toNode?: Node
  method: 'intention_routing' | 'field_gating'
  useFieldGating: boolean
  success: boolean
  timestamp: number
}

interface FederationState {
  domainId: string
  sharedPulses: Set<Pulse>
  privatePulses: Set<Pulse>
  collaborators: Map<string, CollaboratorInfo>
  autonomyLevel: 'domain_sovereign'
  federationProtocol: {
    shareRule: string
    privacyRule: string
    collaborationMode: string
  }
}
```

---

## 6. Missing Concepts Analysis

After analyzing the uploaded manual and project knowledge, here are concepts that may need clarification or are currently underspecified:

### 6.1 Underspecified Concepts

#### 6.1.1 Nonce & Execution Context Identity
- **What's Present**: CPUX invocation nonce mentioned for rollback/compensation
- **Missing**: 
  - How nonce is generated
  - How it's propagated through execution
  - Relationship to execution context addressing
  - Nonce lifecycle management

**Recommendation**: Define `ExecutionNonce` structure and generation algorithm

---

#### 6.1.2 Rollback & Compensation Mechanism
- **What's Present**: Objects provide persistence for rollback/compensation
- **Missing**:
  - Rollback trigger conditions
  - Compensation strategy selection
  - State snapshot mechanism
  - Transaction boundaries
  - Idempotency guarantees

**Recommendation**: Define `CompensationManager` class with rollback strategies

---

#### 6.1.3 DN Black-Box Internal State
- **What's Present**: DN is black-box, emits any Intention at runtime
- **Missing**:
  - Internal state persistence model
  - State visibility to gatekeeper
  - State recovery after failure
  - Deterministic vs non-deterministic DN behavior

**Recommendation**: Specify DN state contract and observability requirements

---

#### 6.1.4 Async Execution Boundaries
- **What's Present**: DN executes async, CPUX triggering can be async
- **Missing**:
  - Thread safety guarantees
  - Concurrency model (actor-based, CSP, etc.)
  - Race condition handling
  - Async error propagation

**Recommendation**: Define concurrency model and async execution contract

---

#### 6.1.5 Error Handling & Fault Tolerance
- **What's Present**: DN state transitions, synctest failures
- **Missing**:
  - Exception propagation from DN
  - Synctest failure recovery
  - Visitor error handling
  - CPUX-level fault tolerance
  - Retry policies

**Recommendation**: Define `ErrorHandler` and fault recovery strategies

---

#### 6.1.6 Signal Hash Collision Resolution
- **What's Present**: Signal Hash (IS#) uniquely identifies Intention+Signal
- **Missing**:
  - Hash collision detection
  - Collision resolution strategy
  - Hash uniqueness guarantees across Intention Spaces

**Recommendation**: Specify hash algorithm (e.g., SHA-256) and collision protocol

---

#### 6.1.7 Object Mapping Rule Semantics
- **What's Present**: Objects can have configured mappings
- **Missing**:
  - Mapping rule language/syntax
  - Mapping validation at design-time
  - Mapping failure handling
  - Bi-directional mapping support

**Recommendation**: Define mapping DSL and transformation semantics

---

#### 6.1.8 CPUX Composition & Nesting
- **What's Present**: Objects can trigger new CPUX
- **Missing**:
  - Parent-child CPUX relationship
  - Nested CPUX execution model
  - Scope isolation
  - Return value propagation from nested CPUX

**Recommendation**: Define CPUX composition algebra and nesting rules

---

#### 6.1.9 GridLookout Platform Abstraction
- **What's Present**: Renders on web, mobile, terminal
- **Missing**:
  - Platform-specific rendering contract
  - Input event normalization across platforms
  - Custom platform adapters
  - Platform capability detection

**Recommendation**: Define `PlatformAdapter` interface and capability flags

---

#### 6.1.10 Pulse Response Validation
- **What's Present**: Design-time responses must match runtime (if specified)
- **Missing**:
  - Response data type system
  - Validation rules (regex, range, enum)
  - Runtime validation enforcement
  - Validation failure handling

**Recommendation**: Define `ResponseValidator` with type system and constraints

---

#### 6.1.11 IPTP Protocol Details
- **What's Present**: IPTP headers for cross-CPUX routing
- **Missing**:
  - Full IPTP packet structure
  - Protocol versioning
  - Authentication/authorization
  - Encryption/security
  - Network transport (HTTP, gRPC, etc.)

**Recommendation**: Specify complete IPTP protocol specification

---

#### 6.1.12 Distributed CPUX Coordination
- **What's Present**: Same dynamics whether local or distributed
- **Missing**:
  - Distributed visitor implementation
  - Network partition handling
  - CAP theorem trade-offs
  - Consensus mechanism for multi-node fields
  - Clock synchronization

**Recommendation**: Define distributed execution model and consistency guarantees

---

#### 6.1.13 Performance & Scalability Constraints
- **What's Present**: BigInt scalability mentioned
- **Missing**:
  - Maximum CPUX length
  - Maximum pass count
  - Field size limits
  - Response array size limits
  - Concurrent CPUX execution limits

**Recommendation**: Define performance SLAs and resource limits

---

#### 6.1.14 Security & Access Control
- **What's Present**: User UIDs, enterprise user management
- **Missing**:
  - DN execution permissions
  - Object access control
  - Intention authorization
  - Pulse-level security
  - Audit logging

**Recommendation**: Define `AccessControl` framework and audit trail

---

#### 6.1.15 Monitoring & Observability
- **What's Present**: Execution history in CPUXChainOrchestrator
- **Missing**:
  - Real-time execution tracing
  - Performance metrics
  - Field state introspection
  - Debug mode semantics
  - Execution replay

**Recommendation**: Define `ObservabilityProvider` with metrics and tracing

---

### 6.2 Recommended Additions

To make the framework complete for implementation, consider adding:

1. **Transaction Management**: ACID properties, distributed transactions
2. **Versioning**: CPUX version evolution, backward compatibility
3. **Testing Framework**: CPUX unit testing, integration testing patterns
4. **Migration Tools**: Design-time to runtime deployment
5. **Development Tools**: CPUX IDE, visual designer, debugger
6. **Performance Tuning**: Caching strategies, optimization hints
7. **Deployment Model**: Containerization, orchestration (Kubernetes)
8. **API Specification**: RESTful API for Intention Space management

---

## Glossary

Quick reference for all keywords:

- **ACT**: Intra-CPUX Transfer (field gating-based)
- **CPUX**: Computational Processing Unit eXtended
- **DN**: Design Node
- **FIS**: Field Intention Set (in CPUX-Field)
- **FPS**: Field Pulse Set (in CPUX-Field)
- **Golden Pass**: Termination condition (no state changes)
- **ICT**: Inter-CPUX Transfer (IPTP-based, no field gating)
- **IPTP**: Inter-Process Transfer Protocol
- **IRT**: Intention Routing
- **IS**: Intention Space
- **IS#**: Intention Signal Hash
- **Link**: DN-to-DN connection through Objects
- **O**: Object
- **OIS**: Object Intention Set (in Object-Field)
- **OPS**: Object Pulse Set (in Object-Field)
- **PFO**: Praxis Federation Operator
- **PIS**: Pickup Intention+Signal (in Visitor pickup area)
- **SHR**: Signal Hash Registry
- **Synctest**: Field/Object-Field validation mechanism
- **TV**: Trivalence (Y, N, UN)
- **UMP**: Multi-CPUX Participation
- **Visitor**: Mobile execution controller traversing CPUX

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation  
**License**: Proprietary - Intention Space Framework

---

*This reference manual provides the foundation for implementing Intention Space CPUX runtime in any programming language or platform. All algebraic operators, execution sequences, and data structures are precisely defined for deterministic implementation.*