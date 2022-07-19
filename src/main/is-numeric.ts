const isNumeric = (txt: string) => {
  if (typeof txt !== 'string') {
    return false;
  }
  return !Number.isNaN(txt) && !Number.isNaN(Number.parseFloat(txt));
};

export default isNumeric;
