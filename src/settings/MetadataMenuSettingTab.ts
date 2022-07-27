import { App, PluginSettingTab, Setting, ButtonComponent, ToggleComponent, Modal } from "obsidian";
import MetadataMenu from "main";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import Field from "src/Field";
import FieldSetting from "src/settings/FieldSetting";
import { copyFileSync } from "fs";

class SettingsMigrationConfirmModal extends Modal {

	private plugin: MetadataMenu;
	private tab: MetadataMenuSettingTab;

	constructor(plugin: MetadataMenu, tab: MetadataMenuSettingTab) {
		super(plugin.app);
		this.plugin = plugin;
		this.tab = tab;
	};

	onOpen(): void {

		this.titleEl.setText("Confirm");
		const body = this.contentEl.createDiv({
			cls: "modal-text-danger"
		});
		body.setText("This will erase current settings. Are you sure?");
		const confirmButton = new ButtonComponent(this.contentEl);
		confirmButton.setIcon("check");
		confirmButton.onClick(() => {
			//@ts-ignore
			if (this.app.plugins.plugins.hasOwnProperty("supercharged-links-obsidian")) {
				//@ts-ignore
				let settings = this.app.plugins.plugins["supercharged-links-obsidian"].settings;
				let _settings = this.plugin.settings;
				//copying simple settings
				_settings.classFilesPath = settings.classFilesPath;
				_settings.displayFieldsInContextMenu = settings.displayFieldsInContextMenu;
				_settings.getFromInlineField = settings.getFromInlineField;
				_settings.globallyIgnoredFields = settings.globallyIgnoredFields;
				//deep copying presetFields in initialProperty
				this.plugin.initialProperties = [];
				settings.presetFields.forEach((prop: Field) => {
					const property = new Field();
					Object.assign(property, prop);
					this.plugin.initialProperties.push(property);
				})

				this.plugin.saveSettings();
				this.close();
			};
		});
	};

	onClose(): void {
		this.tab.display();
	};
};



export default class MetadataMenuSettingTab extends PluginSettingTab {
	private plugin: MetadataMenu;

	constructor(app: App, plugin: MetadataMenu) {
		super(app, plugin);
		this.plugin = plugin;
	};

	display(): void {
		let { containerEl } = this;
		containerEl.empty();

		/* 
		-----------------------------------------
		Global Settings 
		-----------------------------------------
		*/
		const globalSettings = containerEl.createEl('div')
		globalSettings.createEl('h4', { text: 'Global settings', cls: "metadata-menu-setting-section-header" });
		globalSettings.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Global settings to apply to your whole vault"
		})
		// Managing choice whether you get attributes from inline fields and frontmatter or only frontmater
		new Setting(globalSettings)
			.setName('Search for attribute in Inline fields like <field::>')
			.setDesc('Sets the `data-link-<field>`-attribute to the value of inline fields')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.getFromInlineField)
				toggle.onChange(async value => {
					this.plugin.settings.getFromInlineField = value
					await this.plugin.saveSettings()
				});
			});

		/* Manage menu options display*/
		new Setting(globalSettings)
			.setName("Display field options in context menu")
			.setDesc("Choose to show or hide fields options in the context menu of a link or a file")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.displayFieldsInContextMenu)
				toggle.onChange(async value => {
					this.plugin.settings.displayFieldsInContextMenu = value
					await this.plugin.saveSettings()
				});
			});
		/* Exclude Fields from context menu*/
		new Setting(globalSettings)
			.setName('Globally ignored fields')
			.setDesc('Fields to be ignored by the plugin when adding options to the context menu')
			.addTextArea((text) => {
				text
					.setPlaceholder('Enter fields as string, comma separated')
					.setValue(this.plugin.settings.globallyIgnoredFields.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.globallyIgnoredFields = value.replace(/\s/g, '').split(',');
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 6;
				text.inputEl.cols = 25;
			});

		/* 
		-----------------------------------------
		Managing predefined values for properties 
		-----------------------------------------
		*/
		/* Add new property for which we want to preset values*/
		const presetFieldsSettings = containerEl.createEl("div")
		presetFieldsSettings.createEl('h4', { text: 'Preset Fields settings', cls: "metadata-menu-setting-section-header" });
		presetFieldsSettings.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Manage globally predefined type and values for a field throughout your whole vault"
		})
		new Setting(presetFieldsSettings)
			.setName("Add New Property Manager")
			.setDesc("Add a new Frontmatter property for which you want preset values.")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Add New Property Manager")
					.setButtonText("+")
					.onClick(async () => {
						let modal = new FieldSettingsModal(this.app, this.plugin, presetFieldsSettings);
						modal.open();
					});
			});

		/* Managed properties that currently have preset values */
		this.plugin.initialProperties.forEach(prop => {
			const property = new Field();
			Object.assign(property, prop);
			new FieldSetting(presetFieldsSettings, property, this.app, this.plugin);
		});

		/* 
		-----------------------------------------
		Managing fileClass 
		-----------------------------------------
		*/
		/* Set classFiles Path*/
		const classFilesSettings = containerEl.createEl("div")
		classFilesSettings.createEl('h4', { text: 'FileClass settings', cls: "metadata-menu-setting-section-header" });
		classFilesSettings.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Manage fileClass folder and alias. " +
				"When a note has a fielClass defined, fileClass field properties will override global preset fields settings for the same field name"
		})
		new Setting(classFilesSettings)
			.setName('class Files path')
			.setDesc('Path to the files containing the authorized fields for a type of note')
			.addText((text) => {
				text
					.setPlaceholder('Path/')
					.setValue(this.plugin.settings.classFilesPath)
					.onChange(async (value) => {
						this.plugin.settings.classFilesPath = value
						await this.plugin.saveSettings();
					});
			});

		/* Set fileClass alias*/
		new Setting(classFilesSettings)
			.setName('fileClass field alias')
			.setDesc('Choose another name for fileClass field in frontmatter (example: Category, type, ...')
			.addText((text) => {
				text
					.setValue(this.plugin.settings.fileClassAlias)
					.onChange(async (value) => {
						this.plugin.settings.fileClassAlias = value;
						await this.plugin.saveSettings();
					});
			});

		/* 
		-----------------------------------------
		Migration settings 
		-----------------------------------------
		*/
		const migrateSettings = containerEl.createEl("div")
		migrateSettings.createEl('h4', { text: 'Migrate' });

		/* Add new property for which we want to preset values*/
		new Setting(migrateSettings)
			.setName("Copy settings from supercharged links plugin")
			.setDesc("Copy settings from supercharged links plugin")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Get settings from supercharged links")
					.setButtonText("Copy")
					.onClick(async () => {
						let modal = new SettingsMigrationConfirmModal(this.plugin, this);
						modal.open();
					});
			});
	};
};
