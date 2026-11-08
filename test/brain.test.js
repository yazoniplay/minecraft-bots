import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretOrder, replyTo } from '../src/brain.js';

test('recognizes commander movement and stance orders', () => {
  assert.equal(interpretOrder('Everyone follow me').type, 'follow');
  assert.equal(interpretOrder('Hold position').type, 'stop');
  assert.equal(interpretOrder('Defend this area').type, 'defend');
  assert.equal(interpretOrder('Retreat').type, 'stop');
});

test('recognizes faction combat and scouting orders', () => {
  assert.equal(interpretOrder('Attack').type, 'attack');
  assert.equal(interpretOrder('Charge the enemy').type, 'attack');
  assert.equal(interpretOrder('Scout the area').type, 'scout');
});

test('recognizes construction and resource requests', () => {
  assert.equal(interpretOrder('Build a castle').type, 'build_request');
  assert.equal(interpretOrder('Gather wood').type, 'gather_request');
});

test('conversation response uses the bot identity', () => {
  const result = replyTo('Who are you?', {
    username: 'Nour_Guard',
    role: 'soldier',
    personality: 'loyal'
  });
  assert.match(result.reply, /Nour_Guard/);
  assert.equal(result.type, 'conversation');
});
