$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $Root ".logs"
$ComposeFile = Join-Path $Root "deploy\docker-compose.yml"
$EnvFile = Join-Path $Root "deploy\.env"
$EnvExample = Join-Path $Root "deploy\.env.example"

Set-Location -LiteralPath $Root
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host ("[rin-oj] " + $Message)
}

function Test-Port {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return $null -ne $conn
}

function Wait-Port {
  param(
    [int]$Port,
    [string]$Name,
    [int]$TimeoutSeconds = 60
  )

  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    if (Test-Port $Port) {
      Write-Step "$Name is listening on port $Port"
      return
    }
    Start-Sleep -Seconds 1
  }

  throw "$Name did not listen on port $Port within $TimeoutSeconds seconds"
}

function Test-ProcessCommandLine {
  param([string]$Fragment)
  $process = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($Fragment) } |
    Select-Object -First 1
  return $null -ne $process
}

function Start-LoggedProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [int[]]$Ports = @(),
    [string]$ProcessFragment = ""
  )

  $allPortsOpen = $true
  foreach ($port in $Ports) {
    if (-not (Test-Port $port)) {
      $allPortsOpen = $false
    }
  }

  if ($Ports.Count -gt 0 -and $allPortsOpen) {
    Write-Step "$Name already appears to be running"
    return
  }

  if ($ProcessFragment -ne "" -and (Test-ProcessCommandLine $ProcessFragment)) {
    Write-Step "$Name already appears to be running"
    return
  }

  $outLog = Join-Path $LogDir "$Name.out.log"
  $errLog = Join-Path $LogDir "$Name.err.log"
  Remove-Item -LiteralPath $outLog, $errLog -ErrorAction SilentlyContinue

  Write-Step "starting $Name"
  Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog | Out-Null
}

function Invoke-External {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Ensure-DeployEnv {
  if (-not (Test-Path -LiteralPath $EnvFile)) {
    if (-not (Test-Path -LiteralPath $EnvExample)) {
      throw "deploy\.env.example not found"
    }
    Copy-Item -LiteralPath $EnvExample -Destination $EnvFile -Force
    Write-Step "created deploy\.env from deploy\.env.example"
  } else {
    Write-Step "deploy\.env exists"
  }
}

function Ensure-Docker {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Step "Docker daemon is ready"
    return
  }

  $candidates = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
  )
  $dockerDesktop = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $dockerDesktop) {
    throw "Docker daemon is not running and Docker Desktop was not found"
  }

  Write-Step "starting Docker Desktop"
  Start-Process -FilePath $dockerDesktop -WindowStyle Hidden

  for ($i = 0; $i -lt 90; $i++) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Step "Docker daemon is ready"
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "Docker daemon was not ready after 180 seconds"
}

function Ensure-MinioBucket {
  Write-Step "ensuring MinIO bucket rin-problems"
  docker exec rin-oj-minio-1 mc alias set local http://127.0.0.1:9000 rin rin_dev_minio_password *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not configure MinIO alias yet. MinIO may still be starting."
    return
  }
  docker exec rin-oj-minio-1 mc mb --ignore-existing local/rin-problems *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not create MinIO bucket rin-problems yet."
  }
}

function Start-GoService {
  param(
    [string]$Name,
    [string]$RelativeDirectory,
    [hashtable]$Environment,
    [int[]]$Ports
  )

  $serviceDir = Join-Path $Root $RelativeDirectory
  $envLines = @()
  foreach ($entry in $Environment.GetEnumerator()) {
    $safeValue = [string]$entry.Value
    $safeValue = $safeValue.Replace("'", "''")
    $envLines += "`$env:$($entry.Key) = '$safeValue'"
  }

  $command = @"
Set-Location -LiteralPath '$serviceDir'
$($envLines -join "`n")
go run .
"@

  Start-LoggedProcess -Name $Name -WorkingDirectory $serviceDir -Command $command -Ports $Ports -ProcessFragment $RelativeDirectory
}

function Start-Web {
  if (Test-Port 3000) {
    Write-Step "web already appears to be running on port 3000"
    return
  }

  $command = @"
Set-Location -LiteralPath '$Root'
`$env:NEXT_PUBLIC_RIN_GATEWAY_URL = 'http://127.0.0.1:8080'
`$env:NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS = 'false'
npm run web:dev
"@

  Start-LoggedProcess -Name "web-dev" -WorkingDirectory $Root -Command $command -Ports @(3000) -ProcessFragment "apps\web"
}

Ensure-DeployEnv
Ensure-Docker

Write-Step "starting Docker infrastructure and go-judge"
Invoke-External "docker" @("compose", "--env-file", $EnvFile, "-f", $ComposeFile, "--profile", "judge", "up", "-d", "postgres", "redis", "meilisearch", "minio", "go-judge")

Wait-Port 5432 "Postgres" 90
Wait-Port 6379 "Redis" 90
Wait-Port 7700 "Meilisearch" 90
Wait-Port 9000 "MinIO" 90
Wait-Port 5050 "go-judge" 90
Ensure-MinioBucket

$postgresDsn = "postgres://rin:rin_dev_password@127.0.0.1:5432/rin_oj?sslmode=disable"

Start-GoService -Name "user-service" -RelativeDirectory "services\user-service" -Ports @(50051, 50061) -Environment @{
  RIN_USER_POSTGRES_DSN = $postgresDsn
  RIN_USER_AUTO_MIGRATE = "true"
}
Wait-Port 50051 "user-service gRPC" 90
Wait-Port 50061 "user-service admin HTTP" 90

Start-GoService -Name "problem-service" -RelativeDirectory "services\problem-service" -Ports @(50053) -Environment @{
  RIN_MINIO_ENDPOINT = "127.0.0.1:9000"
  RIN_MINIO_ACCESS_KEY = "rin"
  RIN_MINIO_SECRET_KEY = "rin_dev_minio_password"
  RIN_MINIO_PROBLEM_BUCKET = "rin-problems"
}
Wait-Port 50053 "problem-service" 90

Start-GoService -Name "submission-service" -RelativeDirectory "services\submission-service" -Ports @(50052) -Environment @{
  RIN_REDIS_ADDR = "127.0.0.1:6379"
  RIN_SUBMISSION_POSTGRES_DSN = $postgresDsn
  RIN_SUBMISSION_AUTO_MIGRATE = "true"
}
Wait-Port 50052 "submission-service" 90

Start-GoService -Name "judge-dispatcher" -RelativeDirectory "services\judge-dispatcher" -Ports @() -Environment @{
  RIN_REDIS_ADDR = "127.0.0.1:6379"
  RIN_SUBMISSION_GRPC_TARGET = "127.0.0.1:50052"
  RIN_JUDGE_PROVIDER = "gojudge"
  RIN_GO_JUDGE_ENDPOINT = "http://127.0.0.1:5050"
}

Start-GoService -Name "gateway" -RelativeDirectory "services\gateway" -Ports @(8080) -Environment @{
  RIN_USER_GRPC_TARGET = "127.0.0.1:50051"
  RIN_SUBMISSION_GRPC_TARGET = "127.0.0.1:50052"
  RIN_PROBLEM_GRPC_TARGET = "127.0.0.1:50053"
  RIN_USER_ADMIN_HTTP_TARGET = "http://127.0.0.1:50061"
}
Wait-Port 8080 "gateway" 90

$health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/healthz" -TimeoutSec 10
Write-Step "gateway health: $($health.status)"

Start-Web
if (-not (Test-Port 3000)) {
  Wait-Port 3000 "web" 90
}

Write-Step "all local Rin OJ services are ready"
