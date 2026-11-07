// Trains the Echo in the background between fights: a small MLP that copies the
// player's choices (behavior cloning). The trained model is saved to IndexedDB.

import * as tf from '@tensorflow/tfjs';
import { N_ACTIONS, N_FEATURES } from '../core/features.ts';
import { allMatches } from './store.ts';

const MODEL_URL = 'indexeddb://echo-model';
const EPOCHS = 20;

self.onmessage = async () => {
  await tf.setBackend('cpu');
  const matches = await allMatches();
  const xs: number[] = [], ys: number[] = [];
  for (const m of matches) { xs.push(...m.x); ys.push(...m.y); }
  const n = ys.length;
  if (n < 50) { postMessage({ type: 'error', msg: 'not enough data' }); return; }

  // rare actions (supers, throws) still matter, so weight classes by inverse frequency
  const counts = new Array(N_ACTIONS).fill(0);
  for (const y of ys) counts[y]++;
  const classWeight: Record<number, number> = {};
  counts.forEach((c, k) => { classWeight[k] = c ? Math.min(4, Math.max(0.5, n / (N_ACTIONS * c))) : 1; });

  const x = tf.tensor2d(xs, [n, N_FEATURES]);
  const y = tf.oneHot(tf.tensor1d(ys, 'int32'), N_ACTIONS);
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [N_FEATURES], units: 128, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.15 }),
      tf.layers.dense({ units: 64, activation: 'relu' }),
      tf.layers.dense({ units: N_ACTIONS, activation: 'softmax' }),
    ],
  });
  model.compile({ optimizer: tf.train.adam(0.002), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

  const loss: number[] = [];
  let valAcc = 0;
  await model.fit(x, y, {
    epochs: EPOCHS, batchSize: 64, shuffle: true, validationSplit: 0.15, classWeight,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        loss.push(logs?.loss ?? 0);
        valAcc = (logs?.val_acc ?? logs?.val_accuracy ?? valAcc) as number;
        postMessage({ type: 'progress', epoch: epoch + 1, epochs: EPOCHS, loss: logs?.loss, valAcc });
      },
    },
  });
  await model.save(MODEL_URL);
  postMessage({ type: 'done', samples: n, matches: matches.length, loss, valAcc, counts });
  x.dispose(); y.dispose();
};
