async function run_model() {
  const model = await tf.loadLayersModel(
    chrome.runtime.getURL("model/model.json")
  );

  const text = "Hello World!";
  const input = tf.tensor2d([[1, 2, 3, 4]]);

  const prediction = model.predict(input);
  const values = await prediction.data();

  console.log("Input text: ", text);
  console.log("Prediction: ", values);
}

run_model();
