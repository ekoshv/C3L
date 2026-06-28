# Sample project specs

Copy **one** folder's files into a fresh kit extract:

```powershell
Copy-Item samples\miniledger\project_description.md .
Copy-Item samples\miniledger\milestones.json scripts\milestones.json
```

| Folder | Summary |
|--------|---------|
| `miniledger/` | Integer-cent accounting, ledger, category report |
| `abs-brake-simulator/` | Advanced educational ABS simulator: tire physics, vehicle dynamics, controllers, scenarios, telemetry, lessons |
| `text-stats/` | Tokenize, word counts, document summary |
| `unit-converter/` | Temperature and length conversion, batch helpers |

All samples use pure-logic milestones suitable for local LLMs. Integration-style
samples can use the integration reliability knobs (`integration_fix_turns`,
`integration_recovery_turns`, `integration_analyze_turns`) when a milestone wires
multiple earlier modules together. They also include
`diagnostic_probe_timeout_ms` for the failure microscope.
