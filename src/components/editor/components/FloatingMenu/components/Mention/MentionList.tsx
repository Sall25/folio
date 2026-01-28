import {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { MentionListProps } from './types'
import type { MentionListRef } from './types'


const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command(item)
    }

    const upHandler = () => {
      setSelectedIndex(i => (i + items.length - 1) % items.length)
    }

    const downHandler = () => {
      setSelectedIndex(i => (i + 1) % items.length)
    }

    const enterHandler = () => {
      selectItem(selectedIndex)
    }

    // useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }
        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }
        if (event.key === 'Enter') {
          enterHandler()
          return true
        }
        return false
      },
    }))

    return (
      <div className="slash-menu active">
        {items.length === 0 && <div className="p-2 text-sm">No results</div>}

        {items.map((item, index) => (
          <span
            key={item.id}
            className={`slash-item ${index === selectedIndex ? 'selected' : ''
              }`}
            onClick={() => selectItem(index)}
          >
            @{item.label}
          </span>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
export default MentionList
