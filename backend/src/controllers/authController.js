import { User } from '../models/User.js';
import { Plant } from '../models/Plant.js';
import { generateToken } from '../middleware/authMiddleware.js';

// POST /api/auth/signup
export async function signup(req, res, next) {
  try {
    const { name, email, password, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      location: location ? location.trim() : '',
    });

    // Check if there are existing unassigned plants in database
    // If so, seamlessly associate them with this first registered account
    const unassignedCount = await Plant.countDocuments({
      $or: [{ userId: { $exists: false } }, { userId: null }],
    });
    if (unassignedCount > 0) {
      await Plant.updateMany(
        { $or: [{ userId: { $exists: false } }, { userId: null }] },
        { $set: { userId: user._id } }
      );
      console.log(`[Auth] Associated ${unassignedCount} existing starter plants with new user '${user.name}'.`);
    }

    const token = generateToken(user._id.toString());

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user and explicitly select password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id.toString());

    // Convert to plain object to omit password
    const userJson = user.toJSON();

    res.json({
      status: 'success',
      message: 'Logged in successfully.',
      token,
      user: userJson,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me (Protected)
export async function getMe(req, res, next) {
  try {
    res.json({
      status: 'success',
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/profile (Protected)
export async function updateProfile(req, res, next) {
  try {
    const { name, location, avatarUrl, preferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    if (name !== undefined) user.name = name.trim();
    if (location !== undefined) user.location = location.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (preferences && typeof preferences === 'object') {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    res.json({
      status: 'success',
      message: 'Profile updated successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
}
