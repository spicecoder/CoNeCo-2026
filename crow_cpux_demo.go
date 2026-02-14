// CROW'S CPUX: Aesop's Fable as Pure Perception-Driven Computation
// Copy this to https://go.dev/play/ to run
//
// This demonstrates how the Crow's problem-solving emerges from:
// - Perceptual states (Pulses with trivalence Y/N/U)
// - Set-theoretic operations (SyncTest matching)
// - NO hidden logic - all decisions visible as Gatekeeper conditions
//
// The Crow (Design Nodes) operates purely on perception:
//   DN_ObserveWater: "Can I drink?" → checks water_level
//   DN_PickPebble: "Can I find a stone?" → searches environment
//   DN_DropPebble: "Will this help?" → modifies situation
//   DN_Drink: "Is water reachable now?" → final success
//
// ZERO knowledge of HOW the crow's brain works internally!
// But we share the SITUATIONAL REALITY: thirst, water, stones, physics.

package main

import "fmt"

// ============== CORE TYPES ==============

type Trivalence string

const (
	Y Trivalence = "Y" // Perceived, resolved
	N Trivalence = "N" // Perceived, negated
	U Trivalence = "U" // Perceived, undecided (attention-holding)
)

type Pulse struct {
	Name       string
	Response   interface{}
	Trivalence Trivalence
}

type Signal []Pulse

type DesignNode struct {
	Name         string
	Gatekeeper   Signal
	FlowinNames  []string
	FlowoutNames []string
	Process      func(Signal) Signal
}

// ============== SYNCTEST: SET-THEORETIC MATCHING ==============

// SyncTest: Does visitor's perception match gatekeeper's requirements?
// This is a SUBSET operation: all gatekeeper pulses must exist in visitor
func SyncTest(gatekeeper Signal, visitor Signal) bool {
	for _, gkPulse := range gatekeeper {
		found := false
		for _, vPulse := range visitor {
			if gkPulse.Name == vPulse.Name {
				found = true
				if gkPulse.Trivalence != vPulse.Trivalence {
					return false // Trivalence mismatch
				}
				break
			}
		}
		if !found {
			return false // Required perception absent
		}
	}
	return true
}

// ============== HELPER FUNCTIONS ==============

func FindPulse(sig Signal, name string) (Pulse, bool) {
	for _, p := range sig {
		if p.Name == name {
			return p, true
		}
	}
	return Pulse{}, false
}

func GetPulseInt(sig Signal, name string) int {
	if p, ok := FindPulse(sig, name); ok {
		if val, ok := p.Response.(int); ok {
			return val
		}
	}
	return 0
}

func MergeSignals(base Signal, addition Signal) Signal {
	result := make(Signal, len(base))
	copy(result, base)
	for _, newPulse := range addition {
		found := false
		for i, existing := range result {
			if existing.Name == newPulse.Name {
				result[i] = newPulse
				found = true
				break
			}
		}
		if !found {
			result = append(result, newPulse)
		}
	}
	return result
}

// ============== CROW'S DESIGN NODES ==============

var DN_ObserveWater = DesignNode{
	Name: "🐦 Crow Observes Water Level",
	Gatekeeper: Signal{
		{"thirst", true, Y},         // Crow perceives: "I'm thirsty"
		{"water_found", true, Y},    // Crow perceives: "There's water"
		{"water_reachable", false, U}, // Crow perceives: "Can I reach it? Undecided"
	},
	FlowinNames:  []string{"thirst", "water_found", "water_level", "drink_threshold"},
	FlowoutNames: []string{"water_reachable", "solution_needed"},
	Process: func(in Signal) Signal {
		level := GetPulseInt(in, "water_level")
		threshold := GetPulseInt(in, "drink_threshold")
		
		fmt.Printf("\n   🔍 Crow looks at pitcher...\n")
		fmt.Printf("      Current water level: %d cm\n", level)
		fmt.Printf("      Need to reach: %d cm to drink\n", threshold)
		
		if level >= threshold {
			fmt.Printf("   ✓ Water is HIGH enough! Crow can drink!\n")
			return Signal{
				{"water_reachable", true, Y},
				{"solution_needed", false, N},
			}
		} else {
			fmt.Printf("   ✗ Water is too LOW (%d cm below)\n", threshold-level)
			fmt.Printf("   💭 Crow thinks: \"I need a solution...\"\n")
			return Signal{
				{"water_reachable", false, N},
				{"solution_needed", true, Y},
			}
		}
	},
}

