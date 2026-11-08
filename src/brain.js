const personalities = {
  strategic: ['Let us plan this properly.', 'I will coordinate the others.'],
  patient: ['Understood. I will take it step by step.', 'No need to rush good work.'],
  ambitious: ['We can make this greater.', 'I have a bigger vision for this.'],
  curious: ['I want to see what is beyond there.', 'Interesting. I will investigate.'],
  loyal: ['As you command.', 'I have your back, Commander.'],
  cunning: ['There may be another way.', 'I will consider our options.'],
  aggressive: ['Then let us stand our ground.', 'We should be ready.']
};
export function personalityReply(personality = 'patient') {
  const phrases = personalities[personality] ?? personalities.patient;
  return phrases[Math.floor(Math.random() * phrases.length)];
}
export function interpretOrder(message) {
  const text = message.toLowerCase();
  if (/\b(follow me|come with me|come here|follow)\b/.test(text)) return { type: 'follow' };
  if (/\b(stop|stay there|hold position|stand down)\b/.test(text)) return { type: 'stop' };
  if (/\b(defend|guard|protect)\b/.test(text)) return { type: 'defend' };
  if (/\b(scout|explore|look around|investigate)\b/.test(text)) return { type: 'scout' };
  if (/\b(build|construct|make)\b/.test(text) && /\b(castle|fortress|wall|base|house)\b/.test(text)) return { type: 'build_request' };
  if (/\b(gather|get|collect|mine)\b/.test(text) && /\b(wood|stone|iron|food|resources)\b/.test(text)) return { type: 'gather_request' };
  return { type: 'conversation' };
}
export function replyTo(message, bot) {
  const order = interpretOrder(message);
  if (order.type !== 'conversation') return order;
  const lower = message.toLowerCase();
  if (/\b(thank you|thanks)\b/.test(lower)) return { type: 'conversation', reply: 'Of course. We are on the same team.' };
  if (/\b(what is your name|who are you)\b/.test(lower)) return { type: 'conversation', reply: `I am ${bot.username}, ${bot.role} of my faction.` };
  if (/\b(are you loyal|can i trust you)\b/.test(lower)) return { type: 'conversation', reply: bot.personality === 'cunning' ? 'Trust is earned through actions, Commander.' : 'I serve my faction. Judge me by what I do.' };
  return { type: 'conversation', reply: personalityReply(bot.personality) };
}