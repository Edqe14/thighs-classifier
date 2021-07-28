const fs = require('fs/promises');
const path = require('path');
const Canvas = require('canvas');

const isValidator = !!process.env.VALIDATOR;

const getValues = (pth, truthy = 1) => {
  return new Promise((resolve) => {
    (async () => {
      const canvas = Canvas.createCanvas(256, 256);
      const ctx = canvas.getContext('2d');

      const img = await Canvas.loadImage(pth);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const arr = [];
      for (let y = 1; y <= 256; y++) {
        const row = [];
        for (let x = 1; x <= 256; x++) {
          const data = ctx.getImageData(x, y, 1, 1).data;
          // Normalize
          row.push(data[0] / 255);
        }

        arr.push(row);
      }

      arr.push([truthy]);
      resolve(arr);
    })();
  });
};

console.time('Time Took');
(async () => {
  const thighsDir = isValidator
    ? path.join(__dirname, 'validator')
    : path.join(__dirname, 'thighs', 'rescaled');
  const notThighsDir = isValidator
    ? path.join(__dirname, 'validator', 'not')
    : path.join(__dirname, 'not-thighs', 'rescaled');

  const thighsFiles = (await fs.readdir(thighsDir)).filter((f) => {
    const format = f.split('.').pop();
    return format === 'png' || format === 'jpg' || format === 'webp';
  });

  const notThighsFiles = (await fs.readdir(notThighsDir)).filter((f) => {
    const format = f.split('.').pop();
    return format === 'png' || format === 'jpg' || format === 'webp';
  });

  const total = thighsFiles.length + notThighsFiles.length;
  console.log(`Processing ${total} images...`);

  const files = [
    [1, thighsFiles],
    [0, notThighsFiles],
  ];

  const values = [];

  let ct = 0;
  for (const images of files) {
    const type = images[0];

    for (const image of images[1]) {
      ct++;
      const val = await getValues(
        path.join(type === 1 ? thighsDir : notThighsDir, image),
        type
      );

      values.push(val);
      console.log(`Processed ${image} | ${((ct / total) * 100).toFixed(2)}%`);
    }
  }

  const extractedDir = path.join(__dirname, 'extracted');
  const extracted = await fs.readdir(extractedDir);
  const old = extracted.filter(
    (f) =>
      f.startsWith(isValidator ? 'validator' : 'train') &&
      f.split('.').pop() === 'json'
  );

  if (old.length > 0) {
    console.log(`Deleting ${old.length} old files...`);
    old.forEach((f) => fs.unlink(path.join(extractedDir, f)));
  }

  console.log('Writing files...');

  let sliced = values.splice(0, 20);
  let count = 1;
  while (sliced.length !== 0) {
    await fs.writeFile(
      path.join(
        extractedDir,
        `${isValidator ? 'validator' : 'train'}_${count}.json`
      ),
      JSON.stringify(sliced)
    );
    count++;
    sliced = values.splice(0, 20);
  }

  console.log(`Written ${count} files`);

  console.timeEnd('Time Took');
  console.log(`Finished processing ${total} image(s)`);
})();