var DN_PickPebble = DesignNode{
	Name: "🪨 Crow Picks a Pebble",
	Gatekeeper: Signal{
		{"solution_needed", true, Y},   // Crow perceives: "I need help"
		{"pebble_in_beak", false, U},   // Crow perceives: "Do I have stone? Undecided"
	},
	FlowinNames:  []string{"solution_needed", "pebbles_available"},
	FlowoutNames: []string{"pebble_in_beak", "pebbles_available"},
	Process: func(in Signal) Signal {
		available := GetPulseInt(in, "pebbles_available")
		
		fmt.Printf("\n   🪨 Crow searches ground for pebbles...\n")
		fmt.Printf("      Pebbles remaining: %d\n", available)
		
		if available > 0 {
			fmt.Printf("   ✓ Found one! Crow picks it up in beak\n")
			return Signal{
				{"pebble_in_beak", true, Y},
				{"pebbles_available", available - 1, Y},
			}
		} else {
			fmt.Printf("   ✗ No pebbles left! (This shouldn't happen in our demo)\n")
			return Signal{
				{"pebble_in_beak", false, N},
				{"pebbles_available", 0, Y},
			}
		}
	},
}

var DN_DropPebble = DesignNode{
	Name: "💧 Crow Drops Pebble into Pitcher",
	Gatekeeper: Signal{
		{"pebble_in_beak", true, Y},      // Crow perceives: "I'm holding stone"
		{"water_reachable", false, N},    // Crow perceives: "Water still not reachable"
	},
	FlowinNames:  []string{"pebble_in_beak", "water_level"},
	FlowoutNames: []string{"water_level", "pebble_in_beak", "pebbles_dropped", "water_reachable"},
	Process: func(in Signal) Signal {
		currentLevel := GetPulseInt(in, "water_level")
		droppedCount := GetPulseInt(in, "pebbles_dropped")
		
		fmt.Printf("\n   💧 Crow drops pebble into pitcher...\n")
		fmt.Printf("      *PLOP* Water displaced!\n")
		
		newLevel := currentLevel + 2 // Each pebble raises water 2 cm
		droppedCount++
		
		fmt.Printf("      Water rises: %d cm → %d cm\n", currentLevel, newLevel)
		fmt.Printf("      Total pebbles dropped: %d\n", droppedCount)
		
		// Mark water_reachable as U (undecided) to trigger observation again
		return Signal{
			{"water_level", newLevel, Y},
			{"pebble_in_beak", false, N}, // Released the pebble
			{"pebbles_dropped", droppedCount, Y},
			{"water_reachable", false, U}, // Reset to undecided - need to check again!
		}
	},
}

var DN_Drink = DesignNode{
	Name: "🎉 Crow Drinks Water",
	Gatekeeper: Signal{
		{"water_reachable", true, Y}, // Crow perceives: "I can reach it!"
		{"thirst", true, Y},          // Crow perceives: "I'm still thirsty"
		{"thirst_satisfied", false, U}, // Crow perceives: "Am I satisfied? Undecided"
	},
	FlowinNames:  []string{"water_reachable", "thirst"},
	FlowoutNames: []string{"thirst_satisfied", "thirst"},
	Process: func(in Signal) Signal {
		fmt.Printf("\n   🎉 SUCCESS! Crow leans in and drinks...\n")
		fmt.Printf("      *glug glug glug*\n")
		fmt.Printf("      Ahhh, refreshing!\n")
		fmt.Printf("\n   ✓ Crow's thirst is SATISFIED!\n")
		
		return Signal{
			{"thirst_satisfied", true, Y},
			{"thirst", false, N}, // No longer thirsty
		}
	},
}

