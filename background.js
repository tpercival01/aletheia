let tabStates = {};
let isCurrentlyProcessing = false;
let tabID = "";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isCurrentlyProcessing){return;}
  isCurrentlyProcessing = true;

  switch (message.type){
    case "PAYLOAD":
      scanStatus = 'processing';
      change_popup();
      payload = process_payload(message.payload);
      sendResponse(payload);
      return true;
      
    case "SCAN_AGAIN":
      console.log("Asking content to scan again");
      sendResponse({status: 'Scanning'});
      isCurrentlyProcessing = false;
      return true;
    
    case "RESET_PAGE":
      console.log("Resetting page and all contents.");
      sendResponse({status: "Resetting"});
      isCurrentlyProcessing = false;
      return true;
  }
});

function process_payload(payload){
  let text_payload = payload.text.data;
  let images_payload = payload.images.data;

  for (const image of images_payload){
    image.confidence = Math.random();
  }

  return images_payload;
}

function change_popup(){
  //chrome.action.setIcon({path: "icons/indicator_16_b.png"});
  chrome.action.setBadgeText({text: "..."});
  chrome.action.setBadgeBackgroundColor({color: "#777777"});
}