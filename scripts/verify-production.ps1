$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Require-File([string]$RelativePath) {
  if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $RelativePath))) {
    $failures.Add("Missing required file: $RelativePath")
  }
}

@(
  "index.html", "account.html", "privacy.html", "account-deletion.html", "policies.html",
  "manifest.webmanifest", "sw.js", "supabase/app-readiness.sql",
  "supabase/functions/delete-account/index.ts"
) | ForEach-Object { Require-File $_ }

$publicFiles = Get-ChildItem -LiteralPath $repoRoot -File | Where-Object { $_.Extension -in ".html", ".js", ".css", ".json", ".webmanifest" }
foreach ($file in $publicFiles) {
  $content = Get-Content -Raw -LiteralPath $file.FullName
  if ($content -match "This draft should be reviewed|TODO|FIXME") {
    $failures.Add("Production placeholder found in $($file.Name)")
  }
  if ($file.Extension -eq ".html") {
    foreach ($match in [regex]::Matches($content, '(?:href|src)="([^"#]+)"')) {
      $reference = $match.Groups[1].Value.Split('?')[0]
      if ($reference -match '^(?:https?:|mailto:|tel:|data:)') { continue }
      $target = Join-Path $repoRoot $reference
      if (-not (Test-Path -LiteralPath $target)) {
        $failures.Add("Broken local reference in $($file.Name): $reference")
      }
    }
  }
}

$manifestPath = Join-Path $repoRoot "manifest.webmanifest"
if (Test-Path $manifestPath) {
  try { Get-Content -Raw $manifestPath | ConvertFrom-Json | Out-Null }
  catch { $failures.Add("manifest.webmanifest is invalid JSON") }
}

$vercelPath = Join-Path $repoRoot "vercel.json"
if (Test-Path $vercelPath) {
  try { Get-Content -Raw $vercelPath | ConvertFrom-Json | Out-Null }
  catch { $failures.Add("vercel.json is invalid JSON") }
}

$identityFunction = Get-Content -Raw (Join-Path $repoRoot "supabase/functions/verify-nin/index.ts")
if ($identityFunction -notmatch "ALLOW_MOCK_IDENTITY") { $failures.Add("Identity mock-mode production guard is missing") }
$webhook = Get-Content -Raw (Join-Path $repoRoot "supabase/functions/qoreid-webhook/index.ts")
if ($webhook -match 'urlSecret|searchParams\.get\("secret"\)') { $failures.Add("Webhook secrets must not be accepted in URLs") }
$migration = Get-Content -Raw (Join-Path $repoRoot "supabase/app-readiness.sql")
if ($migration -notmatch 'fixam-private-media') { $failures.Add("Private quote-media storage is not configured") }
if ($migration -notmatch 'fixam_prepare_account_deletion') { $failures.Add("Account deletion data lifecycle is not configured") }

if ($failures.Count) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "FixAm 9ja production-readiness checks passed."
