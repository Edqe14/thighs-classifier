/* eslint-disable no-undef */
const input = document.getElementById('input');
const preview = document.getElementById('preview');
const prediction = document.getElementById('predict');
const confidence = document.getElementById('confidence');
const debugImages = document.getElementById('debug');

const debug = true;

const loadModel = async () => {
  const model = await tf.loadLayersModel('./model/model.json');
  return model;
};

const draw = (image, gap, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, gap * -1, canvas.width, height + gap + 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const data = [];
  for (let y = 0; y < canvas.height; y++) {
    const row = [];
    for (let x = 0; x < canvas.width; x++) {
      const index = x * 4 * canvas.width + y * 4;

      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];

      const average = (red + green + blue) / 3;

      imageData.data[index] = average;
      imageData.data[index + 1] = average;
      imageData.data[index + 2] = average;
      ctx.putImageData(imageData, 0, 0);

      row.push(average / 255);
    }

    data.push(row);
  }

  if (debug) debugImages.appendChild(canvas);
  return data;
};

const processImage = async (obj, model) => {
  // Debug
  if (debug) debugImages.innerHTML = '';

  const image = new Image();

  image.addEventListener('load', async () => {
    const rescaledHeight = (256 / image.width) * image.height;
    const gap = rescaledHeight - 256;

    const data1 = draw(
      image,
      gap,
      rescaledHeight + (256 - rescaledHeight + rescaledHeight * 0.074)
    );
    const data2 = draw(image, gap, rescaledHeight + (256 - rescaledHeight));

    const predict1 = model.predict(tf.reshape(data1, [1, 256, 256, 1]));
    const predict2 = model.predict(tf.reshape(data2, [1, 256, 256, 1]));
    const [conf1, conf2] = await Promise.all([
      predict1.data(),
      predict2.data(),
    ]);

    const conf = Math.max(conf1, conf2);
    const guess = conf <= 0.5 ? 'Not Thighs' : 'Thighs';
    prediction.innerHTML = guess;
    confidence.innerHTML = conf.toFixed(2);
  });

  image.src = URL.createObjectURL(obj);
};

(async () => {
  const model = await loadModel();

  const handleChange = () => {
    const [file] = input.files;
    if (file) {
      const url = URL.createObjectURL(file);
      preview.src = url;

      processImage(file, model);
    }
  };

  input.addEventListener('change', handleChange);
})();
