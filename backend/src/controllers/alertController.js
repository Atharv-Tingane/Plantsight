import { Alert } from '../models/Alert.js';

// GET /alerts
export async function listAlerts(req, res, next) {
  try {
    const { unacknowledgedOnly } = req.query;
    const query = {};

    if (unacknowledgedOnly === 'true' || unacknowledgedOnly === true) {
      query.acknowledged = false;
    }

    const alerts = await Alert.find(query).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
}

// POST /alerts/:id/acknowledge
export async function acknowledgeAlert(req, res, next) {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ status: 'error', message: 'Alert not found' });
    }

    res.json(alert);
  } catch (err) {
    next(err);
  }
}

// POST /alerts (Create manual alert)
export async function createAlert(req, res, next) {
  try {
    const { plantId, plantName, severity, category, title, message } = req.body;

    if (!plantId || !title || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'plantId, category, and title are required.',
      });
    }

    const alert = await Alert.create({
      plantId,
      plantName: plantName || 'Plant',
      severity: severity || 'medium',
      category,
      title,
      message: message || '',
      acknowledged: false,
    });

    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
}
