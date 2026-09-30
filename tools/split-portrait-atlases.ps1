param(
  [string]$OutputDirectory = "assets/characters/individual"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

Add-Type -AssemblyName System.Drawing
$drawingAssembly = [System.Drawing.Bitmap].Assembly.Location
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class PortraitSpriteExtractor
{
    private sealed class Component
    {
        public readonly List<int> Pixels = new List<int>();
        public int MinX = int.MaxValue, MinY = int.MaxValue, MaxX = -1, MaxY = -1;
        public int Area { get { return Pixels.Count; } }
        public void Add(int index, int x, int y)
        {
            Pixels.Add(index);
            if (x < MinX) MinX = x;
            if (x > MaxX) MaxX = x;
            if (y < MinY) MinY = y;
            if (y > MaxY) MaxY = y;
        }
    }

    private static int Gap(int a0, int a1, int b0, int b1)
    {
        if (a1 < b0) return b0 - a1;
        if (b1 < a0) return a0 - b1;
        return 0;
    }

    public static int[] FindColumnCuts(string sourcePath, int rowTop, int rowBottom)
    {
        using (var source = new Bitmap(sourcePath))
        {
            var cuts = new int[] { 0, 0, 0, 0, 0, source.Width };
            for (int boundary = 1; boundary < 5; boundary++)
            {
                int expected = boundary * source.Width / 5;
                int searchLeft = Math.Max(1, expected - 72);
                int searchRight = Math.Min(source.Width - 2, expected + 72);
                int bestStart = -1, bestEnd = -1, runStart = -1;
                int bestLength = -1, bestDistance = int.MaxValue, fallback = expected, fallbackCount = int.MaxValue;
                for (int x = searchLeft; x <= searchRight; x++)
                {
                    int count = 0;
                    for (int y = rowTop; y < rowBottom; y++)
                        if (source.GetPixel(x, y).A > 8) count++;
                    if (count < fallbackCount || (count == fallbackCount && Math.Abs(x - expected) < Math.Abs(fallback - expected)))
                    {
                        fallbackCount = count;
                        fallback = x;
                    }
                    if (count <= 1 && runStart < 0) runStart = x;
                    bool runEnds = count > 1 || x == searchRight;
                    if (runEnds && runStart >= 0)
                    {
                        int runEnd = count > 1 ? x - 1 : x;
                        int length = runEnd - runStart + 1;
                        int center = (runStart + runEnd) / 2;
                        int distance = Math.Abs(center - expected);
                        if (length > bestLength || (length == bestLength && distance < bestDistance))
                        {
                            bestStart = runStart;
                            bestEnd = runEnd;
                            bestLength = length;
                            bestDistance = distance;
                        }
                        runStart = -1;
                    }
                }
                cuts[boundary] = bestStart >= 0 ? (bestStart + bestEnd) / 2 : fallback;
            }
            return cuts;
        }
    }

    public static void Extract(string sourcePath, string outputPath, int cellLeft, int cellTop, int cellRight, int cellBottom)
    {
        using (var source = new Bitmap(sourcePath))
        {
            const int expansion = 32;
            int left = Math.Max(0, cellLeft - expansion);
            int top = Math.Max(0, cellTop - expansion);
            int right = Math.Min(source.Width, cellRight + expansion);
            int bottom = Math.Min(source.Height, cellBottom + expansion);
            int width = right - left, height = bottom - top;
            using (var crop = new Bitmap(width, height, PixelFormat.Format32bppArgb))
            {
                using (var graphics = Graphics.FromImage(crop))
                {
                    graphics.CompositingMode = CompositingMode.SourceCopy;
                    graphics.DrawImage(source, new Rectangle(0, 0, width, height), new Rectangle(left, top, width, height), GraphicsUnit.Pixel);
                }

                var rect = new Rectangle(0, 0, width, height);
                var data = crop.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
                int stride = data.Stride;
                var bytes = new byte[stride * height];
                Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
                var opaque = new bool[width * height];
                for (int y = 0; y < height; y++)
                    for (int x = 0; x < width; x++)
                        opaque[y * width + x] = bytes[y * stride + x * 4 + 3] > 8;

                var visited = new bool[opaque.Length];
                var queue = new int[opaque.Length];
                var components = new List<Component>();
                for (int start = 0; start < opaque.Length; start++)
                {
                    if (!opaque[start] || visited[start]) continue;
                    var component = new Component();
                    int head = 0, tail = 0;
                    queue[tail++] = start;
                    visited[start] = true;
                    while (head < tail)
                    {
                        int index = queue[head++], x = index % width, y = index / width;
                        component.Add(index, x, y);
                        for (int dy = -1; dy <= 1; dy++)
                        {
                            int ny = y + dy;
                            if (ny < 0 || ny >= height) continue;
                            for (int dx = -1; dx <= 1; dx++)
                            {
                                if (dx == 0 && dy == 0) continue;
                                int nx = x + dx;
                                if (nx < 0 || nx >= width) continue;
                                int next = ny * width + nx;
                                if (opaque[next] && !visited[next]) { visited[next] = true; queue[tail++] = next; }
                            }
                        }
                    }
                    components.Add(component);
                }

                int cellMinX = cellLeft - left, cellMaxX = cellRight - left - 1;
                int cellMinY = cellTop - top, cellMaxY = cellBottom - top - 1;
                Component main = null;
                foreach (var component in components)
                {
                    int centerX = (component.MinX + component.MaxX) / 2;
                    int centerY = (component.MinY + component.MaxY) / 2;
                    bool centeredInCell = centerX >= cellMinX && centerX <= cellMaxX && centerY >= cellMinY && centerY <= cellMaxY;
                    if (centeredInCell && (main == null || component.Area > main.Area)) main = component;
                }
                var keep = new bool[opaque.Length];
                if (main != null)
                {
                    foreach (var component in components)
                    {
                        int centerX = (component.MinX + component.MaxX) / 2;
                        int centerY = (component.MinY + component.MaxY) / 2;
                        bool centeredInCell = centerX >= cellMinX && centerX <= cellMaxX && centerY >= cellMinY && centerY <= cellMaxY;
                        int gapX = Gap(component.MinX, component.MaxX, main.MinX, main.MaxX);
                        int gapY = Gap(component.MinY, component.MaxY, main.MinY, main.MaxY);
                        double distance = Math.Sqrt(gapX * gapX + gapY * gapY);
                        bool nearMain = distance <= 12;
                        bool substantial = component.Area >= Math.Max(20, main.Area * 0.003);
                        bool supportingDetail = component.Area <= main.Area * 0.08;
                        bool edgeFragment = (component.MinX <= 3 || component.MaxX >= width - 4 || component.MinY <= 3 || component.MaxY >= height - 4)
                            && component.Area < main.Area * 0.05;
                        if (component == main || (centeredInCell && nearMain && substantial && supportingDetail && !edgeFragment))
                            foreach (int pixel in component.Pixels) keep[pixel] = true;
                    }
                }

                int minX = width, minY = height, maxX = -1, maxY = -1;
                for (int y = 0; y < height; y++)
                    for (int x = 0; x < width; x++)
                    {
                        int index = y * width + x;
                        if (!keep[index]) bytes[y * stride + x * 4 + 3] = 0;
                        else { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
                    }
                Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
                crop.UnlockBits(data);
                if (maxX < minX || maxY < minY) throw new InvalidOperationException("No portrait pixels found in " + sourcePath);

                const int canvasWidth = 256, canvasHeight = 384, padding = 10;
                int subjectWidth = maxX - minX + 1, subjectHeight = maxY - minY + 1;
                double scale = Math.Min((canvasWidth - padding * 2.0) / subjectWidth, (canvasHeight - padding * 2.0) / subjectHeight);
                int drawWidth = Math.Max(1, (int)Math.Round(subjectWidth * scale));
                int drawHeight = Math.Max(1, (int)Math.Round(subjectHeight * scale));
                int drawX = (canvasWidth - drawWidth) / 2;
                int drawY = canvasHeight - padding - drawHeight;
                using (var output = new Bitmap(canvasWidth, canvasHeight, PixelFormat.Format32bppArgb))
                using (var graphics = Graphics.FromImage(output))
                {
                    graphics.Clear(Color.Transparent);
                    graphics.CompositingMode = CompositingMode.SourceCopy;
                    graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    graphics.DrawImage(crop, new Rectangle(drawX, drawY, drawWidth, drawHeight), new Rectangle(minX, minY, subjectWidth, subjectHeight), GraphicsUnit.Pixel);
                    output.Save(outputPath, ImageFormat.Png);
                }
            }
        }
    }
}
'@ -ReferencedAssemblies $drawingAssembly

$atlases = @(
  @{ Name = "jobs-1-v3"; Cuts = @(0, 485, 864, 1254) },
  @{ Name = "jobs-2-v3"; Cuts = @(0, 455, 840, 1254) },
  @{ Name = "jobs-3-v3"; Cuts = @(0, 486, 864, 1254) },
  @{ Name = "races-1-v3"; Cuts = @(0, 446, 815, 1254) },
  @{ Name = "races-2-v3"; Cuts = @(0, 436, 805, 1254) },
  @{ Name = "races-3-v3"; Cuts = @(0, 449, 838, 1254) },
  @{ Name = "births-1-v3"; Cuts = @(0, 465, 847, 1254) },
  @{ Name = "births-2-v3"; Cuts = @(0, 456, 830, 1254) },
  @{ Name = "births-3-v3"; Cuts = @(0, 476, 847, 1254) }
)

foreach ($atlas in $atlases) {
  $sourcePath = Join-Path $projectRoot "assets/characters/$($atlas.Name).png"
  $rowColumnCuts = @()
  for ($rowIndex = 0; $rowIndex -lt 3; $rowIndex++) {
    $rowColumnCuts += ,([PortraitSpriteExtractor]::FindColumnCuts($sourcePath, $atlas.Cuts[$rowIndex], $atlas.Cuts[$rowIndex + 1]))
  }
  for ($index = 0; $index -lt 15; $index++) {
    $column = $index % 5
    $row = [math]::Floor($index / 5)
    $left = $rowColumnCuts[$row][$column]
    $right = $rowColumnCuts[$row][$column + 1]
    $top = $atlas.Cuts[$row]
    $bottom = $atlas.Cuts[$row + 1]
    $outputPath = Join-Path $outputRoot ("{0}-{1:d2}.png" -f $atlas.Name, $index)
    [PortraitSpriteExtractor]::Extract($sourcePath, $outputPath, $left, $top, $right, $bottom)
  }
}

$legacySource = Join-Path $projectRoot "assets/characters/adventurers-atlas.png"
for ($index = 0; $index -lt 8; $index++) {
  $column = $index % 4
  $row = [math]::Floor($index / 4)
  $left = [math]::Floor($column * 1254 / 4)
  $right = [math]::Floor(($column + 1) * 1254 / 4)
  $top = [math]::Floor($row * 1254 / 2)
  $bottom = [math]::Floor(($row + 1) * 1254 / 2)
  $outputPath = Join-Path $outputRoot ("legacy-{0:d2}.png" -f $index)
  [PortraitSpriteExtractor]::Extract($legacySource, $outputPath, $left, $top, $right, $bottom)
}

Write-Output "Generated 143 individual portrait PNG files in $outputRoot"
