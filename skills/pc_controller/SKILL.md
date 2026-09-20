---
name: pc-controller
description: |
  Controls local Windows 11 PC operations including capturing 1080p desktop screenshots, checking system CPU/RAM hardware health, waking the display, locking the workstation, launching applications, and emptying the recycle bin.
  Do NOT use for formatting disks, editing Windows registry, or executing destructive terminal scripts.
version: 1.0.0
tier: action-allowed
allowed-tools: [screenshot_taker, app_launcher, system_power, trash_cleaner]
metadata:
  author: Ahmad Core Team
  platform: win32
---

# PC Controller Skill

## Purpose & Scope
This skill governs Ahmad's physical and graphical interaction with Sir's Windows 11 PC.
It strictly enforces the **Read / Draft / Act** authority tiers to protect Sir's computer:

### 1. Read-Only Tier (Instant Zero-Delay Execution)
- **Desktop Screenshot** (`screenshot`): Captures active screen at 1080p using high-speed GDI graphics and sends directly to Telegram.
- **Hardware Health & Status** (`status`): Checks CPU usage, RAM utilization, OS uptime, and running services.

### 2. Safe Operational Tier (Instant Execution)
- **Wake / Unlock Screen** (`wake`): Sends synthetic keystrokes via Windows user32 API to wake the monitor and dismiss lock screen.
- **Launch Application** (`open_app`): Launches whitelisted apps (Chrome, Notepad, Calc, Task Manager, Explorer, Cmd, Edge).

### 3. Action-Allowed Tier (Selective Gating Required)
- **Workstation Lock** (`lock`): Invokes `user32.dll,LockWorkStation`.
- **Empty Recycle Bin** (`empty_recycle_bin`): Clears system trash via PowerShell. Requires 1-click confirmation on Telegram.
- **System Shutdown / Sleep** (`shutdown` / `sleep`): Critical power operations. Strictly requires Sir's 1-click inline button confirmation on Telegram.

## Progressive Disclosure Levels
- **Level 1 (Metadata)**: Name, description, and trigger keywords indexed at startup (~45 tokens).
- **Level 2 (Instructions)**: This procedure is loaded when PC control intents are recognized.
- **Level 3 (Deterministic Code)**: `scripts/controller.js` calls dedicated PowerShell scripts (`capture_screen.ps1`, `wake_pc.ps1`, `open_app.ps1`) directly via ChildProcess.

## When to Use
- "পিসির স্ক্রিনশট দেখাও", "ডিসপ্লে দেখতে চাই", "স্ক্রিন ক্যাপচার কর"
- "কম্পিউটার আনলক করো", "পিসি ওপেন করো", "স্ক্রিন অন করো"
- "Chrome ওপেন কর", "নোটপ্যাড চালু কর", "ক্যালকুলেটর খোলো"
- "রিসাইকেল বিন খালি করো", "পিসির ট্র্যাশ মুছে ফেলো"
- "পিসি স্ট্যাটাস কেমন?", "কম্পিউটার হেলথ রিপোর্ট দাও"

## When NOT to Use
- Do NOT use for modifying system registry, deleting system partition files, or executing arbitrary unverified shell scripts.
