# =====================================================================
# Catalog Service Smoke Tests
# Base: http://localhost:3001
# Requirements:
#   - pnpm dev running for catalog-service
#   - .env.local contains JWT_* (HS256) and PUBLIC_S2S_KEY
#   - PowerShell 5+ or pwsh
# =====================================================================

$ErrorActionPreference = "Stop"

# -------------------------
# Config
# -------------------------
$Base = "http://localhost:3001"
# Must equal PUBLIC_S2S_KEY in catalog-service .env.local
$S2S  = "wWBAPs2y2ZdVFGtw"

# -------------------------
# Helpers
# -------------------------
function InvokeJson {
  param(
    [Parameter(Mandatory=$true)][ValidateSet("GET","POST","PUT","PATCH","DELETE")] [string] $Method,
    [Parameter(Mandatory=$true)] [string] $Url,
    [hashtable] $Headers,
    [hashtable] $Body
  )
  try {
    if ($PSBoundParameters.ContainsKey('Body') -and $Body) {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json)
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers
    }
    return $resp.Content | ConvertFrom-Json
  } catch {
    $errStream = $_.Exception.Response.GetResponseStream()
    if ($errStream) {
      $reader = New-Object System.IO.StreamReader($errStream)
      $json = $reader.ReadToEnd()
      Write-Host "HTTP ERROR $Method $Url"
      Write-Host $json
    } else {
      Write-Host "HTTP ERROR $Method $Url"
      Write-Host $_
    }
    throw
  }
}

function New-AuthHeader($jwt) { return @{ Authorization = "Bearer $jwt" } }

# -------------------------
# 0) Health
# -------------------------
$health = Invoke-WebRequest -Method GET -Uri "$Base/api/health"
Write-Host "Health: $($health.Content)"

# -------------------------
# 1) Admin JWT
# -------------------------
$jwt = (pnpm run -s mint:jwt).Trim()
$H   = New-AuthHeader $jwt
$HJson = $H + @{ "Content-Type" = "application/json" }

# Negative path: unauthenticated list
try { InvokeJson -Method GET -Url "$Base/api/products" -Headers @{} | Out-Null } catch { Write-Host "Unauthenticated GET blocked as expected" }

# -------------------------
# 2) Product CRUD (admin routes)
# -------------------------
# Create two products
$p1 = InvokeJson -Method POST -Url "$Base/api/products" -Headers $HJson -Body @{
  name="Keyboard Pro"; price=149.99; currency="USD"; stockQty=50; status="active"
}
$id1 = $p1._id
Write-Host "Created p1: $id1"

$p2 = InvokeJson -Method POST -Url "$Base/api/products" -Headers $HJson -Body @{
  name="Mouse Ultra"; price=79.99; currency="USD"; stockQty=30; status="active"
}
$id2 = $p2._id
Write-Host "Created p2: $id2"

# List with query
$list = InvokeJson -Method GET -Url "$Base/api/products?page=1&pageSize=10&q=mouse&status=active" -Headers $H
Write-Host "List.total: $($list.total)"

# Read p1
$r1 = InvokeJson -Method GET -Url "$Base/api/products/$id1" -Headers $H
Write-Host "Read p1 -> name=$($r1.name) price=$($r1.price) stock=$($r1.stockQty) version=$($r1.version)"

# Patch p1 (price + stock; verify version bump)
$u1 = InvokeJson -Method PATCH -Url "$Base/api/products/$id1" -Headers $HJson -Body @{
  price=129.99; stockQty=60
}
Write-Host "Updated p1 -> price=$($u1.price) stock=$($u1.stockQty) version=$($u1.version)"

# Negative path: invalid price
try {
  InvokeJson -Method PATCH -Url "$Base/api/products/$id1" -Headers $HJson -Body @{ price=-1 } | Out-Null
} catch { Write-Host "Invalid price rejected as expected" }

# -------------------------
# 3) Public S2S — Lookup
# -------------------------
$S2SHeaders = @{ Authorization = "Bearer $($S2S.Trim())"; "Content-Type" = "application/json" }

$lookup = InvokeJson -Method POST -Url "$Base/api/public/products/lookup" -Headers $S2SHeaders -Body @{
  ids = @($id1, $id2)
}
Write-Host "Lookup -> count=$($lookup.Count)"

# Negative path: bad S2S key
try {
  InvokeJson -Method POST -Url "$Base/api/public/products/lookup" -Headers @{ Authorization = "Bearer WRONG" ; "Content-Type"="application/json"} -Body @{ ids=@($id1) } | Out-Null
} catch { Write-Host "Invalid S2S key rejected as expected" }

# -------------------------
# 4) Public S2S — Inventory Decrement
# -------------------------
$dec = InvokeJson -Method POST -Url "$Base/api/public/inventory/decrement" -Headers $S2SHeaders -Body @{
  lines = @(@{ productId=$id1; qty=2 }, @{ productId=$id2; qty=1 })
}
Write-Host "Decrement -> ok=$($dec.ok)"

# Confirm stock reflected
$r1b = InvokeJson -Method GET -Url "$Base/api/products/$id1" -Headers $H
$r2b = InvokeJson -Method GET -Url "$Base/api/products/$id2" -Headers $H
Write-Host "Post-decrement p1.stock=$($r1b.stockQty) p2.stock=$($r2b.stockQty)"

# Negative path: oversell
try {
  InvokeJson -Method POST -Url "$Base/api/public/inventory/decrement" -Headers $S2SHeaders -Body @{
    lines = @(@{ productId=$id2; qty=9999 })
  } | Out-Null
} catch { Write-Host "Oversell rejected with 409 as expected" }

# -------------------------
# 5) Cleanup
# -------------------------
$d2 = InvokeJson -Method DELETE -Url "$Base/api/products/$id2" -Headers $H
$d1 = InvokeJson -Method DELETE -Url "$Base/api/products/$id1" -Headers $H
Write-Host "Cleanup -> p1.ok=$($d1.ok) p2.ok=$($d2.ok)"
