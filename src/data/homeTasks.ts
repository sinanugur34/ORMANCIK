import type { TrKey } from '../i18n';

/** Optional home practice. Marking one does not write an English score. */
export const HOME_TASKS: { id: string; say: string; clipId: string; label: TrKey }[] = [
  { id: 'home.cat', say: 'Find the cat.', clipId: 'cat-find', label: 'homeTask.cat' },
  { id: 'home.dog', say: 'Find the dog.', clipId: 'dog-find', label: 'homeTask.dog' },
  { id: 'home.hello', say: 'Hello!', clipId: 'hello-model', label: 'homeTask.hello' },
];
