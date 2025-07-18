import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';
import { SmartEmbedModel } from 'smart-embed-model';
import { SmartEmbedOpenAIAdapter } from 'smart-embed-model/adapters/openai';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	embedModel: SmartEmbedModel;


	async onload() {
		await this.loadSettings();
		this.registerMarkdownPostProcessor((element, context) => {
			// 렌더링된 요소 안에서 모든 헤딩 태그를 찾기
			const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");

			// 찾은 각 헤딩에 대해 아이콘을 추가
			headings.forEach(headings => {
				if (headings.querySelector(".chumsa-icon")) {
					return;
				}

				// 아이콘으로 사용할 span 요소 생성
				const iconEl = headings.createEl('span', {
                    cls: 'chumsa-icon', // CSS 스타일링을 위한 클래스
                    attr: {
                        'aria-label': '관련 자료 찾기', // 마우스를 올렸을 때 나올 툴팁
                    }
                });

				setIcon(iconEl, 'link');

                // 아이콘 클릭 시 실행할 이벤트를 등록합니다.
                iconEl.addEventListener('click', () => {
                    // 여기에 아이콘 클릭 시 실행될 로직을 작성합니다.
                    // 예: 사이드바 열고 관련 자료 검색 결과 보여주기
                    console.log(`'${headings.textContent}' 문단과 관련된 자료를 검색합니다.`);
                    // this.openSideBarWithResults(heading.textContent);
                });

			})
		})
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('자동화 테스팅23232332');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async initialize() {
		console.log("첨사: 본격적인 초기화를 시작합니다...");

		this.embedModel = new SmartEmbedModel({
			model_key: 'text-embedding-3-small',
			settings: {
			  api_key: ''
			},
			adapters: {
			  openai: SmartEmbedOpenAIAdapter
			}
		  }) as any;

		await this.startIndexing();
		
		console.log("첨사: 초기화가 완료되었습니다.");
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
