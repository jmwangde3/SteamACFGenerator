/**
 * @param {string} txt
 * */
const isNumeric = (txt) => {
  if (typeof txt !== 'string') {
    return false;
  }
  return !Number.isNaN(txt) && !Number.isNaN(Number.parseFloat(txt));
};

module.exports = isNumeric;
