// Keep track of what is already processed
const processedImages = new Set()
const processedTexts = new Set()
const processedIframes = new Set()

let payloadImages = []
let payloadTexts = []
let payloadIframes = []

function process_images(images){
  for (let i = 0; i < images.length; i++){
    let image = images[i];
    if (image.width > 30 && image.height > 30) {
      if (image.src && !processedImages.has(image)){
        processedImages.add(image);

        let temp_image = {
          "alt": image.alt,
          "src": image.src
        }

        payloadImages.push(temp_image)
      }
    }
  }

}

function process_texts(texts){
  for (let j = 0; j < texts.length; j++){
    let text = texts[j];
    
    //payloadTexts.push(text.innerHTML);
  }

  chrome.runtime.sendMessage({
    type: "PARSED_TEXT",
    payload: {
      data: payloadTexts,
      source: "content"
    }
  });
}

function process_videos(videos) {

}

function process_iframes(iframes){

}

function scrapeInitial() {
  // Images
  let images = document.querySelectorAll('img');
  process_images(images);
  // Text
  let texts = document.querySelectorAll('p');
  process_texts(texts);

  let videos = document.querySelectorAll('video');

  let audios = document.querySelectorAll('audio');

  let iframes = document.querySelectorAll('iframe');

}

function setup() {
  scrapeInitial()
}

if (
  document.readyState === 'interactive' ||
  document.readyState === 'complete'
) {
  setup()
} else {
  window.addEventListener('DOMContentLoaded', setup)
}