<#
  도겸이 포켓몬 수학모험 — 설치 파일을 인터넷 링크로 보내기

  하는 일:
    builds\phone 의 가장 최신 APK 를 비공개 버킷에 올리고, 7일짜리 서명 링크를 만든다.
    링크를 가진 사람만 받을 수 있고(주소만으로는 403), 파일은 7일 뒤 버킷 수명 규칙으로 자동 삭제된다.
    APK 가 300MB 라 메일 첨부(Gmail 25MB)·텔레그램(50MB)·브라우저 도구(10MB)로는 못 보낸다.

  준비물 (2026-09-19 한 번 만들어 둠):
    버킷 gs://minsung-buboo2-apk-share  — minsung-buboo2 프로젝트, 서울, 비공개, 7일 뒤 삭제
    서명 키 ~/.claude/minsung-buboo2-firebase-adminsdk.json — 이 버킷 objectViewer 권한 부여됨
    버킷이 없어졌으면 스크립트가 다시 만든다 (그때만 권한 부여도 다시 함)

  사용법:
    .\share-apk.ps1            최신 APK 업로드 → 링크 출력 (+ 클립보드)
    .\share-apk.ps1 -Apk <경로>  특정 APK
  마지막 줄 APK_LINK=... 가 링크다. 빌드는 따로: .\build-apk.ps1 -NoServe
#>
param([string]$Apk = '')

$ErrorActionPreference = 'Continue'
$project = 'minsung-buboo2'
$bucket  = 'gs://minsung-buboo2-apk-share'
$key     = "$HOME\.claude\minsung-buboo2-firebase-adminsdk.json"
$phone   = Join-Path (Split-Path $PSScriptRoot -Parent) 'builds\phone'

if (-not $Apk) {
  $f = Get-ChildItem $phone -Filter '*.apk' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $f) { throw "APK 없음: $phone — 먼저 .\build-apk.ps1 -NoServe" }
  $Apk = $f.FullName
}
$name = Split-Path $Apk -Leaf
$obj  = "$bucket/$name"
Write-Host "APK: $name ($([math]::Round((Get-Item $Apk).Length / 1MB, 1)) MB, $((Get-Item $Apk).LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"

# 1) 버킷 — 있으면 건너뜀 (없을 때만 만들고 권한 부여)
gcloud storage buckets describe $bucket --format="value(name)" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host '[준비] 버킷이 없어 새로 만든다' -ForegroundColor Yellow
  $lc = Join-Path $env:TEMP 'apk-share-lifecycle.json'
  '{"rule":[{"action":{"type":"Delete"},"condition":{"age":7}}]}' | Out-File -Encoding ascii $lc
  gcloud storage buckets create $bucket --project=$project --location=asia-northeast3 `
    --uniform-bucket-level-access --public-access-prevention --lifecycle-file=$lc
  if ($LASTEXITCODE -ne 0) { throw '버킷 생성 실패' }
  $sa = (Get-Content $key -Raw | ConvertFrom-Json).client_email
  gcloud storage buckets add-iam-policy-binding $bucket --member="serviceAccount:$sa" `
    --role=roles/storage.objectViewer --format="value(etag)" | Out-Null
}

# 2) 업로드 (이미 같은 이름이 있으면 덮어씀 — 같은 날 다시 빌드한 경우)
Write-Host '[1/2] 업로드' -ForegroundColor Cyan
gcloud storage cp $Apk $obj --content-type=application/vnd.android.package-archive
if ($LASTEXITCODE -ne 0) { throw '업로드 실패' }

# 3) 7일짜리 서명 링크. 출력은 YAML 이고 주소 형식이 <버킷>.storage.googleapis.com 이라
#    signed_url: 줄을 통째로 집는다 (2026-09-19 경로형 주소로 찾다가 판정만 틀린 적 있음)
Write-Host '[2/2] 링크 만들기 (7일)' -ForegroundColor Cyan
$out = gcloud storage sign-url $obj --private-key-file=$key --duration=7d --region=asia-northeast3 2>&1 | Out-String
$url = ([regex]'signed_url:\s*(\S+)').Match($out).Groups[1].Value
if (-not $url) { Write-Host $out; throw '링크 생성 실패' }

$code = & curl.exe -s -o NUL -w '%{http_code}' -r 0-0 $url
if ($code -ne '206' -and $code -ne '200') { throw "링크가 안 열림 (HTTP $code)" }
$exp = (Get-Date).AddDays(7).ToString('yyyy-MM-dd HH:mm')
try { Set-Clipboard -Value $url } catch { }

Write-Host "  확인 HTTP $code · 만료 $exp · 클립보드 복사됨"
Write-Host "APK_LINK=$url"
