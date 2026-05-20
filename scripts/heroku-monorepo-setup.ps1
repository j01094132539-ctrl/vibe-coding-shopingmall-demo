# [레거시] monorepo buildpack 전용 — APP_BASE Config Var 필수. 권장: .\heroku-setup.ps1 (루트 package.json)
# 사용: .\scripts\heroku-monorepo-setup.ps1 -AppName your-heroku-app-name

param(
  [Parameter(Mandatory = $true)]
  [string]$AppName
)

$ErrorActionPreference = 'Stop'

Write-Host "Heroku app: $AppName"
Write-Host "Buildpacks: monorepo -> nodejs, APP_BASE=Server"

heroku buildpacks:clear -a $AppName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

heroku buildpacks:add -a $AppName https://github.com/lstoll/heroku-buildpack-monorepo
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

heroku buildpacks:add -a $AppName heroku/nodejs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

heroku config:set APP_BASE=Server -a $AppName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "완료. 저장소 루트에서 배포:"
Write-Host "  git push heroku main"
Write-Host ""
heroku buildpacks -a $AppName
heroku config:get APP_BASE -a $AppName
