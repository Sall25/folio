# Styles written for <svg> icons also reach the new icons:
# every `svg` in a selector becomes `:is(svg, .material-icon)`.
# Skips comment lines, src/_unused, tiptap-icons and the icons folder.
# Keeps each file's encoding (UTF-8, no BOM) and line endings.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/icons-css.ps1

$svg = '(?<![-\w.#/"''])svg(?=[\s,>:.{)\[])'
$line = '(?m)^(?!\s*//).*$'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$count = 0

Get-ChildItem -Path src -Recurse -Filter *.scss |
  Where-Object { $_.FullName -notmatch '[\\/](_unused|tiptap-icons|icons)[\\/]' } |
  ForEach-Object {
    $text = [IO.File]::ReadAllText($_.FullName, $utf8)
    $new = [regex]::Replace($text, $line, [Text.RegularExpressions.MatchEvaluator] {
      param($m)
      [regex]::Replace($m.Value, $svg, ':is(svg, .material-icon)')
    })
    if ($new -ne $text) {
      [IO.File]::WriteAllText($_.FullName, $new, $utf8)
      $count++
      Write-Host $_.FullName
    }
  }

Write-Host "$count files updated"