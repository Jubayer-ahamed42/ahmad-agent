Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Personal Agent\Agent 1"
WshShell.Run "cmd.exe /c node src\index.js >> ahmad.log 2>&1", 0, False

