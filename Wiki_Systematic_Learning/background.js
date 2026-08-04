chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateQuiz') {
    generateQuizWithGemini(request.sectionText)
      .then(result => sendResponse({ success: true, quiz: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate asynchronous response
    return true;
  }
});

async function generateQuizWithGemini(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['geminiApiKey'], async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        return reject(new Error('API key not found. Please click the extension icon, then right-click and go to Options to set it.'));
      }

      const prompt = `You are an expert educator. Read the following text and generate one multiple-choice question that tests the user's understanding of this exact material.
The output MUST be a valid JSON object matching this schema, with exactly 4 options and exactly 1 correct option:
{
  "question": "The question text",
  "options": [
    {"text": "First option text", "isCorrect": false},
    {"text": "Second option text", "isCorrect": true},
    {"text": "Third option text", "isCorrect": false},
    {"text": "Fourth option text", "isCorrect": false}
  ]
}

Text to analyze:
${text.substring(0, 8000)}`; // truncate just in case

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                response_mime_type: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          
          if (response.status === 404) {
            let listInfo = "";
            try {
              const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
              const listText = await listRes.text();
              listInfo = `\n\nDebug ListModels: ${listText}`;
            } catch (e) {
              listInfo = `\n\nDebug ListModels failed: ${e.message}`;
            }
            throw new Error(`API error 404. Google blocked the model for this key. ${listInfo}`);
          }
          throw new Error(`API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        let generatedText = data.candidates[0].content.parts[0].text;
        
        try {
            const quizObj = JSON.parse(generatedText);
            resolve(quizObj);
        } catch(e) {
            generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
            const quizObj = JSON.parse(generatedText);
            resolve(quizObj);
        }

      } catch (err) {
        reject(err);
      }
    });
  });
}
