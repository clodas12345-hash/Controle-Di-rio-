const fs = require('fs');
const path = require('path');
const getDistPath = () => {
  return fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
    ? path.join(process.cwd(), "dist")
    : (typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html"))
        ? __dirname
        : process.cwd());
};
console.log(getDistPath());
