console.log('Background script loaded');

importScripts('ExtPay.js');

const extpay = ExtPay('x-generator'); // Replace with your actual extension ID
extpay.startBackground();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let chatHistory = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request);
  
  if (request.action === "generateResponse") {
    console.log("Generating response for tweet:", request.tweet);
    generateResponse(request.tweet).then(result => {
      console.log("Sending response back to popup:", result);
      sendResponse(result);
    });
    return true; // Indicates that the response is asynchronous
  } else if (request.action === "editTweet") {
    console.log("Editing tweet with instruction:", request.instruction);
    editTweet(request.instruction).then(sendResponse);
    return true; // Indicates that the response is asynchronous
  } else if (request.action === "resetChatHistory") {
    chatHistory = [];
    console.log("Chat history reset");
    sendResponse({success: true});
    return true;
  } else if (request.action === "generateNewTweet") {
    console.log("Generating new tweet:", request.chatHistory);
    generateNewTweet(request.chatHistory, request.isSingleTweet).then(sendResponse);
    return true; // Indicates that the response is asynchronous
  } else if (request.action === "editNewTweet") {
    console.log("Editing new tweet with chat history:", request.chatHistory);
    editNewTweet(request.chatHistory, request.isSingleTweet).then(sendResponse);
    return true; // Indicates that the response is asynchronous
  } else if (request.action === "fetchContent") {
    fetch(request.url)
      .then(response => response.text())
      .then(html => {
        // Instead of parsing the HTML, we'll send the raw HTML back to the popup
        sendResponse({content: html});
      })
      .catch(error => sendResponse({error: error.message}));
    return true;  // Will respond asynchronously
  }
});

function fetchContentFromPage(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        resolve(doc.body.innerText);
      })
      .catch(error => reject(error.message));
  });
}

async function generateResponse(tweet) {
  console.log("Inside generateResponse function");
  const systemMessage = `You are a professional Tweeter. Please respond to tweets I will provide you with in a way that's intelligent and concise. Here are your STRICT guidelines:
1. Respond very concisely, less than 280 characters, with no unnecessary fluff
2. Use any content from the Tweet or links provided within the tweet as context for your response
3. You are responding to the tweet, not rewriting it
4. Don't pander or be excessively ingratiating. NO EMOJIS, HASHTAGS, or exclamation points
5. Do NOT be unctuous
6. Make a complementary point that adds something new to the conversation that's insightful
7. Respond like a human who's tweeting. It doesn't need to be excessively formal. Be personable and informal. 
8. You don't need to restate the content from the tweet. Create a unique, contrarian, or complementary thought or perspective
8. I will provide you with a tweet, you will respond to it, and then I will give you edits if necessary`;

  chatHistory = [
    { role: "system", content: systemMessage },
    { role: "user", content: tweet }
  ];

  console.log("Chat history initialized:", chatHistory);

  try {
    const response = await callOpenAI(chatHistory);
    console.log("Received response from OpenAI:", response);
    chatHistory.push({ role: "assistant", content: response });
    console.log("Updated chat history:", chatHistory);
    console.log("Sending displayResponse message to popup");
    
    // Send message to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, { action: "displayResponse", response: response }, function(response) {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to tab:", tab.id, chrome.runtime.lastError);
          } else {
            console.log("Message sent successfully to tab:", tab.id);
          }
        });
      });
    });

    return { action: "displayResponse", response: response };
  } catch (error) {
    console.error('Error in generateResponse:', error);
    return { action: "error", message: "Failed to generate response: " + error.message };
  }

}

async function editTweet(instruction) {
  console.log("Inside editTweet function");
  console.log("Current chat history:", chatHistory);
  if (chatHistory.length < 2) {
    console.error('Chat history is empty or incomplete');
    return { action: "error", message: "No tweet to edit. Please generate a tweet first." };
  }

  chatHistory.push({ role: "user", content: instruction });
  console.log("Updated chat history with instruction:", chatHistory);

  try {
    console.log("Calling OpenAI for edit");
    const response = await callOpenAI(chatHistory);
    console.log("Received edited response from OpenAI:", response);
    chatHistory.push({ role: "assistant", content: response });
    console.log("Final chat history after edit:", chatHistory);
    chrome.runtime.sendMessage({ action: "displayResponse", response: response });
    return { success: true };
  } catch (error) {
    console.error('Error in editTweet:', error);
    return { action: "error", message: "Failed to edit response: " + error.message };
  }
}

async function generateNewTweet(chatHistory, isSingleTweet) {
  try {
    const response = await callOpenAI(chatHistory);
    console.log("Received response from OpenAI:", response);

    if (isSingleTweet) {
      return { tweet: response.trim() };
    } else {
      const tweets = response.split('%TWEET%').map(tweet => tweet.trim()).filter(tweet => tweet);
      return { tweets: tweets };
    }
  } catch (error) {
    console.error('Error in generateNewTweet:', error);
    return { error: "Failed to generate tweet: " + error.message };
  }
}

async function callOpenAI(messages) {
  console.log("Calling OpenAI with messages:", messages);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
        max_tokens: 4095,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: { "type": "text" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw OpenAI response:", data);
    if (!data.choices || data.choices.length === 0) {
      console.error('Unexpected API response:', data);
      throw new Error('Unexpected API response');
    }
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error in callOpenAI:', error);
    throw error;
  }
}

async function editNewTweet(chatHistory, isSingleTweet) {
  try {
    const response = await callOpenAI(chatHistory);
    console.log("Received edited response from OpenAI:", response);
    
    if (isSingleTweet) {
      return { tweet: response.trim() };
    } else {
      const tweets = response.split('%TWEET%').map(tweet => tweet.trim()).filter(tweet => tweet);
      return { tweets: tweets };
    }
  } catch (error) {
    console.error('Error in editNewTweet:', error);
    return { error: "Failed to edit tweet: " + error.message };
  }
}