// ============== INTENTION LOOP (VISITOR PATTERN) ==============

func IntentionLoop(nodes []DesignNode, runtime Signal) Signal {
	pass := 0
	maxPasses := 50 // Safety limit
	
	fmt.Println("\n╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║           CROW'S CPUX INTENTION LOOP BEGINS                ║")
	fmt.Println("║  (Visitor carries perceptions, checks each DN's gatekeeper)║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	
	for {
		pass++
		fmt.Printf("\n┌─────────────────────────────────────────────────────────┐")
		fmt.Printf("\n│  INTENTION LOOP - PASS %d", pass)
		fmt.Printf("\n└─────────────────────────────────────────────────────────┘")
		
		anyExecuted := false
		
		// Visitor tours each Design Node
		for _, dn := range nodes {
			matches := SyncTest(dn.Gatekeeper, runtime)
			
			if matches {
				fmt.Printf("\n\n✓ [%s] TRIGGERED\n", dn.Name)
				fmt.Printf("   Gatekeeper conditions MATCHED visitor's perceptions\n")
				
				// Execute the Design Node
				flowout := dn.Process(runtime)
				
				// Merge flowout into runtime (visitor picks up new perceptions)
				runtime = MergeSignals(runtime, flowout)
				
				anyExecuted = true
			} else {
				fmt.Printf("\n✗ [%s] WAITING\n", dn.Name)
				fmt.Printf("   Gatekeeper conditions NOT matched - DN remains dormant\n")
			}
		}
		
		// Show current situational reality
		fmt.Printf("\n┌─────────────────────────────────────────────────────────┐")
		fmt.Printf("\n│  SITUATIONAL REALITY after Pass %d:", pass)
		fmt.Printf("\n└─────────────────────────────────────────────────────────┘")
		PrintSignal(runtime)
		
		// Termination conditions
		if !anyExecuted {
			fmt.Printf("\n╔════════════════════════════════════════════════════════════╗")
			fmt.Printf("\n║  INTENTION LOOP TERMINATED - No DN triggered               ║")
			fmt.Printf("\n║  (All gatekeepers checked, none matched current perception)║")
			fmt.Printf("\n╚════════════════════════════════════════════════════════════╝\n")
			break
		}
		
		// Check if crow satisfied
		if p, ok := FindPulse(runtime, "thirst_satisfied"); ok && p.Trivalence == Y {
			fmt.Printf("\n╔════════════════════════════════════════════════════════════╗")
			fmt.Printf("\n║  🎊 GOAL ACHIEVED! Crow solved the problem! 🎊             ║")
			fmt.Printf("\n╚════════════════════════════════════════════════════════════╝\n")
			break
		}
		
		if pass >= maxPasses {
			fmt.Printf("\n[Safety limit reached - %d passes]\n", maxPasses)
			break
		}
	}
	
	return runtime
}

func PrintSignal(sig Signal) {
	fmt.Printf("\n")
	for _, p := range sig {
		icon := "●"
		if p.Trivalence == Y {
			icon = "✓"
		} else if p.Trivalence == N {
			icon = "✗"
		} else {
			icon = "?"
		}
		fmt.Printf("   %s %-25s = %-15v [%s]\n", icon, p.Name, p.Response, p.Trivalence)
	}
}

// ============== MAIN: CROW'S STORY ==============

func main() {
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║                                                            ║")
	fmt.Println("║         THE CROW AND THE PITCHER - CPUX EDITION            ║")
	fmt.Println("║                                                            ║")
	fmt.Println("║  Demonstrating Perception-Driven Computation               ║")
	fmt.Println("║  (Shared Situational Reality, Zero Neural Knowledge)       ║")
	fmt.Println("║                                                            ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	
	fmt.Println("\n📖 THE STORY:")
	fmt.Println("   A thirsty crow finds a pitcher with water at the bottom.")
	fmt.Println("   The water level is too low to reach.")
	fmt.Println("   The crow notices pebbles nearby...")
	fmt.Println("   Through perception and action, the crow solves the problem.")
	fmt.Println("\n🔬 THE CPUX MODEL:")
	fmt.Println("   • PULSES = Normalized perceptions (thirst:Y, water_level:5, etc.)")
	fmt.Println("   • SIGNALS = Collections of pulses (Situational Reality)")
	fmt.Println("   • GATEKEEPERS = Set-theoretic conditions (must match perceptions)")
	fmt.Println("   • DESIGN NODES = Behaviors triggered by matching perceptions")
	fmt.Println("   • INTENTION LOOP = Visitor carrying perceptions, checking DNs")
	fmt.Println("\n💡 KEY INSIGHT:")
	fmt.Println("   We know NOTHING about crow's neural connections.")
	fmt.Println("   But we SHARE the situational reality: thirst, water, stones, physics.")
	fmt.Println("   This shared reality makes the crow's actions MEANINGFUL to us.")
	fmt.Println("   The logic emerges from PERCEPTION, not from hidden code.")
	
	// Define the Crow's Design Nodes (behaviors)
	nodes := []DesignNode{
		DN_ObserveWater,
		DN_PickPebble,
		DN_DropPebble,
		DN_Drink,
	}
	
	// Initial Situational Reality (Visitor's starting perceptions)
	initialState := Signal{
		{"thirst", true, Y},              // Crow is thirsty
		{"water_found", true, Y},         // Crow found water
		{"water_level", 5, Y},            // Water is at 5 cm
		{"drink_threshold", 15, Y},       // Need 15 cm to drink
		{"water_reachable", false, U},    // Unknown if reachable (will check)
		{"pebbles_available", 10, Y},     // 10 pebbles nearby
		{"pebbles_dropped", 0, Y},        // None dropped yet
		{"pebble_in_beak", false, U},     // Not holding any (yet)
		{"solution_needed", false, U},    // Don't know if needed (yet)
		{"thirst_satisfied", false, U},   // Not satisfied (yet)
	}
	
	fmt.Println("\n╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║              INITIAL SITUATIONAL REALITY                   ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	PrintSignal(initialState)
	
	fmt.Println("\n\n🚀 Starting Crow's CPUX...")
	fmt.Println("   (Each pass: Visitor checks all DN gatekeepers)")
	fmt.Println("   (Only matching DNs execute)")
	fmt.Println("   (Loop continues until goal achieved or no DN matches)\n")
	
	// Run the Intention Loop
	finalState := IntentionLoop(nodes, initialState)
	
	// Summary
	fmt.Println("\n╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║                    FINAL OUTCOME                           ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	PrintSignal(finalState)
	
	fmt.Println("\n╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║                   KEY OBSERVATIONS                         ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	fmt.Println("\n✓ PERCEPTION-DRIVEN:")
	fmt.Println("   All decisions made via SyncTest (set-theoretic matching).")
	fmt.Println("   No if-then branching in the execution flow.")
	fmt.Println("\n✓ SHARED SITUATIONAL REALITY:")
	fmt.Println("   We don't know HOW the crow's brain works internally.")
	fmt.Println("   But we share its perceptual world: thirst, water, stones.")
	fmt.Println("\n✓ LOGIC AS DATA:")
	fmt.Println("   Gatekeepers are DATA (pulse collections), not CODE.")
	fmt.Println("   Behavior emerges from perception state, not function calls.")
	fmt.Println("\n✓ TRACEABILITY:")
	fmt.Println("   Every perception change is visible (pulses with Y/N/U).")
	fmt.Println("   Can replay the exact sequence of perceptions.")
	fmt.Println("\n✓ NO HIDDEN LOGIC:")
	fmt.Println("   The 'intelligence' is in the perceptual structure itself.")
	fmt.Println("   Aesop's story remains meaningful after 2,500 years because")
	fmt.Println("   we SHARE the situational reality, not the neural mechanism.")
	fmt.Println("\n╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║  This is CPUX: Cognitive Paths Without Hidden Logic       ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝\n")
}
