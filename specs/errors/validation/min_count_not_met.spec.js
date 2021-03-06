const eno = require('../../../eno.js');

const input = `
languages:
- eno
- json
`.trim();

describe('validation.minCountNotMet', () => {
  const document = eno.parse(input);

  let error;
  try {
    document.list('languages', { minCount: 3 });
  } catch(err) {
    error = err;
  }

  it(`provides a correct message`, () => {
    expect(error.message).toMatchSnapshot();
  });

  it(`provides correct selection metadata`, () => {
    expect(error.selection).toMatchSnapshot();
  });
});
