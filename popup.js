const statusMessage = document.getElementById("status_message");
const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

resetPageButton.addEventListener("click", async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "RESET_PAGE",
      source: "popup"
    });

    if (response && response.status){
      statusMessage.innerHTML = "Status: " + response.status;
    }
  }catch (error) {
    console.error("Error sending message: ", error);
  }
});

scanAgainButton.addEventListener("click", async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SCAN_AGAIN",
      source: "popup"
    });

    if (response && response.status){
      statusMessage.innerHTML = "Status: " + response.status;
    }
  } catch (error) {
    console.error("Error sending message: ", error)
  }
})