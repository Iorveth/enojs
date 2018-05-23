const errors = require('../errors/validation.js');

class EnoValue {
  constructor(context, instruction, parent) {
    this.context = context;
    this.instruction = instruction;
    this.name = instruction.name;
    this.parent = parent;
    this._value = instruction.value || null;
    this.touched = false;

    instruction.element = this;

    if(instruction.subinstructions) {
      for(let subinstruction of instruction.subinstructions) {
        subinstruction.element = this;

        if(subinstruction.type === 'FIELD_APPEND' &&
           subinstruction.value !== null) {
          if(this._value === null) {
            this._value = subinstruction.value;
          } else {
            this._value += subinstruction.separator + subinstruction.value;
          }
          continue;
        }

        if(subinstruction.type === 'BLOCK_CONTENT') {
          if(this._value === null) {
            this._value = subinstruction.line;
          } else {
            this._value += '\n' + subinstruction.line;
          }
          continue;
        }
      }
    }
  }

  get [Symbol.toStringTag]() {
    return 'EnoValue';
  }

  explain(indentation = '') {
    return `${indentation}${this.context.messages.inspection.value} ${this._value} (${this.name})`;
  }

  getError(message) {
    return errors.valueError(this.context, message, this.instruction, true);
  }

  isEmpty() {
    return this._value === null;
  }

  raw() {
    if(this.name) {
      return { [this.name]: this._value };
    } else {
      return this._value;
    }
  }

  toString() {
    let value = this._value.replace('\n', '\\n');

    if(value.length > 14) {
      value = value.substr(0, 11) + '...';
    }

    if(this.name) {
      return `[Object EnoValue name="${this.name}" value="${value}"]`;
    } else {
      return `[Object EnoValue value="${value}"]`;
    }
  }

  touch() {
    this.touched = true;
  }

  value(...optional) {
    let loader = null;

    for(let argument of optional) {
      if(typeof argument === 'function') {
        loader = argument;
      }
    }

    this.touched = true;

    if(this._value !== null && loader) {
      try {
        return loader({ name: this.name, value: this._value });
      } catch(message) {
        errors.valueError(this.context, message, this.instruction);
      }
    }

    return this._value;
  }
}

module.exports = EnoValue;