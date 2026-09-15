Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Personal Agent\Agent 1"
WshShell.Run "node src\index.js", 0, False
