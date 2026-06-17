# Sample project specs

Copy **one** folder's files into a fresh kit extract:

```powershell
Copy-Item samples\miniledger\project_description.md .
Copy-Item samples\miniledger\milestones.json scripts\milestones.json
```

| Folder | Summary |
|--------|---------|
| `miniledger/` | Integer-cent accounting, ledger, category report |
| `abs-brake-simulator/` | Vehicle physics, ABS, telemetry, headless sim |
| `text-stats/` | Tokenize, word counts, document summary |
| `unit-converter/` | Temperature & length conversion, batch helpers |

All samples use `"mode": "pure-logic"` and 3–4 milestones suitable for local LLMs.
