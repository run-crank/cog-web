// Dynamically imports lighthouse as an ES module
async function loadLighthouse() {
  return (await import("lighthouse")).default;
}

module.exports = loadLighthouse;
