export const logTuningReport = (vals: number[], name = 'Tuning') => {
  let min = Infinity;
  let max = -Infinity;
  let sumOfSquares = 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

  for (const val of vals) {
    if (val < min) min = val;
    if (val > max) max = val;

    sumOfSquares += Math.pow(val - avg, 2);
  }

  const stdDev = Math.sqrt(sumOfSquares / vals.length);

  console.group(`📣📣📣 Special ${name} Report 📣📣📣`);
  console.log('min', min);
  console.log('max', max);
  console.log('avg', avg);
  console.log('stdDev', stdDev);
  console.groupEnd();
}
