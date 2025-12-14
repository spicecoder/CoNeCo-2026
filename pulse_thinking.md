Pulse-First — one-page training note

(How to think, author and validate CPUX designs using the cpux_interleaved_gates.js runtime and the pulse-reach validator)

Core idea (one sentence)

Design by pulses: declare what pieces of information (pulse prompts) exist and flow, then place DNs and Objects so DNs react when those pulses are present in the aggregated field — not by wiring DNs to “target” other slots.

Key concepts (quick)

Pulse — a single prompt + responses + tv (truth value).

Signal — a set of pulses plus a stable hash.

Intention — a name carried alongside a signal.

DN (Design Node) — reactive unit with a gate (synctest against the current field). If the gate matches, the DN runs and produces pulses.

Object instance — objectId@seqIndex, owns a persistent Field that accumulates pulses across passes.

CPUX Field — aggregated representative pulses (what DNs read at visit time).

externalSeeds — pulses provided by the environment (user upload, sensor, etc.).

Designer’s workflow (practical — 5 steps)

Visually lay out the sequence (left→right) — place DNs and Objects as logical steps in the flow.

Declare pulse intent:

For each DN that emits known pulses add "produces": ["promptA","promptB"].

For pulses supplied externally (user upload, hardware), add them to spec.externalSeeds.

For objects that start with known pulses, use initialPulses.

Write DN gates in declarative terms:

"gate": { "matchMode":"hasPrompt", "signal": { "pulses":[{"prompt":"fileready"}] } }


Use matchMode: "always" | "hasPrompt" | "responsesExistence" | "exact".

Run the pulse-reach validator (cpux_validator_pulse_reach.js) to check which DNs are reachable given seeds and produces. Fix unreachable DNs by adding producers or marking externalSeeds.

Run the runtime (cpux_interleaved_gates.js) and step through the pass logs (per-pass absorption/emission). Use the trace to confirm pulses move as intended.

File → WordCount example (how it maps)

DN1: produces: ["fileready"], gate: always → emits the file content as fileready.

O1 absorbs fileready into its Field.

DN2: gate: hasPrompt fileready → reads aggregated field (includes O1) and, if present, emits wordcount.

O2 absorbs wordcount.
Run validator → reachable DNs: DN1 -> DN2. Run runtime → both DNs fire in the same pass (because DN1 places fileready before DN2’s visit).