const fs = require("node:fs");
const path = require("node:path");

const PROFILE_FILENAME = "Al Ras Group - Company Profile.pdf";
const PROFILE_PATH = path.join(__dirname, "../../assets/email", PROFILE_FILENAME);
// Bounded responses stay below serverless response limits; the document remains private.
const PROFILE_PART_SIZE = 1024 * 1024;

function readProfilePart(part) {
  if (!/^\d{1,3}$/.test(String(part))) return null;
  const size = fs.statSync(PROFILE_PATH).size;
  const parts = Math.ceil(size / PROFILE_PART_SIZE);
  if (Number(part) >= parts) return null;
  const offset = Number(part) * PROFILE_PART_SIZE;
  const buffer = Buffer.alloc(Math.min(PROFILE_PART_SIZE, size - offset));
  const fd = fs.openSync(PROFILE_PATH, "r");
  try { fs.readSync(fd, buffer, 0, buffer.length, offset); }
  finally { fs.closeSync(fd); }
  return { buffer, parts, size };
}

module.exports = { PROFILE_FILENAME, readProfilePart };
