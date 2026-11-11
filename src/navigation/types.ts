export type RootStackParamList = {
  LanguageGate: undefined;
  ProfileSetup: { mode?: 'first' | 'add' } | undefined;
  Home: undefined;
  Map: undefined;
  Level: { levelId: number };
  PlayRoom: undefined;
  Shop: undefined;
  Premium: undefined;
  Settings: undefined;
  Privacy: undefined;
  WordAlbum: undefined;
  Review: { wordIds?: string[] } | undefined;
};
