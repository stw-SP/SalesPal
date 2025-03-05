require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salespal')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['employee', 'manager', 'admin'], default: 'employee' },
  storeLocation: String,
  hireDate: Date,
  commissionRate: Number
});

const SaleSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  customerName: { type: String, required: true },
  phoneNumber: String,
  products: [{
    name: String,
    quantity: Number,
    price: Number,
    plan: String,
    accessories: [String]
  }],
  totalAmount: { type: Number, required: true },
  commission: { type: Number, required: true },
  receiptImage: String,
  invoicePdf: String,
  storeLocation: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Sale = mongoose.model('Sale', SaleSchema);

// Function to seed users
const seedUsers = async () => {
  try {
    // Delete existing users
    await User.deleteMany({});
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'Admin User',
      email: 'admin@salespal.com',
      password: adminPassword,
      role: 'admin',
      storeLocation: 'Main Store',
      hireDate: new Date('2020-01-01'),
      commissionRate: 15
    });
    
    // Create demo employee
    const employeePassword = await bcrypt.hash('employee123', 10);
    const employee = new User({
      name: 'Demo Employee',
      email: 'demo@salespal.com',
      password: employeePassword,
      role: 'employee',
      storeLocation: 'Downtown',
      hireDate: new Date('2021-05-15'),
      commissionRate: 10
    });
    
    await admin.save();
    await employee.save();
    
    console.log('Users seeded successfully');
    return { admin, employee };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

// Function to seed sales
const seedSales = async (users) => {
  try {
    // Delete existing sales
    await Sale.deleteMany({});
    
    // Generate sample sales data
    const { employee } = users;
    const currentDate = new Date();
    const salesData = [];
    
    // Generate sales for the last 30 days
    for (let i = 0; i < 30; i++) {
      const saleDate = new Date(currentDate);
      saleDate.setDate(currentDate.getDate() - i);
      
      // Some days might have multiple sales
      const salesCount = Math.floor(Math.random() * 3); // 0 to 2 sales per day
      
      for (let j = 0; j <= salesCount; j++) {
        // Generate random products for this sale
        const productCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 products
        const products = [];
        let saleTotal = 0;
        
        for (let k = 0; k < productCount; k++) {
          const productTemplates = [
            { name: 'iPhone 15', price: 899.99, plan: 'Premium' },
            { name: 'Samsung Galaxy S24', price: 799.99, plan: 'Standard' },
            { name: 'Google Pixel 8', price: 699.99, plan: 'Basic' },
            { name: 'Wireless Earbuds', price: 99.99, plan: '' },
            { name: 'Phone Case', price: 29.99, plan: '' },
            { name: 'Screen Protector', price: 19.99, plan: '' },
            { name: 'iPad Pro', price: 999.99, plan: 'Family' },
            { name: 'Wireless Charger', price: 49.99, plan: '' }
          ];
          
          const randomProduct = productTemplates[Math.floor(Math.random() * productTemplates.length)];
          const quantity = Math.floor(Math.random() * 2) + 1; // 1 or 2
          
          const accessoriesOptions = ['Case', 'Screen Protector', 'Charger', 'Headphones'];
          const accessories = [];
          
          // Randomly add accessories for phones
          if (randomProduct.name.includes('iPhone') || randomProduct.name.includes('Samsung') || randomProduct.name.includes('Pixel')) {
            const accessoryCount = Math.floor(Math.random() * 3); // 0 to 2 accessories
            for (let l = 0; l < accessoryCount; l++) {
              const accessory = accessoriesOptions[Math.floor(Math.random() * accessoriesOptions.length)];
              if (!accessories.includes(accessory)) {
                accessories.push(accessory);
              }
            }
          }
          
          const product = {
            name: randomProduct.name,
            quantity,
            price: randomProduct.price,
            plan: randomProduct.plan,
            accessories
          };
          
          products.push(product);
          saleTotal += product.price * quantity;
        }
        
        // Calculate commission
        const commission = saleTotal * (employee.commissionRate / 100);
        
        // Generate customer information
        const customers = [
          { name: 'John Smith', phone: '555-123-4567' },
          { name: 'Sarah Johnson', phone: '555-987-6543' },
          { name: 'Michael Brown', phone: '555-456-7890' },
          { name: 'Emily Davis', phone: '555-321-6547' },
          { name: 'David Wilson', phone: '555-789-1234' }
        ];
        
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        
        // Create sale
        const sale = new Sale({
          employee: employee._id,
          date: saleDate,
          customerName: randomCustomer.name,
          phoneNumber: randomCustomer.phone,
          products,
          totalAmount: saleTotal,
          commission,
          storeLocation: employee.storeLocation
        });
        
        salesData.push(sale);
      }
    }
    
    // Save all sales
    await Sale.insertMany(salesData);
    
    console.log(`${salesData.length} sales seeded successfully`);
  } catch (error) {
    console.error('Error seeding sales:', error);
    throw error;
  }
};

// Run the seed functions
const seedDatabase = async () => {
  try {
    const users = await seedUsers();
    await seedSales(users);
    console.log('Database seeded successfully');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedDatabase();