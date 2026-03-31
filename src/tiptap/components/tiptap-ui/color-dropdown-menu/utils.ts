import type { BlockTypeOption } from "../turn-into-dropdown/types";
import { DEFAULT_BLOCK_TYPE_OPTIONS } from "../turn-into-dropdown/block-type-options";

export function getFilteredBlockTypeOptions(
  blockTypes?: string[],
): BlockTypeOption[] {
  if (!blockTypes?.length) {
    return DEFAULT_BLOCK_TYPE_OPTIONS
  }

  return blockTypes.flatMap(type =>
    DEFAULT_BLOCK_TYPE_OPTIONS.filter(option => option.type === type),
  )
}