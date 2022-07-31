import MetadataMenu from "main";
import { App, TFile, Menu } from "obsidian";
import valueMultiSelectModal from "src/optionModals/valueMultiSelectModal";
import valueTextInputModal from "src/optionModals/valueTextInputModal";
import valueSelectModal from "src/optionModals/valueSelectModal";
import Field from "src/Field";
import { FieldType } from "src/types/fieldTypes";
import chooseSectionModal from "../optionModals/chooseSectionModal";
import SelectModal from "src/optionModals/SelectModal";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { replaceValues } from "../commands/replaceValues";
import { getPropertySettings } from "src/commands/getPropertySettings";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import { genericFieldRegex } from "../utils/parser";

function isMenu(category: Menu | SelectModal): category is Menu {
	return (category as Menu).addItem !== undefined;
};

function isSelect(category: Menu | SelectModal): category is SelectModal {
	return (category as SelectModal).modals !== undefined;
};

export default class OptionsList {
	app: App;
	file: TFile;
	plugin: MetadataMenu;
	path: string;
	category: Menu | SelectModal;
	fileClass: FileClass;

	constructor(plugin: MetadataMenu, file: TFile, category: Menu | SelectModal) {
		this.file = file;
		this.plugin = plugin;
		this.category = category;
	};

	public async createExtraOptionList(): Promise<void> {
		const frontmatter = this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter;
		if (frontmatter) {
			const { position, ...attributes } = frontmatter;
			Object.keys(attributes).forEach(key => {
				if (this.plugin.settings.globallyIgnoredFields.includes(key)) {
					delete attributes[key];
				};
			});
			if (isMenu(this.category)) { this.category.addSeparator(); };
			let fileClassForFields = false;
			let fileClassFields: string[] = [];
			const fileClassAlias = this.plugin.settings.fileClassAlias;
			if (Object.keys(attributes).includes(fileClassAlias)) {
				const fileClass = attributes[fileClassAlias];
				try {
					const _fileClass = await createFileClass(this.plugin, fileClass)
					this.fileClass = _fileClass;
					fileClassFields = _fileClass.attributes.map(attr => attr.name);
					fileClassForFields = true;
					Object.keys(attributes).forEach(key => {
						if (!fileClassFields.includes(key) && key != fileClassAlias) {
							delete attributes[key];
						};
					});
					const fileClassAttributeSelectModal = new FileClassAttributeSelectModal(this.plugin, this.fileClass.getClassFile());
					if (isMenu(this.category)) {
						this.category.addSeparator();
						this.category.addItem((item) => {
							item.setIcon("gear");
							item.setTitle(`Manage <${this.fileClass.name}> fields`);
							item.onClick((evt) => {
								fileClassAttributeSelectModal.open();
							});
						});
					} else {
						this.category.addOption("manage_fileClass_attributes", `Manage <${this.fileClass.name}> fields`);
						this.category.modals["manage_fileClass_attributes"] = () => fileClassAttributeSelectModal.open();
					};

					await this.createExtraOptionsListForFrontmatter(attributes,)
					await this.createExtraOptionsListForInlineFields(this.file, fileClassForFields, fileClassFields)
					if (isMenu(this.category)) { this.category.addSeparator() };
					this.addSectionSelectModalOption();
				} catch (error) {
					await this.createExtraOptionsListForFrontmatter(attributes)
					await this.createExtraOptionsListForInlineFields(this.file)
					if (isMenu(this.category)) { this.category.addSeparator(); };
					this.addSectionSelectModalOption();
				};
			} else {
				await this.createExtraOptionsListForFrontmatter(attributes)
				await this.createExtraOptionsListForInlineFields(this.file)
				if (isMenu(this.category)) { this.category.addSeparator(); };
				this.addSectionSelectModalOption();
			};
		} else {
			await this.createExtraOptionsListForInlineFields(this.file)
			if (isMenu(this.category)) { this.category.addSeparator(); };
			this.addSectionSelectModalOption();
		};
	};

	private async createExtraOptionsListForInlineFields(file: TFile, fileClassForFields: boolean = false, fileClassFields: string[] = []): Promise<void> {
		let attributes: Record<string, string> = {};
		const regex = new RegExp(`^${genericFieldRegex}::\s*(?<values>.+)?`, "u");
		const result = await this.plugin.app.vault.read(file)
		result.split('\n').map(line => {
			const regexResult = line.match(regex);
			const { attribute, values } = regexResult?.groups || {}
			if (attribute && !this.plugin.settings.globallyIgnoredFields.includes(attribute.trim())) {
				if (fileClassForFields) {
					if (fileClassFields.includes(attribute.trim())) {
						attributes[attribute.trim()] = values ? values.trim() : "";
					};
				} else {
					attributes[attribute.trim()] = values ? values.trim() : "";
				};
			};
		});
		if (Object.keys(attributes).length > 0) {
			if (isMenu(this.category)) { this.category.addSeparator(); };
			this.buildExtraOptionsList(attributes);
		};
	};

	private async createExtraOptionsListForFrontmatter(attributes: Record<string, string>) {
		this.buildExtraOptionsList(attributes,);
	};

