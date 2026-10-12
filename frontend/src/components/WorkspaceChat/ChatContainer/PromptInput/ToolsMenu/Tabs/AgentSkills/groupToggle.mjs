export function readGroup(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export async function toggleGroup({
  storage,
  key,
  getItems,
  afterToggle = async () => {},
}) {
  const prior = readGroup(storage, key),
    disabling = !prior?.disabled;
  const selection = disabling
    ? Object.fromEntries(getItems().map((item) => [item.id, !!item.enabled]))
    : prior.selection;
  // Save first: an interrupted operation retains the original selections for recovery.
  storage.setItem(key, JSON.stringify({ disabled: true, selection }));
  for (const id of getItems().map((item) => item.id)) {
    const item = getItems().find((item) => item.id === id);
    if (!item) continue;
    const target = disabling
      ? false
      : Object.hasOwn(selection || {}, id)
        ? selection[id]
        : item.enabled;
    if (!!item.enabled !== !!target) {
      await item.onToggle();
      await afterToggle();
    }
  }
  const result = { disabled: disabling, selection };
  storage.setItem(key, JSON.stringify(result));
  return result;
}
