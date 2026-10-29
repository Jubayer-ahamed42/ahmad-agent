$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class ScreenCap {
    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")]
    public static extern IntPtr GetWindowDC(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll")]
    public static extern bool BitBlt(IntPtr hObject, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hObjectSource, int nXSrc, int nYSrc, int dwRop);

    public static void Capture(string path) {
        IntPtr hDesk = GetDesktopWindow();
        IntPtr hDC = GetWindowDC(hDesk);
        Bitmap bmp = new Bitmap(1920, 1080);
        Graphics g = Graphics.FromImage(bmp);
        IntPtr hDest = g.GetHdc();
        BitBlt(hDest, 0, 0, 1920, 1080, hDC, 0, 0, 0x00CC0020);
        g.ReleaseHdc(hDest);
        g.Dispose();
        ReleaseDC(hDesk, hDC);
        bmp.Save(path, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$screenshotsDir = Join-Path (Split-Path -Parent $PSScriptRoot) "screenshots"
if (!(Test-Path $screenshotsDir)) { New-Item -ItemType Directory -Path $screenshotsDir -Force | Out-Null }
$capFile = Join-Path $screenshotsDir "test_cap.png"
[ScreenCap]::Capture($capFile)
Get-Item $capFile | Select-Object Name, Length
