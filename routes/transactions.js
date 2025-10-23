const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get all transactions (admin) or user's transactions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'buyer') {
      query.buyer = req.user._id;
    } else if (req.user.role === 'seller') {
      query.seller = req.user._id;
    }
    // Admin can see all transactions

    const transactions = await Transaction.find(query)
      .populate('listing', 'materialTitle category')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('listing')
      .populate('buyer', 'name email phone address')
      .populate('seller', 'name email phone address');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check authorization
    if (
      req.user.role !== 'admin' &&
      transaction.buyer._id.toString() !== req.user._id.toString() &&
      transaction.seller._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this transaction' });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/transactions
// @desc    Create new transaction (Place order)
// @access  Private (Buyer)
router.post('/', protect, authorize('buyer', 'admin'), async (req, res) => {
  try {
    const { listingId, quantity, deliveryAddress, notes } = req.body;

    // Validate
    if (!listingId || !quantity || !deliveryAddress) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Get listing
    const listing = await Listing.findById(listingId).populate('seller');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check if listing is active
    if (listing.status !== 'active') {
      return res.status(400).json({ message: 'This listing is not available' });
    }

    // Check if enough quantity available
    if (listing.quantity < quantity) {
      return res.status(400).json({ 
        message: `Only ${listing.quantity} units available` 
      });
    }

    // Calculate total price
    const totalPrice = listing.pricePerUnit * quantity;

    // Create transaction
    const transaction = await Transaction.create({
      listing: listingId,
      buyer: req.user._id,
      seller: listing.seller._id,
      quantity,
      totalPrice,
      deliveryAddress,
      notes: notes || '',
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Update listing quantity
    listing.quantity -= quantity;
    if (listing.quantity === 0) {
      listing.status = 'sold';
    }
    await listing.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('listing', 'materialTitle category')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone');

    res.status(201).json({
      success: true,
      data: populatedTransaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/transactions/:id/status
// @desc    Update transaction status
// @access  Private (Seller/Admin)
router.put('/:id/status', protect, authorize('seller', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Please provide status' });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user is the seller (unless admin)
    if (transaction.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this transaction' });
    }

    transaction.status = status;
    await transaction.save();

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('listing', 'materialTitle category')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone');

    res.json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/transactions/:id/payment
// @desc    Update payment status
// @access  Private (Admin)
router.put('/:id/payment', protect, authorize('admin'), async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({ message: 'Please provide payment status' });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.paymentStatus = paymentStatus;
    await transaction.save();

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('listing', 'materialTitle category')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone');

    res.json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Cancel transaction
// @access  Private (Buyer/Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Only buyer or admin can cancel
    if (transaction.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this transaction' });
    }

    // Can only cancel if pending
    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending transactions' });
    }

    // Restore listing quantity
    const listing = await Listing.findById(transaction.listing);
    if (listing) {
      listing.quantity += transaction.quantity;
      if (listing.status === 'sold') {
        listing.status = 'active';
      }
      await listing.save();
    }

    transaction.status = 'cancelled';
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction cancelled'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/transactions/stats/seller
// @desc    Get seller statistics
// @access  Private (Seller)
router.get('/stats/seller', protect, authorize('seller'), async (req, res) => {
  try {
    const transactions = await Transaction.find({ seller: req.user._id });

    const stats = {
      totalSales: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.totalPrice, 0),
      pendingOrders: transactions.filter(t => t.status === 'pending').length,
      completedOrders: transactions.filter(t => t.status === 'delivered').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/transactions/stats/buyer
// @desc    Get buyer statistics
// @access  Private (Buyer)
router.get('/stats/buyer', protect, authorize('buyer'), async (req, res) => {
  try {
    const transactions = await Transaction.find({ buyer: req.user._id });

    const stats = {
      totalOrders: transactions.length,
      totalSpent: transactions.reduce((sum, t) => sum + t.totalPrice, 0),
      activeOrders: transactions.filter(t => ['pending', 'confirmed', 'processing', 'shipped'].includes(t.status)).length,
      completedOrders: transactions.filter(t => t.status === 'delivered').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;