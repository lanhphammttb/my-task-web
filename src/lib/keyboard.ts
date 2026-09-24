/** Global shortcuts yield to a dialog, select or menu above the current page. */
export function hasKeyboardLayer() {
  return (
    document.querySelector(
      '[role="dialog"]:not([aria-modal="false"]), [role="alertdialog"], [role="listbox"], [role="menu"]',
    ) !== null
  );
}
