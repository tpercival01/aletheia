/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!********************************!*\
  !*** ./src/content/content.js ***!
  \********************************/
__webpack_require__.r(__webpack_exports__);
const work_queue = [];
let processing = false;
const duplicate_set = new Set();
let mutation_observer;
const xpaths_reset = [];
let scheduler;

let DEBUG = true;
function log(...args) {
  if (!DEBUG) return;
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
  start_scheduler();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESET_PAGE_CONTENT") {
    log("RESETTING");
    reset_everything();
    sendResponse({ status: "RESET_DONE" });
  } else if (message.type === "SCAN_AGAIN") {
    log("SCANNING AGAIN");
    reset_everything();
    init_content_script();
    sendResponse({ status: "PROCESSING" });
  }
});

const visibleObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      process_text(entry.target);
      visibleObserver.unobserve(entry.target);
      log("IntersectionObserver: node visible ->", entry.target.tagName);
    }
  }
});

function start_mutation_observer() {
  if (mutation_observer) {
    mutation_observer.disconnect();
  }

  mutation_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.matches("p, div, article, section")
        ) {
          visibleObserver.observe(node);
          log("MutationObserver: new node detected -> ", node.tagName);
        }
      }
    }
  });

  mutation_observer.observe(document.body, { childList: true, subtree: true });
}

// chunks: array of media (texts, images, videos)
function add_to_queue(chunks) {
  log(`Queue add: +${chunks.length}, total ${work_queue.length}`);
  if (work_queue.length < 300) {
    for (const chunk of chunks) {
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

    log(
      `Batch processed; response ${
        Array.isArray(response?.text) ? response.text.length : 0
      } items`
    );
    log("AFTER PROCESSING: ", processed_payload);
    highlight_elements(processed_payload);
  } catch (error) {
    log(error);
  }
}

function start_scheduler() {
  if (scheduler) return;
  scheduler = setInterval(() => {
    schedule_send_payload();
  }, 5000);
}

function stop_scheduler() {
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
}

/* 
  IMAGES
  Scrape and Clean
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
*/

function process_text(tree) {
  const texts = [];
  const parentTexts = new Map();

  const EXCLUDE_SELECTORS = `
    header, nav, footer, aside, script, style, noscript, button,
    meta, title, link, path, [role=banner], [role=navigation],
    [role=complementary], [role=menubar], [role=menu],
    [aria-hidden=true], .nav, .navbar, .menu, .header, .footer,
    .sidebar, .cookie, .popup, .modal, .ad, .advertisement
  `;

  const TEXT_BLACKLIST = [
    "promoted",
    "click here",
    "read more",
    "share",
    "login",
    "sign in",
    "submit",
    "privacy policy",
    "user agreement",
    "all rights reserved",
    "learn more",
    "terms and conditions",
    "t&cs apply",
  ];

  const walker = document.createTreeWalker(tree, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent) continue;

    if (parent.matches(EXCLUDE_SELECTORS) || parent.closest(EXCLUDE_SELECTORS))
      continue;
    const existing = parentTexts.get(parent) || "";
    parentTexts.set(parent, existing + " " + node.textContent);
  }

  parentTexts.forEach((rawText, parent) => {
    const text = rawText.replace(/\s+/g, " ").trim();
    if (!text) return;

    const wordCount = (text.match(/\b\w+\b/g) || []).length;
    if (wordCount < 5) return;
    if (text === text.toUpperCase()) return;
    if (TEXT_BLACKLIST.some((t) => text.toLowerCase().includes(t))) return;

    const style = getComputedStyle(parent);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    )
      return;

    const rect = parent.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 20) return;

    const norm = text.toLowerCase().slice(0, 300);
    if (duplicate_set.has(norm)) return;
    duplicate_set.add(norm);

    const maxWords = 300;
    const words = text.split(/\s+/);
    const xpath = generate_xpath(parent);
    if (words.length > maxWords) {
      for (let i = 0; i < words.length; i += maxWords) {
        const chunk = words.slice(i, i + maxWords).join(" ");
        texts.push({ text: chunk, xpath: xpath });
      }
    } else {
      texts.push({ text: text, xpath: xpath });
      xpaths_reset.push(xpath);
    }
  });

  add_to_queue(texts);
}

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
IMAGES: NOT DONE
VIDEO: NOT DONE
AUDIO: NOT DONE
*/

function scrape_initial() {
  log("Running initial scrape on page load");

  process_text(document.body);
  log(`Initial scrape complete — queue now has ${work_queue.length} items`);
}

/* 
Create and add tooltips.
*/

const tooltipEl = document.createElement("div");
tooltipEl.id = "aletheia-tooltip";
Object.assign(tooltipEl.style, {
  position: "fixed",
  padding: "6px 10px",
  borderRadius: "4px",
  fontSize: "14px",
  background: "rgba(0,0,0,0.85)",
  color: "#fff",
  maxWidth: "300px",
  whiteSpace: "pre-wrap",
  pointerEvents: "none",
  visibility: "hidden",
  opacity: "0",
  transition: "opacity 0.2s",
  zIndex: "999999",
});

