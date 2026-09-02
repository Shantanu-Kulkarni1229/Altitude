const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema({
  addOnId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['gear', 'insurance', 'guide', 'transport'] 
  },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AddOn', addOnSchema);
