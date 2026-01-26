const TinyPinyin = require('tiny-pinyin');

const chars = ['一', '有', 'A', 'b', '1', '点', '通'];

chars.forEach(c => {
  console.log(`Char: ${c}`);
  console.log(`Is Supported: ${TinyPinyin.isSupported(c)}`);
  console.log(`Pinyin: ${TinyPinyin.convertToPinyin(c)}`);
  console.log('---');
});
