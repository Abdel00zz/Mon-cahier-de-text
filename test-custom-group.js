function extractCustomLevelAndGroup(name) {
  const match = name.match(/^(.*?)\s+(\d{1,2})$/);
  if (match) {
    return { level: match[1], group: match[2] };
  }
  return { level: name, group: '' };
}
console.log(extractCustomLevelAndGroup("Custom Class 1"));
