const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const isNotThighs = !!process.env.NOT_THIGHS;

const grayscale = (pth, outDir, name) => {
  return new Promise((resolve, reject) => {
    (async () => {
      const img = sharp(pth);
      const meta = await img.metadata();
      img
        .extract({
          left: 0,
          top: 0,
          width: meta.width,
          height: Math.floor(meta.height - meta.height * 0.074),
        })
        .grayscale()
        .resize(256, 256, {
          position: 'bottom',
          kernel: 'lanczos3',
        })
        .png()
        .toFile(
          path.join(outDir, [...name.split('.').slice(0, -1), 'png'].join('.')),
          (err, i) => {
            if (err) return reject(err);
            return resolve(i);
          }
        );
    })();
  });
};

console.time('Time Took');
(async () => {
  const dir = path.join(__dirname, isNotThighs ? 'not-thighs' : 'thighs');
  const files = await fs.readdir(dir);
  const images = files.filter((f) => {
    const format = f.split('.').pop();
    return (
      format === 'png' ||
      format === 'jpg' ||
      format === 'webp' ||
      format === 'jpeg'
    );
  });

  if (!images.length) {
    console.log('There is no images');
    return process.exit();
  }

  console.log(`Processing ${images.length} images`);

  let count = 0;
  for (const image of images) {
    count++;

    await grayscale(path.join(dir, image), path.join(dir, 'rescaled'), image);
    console.log(
      `Processed ${image} | ${((count / images.length) * 100).toFixed(2)}%`
    );
  }

  console.timeEnd('Time Took');
  console.log(`Finished processing ${images.length} image(s)`);
})();
