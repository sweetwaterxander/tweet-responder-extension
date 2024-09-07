console.log('Content script loaded');

function extractTweet() {
  const tweetElement = document.querySelector('[data-testid="tweetText"]');
  return tweetElement ? tweetElement.textContent.trim() : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTweet") {
    const tweetContent = extractTweet();
    if (tweetContent) {
      console.log("Tweet extracted:", tweetContent);
      sendResponse({tweet: tweetContent});
    } else {
      console.error("No tweet found on this page.");
      sendResponse({error: "No tweet found on this page."});
    }
  }
  return true; // Indicates that the response is asynchronous
});