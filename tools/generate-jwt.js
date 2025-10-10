#!/usr/bin/env node

/**
 * JWT Token Generator for responsive-tiles integration
 * Usage: node tools/generate-jwt.js [userId] [partnerId] [expirationMinutes]
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-minimum-32-chars';

// Parse command line arguments
const userId = process.argv[2] || '426';
const partnerId = process.argv[3] || '303';
const expirationMinutes = parseInt(process.argv[4]) || 60 * 24; // Default 24 hours

// Calculate timestamps
const iat = Math.floor(Date.now() / 1000);
const exp = iat + (60 * expirationMinutes);

// Create token payload (responsive-tiles format)
const payload = {
  // responsive-tiles format
  sub: userId,         // Subject (user ID)
  iss: partnerId,      // Issuer (partner ID)
  aud: 'localhost',    // Audience

  // Standard format (for compatibility)
  userId: userId,
  partnerId: partnerId,

  // Optional user info
  email: `user${userId}@example.com`,

  // Timestamps
  iat: iat,
  exp: exp
};

// Generate token
const token = jwt.sign(payload, JWT_SECRET);

// Calculate expiration date
const expirationDate = new Date(exp * 1000);

// Output results
console.log('\n=== JWT Token Generated ===\n');
console.log('Token:');
console.log(token);
console.log('\n--- Token Details ---');
console.log('User ID:', userId);
console.log('Partner ID:', partnerId);
console.log('Issued At:', new Date(iat * 1000).toISOString());
console.log('Expires At:', expirationDate.toISOString());
console.log('Valid For:', expirationMinutes, 'minutes');
console.log('\n--- Usage Examples ---');
console.log('\nCurl:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v2/users/${userId}/accounts`);
console.log('\nEnvironment Variable:');
console.log(`export JWT_TOKEN="${token}"`);
console.log('\nResponsive Tiles (in browser console):');
console.log(`global.geezeo._auth.jwt = "${token}"`);
console.log('\n======================\n');
