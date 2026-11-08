import {
  ModalBottomSheet,
  type ModalBottomSheetProps,
} from "./modal-bottom-sheet"

interface ModalProps extends ModalBottomSheetProps {}

export function Modal(props: ModalProps) {
  return <ModalBottomSheet {...props} />
}

