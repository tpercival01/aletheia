
import * as tf from "@tensorflow/tfjs";
import { env, AutoTokenizer } from "@xenova/transformers";

env.allowLocalModels = true;
tf.setBackend("cpu");

const MODEL_URL = chrome.runtime.getURL("models/text/tfjs_model/model.json");
const modelPromise = tf.loadGraphModel(MODEL_URL);

let tokenizerInstance = null;
const tokenizerPromise = (async () => {
  if (tokenizerInstance) return tokenizerInstance;

  const tokenizer = await AutoTokenizer.from_pretrained(
    "google/electra-small-discriminator"
  );
  tokenizerInstance = tokenizer;
  return tokenizer;
})();

function toInt32Arr(bigArr, maxLen = 64) {
  if (!bigArr) return new Array(maxLen).fill(0);

  const nums = Array.from(bigArr).map((x) => Number(x));
  if (nums.length < maxLen) {
    nums.push(...new Array(maxLen - nums.length).fill(0));
  }
  nums.length = maxLen;
  return nums;
}

async function predictSingle(text, maxLen = 64) {
  try {
    const model = await modelPromise;
    const tokenizer = await tokenizerPromise;

    const tokenIds = tokenizer.encode(text);

    const truncatedIds = tokenIds.slice(0, maxLen);

    const idsArr = toInt32Arr(truncatedIds, maxLen);

    const maskArr = idsArr.map((id) => (id !== 0 ? 1 : 0));

    const typeArr = new Array(maxLen).fill(0);

    const inputIdsTensor = tf.tensor([idsArr], [1, maxLen], "int32");
    const maskTensor = tf.tensor([maskArr], [1, maxLen], "int32");
    const typeIdsTensor = tf.tensor([typeArr], [1, maxLen], "int32");

    const inputs = {
      input_ids: inputIdsTensor,
      attention_mask: maskTensor,
      token_type_ids: typeIdsTensor,
    };

    const output = model.execute
      ? model.execute(inputs)
      : model.predict(inputs);
    const logits = await output.array();

    const row = logits[0];
    let result;
    if (row.length === 1) {
      const x = row[0];
      result = 1 / (1 + Math.exp(-x));
    } else {
      const exps = row.map((v) => Math.exp(v));
      const sum = exps.reduce((a, b) => a + b, 0);
      result = exps[1] / sum;
    }

    inputIdsTensor.dispose();
    maskTensor.dispose();
    typeIdsTensor.dispose();
    output.dispose();

    return result;
  } catch (error) {
    console.error(
      `Error processing text: "${text.substring(0, 30)}..."`,
      error
    );
  }
}
async function analyseTexts(texts) {
  const results = [];

  for (let i = 0; i < texts.length; i++) {
    console.log(
      `Processing text ${i}:`,
      texts[i].substring(0, 50) + (texts[i].length > 50 ? "..." : "")
    );
    const result = await predictSingle(texts[i]);
    results.push(result);
  }

  return results;
}

(async () => {
  const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "In a village of La Mancha, the name of which I have no desire to call to mind, there lived not long since one of those gentlemen that keep a lance in the lance-rack, an old buckler, a lean hack, and a greyhound for coursing.",
    "Artificial intelligence is transforming the world in unprecedented ways.",
    "To be, or not to be, that is the question.",
    "The rain in Spain stays mainly in the plain.",
    "Once upon a time in a land far, far away, there lived a young princess who dreamed of adventure and excitement beyond the castle walls.",
    "The mitochondria is the powerhouse of the cell.",
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
  ];

  try {
    const confidences = await analyseTexts(sentences);
    console.log("Final results:", confidences);
  } catch (error) {
    console.error("Analysis failed:", error);
  }
})();
