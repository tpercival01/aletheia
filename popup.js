document.addEventListener("DOMContentLoaded", () => {
    const takeScreenshotBtn = document.getElementById("takeScreenshotBtn");
    const captureAreaBtn = document.getElementById("captureAreaBtn");
    const fullPageBtn = document.getElementById("fullPageBtn");
    const statusMessage = document.getElementById("statusMessage");
  
    takeScreenshotBtn.addEventListener("click", async () => {
      statusMessage.textContent = "Taking screenshot...";
      statusMessage.className = "status-message"; 
  
      try {
        const response = await chrome.runtime.sendMessage({
          action: "takeScreenshot"
        });
  
        if (response.status === "screenshot_taken_and_saved") {
          statusMessage.textContent = "Screenshot taken and saved successfully!";
          statusMessage.classList.add("success");

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
  
    captureAreaBtn.addEventListener("click", () => {
      statusMessage.textContent = "This feature is coming soon!";
      statusMessage.className = "status-message";
    });
  
    fullPageBtn.addEventListener("click", () => {
      statusMessage.textContent = "This feature is coming soon!";
      statusMessage.className = "status-message";
    });
  });