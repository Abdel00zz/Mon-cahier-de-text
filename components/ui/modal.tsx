import * as React from "react"
import {
  ModalBottomSheet,
  type ModalBottomSheetProps,
  SheetState,
  useSheetState,
  rememberModalBottomSheetState,
  type SheetValue,
  type SheetStateOptions,
} from "./modal-bottom-sheet"

export interface ModalProps extends ModalBottomSheetProps {}

export function Modal(props: ModalProps) {
  return <ModalBottomSheet {...props} />
}

export {
  ModalBottomSheet,
  SheetState,
  useSheetState,
  rememberModalBottomSheetState,
  type SheetValue,
  type SheetStateOptions,
}

