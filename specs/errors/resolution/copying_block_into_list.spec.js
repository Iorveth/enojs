const eno = require('../../../eno.js');

const input = `
-- original
value
-- original

copy < original
- item
`.trim();

describe('resolution.copyingBlockIntoList', () => {

  let error;

  beforeAll(() => {
    try {
      eno.parse(input);
    } catch(err) {
      error = err;
    }
  })

  it(`provides the correct message`, () => {
    expect(error.message).toMatchSnapshot();
  });

  it(`provides correct selection metadata`, () => {
    expect(error.selection).toMatchSnapshot();
  });
});
