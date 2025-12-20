#!/usr/bin/env node
/**
 * Admin User Creation Script
 * 
 * Usage:
 *   node server/scripts/createAdmin.js <email> <password> [username]
 * 
 * Examples:
 *   node server/scripts/createAdmin.js admin@crowdbeat.com secretpassword
 *   node server/scripts/createAdmin.js admin@crowdbeat.com secretpassword adminuser
 * 
 * This script can also be used to promote an existing user to admin:
 *   node server/scripts/createAdmin.js --promote user@example.com
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const config = require('../config');

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function createAdmin(email, password, username) {
  // Generate username from email if not provided
  if (!username) {
    username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  });

  if (existingUser) {
    if (existingUser.email === email) {
      // Update existing user to admin
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`✓ Updated existing user "${existingUser.username}" to admin role`);
      return existingUser;
    } else {
      // Username conflict
      console.error(`✗ Username "${username}" is already taken`);
      process.exit(1);
    }
  }

  // Create new admin user
  const adminUser = new User({
    email,
    password,
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    role: 'admin',
    emailVerified: true, // Admin accounts are pre-verified
  });

  await adminUser.save();
  console.log(`✓ Created new admin user:`);
  console.log(`  Email: ${email}`);
  console.log(`  Username: ${username}`);
  console.log(`  Role: admin`);
  
  return adminUser;
}

async function promoteUser(email) {
  const user = await User.findOne({ email });
  
  if (!user) {
    console.error(`✗ User with email "${email}" not found`);
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`ℹ User "${user.username}" is already an admin`);
    return user;
  }

  const previousRole = user.role;
  user.role = 'admin';
  await user.save();

  console.log(`✓ Promoted user "${user.username}" from ${previousRole} to admin`);
  return user;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Admin User Creation Script
--------------------------

Usage:
  Create new admin:
    node server/scripts/createAdmin.js <email> <password> [username]

  Promote existing user:
    node server/scripts/createAdmin.js --promote <email>

Examples:
  node server/scripts/createAdmin.js admin@crowdbeat.com mypassword123
  node server/scripts/createAdmin.js admin@crowdbeat.com mypassword123 superadmin
  node server/scripts/createAdmin.js --promote user@example.com
`);
    process.exit(0);
  }

  await connectDB();

  try {
    if (args[0] === '--promote') {
      if (!args[1]) {
        console.error('✗ Please provide an email address to promote');
        process.exit(1);
      }
      await promoteUser(args[1]);
    } else {
      const email = args[0];
      const password = args[1];
      const username = args[2];

      if (!email || !password) {
        console.error('✗ Please provide both email and password');
        console.error('  Usage: node server/scripts/createAdmin.js <email> <password> [username]');
        process.exit(1);
      }

      if (password.length < 8) {
        console.error('✗ Password must be at least 8 characters');
        process.exit(1);
      }

      await createAdmin(email, password, username);
    }

    console.log('\n✓ Done!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();

