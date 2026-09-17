param(
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

Add-Type -TypeDefinition @'
using System;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class NativeScreenCapture {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, int dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteObject(IntPtr hObject);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public const int SRCCOPY = 0x00CC0020;
    public const int SM_CXSCREEN = 0;
    public const int SM_CYSCREEN = 1;

    public static bool Success = false;
    public static string TargetPath = "";

    private static void DoCapture() {
        IntPtr hDesk = OpenDesktop("default", 0, false, 0x01FF);
        if (hDesk != IntPtr.Zero) {
            SetThreadDesktop(hDesk);
        }

        int width = GetSystemMetrics(SM_CXSCREEN);
        int height = GetSystemMetrics(SM_CYSCREEN);
        if (width <= 0 || height <= 0) {
            width = 1920;
            height = 1080;
        }

        IntPtr hDeskDC = GetDC(IntPtr.Zero);
        if (hDeskDC == IntPtr.Zero) {
            if (hDesk != IntPtr.Zero) CloseDesktop(hDesk);
            return;
        }

        IntPtr hMemDC = CreateCompatibleDC(hDeskDC);
        IntPtr hBitmap = CreateCompatibleBitmap(hDeskDC, width, height);
        IntPtr hOldBitmap = SelectObject(hMemDC, hBitmap);

        bool bltOk = BitBlt(hMemDC, 0, 0, width, height, hDeskDC, 0, 0, SRCCOPY);

        if (bltOk) {
            using (Bitmap bmp = Bitmap.FromHbitmap(hBitmap)) {
                bmp.Save(TargetPath, ImageFormat.Png);
                Success = true;
            }
        }

        SelectObject(hMemDC, hOldBitmap);
        DeleteObject(hBitmap);
        DeleteDC(hMemDC);
        ReleaseDC(IntPtr.Zero, hDeskDC);
        if (hDesk != IntPtr.Zero) CloseDesktop(hDesk);
    }

    public static bool Execute(string outPath) {
        TargetPath = outPath;
        Success = false;
        Thread t = new Thread(DoCapture);
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join(4000);
        return Success;
    }
}
'@ -ReferencedAssemblies System.Drawing

[NativeScreenCapture]::Execute($OutputPath) | Out-Null