document.body.appendChild(tooltipEl);
function showTooltipFor(el, text) {
  const rect = el.getBoundingClientRect();
  tooltipEl.textContent = text;
  tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
  tooltipEl.style.top = `${rect.top - 10}px`;
  tooltipEl.style.transform = "translate(-50%, -100%)";
  tooltipEl.style.visibility = "visible";
  tooltipEl.style.opacity = "1";
}

function hideTooltip() {
  tooltipEl.style.opacity = "0";
  tooltipEl.style.visibility = "hidden";
}

function removeGlobalTooltip() {
  if (tooltipEl && tooltipEl.parentNode) {
    tooltipEl.style.opacity = "0";
    tooltipEl.style.visibility = "hidden";
    tooltipEl.parentNode.removeChild(tooltipEl);
  }
  log("Tooltip removed from DOM");
}

/*
HIGHLIGHTING ELEMENTS:

Text: DONE
Images: NOT DONE
Video: NOT DONE
Audio: NOT DONE

*/
async function highlight_elements(payload) {
  log("raw payload: ", payload);
  log("Highlighting started for batch", payload.text?.length || 0);
  processing = false;

  if (!payload || !Array.isArray(payload.text)) return;

  let thresholds;

  try {
    thresholds = await get_settings("thresholds");
  } catch (err) {
    console.error("Failed", err);
    thresholds = [35, 85];
  }

  const [low, high] = thresholds;

  let aiCount = 0;
  let humanCount = 0;
  let middleCount = 0;

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
      log("highlight target ", el, "->", el?.textContent.slice(0, 150));
      if (!el) {
        console.warn("Element not found with xpath: ", item.xpath);
        continue;
      }
      let score;

      if (item.AI) {
        score = item.AI;
      } else {
        score = item.HUMAN;
      }

      el.addEventListener("mouseenter", (e) => {
        showTooltipFor(
          el,
          score > high
            ? `Item is most likely AI.\nAI: ${score.toFixed(2)}`
            : score > low
            ? `Item could be AI, proceed with caution.\nAI: ${score.toFixed(2)}`
            : `Item is most likely not AI.\nAI: ${score.toFixed(2)}`
        );
      });

      el.addEventListener("mouseleave", hideTooltip);

      if (score > high) {
        aiCount += 1;
        el.style.setProperty("border", "5px solid red", "important");
      } else if (score > low) {
        middleCount += 1;
        el.style.setProperty("border", "5px solid yellow", "important");
      } else {
        humanCount += 1;
        el.style.setProperty("border", "5px solid green", "important");
      }
    } catch (err) {
      console.error("Error", err, item);
    }
  }

  chrome.storage.local.get("state", ({ state }) => {
    const newState = {
      aiPosCount: aiCount,
      aiSomeCount: middleCount,
      humanCount: humanCount,
      startedAt: state.startedAt,
      status: state.status,
      tabID: state.tabID,
    };

    chrome.storage.local.set({ state: newState });
  });

  log("Highlighting finished, processing flag reset");

  schedule_send_payload();
}

