document.addEventListener("DOMContentLoaded", () => {
    const statusMessage = document.getElementById("statusMessage");
    try {
      const response = chrome.runtime.sendMessage({
        action: "grabHTML"
      });

      if (response.status === "html_grabbed"){
        statusMessage.innerHTML = "Successfully grabbed HTML on load.";
        statusMessage.classList.add("success");
      }
    } catch (error) {
      statusMessage.textContent = `Communication error: ${error.message}`;
      statusMessage.classList.add("error");
      console.error("Error communicating with background script:", error);
    }
  });