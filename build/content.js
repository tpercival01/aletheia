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

      const aiScore = item.AI ?? 0;
      const humanScore = item.HUMAN ?? 0;
      const score = Math.max(aiScore, humanScore);

      el.addEventListener("mouseenter", (e) => {
        showTooltipFor(
          el,
          score > high
            ? `Item is most likely AI.\nAI: ${aiScore.toFixed(2)}\nHuman: ${humanScore.toFixed(2)}\n`
            : score > low
            ? `Item could be AI, proceed with caution.\nAI: ${aiScore.toFixed(2)}\nHuman: ${humanScore.toFixed(2)}\n`
            : `Item is most likely not AI.\nAI: ${aiScore.toFixed(2)}\nHuman: ${humanScore.toFixed(2)}\n`
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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YnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2FsZXRoZWlhL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vYWxldGhlaWEvLi9zcmMvY29udGVudC9jb250ZW50LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSByZXF1aXJlIHNjb3BlXG52YXIgX193ZWJwYWNrX3JlcXVpcmVfXyA9IHt9O1xuXG4iLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJjb25zdCB3b3JrX3F1ZXVlID0gW107XG5sZXQgcHJvY2Vzc2luZyA9IGZhbHNlO1xuY29uc3QgZHVwbGljYXRlX3NldCA9IG5ldyBTZXQoKTtcbmxldCBtdXRhdGlvbl9vYnNlcnZlcjtcbmNvbnN0IHhwYXRoc19yZXNldCA9IFtdO1xubGV0IHNjaGVkdWxlcjtcblxubGV0IERFQlVHID0gdHJ1ZTtcbmZ1bmN0aW9uIGxvZyguLi5hcmdzKSB7XG4gIGlmICghREVCVUcpIHJldHVybjtcbiAgY29uc29sZS5sb2coXCIlY1tBbGV0aGVpYV1cIiwgXCJjb2xvcjogIzdkNTdmZjsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIsIC4uLmFyZ3MpO1xufVxuXG5pZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJsb2FkaW5nXCIpIHtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgaW5pdF9jb250ZW50X3NjcmlwdCk7XG59IGVsc2Uge1xuICBpbml0X2NvbnRlbnRfc2NyaXB0KCk7XG59XG5cbmZ1bmN0aW9uIGluaXRfY29udGVudF9zY3JpcHQoKSB7XG4gIGxvZyhcIkluaXRpYWxpemluZyBjb250ZW50IHNjcmlwdFwiKTtcbiAgc3RhcnRfbXV0YXRpb25fb2JzZXJ2ZXIoKTtcbiAgc2NyYXBlX2luaXRpYWwoKTtcbiAgc3RhcnRfc2NoZWR1bGVyKCk7XG59XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJSRVNFVF9QQUdFX0NPTlRFTlRcIikge1xuICAgIGxvZyhcIlJFU0VUVElOR1wiKTtcbiAgICByZXNldF9ldmVyeXRoaW5nKCk7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3RhdHVzOiBcIlJFU0VUX0RPTkVcIiB9KTtcbiAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0NBTl9BR0FJTlwiKSB7XG4gICAgbG9nKFwiU0NBTk5JTkcgQUdBSU5cIik7XG4gICAgcmVzZXRfZXZlcnl0aGluZygpO1xuICAgIGluaXRfY29udGVudF9zY3JpcHQoKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBzdGF0dXM6IFwiUFJPQ0VTU0lOR1wiIH0pO1xuICB9XG59KTtcblxuY29uc3QgdmlzaWJsZU9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKChlbnRyaWVzKSA9PiB7XG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgIGlmIChlbnRyeS5pc0ludGVyc2VjdGluZykge1xuICAgICAgcHJvY2Vzc190ZXh0KGVudHJ5LnRhcmdldCk7XG4gICAgICB2aXNpYmxlT2JzZXJ2ZXIudW5vYnNlcnZlKGVudHJ5LnRhcmdldCk7XG4gICAgICBsb2coXCJJbnRlcnNlY3Rpb25PYnNlcnZlcjogbm9kZSB2aXNpYmxlIC0+XCIsIGVudHJ5LnRhcmdldC50YWdOYW1lKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBzdGFydF9tdXRhdGlvbl9vYnNlcnZlcigpIHtcbiAgaWYgKG11dGF0aW9uX29ic2VydmVyKSB7XG4gICAgbXV0YXRpb25fb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICB9XG5cbiAgbXV0YXRpb25fb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG4gICAgZm9yIChjb25zdCBtdXRhdGlvbiBvZiBtdXRhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSAmJlxuICAgICAgICAgIG5vZGUubWF0Y2hlcyhcInAsIGRpdiwgYXJ0aWNsZSwgc2VjdGlvblwiKVxuICAgICAgICApIHtcbiAgICAgICAgICB2aXNpYmxlT2JzZXJ2ZXIub2JzZXJ2ZShub2RlKTtcbiAgICAgICAgICBsb2coXCJNdXRhdGlvbk9ic2VydmVyOiBuZXcgbm9kZSBkZXRlY3RlZCAtPiBcIiwgbm9kZS50YWdOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgbXV0YXRpb25fb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcbn1cblxuLy8gY2h1bmtzOiBhcnJheSBvZiBtZWRpYSAodGV4dHMsIGltYWdlcywgdmlkZW9zKVxuZnVuY3Rpb24gYWRkX3RvX3F1ZXVlKGNodW5rcykge1xuICBsb2coYFF1ZXVlIGFkZDogKyR7Y2h1bmtzLmxlbmd0aH0sIHRvdGFsICR7d29ya19xdWV1ZS5sZW5ndGh9YCk7XG4gIGlmICh3b3JrX3F1ZXVlLmxlbmd0aCA8IDMwMCkge1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XG4gICAgICB3b3JrX3F1ZXVlLnB1c2goY2h1bmspO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzY2hlZHVsZV9zZW5kX3BheWxvYWQoKSB7XG4gIGxvZyhgU2NoZWR1bGVyIHRpY2sg4oCUIHF1ZXVlOiR7d29ya19xdWV1ZS5sZW5ndGh9LCBwcm9jZXNzaW5nOiR7cHJvY2Vzc2luZ31gKTtcbiAgaWYgKHByb2Nlc3NpbmcpIHJldHVybjtcbiAgaWYgKHdvcmtfcXVldWUubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgY29uc3QgYmF0Y2ggPSB3b3JrX3F1ZXVlLnNwbGljZSgwLCA1MCk7XG4gIHByb2Nlc3NpbmcgPSB0cnVlO1xuXG4gIHRyeSB7XG4gICAgbG9nKGBTZW5kaW5nIGJhdGNoIG9mICR7YmF0Y2gubGVuZ3RofWApO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogXCJQUk9DRVNTXCIsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIHRleHQ6IHtcbiAgICAgICAgICBkYXRhOiBiYXRjaCxcbiAgICAgICAgICBzb3VyY2U6IFwiY29udGVudFwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHByb2Nlc3NlZF9wYXlsb2FkID0gcmVzcG9uc2U7XG5cbiAgICBsb2coXG4gICAgICBgQmF0Y2ggcHJvY2Vzc2VkOyByZXNwb25zZSAke1xuICAgICAgICBBcnJheS5pc0FycmF5KHJlc3BvbnNlPy50ZXh0KSA/IHJlc3BvbnNlLnRleHQubGVuZ3RoIDogMFxuICAgICAgfSBpdGVtc2BcbiAgICApO1xuICAgIGxvZyhcIkFGVEVSIFBST0NFU1NJTkc6IFwiLCBwcm9jZXNzZWRfcGF5bG9hZCk7XG4gICAgaGlnaGxpZ2h0X2VsZW1lbnRzKHByb2Nlc3NlZF9wYXlsb2FkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2coZXJyb3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0X3NjaGVkdWxlcigpIHtcbiAgaWYgKHNjaGVkdWxlcikgcmV0dXJuO1xuICBzY2hlZHVsZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgc2NoZWR1bGVfc2VuZF9wYXlsb2FkKCk7XG4gIH0sIDUwMDApO1xufVxuXG5mdW5jdGlvbiBzdG9wX3NjaGVkdWxlcigpIHtcbiAgaWYgKHNjaGVkdWxlcikge1xuICAgIGNsZWFySW50ZXJ2YWwoc2NoZWR1bGVyKTtcbiAgICBzY2hlZHVsZXIgPSBudWxsO1xuICB9XG59XG5cbi8qIFxuICBJTUFHRVNcbiAgU2NyYXBlIGFuZCBDbGVhblxuKi9cblxuZnVuY3Rpb24gcHJvY2Vzc19pbWFnZXMoaW1hZ2VzKSB7XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW1hZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgaW1hZ2UgPSBpbWFnZXNbaV07XG4gICAgaWYgKGltYWdlLndpZHRoID4gMzAgJiYgaW1hZ2UuaGVpZ2h0ID4gMzApIHtcbiAgICAgIGlmIChpbWFnZS5zcmMgJiYgIXNlZW4uaGFzKGltYWdlLnNyYykpIHtcbiAgICAgICAgbGV0IHhwYXRoXyA9IGdlbmVyYXRlX3hwYXRoKGltYWdlKTtcbiAgICAgICAgc2Vlbi5hZGQoaW1hZ2Uuc3JjKTtcbiAgICAgICAgbGV0IHByb2Nlc3NlZF9pbWFnZSA9IHtcbiAgICAgICAgICBhbHQ6IGltYWdlLmFsdCxcbiAgICAgICAgICBzcmM6IGltYWdlLnNyYyxcbiAgICAgICAgICB4cGF0aDogeHBhdGhfLFxuICAgICAgICB9O1xuICAgICAgICBwYXlsb2FkLmltYWdlcy5wdXNoKHByb2Nlc3NlZF9pbWFnZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qIFxuICBURVhUXG4gIFNjcmFwZSBhbmQgQ2xlYW5cbiovXG5cbmZ1bmN0aW9uIHByb2Nlc3NfdGV4dCh0cmVlKSB7XG4gIGNvbnN0IHRleHRzID0gW107XG4gIGNvbnN0IHBhcmVudFRleHRzID0gbmV3IE1hcCgpO1xuXG4gIGNvbnN0IEVYQ0xVREVfU0VMRUNUT1JTID0gYFxuICAgIGhlYWRlciwgbmF2LCBmb290ZXIsIGFzaWRlLCBzY3JpcHQsIHN0eWxlLCBub3NjcmlwdCwgYnV0dG9uLFxuICAgIG1ldGEsIHRpdGxlLCBsaW5rLCBwYXRoLCBbcm9sZT1iYW5uZXJdLCBbcm9sZT1uYXZpZ2F0aW9uXSxcbiAgICBbcm9sZT1jb21wbGVtZW50YXJ5XSwgW3JvbGU9bWVudWJhcl0sIFtyb2xlPW1lbnVdLFxuICAgIFthcmlhLWhpZGRlbj10cnVlXSwgLm5hdiwgLm5hdmJhciwgLm1lbnUsIC5oZWFkZXIsIC5mb290ZXIsXG4gICAgLnNpZGViYXIsIC5jb29raWUsIC5wb3B1cCwgLm1vZGFsLCAuYWQsIC5hZHZlcnRpc2VtZW50XG4gIGA7XG5cbiAgY29uc3QgVEVYVF9CTEFDS0xJU1QgPSBbXG4gICAgXCJwcm9tb3RlZFwiLFxuICAgIFwiY2xpY2sgaGVyZVwiLFxuICAgIFwicmVhZCBtb3JlXCIsXG4gICAgXCJzaGFyZVwiLFxuICAgIFwibG9naW5cIixcbiAgICBcInNpZ24gaW5cIixcbiAgICBcInN1Ym1pdFwiLFxuICAgIFwicHJpdmFjeSBwb2xpY3lcIixcbiAgICBcInVzZXIgYWdyZWVtZW50XCIsXG4gICAgXCJhbGwgcmlnaHRzIHJlc2VydmVkXCIsXG4gICAgXCJsZWFybiBtb3JlXCIsXG4gICAgXCJ0ZXJtcyBhbmQgY29uZGl0aW9uc1wiLFxuICAgIFwidCZjcyBhcHBseVwiLFxuICBdO1xuXG4gIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIodHJlZSwgTm9kZUZpbHRlci5TSE9XX1RFWFQpO1xuXG4gIHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSkge1xuICAgIGNvbnN0IG5vZGUgPSB3YWxrZXIuY3VycmVudE5vZGU7XG4gICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnRFbGVtZW50O1xuICAgIGlmICghcGFyZW50KSBjb250aW51ZTtcblxuICAgIGlmIChwYXJlbnQubWF0Y2hlcyhFWENMVURFX1NFTEVDVE9SUykgfHwgcGFyZW50LmNsb3Nlc3QoRVhDTFVERV9TRUxFQ1RPUlMpKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBwYXJlbnRUZXh0cy5nZXQocGFyZW50KSB8fCBcIlwiO1xuICAgIHBhcmVudFRleHRzLnNldChwYXJlbnQsIGV4aXN0aW5nICsgXCIgXCIgKyBub2RlLnRleHRDb250ZW50KTtcbiAgfVxuXG4gIHBhcmVudFRleHRzLmZvckVhY2goKHJhd1RleHQsIHBhcmVudCkgPT4ge1xuICAgIGNvbnN0IHRleHQgPSByYXdUZXh0LnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKTtcbiAgICBpZiAoIXRleHQpIHJldHVybjtcblxuICAgIGNvbnN0IHdvcmRDb3VudCA9ICh0ZXh0Lm1hdGNoKC9cXGJcXHcrXFxiL2cpIHx8IFtdKS5sZW5ndGg7XG4gICAgaWYgKHdvcmRDb3VudCA8IDUpIHJldHVybjtcbiAgICBpZiAodGV4dCA9PT0gdGV4dC50b1VwcGVyQ2FzZSgpKSByZXR1cm47XG4gICAgaWYgKFRFWFRfQkxBQ0tMSVNULnNvbWUoKHQpID0+IHRleHQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0KSkpIHJldHVybjtcblxuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShwYXJlbnQpO1xuICAgIGlmIChcbiAgICAgIHN0eWxlLmRpc3BsYXkgPT09IFwibm9uZVwiIHx8XG4gICAgICBzdHlsZS52aXNpYmlsaXR5ID09PSBcImhpZGRlblwiIHx8XG4gICAgICBzdHlsZS5vcGFjaXR5ID09PSBcIjBcIlxuICAgIClcbiAgICAgIHJldHVybjtcblxuICAgIGNvbnN0IHJlY3QgPSBwYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKHJlY3Qud2lkdGggPCAxMDAgfHwgcmVjdC5oZWlnaHQgPCAyMCkgcmV0dXJuO1xuXG4gICAgY29uc3Qgbm9ybSA9IHRleHQudG9Mb3dlckNhc2UoKS5zbGljZSgwLCAzMDApO1xuICAgIGlmIChkdXBsaWNhdGVfc2V0Lmhhcyhub3JtKSkgcmV0dXJuO1xuICAgIGR1cGxpY2F0ZV9zZXQuYWRkKG5vcm0pO1xuXG4gICAgY29uc3QgbWF4V29yZHMgPSAzMDA7XG4gICAgY29uc3Qgd29yZHMgPSB0ZXh0LnNwbGl0KC9cXHMrLyk7XG4gICAgY29uc3QgeHBhdGggPSBnZW5lcmF0ZV94cGF0aChwYXJlbnQpO1xuICAgIGlmICh3b3Jkcy5sZW5ndGggPiBtYXhXb3Jkcykge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3Jkcy5sZW5ndGg7IGkgKz0gbWF4V29yZHMpIHtcbiAgICAgICAgY29uc3QgY2h1bmsgPSB3b3Jkcy5zbGljZShpLCBpICsgbWF4V29yZHMpLmpvaW4oXCIgXCIpO1xuICAgICAgICB0ZXh0cy5wdXNoKHsgdGV4dDogY2h1bmssIHhwYXRoOiB4cGF0aCB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGV4dHMucHVzaCh7IHRleHQ6IHRleHQsIHhwYXRoOiB4cGF0aCB9KTtcbiAgICAgIHhwYXRoc19yZXNldC5wdXNoKHhwYXRoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFkZF90b19xdWV1ZSh0ZXh0cyk7XG59XG5cbi8vIGVsZW1lbnQ6IGEgaHRtbCBub2RlXG5mdW5jdGlvbiBnZW5lcmF0ZV94cGF0aChlbGVtZW50KSB7XG4gIGlmICghZWxlbWVudCB8fCBlbGVtZW50Lm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgY29uc3QgcGF0aFBhcnRzID0gW107XG4gIGxldCBjdXJyZW50Tm9kZSA9IGVsZW1lbnQ7XG5cbiAgd2hpbGUgKGN1cnJlbnROb2RlICYmIGN1cnJlbnROb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgIGNvbnN0IHRhZ05hbWUgPSBjdXJyZW50Tm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgbGV0IHNlZ21lbnQgPSB0YWdOYW1lO1xuXG4gICAgY29uc3QgcGFyZW50ID0gY3VycmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICBpZiAocGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgIGNvbnN0IHNhbWVUYWdTaWJsaW5ncyA9IEFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKS5maWx0ZXIoXG4gICAgICAgIChjaGlsZCkgPT5cbiAgICAgICAgICBjaGlsZC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUgJiZcbiAgICAgICAgICBjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IHRhZ05hbWVcbiAgICAgICk7XG5cbiAgICAgIGlmIChzYW1lVGFnU2libGluZ3MubGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHNhbWVUYWdTaWJsaW5ncy5pbmRleE9mKGN1cnJlbnROb2RlKSArIDE7XG4gICAgICAgIHNlZ21lbnQgKz0gYFske2luZGV4fV1gO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhdGhQYXJ0cy51bnNoaWZ0KHNlZ21lbnQpO1xuXG4gICAgY3VycmVudE5vZGUgPSBwYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gcGF0aFBhcnRzLmxlbmd0aCA+IDAgPyBcIi9cIiArIHBhdGhQYXJ0cy5qb2luKFwiL1wiKSA6IFwiXCI7XG59XG5cbi8qXG5TQ1JBUEUgSFRNTCBFTEVNRU5UUzpcblxuVEVYVDogRE9ORVxuSU1BR0VTOiBOT1QgRE9ORVxuVklERU86IE5PVCBET05FXG5BVURJTzogTk9UIERPTkVcbiovXG5cbmZ1bmN0aW9uIHNjcmFwZV9pbml0aWFsKCkge1xuICBsb2coXCJSdW5uaW5nIGluaXRpYWwgc2NyYXBlIG9uIHBhZ2UgbG9hZFwiKTtcblxuICBwcm9jZXNzX3RleHQoZG9jdW1lbnQuYm9keSk7XG4gIGxvZyhgSW5pdGlhbCBzY3JhcGUgY29tcGxldGUg4oCUIHF1ZXVlIG5vdyBoYXMgJHt3b3JrX3F1ZXVlLmxlbmd0aH0gaXRlbXNgKTtcbn1cblxuLyogXG5DcmVhdGUgYW5kIGFkZCB0b29sdGlwcy5cbiovXG5cbmNvbnN0IHRvb2x0aXBFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG50b29sdGlwRWwuaWQgPSBcImFsZXRoZWlhLXRvb2x0aXBcIjtcbk9iamVjdC5hc3NpZ24odG9vbHRpcEVsLnN0eWxlLCB7XG4gIHBvc2l0aW9uOiBcImZpeGVkXCIsXG4gIHBhZGRpbmc6IFwiNnB4IDEwcHhcIixcbiAgYm9yZGVyUmFkaXVzOiBcIjRweFwiLFxuICBmb250U2l6ZTogXCIxNHB4XCIsXG4gIGJhY2tncm91bmQ6IFwicmdiYSgwLDAsMCwwLjg1KVwiLFxuICBjb2xvcjogXCIjZmZmXCIsXG4gIG1heFdpZHRoOiBcIjMwMHB4XCIsXG4gIHdoaXRlU3BhY2U6IFwicHJlLXdyYXBcIixcbiAgcG9pbnRlckV2ZW50czogXCJub25lXCIsXG4gIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gIG9wYWNpdHk6IFwiMFwiLFxuICB0cmFuc2l0aW9uOiBcIm9wYWNpdHkgMC4yc1wiLFxuICB6SW5kZXg6IFwiOTk5OTk5XCIsXG59KTtcblxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0b29sdGlwRWwpO1xuZnVuY3Rpb24gc2hvd1Rvb2x0aXBGb3IoZWwsIHRleHQpIHtcbiAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICB0b29sdGlwRWwudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB0b29sdGlwRWwuc3R5bGUubGVmdCA9IGAke3JlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyfXB4YDtcbiAgdG9vbHRpcEVsLnN0eWxlLnRvcCA9IGAke3JlY3QudG9wIC0gMTB9cHhgO1xuICB0b29sdGlwRWwuc3R5bGUudHJhbnNmb3JtID0gXCJ0cmFuc2xhdGUoLTUwJSwgLTEwMCUpXCI7XG4gIHRvb2x0aXBFbC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG4gIHRvb2x0aXBFbC5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XG59XG5cbmZ1bmN0aW9uIGhpZGVUb29sdGlwKCkge1xuICB0b29sdGlwRWwuc3R5bGUub3BhY2l0eSA9IFwiMFwiO1xuICB0b29sdGlwRWwuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUdsb2JhbFRvb2x0aXAoKSB7XG4gIGlmICh0b29sdGlwRWwgJiYgdG9vbHRpcEVsLnBhcmVudE5vZGUpIHtcbiAgICB0b29sdGlwRWwuc3R5bGUub3BhY2l0eSA9IFwiMFwiO1xuICAgIHRvb2x0aXBFbC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcbiAgICB0b29sdGlwRWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0b29sdGlwRWwpO1xuICB9XG4gIGxvZyhcIlRvb2x0aXAgcmVtb3ZlZCBmcm9tIERPTVwiKTtcbn1cblxuLypcbkhJR0hMSUdIVElORyBFTEVNRU5UUzpcblxuVGV4dDogRE9ORVxuSW1hZ2VzOiBOT1QgRE9ORVxuVmlkZW86IE5PVCBET05FXG5BdWRpbzogTk9UIERPTkVcblxuKi9cbmFzeW5jIGZ1bmN0aW9uIGhpZ2hsaWdodF9lbGVtZW50cyhwYXlsb2FkKSB7XG4gIGxvZyhcInJhdyBwYXlsb2FkOiBcIiwgcGF5bG9hZCk7XG4gIGxvZyhcIkhpZ2hsaWdodGluZyBzdGFydGVkIGZvciBiYXRjaFwiLCBwYXlsb2FkLnRleHQ/Lmxlbmd0aCB8fCAwKTtcbiAgcHJvY2Vzc2luZyA9IGZhbHNlO1xuXG4gIGlmICghcGF5bG9hZCB8fCAhQXJyYXkuaXNBcnJheShwYXlsb2FkLnRleHQpKSByZXR1cm47XG5cbiAgbGV0IHRocmVzaG9sZHM7XG5cbiAgdHJ5IHtcbiAgICB0aHJlc2hvbGRzID0gYXdhaXQgZ2V0X3NldHRpbmdzKFwidGhyZXNob2xkc1wiKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkZhaWxlZFwiLCBlcnIpO1xuICAgIHRocmVzaG9sZHMgPSBbMzUsIDg1XTtcbiAgfVxuXG4gIGNvbnN0IFtsb3csIGhpZ2hdID0gdGhyZXNob2xkcztcblxuICBsZXQgYWlDb3VudCA9IDA7XG4gIGxldCBodW1hbkNvdW50ID0gMDtcbiAgbGV0IG1pZGRsZUNvdW50ID0gMDtcblxuICBmb3IgKGNvbnN0IGl0ZW0gb2YgcGF5bG9hZC50ZXh0KSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghaXRlbSB8fCAhaXRlbS54cGF0aCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZXZhbHVhdGUoXG4gICAgICAgIGl0ZW0ueHBhdGgsXG4gICAgICAgIGRvY3VtZW50LFxuICAgICAgICBudWxsLFxuICAgICAgICBYUGF0aFJlc3VsdC5GSVJTVF9PUkRFUkVEX05PREVfVFlQRSxcbiAgICAgICAgbnVsbFxuICAgICAgKS5zaW5nbGVOb2RlVmFsdWU7XG4gICAgICBsb2coXCJoaWdobGlnaHQgdGFyZ2V0IFwiLCBlbCwgXCItPlwiLCBlbD8udGV4dENvbnRlbnQuc2xpY2UoMCwgMTUwKSk7XG4gICAgICBpZiAoIWVsKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIkVsZW1lbnQgbm90IGZvdW5kIHdpdGggeHBhdGg6IFwiLCBpdGVtLnhwYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFpU2NvcmUgPSBpdGVtLkFJID8/IDA7XG4gICAgICBjb25zdCBodW1hblNjb3JlID0gaXRlbS5IVU1BTiA/PyAwO1xuICAgICAgY29uc3Qgc2NvcmUgPSBNYXRoLm1heChhaVNjb3JlLCBodW1hblNjb3JlKTtcblxuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZW50ZXJcIiwgKGUpID0+IHtcbiAgICAgICAgc2hvd1Rvb2x0aXBGb3IoXG4gICAgICAgICAgZWwsXG4gICAgICAgICAgc2NvcmUgPiBoaWdoXG4gICAgICAgICAgICA/IGBJdGVtIGlzIG1vc3QgbGlrZWx5IEFJLlxcbkFJOiAke2FpU2NvcmUudG9GaXhlZCgyKX1cXG5IdW1hbjogJHtodW1hblNjb3JlLnRvRml4ZWQoMil9XFxuYFxuICAgICAgICAgICAgOiBzY29yZSA+IGxvd1xuICAgICAgICAgICAgPyBgSXRlbSBjb3VsZCBiZSBBSSwgcHJvY2VlZCB3aXRoIGNhdXRpb24uXFxuQUk6ICR7YWlTY29yZS50b0ZpeGVkKDIpfVxcbkh1bWFuOiAke2h1bWFuU2NvcmUudG9GaXhlZCgyKX1cXG5gXG4gICAgICAgICAgICA6IGBJdGVtIGlzIG1vc3QgbGlrZWx5IG5vdCBBSS5cXG5BSTogJHthaVNjb3JlLnRvRml4ZWQoMil9XFxuSHVtYW46ICR7aHVtYW5TY29yZS50b0ZpeGVkKDIpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCBoaWRlVG9vbHRpcCk7XG5cbiAgICAgIGlmIChzY29yZSA+IGhpZ2gpIHtcbiAgICAgICAgYWlDb3VudCArPSAxO1xuICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShcImJvcmRlclwiLCBcIjVweCBzb2xpZCByZWRcIiwgXCJpbXBvcnRhbnRcIik7XG4gICAgICB9IGVsc2UgaWYgKHNjb3JlID4gbG93KSB7XG4gICAgICAgIG1pZGRsZUNvdW50ICs9IDE7XG4gICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KFwiYm9yZGVyXCIsIFwiNXB4IHNvbGlkIHllbGxvd1wiLCBcImltcG9ydGFudFwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGh1bWFuQ291bnQgKz0gMTtcbiAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoXCJib3JkZXJcIiwgXCI1cHggc29saWQgZ3JlZW5cIiwgXCJpbXBvcnRhbnRcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3JcIiwgZXJyLCBpdGVtKTtcbiAgICB9XG4gIH1cblxuICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoXCJzdGF0ZVwiLCAoeyBzdGF0ZSB9KSA9PiB7XG4gICAgY29uc3QgbmV3U3RhdGUgPSB7XG4gICAgICBhaVBvc0NvdW50OiBhaUNvdW50LFxuICAgICAgYWlTb21lQ291bnQ6IG1pZGRsZUNvdW50LFxuICAgICAgaHVtYW5Db3VudDogaHVtYW5Db3VudCxcbiAgICAgIHN0YXJ0ZWRBdDogc3RhdGUuc3RhcnRlZEF0LFxuICAgICAgc3RhdHVzOiBzdGF0ZS5zdGF0dXMsXG4gICAgICB0YWJJRDogc3RhdGUudGFiSUQsXG4gICAgfTtcblxuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHN0YXRlOiBuZXdTdGF0ZSB9KTtcbiAgfSk7XG5cbiAgbG9nKFwiSGlnaGxpZ2h0aW5nIGZpbmlzaGVkLCBwcm9jZXNzaW5nIGZsYWcgcmVzZXRcIik7XG5cbiAgc2NoZWR1bGVfc2VuZF9wYXlsb2FkKCk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0X2V2ZXJ5dGhpbmcoKSB7XG4gIC8vIFRFWFRcbiAgZm9yIChjb25zdCBpdGVtIG9mIHhwYXRoc19yZXNldCkge1xuICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZXZhbHVhdGUoXG4gICAgICBpdGVtLFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBudWxsLFxuICAgICAgWFBhdGhSZXN1bHQuRklSU1RfT1JERVJFRF9OT0RFX1RZUEUsXG4gICAgICBudWxsXG4gICAgKS5zaW5nbGVOb2RlVmFsdWU7XG5cbiAgICBpZiAoIWVsKSBjb250aW51ZTtcblxuICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KFwiYm9yZGVyXCIsIFwibm9uZVwiLCBcImltcG9ydGFudFwiKTtcbiAgfVxuXG4gIC8vIElNQUdFU1xuXG4gIC8vIFZJREVPU1xuXG4gIC8vIEFVRElPXG5cbiAgd29ya19xdWV1ZS5sZW5ndGggPSAwO1xuICBkdXBsaWNhdGVfc2V0LmNsZWFyKCk7XG4gIG11dGF0aW9uX29ic2VydmVyPy5kaXNjb25uZWN0KCk7XG4gIHN0b3Bfc2NoZWR1bGVyKCk7XG4gIHJlbW92ZUdsb2JhbFRvb2x0aXAoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0X3NldHRpbmdzKHBhcmFtKSB7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcInNldHRpbmdzXCIpO1xuICBjb25zdCBzZXR0aW5ncyA9IHJlc3VsdC5zZXR0aW5ncztcblxuICBpZiAocGFyYW0gPT0gXCJhbGxcIikge1xuICAgIHJldHVybiBzZXR0aW5ncztcbiAgfSBlbHNlIGlmIChwYXJhbSA9PSBcInRocmVzaG9sZHNcIikge1xuICAgIHJldHVybiBzZXR0aW5ncz8udGhyZXNob2xkcztcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9