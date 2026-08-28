const Trek = require('../models/Trek');
const Batch = require('../models/Batch');
const AddOn = require('../models/AddOn');

exports.getTreks = async (req, res) => {
  const { difficulty, region, minPrice, maxPrice } = req.query;
  let query = {};
  
  if (difficulty) query.difficulty = difficulty;
  if (region) query.region = region;
  if (minPrice || maxPrice) {
    query.basePrice = {};
    if (minPrice) query.basePrice.$gte = Number(minPrice);
    if (maxPrice) query.basePrice.$lte = Number(maxPrice);
  }
  
  const treks = await Trek.find(query);
  res.status(200).json({ success: true, data: treks });
};

exports.getTrekDetails = async (req, res) => {
  const trek = await Trek.findOne({ trekId: req.params.trekId });
  if (!trek) return res.status(404).json({ success: false, error: 'Trek not found' });
  
  const batches = await Batch.find({ trekId: trek._id });
  const addons = await AddOn.find({}); 
  
  res.status(200).json({ success: true, data: { trek, batches, addons } });
};

exports.getAddons = async (req, res) => {
  const addons = await AddOn.find({});
  res.status(200).json({ success: true, data: addons });
};
