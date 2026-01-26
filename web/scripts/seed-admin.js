const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.resolve(__dirname, '../../db.json');

async function seedAdmin() {
  try {
    let db = { users: [] };
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    }

    if (!db.users) {
      db.users = [];
    }

    const adminExists = db.users.find(u => u.username === 'admin');
    if (adminExists) {
      console.log('Admin user already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      id: 'admin_' + Date.now(),
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      phone: '13800000000',
      role: 'admin',
      created_at: new Date().toISOString()
    };

    db.users.push(adminUser);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log('Admin user created successfully.');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}

seedAdmin();
