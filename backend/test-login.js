// Test the login functionality
require('dotenv').config();
const bcrypt = require('bcrypt');

// This replicates the same logic that's in the server.js file
const inMemoryDB = {
  users: [
    {
      _id: '1',
      name: 'Demo Employee',
      email: 'demo@salespal.com',
      password: '$2b$10$ksMzcZwOhjYANky6xSDsV.eH9WfJWN/FMEGTer8zGNr6Kkmh2p9zG', // hashed 'demo123'
      role: 'employee',
      storeLocation: 'Downtown',
      hireDate: new Date('2021-05-15'),
      commissionRate: 10
    },
    {
      _id: '2',
      name: 'Admin User',
      email: 'admin@salespal.com',
      password: '$2b$10$ksMzcZwOhjYANky6xSDsV.eH9WfJWN/FMEGTer8zGNr6Kkmh2p9zG', // hashed 'demo123'
      role: 'admin',
      storeLocation: 'Main Store',
      hireDate: new Date('2020-01-01'),
      commissionRate: 15
    }
  ]
};

async function testLogin() {
  try {
    // Hard-code the same credentials
    const email = 'admin@salespal.com';
    const password = 'demo123';
    
    console.log(`Testing login with: ${email} / ${password}`);
    
    // Find user
    const user = inMemoryDB.users.find(user => user.email === email);
    if (!user) {
      console.error('User not found!');
      return;
    }
    
    console.log('User found:', user.name, user.role);
    
    // Test password match
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('Password hash in DB:', user.password);
      
      // Generate hash for the provided password to compare
      const newHash = await bcrypt.hash(password, 10);
      console.log('Generated hash for same password:', newHash);
    }
    
    console.log('\nLet\'s try the reverse - login with: demo@salespal.com / demo123');
    
    // Test the other user
    const demoUser = inMemoryDB.users.find(user => user.email === 'demo@salespal.com');
    if (!demoUser) {
      console.error('Demo user not found!');
      return;
    }
    
    console.log('Demo user found:', demoUser.name, demoUser.role);
    
    // Test password match
    const isDemoMatch = await bcrypt.compare('demo123', demoUser.password);
    console.log('Demo password match:', isDemoMatch);
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testLogin();