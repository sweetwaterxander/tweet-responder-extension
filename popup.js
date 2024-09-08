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
  const newTweetContent = document.getElementById('newTweetContent');

  const fileUpload = document.getElementById('fileUpload');
  const uploadButton = document.getElementById('uploadButton');
  const linkInput = document.getElementById('linkInput');
  const singleTweetButton = document.getElementById('singleTweetButton');
  const threadButton = document.getElementById('threadButton');

  function switchTab(tabName) {
    if (tabName === 'reply') {
      replyTab.classList.add('active');
      newTweetTab.classList.remove('active');
      replyContent.classList.add('active');
      replyContent.style.display = 'flex';
      newTweetContent.classList.remove('active');
      newTweetContent.style.display = 'none';
    } else if (tabName === 'new') {
      newTweetTab.classList.add('active');
      replyTab.classList.remove('active');
      newTweetContent.classList.add('active');
      newTweetContent.style.display = 'flex';
      replyContent.classList.remove('active');
      replyContent.style.display = 'none';
    }
  }

  replyTab.addEventListener('click', () => switchTab('reply'));
  newTweetTab.addEventListener('click', () => switchTab('new'));

  // Ensure the Tweet Response tab is open by default
  switchTab('reply');

  uploadButton.addEventListener('click', () => fileUpload.click());

  singleTweetButton.addEventListener('click', () => {
    singleTweetButton.classList.add('active');
    threadButton.classList.remove('active');
  });

  threadButton.addEventListener('click', () => {
    threadButton.classList.add('active');
    singleTweetButton.classList.remove('active');
  });

  // ... rest of your existing code ...
});