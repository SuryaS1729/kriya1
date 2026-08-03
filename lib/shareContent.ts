export type ShareContent = {
  chapter: string;
  verse: string;
  text: string;
  translation: string;
};

let currentShareContent: ShareContent | null = null;

export function setShareContent(content: ShareContent) {
  currentShareContent = content;
}

export function getShareContent() {
  return currentShareContent;
}
