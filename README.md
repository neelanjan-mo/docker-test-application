# **Admin-Order & Catalog Microservices**

## **Overview**

This project implements a **microservices-based backend** built with **Next.js (App Router)** and **Node.js (TypeScript)** using **pnpm** as the package manager.
It consists of two core services:

1. **Admin-Order Service (Port 3000)**
   Handles customers, carts, and orders — including CRUD operations and catalog integration.

2. **Catalog Service (Port 3001)**
   Manages the product catalog, public inventory APIs, and stock management for order validation.

Both services communicate via secure **S2S (server-to-server)** authentication and share **MongoDB** as their data layer.

---

## **Architecture**

### **1. Admin-Order Service**

**Responsibilities:**

* CRUD for customers, carts, and orders.
* Integrates with Catalog Service for product validation and inventory decrement.
* Uses JWT-based Admin Authentication (HS256).

**API Endpoints:**

| Method                    | Route                   | Description |
| ------------------------- | ----------------------- | ----------- |
| GET /api/customers        | List all customers      |             |
| POST /api/customers       | Create a customer       |             |
| GET /api/customers/:id    | Get a customer          |             |
| PATCH /api/customers/:id  | Update customer         |             |
| DELETE /api/customers/:id | Delete customer         |             |
| GET /api/carts            | List carts              |             |
| POST /api/carts           | Create cart             |             |
| GET /api/carts/:id        | Read cart               |             |
| PUT /api/carts/:id        | Add/update/remove items |             |
| DELETE /api/carts/:id     | Delete cart             |             |
| GET /api/orders           | List orders             |             |
| POST /api/orders          | Create order            |             |
| GET /api/orders/:id       | Read order              |             |
| PATCH /api/orders/:id     | Update order status     |             |
| DELETE /api/orders/:id    | Delete order            |             |

---

### **2. Catalog Service**

**Responsibilities:**

* CRUD for products.
* Exposes S2S API for product lookup and atomic inventory decrement.
* Uses its own JWT auth for admin endpoints.

**API Endpoints:**

| Method                               | Route                                  | Description |
| ------------------------------------ | -------------------------------------- | ----------- |
| GET /api/products                    | List products                          |             |
| POST /api/products                   | Create product                         |             |
| GET /api/products/:id                | Get product                            |             |
| PATCH /api/products/:id              | Update product                         |             |
| DELETE /api/products/:id             | Delete product                         |             |
| POST /api/public/products/lookup     | Public product info lookup             |             |
| POST /api/public/inventory/decrement | Atomic stock decrement (S2S protected) |             |

---

## **Authentication Model**

### **Admin Authentication (JWT - HS256)**

Both services use JWT-based Bearer auth for all `/api/**` admin routes.

Example:

```http
Authorization: Bearer <signed-JWT>
```

JWT claims:

```json
{
  "sub": "admin@example.com",
  "roles": ["admin"],
  "iss": "order-admin",
  "aud": "order-api"
}
```

### **S2S Authentication**

Inter-service requests use a **shared API key**:

```http
Authorization: Bearer <PUBLIC_S2S_KEY>
```

* Used by `admin-order-service` to access `/api/public/*` endpoints in the `catalog-service`.
* Key is configured in both `.env.local` files.

---

## **Environment Configuration**

### **Admin-Order Service**

`.env.local`

```bash
# MongoDB connection
MONGODB_URI=mongodb://mongo:27017/admin_order_service
MONGODB_DB=admin_order_service

# JWT for local dev
JWT_ISSUER=order-admin
JWT_AUDIENCE=order-api
JWT_SECRET=lyUqYJWHkNqx3siH

# Catalog integration
CATALOG_BASE_URL=http://catalog-service:3001
CATALOG_API_KEY=wWBAPs2y2ZdVFGtw

# Optional bypass for local testing
DEV_BYPASS_CATALOG=1
```

### **Catalog Service**

`.env.local`

