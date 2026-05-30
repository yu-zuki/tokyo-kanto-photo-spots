param(
    [string]$SourceRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
    [string]$TargetRoot = $env:PHOTO_SPOTS_SITE_ROOT
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($TargetRoot)) {
    $TargetRoot = "C:\Sites\photo-spots"
}

$stageRoot = Join-Path $env:TEMP ("photo-spots-stage-" + [guid]::NewGuid().ToString("N"))
$assetSource = Join-Path $SourceRoot "assets"
$assetStage = Join-Path $stageRoot "assets"

New-Item -ItemType Directory -Force -Path $assetStage | Out-Null

Copy-Item -Path (Join-Path $SourceRoot "index.html") -Destination $stageRoot -Force
Copy-Item -Path (Join-Path $SourceRoot "photo_spots_preview.png") -Destination $stageRoot -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $assetSource "*") -Destination $assetStage -Recurse -Force

New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null

$robocopyArgs = @(
    $stageRoot,
    $TargetRoot,
    "/MIR",
    "/FFT",
    "/R:2",
    "/W:2",
    "/XD",
    ".git",
    "/XF",
    ".DS_Store"
)

& robocopy @robocopyArgs
$exitCode = $LASTEXITCODE

Remove-Item -Path $stageRoot -Recurse -Force

if ($exitCode -ge 8) {
    throw "robocopy failed with exit code $exitCode"
}

Write-Host "Published photo spots site to $TargetRoot"
