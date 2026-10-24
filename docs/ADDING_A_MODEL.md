# Adding a Model to VAJRA

VAJRA's model registry is manifest-driven. Adding a new open-weight model requires zero code changes.

## Option 1: Register Wizard (UI)

1. Go to **Models** page → click **Add Model**
2. Enter the Ollama pull command or vLLM endpoint
3. VAJRA validates, test-pings the endpoint, and runs a 3-prompt smoke benchmark
4. The manifest is written automatically

## Option 2: Drop a Manifest File

Create a file at `models/<id>.yaml`:

```yaml
id: my-model-7b
displayName: My Custom Model 7B
family: Llama
params: 7B
quantization: Q4_K_M
contextWindow: 32768
modalities:
  - text
strengths:
  reasoning: 70
  coding: 65
  summarization: 80
  documentDrafting: 75
  visionOcr: 0
  drawingUnderstanding: 0
  tabular: 65
  multilingual: 60
vramGb: 5
tokensPerSec: 40
license: Apache 2.0
endpoint: http://127.0.0.1:11434
provider: ollama
installed: false
pullCommand: "ollama pull my-model:7b-instruct-q4_K_M"
description: Custom 7B instruction-following model for general tasks
```

Restart the server. The model appears in the registry, routing will consider it, and health polling begins automatically.

## Strength Scores (0–100)

These priors influence routing. Set them based on the model's benchmark results:

| Field | Meaning |
|---|---|
| `reasoning` | Multi-step logical reasoning, calculations |
| `coding` | Code generation, debugging, refactoring |
| `summarization` | Condensing long documents |
| `documentDrafting` | Approval notes, reports, memos |
| `visionOcr` | Reading text from images/scans |
| `drawingUnderstanding` | P&IDs, engineering diagrams |
| `tabular` | Spreadsheet analysis, CSV processing |
| `multilingual` | Non-English languages (Kannada, Hindi, etc.) |

## Supported Providers

| Provider | `provider` value | Endpoint |
|---|---|---|
| Ollama | `ollama` | `http://127.0.0.1:11434` |
| vLLM (OpenAI-compatible) | `vllm` | `http://127.0.0.1:8000` |
| llama.cpp server | `llamacpp` | `http://127.0.0.1:8080` |
| Demo Brain | `simulated` | internal |

**Note**: VAJRA enforces that all endpoints must be `localhost` or RFC1918 addresses. Any manifest pointing to an external URL will be rejected at validation time.

## Vision Models

To add a vision-capable model, include `vision` in the `modalities` list. VAJRA will automatically route tasks with image attachments to this model.

```yaml
modalities:
  - text
  - vision
```
