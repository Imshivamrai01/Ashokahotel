const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '.next');
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Successfully deleted .next directory cache!');
} else {
  console.log('.next directory not found, nothing to delete.');
}
