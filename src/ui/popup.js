const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

const dropdown = document.querySelector('.dropdown');
const toggle = dropdown.querySelector('.dropdown_toggle');
const menu = dropdown.querySelector('.dropdown_menu');


window.addEventListener("DOMContentLoaded", async () => {
  const {state} = await chrome.storage.local.get("state");
  checkPopupState(state);

  // Handle export menu
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  menu.addEventListener('click', e => e.stopPropagation());

  document.addEventListener('click', () => {
    if (dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Handle download report
  document.getElementById("download_report").addEventListener("click", () => {
    download_report();
  });

  // Handle send report to website
  document.getElementById("send_report").addEventListener("click", () => {
    send_report_website();
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    checkPopupState(changes.state.newValue);
    if (changes.state.newValue.status == "Completed"){
      update_results(changes);
      dropdown.classList.remove("hidden");
      resultsBreakdown.classList.remove("hidden");
   }
  }
});

function updateUI(data) {
  statusMessage.innerHTML = `Status: ${data.status}`;
}

scanAgainButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";
  resultsBreakdown.classList.add("hidden");
  dropdown.classList.add("hidden");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SCAN_AGAIN",
      source: "popup",
    });
    console.log("SCANNED AGAIN")
    updateUI(response);
  } catch (error) {
    console.error("Error sending SCAN_AGAIN message: ", error);
    updateUI({ status: "Error" });
  }
});

resetPageButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";
  resultsBreakdown.classList.add("hidden");
  dropdown.classList.add("hidden");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RESET_PAGE_POPUP",
      source: "popup",
    });
    updateUI(response);
  } catch (error) {
    console.error("Error sending RESET_PAGE message: ", error);
    updateUI({ status: "Error" });
  }
});

function checkPopupState(stateObj) {
  updateUI(stateObj);
  scanAgainButton.className = "";
  resetPageButton.className = "";
}

function update_results(changes){
  const listItem = document.createElement("li");
  listItem.innerHTML = `${changes.state.newValue.aiCount} elements are 90% likely to be AI`
  resultsList.appendChild(listItem);
}

function send_report_website(){
  console.log("Sending report to website.")
}

function download_report(){

  // Need to decide what the report will look like, contain, etc.
  // Probably just a bigger summary, maybe some examples.

  console.log("Downloading full report.")
}