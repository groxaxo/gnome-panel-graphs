import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSample, sampleX, WINDOW_SECONDS} from '../history.js';

test('keeps exactly the last 15 seconds, including its boundary', () => {
    const input = [{time: 84, value: .1}, {time: 85, value: .2}, {time: 99, value: .3}];
    assert.deepEqual(recordSample(input, 100, .4), [input[1], input[2], {time: 100, value: .4}]);
    assert.equal(input.length, 3);
    assert.equal(WINDOW_SECONDS, 15);
});
test('one-second sampling stays bounded to 16 points', () => {
    let samples = [];
    for (let now = 0; now < 3600; now++) samples = recordSample(samples, now, .5);
    assert.equal(samples.length, 16);
    assert.equal(samples[0].time, 3584);
});
test('invalid values do not invent zero readings and old data still expires', () => {
    assert.deepEqual(recordSample([{time: 0, value: .5}], 16, NaN), []);
    assert.deepEqual(recordSample([], 1, Infinity), []);
    assert.equal(recordSample([], 1, 2)[0].value, 1);
    assert.equal(recordSample([], 1, -1)[0].value, 0);
});
test('time axis stays fixed at 15 seconds even during startup', () => {
    assert.equal(sampleX(85, 100, 72), 2);
    assert.equal(sampleX(92.5, 100, 72), 36);
    assert.equal(sampleX(100, 100, 72), 70);
    assert.equal(sampleX(95, 100, 72), 2 + 10 / 15 * 68);
});
