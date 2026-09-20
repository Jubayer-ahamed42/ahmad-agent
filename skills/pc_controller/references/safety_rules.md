# PC Controller Safety & Security Rules

## Whitelisted Applications
- Google Chrome (`chrome`)
- Notepad (`notepad`)
- Windows Calculator (`calc`)
- Task Manager (`taskmgr`)
- File Explorer (`explorer`)
- Windows Terminal / Command Prompt (`cmd`)
- Microsoft Edge (`edge`)

## Authority Tier Classification
1. **Read-Only (No Confirmation Needed)**:
   - `screenshot`
   - `system_status`
2. **Safe Action (No Confirmation Needed)**:
   - `wake_pc`
   - `open_app` (if in whitelist)
3. **Action-Allowed (Confirmation Strictly Gated)**:
   - `empty_recycle_bin`: Empties all items from Recycle Bin.
   - `lock_pc`: Locks the workstation.
   - `shutdown_pc`: Shuts down the machine.
   - `sleep_pc`: Enters suspended state.
