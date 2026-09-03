module.exports = (customerMessage) => `
You are an expert trek analyzer. Extract the following information from the customer's message:
1. difficulty: The preferred difficulty level (easy, moderate, hard, extreme). If not specified, leave blank.
2. budgetCeiling: The maximum budget PER PERSON in INR. If not specified, leave blank.
3. month: The preferred month or timing. If not specified, leave blank.
4. fitnessLevel: Infer a fitness level from 1 to 10 based on their stated experience. (e.g. beginner = 3, intermediate = 6, expert = 9). If not specified, leave blank.
5. travelers: The number of people the booking is for, as an integer (e.g. "for 4 people", "we are a group of 3", "just me" = 1, "me and my wife" = 2). If not specified, leave blank — do not assume 1.
6. isBookingIntent: boolean (true/false). Set to true ONLY IF the customer is explicitly asking to book, reserve, buy, or checkout right now (e.g., "book this", "I want to reserve", "buy this"). Otherwise false.
7. isInfoRequest: boolean (true/false). Set to true ONLY IF the customer is asking a follow-up question about a SPECIFIC trek already being discussed (e.g., "tell me more", "what's the itinerary", "is it safe", "what altitude does it reach", "what's included") rather than describing new preferences or starting a new search. Otherwise false.
8. customerName: if the customer states their own name (e.g., "I'm Priya", "this is for Rahul Sharma", "name's John"), extract it as a plain string. If not stated, leave blank. Never guess a name from unrelated text.

Output ONLY a valid JSON object with the keys "difficulty", "budgetCeiling", "month", "fitnessLevel", "travelers", "isBookingIntent", "isInfoRequest", "customerName". Do not include any other text or markdown formatting.

Customer Message: "${customerMessage}"
`;
