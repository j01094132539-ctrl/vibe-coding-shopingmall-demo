# Heroku 배포 설정 — 기본: 루트 package.json + heroku/nodejs (APP_BASE 불필요)
# 모노레포 buildpack 유지 시: -Monorepo 스위치 + 반드시 APP_BASE=Server Config Var
# 사용: .\scripts\heroku-setup.ps1 -AppName your-heroku-app-name

param(
  [Parameter(Mandatory = $true)]
  [string]$AppName,
  [switch]$Monorepo
)

$ErrorActionPreference = 'Stop'

if ($Monorepo) {
  Write-Host "모드: monorepo buildpack (APP_BASE=Server Config Var 필수)"
  heroku buildpacks:clear -a $AppName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  heroku buildpacks:add -a $AppName https://github.com/lstoll/heroku-buildpack-monorepo
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  heroku buildpacks:add -a $AppName heroku/nodejs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  heroku config:set APP_BASE=Server -a $AppName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "모드: 루트 package.json 프록시 (heroku/nodejs 단일)"
  heroku buildpacks:clear -a $AppName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  heroku buildpacks:set heroku/nodejs -a $AppName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  heroku config:unset APP_BASE -a $AppName 2>$null
}

Write-Host ""
Write-Host "필수 Config Vars (Heroku 대시보드): JWT_SECRET, MONGODB_ATLAS_URL, PORTONE_IMP_KEY, PORTONE_IMP_SECRET"
Write-Host "JWT_SECRET은 Server/.env 값을 복사하거나 새 랜덤 문자열 사용 (Vercel에 넣지 않음)"
Write-Host ""
Write-Host "완료. 루트에서: git push heroku main"
Write-Host ""
heroku buildpacks -a $AppName
if ($Monorepo) {
  heroku config:get APP_BASE -a $AppName
}
