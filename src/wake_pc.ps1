Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class ScreenWaker {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    private const int HWND_BROADCAST = 0xffff;
    private const int WM_SYSCOMMAND = 0x0112;
    private const int SC_MONITORPOWER = 0xF170;

    public static void Wake() {
        // 1. Wake monitor / Turn display ON (-1)
        SendMessage((IntPtr)HWND_BROADCAST, WM_SYSCOMMAND, (IntPtr)SC_MONITORPOWER, (IntPtr)(-1));

        // 2. Mouse wiggle to trigger display wake-up
        mouse_event(0x0001, 10, 10, 0, UIntPtr.Zero);
        mouse_event(0x0001, 0, 0, 0, UIntPtr.Zero);

        // 3. Spacebar press to dismiss lock-screen curtain & present PIN/Password prompt
        keybd_event(0x20, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event(0x20, 0, 0x0002, UIntPtr.Zero);
    }
}
'@

[ScreenWaker]::Wake()
Write-Host "[wake_pc] Screen wake and lock curtain dismissal executed successfully."
