export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 30;

export function validateDisplayName(rawName) {
  const name = (rawName ?? '').replace(/\s+/g, ' ').trim();
  if (!name) {
    return { ok: false, error: 'Please enter your name.' };
  }
  if (name.length < NAME_MIN_LENGTH) {
    return { ok: false, error: `Name must be at least ${NAME_MIN_LENGTH} characters.` };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `Name must be at most ${NAME_MAX_LENGTH} characters.` };
  }
  return { ok: true, name };
}
