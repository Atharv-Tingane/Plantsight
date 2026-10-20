import { Settings } from '../models/Settings.js';

async function getOrCreateSettings() {
  let doc = await Settings.findOne({ key: 'default' });
  if (!doc) {
    doc = await Settings.create({ key: 'default' });
  }
  return doc;
}

// GET /settings/profile
export async function getProfile(req, res, next) {
  try {
    if (req.user) {
      return res.json({
        name: req.user.name,
        email: req.user.email,
        location: req.user.location,
        avatarUrl: req.user.avatarUrl,
      });
    }
    const settings = await getOrCreateSettings();
    res.json(settings.profile);
  } catch (err) {
    next(err);
  }
}

// PUT /settings/profile
export async function updateProfile(req, res, next) {
  try {
    if (req.user) {
      if (req.body.name !== undefined) req.user.name = req.body.name.trim();
      if (req.body.email !== undefined) req.user.email = req.body.email.toLowerCase().trim();
      if (req.body.location !== undefined) req.user.location = req.body.location.trim();
      if (req.body.avatarUrl !== undefined) req.user.avatarUrl = req.body.avatarUrl;
      await req.user.save();
      return res.json({
        name: req.user.name,
        email: req.user.email,
        location: req.user.location,
        avatarUrl: req.user.avatarUrl,
      });
    }

    const settings = await getOrCreateSettings();
    if (req.body.name !== undefined) settings.profile.name = req.body.name;
    if (req.body.email !== undefined) settings.profile.email = req.body.email;
    if (req.body.location !== undefined) settings.profile.location = req.body.location;
    if (req.body.avatarUrl !== undefined) settings.profile.avatarUrl = req.body.avatarUrl;

    await settings.save();
    res.json(settings.profile);
  } catch (err) {
    next(err);
  }
}

// GET /settings/preferences
export async function getPreferences(req, res, next) {
  try {
    if (req.user && req.user.preferences) {
      return res.json(req.user.preferences);
    }
    const settings = await getOrCreateSettings();
    res.json(settings.preferences);
  } catch (err) {
    next(err);
  }
}

// PUT /settings/preferences
export async function updatePreferences(req, res, next) {
  try {
    const allowed = [
      'lowSoilMoistureThreshold',
      'highTemperatureThreshold',
      'lowHumidityThreshold',
      'lowLightThreshold',
      'diseaseAlertsEnabled',
      'emailNotifications',
      'measurementUnit',
    ];

    if (req.user) {
      if (!req.user.preferences) req.user.preferences = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          req.user.preferences[key] = req.body[key];
        }
      }
      await req.user.save();
      return res.json(req.user.preferences);
    }

    const settings = await getOrCreateSettings();
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        settings.preferences[key] = req.body[key];
      }
    }

    await settings.save();
    res.json(settings.preferences);
  } catch (err) {
    next(err);
  }
}
