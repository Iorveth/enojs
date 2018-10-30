const analyze = require('../../lib/parse_steps/analyze.js');
const tokenize = require('../../lib/parse_steps/tokenize.js');

module.exports = input => {
  const context = { input: input };

  tokenize(context);
  analyze(context);

  return context.instructions;
};
