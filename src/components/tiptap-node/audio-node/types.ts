export interface AudioAttrs {
  /** The audio source — uploaded file URL or external URL */
  src: string | null;
  /** Original filename if uploaded */
  fileName: string | null;
  /** Optional caption shown below the player */
  caption: string;
}
