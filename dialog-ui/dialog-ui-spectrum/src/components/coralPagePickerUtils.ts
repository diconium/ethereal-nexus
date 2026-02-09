// coralPagePickerUtils.ts
export function openCoralPagePicker({
                                        rootPath = "/content",
                                        initialPath = "/content",
                                        onSelect
                                    }: {
    rootPath?: string;
    initialPath?: string;
    onSelect: (selected: string) => void;
}) {
    // Create Coral Dialog
    const dialog = new (window as any).Coral.Dialog();
    dialog.id = (window as any).Coral.commons.getUID();
    dialog.header.innerHTML = "Select a Path";
    dialog.classList.add("coral3-Dialog");

    // Create Coral Autocomplete with picker
    const autocomplete = document.createElement("foundation-autocomplete");
    autocomplete.setAttribute("name", "path");
    autocomplete.setAttribute("root", rootPath);
    autocomplete.setAttribute("selectionCount", "single");
    autocomplete.setAttribute("pickersrc", `/libs/granite/ui/content/coral/foundation/form/pathfield/picker.html?_charset_=utf-8&path=${encodeURIComponent(initialPath)}&root=${encodeURIComponent(rootPath)}&selectionCount=single`);
    (autocomplete as any).value = initialPath;
    autocomplete.setAttribute("placeholder", "Select a path...");
    autocomplete.style.width = "100%";

    dialog.content.appendChild(autocomplete);

    // Footer buttons
    const selectBtn = new (window as any).Coral.Button();
    selectBtn.variant = "primary";
    selectBtn.label.textContent = "Select";

    const cancelBtn = new (window as any).Coral.Button();
    cancelBtn.variant = "secondary";
    cancelBtn.setAttribute("coral-close", "");
    cancelBtn.label.textContent = "Cancel";

    dialog.footer.appendChild(selectBtn);
    dialog.footer.appendChild(cancelBtn);

    document.body.appendChild(dialog);
    dialog.show();

    // Handle selection
    selectBtn.on("click", () => {
        const selected = (autocomplete as any).value;
        onSelect(selected);
        dialog.hide();
        setTimeout(() => {
            if (document.body.contains(dialog)) {
                document.body.removeChild(dialog);
            }
        }, 100);
    });

    dialog.on("coral-overlay:close", () => {
        setTimeout(() => {
            if (document.body.contains(dialog)) {
                document.body.removeChild(dialog);
            }
        }, 100);
    });
}
