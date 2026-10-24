# VAJRA Demo Script

## 90-Second Version (Judges / Quick Demo)

| Time | Action |
|---|---|
| 0:00 | Open app → point at StatusStrip: "AIR-GAPPED, SIMULATED MODEL, EXTERNAL BYTES = 0" |
| 0:15 | Click **Network** → point at radar: "All traffic stays inside the boundary ring" → click **Run All** in Red-Team Panel → watch 5 attempts bounce off |
| 0:40 | Click **Workbench** → click "Scan-to-Approval" template → click Send |
| 0:55 | Watch plan unfold: OCR → KB → Calc → Author → Critic → Approval Card appears |
| 1:10 | Click **Approve** → artifact appears → click **Download .docx** |
| 1:20 | Back to **Network**: external bytes still 0. "Nothing left the premises." |

---

## 3-Minute Version (Full Demo)

### Act 1: Sovereignty Proof (45s)
1. Open app. Point at top status bar: `AIR-GAPPED · SIMULATED MODEL · EXT BYTES 0`
2. Navigate to **Network**
3. Note the radar — "This ring represents our premises boundary. All dots stay inside."
4. In Red-Team Panel, click **Run All** — watch each attempt blocked in real time
5. Click **Verify Chain** in the audit log — "SHA-256 hash chain verified"
6. "Any auditor can run `pnpm verify:airgap` and get a signed JSON sovereignty report."

### Act 2: Scan-to-Approval — the Core Workflow (90s)
1. Click **Workbench**
2. Click the "Scan-to-Approval" template — goal populates
3. Click Send (or press Enter)
4. Watch the Plan DAG appear: 7 steps light up one by one
5. "Vision Analyst reads the scanned report — notice TML-3 flagged at 72% confidence"
6. "Researcher retrieves SOP-INS-014 from our local knowledge base"
7. "Analyst runs ASME B31.3 calculation: t_req = 1.45 mm, corrosion rate = 0.28 mm/yr"
8. "Critic verifies all numbers against the fact store — no hallucinations"
9. Approval card appears — click **Approve & Download**
10. Click the .docx artifact — "This is a real Word document with all numbers traceable back to the scan"

### Act 3: Model Intelligence (45s)
1. Click **Models**
2. In Router Lens: type "Write Python code to compute LMTD" → click Analyse
3. Watch bar race: "Simulated / Qwen-Coder ranked first for coding — Mistral ranked first if you type 'summarize'"
4. Change text to "Read this scanned P&ID drawing" → Analyse again
5. "Now Qwen-VL rises because it's the only vision-capable model"
6. "Every step in a run routes independently — a single task can use 3 different models"

---

## Fallback: If Something Goes Wrong

- Server not starting? Check Node ≥ 20: `node --version`
- Port in use? `npx kill-port 3000 5173`
- No data showing? Click the **Reset Demo** button in Admin → reseeds all data

---

## Judge Mode (Auto-play)

The Evals page shows all 15 scenarios pre-run with results. Click **Run All Evals** to simulate a replay. This requires no narration and demonstrates reliability metrics in 30 seconds.
