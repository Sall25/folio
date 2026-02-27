import { type MentionItem } from "./types"

// local avatar images; adjust relative path as needed
import profile1 from '../../../../assets/profile1.jpg'
import profile2 from '../../../../assets/profile2.jpg'
import profile3 from '../../../../assets/profile3.jpg'

export const users: MentionItem[] = [
  { id: '1', label: 'Jule', avatart: profile1 },
  { id: '2', label: 'Alice', avatart: profile2 },
  { id: '3', label: 'Bob', avatart: profile3 },
];