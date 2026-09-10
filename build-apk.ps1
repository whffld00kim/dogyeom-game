<#
  도겸이 포켓몬 수학모험 — APK 빌드 & 폰 배포 (한 방 스크립트)

  하는 일 (여섯 단계):
    1) 웹 빌드          npm run build          → dist/
    2) 안드로이드 복사   npx cap sync android   → android/app/src/main/assets/public
    3) APK 빌드         gradlew assembleDebug  → android/.../app-debug.apk
    4) 설치 폴더 정리    builds/phone 에 APK 는 "그날 날짜 이름" 하나만 남긴다
    5) 설치 페이지 갱신  index.html 의 날짜·링크·용량을 새 APK 로 맞춘다
    6) 다운로드 서버     폰에서 받을 수 있게 http 서버를 띄우고 주소를 알려준다

  왜 4번이 필요한가:
    builds/phone 의 APK 는 gradle 출력과 "하드링크"(파일 하나에 이름표 둘)로 묶여 있다.
    그래서 새로 빌드하면 그 파일 내용은 자동으로 최신이 되는데 **이름은 그대로 남는다.**
    2026-08-22 에 실제로 이름은 20260809 인데 알맹이는 8/22 인 파일이 생겼다.
    이 스크립트는 매번 옛 이름을 지우고 오늘 날짜로 다시 걸어 그 어긋남을 막는다.

  사용법:
    .\build-apk.ps1                          빌드 → 서버 실행(Ctrl+C 로 종료)
    .\build-apk.ps1 -Note "설정 잠금 추가"    설치 페이지 부제까지 함께 바꿈
    .\build-apk.ps1 -NoServe                 빌드만 (서버는 안 띄움)
    .\build-apk.ps1 -Port 8080               포트 지정 (기본 8000)
#>
param(
  [string]$Note = '',
  [switch]$NoServe,
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

$root      = $PSScriptRoot
$phone     = Join-Path (Split-Path $root -Parent) 'builds\phone'
$gradleApk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
$stamp     = Get-Date -Format 'yyyyMMdd'
$today     = Get-Date -Format 'yyyy-MM-dd'
$apkName   = "dogyeom-pokemon-math-$stamp.apk"
$target    = Join-Path $phone $apkName

# python 은 WindowsApps 스텁이 아니라 전체 경로로 부른다 (스텁은 응답 없이 멈춘다)
$py = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
if (-not (Test-Path $py)) { $py = 'python' }

function Step($n, $msg) {
  Write-Host ''
  Write-Host "[$n/6] $msg" -ForegroundColor Cyan
}

$sw = [Diagnostics.Stopwatch]::StartNew()

# ── 1. 웹 빌드 ───────────────────────────────────────────────
Step 1 '웹 빌드 (vite)'
Push-Location $root
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw '웹 빌드 실패 — 위 로그를 확인하세요.' }

  # ── 2. 안드로이드 프로젝트로 복사 ──────────────────────────
  Step 2 '안드로이드로 복사 (cap sync)'
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'cap sync 실패 — 위 로그를 확인하세요.' }
} finally {
  Pop-Location
}

# ── 3. APK 빌드 ─────────────────────────────────────────────
Step 3 'APK 빌드 (gradle assembleDebug) — 1~3분'
Push-Location (Join-Path $root 'android')
try {
  # init-java17.gradle: Capacitor 의 Java 21 소스호환을 17 로 낮춰 JDK 17 로 빌드
  $log = & .\gradlew.bat assembleDebug -I init-java17.gradle --console=plain
  $code = $LASTEXITCODE
  $log | Out-File -FilePath 'build_log.txt' -Encoding utf8
  $log | Select-Object -Last 4 | ForEach-Object { Write-Host "  $_" }
  if ($code -ne 0) { throw "APK 빌드 실패 (exit $code) — android\build_log.txt 를 보세요." }
} finally {
  Pop-Location
}
if (-not (Test-Path $gradleApk)) { throw "APK 가 만들어지지 않았습니다: $gradleApk" }

# ── 4. 설치 폴더 정리 — APK 는 오늘 이름 하나만 ──────────────
Step 4 '설치 폴더 정리 (최신 하나만 남김)'
if (-not (Test-Path $phone)) { New-Item -ItemType Directory -Path $phone | Out-Null }
Get-ChildItem $phone -Filter 'dogyeom-pokemon-math-*.apk' | ForEach-Object {
  Write-Host "  - 지움: $($_.Name)"
  Remove-Item $_.FullName -Force   # 하드링크 이름표만 지우는 것 (원본 APK 는 남는다)
}
New-Item -ItemType HardLink -Path $target -Target $gradleApk | Out-Null
$mb = [math]::Round((Get-Item $target).Length / 1MB, 1)
Write-Host "  + 만듦: $apkName ($mb MB)"

# ── 5. 설치 페이지 갱신 ─────────────────────────────────────
Step 5 '설치 페이지(index.html) 갱신'
$idx = Join-Path $phone 'index.html'
if (Test-Path $idx) {
  $html = Get-Content $idx -Raw -Encoding UTF8
  $html = $html -replace 'href="\./dogyeom-pokemon-math-\d{8}\.apk"', "href=`"./$apkName`""
  $html = $html -replace '내려받기 \([\d.]+ ?MB\)', "내려받기 ($mb MB)"
  if ($Note) {
    # 부제를 통째로 교체 (날짜 + 이번 변경 설명)
    $html = $html -replace '<p class="sub">.*?</p>', "<p class=`"sub`">$today 빌드 · $Note</p>"
  } else {
    # -Note 없으면 날짜만 갈아끼우고 기존 설명은 그대로 둔다
    $html = $html -replace '(<p class="sub">)\d{4}-\d{2}-\d{2}( 빌드)', "`${1}$today`${2}"
  }
  Set-Content -Path $idx -Value $html -Encoding utf8 -NoNewline
  Write-Host "  날짜 $today · 링크 $apkName · 용량 $mb MB"
} else {
  Write-Warning "index.html 이 없습니다: $idx (APK 는 정상적으로 만들어졌습니다)"
}

$sw.Stop()
Write-Host ''
Write-Host ("빌드 완료 — {0}분 {1}초" -f $sw.Elapsed.Minutes, $sw.Elapsed.Seconds) -ForegroundColor Green

# ── 6. 다운로드 서버 ────────────────────────────────────────
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
       Select-Object -First 1).IPAddress
$url = "http://${ip}:$Port"

if ($NoServe) {
  Write-Host ''
  Write-Host '서버는 안 띄웠습니다. 폰으로 받으려면:' -ForegroundColor Yellow
  Write-Host "  cd `"$phone`"; & `"$py`" -m http.server $Port --bind 0.0.0.0"
  Write-Host "  폰 브라우저: $url"
  return
}

Step 6 '다운로드 서버 실행'
Write-Host ''
Write-Host "  폰 브라우저에서 열기 →  $url" -ForegroundColor Green
Write-Host '  같은 Wi-Fi 여야 합니다. 다 받으면 Ctrl+C 로 서버를 끄세요.'
Write-Host ''
Set-Location $phone
& $py -m http.server $Port --bind 0.0.0.0
