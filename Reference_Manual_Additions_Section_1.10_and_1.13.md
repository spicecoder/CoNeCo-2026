# Reference Manual Additions: Enhanced Section 1.10 and New Section 1.13

## 📝 Instructions for Integration

**Replace** existing section 1.10 with the enhanced version below.
**Insert** new section 1.13 after section 1.12.5 (Terminology Summary).
**Renumber** existing sections: GridLookout becomes 1.14, IS# becomes 1.15, Golden Pass becomes 1.16.

---

## ✅ Enhanced Section 1.10: Gatekeeper (REPLACE EXISTING)

### 1.10 Gatekeeper

**Definition**: Conditional controller for Intention+Signal absorption/emission at DN and Object boundaries.

**CRITICAL PRINCIPLE**: 
> **Transfer operations (DN passArea → pickup, pickup → Object-Field) happen UNCONDITIONALLY during visitor visits. syncTest ONLY controls execution/reflection decisions, NOT absorption/emission.**

This means:
- ✅ **DN emissions → pickup**: Unconditional (no syncTest)
- ✅ **pickup → Object-Field**: Unconditional (no syncTest)
- ✅ **DN execution start**: Conditional (syncTest required)
- ✅ **Object reflection**: Conditional (syncTest required)

---

#### 1.10.1 DN Gatekeeper

**Purpose**: Controls whether a Design Node **executes**, not whether it **emits** or **absorbs from pickup**.

**Components**:

1. **Pass-Area** (DN-local storage):
   - `designated_input`: Intention+Signal that triggers DN execution
   - `emitted_outputs`: Array of Intention+Signal pairs emitted after DN execution

2. **State Management**:
   - Tracks DN state: `Ready` | `Busy` | `Stopped`
   - Prevents concurrent execution of same DN

3. **Synctest Validation**:
   - **Input**: Checks `visitor.cpux_field` against `designated_input`
   - **Purpose**: Decides whether to **start DN execution**
   - **Does NOT control**: Transfer of emitted_outputs to pickup

**Execution Flow**:

```javascript
// When Visitor visits DN:

// Step 1: Transfer DN emissions to pickup (UNCONDITIONAL)
if (dn.passArea.emitted_outputs.length > 0) {
  visitor.pickupArea.PIS.push(...dn.passArea.emitted_outputs);
  dn.passArea.emitted_outputs = []; // Clear
  // ❌ NO SYNCTEST - This always happens!
}

// Step 2: Check if DN should execute (CONDITIONAL)
const synctestPassed = synctest(
  dn.gatekeeper.designated_input.intention,
  dn.gatekeeper.designated_input.signal,
  visitor.cpux_field  // Check against Field, not pickup!
);

if (synctestPassed && dn.state !== 'Busy') {
  dn.executeAsync(); // Start execution
  dn.state = 'Busy';
}

// Step 3: Visitor moves to next member
visitor.moveToNext();
```

**Key Insight**: 
- When DN finishes execution (async), it places results in `passArea.emitted_outputs`
- This happens **independently** of visitor position
- When visitor **next** visits this DN, outputs transfer to pickup (unconditional)

**Example**:
```javascript
// Pass 1:
// Visitor visits DN1 → syncTest passes → DN1 starts execution (async)
// Visitor moves to O1 (DN1 still executing in background)

// Pass 2:
// Visitor visits DN1 again → DN1 finished, has emitted_outputs
//   → Transfer to pickup (NO SYNCTEST!)
//   → syncTest for new execution (may start again or skip)
```

---

#### 1.10.2 Object Gatekeeper

**Purpose**: Controls whether an Object **reflects**, not whether it **absorbs from pickup**.

**Components**:

1. **Pass-Area** (Object configuration):
   - `designated_incoming`: Expected Intention+Signal to trigger reflection
   - `designated_reflected`: Intention+Signal to emit after reflection
   - `mapping_rules`: PnR transformation rules (optional)

2. **Object-Field** (Object-local state):
   - `OIS`: Object Intention Set (accumulated intentions)
   - `OPS`: Object Pulse Set (accumulated pulses)
   - Persists across multiple visitor passes

3. **Synctest Validation**:
   - **Incoming**: Checks `object.objectField` against `designated_incoming`
   - **Reflection**: Checks `object.objectField` (after mappings) against `designated_reflected`
   - **Does NOT control**: Absorption of pickup into Object-Field

**Execution Flow**:

