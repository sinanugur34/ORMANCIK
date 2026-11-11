/** Offline English clips for the first friends unit. Play these before any network voice. */
export const BUNDLED_CLIPS: Record<string, number> = {
  'hello-model': require('../../assets/voice/en/hello-model.mp3'),
  'hello-find': require('../../assets/voice/en/hello-find.mp3'),
  'bye-model': require('../../assets/voice/en/bye-model.mp3'),
  'bye-find': require('../../assets/voice/en/bye-find.mp3'),
  'cat-model': require('../../assets/voice/en/cat-model.mp3'),
  'cat-find': require('../../assets/voice/en/cat-find.mp3'),
  'cat-transfer': require('../../assets/voice/en/cat-transfer.mp3'),
  'dog-model': require('../../assets/voice/en/dog-model.mp3'),
  'dog-find': require('../../assets/voice/en/dog-find.mp3'),
  'dog-transfer': require('../../assets/voice/en/dog-transfer.mp3'),
  'rabbit-model': require('../../assets/voice/en/rabbit-model.mp3'),
  'rabbit-find': require('../../assets/voice/en/rabbit-find.mp3'),
  'rabbit-transfer': require('../../assets/voice/en/rabbit-transfer.mp3'),
  'praise-yes': require('../../assets/voice/en/praise-yes.mp3'),
  greet: require('../../assets/voice/en/greet.mp3'),
  'room-hat': require('../../assets/voice/en/room-hat.mp3'),
  'listen-first': require('../../assets/voice/en/listen-first.mp3'),
};

export function bundledClip(id: string | undefined): number | undefined {
  if (!id) return undefined;
  return BUNDLED_CLIPS[id];
}
