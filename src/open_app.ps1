param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    [string]$Arguments = ""
)

$normalized = $AppName.ToLower().Trim()
$targetCmd = ""

if ($normalized -like "*chrome*" -or $normalized -like "*ক্রোম*" -or $normalized -like "*browser*" -or $normalized -like "*ব্রাউজার*") {
    $argPart = if ($Arguments) { " `"$Arguments`"" } else { "" }
    $targetCmd = "cmd.exe /c start chrome$argPart"
} elseif ($normalized -like "*notepad*" -or $normalized -like "*নোটপ্যাড*") {
    $argPart = if ($Arguments) { " `"$Arguments`"" } else { "" }
    $targetCmd = "notepad.exe$argPart"
} elseif ($normalized -like "*calc*" -or $normalized -like "*ক্যালকুলেটর*") {
    $targetCmd = "calc.exe"
} elseif ($normalized -like "*explorer*" -or $normalized -like "*ফাইল ম্যানেজার*" -or $normalized -like "*দিস পিসি*") {
    $argPart = if ($Arguments) { " `"$Arguments`"" } else { "" }
    $targetCmd = "explorer.exe$argPart"
} elseif ($normalized -like "*taskmgr*" -or $normalized -like "*টাস্ক ম্যানেজার*") {
    $targetCmd = "taskmgr.exe"
} elseif ($normalized -like "*cmd*" -or $normalized -like "*টার্মিনাল*" -or $normalized -like "*কমান্ড*") {
    $targetCmd = "cmd.exe /c start cmd.exe"
} elseif ($normalized -like "*edge*" -or $normalized -like "*এজ*") {
    $argPart = if ($Arguments) { " `"$Arguments`"" } else { "" }
    $targetCmd = "cmd.exe /c start msedge$argPart"
} elseif ($normalized -like "*brave*" -or $normalized -like "*ব্রেভ*") {
    $argPart = if ($Arguments) { " `"$Arguments`"" } else { "" }
    $targetCmd = "cmd.exe /c start brave$argPart"
} else {
    $argPart = if ($Arguments) { " `"$Arguments`"" } else { "" }
    $targetCmd = "cmd.exe /c start `"`" `"$AppName`"$argPart"
}

try {
    $proc = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $targetCmd }
    Write-Host "[open_app] Successfully launched: $targetCmd (PID: $($proc.ProcessId), Return: $($proc.ReturnValue))"
} catch {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $targetCmd
    Write-Host "[open_app] Fallback launched: $targetCmd"
}
