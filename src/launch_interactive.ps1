param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    [string]$Arguments = ""
)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class InteractiveLauncher {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    public const int STARTF_USESHOWWINDOW = 0x00000001;
    public const short SW_SHOW = 5;

    public static bool Launch(string appPath, string args) {
        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\default";
        si.dwFlags = STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_SHOW;

        string fullCmd = string.IsNullOrEmpty(args) ? ("\"" + appPath + "\"") : ("\"" + appPath + "\" " + args);

        PROCESS_INFORMATION pi;
        bool ok = CreateProcess(null, fullCmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref si, out pi);

        if (ok) {
            Console.WriteLine("[InteractiveLauncher] Successfully launched PID: " + pi.dwProcessId + " on WinSta0\\default");
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
            return true;
        } else {
            int err = Marshal.GetLastWin32Error();
            Console.WriteLine("[InteractiveLauncher] CreateProcess failed. Win32 Error: " + err);
            return false;
        }
    }
}
'@

$targetApp = $AppName
$targetArgs = $Arguments

$normalized = $AppName.ToLower().Trim()
if ($normalized -eq "chrome" -or $normalized -eq "browser" -or $normalized -like "*ক্রোম*") {
    if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
        $targetApp = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    } elseif (Test-Path "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") {
        $targetApp = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    } else {
        $targetApp = "chrome.exe"
    }
    if ([string]::IsNullOrEmpty($targetArgs)) {
        $targetArgs = "https://www.google.com"
    }
} elseif ($normalized -eq "notepad" -or $normalized -like "*নোটপ্যাড*") {
    $targetApp = "C:\Windows\System32\notepad.exe"
} elseif ($normalized -eq "calc" -or $normalized -like "*ক্যালকুলেটর*") {
    $targetApp = "calc.exe"
} elseif ($normalized -eq "explorer" -or $normalized -like "*এক্সপ্লোরার*") {
    $targetApp = "C:\Windows\explorer.exe"
} elseif ($normalized -eq "taskmgr" -or $normalized -like "*টাস্ক*") {
    $targetApp = "C:\Windows\System32\taskmgr.exe"
} elseif ($normalized -eq "cmd" -or $normalized -like "*টার্মিনাল*") {
    $targetApp = "C:\Windows\System32\cmd.exe"
} elseif ($normalized -eq "edge" -or $normalized -like "*এজ*") {
    $targetApp = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

[InteractiveLauncher]::Launch($targetApp, $targetArgs)
