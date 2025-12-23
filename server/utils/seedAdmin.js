const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/database');

const seedAdmin = async () => {
  try {
    // Ensure database connection
    await connectDatabase();
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@crowdbeat.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    
    // Check if admin exists
    let admin = await User.findOne({ email: adminEmail });
    
    if (admin) {
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        admin.userType = 'creator';
        await admin.save();
        console.log('✅ Existing user upgraded to admin');
      } else {
        console.log('ℹ️  Admin user already exists');
      }
      return admin;
    }
    
    // Create new admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    admin = new User({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      displayName: 'Administrator',
      role: 'admin',
      userType: 'creator',
      emailVerified: true,
      isActive: true,
      reputation: {
        level: 'diamond',
        score: 10000
      },
      stats: {
        sessionsCreated: 0,
        sessionsHosted: 0,
        sessionsAttended: 0,
        lyricsAccepted: 0,
        lyricsWon: 0,
        stemsAccepted: 0,
        votesCast: 0,
        feedbackSubmitted: 0,
        tipsSent: 0,
        tipsReceived: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalTimeSpent: 0
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          sessionReminders: true,
          newMessages: true,
          newFeatures: true
        },
        privacy: {
          showEmail: false,
          showActivity: true,
          showStats: true
        },
        audio: {
          inputDevice: 'default',
          outputDevice: 'default',
          inputVolume: 80,
          outputVolume: 80,
          noiseSuppression: true,
          echoCancellation: true
        }
      },
      socialLinks: {},
      lastActive: new Date(),
      lastLogin: new Date()
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    return admin;
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  } finally {
    // Close the connection if we're done
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
};

// If this file is run directly (not required)
if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Failed to seed admin:', error);
      process.exit(1);
    });
}

module.exports = seedAdmin;
        tipsReceived: 0,
        competitionsWon: 0
      }
    });
    
    console.log('✅ Admin user created successfully');
    return admin;
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  }
};

module.exports = seedAdmin;
