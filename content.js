console.log("Super Screenshot Tool content script loaded.");

// Example of listening for messages from background script or popup
// (e.g., if the background script needed to ask the content script
// to perform an action on the page, like drawing a selection box)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "highlightElements") {
    console.log("Content script received 'highlightElements' message.");
    // In a real scenario, this would involve DOM manipulation
    // For now, just respond.
    sendResponse({ status: "elements_highlighted", count: 0 });
    return true;
  }
  // You could also send messages from content script to background script
  // chrome.runtime.sendMessage({ action: "pageData", data: { title: document.title } });
});