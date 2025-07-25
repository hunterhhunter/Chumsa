import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, setIcon, normalizePath, WorkspaceLeaf } from 'obsidian';
import { SmartEmbedModel } from 'smart-embed-model';
import { SmartEmbedOpenAIAdapter } from 'smart-embed-model/adapters/openai';
import { HNSWLibAdapter } from './hnswAdapter'
import { embedAllFiles, hashString } from './embedding';
import { MY_VIEW_TYPE, MySideView } from './view';
import { SearchResult } from './structures';
import { calculateCentroid } from './utils';
import { hash } from 'crypto';

// Remember to rename these classes and interfaces!


interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'hungry'
}

export default class MyPlugin extends Plugin {
	settings: SampleSettingTab;
	embedModel: SmartEmbedModel;
	vectorDB: HNSWLibAdapter;
	fileToBlocksMap: Map<string, Record<string, [number, number]>> = new Map();

	async onload() {
		// TODO: 해당 문서 임베딩 커맨드 추가
		// DONE: 문단 옆 버튼 클릭시 Search 함수 실행되고 사이드바에 볼 수 있는 로직
		
		await this.loadSettings();

		// 사이드뷰 등록
		this.registerView(
			MY_VIEW_TYPE,
			(leaf) => new MySideView(leaf)
		);

		// 2. 리본 아이콘을 추가하여 뷰를 활성화합니다.
        this.addRibbonIcon('brain-circuit', '첨사 뷰 열기', () => {
            this.activateView();
        });

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
                iconEl.addEventListener('click', async (event) => {
                    // 여기에 아이콘 클릭 시 실행될 로직을 작성합니다.
                    // 예: 사이드바 열고 관련 자료 검색 결과 보여주기
					this.activateView();
					const clickLine = context.getSectionInfo(headings as HTMLElement)?.lineStart;
					if (!clickLine) return;

					const sourcePath = context.sourcePath;
					console.log(`source Path: ${sourcePath}`);
					// 눌린 위치의 키 전부 불러옴.
					const keys = this.findKeysInFileToBlock(sourcePath, clickLine);
					console.log(`불러온 키들: ${keys}`);
					// 불러온 키를 해싱하기
					const hashedIds = keys.map(value => hashString(value, 42));
					console.log(`해싱된 키들: ${hashedIds}`);
					const vectorDataMap = this.vectorDB.getVectorDataMap();
					console.log(`불러와진 벡터데이터맵 사이즈: ${vectorDataMap.size}`);
					// 불러온 키로 벡터 조회하기
					const loadedVector = hashedIds.map(value => vectorDataMap.get(value));
					console.log(`검색된 벡터들: ${loadedVector}`);
					// VectorData -> number[][]로 바꾸기
					const numbers: number[][] = loadedVector
						.map(value => value?.vector).
						filter((vec): vec is number[] => vec !== undefined);
					console.log(`추출된 벡터들: ${numbers}`);
					// 검색을 위한 평균벡터 구하기
					const meanVector = calculateCentroid(numbers);
					console.log(`평균화된 벡터들: ${meanVector}`);
					// 평균벡터로 검색
					const searchResult = await this.vectorDB.search(meanVector, 10);
					console.log(`검색 결과: ${searchResult}`);
					// 검색 결과로 사이드뷰 업데이트
					this.updateViewContent(searchResult);
                });
			})
		})
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// 옵시디언 UI가 완전히 준비되면 initialize 함수를 실행하도록 예약
		this.app.workspace.onLayoutReady(this.initialize.bind(this));
	}

	/**
     * 플러그인의 모든 무거운 초기화 로직을 처리
     * 이 함수는 옵시디언의 UI가 완전히 로드된 후에 호출
     */
	async initialize() {
		// TODO: 이미 임베딩된 내용이 존재할시 임베딩 안하는 로직 추가
		// TODO: 전의 내용과
		console.log("첨사: 본격적인 초기화를 시작합니다...");
		
		// 임베딩 모델 초기화
		this.embedModel = new SmartEmbedModel ({
			model_key: 'text-embedding-3-small',
			adapters: {
				openai: SmartEmbedOpenAIAdapter
			},
			settings: {
				api_key: process.env.OPENAI_API_KEY
			}
		});

		this.vectorDB = new HNSWLibAdapter(this.app);
		await this.vectorDB.initialize('saved_index', 1536, 10000);

		const exist = this.app.vault.adapter.exists(normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/ID_TO_LABEL_MAP.json`));
		this.fileToBlocksMap = await embedAllFiles(this.app, this.embedModel, this.vectorDB);
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

	async activateView() {
		// 이미 동일한 타입의 뷰가 열려있으면 그거 사용
		const existingLeaves = this.app.workspace.getLeavesOfType(MY_VIEW_TYPE);
		if (existingLeaves.length > 0) {
			this.app.workspace.revealLeaf(existingLeaves[0]);
			return;
		}

		// 오른쪽에 새로운 뷰 열기
		const leaf = this.app.workspace.getRightLeaf(false);
		await leaf?.setViewState({
			type: MY_VIEW_TYPE,
			active: true
		});

		this.app.workspace.revealLeaf(leaf);
	}

	async updateViewContent(results: SearchResult[]) {
		const view = this.app.workspace.getLeavesOfType(MY_VIEW_TYPE)[0].view;
		if (view instanceof MySideView) {
			view.updateContent(results);
		}
	}

	findKeysInFileToBlock(filePath: string, clickLine: number) {
		const keys = [];
		const fileKeys = this.fileToBlocksMap.get(filePath);

		for (const sub_key in fileKeys) {
			const [start, end] = fileKeys[sub_key];
			if (clickLine >= start && clickLine <= end) {
				keys.push(filePath + sub_key);
			}
		}
		return keys;
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

