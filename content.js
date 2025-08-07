// Keep track of what is already processed
const processedImages = new Set()
const processedTexts = new Set()
const processedIframes = new Set()

let payloadImages = []
let payloadTexts = []
let payloadIframes = []

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type){
    case "PAYLOAD":
      console.log(message.payload);
  }
});

function process_images(images){
  for (let i = 0; i < images.length; i++){
    let image = images[i];
    if (image.width > 30 && image.height > 30) {
      if (image.src && !processedImages.has(image)){
        let xpath_ = generate_xpath(image);

        let temp_image = {
          "alt": image.alt,
          "src": image.src,
          "xpath": xpath_
        }
        processedImages.add(temp_image);
      }
    }
  }

  payloadImages = Array.from(processedImages);

}

function process_texts(texts){
  const text_arr = Array.from(texts);

  for (let j = 0; j < text_arr.length; j++){
    let text = text_arr[j];

    let xpath_ = generate_xpath(text);
    
    let processed_text = {
      'id': j,
      'type': "text",
      'xpath': xpath_,
      'text': text.innerHTML
    }

    processedTexts.add(processed_text);
  }

  payloadTexts = Array.from(processedTexts);

}

function process_videos(videos) {

}

function process_iframes(iframes){

}

function generate_xpath(element){
  if (!element || element.nodeType !== Node.ELEMENT_NODE){
    return "";
  }

  const pathParts = [];
  let currentNode = element;

  while(currentNode && currentNode.nodeType === Node.ELEMENT_NODE){
    const tagName = currentNode.tagName.toLowerCase();
    let segment = tagName;

    const parent = currentNode.parentNode;
    if (parent && parent.nodeType === Node.ELEMENT_NODE){
      const sameTagSiblings = Array.from(parent.children).filter(
        (child) => 
          child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === tagName
      );
      
      if (sameTagSiblings.length > 1){
        const index = sameTagSiblings.indexOf(currentNode) + 1;
        segment += `[${index}]`;
      }
    }

    pathParts.unshift(segment);

    currentNode = parent;

  }

  return pathParts.length > 0 ? "/" + pathParts.join("/") : "";
}

function scrapeInitial() {
  // Images
  let images = document.querySelectorAll('img');
  process_images(images);

  // Text
  const text_selectors = 'p, h1, h2, h3, h4, h5, h6, div, span, a, li, td, th, label, button';
  const all_raw_text_elements = document.querySelectorAll(text_selectors);
  const  text_elements = new Set();

  all_raw_text_elements.forEach((element) => {
    const tagName = element.tagName.toUpperCase();
    if (tagName === 'SCRIPT' || tagName === 'STYLE'){
      return;
    }

    if (element.textContent.trim().length > 0){
      text_elements.add(element);
    }
  });
  //process_texts(text_elements);
  processedTexts.add("Hello")
  let videos = document.querySelectorAll('video');

  let audios = document.querySelectorAll('audio');

  let iframes = document.querySelectorAll('iframe');


  setTimeout(async () => {
    await send_payload();
  }, 5000);
}

async function send_payload(){
  try {
    const response = await chrome.runtime.sendMessage({
    type: "PAYLOAD",
    payload: {
      text: {
        data: payloadTexts,
        source: "content"
      },
      images: {
        data: payloadImages,
        source: "content"
      }
    }
    });
    const processed_payload = response;
    highlight_elements(processed_payload);
  } catch (error) {
      console.log(error);
  }
}

function highlight_elements(payload){
  for (const item of payload){
    let temp = document.evaluate(item.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (item.confidence > 0.8){
      temp.style.setProperty("box-shadow", "inset 0 0 10px #0f0", "important");
      temp.style.setProperty("border-radius", "1.25em", "important")
    } else if (item.confidence > 0.5){
      temp.style.setProperty("border", "2px solid #4CAF50", "important");
      temp.style.setProperty("border-radius", "1.25em", "important")
    } else {
      temp.style.setProperty("border", "2px solid #4CAF50", "important");
      temp.style.setProperty("border-radius", "1.25em", "important")
    }
  }
}

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  scrapeInitial();
} else {
  window.addEventListener('DOMContentLoaded', setup);
}