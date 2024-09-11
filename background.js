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
7. Respond like a human who's tweeting. It doesn't need to be excessively formal. Be personable and informal
8. You don't need to restate the content from the tweet. Create a unique, contrarian, or complementary thought or perspective
9. I will provide you with a tweet, you will respond to it, and then I will give you edits if necessary

Below are some examples of great Tweet replies. Train off of these examples and respond in a style conducive to the quality and feel of the Tweets below:

1. Well, it's clearly the correct constitutional interpretation; now states are voting on it and people can live in the states they want. Most states will allow it. It just shouldn't be a national issue, based on how the US Constitution works. Fortunately we live in a republic.

2. It's possible you believe this; if so you're being gaslit. There are parts of NYC where the cops say a vast majority of arrests are tied to illegals. Check out DC Fed job data; it hurts the working class natives a lot to flood it like this and it reduces trust and raises crime.

3. This is a strange one for me, reminds me of an ex I had once - I think you guys are surrounded by the wrong sort of women.

4. Good point. These are the bad guys and are actively fighting on the other team - it's even more obvious now if it wasn't before for some reason.

5. Insane. A real leader would send in the national guard and arrest the illegal gang members / clean up the mess right away. He's probably afraid this would make D's look bad and the national party wouldn't like him anymore.

6. It's not just NSF - dozens of departments are giving out money to cronies like this, NGO funding from DC annually is now into the 12 figures (not a typo, hundreds of billions).

7. Taxing them is fine; don't tax them in a way that breaks their incentives to build and employ people, or that forces them to sell their companies and stop working on them before they otherwise would. Incentives and systems matter; even D's in tech know this idea makes no sense.

8. Breaking the system by crushing and expropriating the people from which a lot of the most important capital and know-how is coming, and changing their incentives to not make as many illiquid bold bets, must not negatively impact anybody else at all!

9. Yep. We could quickly find tens of billions of dollars of fraud and waste in Medicare and Medicaid alone - Obama even verbally agreed to let us do it back in the day but then his people stopped it from going ahead; wasn't politically useful to find all that for some reason.

10. Surely you've also noticed how inefficient, wasteful, and incompetent our govt is when it tries to provide things our working class needs, wasting 100s of billions of dollars - why not let the most talented builder, manufacturer and private sector leader help make it less dumb?!

11. No - this observation is just about men, traits of low T men vs standard and high T men, and quantified results… Amusing to see your instinct try to bring in the girls to fight for you, with an ad hominem, versus being able to respond to the data which shows an obvious truth.

12. You might want to get your T measured, treating that could help you overcome the urge to repeat false NPC attack lines when people offend you by pointing out inconvenient facts to your worldview.

13. Stop tying Israel's hands, slowing their efforts, and emboldening the Iranian proxies to think that tactics which cause civilian deaths are working to make us deter Israel.

14. Authoritarian governments hate when you can speak and coordinate in private.

15. There is a big difference between sharing political views and supporting terrorism and/or racism.

16. Democrats are going to have to explain this movement towards deeper antisemitism. We are seeing it in the protests, in the rhetoric by the Squad and members of Congress, and now in the VP pick. They can't talk this away as coincidence. It's concerning.

17. The common case is for people to think of Plan B up front, in advance, as a backup plan. I only think of a secondary plan, IF the main plan fails

18. The most important role in a successful persons life is not their spouse or mentor It's the friend who makes fun of them in the group chat Shoutout to the ball busters

19. Great post. Might have the same impact mrr vs managers schedule One question. It looks like Elon: - read this - might be the best example of founder mode but you didn't use his example. Curious why?

20. Good friends consume together, Great friends create together

21. exactly, travel in your 20s is a totally different thing than travel when you're in 30s and 40s it deserves it's own word, it's that different

22. You've gotem right where you want'em

23. Winning mindset 2 people can hear the same story. 1 gets bitter, the other gets inspired

24. I love finding talent hotbeds. Brazil & Argentina have weak currencies & inflation. That means top talent wants to earn dollars & work for US companies. Everyone wins: - you get great talent - they get great job that pays in $$ - Time zones line up well

25. "everything must be made as simple as possible, but not one bit simpler "

26. in sports there are some well known counter examples: phil jackson with dennis rodman larry brown with allen iverson john k with conor mcgregor Deion sanders, randy moss etc..

27. You're brave for even asking these questions

28. In the same week we had the owner of Telegram get arrested in France And X get banned in Brazil, with broader threats against Elon's other company's Free speech is very much under attack

29. This is absolutely insane A rogue judge in Brazil is taking more than 250k customers offline because... he doesn't like free speech

30. Brazil is becoming Venezuela

31. The internet sits at the center of global cyber crime… The phone network sits at the center of global crime… Horse-drawn carriages sit at the center of global crime… The Medici banking network sits at the center of global crime… Shut it all down…?

32. I think morally depraved communists are petrified by the idea that glorious capitalists may supersede them And right now we've hit a critical point where we've crossed 10% of their size, but as everyone knows, these are exponential growth curves & so all their alarm bells ring

33. do you repeat purchase from your favorite restaurant do you repeat purchase the same software its not a consumable the economic biology is different

34. the lord of light mrr

35. someone could just turn on universal facebook ads for this and their dad would be out of gambling debt

36. indie hacker "is the mrr in the room with us now"

37. your coding environment is becoming your co-founder

38. If distribution is the new moat, where is the Y-Combinator for creating distribution, not software? I don't think it exists. There isn't much product risk anymore in most startups. Only distribution risk.

39. Amazing to see the issue of chronic disease getting so much traction politically. This is the biggest issue in the country, and the one thing that should unite every American.

40. what would an updated mental model look like to you? open to hearing where you think I should update my thinking on autism!

41. The poisoning of Americans by many of our largest industries is going to be *the* largest issue of the next 20 years

42. Physical and mental health are the same thing, with the same root cause: a messed up environment

43. Wework does a great service to the US startup scene by removing the unambitious from the office rental market and entertaining + preventing them from distracting people who actually want to build

44. The solution against evil is for the good guys to fight and win. Those who forget there can be evil in the world, also tend to forget about the divine.`;

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
    const response = await fetch('https://x-generator.vercel.app/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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