```bash
# Mongo
MONGODB_URI=mongodb://mongo:27017/catalog_service
MONGODB_DB=catalog_service

# Admin JWT
JWT_ISSUER=catalog-admin
JWT_AUDIENCE=catalog-api
JWT_SECRET=S6r89pHTZfwZ9Sgm

# Server-to-server API key (used by order service)
PUBLIC_S2S_KEY=wWBAPs2y2ZdVFGtw
```

---

## **Project Structure**

```
├── admin-order-service/
│   ├── src/
│   │   ├── app/api/ (Next.js route handlers)
│   │   ├── lib/ (auth, db, helpers)
│   │   ├── models/ (Mongoose schemas)
│   │   ├── schemas/ (Zod validation)
│   ├── scripts/smoke-admin.ps1
│   ├── Dockerfile
│   └── next.config.ts
│
├── catalog-service/
│   ├── src/
│   │   ├── app/api/
│   │   ├── lib/
│   │   ├── models/
│   │   ├── schemas/
│   ├── scripts/smoke-catalog.ps1
│   ├── Dockerfile
│   └── next.config.ts
│
└── docker-compose.yml
```

---

## **Smoke Tests**

### **Admin-Order Service**

`scripts/smoke-admin.ps1`

* Tests all CRUD operations for:

  * Customers
  * Carts (add/update/remove)
  * Orders
* Validates catalog integration (when not bypassed)
* Expected output:

  ```
  Health: ok
  Created customer: OK
  Created cart: OK
  Added item: OK
  Updated item qty: OK
  Removed item: OK
  Deleted cart and customer: OK
  ```

### **Catalog Service**

`scripts/smoke-catalog.ps1`

* Verifies:

  * Product CRUD operations
  * Public lookup API
  * Inventory decrement (atomic transaction)
  * Unauthorized access rejection
* Expected output:

  ```
  Health: ok
  Created product(s)
  Updated and validated stock changes
  Lookup -> count=2
  Invalid S2S key rejected as expected
  Decrement -> ok=True
  Oversell rejected with 409 as expected
  ```

---

## **Containerization**

### **Dockerfiles**

Both services use multi-stage builds:

1. **deps** – install dependencies
2. **builder** – build standalone Next.js app
3. **runner** – minimal runtime image

`BUILD_IN_DOCKER=1` ensures standalone builds are enabled only inside Docker.

### **docker-compose.yml**

Example:

```yaml
version: "3.9"
services:
  mongo:
    image: mongo:6
    container_name: mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  catalog-service:
    build: ./catalog-service
    container_name: catalog-service
    ports:
      - "3001:3001"
    env_file:
      - ./catalog-service/.env.local
    depends_on:
      - mongo

  admin-order-service:
    build: ./admin-order-service
    container_name: admin-order-service
    ports:
      - "3000:3000"
    env_file:
      - ./admin-order-service/.env.local
    depends_on:
      - mongo
      - catalog-service

volumes:
  mongo_data:
```

---

## **Running Locally**

```bash
# Build and start containers
docker compose up --build

# Access endpoints
Admin-Order API → http://localhost:3000/api
Catalog API     → http://localhost:3001/api
```

---

## **Deployment**

To push to Docker Hub:

```bash
# Login
docker login

# Tag images
docker tag admin-order-service <username>/admin-order-service:latest
docker tag catalog-service <username>/catalog-service:latest

# Push
docker push <username>/admin-order-service:latest
docker push <username>/catalog-service:latest
```

---

## **Summary**

This backend system provides a modular, production-ready setup for managing e-commerce operations:

* **Catalog Service** → owns product data and inventory.
* **Admin-Order Service** → orchestrates customer, cart, and order lifecycle.
* **MongoDB** → unified persistence layer.
* **JWT + S2S Security** → isolation between admin and internal APIs.
* **Dockerized** → for reproducible builds and deployment.

---

Would you like me to include **API examples** (sample request/response bodies) at the end of this README for documentation completeness?