	private buildExtraOptionsList(attributes: Record<string, string>) {
		Object.keys(attributes).forEach((key: string) => {
			const value = attributes[key];
			const propertySettings = getPropertySettings(this.plugin, key, this.fileClass);
			if (propertySettings) {
				switch (propertySettings.type) {
					case FieldType.Cycle: this.addCycleMenuOption(key, value, propertySettings); break;
					case FieldType.Multi: this.addMultiMenuOption(key, value, propertySettings); break;
					case FieldType.Select: this.addSelectMenuOption(key, value, propertySettings); break;
					case FieldType.Boolean:
						let toBooleanValue: boolean = false;
						if (isBoolean(value)) {
							toBooleanValue = value;
						} else if (/true/i.test(value)) {
							toBooleanValue = true;
						} else if (/false/i.test(value)) {
							toBooleanValue = false;
						};
						this.addToggleMenuOption(key, toBooleanValue);
						break;
					case FieldType.Number:
					//fall-through
					case FieldType.Input: this.addTextInputMenuOption(key, value ? value.toString() : "", propertySettings); break;
					default: this.addTextInputMenuOption(key, value ? value.toString() : "", propertySettings); break;
				}
			} else {
				const defaultField = new Field(key)
				defaultField.type = FieldType.Input
				this.addTextInputMenuOption(key, value ? value.toString() : "", defaultField);
			}
		});
	};

	private addSectionSelectModalOption(): void {
		const modal = new chooseSectionModal(this.plugin, this.file, this.fileClass);
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setIcon("pencil");
				item.setTitle("Add field at section...");
				item.onClick((evt: MouseEvent) => {
					modal.open();
				});
				item.setSection("target-metadata");
			});
		} else if (isSelect(this.category)) {
			this.category.addOption("add_field_at_section", "Add field at section...");
			this.category.modals["add_field_at_section"] = () => modal.open();
		};
	};

	private addCycleMenuOption(name: string, option: string, field: Field): void {
		const options = field.options;
		const keys = Object.keys(options);
		const keyForValue = keys.find(key => options[key] === option);
		let nextOption: string;
		if (keyForValue) {
			const nextKey = keys[(keys.indexOf(keyForValue) + 1) % keys.length];
			nextOption = options[nextKey];
		} else {
			nextOption = options[Object.keys(options)[0]];
		};
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setTitle(`${name} : ${option} ▷ ${nextOption}`);
				item.setIcon('switch');
				item.onClick((evt: MouseEvent) => {
					replaceValues(this.plugin.app, this.file, name, nextOption);
				});
				item.setSection("target-metadata");
			});
		} else if (isSelect(this.category)) {
			this.category.addOption(`${name}_${option}_${nextOption}`, `${name} : ${option} ▷ ${nextOption}`);
			this.category.modals[`${name}_${option}_${nextOption}`] = () =>
				replaceValues(this.plugin.app, this.file, name, nextOption);
		};
	};

	private addMultiMenuOption(name: string, value: string, field: Field): void {
		const modal = new valueMultiSelectModal(this.plugin.app, this.file, name, value, field);
		modal.titleEl.setText("Select values");
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setTitle(`Update <${name}>`);
				item.setIcon('bullet-list');
				item.onClick((evt: MouseEvent) => {
					modal.open();
				});
				item.setSection("target-metadata");
			});
		} else if (isSelect(this.category)) {
			this.category.addOption(`update_${name}`, `Update <${name}>`);
			this.category.modals[`update_${name}`] = () => modal.open();
		};
	};

	private addSelectMenuOption(name: string, value: string, field: Field): void {
		const modal = new valueSelectModal(this.plugin.app, this.file, name, value, field);
		modal.titleEl.setText("Select value");
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setTitle(`Update ${name}`);
				item.setIcon('right-triangle');
				item.onClick((evt: MouseEvent) => modal.open());
				item.setSection("target-metadata");
			});
		} else if (isSelect(this.category)) {
			this.category.addOption(`update_${name}`, `Update <${name}>`);
			this.category.modals[`update_${name}`] = () => modal.open();
		};
	};

	private addToggleMenuOption(name: string, value: boolean): void {
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setTitle(`<${name}> ${value ? "✅ ▷ ❌" : "❌ ▷ ✅"}`);
				item.setIcon('checkmark');
				item.onClick((evt: MouseEvent) => { replaceValues(this.plugin.app, this.file, name, (!value).toString()); });
				item.setSection("target-metadata");
			})
		} else if (isSelect(this.category)) {
			this.category.addOption(`update_${name}`, `<${name}> ${value ? "✅ ▷ ❌" : "❌ ▷ ✅"}`);
			this.category.modals[`update_${name}`] = () => replaceValues(this.plugin.app, this.file, name, (!value).toString());;
		};
	};

	private addTextInputMenuOption(name: string, value: string, field: Field): void {
		const modal = new valueTextInputModal(this.plugin.app, this.file, field, value);
		modal.titleEl.setText(`Change Value for <${name}>`);
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setTitle(`Update <${name}>`);
				item.setIcon('pencil');
				item.onClick((evt: MouseEvent) => modal.open());
				item.setSection("target-metadata");
			})
		} else if (isSelect(this.category)) {
			this.category.addOption(`update_${name}`, `Update <${name}>`);
			this.category.modals[`update_${name}`] = () => modal.open();
		};
	};
};
