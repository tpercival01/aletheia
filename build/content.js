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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QkFBK0IsaUJBQWlCO0FBQ2hELEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2FsZXRoZWlhL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2FsZXRoZWlhL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vYWxldGhlaWEvLi9zcmMvY29udGVudC9jb250ZW50LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSByZXF1aXJlIHNjb3BlXG52YXIgX193ZWJwYWNrX3JlcXVpcmVfXyA9IHt9O1xuXG4iLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJjb25zdCB3b3JrX3F1ZXVlID0gW107XHJcbmxldCBwcm9jZXNzaW5nID0gZmFsc2U7XHJcbmNvbnN0IGR1cGxpY2F0ZV9zZXQgPSBuZXcgU2V0KCk7XHJcbmxldCBtdXRhdGlvbl9vYnNlcnZlcjtcclxuY29uc3QgeHBhdGhzX3Jlc2V0ID0gW107XHJcbmxldCBzY2hlZHVsZXI7XHJcblxyXG5sZXQgREVCVUcgPSB0cnVlO1xyXG5mdW5jdGlvbiBsb2coLi4uYXJncykge1xyXG4gIGlmICghREVCVUcpIHJldHVybjtcclxuICBjb25zb2xlLmxvZyhcIiVjW0FsZXRoZWlhXVwiLCBcImNvbG9yOiAjN2Q1N2ZmOyBmb250LXdlaWdodDogYm9sZDtcIiwgLi4uYXJncyk7XHJcbn1cclxuXHJcbmlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImxvYWRpbmdcIikge1xyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGluaXRfY29udGVudF9zY3JpcHQpO1xyXG59IGVsc2Uge1xyXG4gIGluaXRfY29udGVudF9zY3JpcHQoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdF9jb250ZW50X3NjcmlwdCgpIHtcclxuICBsb2coXCJJbml0aWFsaXppbmcgY29udGVudCBzY3JpcHRcIik7XHJcbiAgc3RhcnRfbXV0YXRpb25fb2JzZXJ2ZXIoKTtcclxuICBzY3JhcGVfaW5pdGlhbCgpO1xyXG4gIHN0YXJ0X3NjaGVkdWxlcigpO1xyXG59XHJcblxyXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XHJcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJSRVNFVF9QQUdFX0NPTlRFTlRcIikge1xyXG4gICAgbG9nKFwiUkVTRVRUSU5HXCIpO1xyXG4gICAgcmVzZXRfZXZlcnl0aGluZygpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3RhdHVzOiBcIlJFU0VUX0RPTkVcIiB9KTtcclxuICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTQ0FOX0FHQUlOXCIpIHtcclxuICAgIGxvZyhcIlNDQU5OSU5HIEFHQUlOXCIpO1xyXG4gICAgcmVzZXRfZXZlcnl0aGluZygpO1xyXG4gICAgaW5pdF9jb250ZW50X3NjcmlwdCgpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3RhdHVzOiBcIlBST0NFU1NJTkdcIiB9KTtcclxuICB9XHJcbn0pO1xyXG5cclxuY29uc3QgdmlzaWJsZU9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKChlbnRyaWVzKSA9PiB7XHJcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICBpZiAoZW50cnkuaXNJbnRlcnNlY3RpbmcpIHtcclxuICAgICAgcHJvY2Vzc190ZXh0KGVudHJ5LnRhcmdldCk7XHJcbiAgICAgIHZpc2libGVPYnNlcnZlci51bm9ic2VydmUoZW50cnkudGFyZ2V0KTtcclxuICAgICAgbG9nKFwiSW50ZXJzZWN0aW9uT2JzZXJ2ZXI6IG5vZGUgdmlzaWJsZSAtPlwiLCBlbnRyeS50YXJnZXQudGFnTmFtZSk7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIHN0YXJ0X211dGF0aW9uX29ic2VydmVyKCkge1xyXG4gIGlmIChtdXRhdGlvbl9vYnNlcnZlcikge1xyXG4gICAgbXV0YXRpb25fb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xyXG4gIH1cclxuXHJcbiAgbXV0YXRpb25fb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XHJcbiAgICBmb3IgKGNvbnN0IG11dGF0aW9uIG9mIG11dGF0aW9ucykge1xyXG4gICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgbXV0YXRpb24uYWRkZWROb2Rlcykge1xyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXHJcbiAgICAgICAgICBub2RlLm1hdGNoZXMoXCJwLCBkaXYsIGFydGljbGUsIHNlY3Rpb25cIilcclxuICAgICAgICApIHtcclxuICAgICAgICAgIHZpc2libGVPYnNlcnZlci5vYnNlcnZlKG5vZGUpO1xyXG4gICAgICAgICAgbG9nKFwiTXV0YXRpb25PYnNlcnZlcjogbmV3IG5vZGUgZGV0ZWN0ZWQgLT4gXCIsIG5vZGUudGFnTmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIG11dGF0aW9uX29ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfSk7XHJcbn1cclxuXHJcbi8vIGNodW5rczogYXJyYXkgb2YgbWVkaWEgKHRleHRzLCBpbWFnZXMsIHZpZGVvcylcclxuZnVuY3Rpb24gYWRkX3RvX3F1ZXVlKGNodW5rcykge1xyXG4gIGxvZyhgUXVldWUgYWRkOiArJHtjaHVua3MubGVuZ3RofSwgdG90YWwgJHt3b3JrX3F1ZXVlLmxlbmd0aH1gKTtcclxuICBpZiAod29ya19xdWV1ZS5sZW5ndGggPCAzMDApIHtcclxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XHJcbiAgICAgIHdvcmtfcXVldWUucHVzaChjaHVuayk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzY2hlZHVsZV9zZW5kX3BheWxvYWQoKSB7XHJcbiAgbG9nKGBTY2hlZHVsZXIgdGljayDigJQgcXVldWU6JHt3b3JrX3F1ZXVlLmxlbmd0aH0sIHByb2Nlc3Npbmc6JHtwcm9jZXNzaW5nfWApO1xyXG4gIGlmIChwcm9jZXNzaW5nKSByZXR1cm47XHJcbiAgaWYgKHdvcmtfcXVldWUubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG4gIGNvbnN0IGJhdGNoID0gd29ya19xdWV1ZS5zcGxpY2UoMCwgNTApO1xyXG4gIHByb2Nlc3NpbmcgPSB0cnVlO1xyXG5cclxuICB0cnkge1xyXG4gICAgbG9nKGBTZW5kaW5nIGJhdGNoIG9mICR7YmF0Y2gubGVuZ3RofWApO1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgIHR5cGU6IFwiUFJPQ0VTU1wiLFxyXG4gICAgICBwYXlsb2FkOiB7XHJcbiAgICAgICAgdGV4dDoge1xyXG4gICAgICAgICAgZGF0YTogYmF0Y2gsXHJcbiAgICAgICAgICBzb3VyY2U6IFwiY29udGVudFwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBwcm9jZXNzZWRfcGF5bG9hZCA9IHJlc3BvbnNlO1xyXG5cclxuICAgIGxvZyhcclxuICAgICAgYEJhdGNoIHByb2Nlc3NlZDsgcmVzcG9uc2UgJHtcclxuICAgICAgICBBcnJheS5pc0FycmF5KHJlc3BvbnNlPy50ZXh0KSA/IHJlc3BvbnNlLnRleHQubGVuZ3RoIDogMFxyXG4gICAgICB9IGl0ZW1zYFxyXG4gICAgKTtcclxuICAgIGxvZyhcIkFGVEVSIFBST0NFU1NJTkc6IFwiLCBwcm9jZXNzZWRfcGF5bG9hZCk7XHJcbiAgICBoaWdobGlnaHRfZWxlbWVudHMocHJvY2Vzc2VkX3BheWxvYWQpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2coZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc3RhcnRfc2NoZWR1bGVyKCkge1xyXG4gIGlmIChzY2hlZHVsZXIpIHJldHVybjtcclxuICBzY2hlZHVsZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICBzY2hlZHVsZV9zZW5kX3BheWxvYWQoKTtcclxuICB9LCA1MDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3RvcF9zY2hlZHVsZXIoKSB7XHJcbiAgaWYgKHNjaGVkdWxlcikge1xyXG4gICAgY2xlYXJJbnRlcnZhbChzY2hlZHVsZXIpO1xyXG4gICAgc2NoZWR1bGVyID0gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbi8qIFxyXG4gIElNQUdFU1xyXG4gIFNjcmFwZSBhbmQgQ2xlYW5cclxuKi9cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NfaW1hZ2VzKGltYWdlcykge1xyXG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbWFnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIGNvbnN0IGltYWdlID0gaW1hZ2VzW2ldO1xyXG4gICAgaWYgKGltYWdlLndpZHRoID4gMzAgJiYgaW1hZ2UuaGVpZ2h0ID4gMzApIHtcclxuICAgICAgaWYgKGltYWdlLnNyYyAmJiAhc2Vlbi5oYXMoaW1hZ2Uuc3JjKSkge1xyXG4gICAgICAgIGxldCB4cGF0aF8gPSBnZW5lcmF0ZV94cGF0aChpbWFnZSk7XHJcbiAgICAgICAgc2Vlbi5hZGQoaW1hZ2Uuc3JjKTtcclxuICAgICAgICBsZXQgcHJvY2Vzc2VkX2ltYWdlID0ge1xyXG4gICAgICAgICAgYWx0OiBpbWFnZS5hbHQsXHJcbiAgICAgICAgICBzcmM6IGltYWdlLnNyYyxcclxuICAgICAgICAgIHhwYXRoOiB4cGF0aF8sXHJcbiAgICAgICAgfTtcclxuICAgICAgICBwYXlsb2FkLmltYWdlcy5wdXNoKHByb2Nlc3NlZF9pbWFnZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8qIFxyXG4gIFRFWFRcclxuICBTY3JhcGUgYW5kIENsZWFuXHJcbiovXHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzX3RleHQodHJlZSkge1xyXG4gIGNvbnN0IHRleHRzID0gW107XHJcbiAgY29uc3QgcGFyZW50VGV4dHMgPSBuZXcgTWFwKCk7XHJcblxyXG4gIGNvbnN0IEVYQ0xVREVfU0VMRUNUT1JTID0gYFxyXG4gICAgaGVhZGVyLCBuYXYsIGZvb3RlciwgYXNpZGUsIHNjcmlwdCwgc3R5bGUsIG5vc2NyaXB0LCBidXR0b24sXHJcbiAgICBtZXRhLCB0aXRsZSwgbGluaywgcGF0aCwgW3JvbGU9YmFubmVyXSwgW3JvbGU9bmF2aWdhdGlvbl0sXHJcbiAgICBbcm9sZT1jb21wbGVtZW50YXJ5XSwgW3JvbGU9bWVudWJhcl0sIFtyb2xlPW1lbnVdLFxyXG4gICAgW2FyaWEtaGlkZGVuPXRydWVdLCAubmF2LCAubmF2YmFyLCAubWVudSwgLmhlYWRlciwgLmZvb3RlcixcclxuICAgIC5zaWRlYmFyLCAuY29va2llLCAucG9wdXAsIC5tb2RhbCwgLmFkLCAuYWR2ZXJ0aXNlbWVudFxyXG4gIGA7XHJcblxyXG4gIGNvbnN0IFRFWFRfQkxBQ0tMSVNUID0gW1xyXG4gICAgXCJwcm9tb3RlZFwiLFxyXG4gICAgXCJjbGljayBoZXJlXCIsXHJcbiAgICBcInJlYWQgbW9yZVwiLFxyXG4gICAgXCJzaGFyZVwiLFxyXG4gICAgXCJsb2dpblwiLFxyXG4gICAgXCJzaWduIGluXCIsXHJcbiAgICBcInN1Ym1pdFwiLFxyXG4gICAgXCJwcml2YWN5IHBvbGljeVwiLFxyXG4gICAgXCJ1c2VyIGFncmVlbWVudFwiLFxyXG4gICAgXCJhbGwgcmlnaHRzIHJlc2VydmVkXCIsXHJcbiAgICBcImxlYXJuIG1vcmVcIixcclxuICAgIFwidGVybXMgYW5kIGNvbmRpdGlvbnNcIixcclxuICAgIFwidCZjcyBhcHBseVwiLFxyXG4gIF07XHJcblxyXG4gIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIodHJlZSwgTm9kZUZpbHRlci5TSE9XX1RFWFQpO1xyXG5cclxuICB3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIHtcclxuICAgIGNvbnN0IG5vZGUgPSB3YWxrZXIuY3VycmVudE5vZGU7XHJcbiAgICBjb25zdCBwYXJlbnQgPSBub2RlLnBhcmVudEVsZW1lbnQ7XHJcbiAgICBpZiAoIXBhcmVudCkgY29udGludWU7XHJcblxyXG4gICAgaWYgKHBhcmVudC5tYXRjaGVzKEVYQ0xVREVfU0VMRUNUT1JTKSB8fCBwYXJlbnQuY2xvc2VzdChFWENMVURFX1NFTEVDVE9SUykpXHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgY29uc3QgZXhpc3RpbmcgPSBwYXJlbnRUZXh0cy5nZXQocGFyZW50KSB8fCBcIlwiO1xyXG4gICAgcGFyZW50VGV4dHMuc2V0KHBhcmVudCwgZXhpc3RpbmcgKyBcIiBcIiArIG5vZGUudGV4dENvbnRlbnQpO1xyXG4gIH1cclxuXHJcbiAgcGFyZW50VGV4dHMuZm9yRWFjaCgocmF3VGV4dCwgcGFyZW50KSA9PiB7XHJcbiAgICBjb25zdCB0ZXh0ID0gcmF3VGV4dC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcbiAgICBpZiAoIXRleHQpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCB3b3JkQ291bnQgPSAodGV4dC5tYXRjaCgvXFxiXFx3K1xcYi9nKSB8fCBbXSkubGVuZ3RoO1xyXG4gICAgaWYgKHdvcmRDb3VudCA8IDUpIHJldHVybjtcclxuICAgIGlmICh0ZXh0ID09PSB0ZXh0LnRvVXBwZXJDYXNlKCkpIHJldHVybjtcclxuICAgIGlmIChURVhUX0JMQUNLTElTVC5zb21lKCh0KSA9PiB0ZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModCkpKSByZXR1cm47XHJcblxyXG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKHBhcmVudCk7XHJcbiAgICBpZiAoXHJcbiAgICAgIHN0eWxlLmRpc3BsYXkgPT09IFwibm9uZVwiIHx8XHJcbiAgICAgIHN0eWxlLnZpc2liaWxpdHkgPT09IFwiaGlkZGVuXCIgfHxcclxuICAgICAgc3R5bGUub3BhY2l0eSA9PT0gXCIwXCJcclxuICAgIClcclxuICAgICAgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHJlY3QgPSBwYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICBpZiAocmVjdC53aWR0aCA8IDEwMCB8fCByZWN0LmhlaWdodCA8IDIwKSByZXR1cm47XHJcblxyXG4gICAgY29uc3Qgbm9ybSA9IHRleHQudG9Mb3dlckNhc2UoKS5zbGljZSgwLCAzMDApO1xyXG4gICAgaWYgKGR1cGxpY2F0ZV9zZXQuaGFzKG5vcm0pKSByZXR1cm47XHJcbiAgICBkdXBsaWNhdGVfc2V0LmFkZChub3JtKTtcclxuXHJcbiAgICBjb25zdCBtYXhXb3JkcyA9IDMwMDtcclxuICAgIGNvbnN0IHdvcmRzID0gdGV4dC5zcGxpdCgvXFxzKy8pO1xyXG4gICAgY29uc3QgeHBhdGggPSBnZW5lcmF0ZV94cGF0aChwYXJlbnQpO1xyXG4gICAgaWYgKHdvcmRzLmxlbmd0aCA+IG1heFdvcmRzKSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd29yZHMubGVuZ3RoOyBpICs9IG1heFdvcmRzKSB7XHJcbiAgICAgICAgY29uc3QgY2h1bmsgPSB3b3Jkcy5zbGljZShpLCBpICsgbWF4V29yZHMpLmpvaW4oXCIgXCIpO1xyXG4gICAgICAgIHRleHRzLnB1c2goeyB0ZXh0OiBjaHVuaywgeHBhdGg6IHhwYXRoIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0ZXh0cy5wdXNoKHsgdGV4dDogdGV4dCwgeHBhdGg6IHhwYXRoIH0pO1xyXG4gICAgICB4cGF0aHNfcmVzZXQucHVzaCh4cGF0aCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGFkZF90b19xdWV1ZSh0ZXh0cyk7XHJcbn1cclxuXHJcbi8vIGVsZW1lbnQ6IGEgaHRtbCBub2RlXHJcbmZ1bmN0aW9uIGdlbmVyYXRlX3hwYXRoKGVsZW1lbnQpIHtcclxuICBpZiAoIWVsZW1lbnQgfHwgZWxlbWVudC5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHtcclxuICAgIHJldHVybiBcIlwiO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcGF0aFBhcnRzID0gW107XHJcbiAgbGV0IGN1cnJlbnROb2RlID0gZWxlbWVudDtcclxuXHJcbiAgd2hpbGUgKGN1cnJlbnROb2RlICYmIGN1cnJlbnROb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xyXG4gICAgY29uc3QgdGFnTmFtZSA9IGN1cnJlbnROb2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgIGxldCBzZWdtZW50ID0gdGFnTmFtZTtcclxuXHJcbiAgICBjb25zdCBwYXJlbnQgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xyXG4gICAgaWYgKHBhcmVudCAmJiBwYXJlbnQubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XHJcbiAgICAgIGNvbnN0IHNhbWVUYWdTaWJsaW5ncyA9IEFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKS5maWx0ZXIoXHJcbiAgICAgICAgKGNoaWxkKSA9PlxyXG4gICAgICAgICAgY2hpbGQubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXHJcbiAgICAgICAgICBjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IHRhZ05hbWVcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmIChzYW1lVGFnU2libGluZ3MubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gc2FtZVRhZ1NpYmxpbmdzLmluZGV4T2YoY3VycmVudE5vZGUpICsgMTtcclxuICAgICAgICBzZWdtZW50ICs9IGBbJHtpbmRleH1dYDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBhdGhQYXJ0cy51bnNoaWZ0KHNlZ21lbnQpO1xyXG5cclxuICAgIGN1cnJlbnROb2RlID0gcGFyZW50O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHBhdGhQYXJ0cy5sZW5ndGggPiAwID8gXCIvXCIgKyBwYXRoUGFydHMuam9pbihcIi9cIikgOiBcIlwiO1xyXG59XHJcblxyXG4vKlxyXG5TQ1JBUEUgSFRNTCBFTEVNRU5UUzpcclxuXHJcblRFWFQ6IERPTkVcclxuSU1BR0VTOiBOT1QgRE9ORVxyXG5WSURFTzogTk9UIERPTkVcclxuQVVESU86IE5PVCBET05FXHJcbiovXHJcblxyXG5mdW5jdGlvbiBzY3JhcGVfaW5pdGlhbCgpIHtcclxuICBsb2coXCJSdW5uaW5nIGluaXRpYWwgc2NyYXBlIG9uIHBhZ2UgbG9hZFwiKTtcclxuXHJcbiAgcHJvY2Vzc190ZXh0KGRvY3VtZW50LmJvZHkpO1xyXG4gIGxvZyhgSW5pdGlhbCBzY3JhcGUgY29tcGxldGUg4oCUIHF1ZXVlIG5vdyBoYXMgJHt3b3JrX3F1ZXVlLmxlbmd0aH0gaXRlbXNgKTtcclxufVxyXG5cclxuLyogXHJcbkNyZWF0ZSBhbmQgYWRkIHRvb2x0aXBzLlxyXG4qL1xyXG5cclxuY29uc3QgdG9vbHRpcEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxudG9vbHRpcEVsLmlkID0gXCJhbGV0aGVpYS10b29sdGlwXCI7XHJcbk9iamVjdC5hc3NpZ24odG9vbHRpcEVsLnN0eWxlLCB7XHJcbiAgcG9zaXRpb246IFwiZml4ZWRcIixcclxuICBwYWRkaW5nOiBcIjZweCAxMHB4XCIsXHJcbiAgYm9yZGVyUmFkaXVzOiBcIjRweFwiLFxyXG4gIGZvbnRTaXplOiBcIjE0cHhcIixcclxuICBiYWNrZ3JvdW5kOiBcInJnYmEoMCwwLDAsMC44NSlcIixcclxuICBjb2xvcjogXCIjZmZmXCIsXHJcbiAgbWF4V2lkdGg6IFwiMzAwcHhcIixcclxuICB3aGl0ZVNwYWNlOiBcInByZS13cmFwXCIsXHJcbiAgcG9pbnRlckV2ZW50czogXCJub25lXCIsXHJcbiAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcclxuICBvcGFjaXR5OiBcIjBcIixcclxuICB0cmFuc2l0aW9uOiBcIm9wYWNpdHkgMC4yc1wiLFxyXG4gIHpJbmRleDogXCI5OTk5OTlcIixcclxufSk7XHJcblxyXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRvb2x0aXBFbCk7XHJcbmZ1bmN0aW9uIHNob3dUb29sdGlwRm9yKGVsLCB0ZXh0KSB7XHJcbiAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gIHRvb2x0aXBFbC50ZXh0Q29udGVudCA9IHRleHQ7XHJcbiAgdG9vbHRpcEVsLnN0eWxlLmxlZnQgPSBgJHtyZWN0LmxlZnQgKyByZWN0LndpZHRoIC8gMn1weGA7XHJcbiAgdG9vbHRpcEVsLnN0eWxlLnRvcCA9IGAke3JlY3QudG9wIC0gMTB9cHhgO1xyXG4gIHRvb2x0aXBFbC5zdHlsZS50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZSgtNTAlLCAtMTAwJSlcIjtcclxuICB0b29sdGlwRWwuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gIHRvb2x0aXBFbC5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhpZGVUb29sdGlwKCkge1xyXG4gIHRvb2x0aXBFbC5zdHlsZS5vcGFjaXR5ID0gXCIwXCI7XHJcbiAgdG9vbHRpcEVsLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHbG9iYWxUb29sdGlwKCkge1xyXG4gIGlmICh0b29sdGlwRWwgJiYgdG9vbHRpcEVsLnBhcmVudE5vZGUpIHtcclxuICAgIHRvb2x0aXBFbC5zdHlsZS5vcGFjaXR5ID0gXCIwXCI7XHJcbiAgICB0b29sdGlwRWwuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB0b29sdGlwRWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0b29sdGlwRWwpO1xyXG4gIH1cclxuICBsb2coXCJUb29sdGlwIHJlbW92ZWQgZnJvbSBET01cIik7XHJcbn1cclxuXHJcbi8qXHJcbkhJR0hMSUdIVElORyBFTEVNRU5UUzpcclxuXHJcblRleHQ6IERPTkVcclxuSW1hZ2VzOiBOT1QgRE9ORVxyXG5WaWRlbzogTk9UIERPTkVcclxuQXVkaW86IE5PVCBET05FXHJcblxyXG4qL1xyXG5hc3luYyBmdW5jdGlvbiBoaWdobGlnaHRfZWxlbWVudHMocGF5bG9hZCkge1xyXG4gIGxvZyhcInJhdyBwYXlsb2FkOiBcIiwgcGF5bG9hZCk7XHJcbiAgbG9nKFwiSGlnaGxpZ2h0aW5nIHN0YXJ0ZWQgZm9yIGJhdGNoXCIsIHBheWxvYWQudGV4dD8ubGVuZ3RoIHx8IDApO1xyXG4gIHByb2Nlc3NpbmcgPSBmYWxzZTtcclxuXHJcbiAgaWYgKCFwYXlsb2FkIHx8ICFBcnJheS5pc0FycmF5KHBheWxvYWQudGV4dCkpIHJldHVybjtcclxuXHJcbiAgbGV0IHRocmVzaG9sZHM7XHJcblxyXG4gIHRyeSB7XHJcbiAgICB0aHJlc2hvbGRzID0gYXdhaXQgZ2V0X3NldHRpbmdzKFwidGhyZXNob2xkc1wiKTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWRcIiwgZXJyKTtcclxuICAgIHRocmVzaG9sZHMgPSBbMzUsIDg1XTtcclxuICB9XHJcblxyXG4gIGNvbnN0IFtsb3csIGhpZ2hdID0gdGhyZXNob2xkcztcclxuXHJcbiAgbGV0IGFpQ291bnQgPSAwO1xyXG4gIGxldCBodW1hbkNvdW50ID0gMDtcclxuICBsZXQgbWlkZGxlQ291bnQgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IGl0ZW0gb2YgcGF5bG9hZC50ZXh0KSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoIWl0ZW0gfHwgIWl0ZW0ueHBhdGgpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgZWwgPSBkb2N1bWVudC5ldmFsdWF0ZShcclxuICAgICAgICBpdGVtLnhwYXRoLFxyXG4gICAgICAgIGRvY3VtZW50LFxyXG4gICAgICAgIG51bGwsXHJcbiAgICAgICAgWFBhdGhSZXN1bHQuRklSU1RfT1JERVJFRF9OT0RFX1RZUEUsXHJcbiAgICAgICAgbnVsbFxyXG4gICAgICApLnNpbmdsZU5vZGVWYWx1ZTtcclxuICAgICAgbG9nKFwiaGlnaGxpZ2h0IHRhcmdldCBcIiwgZWwsIFwiLT5cIiwgZWw/LnRleHRDb250ZW50LnNsaWNlKDAsIDE1MCkpO1xyXG4gICAgICBpZiAoIWVsKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiRWxlbWVudCBub3QgZm91bmQgd2l0aCB4cGF0aDogXCIsIGl0ZW0ueHBhdGgpO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGxldCBzY29yZTtcclxuXHJcbiAgICAgIGlmIChpdGVtLkFJKSB7XHJcbiAgICAgICAgc2NvcmUgPSBpdGVtLkFJO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNjb3JlID0gaXRlbS5IVU1BTjtcclxuICAgICAgfVxyXG5cclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZW50ZXJcIiwgKGUpID0+IHtcclxuICAgICAgICBzaG93VG9vbHRpcEZvcihcclxuICAgICAgICAgIGVsLFxyXG4gICAgICAgICAgc2NvcmUgPiBoaWdoXHJcbiAgICAgICAgICAgID8gYEl0ZW0gaXMgbW9zdCBsaWtlbHkgQUkuXFxuQUk6ICR7c2NvcmUudG9GaXhlZCgyKX1gXHJcbiAgICAgICAgICAgIDogc2NvcmUgPiBsb3dcclxuICAgICAgICAgICAgPyBgSXRlbSBjb3VsZCBiZSBBSSwgcHJvY2VlZCB3aXRoIGNhdXRpb24uXFxuQUk6ICR7c2NvcmUudG9GaXhlZCgyKX1gXHJcbiAgICAgICAgICAgIDogYEl0ZW0gaXMgbW9zdCBsaWtlbHkgbm90IEFJLlxcbkFJOiAke3Njb3JlLnRvRml4ZWQoMil9YFxyXG4gICAgICAgICk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbGVhdmVcIiwgaGlkZVRvb2x0aXApO1xyXG5cclxuICAgICAgaWYgKHNjb3JlID4gaGlnaCkge1xyXG4gICAgICAgIGFpQ291bnQgKz0gMTtcclxuICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShcImJvcmRlclwiLCBcIjVweCBzb2xpZCByZWRcIiwgXCJpbXBvcnRhbnRcIik7XHJcbiAgICAgIH0gZWxzZSBpZiAoc2NvcmUgPiBsb3cpIHtcclxuICAgICAgICBtaWRkbGVDb3VudCArPSAxO1xyXG4gICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KFwiYm9yZGVyXCIsIFwiNXB4IHNvbGlkIHllbGxvd1wiLCBcImltcG9ydGFudFwiKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBodW1hbkNvdW50ICs9IDE7XHJcbiAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoXCJib3JkZXJcIiwgXCI1cHggc29saWQgZ3JlZW5cIiwgXCJpbXBvcnRhbnRcIik7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3JcIiwgZXJyLCBpdGVtKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcInN0YXRlXCIsICh7IHN0YXRlIH0pID0+IHtcclxuICAgIGNvbnN0IG5ld1N0YXRlID0ge1xyXG4gICAgICBhaVBvc0NvdW50OiBhaUNvdW50LFxyXG4gICAgICBhaVNvbWVDb3VudDogbWlkZGxlQ291bnQsXHJcbiAgICAgIGh1bWFuQ291bnQ6IGh1bWFuQ291bnQsXHJcbiAgICAgIHN0YXJ0ZWRBdDogc3RhdGUuc3RhcnRlZEF0LFxyXG4gICAgICBzdGF0dXM6IHN0YXRlLnN0YXR1cyxcclxuICAgICAgdGFiSUQ6IHN0YXRlLnRhYklELFxyXG4gICAgfTtcclxuXHJcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBzdGF0ZTogbmV3U3RhdGUgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGxvZyhcIkhpZ2hsaWdodGluZyBmaW5pc2hlZCwgcHJvY2Vzc2luZyBmbGFnIHJlc2V0XCIpO1xyXG5cclxuICBzY2hlZHVsZV9zZW5kX3BheWxvYWQoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzZXRfZXZlcnl0aGluZygpIHtcclxuICAvLyBURVhUXHJcbiAgZm9yIChjb25zdCBpdGVtIG9mIHhwYXRoc19yZXNldCkge1xyXG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5ldmFsdWF0ZShcclxuICAgICAgaXRlbSxcclxuICAgICAgZG9jdW1lbnQsXHJcbiAgICAgIG51bGwsXHJcbiAgICAgIFhQYXRoUmVzdWx0LkZJUlNUX09SREVSRURfTk9ERV9UWVBFLFxyXG4gICAgICBudWxsXHJcbiAgICApLnNpbmdsZU5vZGVWYWx1ZTtcclxuXHJcbiAgICBpZiAoIWVsKSBjb250aW51ZTtcclxuXHJcbiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShcImJvcmRlclwiLCBcIm5vbmVcIiwgXCJpbXBvcnRhbnRcIik7XHJcbiAgfVxyXG5cclxuICAvLyBJTUFHRVNcclxuXHJcbiAgLy8gVklERU9TXHJcblxyXG4gIC8vIEFVRElPXHJcblxyXG4gIHdvcmtfcXVldWUubGVuZ3RoID0gMDtcclxuICBkdXBsaWNhdGVfc2V0LmNsZWFyKCk7XHJcbiAgbXV0YXRpb25fb2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcclxuICBzdG9wX3NjaGVkdWxlcigpO1xyXG4gIHJlbW92ZUdsb2JhbFRvb2x0aXAoKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0X3NldHRpbmdzKHBhcmFtKSB7XHJcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFwic2V0dGluZ3NcIik7XHJcbiAgY29uc3Qgc2V0dGluZ3MgPSByZXN1bHQuc2V0dGluZ3M7XHJcblxyXG4gIGlmIChwYXJhbSA9PSBcImFsbFwiKSB7XHJcbiAgICByZXR1cm4gc2V0dGluZ3M7XHJcbiAgfSBlbHNlIGlmIChwYXJhbSA9PSBcInRocmVzaG9sZHNcIikge1xyXG4gICAgcmV0dXJuIHNldHRpbmdzPy50aHJlc2hvbGRzO1xyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=