```javascript
// When Visitor visits Object:

// Step 1: Empty pickup into Object-Field (UNCONDITIONAL)
for (const {intention, signal} of visitor.pickupArea.PIS) {
  object.objectField.OIS.add(intention);
  object.objectField.OPS.add(...signal.pulses);
  // ❌ NO SYNCTEST - Object absorbs everything!
}
visitor.pickupArea.PIS = []; // Clear

// Step 2: Check if incoming matches (CONDITIONAL)
const incomingSynctest = synctest(
  object.gatekeeper.designated_incoming.intention,
  object.gatekeeper.designated_incoming.signal,
  object.objectField  // Check against Object-Field, not pickup!
);

if (!incomingSynctest) {
  // Skip reflection
  visitor.moveToNext();
  return;
}

// Step 3: Apply mappings (pure PnR operations)
applyMappingRules(object.objectField, object.gatekeeper.mapping_rules);

// Step 4: Check if reflection should happen (CONDITIONAL)
const reflectionSynctest = synctest(
  object.gatekeeper.designated_reflected.intention,
  object.gatekeeper.designated_reflected.signal,
  object.objectField  // After mappings
);

if (reflectionSynctest) {
  // Reflect to CPUX-Field
  visitor.cpux_field.FIS.add(designated_reflected.intention);
  visitor.cpux_field.FPS.add(...designated_reflected.signal.pulses);
  // ✅ SYNCTEST PASSED - Reflection happened
}

// Step 5: Visitor moves to next member
visitor.moveToNext();
```

**Key Insight**:
- Object **unconditionally absorbs** all contents of pickup
- Object **conditionally reflects** based on syncTest
- Object-Field **accumulates** across multiple passes (persistence)

**Example**:
```javascript
// Pass 1:
// DN1 emits INT_A → pickup
// Visitor visits O1 → pickup emptied into O1.objectField (unconditional)
//   → syncTest for designated_incoming fails
//   → No reflection

// Pass 2:
// DN2 emits INT_B → pickup
// Visitor visits O1 → pickup emptied into O1.objectField (unconditional)
//   → O1.objectField now has {INT_A, INT_B}
//   → syncTest for designated_incoming passes (has INT_B)
//   → Apply mappings
//   → syncTest for reflection passes
//   → Reflect INT_C to visitor.cpux_field
```

---

#### 1.10.3 Synctest Algorithm

**Function Signature**:
```javascript
function synctest(
  designated_intention: Intention,
  designated_signal: Signal,
  source_field: Field  // CPUX-Field or Object-Field
): boolean
```

**Logic**:
```javascript
// 1. Check Intention presence
if (!source_field.FIS.has(designated_intention.id)) {
  return false;  // Required intention not present
}

// 2. Check Signal is subset (all required pulses present)
const requiredPulseIds = designated_signal.pulses.map(p => p.id);
const availablePulseIds = new Set(source_field.FPS.map(p => p.id));

for (const pulseId of requiredPulseIds) {
  if (!availablePulseIds.has(pulseId)) {
    return false;  // Missing required pulse
  }
}

return true;  // All requirements met
```

**Properties**:
- ✅ **Deterministic**: Same inputs → same output
- ✅ **Pure function**: No side effects
- ✅ **Subset check**: Designated signal must be ⊆ source field
- ✅ **Trivalence aware**: Can check pulse trivalence values

---

#### 1.10.4 What Gatekeeper Does NOT Control

**Critical Clarifications**:

| Operation | Gatekeeper Control? | Condition |
|-----------|-------------------|-----------|
| DN emits to passArea | ❌ **NO** | DN execution completes (async) |
| passArea → pickup transfer | ❌ **NO** | Visitor visits DN (always happens) |
| pickup → Object-Field | ❌ **NO** | Visitor visits Object (always happens) |
| DN execution start | ✅ **YES** | syncTest(designated_input, visitor.cpux_field) |
| Object reflection | ✅ **YES** | syncTest(designated_reflected, object.objectField) |

**Key Principle**:
> **Gatekeepers are FIREWALLS for execution/reflection, NOT checkpoints for data movement.**

Data flows freely:
- DN → passArea → pickup → Object-Field