function reset_everything() {
  // TEXT
  for (const item of xpaths_reset) {
    const el = document.evaluate(
      item,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (!el) continue;

    el.style.setProperty("border", "none", "important");
  }

  // IMAGES

  // VIDEOS

  // AUDIO

  work_queue.length = 0;
  duplicate_set.clear();
  mutation_observer?.disconnect();
  stop_scheduler();
  removeGlobalTooltip();
}

async function get_settings(param) {
  const result = await chrome.storage.local.get("settings");
  const settings = result.settings;

  if (param == "all") {
    return settings;
  } else if (param == "thresholds") {
    return settings?.thresholds;
  }
}

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LCJ3ZWJwYWNrOi8vYWxldGhlaWEvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9hbGV0aGVpYS8uL3NyYy9jb250ZW50L2NvbnRlbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhlIHJlcXVpcmUgc2NvcGVcbnZhciBfX3dlYnBhY2tfcmVxdWlyZV9fID0ge307XG5cbiIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImNvbnN0IHdvcmtfcXVldWUgPSBbXTtcbmxldCBwcm9jZXNzaW5nID0gZmFsc2U7XG5jb25zdCBkdXBsaWNhdGVfc2V0ID0gbmV3IFNldCgpO1xubGV0IG11dGF0aW9uX29ic2VydmVyO1xuY29uc3QgeHBhdGhzX3Jlc2V0ID0gW107XG5sZXQgc2NoZWR1bGVyO1xuXG5sZXQgREVCVUcgPSB0cnVlO1xuZnVuY3Rpb24gbG9nKC4uLmFyZ3MpIHtcbiAgaWYgKCFERUJVRykgcmV0dXJuO1xuICBjb25zb2xlLmxvZyhcIiVjW0FsZXRoZWlhXVwiLCBcImNvbG9yOiAjN2Q1N2ZmOyBmb250LXdlaWdodDogYm9sZDtcIiwgLi4uYXJncyk7XG59XG5cbmlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImxvYWRpbmdcIikge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBpbml0X2NvbnRlbnRfc2NyaXB0KTtcbn0gZWxzZSB7XG4gIGluaXRfY29udGVudF9zY3JpcHQoKTtcbn1cblxuZnVuY3Rpb24gaW5pdF9jb250ZW50X3NjcmlwdCgpIHtcbiAgbG9nKFwiSW5pdGlhbGl6aW5nIGNvbnRlbnQgc2NyaXB0XCIpO1xuICBzdGFydF9tdXRhdGlvbl9vYnNlcnZlcigpO1xuICBzY3JhcGVfaW5pdGlhbCgpO1xuICBzdGFydF9zY2hlZHVsZXIoKTtcbn1cblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlJFU0VUX1BBR0VfQ09OVEVOVFwiKSB7XG4gICAgbG9nKFwiUkVTRVRUSU5HXCIpO1xuICAgIHJlc2V0X2V2ZXJ5dGhpbmcoKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBzdGF0dXM6IFwiUkVTRVRfRE9ORVwiIH0pO1xuICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTQ0FOX0FHQUlOXCIpIHtcbiAgICBsb2coXCJTQ0FOTklORyBBR0FJTlwiKTtcbiAgICByZXNldF9ldmVyeXRoaW5nKCk7XG4gICAgaW5pdF9jb250ZW50X3NjcmlwdCgpO1xuICAgIHNlbmRSZXNwb25zZSh7IHN0YXR1czogXCJQUk9DRVNTSU5HXCIgfSk7XG4gIH1cbn0pO1xuXG5jb25zdCB2aXNpYmxlT2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKGVudHJpZXMpID0+IHtcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKGVudHJ5LmlzSW50ZXJzZWN0aW5nKSB7XG4gICAgICBwcm9jZXNzX3RleHQoZW50cnkudGFyZ2V0KTtcbiAgICAgIHZpc2libGVPYnNlcnZlci51bm9ic2VydmUoZW50cnkudGFyZ2V0KTtcbiAgICAgIGxvZyhcIkludGVyc2VjdGlvbk9ic2VydmVyOiBub2RlIHZpc2libGUgLT5cIiwgZW50cnkudGFyZ2V0LnRhZ05hbWUpO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIHN0YXJ0X211dGF0aW9uX29ic2VydmVyKCkge1xuICBpZiAobXV0YXRpb25fb2JzZXJ2ZXIpIHtcbiAgICBtdXRhdGlvbl9vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gIH1cblxuICBtdXRhdGlvbl9vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcbiAgICBmb3IgKGNvbnN0IG11dGF0aW9uIG9mIG11dGF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBub2RlIG9mIG11dGF0aW9uLmFkZGVkTm9kZXMpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXG4gICAgICAgICAgbm9kZS5tYXRjaGVzKFwicCwgZGl2LCBhcnRpY2xlLCBzZWN0aW9uXCIpXG4gICAgICAgICkge1xuICAgICAgICAgIHZpc2libGVPYnNlcnZlci5vYnNlcnZlKG5vZGUpO1xuICAgICAgICAgIGxvZyhcIk11dGF0aW9uT2JzZXJ2ZXI6IG5ldyBub2RlIGRldGVjdGVkIC0+IFwiLCBub2RlLnRhZ05hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBtdXRhdGlvbl9vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgY2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlIH0pO1xufVxuXG4vLyBjaHVua3M6IGFycmF5IG9mIG1lZGlhICh0ZXh0cywgaW1hZ2VzLCB2aWRlb3MpXG5mdW5jdGlvbiBhZGRfdG9fcXVldWUoY2h1bmtzKSB7XG4gIGxvZyhgUXVldWUgYWRkOiArJHtjaHVua3MubGVuZ3RofSwgdG90YWwgJHt3b3JrX3F1ZXVlLmxlbmd0aH1gKTtcbiAgaWYgKHdvcmtfcXVldWUubGVuZ3RoIDwgMzAwKSB7XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIHdvcmtfcXVldWUucHVzaChjaHVuayk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNjaGVkdWxlX3NlbmRfcGF5bG9hZCgpIHtcbiAgbG9nKGBTY2hlZHVsZXIgdGljayDigJQgcXVldWU6JHt3b3JrX3F1ZXVlLmxlbmd0aH0sIHByb2Nlc3Npbmc6JHtwcm9jZXNzaW5nfWApO1xuICBpZiAocHJvY2Vzc2luZykgcmV0dXJuO1xuICBpZiAod29ya19xdWV1ZS5sZW5ndGggPT09IDApIHJldHVybjtcblxuICBjb25zdCBiYXRjaCA9IHdvcmtfcXVldWUuc3BsaWNlKDAsIDUwKTtcbiAgcHJvY2Vzc2luZyA9IHRydWU7XG5cbiAgdHJ5IHtcbiAgICBsb2coYFNlbmRpbmcgYmF0Y2ggb2YgJHtiYXRjaC5sZW5ndGh9YCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICB0eXBlOiBcIlBST0NFU1NcIixcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgdGV4dDoge1xuICAgICAgICAgIGRhdGE6IGJhdGNoLFxuICAgICAgICAgIHNvdXJjZTogXCJjb250ZW50XCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgcHJvY2Vzc2VkX3BheWxvYWQgPSByZXNwb25zZTtcblxuICAgIGxvZyhcbiAgICAgIGBCYXRjaCBwcm9jZXNzZWQ7IHJlc3BvbnNlICR7XG4gICAgICAgIEFycmF5LmlzQXJyYXkocmVzcG9uc2U/LnRleHQpID8gcmVzcG9uc2UudGV4dC5sZW5ndGggOiAwXG4gICAgICB9IGl0ZW1zYFxuICAgICk7XG4gICAgbG9nKFwiQUZURVIgUFJPQ0VTU0lORzogXCIsIHByb2Nlc3NlZF9wYXlsb2FkKTtcbiAgICBoaWdobGlnaHRfZWxlbWVudHMocHJvY2Vzc2VkX3BheWxvYWQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZyhlcnJvcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhcnRfc2NoZWR1bGVyKCkge1xuICBpZiAoc2NoZWR1bGVyKSByZXR1cm47XG4gIHNjaGVkdWxlciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICBzY2hlZHVsZV9zZW5kX3BheWxvYWQoKTtcbiAgfSwgNTAwMCk7XG59XG5cbmZ1bmN0aW9uIHN0b3Bfc2NoZWR1bGVyKCkge1xuICBpZiAoc2NoZWR1bGVyKSB7XG4gICAgY2xlYXJJbnRlcnZhbChzY2hlZHVsZXIpO1xuICAgIHNjaGVkdWxlciA9IG51bGw7XG4gIH1cbn1cblxuLyogXG4gIElNQUdFU1xuICBTY3JhcGUgYW5kIENsZWFuXG4qL1xuXG5mdW5jdGlvbiBwcm9jZXNzX2ltYWdlcyhpbWFnZXMpIHtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbWFnZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBpbWFnZSA9IGltYWdlc1tpXTtcbiAgICBpZiAoaW1hZ2Uud2lkdGggPiAzMCAmJiBpbWFnZS5oZWlnaHQgPiAzMCkge1xuICAgICAgaWYgKGltYWdlLnNyYyAmJiAhc2Vlbi5oYXMoaW1hZ2Uuc3JjKSkge1xuICAgICAgICBsZXQgeHBhdGhfID0gZ2VuZXJhdGVfeHBhdGgoaW1hZ2UpO1xuICAgICAgICBzZWVuLmFkZChpbWFnZS5zcmMpO1xuICAgICAgICBsZXQgcHJvY2Vzc2VkX2ltYWdlID0ge1xuICAgICAgICAgIGFsdDogaW1hZ2UuYWx0LFxuICAgICAgICAgIHNyYzogaW1hZ2Uuc3JjLFxuICAgICAgICAgIHhwYXRoOiB4cGF0aF8sXG4gICAgICAgIH07XG4gICAgICAgIHBheWxvYWQuaW1hZ2VzLnB1c2gocHJvY2Vzc2VkX2ltYWdlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyogXG4gIFRFWFRcbiAgU2NyYXBlIGFuZCBDbGVhblxuKi9cblxuZnVuY3Rpb24gcHJvY2Vzc190ZXh0KHRyZWUpIHtcbiAgY29uc3QgdGV4dHMgPSBbXTtcbiAgY29uc3QgcGFyZW50VGV4dHMgPSBuZXcgTWFwKCk7XG5cbiAgY29uc3QgRVhDTFVERV9TRUxFQ1RPUlMgPSBgXG4gICAgaGVhZGVyLCBuYXYsIGZvb3RlciwgYXNpZGUsIHNjcmlwdCwgc3R5bGUsIG5vc2NyaXB0LCBidXR0b24sXG4gICAgbWV0YSwgdGl0bGUsIGxpbmssIHBhdGgsIFtyb2xlPWJhbm5lcl0sIFtyb2xlPW5hdmlnYXRpb25dLFxuICAgIFtyb2xlPWNvbXBsZW1lbnRhcnldLCBbcm9sZT1tZW51YmFyXSwgW3JvbGU9bWVudV0sXG4gICAgW2FyaWEtaGlkZGVuPXRydWVdLCAubmF2LCAubmF2YmFyLCAubWVudSwgLmhlYWRlciwgLmZvb3RlcixcbiAgICAuc2lkZWJhciwgLmNvb2tpZSwgLnBvcHVwLCAubW9kYWwsIC5hZCwgLmFkdmVydGlzZW1lbnRcbiAgYDtcblxuICBjb25zdCBURVhUX0JMQUNLTElTVCA9IFtcbiAgICBcInByb21vdGVkXCIsXG4gICAgXCJjbGljayBoZXJlXCIsXG4gICAgXCJyZWFkIG1vcmVcIixcbiAgICBcInNoYXJlXCIsXG4gICAgXCJsb2dpblwiLFxuICAgIFwic2lnbiBpblwiLFxuICAgIFwic3VibWl0XCIsXG4gICAgXCJwcml2YWN5IHBvbGljeVwiLFxuICAgIFwidXNlciBhZ3JlZW1lbnRcIixcbiAgICBcImFsbCByaWdodHMgcmVzZXJ2ZWRcIixcbiAgICBcImxlYXJuIG1vcmVcIixcbiAgICBcInRlcm1zIGFuZCBjb25kaXRpb25zXCIsXG4gICAgXCJ0JmNzIGFwcGx5XCIsXG4gIF07XG5cbiAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0cmVlLCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG5cbiAgd2hpbGUgKHdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgY29uc3Qgbm9kZSA9IHdhbGtlci5jdXJyZW50Tm9kZTtcbiAgICBjb25zdCBwYXJlbnQgPSBub2RlLnBhcmVudEVsZW1lbnQ7XG4gICAgaWYgKCFwYXJlbnQpIGNvbnRpbnVlO1xuXG4gICAgaWYgKHBhcmVudC5tYXRjaGVzKEVYQ0xVREVfU0VMRUNUT1JTKSB8fCBwYXJlbnQuY2xvc2VzdChFWENMVURFX1NFTEVDVE9SUykpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBleGlzdGluZyA9IHBhcmVudFRleHRzLmdldChwYXJlbnQpIHx8IFwiXCI7XG4gICAgcGFyZW50VGV4dHMuc2V0KHBhcmVudCwgZXhpc3RpbmcgKyBcIiBcIiArIG5vZGUudGV4dENvbnRlbnQpO1xuICB9XG5cbiAgcGFyZW50VGV4dHMuZm9yRWFjaCgocmF3VGV4dCwgcGFyZW50KSA9PiB7XG4gICAgY29uc3QgdGV4dCA9IHJhd1RleHQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xuICAgIGlmICghdGV4dCkgcmV0dXJuO1xuXG4gICAgY29uc3Qgd29yZENvdW50ID0gKHRleHQubWF0Y2goL1xcYlxcdytcXGIvZykgfHwgW10pLmxlbmd0aDtcbiAgICBpZiAod29yZENvdW50IDwgNSkgcmV0dXJuO1xuICAgIGlmICh0ZXh0ID09PSB0ZXh0LnRvVXBwZXJDYXNlKCkpIHJldHVybjtcbiAgICBpZiAoVEVYVF9CTEFDS0xJU1Quc29tZSgodCkgPT4gdGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHQpKSkgcmV0dXJuO1xuXG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKHBhcmVudCk7XG4gICAgaWYgKFxuICAgICAgc3R5bGUuZGlzcGxheSA9PT0gXCJub25lXCIgfHxcbiAgICAgIHN0eWxlLnZpc2liaWxpdHkgPT09IFwiaGlkZGVuXCIgfHxcbiAgICAgIHN0eWxlLm9wYWNpdHkgPT09IFwiMFwiXG4gICAgKVxuICAgICAgcmV0dXJuO1xuXG4gICAgY29uc3QgcmVjdCA9IHBhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAocmVjdC53aWR0aCA8IDEwMCB8fCByZWN0LmhlaWdodCA8IDIwKSByZXR1cm47XG5cbiAgICBjb25zdCBub3JtID0gdGV4dC50b0xvd2VyQ2FzZSgpLnNsaWNlKDAsIDMwMCk7XG4gICAgaWYgKGR1cGxpY2F0ZV9zZXQuaGFzKG5vcm0pKSByZXR1cm47XG4gICAgZHVwbGljYXRlX3NldC5hZGQobm9ybSk7XG5cbiAgICBjb25zdCBtYXhXb3JkcyA9IDMwMDtcbiAgICBjb25zdCB3b3JkcyA9IHRleHQuc3BsaXQoL1xccysvKTtcbiAgICBjb25zdCB4cGF0aCA9IGdlbmVyYXRlX3hwYXRoKHBhcmVudCk7XG4gICAgaWYgKHdvcmRzLmxlbmd0aCA+IG1heFdvcmRzKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdvcmRzLmxlbmd0aDsgaSArPSBtYXhXb3Jkcykge1xuICAgICAgICBjb25zdCBjaHVuayA9IHdvcmRzLnNsaWNlKGksIGkgKyBtYXhXb3Jkcykuam9pbihcIiBcIik7XG4gICAgICAgIHRleHRzLnB1c2goeyB0ZXh0OiBjaHVuaywgeHBhdGg6IHhwYXRoIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0cy5wdXNoKHsgdGV4dDogdGV4dCwgeHBhdGg6IHhwYXRoIH0pO1xuICAgICAgeHBhdGhzX3Jlc2V0LnB1c2goeHBhdGgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYWRkX3RvX3F1ZXVlKHRleHRzKTtcbn1cblxuLy8gZWxlbWVudDogYSBodG1sIG5vZGVcbmZ1bmN0aW9uIGdlbmVyYXRlX3hwYXRoKGVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50IHx8IGVsZW1lbnQubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICBjb25zdCBwYXRoUGFydHMgPSBbXTtcbiAgbGV0IGN1cnJlbnROb2RlID0gZWxlbWVudDtcblxuICB3aGlsZSAoY3VycmVudE5vZGUgJiYgY3VycmVudE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgY29uc3QgdGFnTmFtZSA9IGN1cnJlbnROb2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBsZXQgc2VnbWVudCA9IHRhZ05hbWU7XG5cbiAgICBjb25zdCBwYXJlbnQgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIGlmIChwYXJlbnQgJiYgcGFyZW50Lm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgY29uc3Qgc2FtZVRhZ1NpYmxpbmdzID0gQXJyYXkuZnJvbShwYXJlbnQuY2hpbGRyZW4pLmZpbHRlcihcbiAgICAgICAgKGNoaWxkKSA9PlxuICAgICAgICAgIGNoaWxkLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSAmJlxuICAgICAgICAgIGNoaWxkLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gdGFnTmFtZVxuICAgICAgKTtcblxuICAgICAgaWYgKHNhbWVUYWdTaWJsaW5ncy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc2FtZVRhZ1NpYmxpbmdzLmluZGV4T2YoY3VycmVudE5vZGUpICsgMTtcbiAgICAgICAgc2VnbWVudCArPSBgWyR7aW5kZXh9XWA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGF0aFBhcnRzLnVuc2hpZnQoc2VnbWVudCk7XG5cbiAgICBjdXJyZW50Tm9kZSA9IHBhcmVudDtcbiAgfVxuXG4gIHJldHVybiBwYXRoUGFydHMubGVuZ3RoID4gMCA/IFwiL1wiICsgcGF0aFBhcnRzLmpvaW4oXCIvXCIpIDogXCJcIjtcbn1cblxuLypcblNDUkFQRSBIVE1MIEVMRU1FTlRTOlxuXG5URVhUOiBET05FXG5JTUFHRVM6IE5PVCBET05FXG5WSURFTzogTk9UIERPTkVcbkFVRElPOiBOT1QgRE9ORVxuKi9cblxuZnVuY3Rpb24gc2NyYXBlX2luaXRpYWwoKSB7XG4gIGxvZyhcIlJ1bm5pbmcgaW5pdGlhbCBzY3JhcGUgb24gcGFnZSBsb2FkXCIpO1xuXG4gIHByb2Nlc3NfdGV4dChkb2N1bWVudC5ib2R5KTtcbiAgbG9nKGBJbml0aWFsIHNjcmFwZSBjb21wbGV0ZSDigJQgcXVldWUgbm93IGhhcyAke3dvcmtfcXVldWUubGVuZ3RofSBpdGVtc2ApO1xufVxuXG4vKiBcbkNyZWF0ZSBhbmQgYWRkIHRvb2x0aXBzLlxuKi9cblxuY29uc3QgdG9vbHRpcEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbnRvb2x0aXBFbC5pZCA9IFwiYWxldGhlaWEtdG9vbHRpcFwiO1xuT2JqZWN0LmFzc2lnbih0b29sdGlwRWwuc3R5bGUsIHtcbiAgcG9zaXRpb246IFwiZml4ZWRcIixcbiAgcGFkZGluZzogXCI2cHggMTBweFwiLFxuICBib3JkZXJSYWRpdXM6IFwiNHB4XCIsXG4gIGZvbnRTaXplOiBcIjE0cHhcIixcbiAgYmFja2dyb3VuZDogXCJyZ2JhKDAsMCwwLDAuODUpXCIsXG4gIGNvbG9yOiBcIiNmZmZcIixcbiAgbWF4V2lkdGg6IFwiMzAwcHhcIixcbiAgd2hpdGVTcGFjZTogXCJwcmUtd3JhcFwiLFxuICBwb2ludGVyRXZlbnRzOiBcIm5vbmVcIixcbiAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgb3BhY2l0eTogXCIwXCIsXG4gIHRyYW5zaXRpb246IFwib3BhY2l0eSAwLjJzXCIsXG4gIHpJbmRleDogXCI5OTk5OTlcIixcbn0pO1xuXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRvb2x0aXBFbCk7XG5mdW5jdGlvbiBzaG93VG9vbHRpcEZvcihlbCwgdGV4dCkge1xuICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHRvb2x0aXBFbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gIHRvb2x0aXBFbC5zdHlsZS5sZWZ0ID0gYCR7cmVjdC5sZWZ0ICsgcmVjdC53aWR0aCAvIDJ9cHhgO1xuICB0b29sdGlwRWwuc3R5bGUudG9wID0gYCR7cmVjdC50b3AgLSAxMH1weGA7XG4gIHRvb2x0aXBFbC5zdHlsZS50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZSgtNTAlLCAtMTAwJSlcIjtcbiAgdG9vbHRpcEVsLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcbiAgdG9vbHRpcEVsLnN0eWxlLm9wYWNpdHkgPSBcIjFcIjtcbn1cblxuZnVuY3Rpb24gaGlkZVRvb2x0aXAoKSB7XG4gIHRvb2x0aXBFbC5zdHlsZS5vcGFjaXR5ID0gXCIwXCI7XG4gIHRvb2x0aXBFbC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlR2xvYmFsVG9vbHRpcCgpIHtcbiAgaWYgKHRvb2x0aXBFbCAmJiB0b29sdGlwRWwucGFyZW50Tm9kZSkge1xuICAgIHRvb2x0aXBFbC5zdHlsZS5vcGFjaXR5ID0gXCIwXCI7XG4gICAgdG9vbHRpcEVsLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuICAgIHRvb2x0aXBFbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRvb2x0aXBFbCk7XG4gIH1cbiAgbG9nKFwiVG9vbHRpcCByZW1vdmVkIGZyb20gRE9NXCIpO1xufVxuXG4vKlxuSElHSExJR0hUSU5HIEVMRU1FTlRTOlxuXG5UZXh0OiBET05FXG5JbWFnZXM6IE5PVCBET05FXG5WaWRlbzogTk9UIERPTkVcbkF1ZGlvOiBOT1QgRE9ORVxuXG4qL1xuYXN5bmMgZnVuY3Rpb24gaGlnaGxpZ2h0X2VsZW1lbnRzKHBheWxvYWQpIHtcbiAgbG9nKFwicmF3IHBheWxvYWQ6IFwiLCBwYXlsb2FkKTtcbiAgbG9nKFwiSGlnaGxpZ2h0aW5nIHN0YXJ0ZWQgZm9yIGJhdGNoXCIsIHBheWxvYWQudGV4dD8ubGVuZ3RoIHx8IDApO1xuICBwcm9jZXNzaW5nID0gZmFsc2U7XG5cbiAgaWYgKCFwYXlsb2FkIHx8ICFBcnJheS5pc0FycmF5KHBheWxvYWQudGV4dCkpIHJldHVybjtcblxuICBsZXQgdGhyZXNob2xkcztcblxuICB0cnkge1xuICAgIHRocmVzaG9sZHMgPSBhd2FpdCBnZXRfc2V0dGluZ3MoXCJ0aHJlc2hvbGRzXCIpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkXCIsIGVycik7XG4gICAgdGhyZXNob2xkcyA9IFszNSwgODVdO1xuICB9XG5cbiAgY29uc3QgW2xvdywgaGlnaF0gPSB0aHJlc2hvbGRzO1xuXG4gIGxldCBhaUNvdW50ID0gMDtcbiAgbGV0IGh1bWFuQ291bnQgPSAwO1xuICBsZXQgbWlkZGxlQ291bnQgPSAwO1xuXG4gIGZvciAoY29uc3QgaXRlbSBvZiBwYXlsb2FkLnRleHQpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKCFpdGVtIHx8ICFpdGVtLnhwYXRoKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgZWwgPSBkb2N1bWVudC5ldmFsdWF0ZShcbiAgICAgICAgaXRlbS54cGF0aCxcbiAgICAgICAgZG9jdW1lbnQsXG4gICAgICAgIG51bGwsXG4gICAgICAgIFhQYXRoUmVzdWx0LkZJUlNUX09SREVSRURfTk9ERV9UWVBFLFxuICAgICAgICBudWxsXG4gICAgICApLnNpbmdsZU5vZGVWYWx1ZTtcbiAgICAgIGxvZyhcImhpZ2hsaWdodCB0YXJnZXQgXCIsIGVsLCBcIi0+XCIsIGVsPy50ZXh0Q29udGVudC5zbGljZSgwLCAxNTApKTtcbiAgICAgIGlmICghZWwpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiRWxlbWVudCBub3QgZm91bmQgd2l0aCB4cGF0aDogXCIsIGl0ZW0ueHBhdGgpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxldCBzY29yZTtcblxuICAgICAgaWYgKGl0ZW0uQUkpIHtcbiAgICAgICAgc2NvcmUgPSBpdGVtLkFJO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2NvcmUgPSBpdGVtLkhVTUFOO1xuICAgICAgfVxuXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VlbnRlclwiLCAoZSkgPT4ge1xuICAgICAgICBzaG93VG9vbHRpcEZvcihcbiAgICAgICAgICBlbCxcbiAgICAgICAgICBzY29yZSA+IGhpZ2hcbiAgICAgICAgICAgID8gYEl0ZW0gaXMgbW9zdCBsaWtlbHkgQUkuXFxuQUk6ICR7c2NvcmUudG9GaXhlZCgyKX1gXG4gICAgICAgICAgICA6IHNjb3JlID4gbG93XG4gICAgICAgICAgICA/IGBJdGVtIGNvdWxkIGJlIEFJLCBwcm9jZWVkIHdpdGggY2F1dGlvbi5cXG5BSTogJHtzY29yZS50b0ZpeGVkKDIpfWBcbiAgICAgICAgICAgIDogYEl0ZW0gaXMgbW9zdCBsaWtlbHkgbm90IEFJLlxcbkFJOiAke3Njb3JlLnRvRml4ZWQoMil9YFxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWxlYXZlXCIsIGhpZGVUb29sdGlwKTtcblxuICAgICAgaWYgKHNjb3JlID4gaGlnaCkge1xuICAgICAgICBhaUNvdW50ICs9IDE7XG4gICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KFwiYm9yZGVyXCIsIFwiNXB4IHNvbGlkIHJlZFwiLCBcImltcG9ydGFudFwiKTtcbiAgICAgIH0gZWxzZSBpZiAoc2NvcmUgPiBsb3cpIHtcbiAgICAgICAgbWlkZGxlQ291bnQgKz0gMTtcbiAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoXCJib3JkZXJcIiwgXCI1cHggc29saWQgeWVsbG93XCIsIFwiaW1wb3J0YW50XCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaHVtYW5Db3VudCArPSAxO1xuICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShcImJvcmRlclwiLCBcIjVweCBzb2xpZCBncmVlblwiLCBcImltcG9ydGFudFwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvclwiLCBlcnIsIGl0ZW0pO1xuICAgIH1cbiAgfVxuXG4gIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcInN0YXRlXCIsICh7IHN0YXRlIH0pID0+IHtcbiAgICBjb25zdCBuZXdTdGF0ZSA9IHtcbiAgICAgIGFpUG9zQ291bnQ6IGFpQ291bnQsXG4gICAgICBhaVNvbWVDb3VudDogbWlkZGxlQ291bnQsXG4gICAgICBodW1hbkNvdW50OiBodW1hbkNvdW50LFxuICAgICAgc3RhcnRlZEF0OiBzdGF0ZS5zdGFydGVkQXQsXG4gICAgICBzdGF0dXM6IHN0YXRlLnN0YXR1cyxcbiAgICAgIHRhYklEOiBzdGF0ZS50YWJJRCxcbiAgICB9O1xuXG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgc3RhdGU6IG5ld1N0YXRlIH0pO1xuICB9KTtcblxuICBsb2coXCJIaWdobGlnaHRpbmcgZmluaXNoZWQsIHByb2Nlc3NpbmcgZmxhZyByZXNldFwiKTtcblxuICBzY2hlZHVsZV9zZW5kX3BheWxvYWQoKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRfZXZlcnl0aGluZygpIHtcbiAgLy8gVEVYVFxuICBmb3IgKGNvbnN0IGl0ZW0gb2YgeHBhdGhzX3Jlc2V0KSB7XG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5ldmFsdWF0ZShcbiAgICAgIGl0ZW0sXG4gICAgICBkb2N1bWVudCxcbiAgICAgIG51bGwsXG4gICAgICBYUGF0aFJlc3VsdC5GSVJTVF9PUkRFUkVEX05PREVfVFlQRSxcbiAgICAgIG51bGxcbiAgICApLnNpbmdsZU5vZGVWYWx1ZTtcblxuICAgIGlmICghZWwpIGNvbnRpbnVlO1xuXG4gICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoXCJib3JkZXJcIiwgXCJub25lXCIsIFwiaW1wb3J0YW50XCIpO1xuICB9XG5cbiAgLy8gSU1BR0VTXG5cbiAgLy8gVklERU9TXG5cbiAgLy8gQVVESU9cblxuICB3b3JrX3F1ZXVlLmxlbmd0aCA9IDA7XG4gIGR1cGxpY2F0ZV9zZXQuY2xlYXIoKTtcbiAgbXV0YXRpb25fb2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgc3RvcF9zY2hlZHVsZXIoKTtcbiAgcmVtb3ZlR2xvYmFsVG9vbHRpcCgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRfc2V0dGluZ3MocGFyYW0pIHtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFwic2V0dGluZ3NcIik7XG4gIGNvbnN0IHNldHRpbmdzID0gcmVzdWx0LnNldHRpbmdzO1xuXG4gIGlmIChwYXJhbSA9PSBcImFsbFwiKSB7XG4gICAgcmV0dXJuIHNldHRpbmdzO1xuICB9IGVsc2UgaWYgKHBhcmFtID09IFwidGhyZXNob2xkc1wiKSB7XG4gICAgcmV0dXJuIHNldHRpbmdzPy50aHJlc2hvbGRzO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=