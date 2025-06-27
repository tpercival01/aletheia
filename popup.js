// popup.js

document.addEventListener("DOMContentLoaded", () => {
    const takeScreenshotBtn = document.getElementById("takeScreenshotBtn");
    const captureAreaBtn = document.getElementById("captureAreaBtn");
    const fullPageBtn = document.getElementById("fullPageBtn");
    const statusMessage = document.getElementById("statusMessage");
  
    // Event listener for the "Take Screenshot" button
    takeScreenshotBtn.addEventListener("click", async () => {
      statusMessage.textContent = "Taking screenshot...";
      statusMessage.className = "status-message"; // Reset class
  
      try {
        // Send a message to the background script to take a screenshot
        const response = await chrome.runtime.sendMessage({
          action: "takeScreenshot"
        });
  
        if (response.status === "screenshot_taken_and_saved") {
          statusMessage.textContent = "Screenshot taken and saved successfully!";
          statusMessage.classList.add("success");
          // Optionally close the popup after a brief delay
          // setTimeout(() => window.close(), 1500);
        } else if (response.status === "error") {
          statusMessage.textContent = `Error: ${response.message}`;
          statusMessage.classList.add("error");
        }
      } catch (error) {
        statusMessage.textContent = `Communication error: ${error.message}`;
        statusMessage.classList.add("error");
        console.error("Error communicating with background script:", error);
      }
    });
  
    // Event listeners for future features (currently disabled)
    captureAreaBtn.addEventListener("click", () => {
      statusMessage.textContent = "This feature is coming soon!";
      statusMessage.className = "status-message";
    });
  
    fullPageBtn.addEventListener("click", () => {
      statusMessage.textContent = "This feature is coming soon!";
      statusMessage.className = "status-message";
    });
  });