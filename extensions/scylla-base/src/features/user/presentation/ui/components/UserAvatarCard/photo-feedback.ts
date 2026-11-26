/** What the photo card shows under its buttons after an import of the photo of a provider. */
export interface PhotoFeedback {
  kind: 'done' | 'failed';
  text: string;
}
