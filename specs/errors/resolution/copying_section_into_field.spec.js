const eno = require('../../../eno.js');

const input = `
# original

# other

copy < original
| appendix
`.trim();

describe('resolution.copyingSectionIntoField', () => {

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
