const work_queue = [];
let processing = false;
const duplicate_set = new Set();
let mutation_observer;

function log(...args) {
  console.log("%c[Aletheia]", "color: #7d57ff; font-weight: bold;", ...args);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init_content_script);
} else {
  init_content_script();
}

function init_content_script() {
  log("Initializing content script");
  start_mutation_observer();
  scrape_initial();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESET_PAGE_CONTENT") {
    console.log("RESETTING");
    reset_everything();
    sendResponse({ status: "RESET_DONE" });
  } else if (message.type === "SCAN_AGAIN") {
    console.log("SCANNING AGAIN");
    scrape_initial();
    sendResponse({ status: "COMPLETED" });
  }
});

const visibleObserver = new IntersectionObserver((entries) => {
  for (const entry of entries){
    if (entry.isIntersecting){
      process_text(entry.target);
      visibleObserver.unobserve(entry.target);
      log("IntersectionObserver: node visible ->", entry.target.tagName);
    }
  }
});

function start_mutation_observer(){
  mutation_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches("p, div, article, section")){
          visibleObserver.observe(node);
          log("MutationObserver: new node detected -> ", node.tagName);
        }
      }
    }
  });

  mutation_observer.observe(document.body, {childList: true, subtree: true});
}

// chunks: array of media (texts, images, videos)
function add_to_queue(chunks){
  log(`Queue add: +${chunks.length}, total ${work_queue.length}`);
  if (work_queue.length < 300){
    for (const chunk of chunks){
      work_queue.push(chunk);
    }
  }
}


async function schedule_send_payload() {
  log(`Scheduler tick — queue:${work_queue.length}, processing:${processing}`);
  if (processing) return;
  if (work_queue.length === 0) return;

  const batch = work_queue.splice(0, 50);
  processing = true;

  try {
    log(`Sending batch of ${batch.length}`);
    const response = await chrome.runtime.sendMessage({
      type: "PROCESS",
      payload: {
        text: {
          data: batch,
          source: "content",
        },
      },
    });

    const processed_payload = response;

    log(`Batch processed; response ${Array.isArray(response?.text) ? response.text.length : 0} items`);

    highlight_elements(processed_payload);
  } catch (error) {
    console.log(error);
  }
}

setInterval(() => {
  schedule_send_payload();
}, 5000);

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
        seen.add(image.src);
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

function process_text(tree) {
  const texts = [];

  const EXCLUDE_SELECTORS = `
    header, nav, footer, aside, script, style, noscript, button,
    meta, title, link, path, [role=banner], [role=navigation],
    [role=complementary], [role=menubar], [role=menu],
    [aria-hidden=true], .nav, .navbar, .menu, .header, .footer,
    .sidebar, .cookie, .popup, .modal, .ad, .advertisement
  `;

  const TEXT_BLACKLIST = [
    "promoted", "click here", "read more", "share",
    "login", "sign in", "submit", "privacy policy",
    "user agreement", "all rights reserved", "learn more",
    "terms and conditions", "t&cs apply"
  ];

  const walker = document.createTreeWalker(
    tree,
    NodeFilter.SHOW_TEXT
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent.matches(EXCLUDE_SELECTORS)) continue;
    if (parent.closest(EXCLUDE_SELECTORS)) continue;

    const text = node.textContent.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const wordCount = (text.match(/\b\w+\b/g) || []).length;
    if (wordCount < 20) continue;
    if (text === text.toUpperCase()) continue;
    if (TEXT_BLACKLIST.some((t) => text.toLowerCase().includes(t))) continue;

    const style = getComputedStyle(parent);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

    const rect = parent.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 20) continue;

    // Deduplicate by normalized text hash
    const norm = text.toLowerCase().slice(0, 300);
    if (duplicate_set.has(norm)) continue;
    duplicate_set.add(norm);

    // Chunk long content
    const maxWords = 150;
    const words = text.trim().split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(" "));
    }
    chunks.forEach((chunk) => texts.push({ text: chunk, xpath: generate_xpath(parent) }));
  }

  add_to_queue(texts);
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

// element: a html node
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
IMAGES: DONE
VIDEO: NOT DONE
AUDIO: NOT DONE
*/

function scrape_initial() {
  log("Running initial scrape on page load")
  // IMAGES
  //process_images(images);

  // TEXT
  process_text(document.body);
  log(`Initial scrape complete — queue now has ${work_queue.length} items`);

  // VIDEO
  // process_video(video);

  // AUDIO
  // process_audio(audio);
}

/*
HIGHLIGHTING ELEMENTS:

Text: DONE
Images: NOT DONE
Video: NOT DONE
Audio: NOT DONE

*/
async function highlight_elements(payload) {
  log("Highlighting started for batch", payload.text?.length || 0);
  processing = false;

  if (!payload || !Array.isArray(payload.text)) return;

  let thresholds;

  try {
    thresholds = await get_settings("thresholds");
  } catch (err) {
    console.error("Failed", err);
    thresholds = [0.35, 0.85];
  }

  const [low, high] = thresholds;

  for (const item of payload.text) {
    try {
      if (!item || !item.xpath) continue;

      const el = document.evaluate(
        item.xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (!el) {
        console.warn("Element not found with xpath: ", item.xpath);
        continue;
      }

      if (item.aiScore > high) {
        el.style.setProperty("border", "5px solid red", "important");
      } else if (item.aiScore > low) {
        el.style.setProperty("border", "5px solid yellow", "important");
      } else {
        el.style.setProperty("border", "5px solid green", "important");
      }
    } catch (err) {
      console.error("Error", err, item);
    }
  }


	log("Highlighting finished, processing flag reset");

  schedule_send_payload();
}

function reset_everything() {
  // TEXT
  // TO DO: FIGURE OUT HOW TO RESET EVEYRTHING WITHOUT GLOBAL PAYLOAD

  // for (const item of payloadTexts.data) {
  //   const el = document.evaluate(
  //     item.xpath,
  //     document,
  //     null,
  //     XPathResult.FIRST_ORDERED_NODE_TYPE,
  //     null
  //   ).singleNodeValue;
  //   el.style.setProperty("border", "none", "important");
  // }

  // IMAGES

  // VIDEOS

  // AUDIO

  work_queue = [];
  duplicate_set = new Set();
  mutation_observer?.disconnect();
}

async function get_settings(param){
  const result = await chrome.storage.local.get("settings");
  const settings = result.settings;
  
  if (param == "all"){
    return settings;
  } else if (param == "thresholds"){
    return settings?.thresholds;
  }
}