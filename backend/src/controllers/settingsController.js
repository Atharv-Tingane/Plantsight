import { Settings } from '../models/Settings.js';

async function getOrCreateSettings() {
  let doc = await Settings.findOne({ key: 'default' });
  if (!doc) {
    doc = await Settings.create({ key: 'default' });
  }
  return doc;
}

// GET /settings/profile
export async function getProfile(_req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings.profile);
  } catch (err) {
    next(err);
  }
}

// PUT /settings/profile
export async function updateProfile(req, res, next) {
  try {
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
export async function getPreferences(_req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings.preferences);
  } catch (err) {
    next(err);
  }
}

// PUT /settings/preferences
export async function updatePreferences(req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    const allowed = [
      'lowSoilMoistureThreshold',
      'highTemperatureThreshold',
      'lowHumidityThreshold',
      'lowLightThreshold',
      'diseaseAlertsEnabled',
      'emailNotifications',
      'measurementUnit',
    ];

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
