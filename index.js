const tf = require('@tensorflow/tfjs-node-gpu');
const fs = require('fs/promises');
const path = require('path');

const loadData = async (validation = false) => {
  console.log(`Loading ${validation ? 'validation' : 'training'} data...`);

  const dir = path.join(__dirname, 'data', validation ? 'validate' : 'train');
  const files = await fs
    .readdir(dir)
    .then((d) => d.filter((f) => f.split('.').pop() === 'json'));

  const datas = [];
  const labels = [];

  let count = 0;
  for (const file of files) {
    count++;
    const data = require(path.join(dir, file));
    data.forEach((i) => {
      labels.push(i.pop()[0]);
      datas.push(i);
    });

    console.log(
      `Loaded from "${file}" | ${((count / files.length) * 100).toFixed()}%`
    );
  }

  return [
    tf.stack(datas.map((t) => tf.reshape(t, [256, 256, 1]))),
    tf.tensor1d(labels, 'int32'),
  ];
};

const createModel = () => {
  const cnn = tf.sequential();

  // Layers
  cnn.add(
    tf.layers.conv2d({
      inputShape: [256, 256, 1],
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );

  cnn.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  cnn.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );

  cnn.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  cnn.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 32,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );

  cnn.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  cnn.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 32,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );

  cnn.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  cnn.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );

  cnn.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  cnn.add(tf.layers.flatten());

  cnn.add(
    tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
    })
  );

  // Compile
  cnn.compile({
    optimizer: tf.train.sgd(0.2),
    loss: 'meanSquaredError',
    metrics: ['accuracy'],
  });

  return cnn;
};

const trainModel = async (model, epochs = 20) => {
  const batchSize = 32;

  const [trainX, trainY] = await loadData();
  const [valX, valY] = await loadData(true);

  return await model.fit(trainX, trainY, {
    batchSize,
    epochs,
    shuffle: true,
    validationData: [valX, valY],
    callbacks: {
      onTrainBegin() {
        console.log('-- Begin training --');
      },
      onTrainEnd() {
        console.log('-- Finished training --');
      },
    },
  });
};

const saveModel = async (model) => {
  // Save model
  await model.save(
    'file:///Projects/Github/thighs-classifier/server/public/model'
  );

  console.log('Saved model');
};

const main = async () => {
  const model = createModel();

  process.once('SIGINT', async () => {
    model.stopTraining = true;
    await saveModel(model);

    process.exit(0);
  });

  const history = await trainModel(model, 150);
  fs.writeFile(
    path.join(__dirname, 'server', 'public', 'model', 'history.json'),
    JSON.stringify(history)
  );

  await saveModel(model);
  process.exit(0);
};

main();
