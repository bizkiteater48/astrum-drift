$base = "C:\Users\bizki\Desktop\Astrum Drift\Astrum-Drift\.tmp-npc-final\xl"
$sstXml = [xml](Get-Content "$base\sharedStrings.xml")
$strings = @()
foreach ($si in $sstXml.sst.si) {
  if ($si.t) { $strings += [string]$si.t }
  elseif ($si.r) { $strings += (($si.r | ForEach-Object { $_.t }) -join "") }
  else { $strings += "" }
}

function Get-CellValue($cell) {
  if (-not $cell.v) { return $null }
  if ($cell.t -eq "s") { return $strings[[int]$cell.v] }
  return $cell.v
}

function Parse-Sheet($file) {
  $xml = [xml](Get-Content $file)
  $rows = @{}
  foreach ($row in $xml.worksheet.sheetData.row) {
    $rnum = [int]$row.r
    $cols = @{}
    foreach ($c in $row.c) {
      $col = ($c.r -replace '\d','')
      $cols[$col] = Get-CellValue $c
    }
    $rows[$rnum] = $cols
  }
  return $rows
}

$mat = Parse-Sheet "$base\worksheets\sheet2.xml"
$crafted = Parse-Sheet "$base\worksheets\sheet3.xml"
$prices = [ordered]@{}

2..49 | ForEach-Object {
  $r = $mat[$_]
  if ($r.A -and $r.A -ne "Item") {
    $buy = [int]$r.E
    if ($buy -gt 0) { $prices[$r.A] = $buy }
  }
}

2..200 | ForEach-Object {
  $r = $crafted[$_]
  if ($r.C -and $r.C -ne "Item" -and $r.H) {
    $buy = [int][double]$r.H
    if ($buy -gt 0) { $prices[$r.C] = $buy }
  }
}

$lines = @(
  "/** Auto-generated from Astrum_Drift_NPC_Economy_Final_Sanity_Check.xlsx */",
  "export const NPC_BUY_FLOOR_PRICES: Record<string, number> = {"
)
foreach ($entry in $prices.GetEnumerator() | Sort-Object Name) {
  $escaped = $entry.Key -replace '"', '\"'
  $lines += "  `"$escaped`": $($entry.Value),"
}
$lines += "};"
$content = ($lines -join "`n") + "`n"

$outPaths = @(
  "C:\Users\bizki\Desktop\Astrum Drift\Astrum-Drift\artifacts\astrum-drift\src\lib\npc-economy-prices.ts",
  "C:\Users\bizki\Desktop\Astrum Drift\Astrum-Drift\artifacts\api-server\src\lib\npc-economy-prices.ts"
)
foreach ($out in $outPaths) {
  Set-Content -Path $out -Value $content -Encoding UTF8
  Write-Output "Wrote $out ($($prices.Count) items)"
}
