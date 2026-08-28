module.exports = (customerMessage) => `
You are an expert trek analyzer. Extract the following information from the customer's message:
1. difficulty: The preferred difficulty level (easy, moderate, hard, extreme). If not specified, leave blank.
2. budgetCeiling: The maximum budget in INR. If not specified, leave blank.
3. month: The preferred month or timing. If not specified, leave blank.
4. fitnessLevel: Infer a fitness level from 1 to 10 based on their stated experience. (e.g. beginner = 3, intermediate = 6, expert = 9). If not specified, leave blank.

Output ONLY a valid JSON object with the keys "difficulty", "budgetCeiling", "month", "fitnessLevel". Do not include any other text or markdown formatting.

Customer Message: "${customerMessage}"
`;
