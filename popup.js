document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM content loaded");

  const generateButton = document.getElementById('generateTweet');
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

  // Add this after you define the editButtons array
  const firstEditButton = editButtons[0];
  const lastEditButton = editButtons[editButtons.length - 1];

  // Add these class names to the first and last edit buttons
  firstEditButton.classList.add('first-edit-button');
  lastEditButton.classList.add('last-edit-button');

  // Add this at the end of your DOMContentLoaded event listener
  editButtons.forEach(button => {
    button.addEventListener('mousemove', (e) => {
      if (button.disabled) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        button.style.setProperty('--mouse-x', `${e.clientX}px`);
        button.style.setProperty('--mouse-y', `${e.clientY}px`);
      }
    });
  });

  function updateHoverPosition(e, button) {
    // Remove this function as we no longer need to track mouse position
  }

  editButtons.forEach(button => {
    // Remove these event listeners as they're no longer needed
    // button.addEventListener('mousemove', (e) => updateHoverPosition(e, button));
    // button.addEventListener('mouseenter', (e) => updateHoverPosition(e, button));
  });

  // Remove any other code that sets --mouse-x and --mouse-y CSS variables
});