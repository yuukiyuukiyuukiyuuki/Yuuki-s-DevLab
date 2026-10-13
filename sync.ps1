param(
    [string]$Message = "chore: update portal links and files"
)

$env:Path = "C:\Users\Yuuki\AppData\Local\Programs\Git\cmd;C:\Users\Yuuki\AppData\Local\Microsoft\WinGet\Links;$env:Path"
$git = "C:\Users\Yuuki\AppData\Local\Programs\Git\cmd\git.exe"
$gh = "C:\Users\Yuuki\AppData\Local\Microsoft\WinGet\Links\gh.exe"

Write-Host ">>> Checking Git status..."
& $git status --short

Write-Host ">>> Adding all changes..."
& $git add .

$status = & $git status --porcelain
if (-not $status) {
    Write-Host ">>> No changes to commit. Everything is up to date!"
    exit 0
}

Write-Host ">>> Committing with message: '$Message'..."
& $git commit -m $Message

Write-Host ">>> Pushing to GitHub (origin main)..."
$token = (& $gh auth token).Trim()
if ($token) {
    $pushUrl = "https://x-access-token:$token@github.com/yuukiyuukiyuukiyuuki/Yuuki-s-DevLab.git"
    & $git push $pushUrl main:main
} else {
    & $git push origin main
}

Write-Host ">>> Push completed successfully!"
