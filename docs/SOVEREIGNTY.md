# VAJRA Sovereignty Model

## What "Air-Gapped" Means Here

VAJRA enforces data sovereignty at multiple layers. The goal is to make it provably impossible for data to leave the premises through normal operation, and to make any accidental egress visible and auditable.

## Defense Layers

### 1. Application-Layer Egress Guard
The server wraps all network-capable APIs with an allow-list check. Any outbound connection whose destination is not `localhost`, `127.x.x.x`, `::1`, or a [RFC1918](https://tools.ietf.org/html/rfc1918) private address range (`10.x`, `172.16-31.x`, `192.168.x`) is:
- **Blocked** before the connection is established
- **Logged** to the tamper-evident audit chain
- **Counted** in the live EXTERNAL BYTES counter (which must remain 0)
- **Broadcast** via SSE to the Network Monitor in real time

### 2. Web Content Security Policy
The web client ships with a strict CSP:
```
default-src 'self';
connect-src 'self';
```
No external scripts, no external fonts (self-hosted via @fontsource), no external images, no third-party analytics.

### 3. Tool Allowlist
The agent runtime only has access to tools explicitly allowlisted in the Admin panel. There are no "send email", "HTTP POST", "FTP upload" tools. Tools that write files are jailed to a per-project workspace directory with path-traversal checks.

### 4. Prompt Injection Defense
All document, OCR, and KB text is wrapped as untrusted DATA before being included in prompts. A pattern detector identifies instruction-like content inside documents (e.g. "ignore previous instructions"). Detected payloads are:
- Blocked from reaching the model
- Flagged with a "Blocked injection attempt" badge in the UI
- Logged to the audit chain

See the "Faded SOP Scan" in the Knowledge Base for a live demonstration.

## What the Sovereignty Report Proves

Running `pnpm verify:airgap` produces `docs/sovereignty-report.json` which includes:
- All red-team attempt results (each should show `blocked: true`)
- Final external bytes count (must be 0)
- Audit chain verification result
- SHA-256 signature of the report itself

The signature allows any auditor to verify the report has not been tampered with after generation.

## What This Does NOT Prove

Be honest with auditors:

1. **Kernel-level enforcement**: The guard intercepts at the Node.js application layer. A compromised Node.js binary or native addon could bypass it. True air-gap enforcement requires network-level controls (firewall rules, `--network none` in Docker).

2. **GPU/Driver level**: If using an external GPU server over the network, the network path between CPU and GPU must be on a trusted internal network. VAJRA validates that endpoints are RFC1918 but cannot enforce the physical network topology.

3. **Side channels**: VAJRA does not protect against timing side-channels or covert channels at the OS level.

4. **Supply chain**: VAJRA's npm dependencies are not formally audited. Use `pnpm audit` and review the SBOM before deploying in high-security environments.

## Production Hardening Checklist

- [ ] Deploy in a Docker container with `--network none` (use internal Docker network for model servers)
- [ ] Add OS-level firewall rules blocking all outbound traffic except to model server IPs
- [ ] Enable SELinux/AppArmor profiles for the Node.js process
- [ ] Run `pnpm audit` and address all critical/high vulnerabilities
- [ ] Rotate the SQLite audit database key periodically
- [ ] Configure log forwarding to your SIEM
- [ ] Run `pnpm verify:airgap` after every deployment
