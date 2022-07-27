import { App, Modal, DropdownComponent, TFile, ButtonComponent } from "obsidian";
import Field from "src/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";

export default class valueSelectModal extends Modal {

    private file: TFile;
    private name: string;
    private value: string;
    private settings: Field;
    private newValue: string | null;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;

    constructor(app: App, file: TFile, name: string, value: string, settings: Field, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.name = name;
        this.value = value;
        this.settings = settings;
        this.newValue = null;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
    };

    async onOpen() {
        this.containerEl.addClass("metadata-menu");
        const inputDiv = this.contentEl.createDiv({ cls: "metadata-menu-modal-value" });
        await this.buildInputEl(inputDiv);
    };

    private async buildInputEl(inputDiv: HTMLDivElement): Promise<void> {
        const selectEl = new DropdownComponent(inputDiv);
        selectEl.selectEl.addClass("metadata-menu-select");

        const values = this.settings.values;
        selectEl.addOption("", "--Empty--");
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.settings.valuesListNotePath, this.app)
        listNoteValues.forEach(value => selectEl.addOption(value, value));
        if (listNoteValues.includes(this.value)) {
            selectEl.setValue(this.value);
        };
        if (listNoteValues.length === 0) {
            Object.keys(values).forEach(key => {
                selectEl.addOption(values[key], values[key]);
            });
            if (Object.values(values).includes(this.value)) {
                selectEl.setValue(this.value);
            };
        }
        selectEl.onChange(value => this.newValue = value != "--Empty--" ? value : "");
        const submitButton = new ButtonComponent(inputDiv);
        submitButton.setTooltip("Save")
            .setIcon("checkmark")
            .onClick(async () => {
                if (this.lineNumber == -1) {
                    if (this.newValue || this.newValue == "") {
                        replaceValues(this.app, this.file, this.name, this.newValue);
                    };
                } else {
                    const result = await this.app.vault.read(this.file)
                    let newContent: string[] = [];
                    if (this.top) {
                        newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${selectEl.getValue()}`);
                        result.split("\n").forEach((line, _lineNumber) => newContent.push(line));
                    } else {
                        result.split("\n").forEach((line, _lineNumber) => {
                            newContent.push(line);
                            if (_lineNumber == this.lineNumber) {
                                newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${selectEl.getValue()}`);
                            };
                        });
                    };
                    this.app.vault.modify(this.file, newContent.join('\n'));
                    this.close();
                };
                this.close();
            });
    };
};