let tabStates = {};
let isCurrentlyProcessing = false;
let tabID = "";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isCurrentlyProcessing){return;}
  isCurrentlyProcessing = true;
  tabID = sender.tab.id;

  tabStates[tabID] = {
    status: 'processing',
    results: []
  }

  switch (message.type){
    case "PARSED_TEXT":
      scanStatus = 'processing';
      change_popup();
    
    case "GET_STATUS":
      sendResponse({status: scanStatus});
      return true;
    
    case "SCAN_AGAIN":
      console.log("Asking content to scan again");
      sendResponse({status: 'Scanning'});
      return true;
  }
});

function change_popup(){
  //chrome.action.setIcon({path: "icons/indicator_16_b.png"});
  chrome.action.setBadgeText({text: "..."});
  chrome.action.setBadgeBackgroundColor({color: "#777777"});
}

setTimeout(() => {
  chrome.action.setIcon({path: "icons/LOGO_128.png"});
  chrome.action.setBadgeText({text:''});
  isCurrentlyProcessing = false;
  tabStates[tabID] = {
    status: 'Complete',
    results: []
  }
}, 5000)