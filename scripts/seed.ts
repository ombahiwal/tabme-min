import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tabme';

// Schemas (inline to avoid module resolution issues in script)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['restaurant_admin', 'staff', 'customer'], default: 'customer' },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  name: { type: String, required: true },
}, { timestamps: true });

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  currency: { type: String, default: 'USD' },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  description: String,
  logoUrl: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const TableSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  number: { type: Number, required: true },
  code: { type: String, required: true, lowercase: true },
  qrCode: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  capacity: { type: Number, default: 4 },
}, { timestamps: true });

TableSchema.index({ restaurantId: 1, code: 1 }, { unique: true });

const MenuCategorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  description: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const MenuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  imageUrl: String,
  isAvailable: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  tags: [String],
  allergens: [String],
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  status: { 
    type: String, 
    enum: ['created', 'accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
    default: 'created'
  },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    nameSnapshot: String,
    priceSnapshot: Number,
    quantity: Number,
    notes: String,
  }],
  total: { type: Number, required: true, min: 0 },
  notes: String,
  customerName: String,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],
}, { timestamps: true });

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get or create models
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
    const Table = mongoose.models.Table || mongoose.model('Table', TableSchema);
    const MenuCategory = mongoose.models.MenuCategory || mongoose.model('MenuCategory', MenuCategorySchema);
    const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
    const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      Table.deleteMany({}),
      MenuCategory.deleteMany({}),
      MenuItem.deleteMany({}),
      Order.deleteMany({}),
    ]);
    console.log('✅ Cleared existing data\n');

    // Create restaurant
    console.log('🏪 Creating demo restaurant...');
    const restaurant = await Restaurant.create({
      name: 'The Golden Fork',
      slug: 'the-golden-fork',
      currency: 'USD',
      address: '123 Main Street, Foodville, CA 90210',
      phone: '(555) 123-4567',
      email: 'info@goldenfork.demo',
      description: 'A cozy restaurant serving delicious food with QR ordering',
      isActive: true,
    });
    console.log(`✅ Created restaurant: ${restaurant.name}\n`);

    // Create admin user
    console.log('👤 Creating admin user...');
    const passwordHash = await bcrypt.hash('password123', 12);
    const admin = await User.create({
      email: 'admin@demo.com',
      passwordHash,
      role: 'restaurant_admin',
      restaurantId: restaurant._id,
      name: 'Demo Admin',
    });
    console.log(`✅ Created admin: ${admin.email}\n`);

    // Create staff user
    console.log('👤 Creating staff user...');
    const staff = await User.create({
      email: 'staff@demo.com',
      passwordHash,
      role: 'staff',
      restaurantId: restaurant._id,
      name: 'Demo Staff',
    });
    console.log(`✅ Created staff: ${staff.email}\n`);

    // Create tables with QR codes
    console.log('🪑 Creating tables...');
    const tableData = [
      { name: 'Table 1', number: 1, code: 'table-1', qrCode: 'demo-table-1', capacity: 4 },
      { name: 'Table 2', number: 2, code: 'table-2', qrCode: 'demo-table-2', capacity: 4 },
      { name: 'Table 3', number: 3, code: 'table-3', qrCode: 'demo-table-3', capacity: 2 },
      { name: 'Patio 1', number: 4, code: 'patio-1', qrCode: 'demo-patio-1', capacity: 6 },
      { name: 'VIP Room', number: 5, code: 'vip', qrCode: 'demo-vip', capacity: 8 },
    ];

    const tables = await Table.insertMany(
      tableData.map(t => ({ ...t, restaurantId: restaurant._id, isActive: true }))
    );
    console.log(`✅ Created ${tables.length} tables\n`);

    // Create menu categories
    console.log('📁 Creating menu categories...');
    const categories = await MenuCategory.insertMany([
      { restaurantId: restaurant._id, name: 'Appetizers', sortOrder: 1, isActive: true },
      { restaurantId: restaurant._id, name: 'Main Courses', sortOrder: 2, isActive: true },
      { restaurantId: restaurant._id, name: 'Pizzas', sortOrder: 3, isActive: true },
      { restaurantId: restaurant._id, name: 'Desserts', sortOrder: 4, isActive: true },
      { restaurantId: restaurant._id, name: 'Beverages', sortOrder: 5, isActive: true },
    ]);
    console.log(`✅ Created ${categories.length} categories\n`);

    // Create menu items
    console.log('🍔 Creating menu items...');
    const menuItems = [
      // Appetizers
      { categoryId: categories[0]._id, name: 'Caesar Salad', description: 'Fresh romaine lettuce with parmesan and croutons', price: 9.99, tags: ['Popular', 'Vegetarian'], allergens: ['Dairy', 'Gluten'] },
      { categoryId: categories[0]._id, name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 5.99, tags: ['Vegetarian'], allergens: ['Gluten', 'Dairy'] },
      { categoryId: categories[0]._id, name: 'Chicken Wings', description: '8 pieces with your choice of sauce', price: 12.99, tags: ['Spicy', 'Popular'] },
      { categoryId: categories[0]._id, name: 'Soup of the Day', description: 'Ask your server for today\'s selection', price: 6.99 },
      
      // Main Courses
      { categoryId: categories[1]._id, name: 'Grilled Salmon', description: 'Atlantic salmon with seasonal vegetables', price: 24.99, tags: ['Healthy', 'Popular'], allergens: ['Fish'] },
      { categoryId: categories[1]._id, name: 'Ribeye Steak', description: '12oz USDA Prime with mashed potatoes', price: 32.99, tags: ['Popular'] },
      { categoryId: categories[1]._id, name: 'Chicken Parmesan', description: 'Breaded chicken with marinara and mozzarella', price: 18.99, allergens: ['Dairy', 'Gluten'] },
      { categoryId: categories[1]._id, name: 'Veggie Burger', description: 'House-made patty with all the fixings', price: 14.99, tags: ['Vegetarian'], allergens: ['Gluten'] },
      { categoryId: categories[1]._id, name: 'Pasta Carbonara', description: 'Creamy pasta with bacon and parmesan', price: 16.99, allergens: ['Dairy', 'Gluten', 'Eggs'] },
      
      // Pizzas
      { categoryId: categories[2]._id, name: 'Margherita', description: 'Tomato sauce, mozzarella, fresh basil', price: 15.99, tags: ['Vegetarian', 'Classic'], allergens: ['Dairy', 'Gluten'] },
      { categoryId: categories[2]._id, name: 'Pepperoni', description: 'Classic pepperoni with mozzarella', price: 17.99, tags: ['Popular'], allergens: ['Dairy', 'Gluten'] },
      { categoryId: categories[2]._id, name: 'BBQ Chicken', description: 'Grilled chicken, BBQ sauce, red onions', price: 18.99, allergens: ['Dairy', 'Gluten'] },
      { categoryId: categories[2]._id, name: 'Veggie Supreme', description: 'Bell peppers, mushrooms, olives, onions', price: 16.99, tags: ['Vegetarian'], allergens: ['Dairy', 'Gluten'] },
      
      // Desserts
      { categoryId: categories[3]._id, name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 8.99, tags: ['Popular'], allergens: ['Dairy', 'Gluten', 'Eggs'] },
      { categoryId: categories[3]._id, name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 7.99, allergens: ['Dairy', 'Eggs'] },
      { categoryId: categories[3]._id, name: 'Ice Cream Sundae', description: 'Three scoops with toppings', price: 6.99, allergens: ['Dairy'] },
      { categoryId: categories[3]._id, name: 'Cheesecake', description: 'New York style with berry compote', price: 8.99, allergens: ['Dairy', 'Gluten', 'Eggs'] },
      
      // Beverages
      { categoryId: categories[4]._id, name: 'Fresh Lemonade', description: 'House-made with fresh lemons', price: 3.99 },
      { categoryId: categories[4]._id, name: 'Iced Tea', description: 'Unsweetened or sweetened', price: 2.99 },
      { categoryId: categories[4]._id, name: 'Coffee', description: 'Regular or decaf', price: 2.99 },
      { categoryId: categories[4]._id, name: 'Soft Drinks', description: 'Coke, Sprite, Fanta, etc.', price: 2.49 },
      { categoryId: categories[4]._id, name: 'Craft Beer', description: 'Ask for today\'s selection', price: 6.99, tags: ['21+'] },
    ];

    const items = await MenuItem.insertMany(
      menuItems.map((item, idx) => ({
        ...item,
        restaurantId: restaurant._id,
        sortOrder: idx,
        isAvailable: true,
      }))
    );
    console.log(`✅ Created ${items.length} menu items\n`);

    // Create a sample order
    console.log('📋 Creating sample order...');
    const sampleOrder = await Order.create({
      restaurantId: restaurant._id,
      tableId: tables[0]._id,
      status: 'preparing',
      items: [
        { menuItemId: items[0]._id, nameSnapshot: items[0].name, priceSnapshot: items[0].price, quantity: 1 },
        { menuItemId: items[5]._id, nameSnapshot: items[5].name, priceSnapshot: items[5].price, quantity: 2 },
        { menuItemId: items[18]._id, nameSnapshot: items[18].name, priceSnapshot: items[18].price, quantity: 2 },
      ],
      total: items[0].price + (items[5].price * 2) + (items[18].price * 2),
      customerName: 'John Doe',
      notes: 'No onions please',
      statusHistory: [
        { status: 'created', timestamp: new Date(Date.now() - 30 * 60000) },
        { status: 'accepted', timestamp: new Date(Date.now() - 25 * 60000) },
        { status: 'preparing', timestamp: new Date(Date.now() - 20 * 60000) },
      ],
    });
    console.log(`✅ Created sample order\n`);

    // Summary
    console.log('═'.repeat(50));
    console.log('🎉 SEED COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   • 1 Restaurant: ${restaurant.name}`);
    console.log(`   • 2 Users (admin + staff)`);
    console.log(`   • ${tables.length} Tables with QR codes`);
    console.log(`   • ${categories.length} Menu Categories`);
    console.log(`   • ${items.length} Menu Items`);
    console.log(`   • 1 Sample Order\n`);
    
    console.log('🔐 Login Credentials:');
    console.log('   Admin: admin@demo.com / password123');
    console.log('   Staff: staff@demo.com / password123\n');
    
    console.log('📱 Demo QR URLs:');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    tables.forEach(table => {
      console.log(`   ${table.name}: ${baseUrl}/qr/${table.qrCode}`);
      console.log(`      Alias: ${baseUrl}/r/${restaurant.slug}/${table.code}`);
    });
    console.log('\n═'.repeat(50));

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

seed();
