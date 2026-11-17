const express = require('express');
const router = express.Router();
const { requireAuth, getAuthenticatedUserId } = require('../middleware/auth');
const portfolioStore = require('../services/portfolioStore');
const marketDataEngine = require('../services/realtime/marketDataEngine');

// @route   GET /api/alerts
// @desc    Get user's price alerts
// @access  Protected
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const alerts = await portfolioStore.getPriceAlerts(userId);
    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   POST /api/alerts
// @desc    Create a new price alert rule
// @access  Protected
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { symbol, targetPrice, condition, thresholdPercent, companyName } = req.body;

    if (!symbol || !targetPrice) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and targetPrice are required.',
      });
    }

    const alert = await portfolioStore.createPriceAlert(userId, {
      symbol,
      targetPrice,
      condition: condition || 'ABOVE',
      thresholdPercent,
      companyName,
    });

    res.status(201).json({
      success: true,
      message: 'Price alert created successfully.',
      data: alert,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete a price alert
// @access  Protected
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;
    const deleted = await portfolioStore.deletePriceAlert(userId, id);

    res.status(200).json({
      success: true,
      deleted,
      message: 'Price alert deleted successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
