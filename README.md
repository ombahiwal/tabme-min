# 🍽️ TabMe - QR Restaurant Ordering System

A full-stack MVP restaurant QR ordering system built with Next.js 14 (App Router), MongoDB, and TypeScript.

## 🌟 Features

### Customer Experience
- **QR Code Scanning**: Customers scan a QR code at their table to access the menu
- **Menu Browsing**: Browse categories and items with descriptions, prices, and tags
- **Cart Management**: Add/remove items, adjust quantities, add notes
- **Order Placement**: Place orders directly from the mobile device
- **Order Tracking**: Real-time order status updates (created → accepted → preparing → ready → served → paid)

### Restaurant Staff Experience
- **Secure Login**: JWT-based authentication for staff/admin
- **Orders Dashboard**: Live incoming orders with status management
- **Status Updates**: Accept/reject orders, move through preparation stages
- **Menu Management**: CRUD for categories and items, toggle availability
- **Table/QR Management**: Create tables, generate/regenerate QR codes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MongoDB (using Docker)
```bash
docker-compose up -d
```

Or connect to MongoDB Atlas by updating `MONGODB_URI` in `.env.local`

### 3. Configure Environment
Copy the example env file (already done if you cloned):
```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:
```env
MONGODB_URI=mongodb://localhost:27017/tabme
JWT_SECRET=your-super-secret-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Seed Demo Data
```bash
npm run seed
```

This creates:
- Demo restaurant: "The Golden Fork"
- Admin user: `admin@demo.com` / `password123`
- Staff user: `staff@demo.com` / `password123`
- 5 tables with QR codes
- 5 menu categories with 22 items
- 1 sample order

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📱 Testing the Happy Path

### Customer Flow
1. Open a QR URL in your browser (simulating a phone scan):
   - [http://localhost:3000/qr/demo-table-1](http://localhost:3000/qr/demo-table-1)
   - [http://localhost:3000/qr/demo-table-2](http://localhost:3000/qr/demo-table-2)
   
2. Browse the menu, add items to cart
3. Place an order
4. View order status page (auto-refreshes)

### Restaurant Staff Flow
1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Login with `admin@demo.com` / `password123`
3. View incoming orders in dashboard
4. Accept and update order status
5. Manage menu items and tables

## 📁 Project Structure

```
tabme-copy/
├── app/                      # Next.js App Router
│   ├── api/                  # API Route Handlers
│   │   ├── auth/            # Authentication endpoints
│   │   ├── qr/              # QR code resolution
│   │   ├── orders/          # Customer order endpoints
│   │   ├── restaurants/     # Public menu endpoint
│   │   └── restaurant/      # Protected restaurant endpoints
│   ├── login/               # Staff login page
│   ├── menu/                # Customer menu browsing
│   ├── order/               # Order tracking page
│   ├── qr/                  # QR code landing page
│   └── restaurant/          # Staff dashboard pages
├── contexts/                # React Context providers
│   ├── AuthContext.tsx     # Authentication state
│   └── CartContext.tsx     # Shopping cart state
├── lib/                     # Shared utilities
│   ├── models/             # Mongoose models
│   ├── auth.ts             # JWT utilities
│   ├── db.ts               # MongoDB connection
│   ├── validation.ts       # Zod schemas
│   └── api-response.ts     # Response helpers
├── scripts/
│   └── seed.ts             # Database seeder
├── docker-compose.yml      # MongoDB container
└── package.json
```

## 🔌 API Endpoints

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Staff login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/qr/:code` | Resolve QR code to restaurant/table |
| GET | `/api/restaurants/:id/menu` | Get restaurant menu |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/:id` | Get order details |

### Protected Endpoints (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/restaurant/orders` | List restaurant orders |
| PATCH | `/api/restaurant/orders/:id/status` | Update order status |
| GET/POST | `/api/restaurant/menu/categories` | List/Create categories |
| GET/PUT/DELETE | `/api/restaurant/menu/categories/:id` | Category CRUD |
| GET/POST | `/api/restaurant/menu/items` | List/Create items |
| GET/PUT/DELETE | `/api/restaurant/menu/items/:id` | Item CRUD |
| GET/POST | `/api/restaurant/tables` | List/Create tables |
| GET/PUT/DELETE | `/api/restaurant/tables/:id` | Table CRUD |
| POST | `/api/restaurant/tables/:id/regenerate-qr` | Regenerate QR code |

## 🗄️ Data Models

### User
- email, passwordHash, role (restaurant_admin/staff/customer), restaurantId, name

### Restaurant
- name, currency, address, phone, email, description, logoUrl, isActive

### Table
- restaurantId, name, number, qrCode (unique random string), capacity, isActive

### MenuCategory
- restaurantId, name, description, sortOrder, isActive

### MenuItem
- restaurantId, categoryId, name, description, price, imageUrl, isAvailable, sortOrder, tags, allergens

### Order
- restaurantId, tableId, status, items (with snapshots), total, notes, customerName, statusHistory

## 🔐 Authentication

The system uses JWT tokens for authentication:
- Token is returned on login
- Include in requests: `Authorization: Bearer <token>`
- Tokens expire after 7 days

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Styling**: Tailwind CSS
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Validation**: Zod
- **State Management**: React Context

## 🚀 Deployment (Vercel)

### Quick Deploy

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Vercel will auto-detect Next.js
4. Set environment variables in Vercel dashboard:
   
   | Variable | Value |
   |----------|-------|
   | `MONGODB_URI` | `mongodb+srv://tabme-test:tabme@cluster0.7so8c.mongodb.net/tabme?retryWrites=true&w=majority&appName=Cluster0` |
   | `JWT_SECRET` | `your-secure-random-string-here` |
   | `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` (update after deployment) |

5. Deploy!

### Post-Deployment

After deploying, update `NEXT_PUBLIC_BASE_URL` to your actual Vercel domain (e.g., `https://tabme-xyz.vercel.app`).

To seed data on production, run locally with the production MongoDB URI:
```bash
MONGODB_URI="your-production-uri" npm run seed
```

## 📝 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | password123 |
| Staff | staff@demo.com | password123 |

## 📱 Demo QR URLs

After seeding, use these URLs to test customer flow:

- Table 1: `/qr/demo-table-1`
- Table 2: `/qr/demo-table-2`
- Table 3: `/qr/demo-table-3`
- Patio 1: `/qr/demo-patio-1`
- VIP Room: `/qr/demo-vip`

## 🤝 Contributing

This is an MVP demo project. Feel free to fork and extend!

## 📄 License

MIT