Gatekeepers block:
- DN execution (if Field doesn't match)
- Object reflection (if Object-Field doesn't match)

---

#### 1.10.5 Implementation Considerations

**Backend CPUX (Autonomous Visitor)**:
- Visitor carries pickup area
- Synchronous visits: DN → O → DN → O (touring)
- State changes only during visits

**Frontend CPUX (Intention Tunnel)**:
- No pickup area (Field is shared)
- Asynchronous events: DN/Object listen to Field
- State changes trigger re-evaluation

**Unified Semantics**:
- Both use syncTest for execution/reflection control
- Both have unconditional data flow
- Only orchestration differs

**Implementation Class**: `Gatekeeper`, `DNGatekeeper`, `ObjectGatekeeper`

---

## 🆕 New Section 1.13: UI Component Gatekeepers (INSERT AFTER 1.12.5)

### 1.13 UI Component Gatekeepers (Intention Tunnel Only)

**Definition**: Optional validation layer for UI components in Intention Tunnel mode, defining authorized emissions and subscriptions.

**Scope**: Frontend CPUX / Intention Tunnel only (not applicable to Backend CPUX).

**Purpose**:
- 🔒 **Authorization**: Define which intentions a component can emit
- 📊 **Audit Trail**: Track "Component X emitted Intention Y at timestamp Z"
- 🛡️ **Security**: Prevent unauthorized state mutations
- 📝 **Schema-Driven UI**: Component behavior as declarative specification
- 🎓 **Documentation**: Self-documenting component capabilities

---

#### 1.13.1 When to Use UI Component Gatekeepers

**⚠️ NOT Recommended For**:
- ❌ Learning CPUX concepts (adds unnecessary complexity)
- ❌ Simple applications (validation at DN/Object is sufficient)
- ❌ Prototyping / MVPs (premature optimization)
- ❌ Internal tools (trust-based environments)

**✅ Recommended For**:
- ✅ **Enterprise Applications**: Banking, healthcare, government systems
- ✅ **Multi-Tenant Systems**: SaaS platforms with role-based access
- ✅ **Audit Requirements**: Regulatory compliance (SOX, HIPAA, GDPR)
- ✅ **Security-Critical Apps**: Where unauthorized mutations are high-risk
- ✅ **Large Teams**: Clear contracts between UI and backend teams

**Default Approach**: 
> Start without UI gatekeepers. Add them when enterprise requirements demand formal authorization tracking.

---

#### 1.13.2 Emit Gatekeeper

**Purpose**: Validates that a UI component is **authorized** to emit a specific intention.

**Schema Definition**:
```json
{
  "ui_components": [
    {
      "component_id": "TodoInput",
      "component_type": "input_form",
      "designated_emissions": {
        "INT_ADD_TODO": {
          "description": "User requests to add new todo",
          "signal_schema": {
            "text": {
              "type": "string",
              "required": true,
              "min_length": 1,
              "max_length": 500
            }
          },
          "rate_limit": {
            "max_per_minute": 60,
            "max_per_hour": 1000
          }
        }
      },
      "forbidden_emissions": [
        "INT_DELETE_ALL_TODOS",  // Admin-only
        "INT_SYSTEM_SHUTDOWN"     // System-only
      ]
    }
  ]
}
```

**Runtime Validation**:
```javascript
/**
 * Enhanced emit() with gatekeeper validation
 */
function emit(intentionId, pulseData, componentId) {
  // Step 1: Get component schema
  const componentSchema = getComponentSchema(componentId);
  
  if (!componentSchema) {
    console.warn(`⚠️ Component ${componentId} not registered in schema`);
    // Decision: Allow (warning only) or Block (strict mode)
    if (config.strictMode) return;
  }
  
  // Step 2: Check authorization
  const designated = componentSchema?.designated_emissions?.[intentionId];
  
  if (!designated) {
    // Component not authorized to emit this intention
    console.error(`❌ Authorization Error: ${componentId} cannot emit ${intentionId}`);
    
    // Log to audit trail
    auditLog.record({
      timestamp: Date.now(),
      component: componentId,
      action: 'emit_blocked',
      intention: intentionId,
      reason: 'not_in_designated_emissions'
    });
    
    // Decision: Block or allow with warning
    if (config.blockUnauthorizedEmissions) {
      return;  // Block
    }
    console.warn(`⚠️ Allowing unauthorized emission (config.blockUnauthorizedEmissions=false)`);
  }
  
  // Step 3: Validate signal structure
  if (designated?.signal_schema) {
    const validation = validateSignal(pulseData, designated.signal_schema);
    
    if (!validation.valid) {
      console.error(`❌ Signal Validation Error for ${intentionId}:`, validation.errors);
      
      auditLog.record({
        timestamp: Date.now(),
        component: componentId,
        action: 'emit_blocked',
        intention: intentionId,
        reason: 'invalid_signal',
        errors: validation.errors
      });
      
      return;  // Block invalid signals
    }
  }
  
  // Step 4: Check forbidden list
  if (componentSchema?.forbidden_emissions?.includes(intentionId)) {
    console.error(`❌ Forbidden Emission: ${componentId} explicitly forbidden from ${intentionId}`);
    
    auditLog.record({
      timestamp: Date.now(),
      component: componentId,
      action: 'emit_blocked',
      intention: intentionId,
      reason: 'in_forbidden_list',
      severity: 'critical'
    });
    
    return;  // Always block forbidden
  }
  
  // Step 5: Rate limiting (optional)
  if (designated?.rate_limit) {
    const rateLimitPassed = checkRateLimit(componentId, intentionId, designated.rate_limit);
    
    if (!rateLimitPassed) {
      console.warn(`⚠️ Rate Limit Exceeded: ${componentId} → ${intentionId}`);
      
      auditLog.record({
        timestamp: Date.now(),
        component: componentId,
        action: 'emit_throttled',
        intention: intentionId,
        reason: 'rate_limit_exceeded'
      });
      
      return;  // Block until rate limit resets
    }
  }
  
  // Step 6: Emit to Field (authorized)
  auditLog.record({
    timestamp: Date.now(),
    component: componentId,
    action: 'emit_success',
    intention: intentionId,
    signal: sanitizeForAudit(pulseData)
  });
  
  field.addIntention(intentionId, pulseData);
  
  console.log(`✅ ${componentId} emitted ${intentionId}`);
}
```

**Usage in Component**:
```javascript
import React, { useState } from 'react';
import { useIntentionTunnel } from '../hooks/useIntentionTunnel';

function TodoInput() {
  const { emit } = useIntentionTunnel();
  const [text, setText] = useState('');
  
  const handleAdd = () => {
    // Gatekeeper validates this emission
    emit('INT_ADD_TODO', { text }, 'TodoInput');
    //                               ^^^^^^^^^^
    //                               Component ID for authorization
    
    setText('');
  };
  
  return (
    <input 
      value={text} 
      onChange={e => setText(e.target.value)}
      onKeyPress={e => e.key === 'Enter' && handleAdd()}
    />
  );
}
```

---

#### 1.13.3 Subscribe Gatekeeper

**Purpose**: Validates that a UI component **should** subscribe to specific pulses (warning/documentation, rarely blocking).

**Schema Definition**:
```json
{
  "ui_components": [
    {
      "component_id": "TodoList",
      "component_type": "display_list",
      "designated_subscriptions": {
        "pulses": [
          "todos",
          "todo_count",
          "active_count"
        ],
        "intentions": [
          "INT_TODO_ADDED",
          "INT_TODO_TOGGLED",
          "INT_TODO_REMOVED"
        ]
      },
      "subscription_purpose": {
        "todos": "Render list of all todos",
        "todo_count": "Display total count badge"
      }
    }
  ]
}
```

**Runtime Validation**:
```javascript
/**
 * Enhanced useFieldPulse() with gatekeeper validation
 */
function useFieldPulse(pulseName, componentId) {
  const { subscribe, getFieldPulse } = useIntentionTunnel();
  const [value, setValue] = useState(() => getFieldPulse(pulseName));
  
  useEffect(() => {
    // Step 1: Get component schema
    const componentSchema = getComponentSchema(componentId);
    
    // Step 2: Check if subscription is designated
    if (componentSchema?.designated_subscriptions?.pulses) {
      const designated = componentSchema.designated_subscriptions.pulses;
      
      if (!designated.includes(pulseName)) {
        console.warn(
          `⚠️ Unexpected Subscription: ${componentId} subscribing to non-designated pulse "${pulseName}"\n` +
          `   Designated pulses: ${designated.join(', ')}`
        );
        
        // Log for documentation/debugging (rarely block)
        auditLog.record({
          timestamp: Date.now(),
          component: componentId,
          action: 'subscribe_unexpected',
          pulse: pulseName,
          severity: 'info'
        });
        
        // Usually allow (informational warning)
        // Only block if config.strictSubscriptions = true
      }
    }
    
    // Step 3: Subscribe normally
    const unsubscribe = subscribe(pulseName, setValue);
    
    // Log subscription
    auditLog.record({
      timestamp: Date.now(),
      component: componentId,
      action: 'subscribe',
      pulse: pulseName
    });
    
    return unsubscribe;
  }, [pulseName, componentId, subscribe]);
  
  return value;
}
```

**Usage in Component**:
```javascript
import React from 'react';
import { useFieldPulse } from '../hooks/useIntentionTunnel';

function TodoList() {
  // Gatekeeper validates this subscription
  const todosJson = useFieldPulse('todos', 'TodoList');
  //                                        ^^^^^^^^^^^
  //                                        Component ID
  const todos = todosJson ? JSON.parse(todosJson) : [];
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

---

#### 1.13.4 Configuration Modes

**Three Operating Modes**:

```javascript
const gatekeeperConfig = {
  mode: 'development' | 'staging' | 'production',
  
  development: {
    emitGatekeeper: 'warn',           // Log warnings, allow all
    subscribeGatekeeper: 'off',       // No validation
    auditTrail: false,                // No audit logging
    blockUnauthorized: false          // Never block
  },
  
  staging: {
    emitGatekeeper: 'validate',       // Validate, warn on issues
    subscribeGatekeeper: 'warn',      // Warn on unexpected
    auditTrail: true,                 // Log to console
    blockUnauthorized: false          // Warn but allow
  },
  
  production: {
    emitGatekeeper: 'enforce',        // Strict validation, block unauthorized
    subscribeGatekeeper: 'validate',  // Validate, warn on unexpected
    auditTrail: true,                 // Log to remote audit service
    blockUnauthorized: true,          // Block all unauthorized
    rateLimiting: true,               // Enforce rate limits
    alertOnViolation: true            // Send alerts for security team
  }
};
```

---

#### 1.13.5 Audit Trail Structure

**Purpose**: Track all component interactions with Field for compliance, debugging, and security analysis.

**Log Entry Schema**:
```typescript
interface AuditLogEntry {
  timestamp: number;           // Unix timestamp (ms)
  component: string;           // Component ID
  action: AuditAction;         // What happened
  intention?: string;          // Intention ID (for emits)
  pulse?: string;              // Pulse name (for subscribes)
  signal?: SanitizedSignal;    // Signal data (PII removed)
  reason?: string;             // Why blocked/warned
  severity: 'info' | 'warn' | 'error' | 'critical';
  user_id?: string;            // Current user (if authenticated)
  session_id?: string;         // Browser session ID
  trace_id?: string;           // Distributed trace ID (for correlation)
}

type AuditAction = 
  | 'emit_success'
  | 'emit_blocked'
  | 'emit_throttled'
  | 'subscribe'
  | 'subscribe_unexpected'
  | 'unsubscribe';
```

**Example Log Entries**:
```javascript
// Successful emission
{
  timestamp: 1705234567890,
  component: 'TodoInput',
  action: 'emit_success',
  intention: 'INT_ADD_TODO',
  signal: { text: 'Buy milk' },  // Sanitized (no PII)
  severity: 'info',
  user_id: 'user_12345',
  session_id: 'sess_abcdef'
}

// Blocked emission (security violation)
{
  timestamp: 1705234567891,
  component: 'TodoInput',
  action: 'emit_blocked',
  intention: 'INT_DELETE_ALL_USERS',  // Forbidden
  reason: 'in_forbidden_list',
  severity: 'critical',
  user_id: 'user_12345',
  session_id: 'sess_abcdef',
  alert_sent: true
}

// Unexpected subscription (informational)
{
  timestamp: 1705234567892,
  component: 'TodoList',
  action: 'subscribe_unexpected',
  pulse: 'admin_settings',  // Not in designated list
  reason: 'not_in_designated_subscriptions',
  severity: 'warn',
  user_id: 'user_12345'
}
```

**Audit Trail Analysis**:
- 📊 **Usage Patterns**: Which components emit which intentions most?
- 🔍 **Security Events**: Unauthorized emission attempts
- 🐛 **Debugging**: Trace component behavior across sessions
- 📈 **Compliance Reports**: SOX/HIPAA audit requirements

---

#### 1.13.6 Comparison: DN/Object Gatekeepers vs UI Component Gatekeepers

| Aspect | DN/Object Gatekeeper | UI Component Gatekeeper |
|--------|---------------------|------------------------|
| **Purpose** | Control execution/reflection | Control authorization |
| **Validation** | syncTest (Field subset check) | Schema validation + authorization |
| **Enforcement** | ALWAYS (core CPUX semantics) | OPTIONAL (enterprise pattern) |
| **Blocks** | Execution/reflection decisions | Unauthorized emissions |
| **Logs** | Execution trace | Audit trail for compliance |
| **When** | Runtime (reactive) | Runtime (proactive) |
| **Scope** | Backend + Frontend CPUX | Frontend (Intention Tunnel) only |
| **Failure Mode** | Skip execution/reflection | Block emission or warn |

**Key Difference**: 
- **DN/Object gatekeepers** are part of CPUX formal semantics (control flow)
- **UI Component gatekeepers** are an optional security/audit layer (authorization)

---

#### 1.13.7 Migration Path: Adding UI Gatekeepers to Existing Apps

**Phase 1: Schema Discovery** (No code changes)
1. Add `ui_components` section to CPUX schema
2. Document current emissions/subscriptions
3. Run in `development` mode (warnings only)

**Phase 2: Validation** (Add component IDs)
1. Update `emit()` calls to include `componentId`
2. Update `useFieldPulse()` to include `componentId`
3. Run in `staging` mode (validate, don't block)
4. Review audit logs for violations

**Phase 3: Enforcement** (Production hardening)
1. Fix all violations found in Phase 2
2. Enable `production` mode (strict enforcement)
3. Set up alerting for security team
4. Monitor audit trail for anomalies

**Backward Compatibility**:
```javascript
// Old code (still works)
emit('INT_ADD_TODO', { text: 'Buy milk' });

// New code (with gatekeeper)
emit('INT_ADD_TODO', { text: 'Buy milk' }, 'TodoInput');
//                                          ^^^^^^^^^^^ Optional

// Implementation:
function emit(intentionId, pulseData, componentId = 'UNKNOWN') {
  if (componentId === 'UNKNOWN' && config.mode === 'production') {
    console.warn(`⚠️ Component ID missing for ${intentionId}`);
  }
  // ... rest of gatekeeper validation
}
```

---

#### 1.13.8 Implementation Example

**Complete useIntentionTunnel with Gatekeepers**:

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const IntentionTunnelContext = createContext(null);

/**
 * IntentionTunnelProvider with UI Component Gatekeepers
 */
export function IntentionTunnelProvider({ 
  cpuxId, 
  schema, 
  gatekeeperConfig,
  children 
}) {
  const [field, setField] = useState(() => createField(schema));
  const [auditLog] = useState(() => new AuditLog(gatekeeperConfig));
  
  // Enhanced emit with gatekeeper validation
  const emit = (intentionId, pulseData, componentId = 'UNKNOWN') => {
    // Get component schema
    const componentSchema = schema.ui_components?.find(
      c => c.component_id === componentId
    );
    
    // Validate authorization
    const authorized = validateEmission(
      componentId, 
      intentionId, 
      pulseData, 
      componentSchema, 
      gatekeeperConfig,
      auditLog
    );
    
    if (!authorized && gatekeeperConfig.blockUnauthorized) {
      return; // Block
    }
    
    // Emit to Field
    setField(prev => {
      const newField = prev.clone();
      newField.addIntention(intentionId, pulseData);
      return newField;
    });
    
    // Log success
    auditLog.record({
      timestamp: Date.now(),
      component: componentId,
      action: 'emit_success',
      intention: intentionId,
      signal: sanitizeForAudit(pulseData),
      severity: 'info'
    });
  };
  
  // Enhanced subscribe with gatekeeper validation
  const subscribe = (pulseName, callback, componentId = 'UNKNOWN') => {
    // Get component schema
    const componentSchema = schema.ui_components?.find(
      c => c.component_id === componentId
    );
    
    // Validate subscription (usually just warning)
    validateSubscription(
      componentId, 
      pulseName, 
      componentSchema, 
      gatekeeperConfig,
      auditLog
    );
    
    // Subscribe to Field
    return field.subscribe(pulseName, callback);
  };
  
  return (
    <IntentionTunnelContext.Provider 
      value={{ field, emit, subscribe, auditLog }}
    >
      {children}
    </IntentionTunnelContext.Provider>
  );
}

/**
 * Hook: useIntentionTunnel
 */
export function useIntentionTunnel() {
  return useContext(IntentionTunnelContext);
}

/**
 * Hook: useFieldPulse with gatekeeper
 */
export function useFieldPulse(pulseName, componentId) {
  const { subscribe, field } = useIntentionTunnel();
  const [value, setValue] = useState(() => field.getPulseValue(pulseName));
  
  useEffect(() => {
    const unsubscribe = subscribe(pulseName, setValue, componentId);
    return unsubscribe;
  }, [pulseName, componentId, subscribe]);
  
  return value;
}
```

**Usage with Gatekeepers Enabled**:

```javascript
// App.jsx
import { IntentionTunnelProvider } from './hooks/useIntentionTunnel';
import schema from './schema.json';

function App() {
  return (
    <IntentionTunnelProvider 
      cpuxId="TodoApp"
      schema={schema}
      gatekeeperConfig={{
        mode: 'production',
        blockUnauthorized: true,
        auditTrail: true
      }}
    >
      <TodoInput />
      <TodoList />
    </IntentionTunnelProvider>
  );
}

// TodoInput.jsx
function TodoInput() {
  const { emit } = useIntentionTunnel();
  const [text, setText] = useState('');
  
  const handleAdd = () => {
    emit('INT_ADD_TODO', { text }, 'TodoInput');
    //                               ^^^^^^^^^^^ Gatekeeper checks this!
    setText('');
  };
  
  return <input value={text} onChange={e => setText(e.target.value)} />;
}

// TodoList.jsx
function TodoList() {
  const todosJson = useFieldPulse('todos', 'TodoList');
  //                                       ^^^^^^^^^^^ Gatekeeper checks this!
  const todos = todosJson ? JSON.parse(todosJson) : [];
  
  return <ul>{todos.map(t => <li key={t.id}>{t.text}</li>)}</ul>;
}
```

---

#### 1.13.9 Best Practices

**DO**:
- ✅ Start without UI gatekeepers (learn CPUX first)
- ✅ Add gatekeepers when enterprise requirements emerge
- ✅ Use `development` mode during prototyping
- ✅ Document designated emissions/subscriptions in schema
- ✅ Review audit logs regularly
- ✅ Set up alerts for critical security violations

**DON'T**:
- ❌ Add gatekeepers prematurely (YAGNI principle)
- ❌ Block subscriptions (warnings are usually sufficient)
- ❌ Log sensitive data (PII) in audit trail
- ❌ Use gatekeepers as replacement for DN/Object validation
- ❌ Over-complicate simple apps

**Golden Rule**:
> **UI Component Gatekeepers are for authorization and audit, NOT for business logic validation. Business validation belongs in Design Nodes.**

---

#### 1.13.10 Key Takeaways

1. **Optional Layer**: UI Component Gatekeepers are NOT required for CPUX correctness

2. **Enterprise Pattern**: Use when you need:
   - Formal authorization tracking
   - Regulatory compliance (SOX, HIPAA, GDPR)
   - Multi-tenant security
   - Audit trails

3. **Three Modes**: Development (off) → Staging (validate) → Production (enforce)

4. **Emit vs Subscribe**:
   - Emit gatekeepers: Strict (block unauthorized)
   - Subscribe gatekeepers: Lenient (warn only)

5. **Complementary to DN/Object Gatekeepers**:
   - DN/Object: Control execution flow
   - UI Component: Control authorization

**Implementation Class**: `UIComponentGatekeeper`, `AuditLog`, `EmissionValidator`

---

**End of Section 1.13**

---

## 📋 Summary of Changes

### Section 1.10 Enhancements:
1. ✅ Added **CRITICAL PRINCIPLE** box at the top
2. ✅ Explicit clarification: "Transfer operations happen UNCONDITIONALLY"
3. ✅ Clear table showing what gatekeeper does/doesn't control
4. ✅ Code examples showing unconditional transfers
5. ✅ "Key Insight" boxes explaining async nature

### New Section 1.13:
1. ✅ Complete UI Component Gatekeeper specification
2. ✅ When to use (and when NOT to use)
3. ✅ Emit gatekeeper implementation
4. ✅ Subscribe gatekeeper implementation
5. ✅ Audit trail structure
6. ✅ Configuration modes (dev/staging/prod)
7. ✅ Migration path for existing apps
8. ✅ Best practices and golden rules

### Renumbering Required:
- Current 1.13 GridLookout → 1.14
- Current 1.14 IS# → 1.15
- Current 1.15 Golden Pass → 1.16

---

**END OF DOCUMENT**
