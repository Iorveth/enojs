const Section = require('./elements/section.js');

const analyze = require('./parse_steps/analyze.js');
const resolve = require('./parse_steps/resolve.js');
const tokenize = require('./parse_steps/tokenize.js');

class Parser {
  constructor(input, options) {
    this.context = options;
    this.context.input = input;
  }

  run() {
    tokenize(this.context);
    analyze(this.context);
    resolve(this.context);

    this.context.document = new Section(this.context, this.context.documentInstruction, null);

    return this.context.document;
  }
}

module.exports = Parser;
