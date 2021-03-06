const errors = require('../errors/analysis.js');

module.exports = context => {
  context.documentInstruction = {
    depth: 0,
    index: 0,
    length: 0,
    line: 1,
    name: '<>#:=|\\_ENO_DOCUMENT',
    ranges: {
      sectionOperator: [0, 0],
      name: [0, 0]
    },
    subinstructions: []
  };

  context.templateIndex = {};
  context.unresolvedInstructions = [];

  let lastContinuableInstruction = null;
  let lastFieldsetEntryNames = null;
  let lastNameInstruction = null;
  let lastSectionInstruction = context.documentInstruction;
  let activeSectionInstructions = [context.documentInstruction];
  let unresolvedIdleInstructions = [];

  for(let instruction of context.instructions) {

    if(instruction.type === 'NOOP') {
      if(lastNameInstruction) {
        unresolvedIdleInstructions.push(instruction);
      } else {
        lastSectionInstruction.subinstructions.push(instruction);
      }

      continue;
    }

    // TODO: Appending block content instructions to the block as subinstructions
    //       is probably not necessary anymore in the new architecture, this could
    //       save performance if we can omit it, investigate and follow up.
    if(instruction.type === 'BLOCK_CONTENT') {
      lastNameInstruction.subinstructions.push(instruction);
      continue;
    }

    if(instruction.type === 'FIELD') {
      lastSectionInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      instruction.subinstructions = [];

      lastContinuableInstruction = instruction;
      lastNameInstruction = instruction;

      if(context.templateIndex.hasOwnProperty(instruction.name)) {
        context.templateIndex[instruction.name].push(instruction);
      } else {
        context.templateIndex[instruction.name] = [instruction];
      }

      lastSectionInstruction.subinstructions.push(instruction);

      continue;
    }

    if(instruction.type === 'NAME') {
      lastSectionInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      instruction.subinstructions = [];

      lastContinuableInstruction = instruction;
      lastNameInstruction = instruction;

      if(instruction.template) {
        context.unresolvedInstructions.push(instruction);
      }

      if(instruction.name !== instruction.template) {
        if(context.templateIndex.hasOwnProperty(instruction.name)) {
          context.templateIndex[instruction.name].push(instruction);
        } else {
          context.templateIndex[instruction.name] = [instruction];
        }
      }

      lastSectionInstruction.subinstructions.push(instruction);

      continue;
    }

    if(instruction.type === 'LIST_ITEM') {
      if(lastNameInstruction === null) {
        throw errors.missingNameForListItem(context, instruction);
      }

      lastNameInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      instruction.name = lastNameInstruction.name;  // TODO: List items should just stay unnamed? But also used for e.g. name in loader and error callbacks ...
      instruction.subinstructions = [];

      if(lastNameInstruction.type === 'LIST') {
        lastNameInstruction.subinstructions.push(instruction);
        lastContinuableInstruction = instruction;
        continue;
      }

      if(lastNameInstruction.type === 'NAME') {
        lastNameInstruction.type = 'LIST';
        lastNameInstruction.subinstructions.push(instruction);
        lastContinuableInstruction = instruction;
        continue;
      }

      if(lastNameInstruction.type === 'FIELDSET') {
        throw errors.listItemInFieldset(context, instruction, lastNameInstruction);
      }

      if(lastNameInstruction.type === 'FIELD') {
        throw errors.listItemInField(context, instruction, lastNameInstruction);
      }
    }

    if(instruction.type === 'FIELDSET_ENTRY') {
      if(lastNameInstruction === null) {
        throw errors.missingNameForFieldsetEntry(context, instruction);
      }

      lastNameInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      instruction.subinstructions = [];

      if(lastNameInstruction.type === 'FIELDSET') {
        if(lastFieldsetEntryNames.has(instruction.name)) {
          throw errors.duplicateFieldsetEntryName(context, lastNameInstruction, instruction);
        } else {
          lastFieldsetEntryNames.add(instruction.name);
        }

        lastNameInstruction.subinstructions.push(instruction);
        lastContinuableInstruction = instruction;
        continue;
      }

      if(lastNameInstruction.type === 'NAME') {
        lastNameInstruction.type = 'FIELDSET';
        lastNameInstruction.subinstructions.push(instruction);
        lastFieldsetEntryNames = new Set([instruction.name]);
        lastContinuableInstruction = instruction;
        continue;
      }

      if(lastNameInstruction.type === 'LIST') {
        throw errors.fieldsetEntryInList(context, instruction, lastNameInstruction);
      }

      if(lastNameInstruction.type === 'FIELD') {
        throw errors.fieldsetEntryInField(context, instruction, lastNameInstruction);
      }
    }

    if(instruction.type ===  'BLOCK') {
      lastSectionInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      instruction.subinstructions = [];

      lastContinuableInstruction = null;
      lastNameInstruction = instruction;

      if(context.templateIndex.hasOwnProperty(instruction.name)) {
        context.templateIndex[instruction.name].push(instruction);
      } else {
        context.templateIndex[instruction.name] = [instruction];
      }

      lastSectionInstruction.subinstructions.push(instruction);

      continue;
    }

    if(instruction.type ===  'BLOCK_TERMINATOR') {
      lastNameInstruction.subinstructions.push(instruction);
      lastNameInstruction = null;
      continue;
    }

    if(instruction.type === 'CONTINUATION') {
      if(lastContinuableInstruction === null) {
        throw errors.missingElementForContinuation(context, instruction);
      }

      lastContinuableInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      if(lastNameInstruction.type === 'NAME') {
        lastNameInstruction.type = 'FIELD';
      }

      lastContinuableInstruction.subinstructions.push(instruction);
      continue;
    }

    if(instruction.type === 'SECTION') {
      lastSectionInstruction.subinstructions.push(...unresolvedIdleInstructions);
      unresolvedIdleInstructions = [];

      if(instruction.depth - lastSectionInstruction.depth > 1) {
        throw errors.sectionHierarchyLayerSkip(context, instruction, lastSectionInstruction);
      }

      if(instruction.depth > lastSectionInstruction.depth) {
        lastSectionInstruction.subinstructions.push(instruction);
      } else {
        while(activeSectionInstructions[activeSectionInstructions.length - 1].depth >= instruction.depth) {
          activeSectionInstructions.pop();
        }

        activeSectionInstructions[activeSectionInstructions.length - 1].subinstructions.push(instruction);
      }

      lastContinuableInstruction = null;
      lastNameInstruction = null;
      lastSectionInstruction = instruction;
      activeSectionInstructions.push(instruction);

      if(instruction.template) {
        context.unresolvedInstructions.push(instruction);
      }

      if(instruction.name !== instruction.template) {
        if(context.templateIndex.hasOwnProperty(instruction.name)) {
          context.templateIndex[instruction.name].push(instruction);
        } else {
          context.templateIndex[instruction.name] = [instruction];
        }
      }

      instruction.subinstructions = [];

      continue;
    }

  } // ends for(let instruction of context.instructions)

  if(unresolvedIdleInstructions.length > 0) {
    lastSectionInstruction.subinstructions.push(...unresolvedIdleInstructions);
    unresolvedIdleInstructions = [];
  }
}
