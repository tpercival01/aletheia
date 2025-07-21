chrome.runtime.onInstalled.addListener(() => {
    console.log("Super Screenshot Tool installed.");
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "takeScreenshot") {
      console.log("Received 'takeScreenshot' message from popup.");
      takeScreenshot(sendResponse);
      return true; 
    } else if (message.action === "saveScreenshot") {
      console.log("Received 'saveScreenshot' message from content script with data:", message.dataUrl);

      if (message.dataUrl) {
        saveBase64AsImage(message.dataUrl, "captured_area.png");
        sendResponse({ status: "screenshot_saved" });
      } else {
        sendResponse({ status: "error", message: "No dataUrl provided for saving." });
      }
    }
  });

  async function takeScreenshot(sendResponse) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: "png",
        quality: 90
      });
      console.log("Screenshot captured:", dataUrl.substring(0, 50) + "...");
  
      const filename = `screenshot_${new Date().toISOString().replace(/:/g, "-").slice(0, 19)}.png`;
  
      chrome.downloads.download(
        {
          url: dataUrl,
          filename: filename,
          saveAs: false 
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