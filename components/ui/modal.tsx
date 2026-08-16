import {
  ModalBottomSheet,
  type ModalBottomSheetProps,
} from "./modal-bottom-sheet"

export interface ModalProps extends ModalBottomSheetProps {}

export function Modal(props: ModalProps) {
  return <ModalBottomSheet {...props} />
}

