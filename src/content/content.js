const payload = {
  images: [],
  texts: [],
  videos: [],
  audios: []
}

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", scrapeInitial);
} else {
    scrapeInitial();
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESET_PAGE_CONTENT") {
    console.log("RESETTING");
    reset_everything();
    sendResponse({ status: "RESET_DONE" });
  } else if (message.type === "SCAN_AGAIN") {
    console.log("SCANNING AGAIN");
    scrapeInitial();
    sendResponse({ status: "COMPLETED" });
  }
});

/* 
  IMAGES
  Scrape and Clean
  DONE
*/
function process_images(images) {
  const seen = new Set();
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (image.width > 30 && image.height > 30) {
      if (image.src && !seen.has(image.src)) {
        let xpath_ = generate_xpath(image);
        seen.add(image.src)
        let processed_image = {
          alt: image.alt,
          src: image.src,
          xpath: xpath_,
        };
        payload.images.push(processed_image);
      }
    }
  }
}

/* 
  TEXT
  Scrape and Clean
  DONE
*/
function process_text() {
  const EXCLUDE_SELECTORS = [
    'header', 'nav', 'footer', 'aside', 'script', 'style', 'noscript', 'button',
    'meta', 'title', 'link', 'path',
    '[role=banner]', '[role=navigation]', '[role=complementary]', 
    '[role=menubar]', '[role=menu]', '[aria-hidden=true]',
    '.nav', '.navbar', '.menu', '.header', '.footer', '.sidebar', 
    '.cookie', '.popup', '.modal', '.ad', '.advertisement'
  ].join(',');

  const TEXT_BLACKLIST = [
    'promoted', 'click here', 'read more', 'share', 'login', 'sign in', 
    'submit', 'privacy policy', 'user agreement', 'all rights reserved', 
    'learn more', 't&cs apply', 'terms and conditions'
  ];

  const elements = Array.from(document.querySelectorAll('*')).filter(el => {
    if (el.matches(EXCLUDE_SELECTORS)) return false;
    if (el.closest(EXCLUDE_SELECTORS)) return false;
    return true;
  });

  const duplicate_set = new Set();
  const indexMap = new Map();
  payload.texts.length = 0;

  elements.forEach(el => {
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, ' ').trim();
    if (!text) return;

    const words = text.split(" ");
    if (words.length < 10) return;

    if (TEXT_BLACKLIST.some(pattern => text.toLowerCase().includes(pattern))) return;

    if (text === text.toUpperCase()) return;

    const xpath = generate_xpath(el);
    let shouldAdd = true;
    const toRemove = [];
    
    for (let existing of duplicate_set){
      if (xpath.startsWith(existing)){
        toRemove.push(existing);
      } else if (existing.startsWith(xpath)){
        shouldAdd = false;
        break;
      }
    }

    toRemove.forEach(oldPath => {
      duplicate_set.delete(oldPath);
      const idx = indexMap.get(oldPath);
      if (idx !== undefined){
        payload.texts.splice(idx, 1);
        indexMap.delete(oldPath);
        for (let [p,i] of indexMap){
          if (i > idx) indexMap.set(p, i - 1);
        }
      }
    });

    if (shouldAdd){
      duplicate_set.add(xpath);
      const newIndex = payload.texts.length;
      payload.texts.push({text, xpath});
      indexMap.set(xpath, newIndex);
    }
  });


  console.log(payload.texts);
}

/* 
  VIDEO
  Scrape and Clean
  DONE
*/
function process_videos(videos) {}

/* 
  AUDIO
  Scrape and Clean
  DONE
*/
function process_audio(audio) {}

function generate_xpath(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const pathParts = [];
  let currentNode = element;

  while (currentNode && currentNode.nodeType === Node.ELEMENT_NODE) {
    const tagName = currentNode.tagName.toLowerCase();
    let segment = tagName;

    const parent = currentNode.parentNode;
    if (parent && parent.nodeType === Node.ELEMENT_NODE) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (child) =>
          child.nodeType === Node.ELEMENT_NODE &&
          child.tagName.toLowerCase() === tagName
      );

      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(currentNode) + 1;
        segment += `[${index}]`;
      }
    }

    pathParts.unshift(segment);

    currentNode = parent;
  }

  return pathParts.length > 0 ? "/" + pathParts.join("/") : "";
}

/*

SCRAPE HTML ELEMENTS:

TEXT: DONE
IMAGES: NOT DONE
VIDEO: NOT DONE
AUDIO: NOT DONE

*/

function scrapeInitial() {
  // IMAGES
  //process_images(images);

  // TEXT
  process_text();

  // VIDEO
  // process_video(video);

  // AUDIO
  // process_audio(audio);

  send_payload();
}

async function send_payload() {
  console.log("sent payload");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "PROCESS",
      payload: {
        text: {
          data: payload.texts,
          source: "content",
        },
        images: {
          data: payload.images,
          source: "content",
        },
      },
    });
    console.log("received ", response);

    const processed_payload = response;
    console.log(processed_payload);
    //highlight_elements(processed_payload);

  } catch (error) {
    console.log(error);
  }
}

/*
HIGHLIGHTING ELEMENTS:

Text: DONE
Images: NOT DONE
Video: NOT DONE
Audio: NOT DONE

*/
function highlight_elements(payload) {
  if (payload){
    for (const item of payload){
      const el = document.evaluate(item.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (item.aiScore > 0.8){
        el.style.setProperty("border", "5px solid red", "important");
      } else if (item.confidence > 0.5){
        el.style.setProperty("border", "5px solid yellow", "important");
      }
    }
    
  } else if (payload["images"]){
    console.log("images. no images.")
  //   for (const item of payload) {
  //     let temp = document.evaluate(
  //       item.xpath,
  //       document,
  //       null,
  //       XPathResult.FIRST_ORDERED_NODE_TYPE,
  //       null
  //     ).singleNodeValue;
  //     if (item.confidence > 0.8) {
  //       temp.style.setProperty(
  //         "box-shadow",
  //         "inset 0 0 10px #eb4034",
  //         "important"
  //       );
  //       temp.style.setProperty("border-radius", "1.25em", "important");
  //     } else if (item.confidence > 0.5) {
  //       temp.style.setProperty("box-shadow", "2px solid #ffbf00", "important");
  //       temp.style.setProperty("border-radius", "1.25em", "important");
  //     } 
  //   }
  }
}

function reset_everything() {

 // TEXT
  for (const item of payloadTexts.data){
    const el = document.evaluate(item.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    el.style.setProperty("border", "none", "important");
  }

  // IMAGES

  // VIDEOS

  // AUDIO

  // reset all payloads
  payloadImages = [];
  payloadTexts = [];
  payloadIframes = [];
  payloadVideos = [];
}
