// Keep track of what is already processed
const processedImages = new Set()
const processedTexts = new Set()
const processedIframes = new Set()

let payloadImages = []
let payloadTexts = []
let payloadIframes = []

function isValidTextNode(node) {
  // skip if in a header/nav/footer
  if (node.parentElement.closest('header, nav, footer')) return false
  // collapse whitespace & trim
  const txt = node.textContent.replace(/\s+/g, ' ').trim()
  return txt.length >= 50
}

function processTextNode(node) {
  const txt = node.textContent.replace(/\s+/g, ' ').trim()
  if (txt.length < 50) return
  if (node.parentElement.closest('header, nav, footer')) return
  if (processedTexts.has(txt)) return
  processedTexts.add(txt)
  payloadTexts.push(txt)
}

function isValidImage(img) {
  // skip tiny/decorative
  if (img.naturalWidth < 40 || img.naturalHeight < 40) return false
  // skip if in boilerplate
  //if (img.closest('header, nav, footer')) return false
  return !!img.currentSrc
}

function processImage(img) {
  if (!isValidImage(img)) return
  const key = img.currentSrc + '|' + img.alt
  if (processedImages.has(key)) return
  processedImages.add(key)
  payloadImages.push({ src: img.currentSrc, alt: img.alt })
}

function processIframe(iframe) {
  const src = iframe.src
  if (!src || processedIframes.has(src)) return
  processedIframes.add(src)
  payloadIframes.push(src)
}

// Recursively scan a node (used by MutationObserver)
function traverseNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (isValidTextNode(node)) processTextNode(node)
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName
    if (tag === 'IMG') {
      processImage(node)
    } else if (tag === 'IFRAME') {
      // same-origin frames have contentDocument
      try {
        if (!node.contentDocument) processIframe(node)
      } catch (_) {
        processIframe(node)
      }
    } else {
      node.childNodes.forEach(traverseNode)
    }
  }
}

// Send whatever we’ve collected (if non-empty)
function sendPayload() {
  if (
    payloadImages.length === 0 &&
    payloadTexts.length === 0 &&
    payloadIframes.length === 0
  ) {
    return
  }
  chrome.runtime.sendMessage({
    type: 'SCRAPED_PAYLOAD',
    payload: {
      images: payloadImages,
      texts: payloadTexts,
      iframes: payloadIframes
    }
  })
  // reset for next batch
  payloadImages = []
  payloadTexts = []
  payloadIframes = []
}

function scrapeInitial() {
  // images
  document.querySelectorAll('img').forEach(processImage)

  // text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: node =>
        isValidTextNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    },
    false
  )
  while (walker.nextNode()) {
    processTextNode(walker.currentNode)
  }

  // cross-origin iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      if (!iframe.contentDocument) processIframe(iframe)
    } catch (_) {
      processIframe(iframe)
    }
  })
}

function setup() {
  scrapeInitial()

  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(traverseNode)
    })
    sendPayload()
  })
  mo.observe(document.body, { childList: true, subtree: true })
}

if (
  document.readyState === 'interactive' ||
  document.readyState === 'complete'
) {
  setup()
} else {
  window.addEventListener('DOMContentLoaded', setup)
}