// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log("Super Screenshot Tool installed.");
  });
  
  // Listener for messages from popup.js or content.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "takeScreenshot") {
      console.log("Received 'takeScreenshot' message from popup.");
      takeScreenshot(sendResponse);
      return true; // Indicate that sendResponse will be called asynchronously
    } else if (message.action === "saveScreenshot") {
      console.log("Received 'saveScreenshot' message from content script with data:", message.dataUrl);
      // In this basic example, we assume 'takeScreenshot' in background
      // directly handles saving. If a content script was to prepare a specific
      // area and send it, this path would be used.
      // For now, this is a placeholder if content.js were to send image data.
      if (message.dataUrl) {
        saveBase64AsImage(message.dataUrl, "captured_area.png");
        sendResponse({ status: "screenshot_saved" });
      } else {
        sendResponse({ status: "error", message: "No dataUrl provided for saving." });
      }
    }
  });
  
  /**
   * Captures the visible area of the current tab and initiates a download.
   * @param {function} sendResponse Callback to send response back to the caller.
   */
  async function takeScreenshot(sendResponse) {
    try {
      // Capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: "png",
        quality: 90
      });
      console.log("Screenshot captured:", dataUrl.substring(0, 50) + "...");
  
      // Generate a filename
      const filename = `screenshot_${new Date().toISOString().replace(/:/g, "-").slice(0, 19)}.png`;
  
      // Download the image
      chrome.downloads.download(
        {
          url: dataUrl,
          filename: filename,
          saveAs: false // Set to true if you want the "Save As" dialog
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed:", chrome.runtime.lastError.message);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
          } else {
            console.log(`Screenshot saved with download ID: ${downloadId}`);
            sendResponse({ status: "screenshot_taken_and_saved", url: dataUrl });
          }
        }
      );
    } catch (error) {
      console.error("Error taking screenshot:", error);
      sendResponse({ status: "error", message: error.message });
    }
  }
  
  /**
   * Helper function to save a base64 Data URL as an image file.
   * Useful if a content script processes an image and sends base64 data.
   * @param {string} dataUrl The base64 encoded image data URL.
   * @param {string} filename The desired filename.
   */
  function saveBase64AsImage(dataUrl, filename) {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Error saving base64 image:", chrome.runtime.lastError.message);
        } else {
          console.log(`Base64 image saved with download ID: ${downloadId}`);
        }
      }
    );
  }