const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const startIndex = content.indexOf('// Replicate current selected month fixed expenses to all future months');
const endIndex = content.indexOf('// Open modal for a specific date');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
  fs.writeFileSync(path, content);
  console.log("Removed function");
} else {
  console.error("Could not find function bounds", startIndex, endIndex);
}
