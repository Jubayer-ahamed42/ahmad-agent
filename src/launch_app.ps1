param(
    [Parameter(Mandatory=$true)]
    [string]$App,
    [string]$Args = ""
)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@

$shell = New-Object -ComObject 'Shell.Application'
$shell.ShellExecute($App, $Args, "", "open", 1)

Start-Sleep -Milliseconds 800

$baseName = (Split-Path $App -Leaf).Replace(".exe","")
$procs = Get-Process -Name $baseName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }

foreach ($p in $procs) {
    [WindowHelper]::ShowWindow($p.MainWindowHandle, 3) # SW_MAXIMIZE
    [WindowHelper]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
    Write-Host "Brought to front: $($p.ProcessName) (Handle: $($p.MainWindowHandle))"
}
