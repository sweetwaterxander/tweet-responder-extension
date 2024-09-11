console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');

  // ExtPay initialization
  const extpay = ExtPay('x-generator'); // Replace with your actual extension ID
  const authScreen = document.getElementById('auth-screen');
  const content = document.getElementById('content');
  const loginButton = document.getElementById('loginButton');
  const signupButton = document.getElementById('signupButton');
  const settingsButtons = document.querySelectorAll('.settings-button');

  // Add a loading screen
  const loadingScreen = document.createElement('div');
  loadingScreen.id = 'loading-screen';
  loadingScreen.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #1F2937;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;
  loadingScreen.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(loadingScreen);

  function showContent(paid) {
    loadingScreen.style.display = 'none';
    authScreen.style.display = 'none';
    content.style.display = 'block';
    if (!paid) {
      // Disable functionality or show upgrade message
    }
  }

  function showAuthButtons() {
    loadingScreen.style.display = 'none';
    authScreen.style.display = 'flex';
    content.style.display = 'none';
  }

  extpay.getUser().then(user => {
    if (user.paid) {
      showContent(true);
    } else {
      showAuthButtons();
    }
  }).catch(error => {
    console.error('Error getting user:', error);
    showAuthButtons();
  });

  loginButton.addEventListener('click', () => {
    extpay.openLoginPage();
  });

  signupButton.addEventListener('click', () => {
    extpay.openPaymentPage();
  });

  settingsButtons.forEach(button => {
    button.addEventListener('click', () => {
      extpay.openPaymentPage();
    });
  });

  extpay.onPaid.addListener(user => {
    showContent(true);
  });

  // Existing code starts here
  const generateButton = document.getElementById('generateTweet');
  console.log('Generate button:', generateButton);

  if (generateButton) {
    generateButton.addEventListener('click', function() {
      console.log('Generate button clicked');
      // ... rest of the click handler ...
    });
  } else {
    console.error('Generate button not found');
  }

  const tweetResponse = document.getElementById('tweetResponse');
  const copyButton = document.getElementById('copyToClipboard');
  const errorElement = document.getElementById('error');
  const makeConciseButton = document.getElementById('makeConcise');
  const moreConservativeButton = document.getElementById('moreConservative');
  const moreLiberalButton = document.getElementById('moreLiberal');
  const moreUniqueButton = document.getElementById('moreUnique');
  const moreContrarianButton = document.getElementById('moreContrarian');
  const moreAgreeableButton = document.getElementById('moreAgreeable');
  const loadingOverlay = document.getElementById('loadingOverlay');

  const editButtons = [
    makeConciseButton, moreConservativeButton, moreLiberalButton,
    moreUniqueButton, moreContrarianButton, moreAgreeableButton, copyButton
  ];

  console.log("Elements referenced:", {
    generateButton,
    tweetResponse,
    copyButton,
    errorElement,
    makeConciseButton,
    moreConservativeButton,
    moreLiberalButton,
    loadingOverlay
  });

  // Load saved state
  chrome.storage.local.get(['tweetResponse', 'buttonsEnabled'], function(result) {
    if (result.tweetResponse) {
      tweetResponse.value = result.tweetResponse;
      tweetResponse.style.height = 'auto';
      tweetResponse.style.height = tweetResponse.scrollHeight + 'px';
      setButtonState(false);
    }
    setEditButtonsState(result.buttonsEnabled || false);
  });

  function setLoading(isLoading) {
    console.log("Setting loading state:", isLoading);
    loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    generateButton.disabled = isLoading;
    if (isLoading) {
      generateButton.removeAttribute('title');
    } else {
      setButtonState(false);
    }
    setEditButtonsState(!isLoading && tweetResponse.value.trim() !== '');
  }

  function setEditButtonsState(enabled) {
    editButtons.forEach(button => {
      button.disabled = !enabled;
      if (!enabled) {
        button.setAttribute('title', 'Please generate a tweet first');
      } else {
        button.removeAttribute('title');
      }
    });
    // Save button state
    chrome.storage.local.set({buttonsEnabled: enabled});
  }

  function setButtonState(isGenerating) {
    if (isGenerating) {
      generateButton.textContent = 'Generating...';
      generateButton.disabled = true;
    } else if (tweetResponse.value.trim() !== '') {
      generateButton.textContent = 'Reset';
      generateButton.disabled = false;
    } else {
      generateButton.textContent = 'Generate Tweet';
      generateButton.disabled = false;
    }
  }

  function resetState() {
    tweetResponse.value = '';
    errorElement.textContent = '';
    setEditButtonsState(false);
    setButtonState(false);
    chrome.storage.local.remove(['tweetResponse', 'buttonsEnabled']);
    chrome.runtime.sendMessage({action: "resetChatHistory"});
  }

  // Initially disable edit buttons
  setEditButtonsState(false);

  generateButton.addEventListener('click', function() {
    if (generateButton.textContent === 'Reset') {
      resetState();
    } else {
      console.log("Generate button clicked");
      setLoading(true);
      setButtonState(true);
      errorElement.textContent = '';
      tweetResponse.value = ''; // Clear previous response

      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log("Sending getTweet message to content script");
        chrome.tabs.sendMessage(tabs[0].id, {action: "getTweet"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError);
            setLoading(false);
            errorElement.textContent = "Error: " + chrome.runtime.lastError.message;
            setButtonState(false);
          } else if (response && response.tweet) {
            console.log("Received tweet from content script:", response.tweet);
            chrome.runtime.sendMessage({action: "generateResponse", tweet: response.tweet}, function(result) {
              console.log("Received response from background script:", result);
              if (result.action === "displayResponse") {
                displayResponse(result.response);
              } else if (result.action === "error") {
                displayError(result.message);
              }
            });
          } else {
            console.error("No tweet received from content script");
            setLoading(false);
            errorElement.textContent = "Error: No tweet found on the page";
            setButtonState(false);
          }
        });
      });
    }
  });

  function displayResponse(response) {
    console.log("Displaying response:", response);
    if (tweetResponse) {
      tweetResponse.value = response;
      tweetResponse.style.height = 'auto';
      tweetResponse.style.height = tweetResponse.scrollHeight + 'px';
      console.log("Updated tweetResponse value:", tweetResponse.value);
      // Save response
      chrome.storage.local.set({tweetResponse: response});
    } else {
      console.error("tweetResponse element not found");
    }
    setLoading(false);
    setButtonState(false);
    console.log("Loading state set to false, button text updated");
    setEditButtonsState(true);
  }

  function displayError(message) {
    console.error("Error received:", message);
    if (errorElement) {
      errorElement.textContent = message;
    } else {
      console.error("errorElement not found");
    }
    setLoading(false);
    setButtonState(false);
    setEditButtonsState(false);
    // Clear saved response on error
    chrome.storage.local.remove('tweetResponse');
  }

  copyButton.addEventListener('click', function() {
    console.log("Copy button clicked");
    navigator.clipboard.writeText(tweetResponse.value);
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = 'Copy to Clipboard';
    }, 2000);
  });

  function editTweet(instruction) {
    console.log("Editing tweet with instruction:", instruction);
    setLoading(true);
    chrome.runtime.sendMessage({
      action: "editTweet",
      instruction: instruction
    }, response => {
      console.log("Received response from background script:", response);
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        setLoading(false);
        errorElement.textContent = "Error: " + chrome.runtime.lastError.message;
      }
    });
  }

  makeConciseButton.addEventListener('click', () => {
    console.log("Make concise button clicked");
    editTweet("Make the previous response more concise and remove any unnecessary fluff and make it sound more human and natural");
  });
  moreConservativeButton.addEventListener('click', () => {
    console.log("More conservative button clicked");
    editTweet("Make the previous response much more politically conservative and right-leaning");
  });
  moreLiberalButton.addEventListener('click', () => {
    console.log("More liberal button clicked");
    editTweet("Make the previous response much more politically liberal and left-leaning");
  });
  moreUniqueButton.addEventListener('click', () => {
    console.log("More unique button clicked");
    editTweet("Re-do your response and make it more unique and interesting");
  });
  moreContrarianButton.addEventListener('click', () => {
    console.log("More contrarian button clicked");
    editTweet("Re-make your response with a more contrarian perspective. Take an opposing view to the tweet. It can even be inflamatory.");
  });
  moreAgreeableButton.addEventListener('click', () => {
    console.log("More agreeable button clicked");
    editTweet("Re-make your response and make it more agreeable and complementary to the tweet. The person tweeting made a good point.");
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Popup received message:", request);
    if (request.action === "displayResponse") {
      displayResponse(request.response);
    } else if (request.action === "error") {
      displayError(request.message);
    }
    // Send a response to keep the message channel open
    sendResponse({received: true});
    return true;
  });

  // Force a redraw of the popup
  setTimeout(() => {
    document.body.style.display = 'none';
    document.body.offsetHeight;
    document.body.style.display = '';
  }, 10);

  console.log("Popup script initialized");

  // Test function to manually update the textarea
  window.testUpdate = function(text) {
    console.log("Testing manual update of tweetResponse");
    if (tweetResponse) {
      tweetResponse.value = text;
      console.log("tweetResponse value after manual update:", tweetResponse.value);
      setLoading(false);
      setEditButtonsState(true);
    } else {
      console.error("tweetResponse element not found in manual test");
    }
  };

  // Add this code at the beginning of your existing popup.js file
  const replyTab = document.getElementById('replyTab');
  const newTweetTab = document.getElementById('newTweetTab');
  const replyContent = document.getElementById('replyContent');
  const newTweetContentElement = document.getElementById('newTweetContent');

  const pasteContentInput = document.getElementById('pasteContent');
  const linkInput = document.getElementById('linkInput');
  const singleTweetButton = document.getElementById('singleTweetButton');
  const threadButton = document.getElementById('threadButton');
  const generateNewTweet = document.getElementById('generateNewTweet');
  const newTweetResponse = document.getElementById('newTweetResponse');
  const newTweetLoadingOverlay = document.getElementById('newTweetLoadingOverlay');
  const copyNewTweet = document.getElementById('copyNewTweet');
  const newTweetError = document.getElementById('newTweetError');

  const newEditButtons = [
    document.getElementById('newMakeConcise'),
    document.getElementById('newMoreConservative'),
    document.getElementById('newMoreLiberal'),
    document.getElementById('newMoreUnique'),
    document.getElementById('newMoreContrarian'),
    document.getElementById('newMoreAgreeable')
  ];

  let isSingleTweet = true;

  // Add these variables at the top of the file
  let newTweetContent = null;
  let newTweetIsSingleTweet = true;
  let newTweetChatHistory = [];
  let threadContainer = null;

  function updateGenerateButton() {
    if (generateNewTweet.textContent === 'Reset') {
      generateNewTweet.disabled = false;
      generateNewTweet.removeAttribute('title');
    } else {
      const isDisabled = !(pasteContentInput.value.trim() || linkInput.value.trim());
      generateNewTweet.disabled = isDisabled;
      if (isDisabled) {
        generateNewTweet.setAttribute('title', 'Please paste content or enter a link');
      } else {
        generateNewTweet.removeAttribute('title');
      }
    }
  }

  pasteContentInput.addEventListener('input', updateGenerateButton);
  linkInput.addEventListener('input', updateGenerateButton);

  singleTweetButton.addEventListener('click', () => {
    singleTweetButton.classList.add('active');
    threadButton.classList.remove('active');
    isSingleTweet = true;
  });

  threadButton.addEventListener('click', () => {
    threadButton.classList.add('active');
    singleTweetButton.classList.remove('active');
    isSingleTweet = false;
  });

  function setNewTweetLoading(isLoading) {
    newTweetLoadingOverlay.style.display = isLoading ? 'flex' : 'none';
    generateNewTweet.disabled = isLoading;
    if (isLoading) {
      generateNewTweet.removeAttribute('title');
    } else {
      updateGenerateButton();
    }
    setNewEditButtonsState(!isLoading && newTweetResponse.value.trim() !== '');
  }

  function setNewEditButtonsState(enabled) {
    newEditButtons.forEach(button => {
      button.disabled = !enabled;
      if (!enabled) {
        button.setAttribute('title', 'Please generate a tweet first');
      } else {
        button.removeAttribute('title');
      }
    });
    copyNewTweet.disabled = !enabled;
    if (!enabled) {
      copyNewTweet.setAttribute('title', 'Please generate a tweet first');
    } else {
      copyNewTweet.removeAttribute('title');
    }
  }

  async function extractLinkContent(url) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({action: "fetchContent", url: url}, resolve);
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // Parse the HTML content here in the popup context
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.content, 'text/html');
      const content = doc.body.innerText;
      console.log('Extracted link content:', content.substring(0, 100) + '...');
      return content;
    } catch (error) {
      console.error('Error extracting link content:', error);
      return `Unable to extract content from link: ${url}`;
    }
  }

  generateNewTweet.addEventListener('click', async () => {
    if (generateNewTweet.textContent === 'Reset') {
      resetNewTweetState();
    } else {
      setNewTweetLoading(true);
      newTweetError.textContent = '';
      newTweetResponse.value = '';

      let content = '';
      let linkUrl = '';

      console.log('Pasted content:', pasteContentInput.value);
      console.log('Link input:', linkInput.value);

      if (pasteContentInput.value.trim()) {
        content = pasteContentInput.value.trim();
      }

      if (linkInput.value.trim()) {
        linkUrl = linkInput.value.trim();
        const linkContent = await extractLinkContent(linkUrl);
        content += '\n\n' + linkContent;
        console.log('Link content:', linkContent.substring(0, 100) + '...');
      }
      const systemMessage = `You are a professional Tweeter. Please generate tweets based on the given information. Here are your STRICT guidelines:
      1. Respond very concisely, less than 280 characters (per tweet), with no unnecessary fluff
      2. Don't pander or be excessively ingratiating. ABSOLUTELY NO EMOJIS, HASHTAGS, or exclamation points
      3. Do NOT be unctuous but be interesting, unique, and DON'T be boring or dry.
      4. Tweet like a human who's tweeting. It doesn't need to be excessively formal. Be personable and informal.
      5. You can use a combination of second or third person tense depending on what makes the most sense and the content provided. But if the content is business or news related, use the third person tense.
      6. DO NOT use the first person tense when reporting on news or business. You may only use the first person tense when writing a personal thought about the content in a unique or interesting way/perspective.

      Below are some examples of great Tweets and Threads. Train off of these examples and respond in a style conducive to the quality and feel of the Tweets below:
      1. 
      Tried my hand at startup advisory work earlier this yr (early-stage) Didn't like it Advice mostly boiled down to same 5 things 1. Narrow focus & increase quality 2. Optimize for speed 3. Don't hire until it hurts 4. Talk to customers a lot 5. If unsure abt teammate, move on
      2. (THREAD)
      %TWEET%
      Making a product worse can actually make it better. Here's my #1 unconventional tip on becoming a better designer: Make 'cursed product designs' Here's why...
      %TWEET%
      -> iOS Clock app charging you money for pressing snooze. -> The weather app that lets you bet against the forecast -> Apple Watch Workout app recording "existential crisis"
      %TWEET%
      What most don't realize is that they're actually a great product design exercise. To create 'cursed product designs,' you have to deeply think "How can I make this product comically worse?" Why does this matter?
      %TWEET%
      When you train yourself to think about how a product can get worse, you're also training yourself to think about how it can be better. This process helps you understand the subtleties of the product's core value. Let's use Instagram as an example.
      %TWEET%
      There are tons of influencers on the platform who flex their expensive vacations in Greece, the Maldives, or other exotic places. But there are cases where the picture is taken nowhere near where they claim it to be.
      %TWEET%
      For instance, there was one influencer who faked a vacation of herself in Bali, but the photo was actually taken in IKEA. She did this on purpose to make fun of Instagram influencers faking their vacation. Now let's think: what would be the 'cursed product design' here?
      %TWEET%
      Imagine if whenever an influencer wanted to tag themselves in a place they're not, Instagram showed a warning and charged them $29.99 to post. This is undoubtedly a hilariously worse product experience. However, it helps us understand what's good about the platform.
      %TWEET%
      We dislike fake pictures on Instagram because we want to connect with others as humans, not with the fake persona they project. Once we get that, we can start thinking about how to make it better: How can we make Instagram more about authentically connecting with someone?
      %TWEET%
      From there, we can start designing a feature around this core idea. I'd highly recommend trying the 'cursed product design' exercise.
      3.
      Singlehandedly the most important thing @rabois taught me was how to build startups the way Hollywood makes films You write a script (vision), you cast the ideal leads (cofounders) and then you go build it You don't A/B test your way to a generational co
      4. (THREAD)
      %TWEET%
      He sold over 20,000,000 pairs of sunglasses with a 240 word story. And is considered to be one of the greatest copywriters, ever. Here're 5 of Joe Sugarman's most powerful writing secrets: (Starting with the two he called "THE most powerful")
      %TWEET%
      Seeds Of Curiosity It's the key to keeping attention. And the reason you're reading this thread. 5 simple tips to infuse your copy with max curiosity: • Tell stories • Tease a benefit • Offer explanations • Withhold information • Ask & answer questions The second tool?
      %TWEET%
      The Slippery Slide If there's a rule that'll change your writing forever it's this: "The role of the first sentence is to get your reader to read the next" To nail your 1st sentence make it: • Intriguing • Easy to read • Short & snappy Make your reader slide down the page
      %TWEET%
      People Buy With Emotion, Then Justify With Logic Lamborghini sells status, not cars. When writing, open with emotion. Then back it up with logic. An easy way to do it? Talk about benefits before features.
      %TWEET%
      Edit Like A Pro The aim is to "express exactly what you want with the fewest words." 5 tips to edit like a pro: • Remove "that" • Eliminate fillers • Reword for rhythm • Combine sentences • Rearrange for flow (emotion, then logic) Writing well is 80% editing.
      %TWEET%
      Sell The Sizzle, Not The Steak Selling with words alone is hard. Because online, trust is low and skepticism is high. So here's something you can try: Sell the concept, not your product. Like Apple sells simplicity, not electronics.
      5.
      America needs mass deportations. No more armed Venezuelan gangs taking over communities. No more Chilean gangs robbing our homes. No more Laken Rileys or Rachel Morins murdered and raped. No more 100,000 fentanyl deaths a year. No more free flights into America with free hotels and free cash. No more!! Send them back!!
      6.
      The solution against evil is for the good guys to fight and win. Those who forget there can be evil in the world, also tend to forget about the divine.
      7.
      Imagine: "The year is 1994 and Vint Cerf and Rob Kahn have just been arrested Their invention (TCP/IP) is being used for drug dealers to communicate with each other and they were unwilling to install a back door" The equivalent version of this just happened with Telegram
      8.
      Soviets and Maoists also used this branding with revolutionaries, before their bad ideas eventually each led to unchecked government and the deaths of tens of millions. One wonders if some of them are "trained Marxists" doing it on purpose, or if populist history just repeats.
      9.
      1990: zero states with obesity rates above 20% 2018: zero states with obesity rates below 20% Not to mention an explosion in chronic disease, cancer, ADHD, inflammation... Something has to change. And that something is our broken food system.
      10.
      These stats are absolutely insane: - 74% of adults are overweight - 50% of children are overweight - 50% of adults have diabetes or pre diabetes - 30% of teens have diabetes and pre diabetes - 40% of 18 and under have a mental health diagnosis - young adult cancers are up 70% - 1 in 36 kids have autism It is criminal what is being done to our health. We are being poisoned
      11.
      The Chevron decision feels like one of those unsexy things that could have a hugely positive impact on American competitiveness and innovation over the next decade
      12.
      Every player in the healthcare system makes more money when people are sick. Every player in the food system makes more money when people eat hyper-processed foods. Yet we're confused by record levels of obesity, record levels of chronic disease, and record healthcare cost?`;

      const userPrompt = isSingleTweet
        ? `Please write a single 280 character tweet based on the content from the following content. Make sure to exclude content that is not relevant to broader message/article included below: ${content}${linkUrl ? ` Source link: ${linkUrl}` : ''}`
        : `Please create a thread from following content. Make sure to exclude content that is not relevant to broader message/article included below. Do not make the thread longer than it needs to be, and use only 280 character tweets. Write the thread sequentially, but separate the threads by "%TWEET%". ${content}${linkUrl ? ` Source link: ${linkUrl}` : ''}`;

      newTweetChatHistory = [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt }
      ];

      console.log('Final prompt:', userPrompt.substring(0, 100) + '...');

      try {
        const response = await chrome.runtime.sendMessage({
          action: "generateNewTweet",
          chatHistory: newTweetChatHistory,
          isSingleTweet: isSingleTweet
        });

        console.log('Response from background script:', response);

        if (response.error) {
          throw new Error(response.error);
        }

        if (isSingleTweet) {
          displayNewTweet(response.tweet);
          newTweetContent = response.tweet;
          newTweetChatHistory.push({ role: "assistant", content: response.tweet });
        } else {
          displayThread(response.tweets);
          newTweetContent = response.tweets;
          newTweetChatHistory.push({ role: "assistant", content: response.tweets.join('%TWEET%') });
        }
        newTweetIsSingleTweet = isSingleTweet;

        // Save the generated content and chat history to local storage
        chrome.storage.local.set({ 
          newTweetContent: newTweetContent,
          newTweetIsSingleTweet: newTweetIsSingleTweet,
          newTweetChatHistory: newTweetChatHistory
        });

        // Change button text to "Reset"
        generateNewTweet.textContent = 'Reset';

        // Enable edit buttons immediately after generating content
        setNewEditButtonsState(true);
      } catch (error) {
        console.error('Error generating tweet:', error);
        newTweetError.textContent = `Error: ${error.message}`;
      } finally {
        setNewTweetLoading(false);
        updateGenerateButton();
      }
    }
  });

  function resetNewTweetState() {
    newTweetResponse.value = '';
    newTweetResponse.style.display = 'block';
    if (threadContainer) {
      threadContainer.innerHTML = '';
      threadContainer.style.display = 'none';
    }
    newTweetError.textContent = '';
    setNewEditButtonsState(false);
    generateNewTweet.textContent = 'Generate Tweet';
    chrome.storage.local.remove(['newTweetContent', 'newTweetIsSingleTweet', 'newTweetChatHistory']);
    pasteContentInput.value = '';
    linkInput.value = '';
    isSingleTweet = true; // Reset to single tweet mode
    singleTweetButton.classList.add('active');
    threadButton.classList.remove('active');
    updateGenerateButton();
    newTweetChatHistory = [];

    // Show the main Copy to Clipboard button
    copyNewTweet.style.display = 'block';
  }

  function loadSavedNewTweetContent() {
    chrome.storage.local.get(['newTweetContent', 'newTweetIsSingleTweet', 'newTweetChatHistory'], function(result) {
      if (result.newTweetContent) {
        newTweetContent = result.newTweetContent;
        newTweetIsSingleTweet = result.newTweetIsSingleTweet;
        newTweetChatHistory = result.newTweetChatHistory || [];
        if (newTweetIsSingleTweet) {
          displayNewTweet(newTweetContent);
          isSingleTweet = true;
          singleTweetButton.classList.add('active');
          threadButton.classList.remove('active');
        } else {
          displayThread(newTweetContent);
          isSingleTweet = false;
          threadButton.classList.add('active');
          singleTweetButton.classList.remove('active');
        }
        generateNewTweet.textContent = 'Reset';
        generateNewTweet.disabled = false;
        setNewEditButtonsState(true);
      } else {
        generateNewTweet.textContent = 'Generate Tweet';
        generateNewTweet.disabled = false;
        updateGenerateButton();

        // Show the main Copy to Clipboard button when there's no saved content
        copyNewTweet.style.display = 'block';
      }
    });
  }

  function displayNewTweet(tweet) {
    newTweetResponse.value = tweet;
    newTweetResponse.style.display = 'block';
    if (threadContainer) {
      threadContainer.innerHTML = '';
      threadContainer.style.display = 'none';
    }
    setNewEditButtonsState(true);

    // Show the main Copy to Clipboard button for single tweets
    copyNewTweet.style.display = 'block';
  }

  function displayThread(tweets) {
    if (!threadContainer) {
      threadContainer = document.createElement('div');
      threadContainer.id = 'threadContainer';
      threadContainer.className = 'thread-container';
      newTweetResponse.parentNode.insertBefore(threadContainer, newTweetResponse.nextSibling);
    }

    // Clear the thread container
    threadContainer.innerHTML = '';

    // Hide the single tweet textarea and show the thread container
    newTweetResponse.style.display = 'none';
    threadContainer.style.display = 'block';

    tweets.forEach((tweet, index) => {
      const tweetBox = document.createElement('div');
      tweetBox.className = 'tweet-box';

      const tweetNumber = document.createElement('h3');
      tweetNumber.textContent = `Tweet ${index + 1}`;
      tweetBox.appendChild(tweetNumber);

      const tweetText = document.createElement('textarea');
      tweetText.value = tweet;
      tweetText.readOnly = true;
      tweetBox.appendChild(tweetText);

      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy to Clipboard';
      copyButton.className = 'copy-button';
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(tweet);
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy to Clipboard';
        }, 2000);
      });
      tweetBox.appendChild(copyButton);

      threadContainer.appendChild(tweetBox);
    });

    // Enable edit buttons
    setNewEditButtonsState(true);

    // Hide the main Copy to Clipboard button
    copyNewTweet.style.display = 'none';

    // Ensure the generate button says "Reset"
    generateNewTweet.textContent = 'Reset';

    // Update the button states
    updateGenerateButton();

    // Force a re-render of the buttons
    setTimeout(() => {
      newEditButtons.forEach(button => {
        button.disabled = false;
        button.removeAttribute('title');
      });
    }, 0);
  }

  // Add event listeners for edit buttons
  newEditButtons.forEach(button => {
    button.addEventListener('click', () => {
      const instruction = button.textContent.toLowerCase();
      editNewTweet(instruction);
    });
  });

  // Add this function to edit new tweets
  function editNewTweet(instruction) {
    setNewTweetLoading(true);
    
    // Add the instruction to the chat history
    newTweetChatHistory.push({ role: "user", content: instruction });

    chrome.runtime.sendMessage({
      action: "editNewTweet",
      chatHistory: newTweetChatHistory,
      isSingleTweet: newTweetIsSingleTweet
    }, response => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        setNewTweetLoading(false);
        newTweetError.textContent = "Error: " + chrome.runtime.lastError.message;
      } else if (response.error) {
        console.error("Error editing tweet:", response.error);
        setNewTweetLoading(false);
        newTweetError.textContent = "Error: " + response.error;
      } else {
        if (newTweetIsSingleTweet) {
          displayNewTweet(response.tweet);
          newTweetContent = response.tweet;
          newTweetChatHistory.push({ role: "assistant", content: response.tweet });
        } else {
          displayThread(response.tweets);
          newTweetContent = response.tweets;
          newTweetChatHistory.push({ role: "assistant", content: response.tweets.join('%TWEET%') });
        }
        chrome.storage.local.set({ 
          newTweetContent: newTweetContent,
          newTweetIsSingleTweet: newTweetIsSingleTweet,
          newTweetChatHistory: newTweetChatHistory
        });
        setNewTweetLoading(false);
      }
    });
  }

  copyNewTweet.addEventListener('click', () => {
    navigator.clipboard.writeText(newTweetResponse.value);
    copyNewTweet.textContent = 'Copied!';
    setTimeout(() => {
      copyNewTweet.textContent = 'Copy to Clipboard';
    }, 2000);
  });

  // Initialize button states
  updateGenerateButton();
  setNewEditButtonsState(false);

  function switchTab(tabName) {
    if (tabName === 'reply') {
      replyTab.classList.add('active');
      newTweetTab.classList.remove('active');
      replyContent.classList.add('active');
      replyContent.style.display = 'flex';
      newTweetContentElement.classList.remove('active');
      newTweetContentElement.style.display = 'none';
    } else if (tabName === 'new') {
      newTweetTab.classList.add('active');
      replyTab.classList.remove('active');
      newTweetContentElement.classList.add('active');
      newTweetContentElement.style.display = 'flex';
      replyContent.classList.remove('active');
      replyContent.style.display = 'none';
      updateGenerateButton(); // Add this line to update the button state when switching to the New Tweet tab
    }
  }

  replyTab.addEventListener('click', () => switchTab('reply'));
  newTweetTab.addEventListener('click', () => switchTab('new'));

  // Ensure the Tweet Response tab is open by default
  switchTab('reply');

  console.log("Popup script initialized");

  // Test function to manually update the textarea
  window.testUpdate = function(text) {
    console.log("Testing manual update of tweetResponse");
    if (tweetResponse) {
      tweetResponse.value = text;
      console.log("tweetResponse value after manual update:", tweetResponse.value);
      setLoading(false);
      setEditButtonsState(true);
    } else {
      console.error("tweetResponse element not found in manual test");
    }
  };

  // Call loadSavedNewTweetContent when the popup is opened
  loadSavedNewTweetContent();
});