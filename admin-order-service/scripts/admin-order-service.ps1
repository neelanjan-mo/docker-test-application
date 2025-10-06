# =====================================================================
# Admin Order Service Smoke Tests
# Base: http://localhost:3000
# Requirements:
#   - pnpm dev running for admin-order-service
#   - .env.local contains JWT_* (HS256) and, if you want to bypass catalog,
#     DEV_BYPASS_CATALOG=1
#   - If NOT bypassing, ensure catalog-service is running and CATALOG_* envs are set
#   - PowerShell 5+ or pwsh
# =====================================================================

$ErrorActionPreference = "Stop"

# -------------------------
# Config
# -------------------------
$Base = "http://localhost:3000"
# Toggle DEV bypass (must match .env.local in admin-order-service)
$UseDevBypass = $true

# -------------------------
# Helpers
# -------------------------
function Assert-ObjectId([string]$id) {
    if ($id -notmatch '^[a-fA-F0-9]{24}$') { throw "Invalid ObjectId: $id" }
}
function New-FakeObjectId {
    # 12 random bytes -> 24 hex chars
    $bytes = New-Object 'System.Byte[]' 12
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}
function InvokeJson {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PUT", "PATCH", "DELETE")] [string] $Method,
        [Parameter(Mandatory = $true)] [string] $Url,
        [hashtable] $Headers,
        [hashtable] $Body
    )
    try {
        if ($PSBoundParameters.ContainsKey('Body') -and $Body) {
            $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json)
        }
        else {
            $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers
        }
        return $resp.Content | ConvertFrom-Json
    }
    catch {
        $errStream = $_.Exception.Response.GetResponseStream()
        if ($errStream) {
            $reader = New-Object System.IO.StreamReader($errStream)
            $json = $reader.ReadToEnd()
            Write-Host "HTTP ERROR $Method $Url"
            Write-Host $json
        }
        else {
            Write-Host "HTTP ERROR $Method $Url"
            Write-Host $_
        }
        throw
    }
}

# -------------------------
# 0) JWT
# -------------------------
$jwt = (pnpm run -s mint:jwt).Trim()
$H = @{ Authorization = "Bearer $jwt" }
$HJson = $H + @{ "Content-Type" = "application/json" }

# -------------------------
# 1) Customers CRUD (sanity for downstream ids)
# -------------------------
# Create
$cust = InvokeJson -Method POST -Url "$Base/api/customers" -Headers $HJson -Body @{
    email = "alice@example.com"; name = "Alice"
}
$customerId = $cust._id
Write-Host "customerId: $customerId"

# List
$cl = InvokeJson -Method GET -Url "$Base/api/customers?page=1&pageSize=10&q=alice" -Headers $H
Write-Host "customers.total: $($cl.total)"

# Read
$cr = InvokeJson -Method GET -Url "$Base/api/customers/$customerId" -Headers $H
Write-Host "customer.name: $($cr.name)"

# Patch
$cp = InvokeJson -Method PATCH -Url "$Base/api/customers/$customerId" -Headers $HJson -Body @{ name = "Alice Cooper" }
Write-Host "updated.name: $($cp.name)"

# -------------------------
# 2) Carts CRUD (with qty=0 removal semantics)
# -------------------------
# Create cart
$cart = InvokeJson -Method POST -Url "$Base/api/carts" -Headers $HJson -Body @{ customerId = $customerId }
$cartId = $cart._id
Write-Host "cartId: $cartId"

# Determine productId
if ($UseDevBypass) {
    $productId = New-FakeObjectId
}
else {
    # Provide a real product id that exists in catalog-service
    $productId = "<REPLACE_WITH_REAL_CATALOG_PRODUCT_ID>"
    Assert-ObjectId $productId
}
Write-Host "productId: $productId"

# Add line
$cart = InvokeJson -Method PUT -Url "$Base/api/carts/$cartId" -Headers $HJson -Body @{ productId = $productId; qty = 2 }
Write-Host "cart.items.count(after add): $($cart.items.Count)"

# Update line
$cart = InvokeJson -Method PUT -Url "$Base/api/carts/$cartId" -Headers $HJson -Body @{ productId = $productId; qty = 5 }
Write-Host "cart.items[0].qty(after update): $($cart.items[0].qty)"

# Remove line (qty=0)
$cart = InvokeJson -Method PUT -Url "$Base/api/carts/$cartId" -Headers $HJson -Body @{ productId = $productId; qty = 0 }
Write-Host "cart.items.count(after remove): $($cart.items.Count)"

# List carts
$cl2 = InvokeJson -Method GET -Url "$Base/api/carts?page=1&pageSize=10&customerId=$customerId" -Headers $H
Write-Host "carts.total: $($cl2.total)"

# -------------------------
# 3) Orders CRUD + transitions (created -> confirmed -> fulfilled)
# -------------------------
# For order creation we need at least one valid product line:
if ($UseDevBypass) {
    $productId = New-FakeObjectId
}
else {
    $productId = "<REPLACE_WITH_REAL_CATALOG_PRODUCT_ID>"
    Assert-ObjectId $productId
}

# Create order
$order = InvokeJson -Method POST -Url "$Base/api/orders" -Headers $HJson -Body @{
    customerId = $customerId
    items      = @(@{ productId = $productId; qty = 2 })
}
$orderId = $order._id
Write-Host "orderId: $orderId | number=$($order.orderNumber) | status=$($order.status)"

# List orders (filter + pagination)
$olist = InvokeJson -Method GET -Url "$Base/api/orders?page=1&pageSize=10&customerId=$customerId&status=created" -Headers $H
Write-Host "orders.total(created): $($olist.total)"

# Read order
$or = InvokeJson -Method GET -Url "$Base/api/orders/$orderId" -Headers $H
Write-Host "order.subtotal: $($or.subtotal)"

# Negative transition: created -> fulfilled (expect 400)
try {
    InvokeJson -Method PATCH -Url "$Base/api/orders/$orderId" -Headers $HJson -Body @{ status = "fulfilled" } | Out-Null
}
catch { Write-Host "invalid transition (created->fulfilled) rejected as expected" }

# Valid transition: created -> confirmed
$oc = InvokeJson -Method PATCH -Url "$Base/api/orders/$orderId" -Headers $HJson -Body @{ status = "confirmed" }
Write-Host "status(after confirm): $($oc.status)"

# Valid transition: confirmed -> fulfilled
$of = InvokeJson -Method PATCH -Url "$Base/api/orders/$orderId" -Headers $HJson -Body @{ status = "fulfilled" }
Write-Host "status(after fulfill): $($of.status)"

# -------------------------
# 4) Cleanup
# -------------------------
# Delete order
$do = InvokeJson -Method DELETE -Url "$Base/api/orders/$orderId" -Headers $H
Write-Host "delete order -> ok: $($do.ok)"

# Delete cart
$dc = InvokeJson -Method DELETE -Url "$Base/api/carts/$cartId" -Headers $H
Write-Host "delete cart -> ok: $($dc.ok)"

# Delete customer
$dcu = InvokeJson -Method DELETE -Url "$Base/api/customers/$customerId" -Headers $H
Write-Host "delete customer -> ok: $($dcu.ok)"
