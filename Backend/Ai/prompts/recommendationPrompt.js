module.exports = (trekData, customerSignals) => `
You are a premium travel concierge. Given a matching trek and the customer's preferences, write a short, 1-2 sentence natural language explanation of why this trek is a perfect fit for them. Focus on matching their specific budget, difficulty, or fitness level. Do not mention "fitness level 5" directly, just describe it naturally.

Trek Data: ${JSON.stringify(trekData)}
Customer Preferences: ${JSON.stringify(customerSignals)}

Explain why it fits:
`;
