const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/listings
// @desc    Get all listings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, category, seller } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (seller) query.seller = seller;

    const listings = await Listing.find(query)
      .populate('seller', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/listings/my-listings
// @desc    Get current seller's listings
// @access  Private (Seller)
router.get('/my-listings', protect, authorize('seller', 'admin'), async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/listings/:id
// @desc    Get single listing
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'name email phone address');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Increment views
    listing.views += 1;
    await listing.save();

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Listing not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/listings
// @desc    Create new listing
// @access  Private (Seller only)
router.post('/', 
  protect,
  authorize('seller', 'admin'),
  upload.array('images', 5),
  async (req, res) => {
    try {
      const {
        materialTitle,
        description,
        category,
        quantity,
        unit,
        pricePerUnit,
        location,
        status
      } = req.body;

      // Validate required fields
      if (!materialTitle || !description || !category || !quantity || !unit || !pricePerUnit || !location) {
        return res.status(400).json({ message: 'Please provide all required fields' });
      }

      // Get uploaded file paths
      const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

      const listing = await Listing.create({
        seller: req.user._id,
        materialTitle,
        description,
        category,
        quantity: Number(quantity),
        unit,
        pricePerUnit: Number(pricePerUnit),
        location,
        images,
        status: status || 'active'
      });

      const populatedListing = await Listing.findById(listing._id)
        .populate('seller', 'name email phone');

      res.status(201).json({
        success: true,
        data: populatedListing
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/listings/:id
// @desc    Update listing
// @access  Private (Seller/Admin)
router.put('/:id', 
  protect,
  authorize('seller', 'admin'),
  upload.array('images', 5),
  async (req, res) => {
    try {
      let listing = await Listing.findById(req.params.id);

      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' });
      }

      // Check ownership (unless admin)
      if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this listing' });
      }

      const {
        materialTitle,
        description,
        category,
        quantity,
        unit,
        pricePerUnit,
        location,
        status
      } = req.body;

      // Update fields
      if (materialTitle) listing.materialTitle = materialTitle;
      if (description) listing.description = description;
      if (category) listing.category = category;
      if (quantity) listing.quantity = quantity;
      if (unit) listing.unit = unit;
      if (pricePerUnit) listing.pricePerUnit = pricePerUnit;
      if (location) listing.location = location;
      if (status) listing.status = status;

      // Add new images if uploaded
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `/uploads/${file.filename}`);
        listing.images = [...listing.images, ...newImages];
      }

      await listing.save();

      const updatedListing = await Listing.findById(listing._id)
        .populate('seller', 'name email phone');

      res.json({
        success: true,
        data: updatedListing
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   DELETE /api/listings/:id
// @desc    Delete listing
// @access  Private (Seller/Admin)
router.delete('/:id', protect, authorize('seller', 'admin'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check ownership (unless admin)
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await listing.deleteOne();

    res.json({ 
      success: true,
      message: 'Listing removed' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
