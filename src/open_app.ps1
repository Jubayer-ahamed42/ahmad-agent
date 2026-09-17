param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    [string]$Arguments = ""
)

$normalized = $AppName.ToLower().Trim()
$targetCmd = ""

if ($normalized -like "*chrome*" -or $normalized -like "*ক্রোম*" -or $normalized -like "*browser*" -or $normalized -like "*ব্রাউজার*") {
    $targetCmd = "cmd.exe /c start chrome https://www.google.com"
} elseif ($normalized -like "*notepad*" -or $normalized -like "*নোটপ্যাড*") {
    $targetCmd = "notepad.exe"
} elseif ($normalized -like "*calc*" -or $normalized -like "*ক্যালকুলেটর*") {
    $targetCmd = "calc.exe"
} elseif ($normalized -like "*explorer*" -or $normalized -like "*ফাইল ম্যানেজার*" -or $normalized -like "*দিস পিসি*") {
    $targetCmd = "explorer.exe"
} elseif ($normalized -like "*taskmgr*" -or $normalized -like "*টাস্ক ম্যানেজার*") {
    $targetCmd = "taskmgr.exe"
} elseif ($normalized -like "*cmd*" -or $normalized -like "*টার্মিনাল*" -or $normalized -like "*কমান্ড*") {
    $targetCmd = "cmd.exe /c start cmd.exe"
} elseif ($normalized -like "*edge*" -or $normalized -like "*এজ*") {
    $targetCmd = "cmd.exe /c start msedge"
} elseif ($normalized -like "*brave*" -or $normalized -like "*ব্রেভ*") {
    $targetCmd = "cmd.exe /c start brave"
} else {
    $targetCmd = "cmd.exe /c start `"`" `"$AppName`""
}

try {
    $proc = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $targetCmd }
    Write-Host "[open_app] Successfully launched: $targetCmd (PID: $($proc.ProcessId), Return: $($proc.ReturnValue))"
} catch {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $targetCmd
    Write-Host "[open_app] Fallback launched: $targetCmd"
}
