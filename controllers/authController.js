const User = require('../models/User');
const jwt = require('jsonwebtoken');

console.log('🔍 Auth Controller loaded');

// Generate JWT Token
const generateToken = (userId, email) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Signup
exports.signup = async (req, res) => {
  try {
    console.log('📝 Signup attempt:', { name: req.body.name, email: req.body.email });
    
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    console.log('✅ All fields provided');

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    console.log('✅ User does not exist, creating new user...');

    // Validate password length
    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Create new user
    console.log('🔨 Creating new user...');
    const user = new User({ name, email, password });
    
    console.log('💾 Saving user to database...');
    await user.save();
    console.log('✅ User saved successfully');

    // Generate token
    console.log('🔑 Generating JWT token...');
    const token = generateToken(user._id, user.email);
    console.log('✅ Token generated');

    console.log('✅ Signup successful!');
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌❌❌ SIGNUP ERROR ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error during signup', 
      error: error.message,
      details: error.stack
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email });
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password incorrect');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.email);
    console.log('✅ Login successful');

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
