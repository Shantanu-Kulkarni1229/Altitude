require('dotenv').config();
const extractionService = require('./Ai/services/extractionService');

async function test() {
  const result = await extractionService.extractSignals("i want to book a trek less than 5000");
  console.log('Result for "less than 5000":', JSON.stringify(result, null, 2));
  
  const result2 = await extractionService.extractSignals("book this for me");
  console.log('Result for "book this":', JSON.stringify(result2, null, 2));
}

test().catch(console.error);
