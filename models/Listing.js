const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  materialTitle: {
    type: String,
    required: [true, 'Please provide material title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide description'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Metals', 'Plastics', 'Paper', 'Glass', 'Electronics', 'Other']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: 0
  },
  unit: {
    type: String,
    required: [true, 'Please select a unit'],
    enum: ['kg', 'tons', 'pieces', 'liters', 'meters']
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Please provide price per unit'],
    min: 0
  },
  location: {
    type: String,
    required: [true, 'Please provide location'],
    trim: true
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'sold', 'draft', 'inactive'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

listingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Listing', listingSchema);