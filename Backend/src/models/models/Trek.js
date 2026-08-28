const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  day: Number,
  title: String,
  details: String
}, { _id: false });

const trekSchema = new mongoose.Schema({
  trekId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  region: { type: String, required: true },
  difficulty: { 
    type: String, 
    required: true,
    enum: ['easy', 'moderate', 'hard', 'extreme'] 
  },
  minFitnessLevel: { type: Number, required: true }, // Scale 1-10
  basePrice: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  description: { type: String, required: true },
  coverPhoto: { type: String, required: true },
  highlights: [String],
  itinerary: [itinerarySchema],
  maxAltitude: String,
  trekDistance: String
}, { timestamps: true });

module.exports = mongoose.model('Trek', trekSchema);
