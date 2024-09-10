console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');
  
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
    editTweet("Make the previous response more concise");
  });
  moreConservativeButton.addEventListener('click', () => {
    console.log("More conservative button clicked");
    editTweet("Make the previous response more politically conservative");
  });
  moreLiberalButton.addEventListener('click', () => {
    console.log("More liberal button clicked");
    editTweet("Make the previous response more politically liberal");
  });
  moreUniqueButton.addEventListener('click', () => {
    console.log("More unique button clicked");
    editTweet("Re-do your response and make it more unique");
  });
  moreContrarianButton.addEventListener('click', () => {
    console.log("More contrarian button clicked");
    editTweet("Re-make your response with a more contrarian perspective");
  });
  moreAgreeableButton.addEventListener('click', () => {
    console.log("More agreeable button clicked");
    editTweet("Re-make your response and make it more agreeable and complementary to the tweet");
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

  const fileUpload = document.getElementById('fileUpload');
  const uploadButton = document.getElementById('uploadButton');
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

  let uploadedFile = null;
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
      const isDisabled = !(uploadedFile || linkInput.value.trim());
      generateNewTweet.disabled = isDisabled;
      if (isDisabled) {
        generateNewTweet.setAttribute('title', 'Please upload a file or enter a link');
      } else {
        generateNewTweet.removeAttribute('title');
      }
    }
  }

  fileUpload.addEventListener('change', (event) => {
    uploadedFile = event.target.files[0];
    updateGenerateButton();
  });

  linkInput.addEventListener('input', updateGenerateButton);

  uploadButton.addEventListener('click', () => fileUpload.click());

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
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
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

      console.log('Uploaded file:', uploadedFile);
      console.log('Link input:', linkInput.value);

      if (uploadedFile) {
        content = await readFileContent(uploadedFile);
        console.log('File content:', content.substring(0, 100) + '...');
      }

      if (linkInput.value.trim()) {
        linkUrl = linkInput.value.trim();
        const linkContent = await extractLinkContent(linkUrl);
        content += '\n\n' + linkContent;
        console.log('Link content:', linkContent.substring(0, 100) + '...');
      }

      const prompt = isSingleTweet
        ? `Please write a single 280 character tweet based on the content from the following content. Make sure to exclude content that is not relevant to broader message/article included below: ${content}${linkUrl ? ` Source link: ${linkUrl}` : ''}`
        : `Please create a thread from following content. Make sure to exclude content that is not relevant to broader message/article included below. Do not make the thread longer than it needs to be, and use only 280 character tweets. Write the thread sequentially, but separate the threads by "%TWEET%". ${content}${linkUrl ? ` Source link: ${linkUrl}` : ''}`;

      console.log('Final prompt:', prompt.substring(0, 100) + '...');

      try {
        const response = await chrome.runtime.sendMessage({
          action: "generateNewTweet",
          prompt: prompt,
          isSingleTweet: isSingleTweet
        });

        console.log('Response from background script:', response);

        if (response.error) {
          throw new Error(response.error);
        }

        if (isSingleTweet) {
          displayNewTweet(response.tweet);
          newTweetContent = response.tweet;
        } else {
          displayThread(response.tweets);
          newTweetContent = response.tweets;
        }
        newTweetIsSingleTweet = isSingleTweet;

        // Update newTweetChatHistory
        newTweetChatHistory = [
          { role: "system", content: "You are a professional Tweeter. Please generate tweets based on the given information." },
          { role: "user", content: prompt },
          { role: "assistant", content: isSingleTweet ? response.tweet : response.tweets.join('%TWEET%') }
        ];

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
    uploadedFile = null;
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