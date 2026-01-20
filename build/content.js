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

  const batch = work_queue.splice(0, 100);
  processing = true;

  try {
    console.log(`Sending batch of ${batch.length}`);
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
        continue;
      }
      const aiScore = item.AI || 0;
      const humanScore = item.HUMAN || 0;

      const isAI = aiScore > humanScore;
      const winningScore = isAI ? aiScore : humanScore;

      const highThreshold = high / 100;
      const lowThreshold = low / 100;

      el.addEventListener("mouseenter", (e) => {
        let message = "";

        if (isAI && winningScore >= highThreshold) {
          message = "Item is most likely AI.";
        } else if (isAI && winningScore >= lowThreshold) {
          message = "Item could be AI; proceed with caution.";
        } else {
          message = "Item is most likely human-authored.";
        }

        const distribution = `\nAI: ${(aiScore * 100).toFixed(1)}% | Human: ${(
          humanScore * 100
        ).toFixed(1)}%`;

        showTooltipFor(el, message + distribution);
      });

      el.addEventListener("mouseleave", hideTooltip);
      if (isAI && winningScore >= highThreshold) {
        aiCount += 1;
        el.style.setProperty("border", "5px solid red", "important");
    } else if (isAI && winningScore >= lowThreshold) {
        middleCount += 1;
        el.style.setProperty("border", "5px solid yellow", "important");
    } else {
        humanCount += 1;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDdkQsMkJBQTJCLGNBQWM7QUFDekM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsVUFBVTtBQUNWLHVDQUF1QztBQUN2QyxVQUFVO0FBQ1Y7QUFDQTs7QUFFQSxzQ0FBc0MsMkJBQTJCLGFBQWE7QUFDOUU7QUFDQSxxQkFBcUI7O0FBRXJCO0FBQ0EsT0FBTzs7QUFFUDtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBLHVDQUF1QyxPQUFPO0FBQzlDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsK0JBQStCLGlCQUFpQjtBQUNoRCxHQUFHOztBQUVIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWxldGhlaWEvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vYWxldGhlaWEvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9hbGV0aGVpYS8uL3NyYy9jb250ZW50L2NvbnRlbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhlIHJlcXVpcmUgc2NvcGVcbnZhciBfX3dlYnBhY2tfcmVxdWlyZV9fID0ge307XG5cbiIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImNvbnN0IHdvcmtfcXVldWUgPSBbXTtcbmxldCBwcm9jZXNzaW5nID0gZmFsc2U7XG5jb25zdCBkdXBsaWNhdGVfc2V0ID0gbmV3IFNldCgpO1xubGV0IG11dGF0aW9uX29ic2VydmVyO1xuY29uc3QgeHBhdGhzX3Jlc2V0ID0gW107XG5sZXQgc2NoZWR1bGVyO1xuXG5sZXQgREVCVUcgPSB0cnVlO1xuZnVuY3Rpb24gbG9nKC4uLmFyZ3MpIHtcbiAgaWYgKCFERUJVRykgcmV0dXJuO1xuICBjb25zb2xlLmxvZyhcIiVjW0FsZXRoZWlhXVwiLCBcImNvbG9yOiAjN2Q1N2ZmOyBmb250LXdlaWdodDogYm9sZDtcIiwgLi4uYXJncyk7XG59XG5cbmlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImxvYWRpbmdcIikge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBpbml0X2NvbnRlbnRfc2NyaXB0KTtcbn0gZWxzZSB7XG4gIGluaXRfY29udGVudF9zY3JpcHQoKTtcbn1cblxuZnVuY3Rpb24gaW5pdF9jb250ZW50X3NjcmlwdCgpIHtcbiAgbG9nKFwiSW5pdGlhbGl6aW5nIGNvbnRlbnQgc2NyaXB0XCIpO1xuICBzdGFydF9tdXRhdGlvbl9vYnNlcnZlcigpO1xuICBzY3JhcGVfaW5pdGlhbCgpO1xuICBzdGFydF9zY2hlZHVsZXIoKTtcbn1cblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlJFU0VUX1BBR0VfQ09OVEVOVFwiKSB7XG4gICAgbG9nKFwiUkVTRVRUSU5HXCIpO1xuICAgIHJlc2V0X2V2ZXJ5dGhpbmcoKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBzdGF0dXM6IFwiUkVTRVRfRE9ORVwiIH0pO1xuICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTQ0FOX0FHQUlOXCIpIHtcbiAgICBsb2coXCJTQ0FOTklORyBBR0FJTlwiKTtcbiAgICByZXNldF9ldmVyeXRoaW5nKCk7XG4gICAgaW5pdF9jb250ZW50X3NjcmlwdCgpO1xuICAgIHNlbmRSZXNwb25zZSh7IHN0YXR1czogXCJQUk9DRVNTSU5HXCIgfSk7XG4gIH1cbn0pO1xuXG5jb25zdCB2aXNpYmxlT2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKGVudHJpZXMpID0+IHtcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKGVudHJ5LmlzSW50ZXJzZWN0aW5nKSB7XG4gICAgICBwcm9jZXNzX3RleHQoZW50cnkudGFyZ2V0KTtcbiAgICAgIHZpc2libGVPYnNlcnZlci51bm9ic2VydmUoZW50cnkudGFyZ2V0KTtcbiAgICAgIGxvZyhcIkludGVyc2VjdGlvbk9ic2VydmVyOiBub2RlIHZpc2libGUgLT5cIiwgZW50cnkudGFyZ2V0LnRhZ05hbWUpO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIHN0YXJ0X211dGF0aW9uX29ic2VydmVyKCkge1xuICBpZiAobXV0YXRpb25fb2JzZXJ2ZXIpIHtcbiAgICBtdXRhdGlvbl9vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gIH1cblxuICBtdXRhdGlvbl9vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcbiAgICBmb3IgKGNvbnN0IG11dGF0aW9uIG9mIG11dGF0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBub2RlIG9mIG11dGF0aW9uLmFkZGVkTm9kZXMpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXG4gICAgICAgICAgbm9kZS5tYXRjaGVzKFwicCwgZGl2LCBhcnRpY2xlLCBzZWN0aW9uXCIpXG4gICAgICAgICkge1xuICAgICAgICAgIHZpc2libGVPYnNlcnZlci5vYnNlcnZlKG5vZGUpO1xuICAgICAgICAgIGxvZyhcIk11dGF0aW9uT2JzZXJ2ZXI6IG5ldyBub2RlIGRldGVjdGVkIC0+IFwiLCBub2RlLnRhZ05hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBtdXRhdGlvbl9vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgY2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlIH0pO1xufVxuXG4vLyBjaHVua3M6IGFycmF5IG9mIG1lZGlhICh0ZXh0cywgaW1hZ2VzLCB2aWRlb3MpXG5mdW5jdGlvbiBhZGRfdG9fcXVldWUoY2h1bmtzKSB7XG4gIGxvZyhgUXVldWUgYWRkOiArJHtjaHVua3MubGVuZ3RofSwgdG90YWwgJHt3b3JrX3F1ZXVlLmxlbmd0aH1gKTtcbiAgaWYgKHdvcmtfcXVldWUubGVuZ3RoIDwgMzAwKSB7XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIHdvcmtfcXVldWUucHVzaChjaHVuayk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNjaGVkdWxlX3NlbmRfcGF5bG9hZCgpIHtcbiAgbG9nKGBTY2hlZHVsZXIgdGljayDigJQgcXVldWU6JHt3b3JrX3F1ZXVlLmxlbmd0aH0sIHByb2Nlc3Npbmc6JHtwcm9jZXNzaW5nfWApO1xuICBpZiAocHJvY2Vzc2luZykgcmV0dXJuO1xuICBpZiAod29ya19xdWV1ZS5sZW5ndGggPT09IDApIHJldHVybjtcblxuICBjb25zdCBiYXRjaCA9IHdvcmtfcXVldWUuc3BsaWNlKDAsIDEwMCk7XG4gIHByb2Nlc3NpbmcgPSB0cnVlO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFNlbmRpbmcgYmF0Y2ggb2YgJHtiYXRjaC5sZW5ndGh9YCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICB0eXBlOiBcIlBST0NFU1NcIixcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgdGV4dDoge1xuICAgICAgICAgIGRhdGE6IGJhdGNoLFxuICAgICAgICAgIHNvdXJjZTogXCJjb250ZW50XCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgcHJvY2Vzc2VkX3BheWxvYWQgPSByZXNwb25zZTtcbiAgICBsb2coXCJBRlRFUiBQUk9DRVNTSU5HOiBcIiwgcHJvY2Vzc2VkX3BheWxvYWQpO1xuICAgIGhpZ2hsaWdodF9lbGVtZW50cyhwcm9jZXNzZWRfcGF5bG9hZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nKGVycm9yKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdGFydF9zY2hlZHVsZXIoKSB7XG4gIGlmIChzY2hlZHVsZXIpIHJldHVybjtcbiAgc2NoZWR1bGVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIHNjaGVkdWxlX3NlbmRfcGF5bG9hZCgpO1xuICB9LCA1MDAwKTtcbn1cblxuZnVuY3Rpb24gc3RvcF9zY2hlZHVsZXIoKSB7XG4gIGlmIChzY2hlZHVsZXIpIHtcbiAgICBjbGVhckludGVydmFsKHNjaGVkdWxlcik7XG4gICAgc2NoZWR1bGVyID0gbnVsbDtcbiAgfVxufVxuXG4vKiBcbiAgSU1BR0VTXG4gIFNjcmFwZSBhbmQgQ2xlYW5cbiovXG5cbmZ1bmN0aW9uIHByb2Nlc3NfaW1hZ2VzKGltYWdlcykge1xuICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGltYWdlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGltYWdlID0gaW1hZ2VzW2ldO1xuICAgIGlmIChpbWFnZS53aWR0aCA+IDMwICYmIGltYWdlLmhlaWdodCA+IDMwKSB7XG4gICAgICBpZiAoaW1hZ2Uuc3JjICYmICFzZWVuLmhhcyhpbWFnZS5zcmMpKSB7XG4gICAgICAgIGxldCB4cGF0aF8gPSBnZW5lcmF0ZV94cGF0aChpbWFnZSk7XG4gICAgICAgIHNlZW4uYWRkKGltYWdlLnNyYyk7XG4gICAgICAgIGxldCBwcm9jZXNzZWRfaW1hZ2UgPSB7XG4gICAgICAgICAgYWx0OiBpbWFnZS5hbHQsXG4gICAgICAgICAgc3JjOiBpbWFnZS5zcmMsXG4gICAgICAgICAgeHBhdGg6IHhwYXRoXyxcbiAgICAgICAgfTtcbiAgICAgICAgcGF5bG9hZC5pbWFnZXMucHVzaChwcm9jZXNzZWRfaW1hZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKiBcbiAgVEVYVFxuICBTY3JhcGUgYW5kIENsZWFuXG4qL1xuXG5mdW5jdGlvbiBwcm9jZXNzX3RleHQodHJlZSkge1xuICBjb25zdCB0ZXh0cyA9IFtdO1xuICBjb25zdCBwYXJlbnRUZXh0cyA9IG5ldyBNYXAoKTtcblxuICBjb25zdCBFWENMVURFX1NFTEVDVE9SUyA9IGBcbiAgICBoZWFkZXIsIG5hdiwgZm9vdGVyLCBhc2lkZSwgc2NyaXB0LCBzdHlsZSwgbm9zY3JpcHQsIGJ1dHRvbixcbiAgICBtZXRhLCB0aXRsZSwgbGluaywgcGF0aCwgW3JvbGU9YmFubmVyXSwgW3JvbGU9bmF2aWdhdGlvbl0sXG4gICAgW3JvbGU9Y29tcGxlbWVudGFyeV0sIFtyb2xlPW1lbnViYXJdLCBbcm9sZT1tZW51XSxcbiAgICBbYXJpYS1oaWRkZW49dHJ1ZV0sIC5uYXYsIC5uYXZiYXIsIC5tZW51LCAuaGVhZGVyLCAuZm9vdGVyLFxuICAgIC5zaWRlYmFyLCAuY29va2llLCAucG9wdXAsIC5tb2RhbCwgLmFkLCAuYWR2ZXJ0aXNlbWVudFxuICBgO1xuXG4gIGNvbnN0IFRFWFRfQkxBQ0tMSVNUID0gW1xuICAgIFwicHJvbW90ZWRcIixcbiAgICBcImNsaWNrIGhlcmVcIixcbiAgICBcInJlYWQgbW9yZVwiLFxuICAgIFwic2hhcmVcIixcbiAgICBcImxvZ2luXCIsXG4gICAgXCJzaWduIGluXCIsXG4gICAgXCJzdWJtaXRcIixcbiAgICBcInByaXZhY3kgcG9saWN5XCIsXG4gICAgXCJ1c2VyIGFncmVlbWVudFwiLFxuICAgIFwiYWxsIHJpZ2h0cyByZXNlcnZlZFwiLFxuICAgIFwibGVhcm4gbW9yZVwiLFxuICAgIFwidGVybXMgYW5kIGNvbmRpdGlvbnNcIixcbiAgICBcInQmY3MgYXBwbHlcIixcbiAgXTtcblxuICBjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKHRyZWUsIE5vZGVGaWx0ZXIuU0hPV19URVhUKTtcblxuICB3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICBjb25zdCBub2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgIGNvbnN0IHBhcmVudCA9IG5vZGUucGFyZW50RWxlbWVudDtcbiAgICBpZiAoIXBhcmVudCkgY29udGludWU7XG5cbiAgICBpZiAocGFyZW50Lm1hdGNoZXMoRVhDTFVERV9TRUxFQ1RPUlMpIHx8IHBhcmVudC5jbG9zZXN0KEVYQ0xVREVfU0VMRUNUT1JTKSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IGV4aXN0aW5nID0gcGFyZW50VGV4dHMuZ2V0KHBhcmVudCkgfHwgXCJcIjtcbiAgICBwYXJlbnRUZXh0cy5zZXQocGFyZW50LCBleGlzdGluZyArIFwiIFwiICsgbm9kZS50ZXh0Q29udGVudCk7XG4gIH1cblxuICBwYXJlbnRUZXh0cy5mb3JFYWNoKChyYXdUZXh0LCBwYXJlbnQpID0+IHtcbiAgICBjb25zdCB0ZXh0ID0gcmF3VGV4dC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XG4gICAgaWYgKCF0ZXh0KSByZXR1cm47XG5cbiAgICBjb25zdCB3b3JkQ291bnQgPSAodGV4dC5tYXRjaCgvXFxiXFx3K1xcYi9nKSB8fCBbXSkubGVuZ3RoO1xuICAgIGlmICh3b3JkQ291bnQgPCA1KSByZXR1cm47XG4gICAgaWYgKHRleHQgPT09IHRleHQudG9VcHBlckNhc2UoKSkgcmV0dXJuO1xuICAgIGlmIChURVhUX0JMQUNLTElTVC5zb21lKCh0KSA9PiB0ZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModCkpKSByZXR1cm47XG5cbiAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUocGFyZW50KTtcbiAgICBpZiAoXG4gICAgICBzdHlsZS5kaXNwbGF5ID09PSBcIm5vbmVcIiB8fFxuICAgICAgc3R5bGUudmlzaWJpbGl0eSA9PT0gXCJoaWRkZW5cIiB8fFxuICAgICAgc3R5bGUub3BhY2l0eSA9PT0gXCIwXCJcbiAgICApXG4gICAgICByZXR1cm47XG5cbiAgICBjb25zdCByZWN0ID0gcGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmIChyZWN0LndpZHRoIDwgMTAwIHx8IHJlY3QuaGVpZ2h0IDwgMjApIHJldHVybjtcblxuICAgIGNvbnN0IG5vcm0gPSB0ZXh0LnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwgMzAwKTtcbiAgICBpZiAoZHVwbGljYXRlX3NldC5oYXMobm9ybSkpIHJldHVybjtcbiAgICBkdXBsaWNhdGVfc2V0LmFkZChub3JtKTtcblxuICAgIGNvbnN0IG1heFdvcmRzID0gMzAwO1xuICAgIGNvbnN0IHdvcmRzID0gdGV4dC5zcGxpdCgvXFxzKy8pO1xuICAgIGNvbnN0IHhwYXRoID0gZ2VuZXJhdGVfeHBhdGgocGFyZW50KTtcbiAgICBpZiAod29yZHMubGVuZ3RoID4gbWF4V29yZHMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd29yZHMubGVuZ3RoOyBpICs9IG1heFdvcmRzKSB7XG4gICAgICAgIGNvbnN0IGNodW5rID0gd29yZHMuc2xpY2UoaSwgaSArIG1heFdvcmRzKS5qb2luKFwiIFwiKTtcbiAgICAgICAgdGV4dHMucHVzaCh7IHRleHQ6IGNodW5rLCB4cGF0aDogeHBhdGggfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRleHRzLnB1c2goeyB0ZXh0OiB0ZXh0LCB4cGF0aDogeHBhdGggfSk7XG4gICAgICB4cGF0aHNfcmVzZXQucHVzaCh4cGF0aCk7XG4gICAgfVxuICB9KTtcblxuICBhZGRfdG9fcXVldWUodGV4dHMpO1xufVxuXG4vLyBlbGVtZW50OiBhIGh0bWwgbm9kZVxuZnVuY3Rpb24gZ2VuZXJhdGVfeHBhdGgoZWxlbWVudCkge1xuICBpZiAoIWVsZW1lbnQgfHwgZWxlbWVudC5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIGNvbnN0IHBhdGhQYXJ0cyA9IFtdO1xuICBsZXQgY3VycmVudE5vZGUgPSBlbGVtZW50O1xuXG4gIHdoaWxlIChjdXJyZW50Tm9kZSAmJiBjdXJyZW50Tm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gY3VycmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIGxldCBzZWdtZW50ID0gdGFnTmFtZTtcblxuICAgIGNvbnN0IHBhcmVudCA9IGN1cnJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgaWYgKHBhcmVudCAmJiBwYXJlbnQubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICBjb25zdCBzYW1lVGFnU2libGluZ3MgPSBBcnJheS5mcm9tKHBhcmVudC5jaGlsZHJlbikuZmlsdGVyKFxuICAgICAgICAoY2hpbGQpID0+XG4gICAgICAgICAgY2hpbGQubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXG4gICAgICAgICAgY2hpbGQudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0YWdOYW1lXG4gICAgICApO1xuXG4gICAgICBpZiAoc2FtZVRhZ1NpYmxpbmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBzYW1lVGFnU2libGluZ3MuaW5kZXhPZihjdXJyZW50Tm9kZSkgKyAxO1xuICAgICAgICBzZWdtZW50ICs9IGBbJHtpbmRleH1dYDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYXRoUGFydHMudW5zaGlmdChzZWdtZW50KTtcblxuICAgIGN1cnJlbnROb2RlID0gcGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIHBhdGhQYXJ0cy5sZW5ndGggPiAwID8gXCIvXCIgKyBwYXRoUGFydHMuam9pbihcIi9cIikgOiBcIlwiO1xufVxuXG4vKlxuU0NSQVBFIEhUTUwgRUxFTUVOVFM6XG5cblRFWFQ6IERPTkVcbklNQUdFUzogTk9UIERPTkVcblZJREVPOiBOT1QgRE9ORVxuQVVESU86IE5PVCBET05FXG4qL1xuXG5mdW5jdGlvbiBzY3JhcGVfaW5pdGlhbCgpIHtcbiAgbG9nKFwiUnVubmluZyBpbml0aWFsIHNjcmFwZSBvbiBwYWdlIGxvYWRcIik7XG5cbiAgcHJvY2Vzc190ZXh0KGRvY3VtZW50LmJvZHkpO1xuICBsb2coYEluaXRpYWwgc2NyYXBlIGNvbXBsZXRlIOKAlCBxdWV1ZSBub3cgaGFzICR7d29ya19xdWV1ZS5sZW5ndGh9IGl0ZW1zYCk7XG59XG5cbi8qIFxuQ3JlYXRlIGFuZCBhZGQgdG9vbHRpcHMuXG4qL1xuXG5jb25zdCB0b29sdGlwRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xudG9vbHRpcEVsLmlkID0gXCJhbGV0aGVpYS10b29sdGlwXCI7XG5PYmplY3QuYXNzaWduKHRvb2x0aXBFbC5zdHlsZSwge1xuICBwb3NpdGlvbjogXCJmaXhlZFwiLFxuICBwYWRkaW5nOiBcIjZweCAxMHB4XCIsXG4gIGJvcmRlclJhZGl1czogXCI0cHhcIixcbiAgZm9udFNpemU6IFwiMTRweFwiLFxuICBiYWNrZ3JvdW5kOiBcInJnYmEoMCwwLDAsMC44NSlcIixcbiAgY29sb3I6IFwiI2ZmZlwiLFxuICBtYXhXaWR0aDogXCIzMDBweFwiLFxuICB3aGl0ZVNwYWNlOiBcInByZS13cmFwXCIsXG4gIHBvaW50ZXJFdmVudHM6IFwibm9uZVwiLFxuICB2aXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICBvcGFjaXR5OiBcIjBcIixcbiAgdHJhbnNpdGlvbjogXCJvcGFjaXR5IDAuMnNcIixcbiAgekluZGV4OiBcIjk5OTk5OVwiLFxufSk7XG5cbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodG9vbHRpcEVsKTtcbmZ1bmN0aW9uIHNob3dUb29sdGlwRm9yKGVsLCB0ZXh0KSB7XG4gIGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgdG9vbHRpcEVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgdG9vbHRpcEVsLnN0eWxlLmxlZnQgPSBgJHtyZWN0LmxlZnQgKyByZWN0LndpZHRoIC8gMn1weGA7XG4gIHRvb2x0aXBFbC5zdHlsZS50b3AgPSBgJHtyZWN0LnRvcCAtIDEwfXB4YDtcbiAgdG9vbHRpcEVsLnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlKC01MCUsIC0xMDAlKVwiO1xuICB0b29sdGlwRWwuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuICB0b29sdGlwRWwuc3R5bGUub3BhY2l0eSA9IFwiMVwiO1xufVxuXG5mdW5jdGlvbiBoaWRlVG9vbHRpcCgpIHtcbiAgdG9vbHRpcEVsLnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgdG9vbHRpcEVsLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xufVxuXG5mdW5jdGlvbiByZW1vdmVHbG9iYWxUb29sdGlwKCkge1xuICBpZiAodG9vbHRpcEVsICYmIHRvb2x0aXBFbC5wYXJlbnROb2RlKSB7XG4gICAgdG9vbHRpcEVsLnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICB0b29sdGlwRWwuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG4gICAgdG9vbHRpcEVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodG9vbHRpcEVsKTtcbiAgfVxuICBsb2coXCJUb29sdGlwIHJlbW92ZWQgZnJvbSBET01cIik7XG59XG5cbi8qXG5ISUdITElHSFRJTkcgRUxFTUVOVFM6XG5cblRleHQ6IERPTkVcbkltYWdlczogTk9UIERPTkVcblZpZGVvOiBOT1QgRE9ORVxuQXVkaW86IE5PVCBET05FXG5cbiovXG5hc3luYyBmdW5jdGlvbiBoaWdobGlnaHRfZWxlbWVudHMocGF5bG9hZCkge1xuICBsb2coXCJyYXcgcGF5bG9hZDogXCIsIHBheWxvYWQpO1xuICBsb2coXCJIaWdobGlnaHRpbmcgc3RhcnRlZCBmb3IgYmF0Y2hcIiwgcGF5bG9hZC50ZXh0Py5sZW5ndGggfHwgMCk7XG4gIHByb2Nlc3NpbmcgPSBmYWxzZTtcblxuICBpZiAoIXBheWxvYWQgfHwgIUFycmF5LmlzQXJyYXkocGF5bG9hZC50ZXh0KSkgcmV0dXJuO1xuXG4gIGxldCB0aHJlc2hvbGRzO1xuXG4gIHRyeSB7XG4gICAgdGhyZXNob2xkcyA9IGF3YWl0IGdldF9zZXR0aW5ncyhcInRocmVzaG9sZHNcIik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWRcIiwgZXJyKTtcbiAgICB0aHJlc2hvbGRzID0gWzM1LCA4NV07XG4gIH1cblxuICBjb25zdCBbbG93LCBoaWdoXSA9IHRocmVzaG9sZHM7XG5cbiAgbGV0IGFpQ291bnQgPSAwO1xuICBsZXQgaHVtYW5Db3VudCA9IDA7XG4gIGxldCBtaWRkbGVDb3VudCA9IDA7XG5cbiAgZm9yIChjb25zdCBpdGVtIG9mIHBheWxvYWQudGV4dCkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWl0ZW0gfHwgIWl0ZW0ueHBhdGgpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LmV2YWx1YXRlKFxuICAgICAgICBpdGVtLnhwYXRoLFxuICAgICAgICBkb2N1bWVudCxcbiAgICAgICAgbnVsbCxcbiAgICAgICAgWFBhdGhSZXN1bHQuRklSU1RfT1JERVJFRF9OT0RFX1RZUEUsXG4gICAgICAgIG51bGxcbiAgICAgICkuc2luZ2xlTm9kZVZhbHVlO1xuICAgICAgbG9nKFwiaGlnaGxpZ2h0IHRhcmdldCBcIiwgZWwsIFwiLT5cIiwgZWw/LnRleHRDb250ZW50LnNsaWNlKDAsIDE1MCkpO1xuICAgICAgaWYgKCFlbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGFpU2NvcmUgPSBpdGVtLkFJIHx8IDA7XG4gICAgICBjb25zdCBodW1hblNjb3JlID0gaXRlbS5IVU1BTiB8fCAwO1xuXG4gICAgICBjb25zdCBpc0FJID0gYWlTY29yZSA+IGh1bWFuU2NvcmU7XG4gICAgICBjb25zdCB3aW5uaW5nU2NvcmUgPSBpc0FJID8gYWlTY29yZSA6IGh1bWFuU2NvcmU7XG5cbiAgICAgIGNvbnN0IGhpZ2hUaHJlc2hvbGQgPSBoaWdoIC8gMTAwO1xuICAgICAgY29uc3QgbG93VGhyZXNob2xkID0gbG93IC8gMTAwO1xuXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VlbnRlclwiLCAoZSkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG5cbiAgICAgICAgaWYgKGlzQUkgJiYgd2lubmluZ1Njb3JlID49IGhpZ2hUaHJlc2hvbGQpIHtcbiAgICAgICAgICBtZXNzYWdlID0gXCJJdGVtIGlzIG1vc3QgbGlrZWx5IEFJLlwiO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQUkgJiYgd2lubmluZ1Njb3JlID49IGxvd1RocmVzaG9sZCkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBcIkl0ZW0gY291bGQgYmUgQUk7IHByb2NlZWQgd2l0aCBjYXV0aW9uLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1lc3NhZ2UgPSBcIkl0ZW0gaXMgbW9zdCBsaWtlbHkgaHVtYW4tYXV0aG9yZWQuXCI7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkaXN0cmlidXRpb24gPSBgXFxuQUk6ICR7KGFpU2NvcmUgKiAxMDApLnRvRml4ZWQoMSl9JSB8IEh1bWFuOiAkeyhcbiAgICAgICAgICBodW1hblNjb3JlICogMTAwXG4gICAgICAgICkudG9GaXhlZCgxKX0lYDtcblxuICAgICAgICBzaG93VG9vbHRpcEZvcihlbCwgbWVzc2FnZSArIGRpc3RyaWJ1dGlvbik7XG4gICAgICB9KTtcblxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbGVhdmVcIiwgaGlkZVRvb2x0aXApO1xuICAgICAgaWYgKGlzQUkgJiYgd2lubmluZ1Njb3JlID49IGhpZ2hUaHJlc2hvbGQpIHtcbiAgICAgICAgYWlDb3VudCArPSAxO1xuICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShcImJvcmRlclwiLCBcIjVweCBzb2xpZCByZWRcIiwgXCJpbXBvcnRhbnRcIik7XG4gICAgfSBlbHNlIGlmIChpc0FJICYmIHdpbm5pbmdTY29yZSA+PSBsb3dUaHJlc2hvbGQpIHtcbiAgICAgICAgbWlkZGxlQ291bnQgKz0gMTtcbiAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoXCJib3JkZXJcIiwgXCI1cHggc29saWQgeWVsbG93XCIsIFwiaW1wb3J0YW50XCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGh1bWFuQ291bnQgKz0gMTtcbiAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3JcIiwgZXJyLCBpdGVtKTtcbiAgICB9XG4gIH1cblxuICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoXCJzdGF0ZVwiLCAoeyBzdGF0ZSB9KSA9PiB7XG4gICAgY29uc3QgbmV3U3RhdGUgPSB7XG4gICAgICBhaVBvc0NvdW50OiBhaUNvdW50LFxuICAgICAgYWlTb21lQ291bnQ6IG1pZGRsZUNvdW50LFxuICAgICAgaHVtYW5Db3VudDogaHVtYW5Db3VudCxcbiAgICAgIHN0YXJ0ZWRBdDogc3RhdGUuc3RhcnRlZEF0LFxuICAgICAgc3RhdHVzOiBzdGF0ZS5zdGF0dXMsXG4gICAgICB0YWJJRDogc3RhdGUudGFiSUQsXG4gICAgfTtcblxuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHN0YXRlOiBuZXdTdGF0ZSB9KTtcbiAgfSk7XG5cbiAgbG9nKFwiSGlnaGxpZ2h0aW5nIGZpbmlzaGVkLCBwcm9jZXNzaW5nIGZsYWcgcmVzZXRcIik7XG5cbiAgc2NoZWR1bGVfc2VuZF9wYXlsb2FkKCk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0X2V2ZXJ5dGhpbmcoKSB7XG4gIC8vIFRFWFRcbiAgZm9yIChjb25zdCBpdGVtIG9mIHhwYXRoc19yZXNldCkge1xuICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZXZhbHVhdGUoXG4gICAgICBpdGVtLFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBudWxsLFxuICAgICAgWFBhdGhSZXN1bHQuRklSU1RfT1JERVJFRF9OT0RFX1RZUEUsXG4gICAgICBudWxsXG4gICAgKS5zaW5nbGVOb2RlVmFsdWU7XG5cbiAgICBpZiAoIWVsKSBjb250aW51ZTtcblxuICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KFwiYm9yZGVyXCIsIFwibm9uZVwiLCBcImltcG9ydGFudFwiKTtcbiAgfVxuXG4gIC8vIElNQUdFU1xuXG4gIC8vIFZJREVPU1xuXG4gIC8vIEFVRElPXG5cbiAgd29ya19xdWV1ZS5sZW5ndGggPSAwO1xuICBkdXBsaWNhdGVfc2V0LmNsZWFyKCk7XG4gIG11dGF0aW9uX29ic2VydmVyPy5kaXNjb25uZWN0KCk7XG4gIHN0b3Bfc2NoZWR1bGVyKCk7XG4gIHJlbW92ZUdsb2JhbFRvb2x0aXAoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0X3NldHRpbmdzKHBhcmFtKSB7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcInNldHRpbmdzXCIpO1xuICBjb25zdCBzZXR0aW5ncyA9IHJlc3VsdC5zZXR0aW5ncztcblxuICBpZiAocGFyYW0gPT0gXCJhbGxcIikge1xuICAgIHJldHVybiBzZXR0aW5ncztcbiAgfSBlbHNlIGlmIChwYXJhbSA9PSBcInRocmVzaG9sZHNcIikge1xuICAgIHJldHVybiBzZXR0aW5ncz8udGhyZXNob2xkcztcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9