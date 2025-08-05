const statusMessage = document.getElementById("status_message");
const scanAgainButton = document.getElementById("scan_again");

scanAgainButton.addEventListener(("click"), (e) => {
  const response = chrome.runtime.sendMessage({
    type: "SCAN_AGAIN",
    payload: {
      source: "popup"
    }
  });

  change_ui(response);
});

async function change_ui(response){
  const raw_response = await response;
  statusMessage.innerHTML = "Status: " + raw_response.status;
}

function setup(){
  const response = chrome.runtime.sendMessage({
    type: "GET_STATUS",
    payload: {
      source: "popup"
    }
  });
  change_ui(response);
}

setup();